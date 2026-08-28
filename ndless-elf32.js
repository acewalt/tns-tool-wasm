(() => {
  "use strict";

  const ELF_MAGIC = 0x464c457f;
  const ELFCLASS32 = 1;
  const ELFDATA2LSB = 1;
  const EM_ARM = 40;
  const SHT_NOBITS = 8;
  const SHT_REL = 9;
  const SHT_SYMTAB = 2;
  const SHF_ALLOC = 0x2;
  const SHN_UNDEF = 0;
  const STB_WEAK = 2;
  const STT_NOTYPE = 0;

  const asBytes = input => input instanceof Uint8Array ? input : new Uint8Array(input || 0);

  function cstring(bytes, start) {
    if (!Number.isInteger(start) || start < 0 || start >= bytes.length) return "";
    let end = start;
    while (end < bytes.length && bytes[end]) end += 1;
    try { return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(start, end)); }
    catch (_) { return ""; }
  }

  function parse(input) {
    const bytes = asBytes(input);
    if (bytes.length < 52) throw new Error("ELF file is too small.");
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (v.getUint32(0, true) !== ELF_MAGIC) throw new Error("Not an ELF file.");
    if (bytes[4] !== ELFCLASS32) throw new Error("Only ELF32 is supported.");
    if (bytes[5] !== ELFDATA2LSB) throw new Error("Only little-endian ELF is supported.");

    const header = {
      type: v.getUint16(16, true),
      machine: v.getUint16(18, true),
      version: v.getUint32(20, true),
      entry: v.getUint32(24, true),
      phoff: v.getUint32(28, true),
      shoff: v.getUint32(32, true),
      flags: v.getUint32(36, true),
      ehsize: v.getUint16(40, true),
      phentsize: v.getUint16(42, true),
      phnum: v.getUint16(44, true),
      shentsize: v.getUint16(46, true),
      shnum: v.getUint16(48, true),
      shstrndx: v.getUint16(50, true),
    };
    if (header.machine !== EM_ARM) throw new Error(`ELF machine ${header.machine} is not ARM.`);
    if (!header.shoff || header.shentsize < 40 || header.shoff + header.shentsize * header.shnum > bytes.length) {
      throw new Error("ELF section table is invalid or truncated.");
    }

    const sections = [];
    for (let i = 0; i < header.shnum; i += 1) {
      const o = header.shoff + i * header.shentsize;
      const section = {
        index: i,
        nameOffset: v.getUint32(o, true),
        type: v.getUint32(o + 4, true),
        flags: v.getUint32(o + 8, true),
        address: v.getUint32(o + 12, true),
        offset: v.getUint32(o + 16, true),
        size: v.getUint32(o + 20, true),
        link: v.getUint32(o + 24, true),
        info: v.getUint32(o + 28, true),
        align: v.getUint32(o + 32, true),
        entrySize: v.getUint32(o + 36, true),
      };
      if (section.type !== SHT_NOBITS && section.size && section.offset + section.size > bytes.length) {
        throw new Error(`ELF section #${i} is truncated.`);
      }
      sections.push(section);
    }

    const shstr = sections[header.shstrndx];
    const shstrBytes = shstr && shstr.type !== SHT_NOBITS ? bytes.subarray(shstr.offset, shstr.offset + shstr.size) : new Uint8Array();
    for (const section of sections) {
      section.name = cstring(shstrBytes, section.nameOffset);
      section.data = section.type === SHT_NOBITS ? new Uint8Array() : bytes.subarray(section.offset, section.offset + section.size);
    }

    const symbolTables = new Map();
    for (const section of sections) {
      if (section.type !== SHT_SYMTAB) continue;
      const strtab = sections[section.link];
      const strBytes = strtab && strtab.type !== SHT_NOBITS ? strtab.data : new Uint8Array();
      const entrySize = section.entrySize || 16;
      if (entrySize < 16) continue;
      const symbols = [];
      for (let o = 0, index = 0; o + 16 <= section.size; o += entrySize, index += 1) {
        const base = section.offset + o;
        const info = bytes[base + 12];
        symbols.push({
          index,
          nameOffset: v.getUint32(base, true),
          name: cstring(strBytes, v.getUint32(base, true)),
          value: v.getUint32(base + 4, true),
          size: v.getUint32(base + 8, true),
          bind: info >>> 4,
          type: info & 0x0f,
          other: bytes[base + 13],
          sectionIndex: v.getUint16(base + 14, true),
        });
      }
      symbolTables.set(section.index, symbols);
      section.symbols = symbols;
    }

    const relocations = [];
    for (const section of sections) {
      if (section.type !== SHT_REL) continue;
      const entrySize = section.entrySize || 8;
      if (entrySize < 8) continue;
      const symbols = symbolTables.get(section.link) || [];
      const relocatedSection = sections[section.info] || null;
      const entries = [];
      for (let o = 0, index = 0; o + 8 <= section.size; o += entrySize, index += 1) {
        const base = section.offset + o;
        const offset = v.getUint32(base, true);
        const info = v.getUint32(base + 4, true);
        const symbolIndex = info >>> 8;
        const type = info & 0xff;
        const item = { index, offset, info, symbolIndex, type, symbol: symbols[symbolIndex] || null, section, relocatedSection };
        entries.push(item);
        relocations.push(item);
      }
      section.relocations = entries;
    }

    const allocSections = sections.filter(section => (section.flags & SHF_ALLOC) !== 0);
    const symbolByName = new Map();
    for (const symbols of symbolTables.values()) {
      for (const symbol of symbols) if (symbol.name && !symbolByName.has(symbol.name)) symbolByName.set(symbol.name, symbol);
    }

    return {
      bytes,
      header,
      sections,
      allocSections,
      symbolTables,
      symbolByName,
      relocations,
      constants: { EM_ARM, SHT_NOBITS, SHT_REL, SHT_SYMTAB, SHF_ALLOC, SHN_UNDEF, STB_WEAK, STT_NOTYPE },
      sectionByName(name) { return sections.find(section => section.name === name) || null; },
    };
  }

  const api = Object.freeze({
    parse,
    constants: Object.freeze({ ELF_MAGIC, ELFCLASS32, ELFDATA2LSB, EM_ARM, SHT_NOBITS, SHT_REL, SHT_SYMTAB, SHF_ALLOC, SHN_UNDEF, STB_WEAK, STT_NOTYPE }),
  });
  if (typeof window !== "undefined") window.NdlessElf32 = api;
  if (typeof globalThis !== "undefined") globalThis.NdlessElf32 = api;
})();
