(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const ENGINE_JS = "https://cdn.jsdelivr.net/npm/@alexaltea/unicorn-js@2.1.4/dist/unicorn_arm.js";
  const ENGINE_WASM = "https://cdn.jsdelivr.net/npm/@alexaltea/unicorn-js@2.1.4/dist/unicorn_arm.wasm";
  const PAGE = 0x1000;
  const APP_BASE = 0x10000000;
  const STACK_BASE = 0x20000000;
  const STACK_SIZE = 0x00200000;
  const FB_BASE = 0x30000000;
  const FB_WIDTH = 320;
  const FB_HEIGHT = 240;
  const FB_BYTES = FB_WIDTH * FB_HEIGHT * 2;
  const EXIT_ADDR = 0x7fff0000;
  const SCREEN_PTR = 0xC0000010;
  const SCREEN_MODE = 0xC000001C;
  const SCREEN_INT = 0xC0000020;
  const CONTRAST = 0x900F0020;
  const TIMER2_TOP = 0x900D0000;
  const TIMER2_VALUE_CX = 0x900D0004;
  const TIMER2_VALUE_CLASSIC = 0x900D000C;
  const RTC_VALUE = 0x90090000;
  const UI_MARK = "__tnsNdlessArmUiV1";

  let enginePromise = null;
  let activeSession = null;
  let lastArtifact = null;

  const align = (n, a = PAGE) => Math.ceil(Math.max(1, Number(n) || 1) / a) * a;
  const asBytes = value => value instanceof Uint8Array ? value : new Uint8Array(value || 0);

  function u32(bytes, offset) {
    if (offset < 0 || offset + 4 > bytes.length) throw new RangeError(`u32 outside image at 0x${offset.toString(16)}`);
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function w32(bytes, offset, value) {
    const v = Number(value) >>> 0;
    if (offset < 0 || offset + 4 > bytes.length) throw new RangeError(`w32 outside image at 0x${offset.toString(16)}`);
    bytes[offset] = v & 0xff;
    bytes[offset + 1] = (v >>> 8) & 0xff;
    bytes[offset + 2] = (v >>> 16) & 0xff;
    bytes[offset + 3] = (v >>> 24) & 0xff;
  }

  function relocateImage(imageInput, relocs = [], base = APP_BASE, allocationSize = null) {
    const source = asBytes(imageInput);
    const size = Math.max(source.length, Number(allocationSize) || 0);
    const image = new Uint8Array(size);
    image.set(source);
    for (const reloc of relocs || []) {
      const type = Number(reloc.type);
      const offset = Number(reloc.data ?? reloc.offset ?? 0) >>> 0;
      if (type === 3) continue; // FILE_COMPRESSED is handled before relocation.
      if (type === 4) {
        if (offset !== 0) throw new Error(`Unexpected UNALIGNED_RELOC value ${offset}.`);
        continue;
      }
      if (offset >= image.length) throw new Error(`Zehn relocation outside image: type=${type}, offset=0x${offset.toString(16)}.`);
      if (type === 0) {
        w32(image, offset, (u32(image, offset) + base) >>> 0);
      } else if (type === 1) {
        let p = offset;
        let guard = 0;
        while (p + 4 <= image.length) {
          const value = u32(image, p);
          if (value === 0xffffffff) break;
          w32(image, p, (value + base) >>> 0);
          p += 4;
          if (++guard > 1_000_000) throw new Error("ADD_BASE_GOT did not reach its 0xFFFFFFFF terminator.");
        }
        if (p + 4 > image.length) throw new Error("ADD_BASE_GOT terminator is outside the image.");
      } else if (type === 2) {
        w32(image, offset, 0);
      } else {
        throw new Error(`Unsupported Zehn relocation type ${type}.`);
      }
    }
    return image;
  }

  async function prepareZehn(bytesInput, base = APP_BASE) {
    const bytes = asBytes(bytesInput);
    const Zehn = root.NdlessZehn;
    if (!Zehn?.findZehn || !Zehn?.inflateExecutable) throw new Error("Ndless Zehn parser is not loaded.");
    const parsed = Zehn.findZehn(bytes);
    if (!parsed?.valid) throw new Error(`A valid Zehn v1 TNS is required${parsed?.reason ? ` (${parsed.reason})` : ""}.`);
    const executable = await Zehn.inflateExecutable(bytes, parsed);
    const allocation = Math.max(executable.length, parsed.header.allocSize - parsed.layout.metaSize);
    const image = relocateImage(executable, parsed.relocs, base, allocation);
    const entry = (base + parsed.header.entryOffset) >>> 0;
    return { bytes, parsed, executable, image, allocation, base:base >>> 0, entry };
  }

  function loadClassicScript(src) {
    return new Promise((resolve, reject) => {
      const old = document.querySelector(`script[data-ndless-unicorn-src="${src}"]`);
      if (old) {
        if (old.dataset.loaded === "1") return resolve();
        old.addEventListener("load", resolve, { once:true });
        old.addEventListener("error", () => reject(new Error("Could not load Unicorn.js.")), { once:true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.ndlessUnicornSrc = src;
      script.addEventListener("load", () => { script.dataset.loaded = "1"; resolve(); }, { once:true });
      script.addEventListener("error", () => reject(new Error("Could not load Unicorn.js ARM runtime from CDN.")), { once:true });
      document.head.appendChild(script);
    });
  }

  async function engine() {
    if (enginePromise) return enginePromise;
    enginePromise = (async () => {
      if (typeof WebAssembly !== "object" || typeof BigInt !== "function") throw new Error("This browser lacks WebAssembly/BigInt required by the ARM emulator.");
      if (typeof document !== "undefined" && typeof root.MUnicorn !== "function") await loadClassicScript(ENGINE_JS);
      const factory = root.MUnicorn;
      if (typeof factory !== "function") throw new Error("Unicorn.js ARM factory was not exposed as MUnicorn.");
      const uc = await factory({ locateFile:path => String(path).endsWith(".wasm") ? ENGINE_WASM : path });
      if (!uc?.Unicorn || uc.ARCH_ARM == null) throw new Error("Unicorn.js ARM module initialized without the expected API.");
      return uc;
    })().catch(error => { enginePromise = null; throw error; });
    return enginePromise;
  }

  async function smokeTest() {
    const uc = await engine();
    const e = new uc.Unicorn(uc.ARCH_ARM, uc.MODE_ARM);
    const addr = 0x01000000;
    const code = new Uint8Array([
      0x37,0x00,0xA0,0xE3, // mov r0,#0x37
      0x23,0x10,0xA0,0xE3, // mov r1,#0x23
      0x01,0x20,0x80,0xE0, // add r2,r0,r1
    ]);
    try {
      e.mem_map(addr, PAGE, uc.PROT_ALL);
      e.mem_write(addr, code);
      e.emu_start(addr, addr + code.length, 0, 0);
      const r0 = e.reg_read_i32(uc.ARM_REG_R0) >>> 0;
      const r2 = e.reg_read_i32(uc.ARM_REG_R2) >>> 0;
      return { ok:r0 === 0x37 && r2 === 0x5a, r0, r2 };
    } finally { e.close(); }
  }

  function mapPage(e, uc, address, size = PAGE) {
    e.mem_map(address >>> 0, align(size), uc.PROT_ALL);
  }

  function writeMemU32(e, address, value) {
    const bytes = new Uint8Array(4);
    w32(bytes, 0, value);
    e.mem_write(address >>> 0, bytes);
  }

  function readMemU32(e, address) {
    return u32(asBytes(e.mem_read(address >>> 0, 4)), 0);
  }

  function mapHardware(e, uc) {
    for (const page of [0x90090000,0x900C0000,0x900D0000,0x900E0000,0x900F0000,0xC0000000]) mapPage(e, uc, page, PAGE);
    mapPage(e, uc, FB_BASE, FB_BYTES);
    writeMemU32(e, SCREEN_PTR, FB_BASE);
    writeMemU32(e, SCREEN_MODE, 0);
    writeMemU32(e, SCREEN_INT, 0);
    writeMemU32(e, CONTRAST, 0x80);
    writeMemU32(e, TIMER2_TOP, 0xffffffff);
    writeMemU32(e, TIMER2_VALUE_CX, 0xffffffff);
    writeMemU32(e, TIMER2_VALUE_CLASSIC, 0);
    writeMemU32(e, RTC_VALUE, Math.floor(Date.now() / 1000) >>> 0);
  }

  function updateHardware(session) {
    const elapsedMs = performance.now() - session.startedAt;
    const ticks = Math.floor(elapsedMs * 100 / 1000) >>> 0;
    try {
      writeMemU32(session.e, RTC_VALUE, Math.floor(Date.now() / 1000) >>> 0);
      writeMemU32(session.e, TIMER2_VALUE_CX, (0xffffffff - ticks * 64) >>> 0);
      writeMemU32(session.e, TIMER2_VALUE_CLASSIC, ticks >>> 0);
    } catch (_) {}
  }

  function currentFramebuffer(session) {
    const candidates = [];
    try { candidates.push(readMemU32(session.e, SCREEN_PTR)); } catch (_) {}
    candidates.push(FB_BASE);
    for (const ptr of candidates) {
      if (!ptr) continue;
      try {
        const bytes = asBytes(session.e.mem_read(ptr >>> 0, FB_BYTES));
        if (bytes.length === FB_BYTES) return { ptr:ptr >>> 0, bytes };
      } catch (_) {}
    }
    return null;
  }

  function renderSession(session) {
    const canvas = session.canvas;
    if (!canvas?.isConnected) return false;
    const frame = currentFramebuffer(session);
    if (!frame) return false;
    const ctx = canvas.getContext("2d");
    canvas.width = FB_WIDTH;
    canvas.height = FB_HEIGHT;
    ctx.imageSmoothingEnabled = false;
    if (root.NdlessFramebufferPreview?.draw) root.NdlessFramebufferPreview.draw(ctx, { bytes:frame.bytes });
    else {
      const image = ctx.createImageData(FB_WIDTH, FB_HEIGHT);
      for (let i=0;i<FB_WIDTH*FB_HEIGHT;i++) {
        const p=i*2, word=frame.bytes[p] | (frame.bytes[p+1]<<8), q=i*4;
        image.data[q]=Math.round(((word>>>11)&31)*255/31);
        image.data[q+1]=Math.round(((word>>>5)&63)*255/63);
        image.data[q+2]=Math.round((word&31)*255/31);
        image.data[q+3]=255;
      }
      ctx.putImageData(image,0,0);
    }
    session.framebufferAddress = frame.ptr;
    session.frames += 1;
    return true;
  }

  async function createMachine(bytesInput, options = {}) {
    const uc = await engine();
    const prepared = await prepareZehn(bytesInput, options.base || APP_BASE);
    const e = new uc.Unicorn(uc.ARCH_ARM, uc.MODE_ARM);
    const appMapSize = align(prepared.image.length);
    try {
      mapPage(e, uc, prepared.base, appMapSize);
      e.mem_write(prepared.base, prepared.image);
      mapPage(e, uc, STACK_BASE, STACK_SIZE);
      mapPage(e, uc, EXIT_ADDR, PAGE);
      mapHardware(e, uc);
      const stackTop = (STACK_BASE + STACK_SIZE - 16) >>> 0;
      e.reg_write_i32(uc.ARM_REG_R0, Number(options.argc || 0) | 0);
      e.reg_write_i32(uc.ARM_REG_R1, Number(options.argv || 0) | 0);
      e.reg_write_i32(uc.ARM_REG_SP, stackTop | 0);
      e.reg_write_i32(uc.ARM_REG_LR, EXIT_ADDR | 0);
      e.reg_write_i32(uc.ARM_REG_PC, prepared.entry | 0);
      return {
        uc,e,prepared,canvas:options.canvas || null,note:options.note || null,
        running:false,paused:false,stopped:false,error:null,exitCode:null,
        startedAt:performance.now(),frames:0,instructions:0,framebufferAddress:FB_BASE,
        sliceInstructions:Math.max(1000, Number(options.sliceInstructions) || 160000),
        onState:typeof options.onState === "function" ? options.onState : null,
      };
    } catch (error) { try { e.close(); } catch (_) {} throw error; }
  }

  function stateSnapshot(session) {
    let pc = 0;
    try { pc = session.e.reg_read_i32(session.uc.ARM_REG_PC) >>> 0; } catch (_) {}
    return {
      running:session.running, paused:session.paused, stopped:session.stopped,
      pc, frames:session.frames, instructions:session.instructions,
      framebufferAddress:session.framebufferAddress >>> 0,
      error:session.error ? String(session.error.message || session.error) : "",
    };
  }

  function emit(session, message = "") {
    const snapshot = { ...stateSnapshot(session), message };
    try { session.onState?.(snapshot); } catch (_) {}
    return snapshot;
  }

  function stop(session, reason = "stopped") {
    if (!session || session.stopped) return;
    session.running = false;
    session.paused = false;
    session.stopped = true;
    if (session.raf) cancelAnimationFrame(session.raf);
    try { session.e.emu_stop?.(); } catch (_) {}
    try { session.e.close(); } catch (_) {}
    emit(session, reason);
    if (activeSession === session) activeSession = null;
  }

  function pause(session) {
    if (!session || session.stopped) return;
    session.paused = true;
    session.running = false;
    if (session.raf) cancelAnimationFrame(session.raf);
    emit(session, "paused");
  }

  function resume(session) {
    if (!session || session.stopped) return;
    session.paused = false;
    session.running = true;
    session.startedAt ||= performance.now();
    emit(session, "running");
    const tick = () => {
      if (!session.running || session.paused || session.stopped) return;
      updateHardware(session);
      let pc = session.e.reg_read_i32(session.uc.ARM_REG_PC) >>> 0;
      if (pc === EXIT_ADDR) {
        session.exitCode = session.e.reg_read_i32(session.uc.ARM_REG_R0) | 0;
        renderSession(session);
        stop(session, `program exited (${session.exitCode})`);
        return;
      }
      try {
        session.e.emu_start(pc, EXIT_ADDR, 0, session.sliceInstructions);
        session.instructions += session.sliceInstructions;
        renderSession(session);
      } catch (error) {
        session.error = error;
        session.running = false;
        renderSession(session);
        emit(session, "execution error");
        return;
      }
      emit(session, "running");
      session.raf = requestAnimationFrame(tick);
    };
    session.raf = requestAnimationFrame(tick);
  }

  async function run(bytesInput, options = {}) {
    if (activeSession) stop(activeSession, "replaced");
    const session = await createMachine(bytesInput, options);
    activeSession = session;
    renderSession(session);
    resume(session);
    return session;
  }

  function sourceText(project) {
    return Object.entries(project?.files || {}).filter(([name]) => /\.(?:c|cpp|cc|cxx|h|hpp)$/i.test(name)).map(([,value]) => String(value || "")).join("\n");
  }

  function isNativeFramebufferProject(project) {
    return !!root.NdlessFramebufferPreview?.detect?.(sourceText(project));
  }

  function cloneForModernBuild(project) {
    return {
      ...project,
      target:"zehn-modern",
      files:{ ...(project?.files || {}) },
      settings:{ ...(project?.settings || {}) },
    };
  }

  async function buildCurrentProject(onProgress) {
    const project = root.NdlessProjectWorkspace?.getProject?.();
    if (!project) throw new Error("No Ndless project is open.");
    const bridge = root.NdlessLocalBridge;
    if (!bridge?.build || !bridge?.status) throw new Error("The local Ndless compiler bridge is unavailable.");
    const status = await bridge.status({ timeoutMs:1000 });
    if (!status?.connected || !status?.toolchainReady) {
      const error = new Error("The local Ndless compiler is not ready. Open Build TNS once, or load an already compiled .tns for Live ARM.");
      error.code = "LIVE_ARM_COMPILER_NOT_READY";
      throw error;
    }
    onProgress?.("Compilando Zehn para Live ARM…");
    const result = await bridge.build(cloneForModernBuild(project), { status, timeoutMs:240000, onProgress:info => onProgress?.(info?.message || info?.stage || "Compilando…") });
    if (!result?.bytes?.length) throw new Error("The compiler returned no TNS bytes.");
    lastArtifact = { bytes:asBytes(result.bytes), filename:result.filename || `${project.name || "program"}.tns`, source:"build" };
    return lastArtifact;
  }

  function ensureUiStyle() {
    if (document.getElementById("ndless-arm-runtime-style")) return;
    const style = document.createElement("style");
    style.id = "ndless-arm-runtime-style";
    style.textContent = `
      .ndless-arm-live{margin:12px 0 2px;padding:12px;border:1px solid rgba(113,158,208,.28);border-radius:12px;background:rgba(8,19,34,.42)}
      .ndless-arm-live-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ndless-arm-live button{border:1px solid rgba(99,194,220,.38);border-radius:9px;background:rgba(24,76,92,.42);color:inherit;padding:8px 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
      .ndless-arm-live button[data-arm-stop]{border-color:rgba(255,111,111,.3);background:rgba(103,39,48,.28)}.ndless-arm-live-status{margin-top:9px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#9fb4cd;word-break:break-word}.ndless-arm-live-status strong{color:#b8ff66}.ndless-arm-live input{display:none}
    `;
    document.head.appendChild(style);
  }

  function fmtHex(value) { return `0x${(Number(value) >>> 0).toString(16).toUpperCase().padStart(8,"0")}`; }

  function uiStatus(box, text, good = false) {
    const status = box?.querySelector?.("[data-arm-status]");
    if (status) status.innerHTML = good ? `<strong>${String(text)}</strong>` : String(text);
  }

  async function startUiRuntime(box, artifact) {
    const canvas = document.querySelector("[data-ndless-project-canvas]");
    const note = document.querySelector("[data-preview-note]");
    if (!canvas) throw new Error("Ndless preview canvas was not found.");
    uiStatus(box, "Cargando motor ARM WebAssembly…");
    const smoke = await smokeTest();
    if (!smoke.ok) throw new Error(`ARM engine self-test failed (r0=${smoke.r0}, r2=${smoke.r2}).`);
    uiStatus(box, "Motor ARM OK. Cargando Zehn y aplicando relocaciones…", true);
    const session = await run(artifact.bytes, {
      canvas,note,
      onState:state => {
        const btn = box.querySelector("[data-arm-live]");
        if (btn) btn.textContent = state.running ? "Pausar ARM" : state.paused ? "Continuar ARM" : "Live ARM";
        if (state.error) {
          uiStatus(box, `ARM detenido · PC=${fmtHex(state.pc)} · ${state.error}. Este acceso indica el próximo syscall/hardware que falta emular.`);
          if (note) note.textContent = `Live ARM reached ${fmtHex(state.pc)} and stopped: ${state.error}`;
        } else if (state.running) {
          uiStatus(box, `ARM ejecutando · PC=${fmtHex(state.pc)} · frames=${state.frames} · framebuffer=${fmtHex(state.framebufferAddress)}`, true);
          if (note) note.textContent = "Live ARM experimental: executing the compiled Ndless Zehn in-browser and refreshing the RGB565 framebuffer.";
        } else if (state.stopped) uiStatus(box, `ARM finalizado · PC=${fmtHex(state.pc)} · frames=${state.frames}`);
      },
    });
    return session;
  }

  function mountUi() {
    if (typeof document === "undefined") return;
    ensureUiStyle();
    const project = root.NdlessProjectWorkspace?.getProject?.();
    const canvas = document.querySelector("[data-ndless-project-canvas]");
    const note = document.querySelector("[data-preview-note]");
    if (!project || !canvas || !note || !isNativeFramebufferProject(project)) return;
    const parent = note.parentElement || canvas.parentElement;
    if (!parent || parent.querySelector(`[data-arm-ui="${UI_MARK}"]`)) return;
    const box = document.createElement("div");
    box.className = "ndless-arm-live";
    box.dataset.armUi = UI_MARK;
    box.innerHTML = `<div class="ndless-arm-live-row">
      <button type="button" data-arm-live>Live ARM</button>
      <button type="button" data-arm-load>Cargar TNS</button>
      <button type="button" data-arm-stop hidden>Detener</button>
      <input type="file" accept=".tns,application/octet-stream" data-arm-file>
    </div><div class="ndless-arm-live-status" data-arm-status>Preview estático RGB565. Pulsa <strong>Live ARM</strong> para intentar compilar/ejecutar, o <strong>Cargar TNS</strong> en móvil.</div>`;
    note.insertAdjacentElement("afterend", box);
    const live = box.querySelector("[data-arm-live]");
    const load = box.querySelector("[data-arm-load]");
    const stopBtn = box.querySelector("[data-arm-stop]");
    const input = box.querySelector("[data-arm-file]");

    live.addEventListener("click", async () => {
      try {
        if (activeSession?.running) { pause(activeSession); stopBtn.hidden = false; return; }
        if (activeSession?.paused) { resume(activeSession); stopBtn.hidden = false; return; }
        let artifact = lastArtifact;
        if (!artifact) artifact = await buildCurrentProject(text => uiStatus(box, text));
        stopBtn.hidden = false;
        await startUiRuntime(box, artifact);
      } catch (error) {
        uiStatus(box, `${error.message || error} Puedes usar “Cargar TNS” si el navegador no tiene acceso al compilador local.`);
      }
    });
    load.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const artifact = { bytes:new Uint8Array(await file.arrayBuffer()), filename:file.name, source:"upload" };
        await prepareZehn(artifact.bytes);
        lastArtifact = artifact;
        stopBtn.hidden = false;
        await startUiRuntime(box, artifact);
      } catch (error) { uiStatus(box, `No se pudo iniciar ${file.name}: ${error.message || error}`); }
      finally { input.value = ""; }
    });
    stopBtn.addEventListener("click", () => { if (activeSession) stop(activeSession, "user stop"); stopBtn.hidden = true; live.textContent = "Live ARM"; uiStatus(box, "Live ARM detenido."); });
  }

  if (typeof document !== "undefined") {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; mountUi(); });
    };
    new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
    document.addEventListener("click", event => { if (event.target?.closest?.("[data-project-tab], [data-project-refresh]")) setTimeout(schedule, 20); }, true);
    schedule();
  }

  root.NdlessArmRuntime = Object.freeze({
    ENGINE_JS, ENGINE_WASM, APP_BASE, STACK_BASE, STACK_SIZE, FB_BASE, FB_WIDTH, FB_HEIGHT, FB_BYTES, EXIT_ADDR,
    align, u32, w32, relocateImage, prepareZehn, engine, smokeTest, createMachine, run, pause, resume, stop,
    get activeSession(){ return activeSession; },
    get lastArtifact(){ return lastArtifact; },
    mountUi,
  });
})();
