use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::Instant;
use tempfile::TempDir;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};
use walkdir::WalkDir;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const LISTEN: &str = "127.0.0.1:34981";
const MAX_REQUEST_BYTES: usize = 24 * 1024 * 1024;
const MAX_FILES: usize = 1024;
const MAX_TNS_BYTES: usize = 64 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BuildRequest {
    protocol: u32,
    project: ProjectInfo,
    files: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct ProjectInfo {
    name: String,
    target: Option<String>,
    language: Option<String>,
    template: Option<String>,
}

#[derive(Debug, Serialize)]
struct Diagnostic {
    file: String,
    line: u32,
    column: u32,
    severity: String,
    message: String,
}

#[derive(Debug)]
struct ToolStatus {
    ready: bool,
    missing: Vec<String>,
    make: Option<PathBuf>,
    toolchain_root: Option<PathBuf>,
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("valid header")
}

fn request_origin(request: &Request) -> Option<String> {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Origin"))
        .map(|h| h.value.as_str().to_owned())
}

fn origin_allowed(origin: Option<&str>) -> bool {
    match origin {
        None => true,
        Some("https://acewalt.github.io") => true,
        Some(value) if value.starts_with("http://127.0.0.1") => true,
        Some(value) if value.starts_with("http://localhost") => true,
        Some(value) if value.starts_with("https://localhost") => true,
        _ => false,
    }
}

fn respond_json(request: Request, status: u16, body: Value, origin: Option<&str>) {
    let mut response = Response::from_string(body.to_string())
        .with_status_code(StatusCode(status))
        .with_header(header("Content-Type", "application/json; charset=utf-8"))
        .with_header(header("Cache-Control", "no-store"))
        .with_header(header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"))
        .with_header(header("Access-Control-Allow-Private-Network", "true"))
        .with_header(header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-TNS-Tool-Protocol",
        ));
    if let Some(origin) = origin {
        response = response
            .with_header(header("Access-Control-Allow-Origin", origin))
            .with_header(header("Vary", "Origin"));
    }
    let _ = request.respond(response);
}

fn executable_variants(name: &str) -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        vec![
            format!("{name}.exe"),
            format!("{name}.cmd"),
            format!("{name}.bat"),
            name.to_owned(),
        ]
    }
    #[cfg(not(target_os = "windows"))]
    {
        vec![name.to_owned()]
    }
}

fn bundled_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(value) = env::var("TNS_TOOL_NDLESS_BIN") {
        roots.push(PathBuf::from(value));
    }
    if let Ok(value) = env::var("TNS_TOOL_NDLESS_HOME") {
        let root = PathBuf::from(value);
        roots.push(root.join("bin"));
        roots.push(root.join("ndless-sdk").join("bin"));
    }
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            roots.push(dir.join("toolchain").join("bin"));
            roots.push(dir.join("ndless-sdk").join("bin"));
            roots.push(dir.join("bin"));
        }
    }
    roots
}

fn find_tool(name: &str) -> Option<PathBuf> {
    for root in bundled_roots() {
        for variant in executable_variants(name) {
            let path = root.join(&variant);
            if path.is_file() {
                return Some(path);
            }
        }
    }
    which::which(name).ok()
}

fn find_make() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    let names = ["make", "mingw32-make", "gmake"];
    #[cfg(not(target_os = "windows"))]
    let names = ["make", "gmake", "make"];
    for name in names {
        if let Some(path) = find_tool(name) {
            return Some(path);
        }
    }
    None
}

fn detect_toolchain() -> ToolStatus {
    let required = ["nspire-gcc", "nspire-as", "nspire-ld", "genzehn", "make-prg"];
    let mut missing = Vec::new();
    for name in required {
        if find_tool(name).is_none() {
            missing.push(name.to_owned());
        }
    }
    let make = find_make();
    if make.is_none() {
        missing.push("make".to_owned());
    }
    let root = bundled_roots().into_iter().find(|p| p.exists());
    ToolStatus {
        ready: missing.is_empty(),
        missing,
        make,
        toolchain_root: root,
    }
}

fn status_json() -> Value {
    let tools = detect_toolchain();
    json!({
        "bridge": true,
        "version": VERSION,
        "platform": env::consts::OS,
        "arch": env::consts::ARCH,
        "toolchainReady": tools.ready,
        "toolchain": if tools.ready { "Ndless native toolchain" } else { "not-ready" },
        "missing": tools.missing,
        "listen": LISTEN,
    })
}

fn safe_relative_path(value: &str) -> Result<PathBuf, String> {
    if value.is_empty() || value.contains('\0') {
        return Err("empty or invalid file path".to_owned());
    }
    let normalized = value.replace('\\', "/");
    let path = Path::new(&normalized);
    if path.is_absolute() {
        return Err(format!("absolute path rejected: {value}"));
    }
    for part in path.components() {
        match part {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err(format!("unsafe project path rejected: {value}")),
        }
    }
    Ok(path.to_path_buf())
}

fn write_project(temp: &TempDir, files: &HashMap<String, String>) -> Result<(), String> {
    if files.len() > MAX_FILES {
        return Err(format!("project contains too many files (max {MAX_FILES})"));
    }
    let total: usize = files.iter().map(|(name, data)| name.len() + data.len()).sum();
    if total > MAX_REQUEST_BYTES {
        return Err(format!("project payload is too large (max {} MB)", MAX_REQUEST_BYTES / 1024 / 1024));
    }
    for (name, data) in files {
        let relative = safe_relative_path(name)?;
        let destination = temp.path().join(relative);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&destination, data.as_bytes()).map_err(|e| format!("{}: {e}", destination.display()))?;
    }
    Ok(())
}

fn prepend_toolchain_path(command: &mut Command) {
    let mut paths: Vec<PathBuf> = bundled_roots().into_iter().filter(|p| p.exists()).collect();
    if let Some(current) = env::var_os("PATH") {
        paths.extend(env::split_paths(&current));
    }
    if let Ok(joined) = env::join_paths(paths) {
        command.env("PATH", joined);
    }
}

fn parse_diagnostics(text: &str, project_root: &Path) -> Vec<Diagnostic> {
    let expression = Regex::new(r"(?m)^([^\r\n:]+):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*([^\r\n]+)").unwrap();
    expression
        .captures_iter(text)
        .map(|capture| {
            let raw = capture.get(1).map(|m| m.as_str()).unwrap_or("");
            let file = Path::new(raw)
                .strip_prefix(project_root)
                .unwrap_or(Path::new(raw))
                .to_string_lossy()
                .replace('\\', "/");
            Diagnostic {
                file,
                line: capture.get(2).and_then(|m| m.as_str().parse().ok()).unwrap_or(1),
                column: capture.get(3).and_then(|m| m.as_str().parse().ok()).unwrap_or(1),
                severity: match capture.get(4).map(|m| m.as_str()).unwrap_or("error") {
                    "warning" => "warning".to_owned(),
                    "note" => "info".to_owned(),
                    _ => "error".to_owned(),
                },
                message: capture.get(5).map(|m| m.as_str().trim().to_owned()).unwrap_or_default(),
            }
        })
        .collect()
}

fn newest_artifact(root: &Path, extension: &str, preferred: Option<&str>) -> Option<PathBuf> {
    if let Some(preferred) = preferred {
        let direct = root.join(preferred);
        if direct.is_file() {
            return Some(direct);
        }
    }
    let mut candidates: Vec<(std::time::SystemTime, PathBuf)> = WalkDir::new(root)
        .max_depth(8)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter(|entry| entry.path().extension().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case(extension)).unwrap_or(false))
        .filter_map(|entry| {
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((modified, entry.path().to_path_buf()))
        })
        .collect();
    candidates.sort_by_key(|item| item.0);
    candidates.pop().map(|item| item.1)
}

fn run_build(input: BuildRequest) -> Result<Value, Value> {
    if input.protocol != 1 {
        return Err(json!({"ok":false,"code":"PROTOCOL_MISMATCH","message":"Unsupported bridge protocol."}));
    }
    let tool_status = detect_toolchain();
    if !tool_status.ready {
        return Err(json!({
            "ok":false,
            "code":"LOCAL_TOOLCHAIN_MISSING",
            "message":"The TNS Tool Compiler bridge is running, but the Ndless toolchain is incomplete.",
            "details":format!("Missing: {}", tool_status.missing.join(", ")),
            "missing":tool_status.missing,
        }));
    }
    let make = tool_status.make.ok_or_else(|| json!({"ok":false,"code":"MAKE_MISSING","message":"make was not found."}))?;
    let temp = TempDir::new().map_err(|e| json!({"ok":false,"code":"TEMP_DIR_FAILED","message":e.to_string()}))?;
    write_project(&temp, &input.files).map_err(|e| json!({"ok":false,"code":"PROJECT_WRITE_FAILED","message":e}))?;

    if !temp.path().join("Makefile").is_file() {
        return Err(json!({"ok":false,"code":"MAKEFILE_MISSING","message":"Project payload did not contain a Makefile."}));
    }

    let started = Instant::now();
    let mut command = Command::new(&make);
    command.current_dir(temp.path());
    prepend_toolchain_path(&mut command);
    command.env("TNS_TOOL_BRIDGE", "1");
    command.env("TNS_TOOL_PROJECT_TARGET", input.project.target.clone().unwrap_or_default());
    let output = command.output().map_err(|e| json!({
        "ok":false,
        "code":"MAKE_START_FAILED",
        "message":format!("Could not start {}: {e}", make.display())
    }))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let log = format!("{}{}{}", stdout, if !stdout.is_empty() && !stderr.is_empty() { "\n" } else { "" }, stderr);
    let diagnostics = parse_diagnostics(&log, temp.path());
    if !output.status.success() {
        return Err(json!({
            "ok":false,
            "code":"NATIVE_BUILD_FAILED",
            "message":format!("Ndless build exited with {}.", output.status),
            "details":log,
            "diagnostics":diagnostics,
        }));
    }

    let preferred = format!("{}.tns", input.project.name);
    let tns_path = newest_artifact(temp.path(), "tns", Some(&preferred)).ok_or_else(|| json!({
        "ok":false,
        "code":"TNS_NOT_PRODUCED",
        "message":"The native build completed but no .tns file was produced.",
        "details":log,
    }))?;
    let tns = fs::read(&tns_path).map_err(|e| json!({"ok":false,"code":"TNS_READ_FAILED","message":e.to_string()}))?;
    if tns.len() > MAX_TNS_BYTES {
        return Err(json!({"ok":false,"code":"TNS_TOO_LARGE","message":"Generated TNS is unexpectedly large."}));
    }
    let elf = newest_artifact(temp.path(), "elf", None).and_then(|path| fs::read(path).ok());
    let filename = tns_path.file_name().and_then(|s| s.to_str()).unwrap_or("program.tns");

    Ok(json!({
        "ok":true,
        "filename":filename,
        "tnsBase64":BASE64.encode(&tns),
        "elfBase64":elf.as_ref().map(|bytes| BASE64.encode(bytes)),
        "platform":env::consts::OS,
        "toolchain":"Ndless native toolchain",
        "durationMs":started.elapsed().as_millis(),
        "logs":log.lines().collect::<Vec<_>>(),
        "diagnostics":diagnostics,
        "project":{
            "name":input.project.name,
            "target":input.project.target,
            "language":input.project.language,
            "template":input.project.template,
        }
    }))
}

fn handle(mut request: Request) {
    let origin = request_origin(&request);
    if !origin_allowed(origin.as_deref()) {
        respond_json(request, 403, json!({"ok":false,"code":"ORIGIN_REJECTED","message":"This origin is not allowed to use TNS Tool Compiler."}), None);
        return;
    }

    if request.method() == &Method::Options {
        respond_json(request, 204, json!({}), origin.as_deref());
        return;
    }

    match (request.method().clone(), request.url()) {
        (Method::Get, "/v1/status") => {
            respond_json(request, 200, status_json(), origin.as_deref());
        }
        (Method::Post, "/v1/build") => {
            let length = request.body_length().unwrap_or(0);
            if length > MAX_REQUEST_BYTES {
                respond_json(request, 413, json!({"ok":false,"code":"REQUEST_TOO_LARGE","message":"Project payload is too large."}), origin.as_deref());
                return;
            }
            let mut body = String::new();
            if let Err(error) = request.as_reader().take(MAX_REQUEST_BYTES as u64 + 1).read_to_string(&mut body) {
                respond_json(request, 400, json!({"ok":false,"code":"REQUEST_READ_FAILED","message":error.to_string()}), origin.as_deref());
                return;
            }
            let input: BuildRequest = match serde_json::from_str(&body) {
                Ok(value) => value,
                Err(error) => {
                    respond_json(request, 400, json!({"ok":false,"code":"INVALID_JSON","message":error.to_string()}), origin.as_deref());
                    return;
                }
            };
            match run_build(input) {
                Ok(value) => respond_json(request, 200, value, origin.as_deref()),
                Err(value) => respond_json(request, 422, value, origin.as_deref()),
            }
        }
        _ => respond_json(request, 404, json!({"ok":false,"code":"NOT_FOUND","message":"Unknown compiler bridge endpoint."}), origin.as_deref()),
    }
}

fn main() {
    // Custom-protocol launches pass tnstool://... as argv[1]. The URL itself is
    // intentionally ignored: it only starts the loopback bridge.
    let server = match Server::http(LISTEN) {
        Ok(server) => server,
        Err(error) => {
            eprintln!("TNS Tool Compiler bridge could not listen on {LISTEN}: {error}");
            eprintln!("If another bridge instance is already running, this is harmless.");
            return;
        }
    };
    eprintln!("TNS Tool Compiler bridge {VERSION} listening on http://{LISTEN}");
    for request in server.incoming_requests() {
        handle(request);
    }
}
