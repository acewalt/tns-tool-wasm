use regex::Regex;
use serde::Serialize;
use serde_json::{json, Value};
use std::env;
use std::fs::{self, File};
use std::io::{Cursor, Read, Seek, SeekFrom};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Output};
use std::time::Instant;
use tempfile::TempDir;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};
use walkdir::WalkDir;
use zip::ZipArchive;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const LISTEN: &str = "127.0.0.1:34982";
const PROTOCOL_VERSION: u32 = 2;
const MAX_REQUEST_BYTES: usize = 32 * 1024 * 1024;
const MAX_FILES: usize = 2048;
const MAX_TNS_BYTES: usize = 64 * 1024 * 1024;
const BUNDLE_MAGIC: &[u8; 16] = b"TNSBUNDLEZIPv1!!";
const BUNDLE_FOOTER_SIZE: u64 = 24;
const RUNTIME_VERSION: &str = "runtime-0.2.0";

#[derive(Debug, Clone)]
struct ProjectInfo {
    name: String,
    target: String,
    language: String,
    template: String,
}

#[derive(Debug, Serialize, Clone)]
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
    runtime_root: Option<PathBuf>,
}

#[derive(Debug)]
struct BuildArtifact {
    filename: String,
    bytes: Vec<u8>,
    elf: Vec<u8>,
    duration_ms: u128,
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("valid header")
}

fn request_header(request: &Request, name: &str) -> Option<String> {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv(name))
        .map(|h| h.value.as_str().to_owned())
}

fn request_origin(request: &Request) -> Option<String> {
    request_header(request, "Origin")
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

fn cors_headers(origin: Option<&str>) -> Vec<Header> {
    let mut headers = vec![
        header("Cache-Control", "no-store"),
        header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
        header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-TNS-Tool-Protocol, X-TNS-Project-Name, X-TNS-Project-Target, X-TNS-Project-Language, X-TNS-Project-Template",
        ),
        header("Access-Control-Expose-Headers", "X-TNS-Filename, X-TNS-Platform, X-TNS-Duration-Ms, X-TNS-ELF-Bytes"),
        header("Access-Control-Allow-Private-Network", "true"),
    ];
    if let Some(origin) = origin {
        headers.push(header("Access-Control-Allow-Origin", origin));
        headers.push(header("Vary", "Origin"));
    }
    headers
}

fn respond_json(request: Request, status: u16, body: Value, origin: Option<&str>) {
    let mut response = Response::from_string(body.to_string())
        .with_status_code(StatusCode(status))
        .with_header(header("Content-Type", "application/json; charset=utf-8"));
    for h in cors_headers(origin) {
        response = response.with_header(h);
    }
    let _ = request.respond(response);
}

fn respond_tns(request: Request, artifact: BuildArtifact, origin: Option<&str>) {
    let mut response = Response::from_data(artifact.bytes)
        .with_status_code(StatusCode(200))
        .with_header(header("Content-Type", "application/octet-stream"))
        .with_header(header("X-TNS-Filename", &artifact.filename))
        .with_header(header("X-TNS-Platform", env::consts::OS))
        .with_header(header("X-TNS-Duration-Ms", &artifact.duration_ms.to_string()))
        .with_header(header("X-TNS-ELF-Bytes", &artifact.elf.len().to_string()));
    for h in cors_headers(origin) {
        response = response.with_header(h);
    }
    let _ = request.respond(response);
}

fn sanitize_name(value: &str) -> String {
    let mut out = String::new();
    for c in value.trim().chars() {
        if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-') {
            out.push(c);
        } else if !out.ends_with('-') {
            out.push('-');
        }
    }
    let out = out.trim_matches('-').to_owned();
    if out.is_empty() { "ndless-app".to_owned() } else { out }
}

fn data_home() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Some(value) = env::var_os("LOCALAPPDATA") {
            return PathBuf::from(value).join("TNS Tool Compiler");
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Some(value) = env::var_os("XDG_DATA_HOME") {
            return PathBuf::from(value).join("tns-tool-compiler");
        }
        if let Some(value) = env::var_os("HOME") {
            return PathBuf::from(value).join(".local/share/tns-tool-compiler");
        }
    }
    env::temp_dir().join("tns-tool-compiler")
}

fn extract_embedded_runtime(exe: &Path, destination: &Path) -> Result<(), String> {
    let marker = destination.join(".bundle-version");
    if marker.is_file() && fs::read_to_string(&marker).ok().as_deref() == Some(RUNTIME_VERSION) {
        return Ok(());
    }

    let mut file = File::open(exe).map_err(|e| format!("Could not open compiler bundle: {e}"))?;
    let total = file.metadata().map_err(|e| e.to_string())?.len();
    if total < BUNDLE_FOOTER_SIZE {
        return Err("This executable does not contain an embedded compiler runtime.".to_owned());
    }
    file.seek(SeekFrom::End(-(BUNDLE_FOOTER_SIZE as i64))).map_err(|e| e.to_string())?;
    let mut magic = [0u8; 16];
    file.read_exact(&mut magic).map_err(|e| e.to_string())?;
    if &magic != BUNDLE_MAGIC {
        return Err("Embedded compiler runtime footer was not found.".to_owned());
    }
    let mut len_buf = [0u8; 8];
    file.read_exact(&mut len_buf).map_err(|e| e.to_string())?;
    let zip_len = u64::from_le_bytes(len_buf);
    if zip_len == 0 || zip_len > total.saturating_sub(BUNDLE_FOOTER_SIZE) {
        return Err("Embedded compiler runtime length is invalid.".to_owned());
    }
    let zip_offset = total - BUNDLE_FOOTER_SIZE - zip_len;
    file.seek(SeekFrom::Start(zip_offset)).map_err(|e| e.to_string())?;
    let mut bytes = vec![0u8; zip_len as usize];
    file.read_exact(&mut bytes).map_err(|e| e.to_string())?;

    let staging = destination.with_extension("extracting");
    let _ = fs::remove_dir_all(&staging);
    fs::create_dir_all(&staging).map_err(|e| e.to_string())?;
    extract_zip_bytes(&bytes, &staging, 100_000, 1024 * 1024 * 1024)?;
    fs::write(staging.join(".bundle-version"), RUNTIME_VERSION).map_err(|e| e.to_string())?;
    let _ = fs::remove_dir_all(destination);
    fs::rename(&staging, destination).map_err(|e| format!("Could not activate compiler runtime: {e}"))?;
    Ok(())
}

fn runtime_root() -> Result<PathBuf, String> {
    if let Some(value) = env::var_os("TNS_TOOL_RUNTIME_ROOT") {
        let path = PathBuf::from(value);
        if path.is_dir() {
            return Ok(path);
        }
    }
    if let Ok(exe) = env::current_exe() {
        if let Some(parent) = exe.parent() {
            let nearby = parent.join("runtime");
            if nearby.is_dir() {
                return Ok(nearby);
            }
        }
        #[cfg(target_os = "windows")]
        {
            let destination = data_home().join("runtime").join(RUNTIME_VERSION);
            extract_embedded_runtime(&exe, &destination)?;
            return Ok(destination);
        }
    }
    Err("Compiler runtime is unavailable.".to_owned())
}

fn tool_path(root: &Path, relative: &str) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let p = root.join(relative);
        if p.extension().is_none() {
            let exe = p.with_extension("exe");
            if exe.is_file() { return exe; }
        }
        p
    }
    #[cfg(not(target_os = "windows"))]
    {
        root.join(relative)
    }
}

fn detect_toolchain() -> ToolStatus {
    let root = match runtime_root() {
        Ok(root) => root,
        Err(error) => return ToolStatus { ready:false, missing:vec![error], runtime_root:None },
    };
    let required = [
        ("ARM GCC", "toolchain/bin/arm-none-eabi-gcc"),
        ("ARM G++", "toolchain/bin/arm-none-eabi-g++"),
        ("ARM assembler", "toolchain/bin/arm-none-eabi-as"),
        ("ARM linker", "toolchain/bin/arm-none-eabi-ld"),
        ("genzehn", "bin/genzehn"),
        ("Ndless os.h", "ndless/include/os.h"),
        ("Ndless libndls", "ndless/lib/libndls.a"),
        ("Ndless libsyscalls", "ndless/lib/libsyscalls.a"),
        ("Ndless nspireio", "ndless/lib/libnspireio.a"),
        ("Ndless linker script", "ndless/system/ldscript"),
        ("Ndless crt0", "ndless/system/crt0.o"),
        ("Ndless crti", "ndless/system/crti.o"),
        ("Ndless crtn", "ndless/system/crtn.o"),
    ];
    let mut missing = Vec::new();
    for (label, rel) in required {
        if !tool_path(&root, rel).is_file() {
            missing.push(label.to_owned());
        }
    }
    ToolStatus { ready:missing.is_empty(), missing, runtime_root:Some(root) }
}

fn status_json() -> Value {
    let tools = detect_toolchain();
    json!({
        "bridge": true,
        "compiler": true,
        "protocol": PROTOCOL_VERSION,
        "version": VERSION,
        "platform": env::consts::OS,
        "arch": env::consts::ARCH,
        "toolchainReady": tools.ready,
        "toolchain": if tools.ready { "Bundled GNU Arm + Ndless r2022" } else { "not-ready" },
        "missing": tools.missing,
        "listen": LISTEN,
        "transport": "zip",
        "selfContained": true,
    })
}

fn safe_relative_path(value: &Path) -> Result<PathBuf, String> {
    if value.as_os_str().is_empty() || value.is_absolute() {
        return Err("Invalid project path.".to_owned());
    }
    for part in value.components() {
        match part {
            Component::Normal(_) | Component::CurDir => {}
            _ => return Err(format!("Unsafe project path rejected: {}", value.display())),
        }
    }
    Ok(value.to_path_buf())
}

fn extract_zip_bytes(bytes: &[u8], destination: &Path, max_files: usize, max_unpacked: u64) -> Result<(), String> {
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|e| format!("Invalid ZIP: {e}"))?;
    if archive.len() > max_files {
        return Err(format!("ZIP contains too many files (max {max_files})."));
    }
    let mut unpacked = 0u64;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        unpacked = unpacked.saturating_add(entry.size());
        if unpacked > max_unpacked {
            return Err("ZIP expands beyond the allowed size.".to_owned());
        }
        let enclosed = entry.enclosed_name().ok_or_else(|| "ZIP contains an unsafe path.".to_owned())?;
        let relative = safe_relative_path(enclosed)?;
        let target = destination.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out = File::create(&target).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn parse_diagnostics(text: &str, project_root: &Path) -> Vec<Diagnostic> {
    let expression = Regex::new(r"(?m)^(.+?):(\d+):(\d+):\s*(fatal error|error|warning|note):\s*([^\r\n]+)").unwrap();
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

fn append_output(log: &mut String, output: &Output) {
    if !output.stdout.is_empty() {
        log.push_str(&String::from_utf8_lossy(&output.stdout));
        if !log.ends_with('\n') { log.push('\n'); }
    }
    if !output.stderr.is_empty() {
        log.push_str(&String::from_utf8_lossy(&output.stderr));
        if !log.ends_with('\n') { log.push('\n'); }
    }
}

fn run_command(command: &mut Command, log: &mut String, label: &str) -> Result<(), String> {
    log.push_str("$ ");
    log.push_str(label);
    log.push('\n');
    let output = command.output().map_err(|e| format!("Could not start {label}: {e}"))?;
    append_output(log, &output);
    if !output.status.success() {
        return Err(format!("{label} exited with {}.", output.status));
    }
    Ok(())
}

fn collect_sources(root: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = WalkDir::new(root)
        .max_depth(16)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| entry.path().to_path_buf())
        .filter(|path| {
            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
            matches!(ext, "c" | "C" | "cpp" | "cc" | "cxx" | "S" | "s")
        })
        .filter(|path| !path.components().any(|c| c.as_os_str() == ".tns-build"))
        .collect();
    files.sort();
    files
}

fn collect_include_dirs(root: &Path) -> Vec<PathBuf> {
    let mut dirs = vec![root.to_path_buf()];
    let conventional = root.join("include");
    if conventional.is_dir() { dirs.push(conventional); }
    for entry in WalkDir::new(root).max_depth(12).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() { continue; }
        let ext = entry.path().extension().and_then(|s| s.to_str()).unwrap_or("");
        if !matches!(ext, "h" | "hpp" | "hh" | "hxx") { continue; }
        if let Some(parent) = entry.path().parent() {
            let parent = parent.to_path_buf();
            if !dirs.contains(&parent) { dirs.push(parent); }
        }
    }
    dirs
}

fn prepend_path(first: &Path) -> std::ffi::OsString {
    let mut paths = vec![first.to_path_buf()];
    if let Some(current) = env::var_os("PATH") {
        paths.extend(env::split_paths(&current));
    }
    env::join_paths(paths).unwrap_or_else(|_| first.as_os_str().to_os_string())
}

fn compile_project(project_root: &Path, project: &ProjectInfo, runtime: &Path) -> Result<BuildArtifact, Value> {
    if project.target != "zehn-modern" {
        return Err(json!({
            "ok":false,
            "code":"TARGET_NOT_IMPLEMENTED",
            "message":"The self-contained local compiler currently supports Modern Zehn projects."
        }));
    }
    let started = Instant::now();
    let build_dir = project_root.join(".tns-build");
    fs::create_dir_all(&build_dir).map_err(|e| json!({"ok":false,"code":"BUILD_DIR_FAILED","message":e.to_string()}))?;
    let toolchain_bin = runtime.join("toolchain/bin");
    let ndless = runtime.join("ndless");
    let gcc = tool_path(runtime, "toolchain/bin/arm-none-eabi-gcc");
    let gxx = tool_path(runtime, "toolchain/bin/arm-none-eabi-g++");
    let genzehn = tool_path(runtime, "bin/genzehn");
    let include = ndless.join("include");
    let include_ft = include.join("freetype2");
    let lib = ndless.join("lib");
    let system = ndless.join("system");

    let sources = collect_sources(project_root);
    let project_includes = collect_include_dirs(project_root);
    if sources.is_empty() {
        return Err(json!({"ok":false,"code":"NO_SOURCES","message":"Project ZIP contains no C/C++/assembly source files."}));
    }

    let mut log = String::new();
    let mut objects = Vec::new();
    let mut has_cpp = false;
    for (index, source) in sources.iter().enumerate() {
        let ext = source.extension().and_then(|s| s.to_str()).unwrap_or("");
        let cpp = matches!(ext, "cpp" | "cc" | "cxx");
        has_cpp |= cpp;
        let asm = matches!(ext, "S" | "s");
        let object = build_dir.join(format!("source-{index:04}.o"));
        let compiler = if cpp { &gxx } else { &gcc };
        let mut command = Command::new(compiler);
        command.env("PATH", prepend_path(&toolchain_bin));
        command.arg("-mcpu=arm926ej-s").arg("-D_TINSPIRE");
        if asm {
            command.arg("-x").arg("assembler-with-cpp").arg("-D").arg("GNU_AS");
        } else {
            command.args(["-Wall", "-W", "-Os", "-marm", "-ffunction-sections", "-fdata-sections"]);
            if cpp {
                command.args(["-std=c++11", "-fno-exceptions", "-fno-rtti"]);
            }
        }
        for dir in &project_includes { command.arg("-I").arg(dir); }
        command.arg("-I").arg(&include).arg("-I").arg(&include_ft);
        command.arg("-c").arg(source).arg("-o").arg(&object);
        if let Err(message) = run_command(&mut command, &mut log, &format!("compile {}", source.strip_prefix(project_root).unwrap_or(source).display())) {
            let diagnostics = parse_diagnostics(&log, project_root);
            return Err(json!({"ok":false,"code":"NATIVE_COMPILE_FAILED","message":message,"details":log,"diagnostics":diagnostics}));
        }
        objects.push(object);
    }

    let elf = build_dir.join(format!("{}.elf", sanitize_name(&project.name)));
    let driver = if has_cpp { &gxx } else { &gcc };
    let mut link = Command::new(driver);
    link.env("PATH", prepend_path(&toolchain_bin));
    link.arg("-mcpu=arm926ej-s")
        .arg("-nostdlib")
        .arg("-static")
        .arg("-Wl,--pic-veneer")
        .arg("-Wl,--emit-relocs")
        .arg("-Wl,--gc-sections")
        .arg(format!("-Wl,-T,{}", system.join("ldscript").display()))
        .arg(system.join("crt0.o"))
        .arg(system.join("crti.o"));
    for object in &objects { link.arg(object); }
    link.arg("-L").arg(&lib);
    for name in ["freetype", "z", "SDL_gfx", "SDL_image", "SDL"] {
        if lib.join(format!("lib{name}.a")).is_file() {
            link.arg(format!("-l{name}"));
        }
    }
    link.arg("-Wl,--start-group")
        .arg("-lnspireio")
        .arg("-lstdc++")
        .arg("-lndls")
        .arg("-lsyscalls")
        .arg("-lm")
        .arg("-lc")
        .arg("-Wl,--end-group")
        .arg("-lgcc")
        .arg(system.join("crtn.o"))
        .arg("-o").arg(&elf);
    if let Err(message) = run_command(&mut link, &mut log, "link ARM ELF") {
        let diagnostics = parse_diagnostics(&log, project_root);
        return Err(json!({"ok":false,"code":"NATIVE_LINK_FAILED","message":message,"details":log,"diagnostics":diagnostics}));
    }

    let tns = build_dir.join(format!("{}.tns", sanitize_name(&project.name)));
    let mut zehn = Command::new(&genzehn);
    zehn.env("PATH", prepend_path(&toolchain_bin))
        .arg("--input").arg(&elf)
        .arg("--output").arg(&tns)
        .arg("--name").arg(&project.name)
        .arg("--author").arg("TNS Tool")
        .arg("--compress");
    if let Err(message) = run_command(&mut zehn, &mut log, "package Zehn") {
        return Err(json!({"ok":false,"code":"GENZEHN_FAILED","message":message,"details":log,"diagnostics":parse_diagnostics(&log, project_root)}));
    }

    let bytes = fs::read(&tns).map_err(|e| json!({"ok":false,"code":"TNS_READ_FAILED","message":e.to_string()}))?;
    if bytes.len() > MAX_TNS_BYTES || !bytes.starts_with(b"Zehn") {
        return Err(json!({"ok":false,"code":"INVALID_TNS","message":"Local compiler produced an invalid Modern Zehn TNS artifact.","details":log}));
    }
    let elf_bytes = fs::read(&elf).unwrap_or_default();
    let filename = tns.file_name().and_then(|s| s.to_str()).unwrap_or("program.tns").to_owned();
    Ok(BuildArtifact {
        filename,
        bytes,
        elf: elf_bytes,
        duration_ms: started.elapsed().as_millis(),
    })
}

fn project_from_request(request: &Request) -> ProjectInfo {
    ProjectInfo {
        name: sanitize_name(&request_header(request, "X-TNS-Project-Name").unwrap_or_else(|| "ndless-app".to_owned())),
        target: request_header(request, "X-TNS-Project-Target").unwrap_or_else(|| "zehn-modern".to_owned()),
        language: request_header(request, "X-TNS-Project-Language").unwrap_or_else(|| "c".to_owned()),
        template: request_header(request, "X-TNS-Project-Template").unwrap_or_else(|| "basic".to_owned()),
    }
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
        (Method::Get, "/v2/status") | (Method::Get, "/v1/status") => {
            respond_json(request, 200, status_json(), origin.as_deref());
        }
        (Method::Post, "/v2/build") => {
            let protocol = request_header(&request, "X-TNS-Tool-Protocol").and_then(|v| v.parse::<u32>().ok()).unwrap_or(0);
            if protocol != PROTOCOL_VERSION {
                respond_json(request, 426, json!({"ok":false,"code":"PROTOCOL_MISMATCH","message":"Update TNS Tool Compiler to the current version."}), origin.as_deref());
                return;
            }
            let content_type = request_header(&request, "Content-Type").unwrap_or_default();
            if !content_type.to_ascii_lowercase().contains("application/zip") {
                respond_json(request, 415, json!({"ok":false,"code":"ZIP_REQUIRED","message":"Build endpoint expects a project ZIP."}), origin.as_deref());
                return;
            }
            let length = request.body_length().unwrap_or(0);
            if length > MAX_REQUEST_BYTES {
                respond_json(request, 413, json!({"ok":false,"code":"REQUEST_TOO_LARGE","message":"Project ZIP is too large."}), origin.as_deref());
                return;
            }
            let project = project_from_request(&request);
            let mut body = Vec::with_capacity(length);
            if let Err(error) = request.as_reader().take(MAX_REQUEST_BYTES as u64 + 1).read_to_end(&mut body) {
                respond_json(request, 400, json!({"ok":false,"code":"REQUEST_READ_FAILED","message":error.to_string()}), origin.as_deref());
                return;
            }
            if body.len() > MAX_REQUEST_BYTES {
                respond_json(request, 413, json!({"ok":false,"code":"REQUEST_TOO_LARGE","message":"Project ZIP is too large."}), origin.as_deref());
                return;
            }
            let status = detect_toolchain();
            if !status.ready {
                respond_json(request, 503, json!({"ok":false,"code":"LOCAL_TOOLCHAIN_MISSING","message":"The self-contained compiler runtime is incomplete.","missing":status.missing}), origin.as_deref());
                return;
            }
            let runtime = status.runtime_root.unwrap();
            let temp = match TempDir::new() {
                Ok(value) => value,
                Err(error) => {
                    respond_json(request, 500, json!({"ok":false,"code":"TEMP_DIR_FAILED","message":error.to_string()}), origin.as_deref());
                    return;
                }
            };
            if let Err(error) = extract_zip_bytes(&body, temp.path(), MAX_FILES, 128 * 1024 * 1024) {
                respond_json(request, 400, json!({"ok":false,"code":"PROJECT_ZIP_INVALID","message":error}), origin.as_deref());
                return;
            }
            match compile_project(temp.path(), &project, &runtime) {
                Ok(artifact) => respond_tns(request, artifact, origin.as_deref()),
                Err(value) => respond_json(request, 422, value, origin.as_deref()),
            }
        }
        _ => respond_json(request, 404, json!({"ok":false,"code":"NOT_FOUND","message":"Unknown compiler endpoint."}), origin.as_deref()),
    }
}

fn server_loop() {
    let server = match Server::http(LISTEN) {
        Ok(server) => server,
        Err(error) => {
            eprintln!("TNS Tool Compiler could not listen on {LISTEN}: {error}");
            eprintln!("If another compiler instance is already running, this is harmless.");
            return;
        }
    };
    eprintln!("TNS Tool Compiler {VERSION} listening on http://{LISTEN}");
    for request in server.incoming_requests() {
        handle(request);
    }
}

#[cfg(target_os = "windows")]
fn install_self() -> Result<PathBuf, String> {
    let current = env::current_exe().map_err(|e| e.to_string())?;
    let install_dir = data_home();
    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;
    let target = install_dir.join("TNS-Tool-Compiler.exe");
    let same = current.canonicalize().ok() == target.canonicalize().ok() && target.exists();
    if !same {
        fs::copy(&current, &target).map_err(|e| format!("Could not install compiler: {e}"))?;
    }
    let command_value = format!("\"{}\" \"%1\"", target.display());
    let commands: Vec<Vec<String>> = vec![
        vec!["add".into(), r"HKCU\Software\Classes\tnstool".into(), "/ve".into(), "/d".into(), "URL:TNS Tool Compiler Protocol".into(), "/f".into()],
        vec!["add".into(), r"HKCU\Software\Classes\tnstool".into(), "/v".into(), "URL Protocol".into(), "/d".into(), "".into(), "/f".into()],
        vec!["add".into(), r"HKCU\Software\Classes\tnstool\shell\open\command".into(), "/ve".into(), "/d".into(), command_value, "/f".into()],
    ];
    for args in commands {
        let status = Command::new("reg.exe").args(args).status().map_err(|e| e.to_string())?;
        if !status.success() { return Err("Could not register tnstool:// protocol.".to_owned()); }
    }
    Ok(target)
}

#[cfg(not(target_os = "windows"))]
fn install_self() -> Result<PathBuf, String> {
    let source = env::var_os("APPIMAGE").map(PathBuf::from).or_else(|| env::current_exe().ok()).ok_or_else(|| "Could not locate compiler executable.".to_owned())?;
    let install_dir = data_home();
    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;
    let target = install_dir.join("TNS-Tool-Compiler.AppImage");
    let same = source.canonicalize().ok() == target.canonicalize().ok() && target.exists();
    if !same {
        fs::copy(&source, &target).map_err(|e| format!("Could not install compiler: {e}"))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&target).map_err(|e| e.to_string())?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&target, perms).map_err(|e| e.to_string())?;
        }
    }
    let app_dir = env::var_os("XDG_DATA_HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(env::var_os("HOME").unwrap_or_default()).join(".local/share")).join("applications");
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let desktop = app_dir.join("tns-tool-compiler.desktop");
    let content = format!("[Desktop Entry]\nType=Application\nName=TNS Tool Compiler\nExec={} %u\nTerminal=false\nNoDisplay=true\nMimeType=x-scheme-handler/tnstool;\nCategories=Development;\n", target.display());
    fs::write(&desktop, content).map_err(|e| e.to_string())?;
    let _ = Command::new("xdg-mime").args(["default", "tns-tool-compiler.desktop", "x-scheme-handler/tnstool"]).status();
    let _ = Command::new("update-desktop-database").arg(&app_dir).status();
    Ok(target)
}

fn cli_build_zip(zip_path: &Path, output_path: &Path, name: &str) -> Result<(), String> {
    let bytes = fs::read(zip_path).map_err(|e| e.to_string())?;
    let status = detect_toolchain();
    if !status.ready {
        return Err(format!("Runtime incomplete: {}", status.missing.join(", ")));
    }
    let temp = TempDir::new().map_err(|e| e.to_string())?;
    extract_zip_bytes(&bytes, temp.path(), MAX_FILES, 128 * 1024 * 1024)?;
    let project = ProjectInfo { name:sanitize_name(name), target:"zehn-modern".into(), language:"c".into(), template:"basic".into() };
    match compile_project(temp.path(), &project, status.runtime_root.as_ref().unwrap()) {
        Ok(artifact) => {
            fs::write(output_path, &artifact.bytes).map_err(|e| e.to_string())?;
            eprintln!("Built {} ({} bytes, {} ms)", output_path.display(), artifact.bytes.len(), artifact.duration_ms);
            Ok(())
        }
        Err(value) => Err(value.to_string()),
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.get(1).map(String::as_str) == Some("--status-json") {
        println!("{}", status_json());
        return;
    }
    if args.get(1).map(String::as_str) == Some("--build-zip") {
        if args.len() < 4 {
            eprintln!("Usage: TNS-Tool-Compiler --build-zip project.zip output.tns [name]");
            std::process::exit(2);
        }
        let name = args.get(4).map(String::as_str).unwrap_or("smoke");
        if let Err(error) = cli_build_zip(Path::new(&args[2]), Path::new(&args[3]), name) {
            eprintln!("{error}");
            std::process::exit(1);
        }
        return;
    }

    let direct_serve = args.iter().any(|a| a == "--serve") || args.get(1).map(|a| a.starts_with("tnstool://")).unwrap_or(false);
    if direct_serve {
        let _ = runtime_root();
        server_loop();
        return;
    }

    match install_self() {
        Ok(installed) => {
            let current = env::var_os("APPIMAGE").map(PathBuf::from).or_else(|| env::current_exe().ok());
            let same = current.and_then(|p| p.canonicalize().ok()) == installed.canonicalize().ok();
            if same {
                let _ = runtime_root();
                server_loop();
            } else {
                let _ = Command::new(&installed).arg("--serve").spawn();
                println!("TNS Tool Compiler installed. Return to the web page and press Build TNS.");
            }
        }
        Err(error) => {
            eprintln!("Installation failed: {error}");
            std::process::exit(1);
        }
    }
}
