(() => {
  "use strict";

  const core = window.TnsFileSaveExperimentalCore;
  if (!core) {
    console.error("TNS experimental save: core module is missing.");
    return;
  }

  const state = { handle: null, fileName: "", family: null, file: null };
  const TNS_PICKER_TYPES = [{
    description: "TI-Nspire / Ndless TNS",
    accept: { "application/octet-stream": [".tns"] },
  }];

  function canUseDirectFileAccess() {
    return {
      open: typeof window.showOpenFilePicker === "function",
      save: typeof window.showSaveFilePicker === "function",
    };
  }

  function setCurrentFileHandle(handle, metadata = {}) {
    state.handle = handle || null;
    state.fileName = metadata.fileName || handle?.name || "";
    state.family = metadata.family || null;
    state.file = metadata.file || null;
    updateStatus();
    return state.handle;
  }

  function getCurrentFileHandle() { return state.handle; }
  function clearCurrentFileHandle() {
    state.handle = null;
    state.fileName = "";
    state.family = null;
    state.file = null;
    updateStatus();
  }

  function detectBytes(bytes, file = null, family = null) {
    if (family === "ndless") {
      return window.NdlessFormatDetector?.detect?.(bytes)
        || window.TnsUniversalDetector?.detect?.(bytes, file)
        || { valid: bytes?.byteLength > 0, family: "unknown", format: "unknown" };
    }
    return window.TnsUniversalDetector?.detect?.(bytes, file)
      || window.NdlessFormatDetector?.detect?.(bytes)
      || { valid: bytes?.byteLength > 0, family: "unknown", format: "unknown" };
  }

  function isNdlessDetection(detection) {
    const haystack = `${detection?.family || ""} ${detection?.format || ""} ${detection?.kind || ""}`.toLowerCase();
    return haystack.includes("ndless") || haystack.includes("zehn") || haystack.includes("prg") || haystack.includes("bflt");
  }

  function validateGeneratedBytes(bytes, artifact = {}) {
    const detection = detectBytes(bytes, null, artifact.family);
    if (artifact.family === "ndless") {
      if (!isNdlessDetection(detection)) {
        return {
          valid: false,
          reason: detection?.family === "document" ? "expected-ndless-but-generated-document" : "expected-ndless-but-generated-non-ndless",
          detection,
        };
      }
      if (!detection?.valid) {
        return {
          valid: false,
          reason: detection?.reason || "invalid-ndless-artifact",
          detection,
        };
      }
    }
    if (!detection?.valid) return detection || { valid: false, reason: "unrecognized-tns" };
    return detection;
  }

  function ensureTnsName(name) {
    const clean = String(name || "document.tns").trim() || "document.tns";
    return /\.tns$/i.test(clean) ? clean : `${clean}.tns`;
  }

  function fallbackDownload(bytesInput, suggestedName = "document.tns") {
    const bytes = core.toUint8Array(bytesInput);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ensureTnsName(suggestedName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function saveBytesToCurrentFile(bytes, options = {}) {
    if (!state.handle) {
      const error = new Error("No hay un archivo con permiso de escritura. Ábrelo primero con ‘Abrir para edición directa’ o usa ‘Guardar como…’.");
      error.code = "NO_WRITABLE_HANDLE";
      throw error;
    }
    const artifact = core.validateArtifact({
      ok: true,
      bytes,
      family: options.family || state.family || null,
      filename: options.filename || state.fileName || "document.tns",
    }, validateGeneratedBytes);
    const result = await core.writeValidatedBytes(state.handle, artifact.bytes);
    return { ...result, artifact };
  }

  async function saveBytesAs(bytes, suggestedName = "document.tns", options = {}) {
    const artifact = core.validateArtifact({
      ok: true,
      bytes,
      family: options.family || null,
      filename: ensureTnsName(suggestedName),
    }, validateGeneratedBytes);
    if (typeof window.showSaveFilePicker !== "function") {
      fallbackDownload(artifact.bytes, artifact.filename);
      return { fallback: "download", artifact };
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: artifact.filename,
      types: TNS_PICKER_TYPES,
      excludeAcceptAllOption: false,
    });
    const result = await core.writeValidatedBytes(handle, artifact.bytes);
    return { ...result, handle, artifact };
  }

  function routePickedFileThroughExistingOpen(file) {
    const input = document.querySelector("#xml-tns-file");
    if (!input) throw new Error("No se encontró el flujo existente de Abrir TNS.");
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function openTnsWithWritableHandle() {
    if (typeof window.showOpenFilePicker !== "function") {
      throw new Error("Este navegador no ofrece showOpenFilePicker(). La apertura y descarga tradicionales siguen disponibles.");
    }
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: TNS_PICKER_TYPES,
      excludeAcceptAllOption: false,
    });
    if (!handle) return null;
    const file = await handle.getFile();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detection = detectBytes(bytes, file);
    if (!detection?.valid) throw new Error(`El archivo seleccionado no parece un TNS reconocido${detection?.reason ? `: ${detection.reason}` : "."}`);
    setCurrentFileHandle(handle, { fileName: file.name, family: detection.family, file });
    routePickedFileThroughExistingOpen(file);
    logMessage(`Edición directa asociada a ${file.name}. El flujo de apertura existente recibió el mismo File.`);
    return { handle, file, bytes, detection };
  }

  async function buildXmlDoctorArtifact() {
    if (typeof pyodide === "undefined" || !pyodide) throw new Error("El runtime Pyodide todavía no está listo.");
    if (typeof xmlDoctor === "undefined") throw new Error("El estado XML Doctor no está disponible.");
    if (xmlDoctor.current) {
      const nameError = typeof tiDocumentNameError === "function" ? tiDocumentNameError(xmlDoctor.current.program_name || "") : "";
      if (nameError) throw new Error(nameError);
      if (!xmlDoctor.embedded) await embedXmlCode();
    } else if (!xmlDoctor.stagePrepared) {
      if (typeof copyDir !== "function") throw new Error("No se encontró la copia de staging existente.");
      copyDir(xmlDoctor.sourcePath, xmlDoctor.stagePath);
      xmlDoctor.stagePrepared = true;
    }
    await ensureCryptoPackage();
    const outputName = ensureTnsName(xmlDoctorTnsOutputName());
    const token = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const outputPath = `/work/experimental_save_${token}_${outputName}`;
    pyodide.globals.set("wasm_experimental_tns_output", outputPath);
    try {
      await pyodide.runPythonAsync(`
from pathlib import Path
from tnstools import build_tns_from_xml
build_tns_from_xml(Path("${xmlDoctor.stagePath}"), Path(wasm_experimental_tns_output))
`);
      const bytes = new Uint8Array(pyodide.FS.readFile(outputPath));
      return { ok: true, family: "document", filename: outputName, bytes };
    } finally {
      try { pyodide.FS.unlink(outputPath); } catch (_) {}
    }
  }

  async function buildNdlessArtifact() {
    const project = currentNdlessProject();
    if (!project) throw new Error("No hay un proyecto Ndless abierto.");
    if (!window.NdlessBuildManager?.build) throw new Error("NdlessBuildManager no esta disponible.");
    logMessage("Ndless [preparing]: preparing current project build...");
    let openedLocal = false;
    try {
      if (window.NdlessLocalBridge?.openLocalCompiler) {
        window.NdlessLocalBridge.openLocalCompiler();
        openedLocal = true;
        logMessage("Ndless [connecting]: local compiler launch requested.");
      }
    } catch (error) {
      logMessage(`Ndless [connecting]: local compiler launch skipped (${error?.message || error}).`);
    }
    const result = await window.NdlessBuildManager.build(project, {
      openLocal: false,
      alreadyOpened: openedLocal,
      waitForConnection: openedLocal,
      localWaitMs: 15000,
      onProgress(info) {
        const stage = info?.stage || "build";
        const message = info?.message || stage;
        logMessage(`Ndless [${stage}]: ${message}`);
      },
    });
    if (!result?.ok) {
      const details = result?.details ? `Details: ${result.details}` : "";
      const diagnostics = result?.diagnostics?.length ? `Diagnostics: ${result.diagnostics.length}` : "";
      const message = [
        "Experimental TNS failed",
        result?.stage ? `Stage: ${result.stage}` : "",
        result?.code ? `Code: ${result.code}` : "",
        `Message: ${result?.message || "La reconstruccion Ndless fallo."}`,
        details,
        diagnostics,
      ].filter(Boolean).join("\n");
      const error = new Error(message);
      error.stage = result?.stage || "build";
      error.code = result?.code || "NDLESS_BUILD_FAILED";
      error.details = result?.details || "";
      error.diagnostics = result?.diagnostics || [];
      throw error;
    }
    return {
      ok: true,
      family: "ndless",
      filename: ensureTnsName(result.filename || `${project.name || "ndless-app"}.tns`),
      bytes: result.bytes,
      detection: result.detection,
      projectFingerprint: result.projectFingerprint,
      sourceResult: result,
    };
  }

  function currentNdlessProject() {
    try {
      return window.NdlessProjectWorkspace?.getProject?.() || null;
    } catch (_) {
      return null;
    }
  }

  async function buildCurrentArtifact() {
    const ndlessProject = currentNdlessProject();
    const workspace = document.querySelector("#xml-doctor-panel .ndless-project-workspace");
    if (ndlessProject) return buildNdlessArtifact();
    if (workspace && workspace.isConnected) return buildNdlessArtifact();
    return buildXmlDoctorArtifact();
  }

  async function saveCurrentExperimental() {
    if (!state.handle) {
      logMessage("Sin archivo vinculado: reconstruyendo el TNS completo antes de crear un archivo nuevo…");
      return saveCurrentAsExperimental();
    }

    const result = await core.buildValidateAndWrite({
      build: buildCurrentArtifact,
      handle: state.handle,
      validate: validateGeneratedBytes,
    });
    logMessage(`Guardado experimental completado: ${result.artifact.filename} (${result.bytesWritten} bytes).`);
    return result;
  }

  async function saveCurrentAsExperimental() {
    const artifact = core.validateArtifact(await buildCurrentArtifact(), validateGeneratedBytes);
    const result = await saveBytesAs(artifact.bytes, artifact.filename, { family: artifact.family });
    if (result.handle && !state.handle) {
      setCurrentFileHandle(result.handle, {
        fileName: result.handle.name || artifact.filename,
        family: artifact.family,
      });
    }
    logMessage(result.fallback === "download"
      ? `File System Access API no disponible; se creó ${artifact.filename} mediante descarga tradicional.`
      : `Archivo TNS creado: ${artifact.filename} (${result.bytesWritten} bytes).`);
    return result;
  }

  function currentNdlessArtifact() {
    const project = currentNdlessProject();
    const result = project
      ? window.NdlessBuildManager?.artifact?.(project)
      : null;
    if (!result?.ok || !result?.bytes?.length) return null;
    return {
      ok: true,
      family: "ndless",
      filename: ensureTnsName(result.filename || "ndless-app.tns"),
      bytes: result.bytes,
      detection: result.detection,
      projectFingerprint: result.projectFingerprint,
      sourceResult: result,
    };
  }

  async function downloadCurrentExperimental() {
    let artifact = currentNdlessArtifact();
    if (artifact) {
      logMessage("Ndless [validating]: validating current Build TNS...");
      artifact = core.validateArtifact(artifact, validateGeneratedBytes);
      logMessage("Ndless [downloading]: downloading current Build TNS...");
      fallbackDownload(artifact.bytes, artifact.filename);
      logMessage(`Descarga TNS experimental iniciada desde build vigente: ${artifact.filename} (${artifact.bytes.length} bytes).`);
      return { fallback: "download", source: "last-build", artifact };
    }

    logMessage("Ndless [preparing]: no current Build TNS matches this project; rebuilding before download...");
    artifact = core.validateArtifact(await buildCurrentArtifact(), validateGeneratedBytes);
    logMessage("Ndless [validating]: current artifact validated.");
    logMessage("Ndless [downloading]: downloading rebuilt artifact...");
    fallbackDownload(artifact.bytes, artifact.filename);
    logMessage(`Descarga TNS experimental iniciada: ${artifact.filename} (${artifact.bytes.length} bytes).`);
    return { fallback: "download", source: "fresh-build", artifact };
  }

  function logMessage(message, isError = false) {
    const prefix = "[Guardar experimental]";
    try {
      if (typeof xmlLog === "function") xmlLog(`${isError ? "ERROR " : ""}${prefix} ${message}`);
      else console[isError ? "error" : "log"](prefix, message);
    } catch (_) {
      console[isError ? "error" : "log"](prefix, message);
    }
    const status = document.querySelector("[data-tns-file-save-experimental-status]");
    if (status) {
      status.textContent = message;
      status.dataset.error = isError ? "1" : "0";
    }
  }

  function makeButton(text, action, className = "menu-action") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await action(); }
      catch (error) {
        if (error?.name !== "AbortError") logMessage(error?.message || String(error), true);
      } finally { button.disabled = false; }
    });
    return button;
  }

  function injectXmlControls() {
    const openInput = document.querySelector("#xml-tns-file");
    const openPanel = openInput?.closest(".menu-panel");
    if (openPanel && !openPanel.querySelector("[data-experimental-open-direct]")) {
      const button = makeButton("Abrir para edición directa", openTnsWithWritableHandle);
      button.dataset.experimentalOpenDirect = "1";
      openInput.closest("label")?.after(button);
    }
    const createButton = document.querySelector("#xml-create-tns-btn");
    const savePanel = createButton?.parentElement;
    if (savePanel && !savePanel.querySelector("[data-experimental-save-direct]")) {
      const save = makeButton("Guardar experimental", saveCurrentExperimental);
      save.dataset.experimentalSaveDirect = "1";
      const saveAs = makeButton("Guardar como…", saveCurrentAsExperimental);
      saveAs.dataset.experimentalSaveAs = "1";
      savePanel.append(save, saveAs);
    }
  }

  function injectNdlessControls() {
    document.querySelectorAll("#xml-doctor-panel .ndless-project-workspace").forEach(root => {
      const actions = root.querySelector(".ndless-project-actions");
      const buildButton = actions?.querySelector(".ndless-build-tns-button");
      if (!actions || !buildButton || actions.querySelector("[data-experimental-save-direct]")) return;

      const direct = makeButton("Descargar TNS experimental", downloadCurrentExperimental, "primary ndless-save-experimental-button");
      direct.dataset.experimentalSaveDirect = "1";
      direct.title = "Compila el proyecto Ndless actual, valida que sea Ndless real y descarga el .tns.";
      buildButton.insertAdjacentElement("afterend", direct);
    });
  }

  function injectStatus() {
    if (document.querySelector("[data-tns-file-save-experimental-status]")) return;
    const toolbar = document.querySelector("#xml-doctor-panel .doctor-toolbar");
    if (!toolbar) return;
    const status = document.createElement("span");
    status.dataset.tnsFileSaveExperimentalStatus = "1";
    status.style.fontSize = "11px";
    status.style.opacity = "0.8";
    status.style.maxWidth = "320px";
    status.style.overflow = "hidden";
    status.style.textOverflow = "ellipsis";
    status.style.whiteSpace = "nowrap";
    toolbar.append(status);
    updateStatus();
  }

  function updateStatus() {
    const status = document.querySelector("[data-tns-file-save-experimental-status]");
    if (!status) return;
    const support = canUseDirectFileAccess();
    if (state.handle) status.textContent = `Experimental: ${state.fileName || "archivo"} vinculado para sobrescritura`;
    else if (!support.save) status.textContent = "Experimental: sin handle; Guardar experimental creará el TNS mediante descarga";
    else status.textContent = "Experimental: sin handle; Guardar experimental abrirá Guardar como…";
  }

  function injectControls() {
    injectXmlControls();
    injectNdlessControls();
    injectStatus();
  }

  const observer = new MutationObserver(injectControls);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  injectControls();

  window.TnsFileSaveExperimental = Object.freeze({
    canUseDirectFileAccess,
    openTnsWithWritableHandle,
    setCurrentFileHandle,
    getCurrentFileHandle,
    clearCurrentFileHandle,
    saveBytesToCurrentFile,
    saveBytesAs,
    buildXmlDoctorArtifact,
    buildNdlessArtifact,
    buildCurrentArtifact,
    saveCurrentExperimental,
    saveCurrentAsExperimental,
    downloadCurrentExperimental,
    detectBytes,
    isNdlessDetection,
    validateGeneratedBytes,
  });
})();
