(() => {
  "use strict";

  const BUILD_OVERLAY_ID = "tns-build-progress-overlay";
  const BUILD_STYLE_ID = "tns-build-official-flow-style";
  const READY_MARKER_KEY = "tns-tool-compiler-known-ready";
  const BUILD_WAIT_MS = 4 * 60 * 1000;
  const INSTALL_WAIT_MS = 10 * 60 * 1000;

  let activeFlow = null;
  let activeBuildSession = null;
  let allowInternalBuildClick = false;
  let lastManager = null;

  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Build cancelled", "AbortError"));
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Build cancelled", "AbortError"));
    };
    signal?.addEventListener?.("abort", onAbort, { once:true });
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function versionParts(value) {
    return String(value || "0").split(/[^0-9]+/).filter(Boolean).slice(0, 4).map(Number);
  }

  function compareVersions(a, b) {
    const upgrade = window.NdlessLocalRuntimeUpgrade;
    if (typeof upgrade?.compareVersions === "function") return upgrade.compareVersions(a, b);
    const aa = versionParts(a), bb = versionParts(b);
    const count = Math.max(aa.length, bb.length, 3);
    for (let i = 0; i < count; i += 1) {
      const av = aa[i] || 0, bv = bb[i] || 0;
      if (av !== bv) return av < bv ? -1 : 1;
    }
    return 0;
  }

  function detectPlatform() {
    return window.NdlessLocalBridge?.detectDesktopPlatform?.()
      || window.NdlessLocalRuntimeUpgrade?.detectDesktopPlatform?.()
      || null;
  }

  function expectedVersion(platform) {
    return window.NdlessLocalRuntimeUpgrade?.expectedVersionForPlatform?.(platform)
      || (platform === "windows" ? "0.2.2" : "0.2.1");
  }

  function statusReady(status) {
    if (!status?.connected || status.legacy || Number(status.protocol || 0) !== 2 || !status.toolchainReady) return false;
    const platform = status.platform || detectPlatform();
    const expected = expectedVersion(platform);
    return !expected || compareVersions(status.version, expected) >= 0;
  }

  function saveReadyMarker(status) {
    try {
      localStorage.setItem(READY_MARKER_KEY, JSON.stringify({
        at:Date.now(),
        platform:status?.platform || detectPlatform() || "unknown",
        version:status?.version || "unknown",
      }));
    } catch (_) {}
  }

  function readReadyMarker() {
    try {
      const value = JSON.parse(localStorage.getItem(READY_MARKER_KEY) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (_) { return null; }
  }

  function bytesLabel(n) {
    const value = Number(n) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }

  function ensureStepperStyles() {
    if (document.getElementById("tns-import-progress-style")) return Promise.resolve();
    const existing = document.querySelector('script[data-import-progress-stepper="true"]');
    if (existing) {
      return new Promise(resolve => {
        if (document.getElementById("tns-import-progress-style")) return resolve();
        const done = () => resolve();
        existing.addEventListener("load", done, { once:true });
        existing.addEventListener("error", done, { once:true });
        setTimeout(done, 1200);
      });
    }
    return new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "./import-progress-stepper.js?v=20260829-build-official-v1";
      script.async = false;
      script.dataset.importProgressStepper = "true";
      script.addEventListener("load", resolve, { once:true });
      script.addEventListener("error", resolve, { once:true });
      document.head.appendChild(script);
      setTimeout(resolve, 1500);
    });
  }

  function installBuildStyles() {
    if (document.getElementById(BUILD_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = BUILD_STYLE_ID;
    style.textContent = `
      #${BUILD_OVERLAY_ID} .tns-import-progress-actions { gap:10px; flex-wrap:wrap; }
      #${BUILD_OVERLAY_ID} .tns-build-progress-secondary,
      #${BUILD_OVERLAY_ID} .tns-build-progress-cancel {
        min-height:39px; padding:9px 16px; border-radius:999px; font:inherit; font-size:12px; font-weight:800; cursor:pointer;
      }
      #${BUILD_OVERLAY_ID} .tns-build-progress-secondary { border:1px solid rgba(132,172,224,.45); background:rgba(53,82,122,.22); color:#d7e7fb; }
      #${BUILD_OVERLAY_ID} .tns-build-progress-cancel { border:1px solid rgba(255,123,123,.35); background:rgba(122,39,47,.18); color:#ffc7c7; }
      #${BUILD_OVERLAY_ID} .tns-build-progress-secondary[hidden],
      #${BUILD_OVERLAY_ID} .tns-build-progress-cancel[hidden] { display:none; }
      #${BUILD_OVERLAY_ID} .tns-import-progress-close { display:none; }
      #${BUILD_OVERLAY_ID} .tns-import-progress-close.visible { display:block; }
      #${BUILD_OVERLAY_ID} .tns-build-progress-version { color:#a8ff4c; font-weight:800; }
    `;
    document.head.appendChild(style);
  }

  function checkMarkup() { return '<span aria-hidden="true">✓</span>'; }

  function createBuildOverlay(project) {
    installBuildStyles();
    document.getElementById(BUILD_OVERLAY_ID)?.remove();
    const overlay = document.createElement("div");
    overlay.id = BUILD_OVERLAY_ID;
    overlay.className = "tns-import-progress-overlay tns-build-progress-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Build TNS");
    overlay.innerHTML = `
      <section class="tns-import-progress-card">
        <div class="tns-import-progress-head">
          <div>
            <div class="tns-import-progress-kicker">Build TNS</div>
            <h2>Generando TNS</h2>
            <p>La página prepara el compilador local, envía el proyecto y descarga el TNS terminado automáticamente.</p>
          </div>
          <div class="tns-import-progress-icon" aria-hidden="true">⚙</div>
        </div>
        ${stepMarkup(1, "Preparar compilador", "Comprobando TNS Tool Compiler…")}
        ${stepMarkup(2, "Enviar proyecto", `Se preparará ${escapeHtml(project?.name || "project")}.zip en memoria.`)}
        ${stepMarkup(3, "Compilar TNS", "El compilador local ejecutará ARM GCC, linker y genzehn.")}
        ${stepMarkup(4, "Descargar resultado", "El .tns se descargará automáticamente cuando termine.")}
        <div class="tns-import-progress-summary" aria-live="polite"><strong>Preparando Build TNS.</strong> Comprobando el compilador local.</div>
        <div class="tns-import-progress-actions">
          <button type="button" class="tns-build-progress-secondary" data-build-open-compiler hidden>Abrir compilador</button>
          <button type="button" class="tns-build-progress-secondary" data-build-redownload hidden>Descargar de nuevo</button>
          <button type="button" class="tns-build-progress-cancel" data-build-cancel>Cancelar</button>
          <button type="button" class="tns-import-progress-close" data-build-close>Cerrar</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("tns-import-progress-lock");
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("visible")));
    const ui = buildUiController(overlay);
    ui.setStep(1, "active", "Comprobando TNS Tool Compiler…");
    return ui;
  }

  function stepMarkup(number, title, detail) {
    return `<div class="tns-import-step pending" data-step="${number}">
      <div class="tns-import-step-circle">${number}</div>
      <div class="tns-import-step-line"></div>
      <div class="tns-import-step-content">
        <div class="tns-import-step-topline"><div class="tns-import-step-title">${escapeHtml(title)}</div><div class="tns-import-step-status">Pendiente</div></div>
        <div class="tns-import-step-detail">${escapeHtml(detail)}</div>
        ${number === 2 ? '<div class="tns-import-progress-meter"><span></span></div>' : ""}
      </div>
    </div>`;
  }

  function buildUiController(overlay) {
    const getStep = n => overlay.querySelector(`.tns-import-step[data-step="${n}"]`);
    const closeButton = overlay.querySelector("[data-build-close]");
    const cancelButton = overlay.querySelector("[data-build-cancel]");
    const redownloadButton = overlay.querySelector("[data-build-redownload]");
    const openButton = overlay.querySelector("[data-build-open-compiler]");

    function setStep(n, mode, detail = "") {
      const step = getStep(n);
      if (!step) return;
      step.classList.remove("pending", "active", "completed", "error");
      step.classList.add(mode);
      const circle = step.querySelector(".tns-import-step-circle");
      const status = step.querySelector(".tns-import-step-status");
      const detailEl = step.querySelector(".tns-import-step-detail");
      if (circle) circle.innerHTML = mode === "completed" ? checkMarkup() : mode === "error" ? "!" : String(n);
      if (status) status.textContent = mode === "completed" ? "Completado" : mode === "active" ? "En progreso" : mode === "error" ? "Con error" : "Pendiente";
      if (detail && detailEl) detailEl.textContent = detail;
    }

    function setSummary(title, detail = "") {
      const summary = overlay.querySelector(".tns-import-progress-summary");
      if (summary) summary.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? ` ${escapeHtml(detail)}` : ""}`;
    }

    function meter(percent) {
      const bar = overlay.querySelector(".tns-import-progress-meter > span");
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
    }

    function showInstallActions(show = true) {
      if (redownloadButton) redownloadButton.hidden = !show;
      if (openButton) openButton.hidden = !show;
    }

    function finish() {
      showInstallActions(false);
      if (cancelButton) cancelButton.hidden = true;
      closeButton?.classList.add("visible");
    }

    function close() {
      overlay.classList.add("closing");
      setTimeout(() => {
        overlay.remove();
        if (!document.querySelector(".tns-import-progress-overlay")) document.documentElement.classList.remove("tns-import-progress-lock");
      }, 230);
    }

    closeButton?.addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay && closeButton?.classList.contains("visible")) close();
    });

    return {
      overlay,
      setStep,
      setSummary,
      meter,
      finish,
      close,
      showInstallActions,
      cancelButton,
      redownloadButton,
      openButton,
    };
  }

  async function compilerStatus(signal) {
    try {
      return await window.NdlessLocalBridge?.status?.({ signal, timeoutMs:900 }) || null;
    } catch (error) {
      if (signal?.aborted) throw error;
      return null;
    }
  }

  async function waitForReadyCompiler(ui, signal, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new DOMException("Build cancelled", "AbortError");
      last = await compilerStatus(signal);
      if (statusReady(last)) return last;
      const platform = last?.platform || detectPlatform() || "windows";
      const expected = expectedVersion(platform);
      if (last?.connected && expected && compareVersions(last.version, expected) < 0) {
        ui.setStep(1, "active", `Compilador ${last.version || "antiguo"} detectado. Esperando ${expected}…`);
      }
      await sleep(1000, signal);
    }
    return last;
  }

  async function ensureCompiler(ui, signal) {
    const bridge = window.NdlessLocalBridge;
    if (!bridge?.status || !bridge?.downloadCompiler) {
      const error = new Error("El módulo del compilador local todavía no está disponible.");
      error.code = "LOCAL_BRIDGE_MODULE_MISSING";
      throw error;
    }

    let status = await compilerStatus(signal);
    if (statusReady(status)) {
      saveReadyMarker(status);
      ui.setStep(1, "completed", `TNS Tool Compiler ${status.version || ""} listo · ${status.platform || "local"}.`);
      ui.setSummary("Compilador listo.", "Preparando el proyecto para enviarlo por 127.0.0.1.");
      return status;
    }

    const platform = status?.platform && status.platform !== "unknown" ? status.platform : detectPlatform();
    const expected = expectedVersion(platform);
    const known = readReadyMarker();

    // If this browser has already completed a build with the local compiler,
    // first try the registered tnstool:// handler instead of downloading again.
    if (!status?.connected && known && (!platform || known.platform === platform)) {
      ui.setStep(1, "active", `Abriendo el compilador instalado${expected ? ` (${expected})` : ""}…`);
      try { bridge.openLocalCompiler?.(); } catch (_) {}
      const reopened = await waitForReadyCompiler(ui, signal, 5000);
      if (statusReady(reopened)) {
        saveReadyMarker(reopened);
        ui.setStep(1, "completed", `TNS Tool Compiler ${reopened.version || ""} conectado.`);
        ui.setSummary("Compilador conectado.", "Ahora se enviará el ZIP del proyecto.");
        return reopened;
      }
      status = reopened || status;
    }

    const force = !!status?.connected && (!statusReady(status) || status.updateRequired === true);
    const download = bridge.downloadCompiler({ platform, force });
    if (download?.unsupported) {
      const error = new Error(download.message || "No hay descarga automática del compilador para este sistema.");
      error.code = "LOCAL_COMPILER_PLATFORM_UNSUPPORTED";
      throw error;
    }

    const version = download?.version || expected || "actual";
    const startedText = download?.started
      ? `Descarga iniciada. Ejecuta el archivo descargado; la página comprobará automáticamente que sea ${version}.`
      : `El compilador ${version} se descargó recientemente. Ejecuta el archivo y esta ventana continuará sola.`;
    ui.setStep(1, "active", startedText);
    ui.setSummary("Esperando el compilador.", "No cierres esta ventana. Cuando el EXE responda en 127.0.0.1 pasaremos al siguiente paso.");
    ui.showInstallActions(true);

    if (ui.redownloadButton) {
      ui.redownloadButton.onclick = () => {
        const again = bridge.downloadCompiler({ platform, force:true });
        ui.setStep(1, "active", again?.started ? `Descarga reiniciada. Ejecuta TNS Tool Compiler ${again.version || version}.` : "No se pudo iniciar otra descarga.");
      };
    }
    if (ui.openButton) {
      ui.openButton.onclick = () => {
        try {
          bridge.openLocalCompiler?.();
          ui.setStep(1, "active", "Intentando abrir el compilador instalado…");
        } catch (_) {}
      };
    }

    const ready = await waitForReadyCompiler(ui, signal, INSTALL_WAIT_MS);
    if (!statusReady(ready)) {
      const error = new Error(`El compilador no llegó a estar listo${version ? ` en la versión ${version}` : ""}. Ejecuta el archivo descargado y vuelve a pulsar Build TNS.`);
      error.code = "LOCAL_COMPILER_INSTALL_PENDING";
      throw error;
    }

    bridge.clearDownloadState?.(ready.platform || platform);
    saveReadyMarker(ready);
    ui.showInstallActions(false);
    ui.setStep(1, "completed", `TNS Tool Compiler ${ready.version || version} verificado · toolchain listo.`);
    ui.setSummary("Compilador verificado.", "Preparando project.zip para enviarlo al compilador local.");
    return ready;
  }

  function buildProgress(ui, info) {
    const stage = info?.stage || "build";
    const message = info?.message || stage;
    if (stage === "connecting" || stage === "installing") {
      ui.setStep(1, "completed", "Compilador local conectado y verificado.");
      return;
    }
    if (stage === "sending") {
      ui.setStep(1, "completed", "Compilador local listo.");
      if (/sending project\.zip/i.test(message)) {
        ui.setStep(2, "completed", message);
        ui.meter(100);
        ui.setStep(3, "active", "Proyecto recibido. El compilador local está generando el ejecutable ARM y el contenedor Zehn…");
        ui.setSummary("Proyecto enviado.", "Compilando el TNS en el equipo local.");
      } else {
        ui.setStep(2, "active", message);
        ui.meter(35);
        ui.setSummary("Preparando envío.", message);
      }
      return;
    }
    if (["preparing","compiling"].includes(stage)) {
      const step2 = ui.overlay.querySelector('.tns-import-step[data-step="2"]');
      if (!step2?.classList.contains("completed")) {
        ui.setStep(2, "active", stage === "compiling" ? "Preparando project.zip y el trabajo de compilación…" : message);
        ui.meter(20);
      } else {
        ui.setStep(3, "active", message);
      }
      return;
    }
    if (["assembling","linking","packaging","validating"].includes(stage)) {
      ui.setStep(2, "completed", "project.zip enviado al compilador local.");
      ui.meter(100);
      ui.setStep(3, "active", message);
      ui.setSummary("Compilando TNS.", message);
      return;
    }
    if (stage === "complete") {
      ui.setStep(2, "completed", "project.zip enviado al compilador local.");
      ui.meter(100);
      ui.setStep(3, "completed", message || "TNS compilado y validado.");
    }
  }

  function patchBuildManager() {
    const manager = window.NdlessBuildManager;
    if (!manager?.build) return false;
    if (manager === lastManager) return true;
    if (manager.__officialBuildFlowWrapped === true) {
      lastManager = manager;
      return true;
    }

    const original = manager;
    const wrappedBuild = async (project, options = {}) => {
      const session = activeBuildSession && (!activeBuildSession.project || activeBuildSession.project === project)
        ? activeBuildSession
        : null;
      const originalProgress = options.onProgress;
      const onProgress = info => {
        try { originalProgress?.(info); }
        finally { session?.progress?.(info); }
      };
      try {
        const result = await original.build(project, { ...options, onProgress });
        session?.resolve?.(result);
        return result;
      } catch (error) {
        session?.reject?.(error);
        throw error;
      }
    };

    window.NdlessBuildManager = Object.freeze({
      ...original,
      build:wrappedBuild,
      __officialBuildFlowWrapped:true,
    });
    lastManager = window.NdlessBuildManager;
    return true;
  }

  function createBuildSession(project, ui) {
    let settled = false;
    let resolvePromise, rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectPromise(new Error("Build TNS no recibió una respuesta del flujo de compilación a tiempo."));
    }, BUILD_WAIT_MS);
    return {
      project,
      promise,
      progress:info => buildProgress(ui, info),
      resolve:result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolvePromise(result);
      },
      reject:error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        rejectPromise(error);
      },
    };
  }

  async function triggerExistingBuildUi(root, project, ui, signal) {
    patchBuildManager();
    const tab = root?.querySelector("[data-project-tab='build']");
    if (tab && !tab.classList.contains("active")) tab.click();
    await sleep(900, signal);

    patchBuildManager();
    const internal = root?.querySelector("[data-real-build-start]");
    const session = createBuildSession(project, ui);
    activeBuildSession = session;

    if (internal && !internal.disabled) {
      allowInternalBuildClick = true;
      try { internal.click(); }
      finally { allowInternalBuildClick = false; }
    } else {
      // Fallback for a workspace whose Build tab has not rendered yet.
      Promise.resolve().then(async () => {
        try {
          const result = await window.NdlessBuildManager.build(project, {
            signal,
            openLocal:false,
            alreadyOpened:true,
            waitForConnection:false,
            onProgress:info => buildProgress(ui, info),
          });
          session.resolve(result);
        } catch (error) { session.reject(error); }
      });
    }

    try { return await session.promise; }
    finally { if (activeBuildSession === session) activeBuildSession = null; }
  }

  function currentProject(root) {
    try {
      const project = window.NdlessProjectWorkspace?.getProject?.();
      if (!project) return null;
      if (root && !root.isConnected) return null;
      return project;
    } catch (_) { return null; }
  }

  async function runOfficialBuild(root) {
    if (activeFlow) return activeFlow;
    activeFlow = (async () => {
      await ensureStepperStyles();
      const project = currentProject(root);
      if (!project) throw new Error("No hay un proyecto Ndless abierto.");

      const controller = new AbortController();
      const ui = createBuildOverlay(project);
      ui.cancelButton?.addEventListener("click", () => controller.abort(), { once:true });

      try {
        await ensureCompiler(ui, controller.signal);
        ui.setStep(2, "active", `Creando ${project.name || "project"}.zip en memoria…`);
        ui.setSummary("Preparando proyecto.", "El ZIP no se descarga: se enviará directamente al EXE local.");

        const result = await triggerExistingBuildUi(root, project, ui, controller.signal);
        if (!result?.ok) {
          const error = new Error(result?.message || "No se pudo compilar el TNS.");
          error.code = result?.code || "NDLESS_BUILD_FAILED";
          error.details = result?.details || "";
          throw error;
        }

        ui.setStep(2, "completed", "project.zip enviado correctamente al compilador local.");
        ui.meter(100);
        ui.setStep(3, "completed", `${result.filename || "TNS"} compilado y validado.`);
        ui.setStep(4, "active", `Descargando ${result.filename || "program.tns"}…`);
        ui.setSummary("Compilación terminada.", "Iniciando la descarga del TNS generado.");
        await sleep(180, controller.signal);
        window.NdlessBuildManager?.download?.(result);
        ui.setStep(4, "completed", `${result.filename || "program.tns"} · ${bytesLabel(result.bytes?.length)} descargado.`);
        ui.setSummary("Build TNS completado.", `${result.filename || "program.tns"} se compiló con el toolchain local y se descargó correctamente.`);
        ui.finish();
        return result;
      } catch (error) {
        if (error?.name === "AbortError") {
          const active = [1,2,3,4].find(n => ui.overlay.querySelector(`.tns-import-step[data-step="${n}"]`)?.classList.contains("active")) || 1;
          ui.setStep(active, "error", "Proceso cancelado por el usuario.");
          ui.setSummary("Build TNS cancelado.", "No se descargó ningún resultado nuevo.");
        } else {
          const active = [1,2,3,4].find(n => ui.overlay.querySelector(`.tns-import-step[data-step="${n}"]`)?.classList.contains("active")) || 1;
          const detail = [error?.message, error?.details].filter(Boolean).join(" · ");
          ui.setStep(active, "error", detail || "No se pudo completar este paso.");
          ui.setSummary("Build TNS terminó con un error.", detail || "Revisa el estado del compilador e inténtalo otra vez.");
        }
        ui.finish();
        throw error;
      }
    })().catch(error => {
      if (error?.name !== "AbortError") console.error("Official Build TNS:", error);
      return null;
    }).finally(() => { activeFlow = null; });
    return activeFlow;
  }

  function suppressExperimentalNdlessControls() {
    document.querySelectorAll("#xml-doctor-panel .ndless-project-workspace").forEach(root => {
      const actions = root.querySelector(".ndless-project-actions");
      const buildButton = actions?.querySelector(".ndless-build-tns-button");
      actions?.querySelectorAll(".ndless-save-experimental-button").forEach(button => button.remove());
      // tns-file-save-experimental.js checks this marker before inserting its
      // old Ndless experimental download button. Reuse the official Build TNS
      // button as the marker so the old control stays retired.
      if (buildButton) buildButton.dataset.experimentalSaveDirect = "1";
    });

    const status = document.querySelector("[data-tns-file-save-experimental-status]");
    if (status) {
      status.style.display = "none";
      status.setAttribute("aria-hidden", "true");
    }
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element
      ? event.target.closest(".ndless-build-tns-button,[data-real-build-start]")
      : null;
    if (!target) return;
    if (allowInternalBuildClick && target.matches("[data-real-build-start]")) return;

    const root = target.closest(".ndless-project-workspace");
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    runOfficialBuild(root);
  }, true);

  const observer = new MutationObserver(() => {
    suppressExperimentalNdlessControls();
    patchBuildManager();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });

  let attempts = 0;
  function retrySetup() {
    suppressExperimentalNdlessControls();
    patchBuildManager();
    if (attempts++ < 300) setTimeout(retrySetup, 100);
  }
  retrySetup();

  window.NdlessOfficialBuildFlow = Object.freeze({
    run:runOfficialBuild,
    statusReady,
    expectedVersion,
    suppressExperimentalNdlessControls,
    patchBuildManager,
  });
})();