(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  let cached = null;
  let building = false;

  function isBrowserOnlyPlatform() {
    const ua = String(navigator.userAgent || "");
    const platform = String(navigator.userAgentData?.platform || navigator.platform || "");
    if (/Android|iPhone|iPad|iPod/i.test(`${ua} ${platform}`)) return true;
    const detected = root.NdlessLocalBridge?.detectDesktopPlatform?.();
    if (detected === "windows" || detected === "linux") return false;
    return !/Win|Linux|X11/i.test(platform);
  }

  function uiStatus(box, text, good = false) {
    const status = box?.querySelector?.("[data-arm-status]");
    if (!status) return;
    status.textContent = String(text);
    status.dataset.state = good ? "ok" : "";
  }

  function fmtHex(value) {
    return `0x${(Number(value) >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }

  function fnv(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function projectFingerprint(project) {
    const pieces = [
      String(project?.name || ""),
      "zehn-modern",
      ...Object.entries(project?.files || {})
        .filter(([, value]) => typeof value === "string")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}\0${value}`),
    ];
    const joined = pieces.join("\x01");
    return `${fnv(joined)}:${joined.length}`;
  }

  function sanitizeName(name, fallback = "program.tns") {
    const clean = String(name || fallback).split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]+/g, "_");
    return clean || fallback;
  }

  function runtimeArgs(runtime, artifact) {
    const programName = sanitizeName(artifact?.filename, "program.tns");
    const programPath = `/documents/${programName}`;
    runtime.mountVirtualFile(programPath, artifact.bytes, { writable:false });
    const args = [programPath];
    const wad = runtime.lastWad;
    if (wad?.bytes?.length) {
      runtime.mountVirtualFile(wad.path, wad.bytes, { writable:false });
      args.push(wad.path);
    }
    return args;
  }

  async function browserArtifact(project, box) {
    const fingerprint = projectFingerprint(project);
    if (cached?.fingerprint === fingerprint && cached.artifact?.bytes?.length) {
      uiStatus(box, "Usando compilación web en caché…", true);
      return cached.artifact;
    }
    const compiler = root.NdlessBrowserCompiler;
    if (!compiler?.build) throw new Error("El compilador ARM web todavía no está cargado.");
    const modern = {
      ...project,
      target:"zehn-modern",
      files:{ ...(project.files || {}) },
      settings:{ ...(project.settings || {}) },
    };
    const artifact = await compiler.build(modern, {
      onProgress(info) {
        uiStatus(box, info?.message || info?.stage || "Compilando ARM…", info?.stage === "complete");
      },
    });
    cached = { fingerprint, artifact };
    return artifact;
  }

  async function startBrowserLive(box, project) {
    if (building) return;
    building = true;
    const liveButton = box.querySelector("[data-arm-live]");
    const stopButton = box.querySelector("[data-arm-stop]");
    try {
      liveButton.disabled = true;
      uiStatus(box, "Preparando Live ARM completamente en el navegador…");
      const artifact = await browserArtifact(project, box);
      const runtime = root.NdlessArmRuntime;
      if (!runtime?.run || runtime.version < 2) throw new Error("Ndless ARM runtime v2 no está disponible.");

      uiStatus(box, "Verificando CPU ARM WebAssembly…");
      const smoke = await runtime.smokeTest();
      if (!smoke?.ok) throw new Error(`ARM self-test falló (r0=${smoke?.r0}, r2=${smoke?.r2}).`);

      const canvas = document.querySelector("[data-ndless-project-canvas]");
      const note = document.querySelector("[data-preview-note]");
      if (!canvas) throw new Error("No se encontró el canvas del Preview.");
      const args = runtimeArgs(runtime, artifact);

      stopButton.hidden = false;
      uiStatus(box, `Compilado en web · arrancando ${artifact.filename}…`, true);
      await runtime.run(artifact.bytes, {
        canvas,
        note,
        args,
        onState(state) {
          if (state.error) {
            const swi = state.lastSyscall == null ? "—" : `0x${state.lastSyscall.toString(16).toUpperCase()}`;
            uiStatus(box, `ARM detenido · PC=${fmtHex(state.pc)} · SWI=${swi} · ${state.error}`);
            if (note) note.textContent = `Live ARM web stopped at ${fmtHex(state.pc)}: ${state.error}`;
          } else if (state.running) {
            liveButton.textContent = "Pausar ARM";
            uiStatus(box, `Web ARM ejecutando · PC=${fmtHex(state.pc)} · frames=${state.frames} · SWI=${state.syscallCount}`, true);
            if (note) note.textContent = `Live ARM web · compilado y ejecutándose completamente en este navegador${runtime.lastWad ? ` · IWAD: ${runtime.lastWad.name}` : ""}.`;
          } else if (state.paused) {
            liveButton.textContent = "Continuar ARM";
            uiStatus(box, `ARM pausado · PC=${fmtHex(state.pc)} · frames=${state.frames}`);
          } else if (state.stopped) {
            liveButton.textContent = "Live ARM";
            uiStatus(box, `ARM finalizado · PC=${fmtHex(state.pc)} · frames=${state.frames}`);
          }
        },
      });
    } catch (error) {
      const detail = error?.details ? ` · ${error.details}` : "";
      uiStatus(box, `${error?.message || error}${detail}`);
    } finally {
      building = false;
      liveButton.disabled = false;
    }
  }

  document.addEventListener("click", event => {
    const button = event.target?.closest?.("[data-arm-live]");
    if (!button || !isBrowserOnlyPlatform()) return;

    const runtime = root.NdlessArmRuntime;
    if (runtime?.activeSession?.running || runtime?.activeSession?.paused) {
      return;
    }

    const box = button.closest("[data-arm-ui]");
    const project = root.NdlessProjectWorkspace?.getProject?.();
    if (!box || !project) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    void startBrowserLive(box, project);
  }, true);

  root.NdlessBrowserLivePreview = Object.freeze({
    version:1,
    isBrowserOnlyPlatform,
    projectFingerprint,
    startBrowserLive,
    clearCache(){ cached = null; },
  });
})();
