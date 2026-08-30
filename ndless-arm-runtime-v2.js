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
  const HEAP_BASE = 0x40000000;
  const HEAP_SIZE = 0x04000000;
  const VAR_BASE = 0x50000000;
  const VAR_SIZE = 0x00010000;
  const EXIT_ADDR = 0x7fff0000;

  const SCREEN_PTR = 0xC0000010;
  const SCREEN_MODE = 0xC000001C;
  const SCREEN_INT = 0xC0000020;
  const CONTRAST = 0x900F0020;
  const KEYPAD_BASE = 0x900E0000;
  const TIMER2_TOP = 0x900D0000;
  const TIMER2_VALUE_CX = 0x900D0004;
  const TIMER2_VALUE_CLASSIC = 0x900D000C;
  const RTC_VALUE = 0x90090000;

  const SYSCALL_ISEXT = 0x200000;
  const SYSCALL_ISEMU = 0x400000;
  const SYSCALL_ISVAR = 0x800000;
  const SYSCALL_FLAG_MASK = SYSCALL_ISEXT | SYSCALL_ISEMU | SYSCALL_ISVAR;

  const VAR_KEYPAD_TYPE = VAR_BASE + 0x00;
  const VAR_ERRNO = VAR_BASE + 0x04;
  const VAR_STDIN = VAR_BASE + 0x100;
  const VAR_STDOUT = VAR_BASE + 0x120;
  const VAR_STDERR = VAR_BASE + 0x140;

  const UI_MARK = "__tnsNdlessArmUiV2";
  const mountedFiles = new Map();
  let enginePromise = null;
  let activeSession = null;
  let lastArtifact = null;
  let lastWad = null;

  const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const textDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
  const align = (n, a = PAGE) => Math.ceil(Math.max(1, Number(n) || 1) / a) * a;
  const align8 = n => (Number(n) + 7) & ~7;
  const asBytes = value => value instanceof Uint8Array ? value : new Uint8Array(value || 0);

  function u16(bytes, offset = 0) {
    return (bytes[offset] | (bytes[offset + 1] << 8)) >>> 0;
  }
  function u32(bytes, offset = 0) {
    if (offset < 0 || offset + 4 > bytes.length) throw new RangeError(`u32 outside image at 0x${offset.toString(16)}`);
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }
  function w16(bytes, offset, value) {
    const v = Number(value) >>> 0;
    bytes[offset] = v & 0xff;
    bytes[offset + 1] = (v >>> 8) & 0xff;
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
      if (type === 3) continue;
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
    return { bytes, parsed, executable, image, allocation, base:base >>> 0, entry:(base + parsed.header.entryOffset) >>> 0 };
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
      0x37,0x00,0xA0,0xE3,
      0x23,0x10,0xA0,0xE3,
      0x01,0x20,0x80,0xE0,
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

  function mapPage(e, uc, address, size = PAGE) { e.mem_map(address >>> 0, align(size), uc.PROT_ALL); }
  function readMem(e, address, size) { return asBytes(e.mem_read(address >>> 0, Number(size) >>> 0)); }
  function writeMem(e, address, bytes) { e.mem_write(address >>> 0, asBytes(bytes)); }
  function readMemU16(e, address) { return u16(readMem(e, address, 2), 0); }
  function writeMemU16(e, address, value) { const b = new Uint8Array(2); w16(b,0,value); writeMem(e,address,b); }
  function readMemU32(e, address) { return u32(readMem(e, address, 4), 0); }
  function writeMemU32(e, address, value) { const b = new Uint8Array(4); w32(b,0,value); writeMem(e,address,b); }

  function encodeText(text) {
    if (textEncoder) return textEncoder.encode(String(text));
    const s = unescape(encodeURIComponent(String(text)));
    return Uint8Array.from(s, ch => ch.charCodeAt(0));
  }
  function decodeText(bytes) {
    if (textDecoder) return textDecoder.decode(bytes);
    return decodeURIComponent(escape(String.fromCharCode(...bytes)));
  }
  function readCString(e, address, max = 1 << 20) {
    const ptr = Number(address) >>> 0;
    if (!ptr) return "";
    const chunks = [];
    let pos = ptr;
    for (let left=max; left>0;) {
      const take = Math.min(left, 256);
      const bytes = readMem(e, pos, take);
      const end = bytes.indexOf(0);
      if (end >= 0) { chunks.push(bytes.subarray(0,end)); break; }
      chunks.push(bytes); pos += take; left -= take;
    }
    let total=0; for (const c of chunks) total += c.length;
    const joined = new Uint8Array(total); let o=0;
    for (const c of chunks) { joined.set(c,o); o += c.length; }
    return decodeText(joined);
  }
  function writeCString(e, address, value, capacity = Infinity) {
    const bytes = encodeText(String(value));
    const count = Math.max(0, Math.min(bytes.length, Number.isFinite(capacity) ? Math.max(0,capacity-1) : bytes.length));
    const out = new Uint8Array(count + 1);
    out.set(bytes.subarray(0,count));
    writeMem(e,address,out);
    return count;
  }

  function normalizePath(value) {
    let path = String(value || "").replace(/\\/g,"/").replace(/^A:/i,"");
    if (!path.startsWith("/")) path = "/documents/" + path;
    path = path.replace(/\/+/,"/");
    const parts=[];
    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop(); else parts.push(part);
    }
    return "/" + parts.join("/");
  }
  function mountVirtualFile(path, bytes, options = {}) {
    const key = normalizePath(path);
    const entry = { path:key, bytes:asBytes(bytes).slice(), writable:options.writable !== false, mtime:Math.floor(Date.now()/1000) };
    mountedFiles.set(key, entry);
    return entry;
  }
  function getVirtualFile(path) { return mountedFiles.get(normalizePath(path)) || null; }
  function listVirtualFiles() { return [...mountedFiles.values()].map(x => ({ path:x.path, size:x.bytes.length, writable:x.writable })); }

  const KEYMAP = Object.freeze({
    ArrowUp:[0x1E,0x001], ArrowRight:[0x1E,0x004], ArrowDown:[0x1E,0x010], ArrowLeft:[0x1E,0x040],
    Enter:[0x10,0x002], NumpadEnter:[0x10,0x002], Space:[0x10,0x004], Escape:[0x1C,0x080], Tab:[0x1C,0x200],
    ControlLeft:[0x1E,0x200], ControlRight:[0x1E,0x200], ShiftLeft:[0x1A,0x200], ShiftRight:[0x1A,0x200],
    Delete:[0x1E,0x100], Backspace:[0x1E,0x100], Period:[0x10,0x020], NumpadDecimal:[0x10,0x020],
    Minus:[0x14,0x002], NumpadSubtract:[0x14,0x002], Equal:[0x12,0x002], NumpadAdd:[0x12,0x002],
    Digit0:[0x10,0x080], Numpad0:[0x10,0x080], Digit1:[0x12,0x080], Numpad1:[0x12,0x080],
    Digit2:[0x12,0x020], Numpad2:[0x12,0x020], Digit3:[0x12,0x008], Numpad3:[0x12,0x008],
    Digit4:[0x14,0x080], Numpad4:[0x14,0x080], Digit5:[0x14,0x020], Numpad5:[0x14,0x020],
    Digit6:[0x14,0x008], Numpad6:[0x14,0x008], Digit7:[0x16,0x080], Numpad7:[0x16,0x080],
    Digit8:[0x16,0x020], Numpad8:[0x16,0x020], Digit9:[0x16,0x008], Numpad9:[0x16,0x008],
    KeyA:[0x1C,0x040], KeyB:[0x1C,0x010], KeyC:[0x1C,0x004], KeyD:[0x1A,0x100], KeyE:[0x1A,0x040], KeyF:[0x1A,0x010], KeyG:[0x1A,0x004],
  });

  function setKeyMatrix(session, row, col, pressed) {
    if (!session?.e || session.stopped) return;
    const address = KEYPAD_BASE + row;
    let value = 0;
    try { value = readMemU16(session.e,address); } catch (_) {}
    value = pressed ? (value | col) : (value & ~col);
    try { writeMemU16(session.e,address,value); } catch (_) {}
  }
  function bindInput(session) {
    if (typeof document === "undefined") return () => {};
    const held = new Set();
    const key = (event, pressed) => {
      const map = KEYMAP[event.code];
      if (!map || !session.running && !session.paused) return;
      if (pressed) held.add(event.code); else held.delete(event.code);
      setKeyMatrix(session,map[0],map[1],pressed);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","Tab"].includes(event.code)) event.preventDefault();
    };
    const down = e => key(e,true), up = e => key(e,false);
    const canvas = session.canvas;
    const pointerDown = e => { setKeyMatrix(session,0x1C,0x002,true); e.preventDefault(); };
    const pointerUp = e => { setKeyMatrix(session,0x1C,0x002,false); e.preventDefault(); };
    document.addEventListener("keydown",down,true); document.addEventListener("keyup",up,true);
    canvas?.addEventListener?.("pointerdown",pointerDown,true); document.addEventListener("pointerup",pointerUp,true);
    return () => {
      document.removeEventListener("keydown",down,true); document.removeEventListener("keyup",up,true);
      canvas?.removeEventListener?.("pointerdown",pointerDown,true); document.removeEventListener("pointerup",pointerUp,true);
      for (const code of held) { const map=KEYMAP[code]; if(map) setKeyMatrix(session,map[0],map[1],false); }
    };
  }

  function mapHardware(e, uc) {
    for (const page of [0x90090000,0x900C0000,0x900D0000,0x900E0000,0x900F0000,0xC0000000]) mapPage(e,uc,page,PAGE);
    mapPage(e,uc,FB_BASE,FB_BYTES);
    writeMemU32(e,SCREEN_PTR,FB_BASE); writeMemU32(e,SCREEN_MODE,0); writeMemU32(e,SCREEN_INT,0);
    writeMemU32(e,CONTRAST,0x80); writeMemU32(e,TIMER2_TOP,0xffffffff); writeMemU32(e,TIMER2_VALUE_CX,0xffffffff);
    writeMemU32(e,TIMER2_VALUE_CLASSIC,0); writeMemU32(e,RTC_VALUE,Math.floor(Date.now()/1000)>>>0);
  }
  function updateHardware(session) {
    const elapsedMs = performance.now() - session.startedAt;
    const t100 = Math.floor(elapsedMs / 10) >>> 0;
    try {
      writeMemU32(session.e,RTC_VALUE,Math.floor(Date.now()/1000)>>>0);
      writeMemU32(session.e,TIMER2_VALUE_CX,(0xffffffff - t100*64)>>>0);
      writeMemU32(session.e,TIMER2_VALUE_CLASSIC,t100);
    } catch (_) {}
  }

  function createKernel(session) {
    const { e, uc } = session;
    let heapNext = HEAP_BASE + PAGE;
    const allocations = new Map();
    const fileHandles = new Map();
    const logs = [];

    function reg(n) { return e.reg_read_i32(uc[`ARM_REG_R${n}`]) >>> 0; }
    function setReg(n,v) { e.reg_write_i32(uc[`ARM_REG_R${n}`], Number(v)|0); }
    function sp() { return e.reg_read_i32(uc.ARM_REG_SP) >>> 0; }
    function rawArg(index, firstReg = 0) {
      const registerIndex = firstReg + index;
      if (registerIndex <= 3) return reg(registerIndex);
      const stackIndex = registerIndex - 4;
      return readMemU32(e,(sp()+stackIndex*4)>>>0);
    }
    function allocRaw(size, zero = true) {
      const n = align8(Math.max(1,Number(size)||1));
      if (heapNext + n > HEAP_BASE + HEAP_SIZE) throw new Error(`Ndless emulated heap exhausted while allocating ${n} bytes.`);
      const ptr = heapNext >>> 0; heapNext = (heapNext+n)>>>0; allocations.set(ptr,n);
      if (zero) writeMem(e,ptr,new Uint8Array(n));
      return ptr;
    }
    function freeRaw(ptr) { allocations.delete(Number(ptr)>>>0); }
    function reallocRaw(ptr,size) {
      const old = Number(ptr)>>>0, n=Math.max(1,Number(size)||1);
      if (!old) return allocRaw(n);
      const next=allocRaw(n,false), oldSize=allocations.get(old)||0;
      if (oldSize) writeMem(e,next,readMem(e,old,Math.min(oldSize,n)));
      freeRaw(old); return next;
    }
    function mallocCString(text) { const bytes=encodeText(String(text)); const p=allocRaw(bytes.length+1); writeMem(e,p,bytes); return p; }
    function setErrno(value) { writeMemU32(e,VAR_ERRNO,Number(value)||0); }
    function appendLog(text) { const s=String(text); logs.push(s); if(logs.length>200) logs.shift(); session.lastLog=s; }

    function formatC(fmtPtr, firstReg) {
      const fmt = readCString(e,fmtPtr,65536);
      let argIndex=0;
      const take = () => rawArg(argIndex++,firstReg);
      return fmt.replace(/%([#0\- +]*)(\d+)?(?:\.(\d+))?(?:hh|h|ll|l|z|t|j)?([diuoxXcsp%])/g,(all,flags,widthRaw,precisionRaw,type) => {
        if(type === "%") return "%";
        const v=take(); let out="";
        if(type === "s") { out=readCString(e,v,1<<20); if(precisionRaw) out=out.slice(0,+precisionRaw); }
        else if(type === "c") out=String.fromCharCode(v&255);
        else if(type === "d" || type === "i") out=String(v|0);
        else if(type === "u") out=String(v>>>0);
        else if(type === "x" || type === "X" || type === "o") {
          const radix=type === "o" ? 8 : 16; out=(v>>>0).toString(radix); if(type === "X") out=out.toUpperCase();
          if(flags.includes("#") && v) out=(type === "o" ? "0" : type === "X" ? "0X" : "0x")+out;
        } else if(type === "p") out="0x"+(v>>>0).toString(16);
        const width=Number(widthRaw)||0; if(width>out.length) { const pad=(flags.includes("0")&&!flags.includes("-"))?"0":" "; const fill=pad.repeat(width-out.length); out=flags.includes("-")?out+fill:fill+out; }
        return out;
      });
    }

    function fileHandle(handle) { return fileHandles.get(Number(handle)>>>0) || null; }
    function updateHandleFlags(handle) {
      try { writeMemU32(e,(handle.ptr+12)>>>0,handle.eof?0x10:0); } catch (_) {}
    }
    function openFile(pathValue, modeValue) {
      const path=normalizePath(pathValue), mode=String(modeValue||"r");
      let file=mountedFiles.get(path);
      if (!file && /[wa+]/.test(mode)) file=mountVirtualFile(path,new Uint8Array(0),{writable:true});
      if (!file) { setErrno(2); return 0; }
      if (mode.startsWith("w")) file.bytes=new Uint8Array(0);
      const ptr=allocRaw(32); const h={ptr,path,file,mode,pos:mode.startsWith("a")?file.bytes.length:0,eof:false,ungot:null};
      fileHandles.set(ptr,h); updateHandleFlags(h); return ptr;
    }
    function ensureFileCapacity(file,size) {
      if (file.bytes.length >= size) return;
      const next=new Uint8Array(size); next.set(file.bytes); file.bytes=next;
    }
    function fread(ptr,size,count,handlePtr) {
      const h=fileHandle(handlePtr); if(!h) {setErrno(9); return 0;}
      const item=Math.max(0,size>>>0), items=Math.max(0,count>>>0), total=item*items; if(!item||!items)return 0;
      let out=new Uint8Array(total), written=0;
      if(h.ungot!=null && written<total){out[written++]=h.ungot;h.ungot=null;}
      const available=Math.max(0,h.file.bytes.length-h.pos), take=Math.min(total-written,available);
      if(take){out.set(h.file.bytes.subarray(h.pos,h.pos+take),written);h.pos+=take;written+=take;}
      if(written) writeMem(e,ptr,out.subarray(0,written));
      h.eof=written<total; updateHandleFlags(h); return Math.floor(written/item);
    }
    function fwrite(ptr,size,count,handlePtr) {
      const item=Math.max(0,size>>>0), items=Math.max(0,count>>>0), total=item*items; if(!item||!items)return 0;
      const bytes=readMem(e,ptr,total), hp=Number(handlePtr)>>>0;
      if(hp===VAR_STDOUT || hp===VAR_STDERR){appendLog(decodeText(bytes));return items;}
      const h=fileHandle(hp); if(!h){setErrno(9);return 0;} if(!h.file.writable){setErrno(13);return 0;}
      ensureFileCapacity(h.file,h.pos+total); h.file.bytes.set(bytes,h.pos); h.pos+=total; h.file.mtime=Math.floor(Date.now()/1000); h.eof=false; updateHandleFlags(h); return items;
    }
    function fseek(handlePtr,offset,whence) {
      const h=fileHandle(handlePtr); if(!h){setErrno(9);return -1;}
      const signed=offset|0; const base=whence===1?h.pos:whence===2?h.file.bytes.length:0; h.pos=Math.max(0,Math.min(h.file.bytes.length,base+signed));h.eof=false;h.ungot=null;updateHandleFlags(h);return 0;
    }
    function fgetc(handlePtr) {
      const h=fileHandle(handlePtr); if(!h)return -1;
      if(h.ungot!=null){const v=h.ungot;h.ungot=null;return v;}
      if(h.pos>=h.file.bytes.length){h.eof=true;updateHandleFlags(h);return -1;} return h.file.bytes[h.pos++];
    }
    function statFile(pathPtr,outPtr) {
      const file=getVirtualFile(readCString(e,pathPtr)); if(!file){setErrno(2);return -1;}
      const b=new Uint8Array(36); w16(b,0,1);w32(b,4,0);w32(b,8,0x81A4);w16(b,12,1);w16(b,14,0);w16(b,16,0);w16(b,18,1);w32(b,20,file.bytes.length);w32(b,24,file.mtime);w32(b,28,file.mtime);w32(b,32,file.mtime);writeMem(e,outPtr,b);return 0;
    }

    function ascii2utf16(dst,src,maxBytes) {
      const text=readCString(e,src,Math.max(1,maxBytes)); const out=new Uint8Array(Math.max(2,Math.min(maxBytes>>>0,(text.length+1)*2))); let o=0;
      for(const ch of text){if(o+2>out.length-2)break;const c=ch.charCodeAt(0);out[o++]=c&255;out[o++]=(c>>>8)&255;} if(o+1<out.length){out[o]=0;out[o+1]=0;} writeMem(e,dst,out);return dst;
    }

    function decodeSwi(intno) {
      const pc=e.reg_read_i32(uc.ARM_REG_PC)>>>0;
      for(const at of [(pc-4)>>>0,pc]){
        try{const ins=readMemU32(e,at);if((ins&0xff000000)===0xef000000)return ins&0x00ffffff;}catch(_){}
      }
      return Number(intno)>>>0;
    }
    function unsupported(nr) {
      const pc=e.reg_read_i32(uc.ARM_REG_PC)>>>0;
      session.pendingError=Object.assign(new Error(`Unsupported Ndless SWI 0x${nr.toString(16).toUpperCase()} at PC=0x${pc.toString(16).toUpperCase()}`),{code:"NDLESS_SWI_UNSUPPORTED",syscall:nr,pc});
      session.lastSyscall=nr; try{e.emu_stop();}catch(_){}
    }
    function ret(value=0){setReg(0,value>>>0);}

    function handleVariable(baseNr){
      if(baseNr===59){ret(VAR_KEYPAD_TYPE);return true;}
      if(baseNr===61){ret(VAR_ERRNO);return true;}
      if(baseNr===71){ret(VAR_STDIN);return true;}
      if(baseNr===72){ret(VAR_STDOUT);return true;}
      if(baseNr===73){ret(VAR_STDERR);return true;}
      return false;
    }
    function handleExtended(baseNr){
      if(baseNr===0){ret(0);return true;} // nl_osvalue
      if(baseNr===2){ret(1);return true;} // virtual CX/color hardware
      if(baseNr===3){ret(0);return true;}
      if(baseNr===5){ret(0);return true;}
      if(baseNr===6){ret(2003);return true;} // old-enough to keep nDoom RGB565 path, new-enough for Ndless APIs
      if(baseNr===7){ret(0);return true;}
      if(baseNr===8){ret(1);return true;}
      if(baseNr===9){ret(0);return true;}
      if(baseNr===10){ret(-1);return true;}
      if(baseNr===11){ret(0);return true;}
      if(baseNr===12){ret(1);return true;}
      if(baseNr===13){ret(0);return true;}
      if(baseNr===14){ret(0);return true;} // SCR_320x240_565
      if(baseNr===15){ret(1);return true;}
      return false;
    }

    function handleStandard(nr){
      const a0=reg(0),a1=reg(1),a2=reg(2),a3=reg(3);
      switch(nr){
        case 0: ret(openFile(readCString(e,a0),readCString(e,a1))); return true;
        case 1: ret(fread(a0,a1,a2,a3)); return true;
        case 2: ret(fwrite(a0,a1,a2,a3)); return true;
        case 3: {const h=fileHandle(a0);if(h){fileHandles.delete(a0);freeRaw(a0);}ret(0);return true;}
        case 4: {const h=fileHandle(a2);if(!h){ret(0);return true;}let chars=[];while(chars.length<Math.max(0,(a1|0)-1)){const c=fgetc(a2);if(c<0)break;chars.push(c);if(c===10)break;}if(!chars.length){ret(0);return true;}const out=Uint8Array.from([...chars,0]);writeMem(e,a0,out);ret(a0);return true;}
        case 5: ret(allocRaw(a0)); return true;
        case 6: freeRaw(a0); ret(0); return true;
        case 7: {writeMem(e,a0,new Uint8Array(a2).fill(a1&255));ret(a0);return true;}
        case 8: {writeMem(e,a0,readMem(e,a1,a2));ret(a0);return true;}
        case 9: {const x=readMem(e,a0,a2),y=readMem(e,a1,a2);let d=0;for(let i=0;i<a2;i++){if(x[i]!==y[i]){d=x[i]-y[i];break;}}ret(d);return true;}
        case 10: {appendLog(formatC(a0,1));ret(0);return true;}
        case 11: {const s=formatC(a1,2);writeCString(e,a0,s);ret(s.length);return true;}
        case 12: {const s=formatC(a1,2),bytes=encodeText(s),hp=a0;if(hp===VAR_STDOUT||hp===VAR_STDERR)appendLog(s);else{const tmp=allocRaw(bytes.length,false);writeMem(e,tmp,bytes);fwrite(tmp,1,bytes.length,hp);}ret(s.length);return true;}
        case 13: ret(ascii2utf16(a0,a1,a2)); return true;
        case 14: ret(0); return true;
        case 15: case 16: case 17: ret(0); return true;
        case 18: ret(statFile(a0,a1)); return true;
        case 19: {mountedFiles.delete(normalizePath(readCString(e,a0)));ret(0);return true;}
        case 20: {const old=normalizePath(readCString(e,a0)),neo=normalizePath(readCString(e,a1)),file=mountedFiles.get(old);if(!file){ret(-1);return true;}mountedFiles.delete(old);file.path=neo;mountedFiles.set(neo,file);ret(0);return true;}
        case 21: ret(0); return true;
        case 22: {appendLog(readCString(e,a0));ret(0);return true;}
        case 23: case 24: ret(-1); return true; case 25: ret(0); return true;
        case 26: {const x=readCString(e,a0),y=readCString(e,a1);ret(x<y?-1:x>y?1:0);return true;}
        case 27: {const s=readCString(e,a1);writeCString(e,a0,s);ret(a0);return true;}
        case 28: {let x=readCString(e,a0),y=readCString(e,a1);writeCString(e,a0,x+y.slice(0,a2));ret(a0);return true;}
        case 29: ret(encodeText(readCString(e,a0)).length); return true;
        case 30: appendLog(`[dialog] ${readCString(e,a1)} ${readCString(e,a2)}`);ret(0);return true;
        case 31: {const s=readCString(e,a0),ch=String.fromCharCode(a1&255),i=s.lastIndexOf(ch);ret(i<0?0:(a0+i));return true;}
        case 33: ret(fseek(a0,a1,a2)); return true;
        case 34: {writeCString(e,a1,"A:\\documents");ret(1);return true;}
        case 35: ret(readMemU32(e,a0)); return true;
        case 36: ret(readMemU16(e,a0)); return true;
        case 37: {const bytes=encodeText(readCString(e,a1));const n=a2>>>0,out=new Uint8Array(n);out.set(bytes.subarray(0,n));writeMem(e,a0,out);ret(a0);return true;}
        case 38: ret(/[A-Za-z]/.test(String.fromCharCode(a0&255))?1:0);return true;
        case 39: ret((a0&255)<128?1:0);return true;
        case 40: ret(/[0-9]/.test(String.fromCharCode(a0&255))?1:0);return true;
        case 41: ret(/[a-z]/.test(String.fromCharCode(a0&255))?1:0);return true;
        case 42: ret((a0&255)>=32&&(a0&255)<127?1:0);return true;
        case 43: ret(/\s/.test(String.fromCharCode(a0&255))?1:0);return true;
        case 44: ret(/[A-Z]/.test(String.fromCharCode(a0&255))?1:0);return true;
        case 45: ret(/[0-9A-Fa-f]/.test(String.fromCharCode(a0&255))?1:0);return true;
        case 46: {const c=String.fromCharCode(a0&255);ret(c.toLowerCase().charCodeAt(0));return true;}
        case 47: ret(parseInt(readCString(e,a0),10)||0);return true;
        case 49: {const total=(a0>>>0)*(a1>>>0);ret(total>0xffffffff?0:allocRaw(total));return true;}
        case 50: ret(reallocRaw(a0,a1));return true;
        case 51: {const s=readCString(e,a0),set=readCString(e,a1);let i=-1;for(let j=0;j<s.length;j++)if(set.includes(s[j])){i=j;break;}ret(i<0?0:a0+i);return true;}
        case 52: ret(fgetc(a0));return true;
        case 53: ret(1);return true;
        case 54: {const b=Uint8Array.of(a0&255),tmp=allocRaw(1,false);writeMem(e,tmp,b);fwrite(tmp,1,1,a1);ret(a0&255);return true;}
        case 55: {const b=readMem(e,a1,a2);writeMem(e,a0,b);ret(a0);return true;}
        case 56: {const b=readMem(e,a0,a1);b.reverse();writeMem(e,a0,b);ret(a0);return true;}
        case 57: {const s=readCString(e,a0),i=s.indexOf(String.fromCharCode(a1&255));ret(i<0?0:a0+i);return true;}
        case 58: {const x=readCString(e,a0).slice(0,a2),y=readCString(e,a1).slice(0,a2);ret(x<y?-1:x>y?1:0);return true;}
        case 60: ret(openFile(readCString(e,a0),readCString(e,a1)));return true;
        case 62: {const c=String.fromCharCode(a0&255);ret(c.toUpperCase().charCodeAt(0));return true;}
        case 63: {const s=readCString(e,a0),m=s.match(/^[\s]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/),val=m?Number(m[0]):0;if(a1)writeMemU32(e,a1,(a0+(m?m[0].length:0))>>>0);session.floatReturn=val;ret(Math.trunc(val));return true;}
        case 64: {const s=readCString(e,a0),base=a2||10,m=s.match(/^[\s]*[+-]?[0-9A-Za-z]+/),v=m?parseInt(m[0],base):0;if(a1)writeMemU32(e,a1,(a0+(m?m[0].length:0))>>>0);ret(Number.isFinite(v)?v:0);return true;}
        case 65: {const h=fileHandle(a0);if(h&&h.pos>0){h.pos--;h.eof=false;updateHandleFlags(h);ret(0);}else ret(-1);return true;}
        case 66: {const p=mallocCString(`errno ${a0|0}`);ret(p);return true;}
        case 67: {const s=readCString(e,a0)+readCString(e,a1);writeCString(e,a0,s);ret(a0);return true;}
        case 68: {const s=readCString(e,a0),needle=readCString(e,a1),i=s.indexOf(needle);ret(i<0?0:a0+i);return true;}
        case 69: ret(0);return true;
        case 70: {mountedFiles.delete(normalizePath(readCString(e,a0)));ret(0);return true;}
        case 74: {const h=fileHandle(a0);ret(h?.error?1:0);return true;}
        case 75: case 76: ret(0);return true;
        case 77: case 78: case 79: ret(0);return true;
        case 88: ret(0);return true;
        case 89: {const h=fileHandle(a0);ret(h?h.pos:-1);return true;}
        case 93: case 94: ret(0);return true;
        case 95: case 96: ret(0);return true; case 97: ret(0);return true;
        default:return false;
      }
    }

    function handleInterrupt(handle,intno) {
      const nr=decodeSwi(intno)>>>0; session.lastSyscall=nr; session.syscallCount++;
      const isVar=!!(nr&SYSCALL_ISVAR),isExt=!!(nr&SYSCALL_ISEXT),baseNr=nr&~SYSCALL_FLAG_MASK;
      let ok=false;
      try {
        if(isVar) ok=handleVariable(baseNr);
        else if(isExt) ok=handleExtended(baseNr);
        else ok=handleStandard(baseNr);
      } catch(error) {
        session.pendingError=Object.assign(error instanceof Error?error:new Error(String(error)),{code:error?.code||"NDLESS_SWI_ERROR",syscall:nr});
        try{e.emu_stop();}catch(_){} return;
      }
      if(!ok) unsupported(nr);
    }

    e.hook_add(uc.HOOK_INTR,handleInterrupt,{});
    writeMem(e,VAR_BASE,new Uint8Array(VAR_SIZE));
    writeMem(e,VAR_KEYPAD_TYPE,Uint8Array.of(2));
    writeMemU32(e,VAR_ERRNO,0);
    writeMemU32(e,VAR_STDIN+12,0);writeMemU32(e,VAR_STDOUT+12,0);writeMemU32(e,VAR_STDERR+12,0);

    function setupArgv(args) {
      const list=(Array.isArray(args)&&args.length?args:["/documents/program.tns"]).map(String);
      const ptrs=list.map(mallocCString); const array=allocRaw((ptrs.length+1)*4);
      ptrs.forEach((p,i)=>writeMemU32(e,array+i*4,p));writeMemU32(e,array+ptrs.length*4,0);
      return {argc:ptrs.length,argv:array,args:list};
    }

    return { allocRaw,freeRaw,reallocRaw,mallocCString,readCString:(p,m)=>readCString(e,p,m),writeCString:(p,s,c)=>writeCString(e,p,s,c),logs,fileHandles,setupArgv,get heapNext(){return heapNext;} };
  }

  function currentFramebuffer(session) {
    const candidates=[]; try{candidates.push(readMemU32(session.e,SCREEN_PTR));}catch(_){} candidates.push(FB_BASE);
    for(const ptr of candidates){if(!ptr)continue;try{const bytes=readMem(session.e,ptr,FB_BYTES);if(bytes.length===FB_BYTES)return{ptr:ptr>>>0,bytes};}catch(_){}}
    return null;
  }
  function renderSession(session) {
    const canvas=session.canvas;if(!canvas?.isConnected)return false;const frame=currentFramebuffer(session);if(!frame)return false;
    const ctx=canvas.getContext("2d");canvas.width=FB_WIDTH;canvas.height=FB_HEIGHT;ctx.imageSmoothingEnabled=false;
    if(root.NdlessFramebufferPreview?.draw)root.NdlessFramebufferPreview.draw(ctx,{bytes:frame.bytes});else{
      const image=ctx.createImageData(FB_WIDTH,FB_HEIGHT);for(let i=0;i<FB_WIDTH*FB_HEIGHT;i++){const p=i*2,w=frame.bytes[p]|(frame.bytes[p+1]<<8),q=i*4;image.data[q]=Math.round(((w>>>11)&31)*255/31);image.data[q+1]=Math.round(((w>>>5)&63)*255/63);image.data[q+2]=Math.round((w&31)*255/31);image.data[q+3]=255;}ctx.putImageData(image,0,0);
    }
    session.framebufferAddress=frame.ptr;session.frames++;return true;
  }

  async function createMachine(bytesInput,options={}) {
    const uc=await engine(),prepared=await prepareZehn(bytesInput,options.base||APP_BASE),e=new uc.Unicorn(uc.ARCH_ARM,uc.MODE_ARM);
    try{
      mapPage(e,uc,prepared.base,align(prepared.image.length));writeMem(e,prepared.base,prepared.image);
      mapPage(e,uc,STACK_BASE,STACK_SIZE);mapPage(e,uc,HEAP_BASE,HEAP_SIZE);mapPage(e,uc,VAR_BASE,VAR_SIZE);mapPage(e,uc,EXIT_ADDR,PAGE);mapHardware(e,uc);
      const session={uc,e,prepared,canvas:options.canvas||null,note:options.note||null,running:false,paused:false,stopped:false,error:null,pendingError:null,exitCode:null,startedAt:performance.now(),frames:0,instructions:0,syscallCount:0,lastSyscall:null,lastLog:"",framebufferAddress:FB_BASE,sliceInstructions:Math.max(1000,Number(options.sliceInstructions)||180000),onState:typeof options.onState==="function"?options.onState:null,inputCleanup:null,kernel:null,argvInfo:null};
      session.kernel=createKernel(session);
      const args=Array.isArray(options.args)&&options.args.length?options.args:["/documents/program.tns"];
      session.argvInfo=session.kernel.setupArgv(args);
      const stackTop=(STACK_BASE+STACK_SIZE-16)>>>0;e.reg_write_i32(uc.ARM_REG_R0,session.argvInfo.argc|0);e.reg_write_i32(uc.ARM_REG_R1,session.argvInfo.argv|0);e.reg_write_i32(uc.ARM_REG_SP,stackTop|0);e.reg_write_i32(uc.ARM_REG_LR,EXIT_ADDR|0);e.reg_write_i32(uc.ARM_REG_PC,prepared.entry|0);
      session.inputCleanup=bindInput(session);return session;
    }catch(error){try{e.close();}catch(_){}throw error;}
  }

  function stateSnapshot(session){let pc=0;try{pc=session.e.reg_read_i32(session.uc.ARM_REG_PC)>>>0;}catch(_){}return{running:session.running,paused:session.paused,stopped:session.stopped,pc,frames:session.frames,instructions:session.instructions,syscallCount:session.syscallCount,lastSyscall:session.lastSyscall,lastLog:session.lastLog,framebufferAddress:session.framebufferAddress>>>0,error:session.error?String(session.error.message||session.error):""};}
  function emit(session,message=""){const s={...stateSnapshot(session),message};try{session.onState?.(s);}catch(_){}return s;}
  function stop(session,reason="stopped"){if(!session||session.stopped)return;session.running=false;session.paused=false;session.stopped=true;if(session.raf)cancelAnimationFrame(session.raf);try{session.e.emu_stop?.();}catch(_){}try{session.inputCleanup?.();}catch(_){}emit(session,reason);try{session.e.close();}catch(_){}if(activeSession===session)activeSession=null;}
  function pause(session){if(!session||session.stopped)return;session.paused=true;session.running=false;if(session.raf)cancelAnimationFrame(session.raf);emit(session,"paused");}
  function resume(session){if(!session||session.stopped)return;session.paused=false;session.running=true;emit(session,"running");const tick=()=>{if(!session.running||session.paused||session.stopped)return;updateHardware(session);let pc=session.e.reg_read_i32(session.uc.ARM_REG_PC)>>>0;if(pc===EXIT_ADDR){session.exitCode=session.e.reg_read_i32(session.uc.ARM_REG_R0)|0;renderSession(session);stop(session,`program exited (${session.exitCode})`);return;}try{session.pendingError=null;session.e.emu_start(pc,EXIT_ADDR,0,session.sliceInstructions);session.instructions+=session.sliceInstructions;if(session.pendingError)throw session.pendingError;renderSession(session);}catch(error){session.error=error instanceof Error?error:new Error(String(error));session.running=false;renderSession(session);emit(session,"execution error");return;}emit(session,"running");session.raf=requestAnimationFrame(tick);};session.raf=requestAnimationFrame(tick);}
  async function run(bytesInput,options={}){if(activeSession)stop(activeSession,"replaced");const session=await createMachine(bytesInput,options);activeSession=session;renderSession(session);resume(session);return session;}

  function sourceText(project){return Object.entries(project?.files||{}).filter(([name])=>/\.(?:c|cpp|cc|cxx|h|hpp)$/i.test(name)).map(([,v])=>String(v||"")).join("\n");}
  function isNativeFramebufferProject(project){return!!root.NdlessFramebufferPreview?.detect?.(sourceText(project));}
  function cloneForModernBuild(project){return{...project,target:"zehn-modern",files:{...(project?.files||{})},settings:{...(project?.settings||{})}};}
  async function buildCurrentProject(onProgress){const project=root.NdlessProjectWorkspace?.getProject?.();if(!project)throw new Error("No Ndless project is open.");const bridge=root.NdlessLocalBridge;if(!bridge?.build||!bridge?.status)throw new Error("The local Ndless compiler bridge is unavailable.");const status=await bridge.status({timeoutMs:1200});if(!status?.connected||!status?.toolchainReady)throw Object.assign(new Error("TNS Tool Compiler is not ready. Open Build TNS once, or use Cargar TNS."),{code:"LIVE_ARM_COMPILER_NOT_READY"});onProgress?.("Compilando Zehn para Live ARM…");const result=await bridge.build(cloneForModernBuild(project),{status,timeoutMs:240000,onProgress:info=>onProgress?.(info?.message||info?.stage||"Compilando…")});if(!result?.bytes?.length)throw new Error("The compiler returned no TNS bytes.");lastArtifact={bytes:asBytes(result.bytes),filename:result.filename||`${project.name||"program"}.tns`,source:"build"};return lastArtifact;}

  function sanitizeName(name,fallback){const clean=String(name||fallback).split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]+/g,"_");return clean||fallback;}
  function runtimeArgs(artifact){const programName=sanitizeName(artifact?.filename,"program.tns");const programPath=`/documents/${programName}`;mountVirtualFile(programPath,artifact?.bytes||new Uint8Array(0),{writable:false});const args=[programPath];if(lastWad){mountVirtualFile(lastWad.path,lastWad.bytes,{writable:false});args.push(lastWad.path);}return args;}

  function ensureUiStyle(){if(document.getElementById("ndless-arm-runtime-v2-style"))return;const style=document.createElement("style");style.id="ndless-arm-runtime-v2-style";style.textContent=`.ndless-arm-live{margin:12px 0 2px;padding:12px;border:1px solid rgba(113,158,208,.28);border-radius:12px;background:rgba(8,19,34,.42)}.ndless-arm-live-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ndless-arm-live button{border:1px solid rgba(99,194,220,.38);border-radius:9px;background:rgba(24,76,92,.42);color:inherit;padding:8px 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.ndless-arm-live button[data-arm-stop]{border-color:rgba(255,111,111,.3);background:rgba(103,39,48,.28)}.ndless-arm-live-status{margin-top:9px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#9fb4cd;word-break:break-word}.ndless-arm-live-status strong{color:#b8ff66}.ndless-arm-live input{display:none}.ndless-arm-wad{opacity:.9}`;document.head.appendChild(style);}
  function fmtHex(value){return`0x${(Number(value)>>>0).toString(16).toUpperCase().padStart(8,"0")}`;}
  function uiStatus(box,text,good=false){const s=box?.querySelector?.("[data-arm-status]");if(s)s.innerHTML=good?`<strong>${String(text)}</strong>`:String(text);}
  async function startUiRuntime(box,artifact){const canvas=document.querySelector("[data-ndless-project-canvas]"),note=document.querySelector("[data-preview-note]");if(!canvas)throw new Error("Ndless preview canvas was not found.");uiStatus(box,"Cargando CPU ARM WebAssembly…");const smoke=await smokeTest();if(!smoke.ok)throw new Error(`ARM engine self-test failed (r0=${smoke.r0}, r2=${smoke.r2}).`);const args=runtimeArgs(artifact);uiStatus(box,`Motor ARM OK · argv=${args.map(x=>x.split('/').pop()).join(' + ')} · iniciando kernel Ndless…`,true);const session=await run(artifact.bytes,{canvas,note,args,onState:state=>{const btn=box.querySelector("[data-arm-live]");if(btn)btn.textContent=state.running?"Pausar ARM":state.paused?"Continuar ARM":"Live ARM";if(state.error){const swi=state.lastSyscall==null?"—":`0x${state.lastSyscall.toString(16).toUpperCase()}`;uiStatus(box,`ARM detenido · PC=${fmtHex(state.pc)} · SWI=${swi} · ${state.error}`);if(note)note.textContent=`Live ARM stopped at ${fmtHex(state.pc)}: ${state.error}`;}else if(state.running){uiStatus(box,`ARM ejecutando · PC=${fmtHex(state.pc)} · frames=${state.frames} · SWI=${state.syscallCount} · framebuffer=${fmtHex(state.framebufferAddress)}`,true);if(note)note.textContent=`Live ARM experimental · ${lastWad?`IWAD: ${lastWad.name} · `:""}teclado y framebuffer RGB565 activos.`;}else if(state.stopped)uiStatus(box,`ARM finalizado · PC=${fmtHex(state.pc)} · frames=${state.frames}`);}});return session;}

  function mountUi(){if(typeof document==="undefined")return;ensureUiStyle();const project=root.NdlessProjectWorkspace?.getProject?.(),canvas=document.querySelector("[data-ndless-project-canvas]"),note=document.querySelector("[data-preview-note]");if(!project||!canvas||!note||!isNativeFramebufferProject(project))return;const parent=note.parentElement||canvas.parentElement;if(!parent||parent.querySelector(`[data-arm-ui="${UI_MARK}"]`))return;parent.querySelector('[data-arm-ui="__tnsNdlessArmUiV1"]')?.remove();const box=document.createElement("div");box.className="ndless-arm-live";box.dataset.armUi=UI_MARK;box.innerHTML=`<div class="ndless-arm-live-row"><button type="button" data-arm-live>Live ARM</button><button type="button" data-arm-load>Cargar TNS</button><button type="button" data-arm-wad>Cargar WAD</button><button type="button" data-arm-stop hidden>Detener</button><input type="file" accept=".tns,application/octet-stream" data-arm-file><input type="file" accept=".wad,.tns,application/octet-stream" data-arm-wad-file></div><div class="ndless-arm-live-status" data-arm-status>CPU ARM + kernel Ndless experimental. Para nDoom carga tu propio IWAD con <strong>Cargar WAD</strong> y luego pulsa <strong>Live ARM</strong>.</div>`;note.insertAdjacentElement("afterend",box);const live=box.querySelector("[data-arm-live]"),load=box.querySelector("[data-arm-load]"),wad=box.querySelector("[data-arm-wad]"),stopBtn=box.querySelector("[data-arm-stop]"),input=box.querySelector("[data-arm-file]"),wadInput=box.querySelector("[data-arm-wad-file]");
    live.addEventListener("click",async()=>{try{if(activeSession?.running){pause(activeSession);stopBtn.hidden=false;return;}if(activeSession?.paused){resume(activeSession);stopBtn.hidden=false;return;}let artifact=lastArtifact;if(!artifact)artifact=await buildCurrentProject(text=>uiStatus(box,text));stopBtn.hidden=false;await startUiRuntime(box,artifact);}catch(error){uiStatus(box,`${error.message||error} Puedes usar “Cargar TNS” si este navegador no tiene acceso al compilador local.`);}});
    load.addEventListener("click",()=>input.click());input.addEventListener("change",async()=>{const file=input.files?.[0];if(!file)return;try{const artifact={bytes:new Uint8Array(await file.arrayBuffer()),filename:file.name,source:"upload"};await prepareZehn(artifact.bytes);lastArtifact=artifact;stopBtn.hidden=false;await startUiRuntime(box,artifact);}catch(error){uiStatus(box,`No se pudo iniciar ${file.name}: ${error.message||error}`);}finally{input.value="";}});
    wad.addEventListener("click",()=>wadInput.click());wadInput.addEventListener("change",async()=>{const file=wadInput.files?.[0];if(!file)return;try{const bytes=new Uint8Array(await file.arrayBuffer()),name=sanitizeName(file.name,"doom.wad"),path=`/documents/${name.replace(/\.tns$/i,"")}`;lastWad={name,path,bytes};mountVirtualFile(path,bytes,{writable:false});if(activeSession)stop(activeSession,"WAD changed");stopBtn.hidden=true;live.textContent="Live ARM";uiStatus(box,`IWAD cargado: <strong>${name}</strong> (${Math.max(1,Math.round(bytes.length/1024))} KB). Pulsa Live ARM para arrancar nDoom con ese archivo.`,true);}catch(error){uiStatus(box,`No se pudo cargar el WAD: ${error.message||error}`);}finally{wadInput.value="";}});
    stopBtn.addEventListener("click",()=>{if(activeSession)stop(activeSession,"user stop");stopBtn.hidden=true;live.textContent="Live ARM";uiStatus(box,"Live ARM detenido.");});
  }

  if(typeof document!=="undefined"){let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mountUi();});};new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener("click",event=>{if(event.target?.closest?.("[data-project-tab], [data-project-refresh]"))setTimeout(schedule,20);},true);schedule();}

  root.NdlessArmRuntime=Object.freeze({version:2,ENGINE_JS,ENGINE_WASM,APP_BASE,STACK_BASE,STACK_SIZE,FB_BASE,FB_WIDTH,FB_HEIGHT,FB_BYTES,HEAP_BASE,HEAP_SIZE,VAR_BASE,EXIT_ADDR,SYSCALL_ISEXT,SYSCALL_ISEMU,SYSCALL_ISVAR,KEYMAP,align,u16,u32,w16,w32,relocateImage,prepareZehn,engine,smokeTest,createMachine,run,pause,resume,stop,mountVirtualFile,getVirtualFile,listVirtualFiles,normalizePath,get activeSession(){return activeSession;},get lastArtifact(){return lastArtifact;},get lastWad(){return lastWad;},mountUi});
})();
