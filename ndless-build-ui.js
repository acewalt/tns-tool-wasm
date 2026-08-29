(() => {
  "use strict";

  const $ = (s,r=document) => r.querySelector(s);
  let currentRoot = null;
  let controller = null;
  let currentResult = null;
  let bridgePollTimer = null;
  let bridgeState = { checked:false, connected:false, toolchainReady:false, platform:"unknown", version:null, missing:[] };
  let buildState = { stage:"idle", message:"Ready to build." };

  const BRIDGE_POLL_MS = 10000;
  const project = () => window.NdlessProjectWorkspace?.getProject?.() || null;

  function bytesLabel(n) {
    const x = Number(n)||0;
    if (x < 1024) return `${x} B`;
    if (x < 1024*1024) return `${(x/1024).toFixed(1)} KB`;
    return `${(x/1024/1024).toFixed(2)} MB`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function selectBuildTab(root) {
    const tab = $("[data-project-tab='build']", root);
    if (tab && !tab.classList.contains("active")) tab.click();
  }

  function consoleLines(lines) {
    const root = currentRoot;
    const out = root && $("[data-project-console]", root);
    if (out) out.textContent = lines.join("\n");
  }

  function applyMarkers(diagnostics = []) {
    const monaco = window.TnsMonacoEditor?.monaco;
    const p = project();
    if (!monaco || !p) return;
    const relevant = diagnostics.filter(d => !d.file || d.file === p.activeFile);
    const model = monaco.editor.getModels().filter(m => !m.isDisposed()).at(-1);
    if (!model) return;
    const severity = monaco.MarkerSeverity;
    monaco.editor.setModelMarkers(model, "ndless-build", relevant.map(d => ({
      startLineNumber:Math.max(1,d.line||1), startColumn:Math.max(1,d.column||1),
      endLineNumber:Math.max(1,d.line||1), endColumn:Math.max(2,(d.column||1)+1),
      severity:d.severity === "warning" ? severity.Warning : (d.severity === "info" ? severity.Info : severity.Error),
      message:d.message || "Build diagnostic",
      source:"Ndless Build",
    })));
  }

  function clearBridgePoll() {
    if (bridgePollTimer) clearTimeout(bridgePollTimer);
    bridgePollTimer = null;
  }

  function scheduleBridgePoll() {
    clearBridgePoll();
    if (!currentRoot) return;
    bridgePollTimer = setTimeout(async () => {
      bridgePollTimer = null;
      await refreshBridgeStatus(false);
      scheduleBridgePoll();
    }, BRIDGE_POLL_MS);
  }

  async function refreshBridgeStatus(renderAfter = true) {
    if (!window.NdlessBuildManager?.localStatus) return bridgeState;
    try {
      const status = await window.NdlessBuildManager.localStatus({ timeoutMs:700 });
      bridgeState = { checked:true, ...status };
    } catch (_) {
      bridgeState = { checked:true, connected:false, toolchainReady:false, platform:"unknown", version:null, missing:[] };
    }
    if (renderAfter) render();
    return bridgeState;
  }

  function bridgePanel() {
    const downloads = window.NdlessLocalBridge?.DOWNLOADS || {};
    if (bridgeState.connected && bridgeState.toolchainReady) {
      return `<div class="ndless-real-build-ready ndless-local-engine">
        <b>Local TNS compiler</b>
        <span><i class="ndless-toolchain-dot"></i> Connected · ${escapeHtml(bridgeState.platform || "native")}</span>
        <small>Bridge ${escapeHtml(bridgeState.version || "")} · Native Ndless toolchain ready. Project builds stay on this computer.</small>
      </div>`;
    }
    if (bridgeState.connected) {
      return `<div class="ndless-real-build-waiting ndless-local-engine">
        <b>Local TNS compiler</b>
        <span><i class="ndless-toolchain-dot"></i> Bridge connected · toolchain incomplete</span>
        <small>${bridgeState.missing?.length ? `Missing: ${escapeHtml(bridgeState.missing.join(", "))}` : "The bridge is installed, but its Ndless compiler bundle is not ready yet."}</small>
      </div>`;
    }
    return `<div class="ndless-real-build-waiting ndless-local-engine">
      <b>Local TNS compiler</b>
      <span><i class="ndless-toolchain-dot"></i> Not connected</span>
      <small>Build TNS will try to open <code>tnstool://start</code>. Install the bridge once for your operating system.</small>
      <div class="ndless-local-links">
        <button type="button" data-open-local-compiler>Open compiler</button>
        ${downloads.windows ? `<a href="${escapeHtml(downloads.windows)}" target="_blank" rel="noopener">Windows x64</a>` : ""}
        ${downloads.linux ? `<a href="${escapeHtml(downloads.linux)}" target="_blank" rel="noopener">Linux x64</a>` : ""}
      </div>
    </div>`;
  }

  function render() {
    const root = currentRoot;
    const pane = root && $("[data-project-build]", root);
    const p = project();
    if (!pane || !p) return;
    const target = window.NdlessProjectCore?.TARGETS?.[p.target]?.label || p.target;
    const busy = !["idle","complete","error","cancelled","needs-local"].includes(buildState.stage);
    const stageLabel = ({
      connecting:"Opening local compiler",
      sending:"Sending project",
      preparing:"Preparing compiler",
      compiling:"Compiling ARM",
      assembling:"Assembling",
      linking:"Linking ELF",
      packaging:"Building Zehn",
      validating:"Validating TNS",
      complete:"Build successful",
      error:"Build failed",
      cancelled:"Build cancelled",
      "needs-local":"Local compiler required",
      idle:"Ready",
    })[buildState.stage] || buildState.stage;
    const statusClass = buildState.stage === "complete" ? "ok" : (buildState.stage === "error" ? "bad" : (buildState.stage === "needs-local" ? "warn" : ""));
    const engineLabel = bridgeState.connected && bridgeState.toolchainReady ? `Local · ${bridgeState.platform || "native"}` : "Local preferred · browser fallback experimental";

    pane.innerHTML = `<div class="ndless-real-build">
      <div class="ndless-real-build-grid">
        <div class="ndless-project-build-card"><span>Target</span><strong>${escapeHtml(target)}</strong><small>${escapeHtml(engineLabel)}</small></div>
        <div class="ndless-project-build-card"><span>Status</span><strong class="${statusClass}">${escapeHtml(stageLabel)}</strong><small>${escapeHtml(buildState.message || "")}</small></div>
      </div>
      ${bridgePanel()}
      <div class="ndless-real-build-actions">
        ${busy ? `<button type="button" class="danger" data-real-build-cancel>Cancel build</button>` : `<button type="button" class="primary" data-real-build-start>Build TNS</button>`}
        ${currentResult?.ok ? `<button type="button" data-real-build-download>Download TNS</button><button type="button" data-real-build-inspect>Inspect</button>` : ""}
      </div>
      ${currentResult?.ok ? `<div class="ndless-real-build-artifact"><b>${escapeHtml(currentResult.filename)}</b><span>${bytesLabel(currentResult.bytes.length)} · ${escapeHtml(currentResult.engine === "local" ? `Local ${currentResult.platform || "native"}` : "Browser WASM")}</span><span>${currentResult.stats?.durationMs ?? 0} ms</span></div>` : ""}
      ${buildState.details ? `<pre class="ndless-real-build-log">${escapeHtml(buildState.details)}</pre>` : ""}
      <p class="ndless-real-build-note">Preferred path: the page opens the Windows/Linux TNS Tool Compiler and sends the project only through 127.0.0.1. The native toolchain returns the .tns to this page. Browser WebAssembly remains an optional fallback.</p>
    </div>`;

    $("[data-real-build-start]", pane)?.addEventListener("click", runBuild);
    $("[data-real-build-cancel]", pane)?.addEventListener("click", () => controller?.abort());
    $("[data-real-build-download]", pane)?.addEventListener("click", () => window.NdlessBuildManager?.download?.(currentResult));
    $("[data-real-build-inspect]", pane)?.addEventListener("click", inspectResult);
    $("[data-open-local-compiler]", pane)?.addEventListener("click", async () => {
      window.NdlessLocalBridge?.openLocalCompiler?.();
      setTimeout(() => refreshBridgeStatus(true), 1200);
      setTimeout(() => refreshBridgeStatus(true), 3500);
    });
  }

  function setState(stage, message, details="") {
    buildState = { stage, message, details };
    render();
  }

  async function runBuild() {
    const p = project();
    if (!p || !window.NdlessBuildManager) return;
    currentResult = null;
    controller?.abort?.();
    controller = new AbortController();
    selectBuildTab(currentRoot);
    setState("connecting", "Checking the local Windows/Linux compiler…");
    applyMarkers([]);
    const lines = ["> Build TNS", `target: ${p.target}`, "engine: local compiler preferred", ""];
    consoleLines(lines);

    const result = await window.NdlessBuildManager.build(p, {
      signal:controller.signal,
      onProgress(info) {
        setState(info.stage || "preparing", info.message || info.stage || "Working…");
        lines.push(`[${info.stage || "build"}] ${info.message || ""}`);
        consoleLines(lines);
      },
    });
    controller = null;
    await refreshBridgeStatus(false);

    if (!result.ok) {
      applyMarkers(result.diagnostics || []);
      const detail = [result.message, result.details].filter(Boolean).join("\n\n");
      const needsLocal = ["LOCAL_COMPILER_REQUIRED","LOCAL_TOOLCHAIN_MISSING","LOCAL_BRIDGE_UNAVAILABLE"].includes(result.code);
      setState(result.stage === "cancelled" ? "cancelled" : (needsLocal ? "needs-local" : "error"), result.message || "Build failed.", detail);
      lines.push("", `${needsLocal ? "LOCAL:" : "ERROR:"} ${result.message || "Build failed."}`);
      if (result.details) lines.push(result.details);
      consoleLines(lines);
      return;
    }

    currentResult = result;
    applyMarkers(result.diagnostics || []);
    setState("complete", `${result.filename} · ${bytesLabel(result.bytes.length)}`);
    lines.push("", `✓ ${result.filename}`, `Engine: ${result.engine === "local" ? `local ${result.platform || "native"}` : "browser WASM"}`);
    if (result.elfBytes?.length) lines.push(`ELF: ${bytesLabel(result.elfBytes.length)}`);
    lines.push(`TNS: ${bytesLabel(result.bytes.length)}`);
    consoleLines(lines);
  }

  async function inspectResult() {
    if (!currentResult?.ok) return;
    const file = new File([currentResult.bytes], currentResult.filename, { type:"application/octet-stream" });
    if (window.TnsNdlessInspector?.open) await window.TnsNdlessInspector.open(file);
  }

  function inject(root) {
    if (!root || root.dataset.realBuildUi === "1") return;
    root.dataset.realBuildUi = "1";
    const actions = $(".ndless-project-actions", root);
    if (actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary ndless-build-tns-button";
      button.textContent = "Build TNS";
      button.addEventListener("click", () => { selectBuildTab(root); setTimeout(() => { render(); runBuild(); }, 0); });
      actions.insertBefore(button, actions.firstChild);
    }
    $("[data-project-tab='build']", root)?.addEventListener("click", () => {
      setTimeout(render, 0);
      refreshBridgeStatus(true);
    });
    render();
  }

  function enhanceWizard() {
    const form = document.querySelector(".ndless-project-dialog-overlay-v2 form.ndless-project-dialog, .ndless-project-dialog-overlay form.ndless-project-dialog");
    if (!form || form.dataset.browserTemplateEnhanced === "local-v1") return;
    form.dataset.browserTemplateEnhanced = "local-v1";
    const language = form.querySelector("select[name='language']");
    const template = form.querySelector("select[name='template']");
    const target = form.querySelector("select[name='target']");
    const note = form.querySelector("[data-project-mode-note]") || form.querySelector("p");
    if (!template || !target || !language) return;

    let option = Array.from(template.options).find(item => item.value === "browser-minimal");
    if (!option) {
      option = document.createElement("option");
      option.value = "browser-minimal";
      template.appendChild(option);
    }
    option.textContent = "Browser minimal (WASM fallback)";

    const originalNote = note?.textContent || "";
    const sync = () => {
      const modern = target.value === "zehn-modern";
      const assembly = language.value === "asm";
      option.disabled = !modern || assembly;
      if ((!modern || assembly) && template.value === "browser-minimal") template.value = "basic";
      if (note) {
        if (modern && template.value === "browser-minimal") {
          note.textContent = "Freestanding template for the experimental browser-only compiler. The local compiler can use the normal Ndless SDK templates instead.";
        } else if (modern) {
          note.textContent = "Recommended: normal Ndless SDK project. Build TNS will use the installed Windows/Linux local compiler when available.";
        } else {
          note.textContent = originalNote;
        }
      }
    };
    template.addEventListener("change", sync);
    target.addEventListener("change", sync);
    language.addEventListener("change", sync);
    sync();
  }

  function setup() {
    const root = $("#xml-doctor-panel .ndless-project-workspace");
    if (root !== currentRoot) {
      clearBridgePoll();
      currentRoot = root;
      currentResult = null;
      bridgeState = { checked:false, connected:false, toolchainReady:false, platform:"unknown", version:null, missing:[] };
      buildState = { stage:"idle", message:"Ready to build." };
      if (root) {
        inject(root);
        refreshBridgeStatus(true);
        scheduleBridgePoll();
      }
    } else if (root) inject(root);
  }

  function init() {
    setup();
    const panel = $("#xml-doctor-panel");
    if (panel) new MutationObserver(setup).observe(panel, { childList:true });
    document.addEventListener("pointerdown", event => {
      if (event.target.closest?.("#xml-new-ndless-project")) setTimeout(enhanceWizard, 20);
    }, true);
    document.addEventListener("click", event => {
      if (event.target.closest?.("#xml-new-ndless-project,.ndless-project-menu-action,[data-project-new-file]")) {
        setTimeout(setup, 30);
        setTimeout(enhanceWizard, 30);
      }
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();