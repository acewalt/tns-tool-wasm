(() => {
  "use strict";

  const OVERLAY_ID = "tns-build-progress-overlay";
  const STYLE_ID = "tns-build-confirm-flow-style";
  const READY_KEY = "tns-tool-compiler-known-ready";
  const DOWNLOAD_PROMPT_DELAY_MS = 2200;
  const OPEN_WAIT_MS = 120000;
  const BUILD_TIMEOUT_MS = 180000;

  let activeFlow = null;

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
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
    }[char]));
  }

  function versionParts(value) {
    return String(value || "0").split(/[^0-9]+/).filter(Boolean).slice(0, 4).map(Number);
  }

  function compareVersions(a, b) {
    const helper = window.NdlessLocalRuntimeUpgrade;
    if (typeof helper?.compareVersions === "function") return helper.compareVersions(a, b);
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
    const expected = expectedVersion(status.platform || detectPlatform());
    return !expected || compareVersions(status.version, expected) >= 0;
  }

  function readReadyMarker() {
    try {
      const value = JSON.parse(localStorage.getItem(READY_KEY) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (_) { return null; }
  }

  function saveReadyMarker(status) {
    try {
      localStorage.setItem(READY_KEY, JSON.stringify({
        at:Date.now(),
        platform:status?.platform || detectPlatform() || "unknown",
        version:status?.version || "unknown",
      }));
    } catch (_) {}
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
        setTimeout(done, 1400);
      });
    }
    return new Promise(resolve => {
      const script = document.createElement("script");
      script.src = "./import-progress-stepper.js?v=20260829-build-confirm-v2";
      script.async = false;
      script.dataset.importProgressStepper = "true";
      script.addEventListener("load", resolve, { once:true });
      script.addEventListener("error", resolve, { once:true });
      document.head.appendChild(script);
      setTimeout(resolve, 1600);
    });
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} .tns-import-progress-actions { gap:10px; flex-wrap:wrap; align-items:center; }
      #${OVERLAY_ID} .tns-build-confirm,
      #${OVERLAY_ID} .tns-build-secondary,
      #${OVERLAY_ID} .tns-build-cancel {
        min-height:39px; padding:9px 17px; border-radius:999px; font:inherit; font-size:12px; font-weight:850; cursor:pointer;
      }
      #${OVERLAY_ID} .tns-build-confirm { border:1px solid rgba(174,255,81,.72); background:linear-gradient(135deg,#b9ff57,#8eea2f); color:#17310b; box-shadow:0 10px 28px rgba(127,224,40,.17); }
      #${OVERLAY_ID} .tns-build-secondary { border:1px solid rgba(132,172,224,.45); background:rgba(53,82,122,.22); color:#d7e7fb; }
      #${OVERLAY_ID} .tns-build-cancel { border:1px solid rgba(255,123,123,.35); background:rgba(122,39,47,.18); color:#ffc7c7; margin-left:auto; }
      #${OVERLAY_ID} button[hidden] { display:none !important; }
      #${OVERLAY_ID} .tns-import-progress-close { display:none; }
      #${OVERLAY_ID} .tns-import-progress-close.visible { display:block; }
      #${OVERLAY_ID} .tns-build-confirm-note { margin:10px 0 0; color:#9fb3cc; font-size:11px; line-height:1.45; }
    `;
    document.head.appendChild(style);
  }

  function stepMarkup(number, title, detail) {
    return `<div class="tns-import-step pending" data-step="${number}">
      <div class="tns-import-step-circle">${number}</div>
      <div class="tns-import-step-line"></div>
      <div class="tns-import-step-content">
        <div class="tns-import-step-topline">
          <div class="tns-import-step-title">${escapeHtml(title)}</div>
          <div class="tns-import-step-status">Pendiente</div>
        </div>
        <div class="tns-import-step-detail">${escapeHtml(detail)}</div>
        ${number === 2 ? '<div class="tns-import-progress-meter"><span></span></div>' : ""}
      </div>
    </div>`;
  }

  function createOverlay(project) {
    installStyles();
    document.getElementById(OVERLAY_ID)?.remove();
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
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
            <p>Confirma la descarga del compilador, permite que el navegador lo abra y la página enviará el proyecto automáticamente.</p>
          </div>
          <div class="tns-import-progress-icon" aria-hidden="true">⚙</div>
        </div>
        ${stepMarkup(1, "Preparar compilador", "Comprobando TNS Tool Compiler…")}
        ${stepMarkup(2, "Enviar proyecto", `Se creará ${escapeHtml(project?.name || "project")}.zip en memoria y se enviará al EXE local.`)}
        ${stepMarkup(3, "Compilar TNS", "El compilador ejecutará ARM GCC, linker y genzehn.")}
        ${stepMarkup(4, "Descargar resultado", "El navegador recibirá el .tns terminado y lo guardará en Descargas.")}
        <div class="tns-import-progress-summary" aria-live="polite"><strong>Preparando Build TNS.</strong> Comprobando el compilador local.</div>
        <div class="tns-build-confirm-note" data-build-note hidden></div>
        <div class="tns-import-progress-actions">
          <button type="button" class="tns-build-confirm" data-build-confirm hidden>Sí, ya se descargó</button>
          <button type="button" class="tns-build-secondary" data-build-redownload hidden>Descargar de nuevo</button>
          <button type="button" class="tns-build-cancel" data-build-cancel>Cancelar</button>
          <button type="button" class="tns-import-progress-close" data-build-close>Cerrar</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("tns-import-progress-lock");
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("visible")));
    return createUiController(overlay);
  }

  function createUiController(overlay) {
    const getStep = n => overlay.querySelector(`.tns-import-step[data-step="${n}"]`);
    const confirmButton = overlay.querySelector("[data-build-confirm]");
    const redownloadButton = overlay.querySelector("[data-build-redownload]");
    const cancelButton = overlay.querySelector("[data-build-cancel]");
    const closeButton = overlay.querySelector("[data-build-close]");
    const note = overlay.querySelector("[data-build-note]");

    function setStep(n, mode, detail = "") {
      const step = getStep(n);
      if (!step) return;
      step.classList.remove("pending", "active", "completed", "error");
      step.classList.add(mode);
      const circle = step.querySelector(".tns-import-step-circle");
      const status = step.querySelector(".tns-import-step-status");
      const detailEl = step.querySelector(".tns-import-step-detail");
      if (circle) circle.innerHTML = mode === "completed" ? '<span aria-hidden="true">✓</span>' : mode === "error" ? "!" : String(n);
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

    function showPrompt({label = "Sí, ya se descargó", noteText = ""} = {}) {
      if (confirmButton) {
        confirmButton.textContent = label;
        confirmButton.hidden = false;
      }
      if (redownloadButton) redownloadButton.hidden = false;
      if (note) {
        note.textContent = noteText;
        note.hidden = !noteText;
      }
    }

    function hidePrompt() {
      if (confirmButton) confirmButton.hidden = true;
      if (redownloadButton) redownloadButton.hidden = true;
      if (note) note.hidden = true;
    }

    function finish() {
      hidePrompt();
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
      showPrompt,
      hidePrompt,
      finish,
      close,
      confirmButton,
      redownloadButton,
      cancelButton,
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

  async function waitForReadyCompiler(ui, signal, timeoutMs = OPEN_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    let last = null;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new DOMException("Build cancelled", "AbortError");
      last = await compilerStatus(signal);
      if (statusReady(last)) return last;
      if (last?.connected) {
        const expected = expectedVersion(last.platform || detectPlatform());
        if (expected && compareVersions(last.version, expected) < 0) {
          ui.setStep(1, "active", `Se abrió TNS Tool Compiler ${last.version || "antiguo"}; se necesita ${expected}.`);
        } else if (!last.toolchainReady) {
          ui.setStep(1, "active", "El EXE respondió, pero todavía está preparando su toolchain…");
        }
      }
      await sleep(900, signal);
    }
    return last;
  }

  function waitForUserOpen(ui, bridge, options, signal) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error = null) => {
        if (done) return;
        done = true;
        signal?.removeEventListener?.("abort", onAbort);
        if (ui.confirmButton) ui.confirmButton.onclick = null;
        if (ui.redownloadButton) ui.redownloadButton.onclick = null;
        if (error) reject(error); else resolve();
      };
      const onAbort = () => finish(new DOMException("Build cancelled", "AbortError"));
      signal?.addEventListener?.("abort", onAbort, { once:true });

      ui.showPrompt({ label:options.label, noteText:options.noteText });
      if (ui.confirmButton) {
        ui.confirmButton.onclick = () => {
          try { bridge.openLocalCompiler?.(); }
          catch (error) { finish(error); return; }
          ui.hidePrompt();
          ui.setStep(1, "active", "Permite que el navegador abra TNS Tool Compiler. Esperando conexión local…");
          ui.setSummary("Abriendo compilador.", "Al aceptar el aviso del navegador, el EXE responderá en 127.0.0.1.");
          finish();
        };
      }
      if (ui.redownloadButton) {
        ui.redownloadButton.onclick = () => {
          try {
            const again = bridge.downloadCompiler({ platform:options.platform, force:true });
            ui.setStep(1, "active", again?.started
              ? `Descarga reiniciada: TNS Tool Compiler ${again.version || options.version || ""}.`
              : "No se pudo iniciar otra descarga.");
            ui.setSummary("Descargando compilador.", "Cuando termine, pulsa “Sí, ya se descargó”.");
          } catch (error) {
            ui.setSummary("No se pudo reiniciar la descarga.", error?.message || String(error));
          }
        };
      }
    });
  }

  async function ensureCompiler(ui, signal) {
    const bridge = window.NdlessLocalBridge;
    if (!bridge?.status || !bridge?.downloadCompiler || !bridge?.openLocalCompiler || !bridge?.build) {
      const error = new Error("El módulo TNS Tool Compiler todavía no está disponible.");
      error.code = "LOCAL_BRIDGE_MODULE_MISSING";
      throw error;
    }

    let status = await compilerStatus(signal);
    if (statusReady(status)) {
      saveReadyMarker(status);
      ui.setStep(1, "completed", `TNS Tool Compiler ${status.version || ""} ya está abierto y listo.`);
      ui.setSummary("Compilador listo.", "El proyecto se enviará directamente por 127.0.0.1.");
      return status;
    }

    const platform = status?.platform && status.platform !== "unknown" ? status.platform : detectPlatform();
    const version = expectedVersion(platform) || "actual";
    const known = readReadyMarker();
    const knownCompatible = known
      && (!platform || known.platform === platform)
      && (!version || version === "actual" || compareVersions(known.version, version) >= 0);

    if (knownCompatible && !status?.connected) {
      ui.setStep(1, "active", `TNS Tool Compiler ${known.version || version} ya se usó en este navegador.`);
      ui.setSummary("Abrir compilador.", "Pulsa “Abrir compilador”; el navegador te pedirá permiso para abrir el EXE.");
      await waitForUserOpen(ui, bridge, {
        label:"Abrir compilador",
        noteText:"Si ya no tienes el archivo o quieres reinstalarlo, usa “Descargar de nuevo”.",
        platform,
        version,
      }, signal);
    } else {
      const force = !!status?.connected || status?.updateRequired === true;
      const download = bridge.downloadCompiler({ platform, force });
      if (download?.unsupported) {
        const error = new Error(download.message || "No hay descarga automática del compilador para este sistema.");
        error.code = "LOCAL_COMPILER_PLATFORM_UNSUPPORTED";
        throw error;
      }

      ui.setStep(1, "active", download?.started
        ? `Descargando TNS Tool Compiler ${download.version || version}…`
        : `TNS Tool Compiler ${download.version || version} se descargó recientemente.`);
      ui.setSummary("Descargando compilador.", "Espera a que el navegador termine la descarga.");

      await sleep(DOWNLOAD_PROMPT_DELAY_MS, signal);
      ui.setStep(1, "active", `¿Ya se descargó TNS Tool Compiler ${download?.version || version}?`);
      ui.setSummary("Confirma la descarga.", "Cuando haya terminado, pulsa “Sí, ya se descargó”. Después el navegador pedirá permiso para abrir el EXE.");
      await waitForUserOpen(ui, bridge, {
        label:"Sí, ya se descargó",
        noteText:"Al pulsarlo aparecerá la confirmación nativa del navegador para abrir TNS Tool Compiler.",
        platform,
        version:download?.version || version,
      }, signal);
    }

    const ready = await waitForReadyCompiler(ui, signal, OPEN_WAIT_MS);
    if (!statusReady(ready)) {
      const error = new Error(`No se detectó TNS Tool Compiler ${version} listo. Si rechazaste el aviso del navegador, vuelve a pulsar Build TNS e inténtalo de nuevo.`);
      error.code = "LOCAL_COMPILER_OPEN_PENDING";
      throw error;
    }

    bridge.clearDownloadState?.(ready.platform || platform);
    saveReadyMarker(ready);
    ui.hidePrompt();
    ui.setStep(1, "completed", `TNS Tool Compiler ${ready.version || version} abierto · toolchain listo.`);
    ui.setSummary("Compilador conectado.", "Ahora la página preparará y enviará el ZIP del proyecto.");
    return ready;
  }

  function validateTns(bytes) {
    const detection = window.NdlessFormatDetector?.detect?.(bytes)
      || window.TnsUniversalDetector?.detect?.(bytes)
      || null;
    if (detection && detection.valid === false) {
      throw new Error(`El compilador devolvió un TNS que no pasó la validación${detection.reason ? `: ${detection.reason}` : "."}`);
    }
    return detection;
  }

  function downloadTns(result) {
    const bytes = result?.bytes instanceof Uint8Array ? result.bytes : new Uint8Array(result?.bytes || []);
    if (!bytes.length) throw new Error("El compilador no devolvió bytes para descargar.");
    const blob = new Blob([bytes], { type:"application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename || "program.tns";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  async function compileProject(project, ready, ui, signal) {
    const bridge = window.NdlessLocalBridge;
    ui.setStep(2, "active", `Creando ${project.name || "project"}.zip en memoria…`);
    ui.setSummary("Preparando proyecto.", "El ZIP no se guarda en disco: se enviará directamente al compilador local.");
    ui.meter(12);

    const result = await bridge.build(project, {
      status:ready,
      signal,
      openIfMissing:false,
      timeoutMs:BUILD_TIMEOUT_MS,
      onProgress(info) {
        const stage = info?.stage || "sending";
        const message = info?.message || stage;
        if (stage === "sending") {
          if (/sending project\.zip/i.test(message)) {
            ui.setStep(2, "completed", message);
            ui.meter(100);
            ui.setStep(3, "active", "Proyecto recibido. ARM GCC, linker y genzehn están trabajando…");
            ui.setSummary("Proyecto enviado.", "Esperando a que el compilador local devuelva el TNS.");
          } else {
            ui.setStep(2, "active", message);
            ui.meter(45);
          }
        } else {
          ui.setStep(3, "active", message);
          ui.setSummary("Compilando TNS.", message);
        }
      },
    });

    if (!result?.ok || !result?.bytes?.length) {
      const error = new Error(result?.message || "El compilador local no devolvió un TNS.");
      error.code = result?.code || "LOCAL_BUILD_FAILED";
      error.details = result?.details || "";
      throw error;
    }

    validateTns(result.bytes);
    ui.setStep(2, "completed", "project.zip enviado correctamente al compilador local.");
    ui.meter(100);
    ui.setStep(3, "completed", `${result.filename || "TNS"} compilado y validado.`);
    return result;
  }

  function currentProject(root) {
    try {
      const project = window.NdlessProjectWorkspace?.getProject?.();
      if (!project || (root && !root.isConnected)) return null;
      return project;
    } catch (_) { return null; }
  }

  async function run(root) {
    if (activeFlow) return activeFlow;
    activeFlow = (async () => {
      await ensureStepperStyles();
      const project = currentProject(root);
      if (!project) throw new Error("No hay un proyecto Ndless abierto.");

      const controller = new AbortController();
      const ui = createOverlay(project);
      ui.cancelButton?.addEventListener("click", () => controller.abort(), { once:true });

      try {
        const ready = await ensureCompiler(ui, controller.signal);
        const result = await compileProject(project, ready, ui, controller.signal);

        ui.setStep(4, "active", `Recibiendo ${result.filename || "program.tns"} del compilador…`);
        ui.setSummary("Compilación terminada.", "El navegador recibió el TNS desde 127.0.0.1 y va a guardarlo en Descargas.");
        await sleep(180, controller.signal);
        downloadTns(result);
        ui.setStep(4, "completed", `${result.filename || "program.tns"} · ${bytesLabel(result.bytes.length)} · descarga iniciada.`);
        ui.setSummary("Build TNS completado.", "El TNS terminó de compilar y el navegador inició su descarga.");
        ui.finish();
        return result;
      } catch (error) {
        const activeStep = [1,2,3,4].find(n => ui.overlay.querySelector(`.tns-import-step[data-step="${n}"]`)?.classList.contains("active")) || 1;
        if (error?.name === "AbortError") {
          ui.setStep(activeStep, "error", "Proceso cancelado por el usuario.");
          ui.setSummary("Build TNS cancelado.", "No se descargó ningún resultado nuevo.");
        } else {
          const detail = [error?.message, error?.details].filter(Boolean).join(" · ");
          ui.setStep(activeStep, "error", detail || "No se pudo completar este paso.");
          ui.setSummary("Build TNS terminó con un error.", detail || "Vuelve a intentarlo.");
          console.error("Build TNS:", error);
        }
        ui.finish();
        return null;
      }
    })().finally(() => { activeFlow = null; });
    return activeFlow;
  }

  function suppressExperimentalNdlessControls() {
    document.querySelectorAll("#xml-doctor-panel .ndless-project-workspace").forEach(root => {
      const actions = root.querySelector(".ndless-project-actions");
      const buildButton = actions?.querySelector(".ndless-build-tns-button");
      actions?.querySelectorAll(".ndless-save-experimental-button").forEach(button => button.remove());
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
    const root = target.closest(".ndless-project-workspace");
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    run(root);
  }, true);

  const observer = new MutationObserver(suppressExperimentalNdlessControls);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  suppressExperimentalNdlessControls();

  window.NdlessOfficialBuildFlow = Object.freeze({
    run,
    statusReady,
    expectedVersion,
    suppressExperimentalNdlessControls,
    patchBuildManager:() => true,
  });
})();
