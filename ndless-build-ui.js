(() => {
  "use strict";

  const $ = (s,r=document) => r.querySelector(s);
  let currentRoot = null;
  let controller = null;
  let currentResult = null;
  let buildState = { stage:"idle", message:"Ready to build." };

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
      startLineNumber: Math.max(1,d.line||1), startColumn: Math.max(1,d.column||1),
      endLineNumber: Math.max(1,d.line||1), endColumn: Math.max(2,(d.column||1)+1),
      severity: d.severity === "warning" ? severity.Warning : (d.severity === "info" ? severity.Info : severity.Error),
      message: d.message || "Build diagnostic",
      source: "Ndless Build",
    })));
  }

  function render() {
    const root = currentRoot;
    const pane = root && $("[data-project-build]", root);
    const p = project();
    if (!pane || !p) return;
    const target = window.NdlessProjectCore?.TARGETS?.[p.target]?.label || p.target;
    const compatibility = window.NdlessBuildManager?.browserCompatibility?.(p) || {ok:true};
    const busy = !["idle","complete","error","cancelled"].includes(buildState.stage);
    const stageLabel = ({preparing:"Preparing compiler",compiling:"Compiling ARM",assembling:"Assembling",linking:"Linking ELF",packaging:"Building Zehn",validating:"Validating TNS",complete:"Build successful",error:"Build failed",cancelled:"Build cancelled",idle:"Ready"})[buildState.stage] || buildState.stage;
    const statusClass = buildState.stage === "complete" ? "ok" : (buildState.stage === "error" ? "bad" : "");
    pane.innerHTML = `<div class="ndless-real-build">
      <div class="ndless-real-build-grid">
        <div class="ndless-project-build-card"><span>Target</span><strong>${escapeHtml(target)}</strong><small>${p.target === "zehn-modern" ? "Browser build · ELF32 ARM → Zehn" : "Legacy target"}</small></div>
        <div class="ndless-project-build-card"><span>Status</span><strong class="${statusClass}">${escapeHtml(stageLabel)}</strong><small>${escapeHtml(buildState.message || "")}</small></div>
      </div>
      ${!compatibility.ok && buildState.stage === "idle" ? `<div class="ndless-real-build-warning"><b>Full SDK runtime required</b><span>${escapeHtml(compatibility.message)}</span><small>${escapeHtml(compatibility.details || "")}</small></div>` : ""}
      <div class="ndless-real-build-actions">
        ${busy ? `<button type="button" class="danger" data-real-build-cancel>Cancel build</button>` : `<button type="button" class="primary" data-real-build-start>Build TNS</button>`}
        ${currentResult?.ok ? `<button type="button" data-real-build-download>Download TNS</button><button type="button" data-real-build-inspect>Inspect</button>` : ""}
      </div>
      ${currentResult?.ok ? `<div class="ndless-real-build-artifact"><b>${escapeHtml(currentResult.filename)}</b><span>${bytesLabel(currentResult.bytes.length)} · ARM · Zehn</span><span>${currentResult.stats?.relocations ?? 0} relocations · ${currentResult.stats?.durationMs ?? 0} ms</span></div>` : ""}
      ${buildState.details ? `<pre class="ndless-real-build-log">${escapeHtml(buildState.details)}</pre>` : ""}
      <p class="ndless-real-build-note">Build TNS is not the Quick Preview. It lazy-loads a compiler, requires a real ARM backend, links ELF32 ARM, packages Zehn and rejects the result unless the local Ndless parser validates it.</p>
    </div>`;
    $("[data-real-build-start]", pane)?.addEventListener("click", runBuild);
    $("[data-real-build-cancel]", pane)?.addEventListener("click", () => controller?.abort());
    $("[data-real-build-download]", pane)?.addEventListener("click", () => window.NdlessBuildManager?.download?.(currentResult));
    $("[data-real-build-inspect]", pane)?.addEventListener("click", inspectResult);
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
    setState("preparing", "Preparing browser ARM compiler…");
    applyMarkers([]);
    const lines = ["> Build TNS", `target: ${p.target}`, ""];
    consoleLines(lines);
    const result = await window.NdlessBuildManager.build(p, {
      signal: controller.signal,
      onProgress(info) {
        setState(info.stage || "preparing", info.message || info.stage || "Working…");
        lines.push(`[${info.stage || "build"}] ${info.message || ""}`);
        consoleLines(lines);
      },
    });
    controller = null;
    if (!result.ok) {
      applyMarkers(result.diagnostics || []);
      const detail = [result.message, result.details].filter(Boolean).join("\n\n");
      setState(result.stage === "cancelled" ? "cancelled" : "error", result.message || "Build failed.", detail);
      lines.push("", `ERROR: ${result.message || "Build failed."}`);
      if (result.details) lines.push(result.details);
      consoleLines(lines);
      return;
    }
    currentResult = result;
    applyMarkers(result.diagnostics || []);
    setState("complete", `${result.filename} · ${bytesLabel(result.bytes.length)}`);
    lines.push("", `✓ ${result.filename}`, `ELF: ${bytesLabel(result.elfBytes.length)}`, `TNS: ${bytesLabel(result.bytes.length)}`, `Relocations: ${result.stats?.relocations ?? 0}`);
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
    $("[data-project-tab='build']", root)?.addEventListener("click", () => setTimeout(render, 0));
    render();
  }

  function enhanceWizard() {
    const form = document.querySelector(".ndless-project-dialog-overlay-v2 form.ndless-project-dialog");
    if (!form || form.dataset.browserTemplateEnhanced === "1") return;
    form.dataset.browserTemplateEnhanced = "1";
    const language = form.querySelector("select[name='language']");
    const template = form.querySelector("select[name='template']");
    const target = form.querySelector("select[name='target']");
    const note = form.querySelector("[data-project-mode-note]");
    if (!template || !target || !language) return;

    let userPickedTemplate = false;
    const originalNote = note?.textContent || "";
    let option = Array.from(template.options).find(item => item.value === "browser-minimal");
    if (!option) {
      option = document.createElement("option");
      option.value = "browser-minimal";
      option.textContent = "Browser minimal (freestanding)";
      template.insertBefore(option, template.firstChild);
    }

    const sync = ({ targetChanged = false } = {}) => {
      const modern = target.value === "zehn-modern";
      const assembly = language.value === "asm";
      option.disabled = !modern || assembly;

      if ((!modern || assembly) && template.value === "browser-minimal") template.value = "basic";

      // A freshly-created Modern Zehn project must compile without the user
      // having to discover a special template after Build TNS fails.
      if (modern && !assembly && (targetChanged || !userPickedTemplate)) {
        template.value = "browser-minimal";
      }

      if (note) {
        if (modern && !assembly && template.value === "browser-minimal") {
          note.textContent = "Browser-ready starter: Build TNS can compile this minimal project without the external Ndless SDK/sysroot.";
        } else if (modern) {
          note.textContent = "This SDK template uses Ndless headers/libraries. Browser Build TNS needs the full Ndless sysroot for it; Browser minimal is the immediately buildable starter.";
        } else {
          note.textContent = originalNote;
        }
      }
    };

    template.addEventListener("change", () => {
      userPickedTemplate = true;
      sync();
    });
    target.addEventListener("change", () => {
      userPickedTemplate = false;
      sync({ targetChanged: true });
    });
    language.addEventListener("change", () => sync());
    sync({ targetChanged: target.value === "zehn-modern" });
  }

  function setup() {
    const root = $("#xml-doctor-panel .ndless-project-workspace");
    if (root !== currentRoot) {
      currentRoot = root;
      currentResult = null;
      buildState = { stage:"idle", message:"Ready to build." };
      if (root) inject(root);
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
      if (event.target.closest?.("#xml-new-ndless-project,.ndless-project-menu-action,[data-project-new-file]")) setTimeout(setup, 30);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();
