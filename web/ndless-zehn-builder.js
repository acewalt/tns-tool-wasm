(() => {
  "use strict";

  const SIGNATURE = 0x6e68655a;
  const VERSION = 1;
  const HEADER_SIZE = 32;
  const MAX24 = 0x00ffffff;
  const REL = Object.freeze({ ADD_BASE:0, ADD_BASE_GOT:1, SET_ZERO:2, FILE_COMPRESSED:3, UNALIGNED_RELOC:4 });
  const FLAG = Object.freeze({ NDLESS_VERSION_MIN:0, NDLESS_VERSION_MAX:1, NDLESS_REVISION_MIN:2, NDLESS_REVISION_MAX:3, RUNS_ON_COLOR:4, RUNS_ON_CLICKPAD:5, RUNS_ON_TOUCHPAD:6, RUNS_ON_32MB:7, EXECUTABLE_NAME:8, EXECUTABLE_AUTHOR:9, EXECUTABLE_VERSION:10, EXECUTABLE_NOTICE:11, RUNS_ON_HWW:12, USES_LCD_BLIT:13 });

  const elfApi = () => globalThis.NdlessElf32;
  const align4 = n => (n + 3) & ~3;

  function packed(type, data) {
    if (!Number.isInteger(data) || data < 0 || data > MAX24) throw new Error(`Zehn entry data 0x${Number(data).toString(16)} exceeds 24 bits.`);
    return ((data << 8) | (type & 0xff)) >>> 0;
  }

  function appendString(extra, value) {
    const encoded = new TextEncoder().encode(String(value ?? ""));
    const offset = extra.length;
    for (const byte of encoded) extra.push(byte);
    extra.push(0);
    return offset;
  }

  async function deflate(bytes) {
    if (typeof CompressionStream !== "function") throw new Error("CompressionStream is unavailable; build without Zehn compression.");
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function readU32LE(bytes, offset) {
    if (offset < 0 || offset + 4 > bytes.length) throw new Error(`Relocation target 0x${offset.toString(16)} is outside executable image.`);
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
  }

  async function buildFromElf(elfInput, options = {}) {
    const elf = elfApi()?.parse?.(elfInput);
    if (!elf) throw new Error("NdlessElf32 parser is unavailable.");
    const C = elf.constants;
    const alloc = [...elf.allocSections].sort((a,b) => a.address - b.address || a.index - b.index);
    if (!alloc.length) throw new Error("ELF has no SHF_ALLOC sections.");

    let storedEnd = 0;
    let memoryEnd = 0;
    let previousEnd = 0;
    for (const section of alloc) {
      const end = section.address + section.size;
      if (section.address < previousEnd && section.size) throw new Error(`Alloc section ${section.name || section.index} overlaps a previous section.`);
      previousEnd = Math.max(previousEnd, end);
      memoryEnd = Math.max(memoryEnd, end);
      if (section.type !== C.SHT_NOBITS) storedEnd = Math.max(storedEnd, end);
    }
    if (!storedEnd) throw new Error("ELF has no stored allocatable executable data.");
    if (storedEnd > MAX24) throw new Error("Executable image exceeds Zehn's 24-bit relocation address space.");

    const exec = new Uint8Array(storedEnd);
    for (const section of alloc) {
      if (section.type === C.SHT_NOBITS || !section.size) continue;
      exec.set(section.data, section.address);
    }

    const undefinedByTable = new Map();
    for (const [tableIndex, symbols] of elf.symbolTables.entries()) {
      const set = new Set();
      for (const symbol of symbols) {
        if (symbol.sectionIndex !== C.SHN_UNDEF) continue;
        if (symbol.bind !== C.STB_WEAK && symbol.type !== C.STT_NOTYPE) {
          throw new Error(`Undefined non-weak ELF symbol: ${symbol.name || `#${symbol.index}`}`);
        }
        set.add(symbol.index);
      }
      undefinedByTable.set(tableIndex, set);
    }

    const got = elf.sectionByName(".got");
    let gotAddress = 0;
    const relocEntries = [];
    if (got) {
      gotAddress = got.address >>> 0;
      if (got.address & 3) throw new Error(".got is not 4-byte aligned.");
      if (got.size < 4 || readU32LE(exec, got.address + got.size - 4) !== 0xffffffff) throw new Error(".got does not end in 0xFFFFFFFF as required by Zehn.");
      relocEntries.push({ type: REL.ADD_BASE_GOT, data: gotAddress });
    }

    const undoRelocs = new Set();
    let unalignedMarker = false;
    for (const section of elf.sections) {
      if (section.type !== C.SHT_REL) continue;
      const relocated = elf.sections[section.info] || section.relocations?.[0]?.relocatedSection || null;
      if (!relocated || (relocated.flags & C.SHF_ALLOC) === 0) continue;
      const undefined = undefinedByTable.get(section.link) || new Set();
      for (const entry of section.relocations || []) {
        if (undefined.has(entry.symbolIndex)) {
          if (entry.type === 26 && got) {
            const gotEntryOffset = readU32LE(exec, entry.offset);
            const target = (gotAddress + gotEntryOffset) >>> 0;
            if (target <= MAX24) undoRelocs.add(target);
          }
          continue;
        }
        if (entry.type !== 2 && entry.type !== 38) continue;
        if (entry.offset > MAX24) throw new Error(`Relocation 0x${entry.offset.toString(16)} exceeds Zehn range.`);
        if ((entry.offset & 3) && !unalignedMarker) {
          relocEntries.push({ type: REL.UNALIGNED_RELOC, data: 0 });
          unalignedMarker = true;
        }
        relocEntries.push({ type: REL.ADD_BASE, data: entry.offset >>> 0 });
      }
    }
    for (const offset of undoRelocs) relocEntries.push({ type: REL.SET_ZERO, data: offset });

    const extra = [];
    const flags = [];
    const addNumberFlag = (type, value) => { if (value != null) flags.push({ type, data: Number(value) >>> 0 }); };
    const addBoolFlag = (type, value) => flags.push({ type, data: value === false ? 0 : 1 });
    const addStringFlag = (type, value) => { if (value != null && String(value).length) flags.push({ type, data: appendString(extra, value) }); };
    addStringFlag(FLAG.EXECUTABLE_NAME, options.name);
    addStringFlag(FLAG.EXECUTABLE_AUTHOR, options.author);
    addNumberFlag(FLAG.EXECUTABLE_VERSION, options.version ?? 1);
    addStringFlag(FLAG.EXECUTABLE_NOTICE, options.notice);
    addNumberFlag(FLAG.NDLESS_VERSION_MIN, options.ndlessMin);
    addNumberFlag(FLAG.NDLESS_REVISION_MIN, options.ndlessRevisionMin);
    addNumberFlag(FLAG.NDLESS_VERSION_MAX, options.ndlessMax);
    addNumberFlag(FLAG.NDLESS_REVISION_MAX, options.ndlessRevisionMax);
    addBoolFlag(FLAG.RUNS_ON_COLOR, options.runsOnColor);
    addBoolFlag(FLAG.RUNS_ON_CLICKPAD, options.runsOnClickpad);
    addBoolFlag(FLAG.RUNS_ON_TOUCHPAD, options.runsOnTouchpad);
    addBoolFlag(FLAG.RUNS_ON_32MB, options.runsOn32MB);

    const hasNewLcdMarker = elf.symbolByName.has("_genzehn_new_lcd_api") || elf.symbolByName.has("genzehn_new_lcd_api");
    const hasOldLcdMarker = elf.symbolByName.has("_genzehn_old_lcd_api") || elf.symbolByName.has("genzehn_old_lcd_api");
    const usesLcdBlit = options.usesLcdBlit != null ? !!options.usesLcdBlit : (hasNewLcdMarker && !hasOldLcdMarker);
    const runsOnHww = options.runsOnHww != null ? !!options.runsOnHww : usesLcdBlit;
    addBoolFlag(FLAG.RUNS_ON_HWW, runsOnHww);
    addBoolFlag(FLAG.USES_LCD_BLIT, usesLcdBlit);

    while (extra.length & 3) extra.push(0);
    const extraBytes = Uint8Array.from(extra);
    const compress = !!options.compress;
    let storedExec = exec;
    if (compress) {
      storedExec = await deflate(exec);
      relocEntries.unshift({ type: REL.FILE_COMPRESSED, data: 0 });
    }

    const metaSize = HEADER_SIZE + (relocEntries.length + flags.length) * 4 + extraBytes.length;
    const fileSize = metaSize + storedExec.length;
    const bssTail = Math.max(0, memoryEnd - storedEnd);
    const allocSize = metaSize + exec.length + bssTail;
    if (elf.header.entry > MAX24 || elf.header.entry >= memoryEnd) throw new Error(`ELF entry point 0x${elf.header.entry.toString(16)} is outside the executable image.`);
    if (fileSize > 0xffffffff || allocSize > 0xffffffff) throw new Error("Zehn image is too large.");

    const out = new Uint8Array(fileSize);
    const view = new DataView(out.buffer);
    view.setUint32(0, SIGNATURE, true);
    view.setUint32(4, VERSION, true);
    view.setUint32(8, fileSize >>> 0, true);
    view.setUint32(12, relocEntries.length >>> 0, true);
    view.setUint32(16, flags.length >>> 0, true);
    view.setUint32(20, extraBytes.length >>> 0, true);
    view.setUint32(24, allocSize >>> 0, true);
    view.setUint32(28, elf.header.entry >>> 0, true);
    let p = HEADER_SIZE;
    for (const item of relocEntries) { view.setUint32(p, packed(item.type, item.data), true); p += 4; }
    for (const item of flags) { view.setUint32(p, packed(item.type, item.data), true); p += 4; }
    out.set(extraBytes, p); p += extraBytes.length;
    out.set(storedExec, p);

    const parsed = globalThis.NdlessZehn?.findZehn?.(out) || null;
    if (globalThis.NdlessZehn && !parsed?.valid) throw new Error(`Generated Zehn failed parser validation${parsed?.reason ? `: ${parsed.reason}` : "."}`);
    return {
      bytes: out,
      parsed,
      elf,
      stats: { storedExecutableSize: storedExec.length, executableSize: exec.length, bssSize: bssTail, relocations: relocEntries.length, flags: flags.length, fileSize, allocSize },
    };
  }

  const api = Object.freeze({ buildFromElf, constants: Object.freeze({ SIGNATURE, VERSION, HEADER_SIZE, REL, FLAG }) });
  if (typeof window !== "undefined") window.NdlessZehnBuilder = api;
  if (typeof globalThis !== "undefined") globalThis.NdlessZehnBuilder = api;
})();
