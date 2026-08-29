(() => {
  "use strict";

  const PREFIX = "[Ndless experimental export]";
  const PATCH_KEY = "__tnsExperimentalExportFixV1";
  const fallbackArtifacts = new Map();
  let sequence = 0;

  const now = () => new Date().toISOString().slice(11, 23);
  const byteLength = value => {
    if (typeof value === "string") return new TextEncoder().encode(value).length;
    if (value instanceof Uint8Array) return value.byteLength;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (ArrayBuffer.isView(value)) return value.byteLength;
    if (typeof Blob !== "undefined" && value instanceof Blob) return value.size;
    return 0;
  };

  function ensureLogPanel() {
    const root = document.querySelector("#xml-doctor-panel .ndless-project-workspace");
    if (!root) return null;
    let panel = root.querySelector("[data-ndless-experimental-export-log-panel]");
    if (panel) return panel.querySelector("pre");
    const right = root.querySelector(".ndless-project-right") || root;
    panel = document.createElement("details");
    panel.dataset.ndlessExperimentalExportLogPanel = "1";
    panel.open = true;
    panel.style.margin = "10px";
    panel.innerHTML = '<summary style="cursor:pointer;font-weight:600">Experimental TNS export log</summary><pre data-ndless-experimental-export-log style="max-height:220px;overflow:auto;white-space:pre-wrap;margin:8px 0 0;font-size:11px;line-height:1.45"></pre>';
    right.appendChild(panel);
    return panel.querySelector("pre");
  }

  function log(message, level = "info") {
    const line = `${now()} ${PREFIX} ${String(message ?? "")}`;
    try {
      const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
      fn.call(console, line);
    } catch (_) {}
    try {
      if (typeof window.xmlLog === "function") {
        window.xmlLog(`${level === "error" ? "ERROR " : level === "warn" ? "WARN " : ""}${PREFIX} ${String(message ?? "")}`);
      }
    } catch (_) {}
    const pre = ensureLogPanel();
    if (pre) {
      const existing = pre.textContent ? pre.textContent.split("\n") : [];
      existing.push(line);
      if (existing.length > 400) existing.splice(0, existing.length - 400);
      pre.textContent = existing.join("\n");
      pre.scrollTop = pre.scrollHeight;
    }
  }

  function resetLog() {
    const pre = ensureLogPanel();
    if (pre) pre.textContent = "";
  }

  function isTextProjectFile(name) {
    return /^(?:Makefile|.*\.(?:c|cpp|cc|cxx|h|hpp|hh|hxx|S|s|txt|md|json|mk))$/i.test(String(name || ""));
  }

  function sourceNames(project) {
    return Object.keys(project?.files || {}).filter(name => /\.(?:c|cpp|cc|cxx|S|s)$/i.test(name));
  }

  function embeddedTnsNames(project) {
    return Object.keys(project?.files || {}).filter(name => /\.tns$/i.test(name));
  }

  function summarizeProject(project) {
    const files = Object.entries(project?.files || {}).map(([name, value]) => {
      const kind = typeof value === "string" ? "text" : value?.constructor?.name || typeof value;
      return `${name}=${kind}:${byteLength(value)}B`;
    });
    return {
      sources: sourceNames(project),
      embedded: embeddedTnsNames(project),
      files,
    };
  }

  async function toBytes(value) {
    if (value instanceof Uint8Array) return new Uint8Array(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
    if (typeof Blob !== "undefined" && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
    return null;
  }

  async function findEmbeddedNdless(project) {
    for (const name of embeddedTnsNames(project)) {
      const raw = project.files[name];
      if (typeof raw === "string") {
        log(`Embedded ${name} is stored as text, so its binary bytes were already lost. Reopen the project ZIP after this fix so .tns is imported as binary.`, "warn");
        continue;
      }
      const bytes = await toBytes(raw);
      if (!bytes?.length) continue;
      const parsed = window.NdlessFormatDetector?.detect?.(bytes);
      if (parsed?.valid && parsed.family === "ndless") return { name, bytes, parsed };
      log(`Embedded ${name} exists (${bytes.length} bytes) but is not a valid Ndless artifact (${parsed?.reason || parsed?.format || "unknown"}).`, "warn");
    }
    return null;
  }

  async function rebuildEmbedded(project, embedded, manager) {
    if (!window.NdlessRebuilder?.createAdapter) return null;
    log(`No compilable source is available; rebuilding embedded ${embedded.name} with NdlessRebuilder.`);
    const result = { ...embedded.parsed, bytes: embedded.bytes, file: { name: embedded.name } };
    const adapter = await window.NdlessRebuilder.createAdapter(result);
    const rebuilt = await adapter.build();
    const bytes = rebuilt?.bytes instanceof Uint8Array ? rebuilt.bytes : new Uint8Array(rebuilt?.bytes || 0);
    const detection = window.NdlessFormatDetector?.detect?.(bytes);
    if (!bytes.length || !detection?.valid || detection.family !== "ndless") {
      throw new Error(`Embedded Ndless rebuild failed validation (${detection?.reason || "invalid artifact"}).`);
    }
    const fingerprint = manager.projectFingerprint?.(project) || `embedded:${Date.now()}`;
    const artifact = {
      ok: true,
      engine: "embedded-rebuild",
      target: project?.target || detection.format || "ndless",
      requestedTarget: project?.target || null,
      filename: /\.tns$/i.test(embedded.name) ? embedded.name : `${embedded.name}.tns`,
      bytes,
      elfBytes: new Uint8Array(0),
      format: detection.format || embedded.parsed.format || "ndless",
      detection,
      logs: ["Rebuilt from embedded project TNS."],
      diagnostics: [],
      projectFingerprint: fingerprint,
      projectSnapshot: manager.sanitizedProject?.(project) || null,
      stats: {
        sourceFiles: 0,
        elfSize: 0,
        tnsSize: bytes.length,
        relocations: detection?.relocs?.length || 0,
        durationMs: 0,
        engine: "embedded-rebuild",
      },
      embeddedSource: embedded.name,
    };
    log(`Embedded rebuild validated: ${artifact.filename}, format=${artifact.format}, ${bytes.length} bytes.`);
    return artifact;
  }

  function isExperimentalInvocation(options = {}) {
    return options.openLocal === false
      && options.alreadyOpened === true
      && options.waitForConnection === true;
  }

  function logFailure(result) {
    log(`Build failed: stage=${result?.stage || "unknown"}, code=${result?.code || "unknown"}, message=${result?.message || "unknown"}.`, "error");
    if (result?.details) {
      const lines = String(result.details).split(/\r?\n/).filter(Boolean);
      log(`Compiler details (${lines.length} line${lines.length === 1 ? "" : "s"}):`, "error");
      for (const line of lines.slice(0, 250)) log(`  ${line}`, "error");
      if (lines.length > 250) log(`  … ${lines.length - 250} additional lines omitted`, "warn");
    }
    for (const diagnostic of (result?.diagnostics || []).slice(0, 100)) {
      log(`Diagnostic ${diagnostic.severity || "error"}: ${diagnostic.file || "?"}:${diagnostic.line || 1}:${diagnostic.column || 1} ${diagnostic.message || ""}`, diagnostic.severity === "warning" ? "warn" : "error");
    }
  }

  function patchBuildManager() {
    const original = window.NdlessBuildManager;
    if (!original?.build || original[PATCH_KEY]) return false;

    const patched = {
      ...original,
      [PATCH_KEY]: true,
      async build(project, options = {}) {
        const experimental = isExperimentalInvocation(options);
        const runId = ++sequence;
        if (experimental) resetLog();
        const summary = summarizeProject(project);
        log(`#${runId} build start · project=${project?.name || "unnamed"} · target=${project?.target || "unknown"} · language=${project?.language || "unknown"} · template=${project?.template || "unknown"}`);
        log(`#${runId} sources=${summary.sources.length}${summary.sources.length ? ` [${summary.sources.join(", ")}]` : ""} · embeddedTns=${summary.embedded.length}${summary.embedded.length ? ` [${summary.embedded.join(", ")}]` : ""}`);
        log(`#${runId} files: ${summary.files.join(" | ") || "(none)"}`);

        let status = null;
        try {
          status = await original.localStatus?.({ timeoutMs: 950, signal: options.signal });
          if (status) log(`#${runId} local compiler: connected=${!!status.connected}, toolchainReady=${!!status.toolchainReady}, protocol=${status.protocol || 0}, platform=${status.platform || "unknown"}, version=${status.version || "unknown"}`);
        } catch (error) {
          log(`#${runId} local status check failed: ${error?.message || error}`, "warn");
        }

        const forwarded = {
          ...options,
          onProgress(info) {
            log(`#${runId} [${info?.stage || "build"}] ${info?.message || ""}`);
            options.onProgress?.(info);
          },
        };

        let result = await original.build(project, forwarded);

        if (!result?.ok && experimental && summary.sources.length > 0 && project?.target !== "zehn-modern" && ["TARGET_NOT_IMPLEMENTED", "LOCAL_COMPILER_REQUIRED"].includes(result?.code)) {
          log(`#${runId} requested target ${project.target} is not supported by the experimental compiler. Retrying the same sources as Modern Zehn; the project setting itself is not changed.`, "warn");
          const modernProject = {
            ...project,
            target: "zehn-modern",
            files: { ...(project.files || {}) },
            settings: { ...(project.settings || {}) },
          };
          result = await original.build(modernProject, forwarded);
          if (result?.ok) {
            const fingerprint = original.projectFingerprint?.(project) || result.projectFingerprint;
            result = {
              ...result,
              projectFingerprint: fingerprint,
              requestedTarget: project.target,
              builtTarget: "zehn-modern",
              experimentalTargetFallback: true,
            };
            if (fingerprint) fallbackArtifacts.set(fingerprint, result);
            log(`#${runId} legacy target fallback succeeded as Modern Zehn. Output remains a real Ndless TNS; requested=${project.target}, built=zehn-modern.`, "warn");
          }
        }

        if (!result?.ok && experimental && summary.sources.length === 0 && summary.embedded.length > 0) {
          const embedded = await findEmbeddedNdless(project);
          if (embedded) {
            try {
              result = await rebuildEmbedded(project, embedded, original);
            } catch (error) {
              log(`#${runId} embedded rebuild failed: ${error?.message || error}`, "error");
            }
          }
        }

        if (!result?.ok) {
          logFailure(result);
          return result;
        }

        const detection = result.detection || window.NdlessFormatDetector?.detect?.(result.bytes);
        log(`#${runId} build complete · engine=${result.engine || "unknown"} · filename=${result.filename || "program.tns"} · bytes=${result.bytes?.length || 0} · format=${detection?.format || result.format || "unknown"} · valid=${!!detection?.valid}`);
        if (result.stats) log(`#${runId} stats: ${JSON.stringify(result.stats)}`);
        return result;
      },
      artifact(project = null) {
        if (project && original.projectFingerprint) {
          const fingerprint = original.projectFingerprint(project);
          const cached = fallbackArtifacts.get(fingerprint);
          if (cached?.ok) return cached;
        }
        return original.artifact?.(project) || null;
      },
      dispose() {
        fallbackArtifacts.clear();
        return original.dispose?.();
      },
    };
    window.NdlessBuildManager = Object.freeze(patched);
    log("Build manager diagnostics/fallback patch installed.");
    return true;
  }

  function applyModernDefault() {
    document.querySelectorAll(".ndless-project-dialog select[name='target']").forEach(select => {
      if (select.dataset.experimentalModernDefault === "1") return;
      select.dataset.experimentalModernDefault = "1";
      if (select.value === "bflt-r903" && Array.from(select.options).some(option => option.value === "zehn-modern")) {
        select.value = "zehn-modern";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        log("New-project default target changed to Modern Zehn because it is the target supported by experimental TNS reconstruction.");
      }
    });
  }

  async function openProjectZipBinarySafe(file) {
    if (!file || typeof window.JSZip !== "function") return false;
    log(`Opening Ndless project ZIP with binary-safe importer: ${file.name || "project.zip"}`);
    const zip = await window.JSZip.loadAsync(file);
    const entries = {};
    let textCount = 0;
    let binaryCount = 0;
    for (const [name, object] of Object.entries(zip.files)) {
      if (object.dir || name.includes("../") || name.startsWith("/")) continue;
      if (name === ".tnsproject.json" || isTextProjectFile(name)) {
        entries[name] = await object.async("text");
        textCount += 1;
      } else if (/\.tns$/i.test(name)) {
        entries[name] = await object.async("uint8array");
        binaryCount += 1;
      }
    }
    const core = window.NdlessProjectCore;
    const workspace = window.NdlessProjectWorkspace;
    if (!core?.importEntries || !workspace?.activateProject) throw new Error("Ndless project workspace is not ready.");
    const project = core.importEntries(entries);
    workspace.activateProject(project);
    log(`Project ZIP imported: text=${textCount}, binaryTns=${binaryCount}, project=${project.name}, target=${project.target}.`);
    return true;
  }

  async function exportProjectZipBinarySafe(project) {
    if (!project || typeof window.JSZip !== "function") return false;
    const core = window.NdlessProjectCore;
    if (!core?.exportEntries) return false;
    const entries = core.exportEntries(project);
    const zip = new window.JSZip();
    for (const [name, value] of Object.entries(entries)) {
      if (value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value) || (typeof Blob !== "undefined" && value instanceof Blob)) zip.file(name, value);
      else zip.file(name, String(value ?? ""));
    }
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${core.sanitizeProjectName?.(project.name) || project.name || "ndless-project"}-ndless-project.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    log(`Project ZIP exported without stringifying binary files: ${a.download} (${blob.size} bytes).`);
    return true;
  }

  function installProjectZipGuards() {
    document.addEventListener("change", event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (!String(input.accept || "").split(",").some(value => value.trim() === ".zip")) return;
      if (!input.closest?.("[data-ndless-project-action='1']")) return;
      const file = input.files?.[0];
      if (!file) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openProjectZipBinarySafe(file).catch(error => log(`Project ZIP import failed: ${error?.message || error}`, "error"));
      input.value = "";
    }, true);

    document.addEventListener("click", event => {
      const button = event.target?.closest?.("[data-project-download]");
      if (!button) return;
      const project = window.NdlessProjectWorkspace?.getProject?.();
      if (!project) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      exportProjectZipBinarySafe(project).catch(error => log(`Project ZIP export failed: ${error?.message || error}`, "error"));
    }, true);
  }

  function setup() {
    patchBuildManager();
    applyModernDefault();
  }

  installProjectZipGuards();
  setup();
  const observer = new MutationObserver(() => setup());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("tns-runtime-ready", setup);
  try {
    if (window.NdlessRuntimeReady?.then) window.NdlessRuntimeReady.then(setup).catch(() => {});
  } catch (_) {}
  let setupRetries = 0;
  const retrySetup = () => {
    setup();
    if (!window.NdlessBuildManager?.[PATCH_KEY] && setupRetries++ < 120) setTimeout(retrySetup, 100);
  };
  retrySetup();

  window.NdlessExperimentalExportDiagnostics = Object.freeze({
    log,
    resetLog,
    setup,
    openProjectZipBinarySafe,
    exportProjectZipBinarySafe,
  });
})();
