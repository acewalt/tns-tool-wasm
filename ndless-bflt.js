(() => {
  "use strict";

  const HEADER_SIZE = 64;
  const FLAT_VERSION = 4;
  const FLAGS = Object.freeze({ RAM: 0x0001, GOTPIC: 0x0002, GZIP: 0x0004, GZDATA: 0x0008, KTRACE: 0x0010, L1STK: 0x0020 });
  const MAGIC = [0x62, 0x46, 0x4c, 0x54];
  const asBytes = (input) => input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const isMagic = (b) => b.length >= 4 && MAGIC.every((v, i) => b[i] === v);

  function parseHeader(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (!isMagic(bytes) || bytes.length < HEADER_SIZE) return null;
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const get = (o) => v.getUint32(o, false);
    return {
      magic: "bFLT", rev: get(4), entry: get(8), dataStart: get(12), dataEnd: get(16), bssEnd: get(20),
      stackSize: get(24), relocStart: get(28), relocCount: get(32), flags: get(36), buildDate: get(40),
      filler: [get(44), get(48), get(52), get(56), get(60)],
    };
  }

  function compressionName(flags) {
    if ((flags & FLAGS.GZIP) && (flags & FLAGS.GZDATA)) return "invalid (GZIP + GZDATA)";
    if (flags & FLAGS.GZIP) return "GZIP";
    if (flags & FLAGS.GZDATA) return "GZDATA";
    return "None";
  }

  function validateHeader(header, physicalLength, bytes) {
    const errors = [];
    if (!header) return ["missing-header"];
    if (header.rev !== FLAT_VERSION) errors.push("unsupported-revision");
    if ((header.flags & FLAGS.GZIP) && (header.flags & FLAGS.GZDATA)) errors.push("conflicting-compression-flags");
    if (header.entry < HEADER_SIZE || header.entry >= header.dataStart) errors.push("entry-out-of-text-range");
    if (!(HEADER_SIZE <= header.dataStart && header.dataStart <= header.dataEnd && header.dataEnd <= header.bssEnd)) errors.push("non-monotonic-segments");
    if (!(header.dataEnd <= header.relocStart)) errors.push("relocation-before-data-end");
    if (header.relocCount > 0x01000000) errors.push("relocation-count-absurd");
    const logicalRelocEnd = header.relocStart + header.relocCount * 4;
    if (!Number.isSafeInteger(logicalRelocEnd) || logicalRelocEnd > 0xffffffff) errors.push("relocation-range-overflow");
    if (header.stackSize > 0x40000000) errors.push("stack-size-absurd");
    if (header.dataStart > 0x7fffffff || header.bssEnd > 0x7fffffff || header.relocStart > 0x7fffffff) errors.push("offset-absurd");
    const compressed = Boolean(header.flags & (FLAGS.GZIP | FLAGS.GZDATA));
    if (!compressed && logicalRelocEnd > physicalLength) errors.push("relocation-table-truncated");
    if (!compressed && header.dataEnd > physicalLength) errors.push("data-truncated");
    if (header.flags & FLAGS.GZIP) {
      if (physicalLength <= HEADER_SIZE + 2 || bytes[HEADER_SIZE] !== 0x1f || bytes[HEADER_SIZE + 1] !== 0x8b) errors.push("missing-gzip-stream");
    }
    if (header.flags & FLAGS.GZDATA) {
      if (header.dataStart + 2 >= physicalLength || bytes[header.dataStart] !== 0x1f || bytes[header.dataStart + 1] !== 0x8b) errors.push("missing-gzdata-stream");
      if (header.dataStart > physicalLength) errors.push("text-truncated");
    }
    return errors;
  }

  function parse(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (!isMagic(bytes)) return null;
    const header = parseHeader(bytes);
    if (!header) return { valid: false, malformed: true, family: "ndless", format: "bflt", reason: "truncated-header" };
    const errors = validateHeader(header, bytes.length, bytes);
    if (errors.length) return { valid: false, malformed: true, family: "ndless", format: "bflt", header, errors, reason: errors[0] };
    const compressed = Boolean(header.flags & (FLAGS.GZIP | FLAGS.GZDATA));
    return {
      valid: true, family: "ndless", format: "bflt", formatLabel: `bFLT v${header.rev}`, typeLabel: "Ndless", architecture: "ARM",
      header, compressed, compression: compressionName(header.flags),
      entry: { kind: "flat-runtime", containerOffset: header.entry, runtimeAddress: header.entry, fileOffset: compressed && (header.flags & FLAGS.GZIP) ? null : header.entry },
      layout: { headerStart: 0, headerEnd: HEADER_SIZE, textStart: HEADER_SIZE, textEnd: header.dataStart, dataStart: header.dataStart, dataEnd: header.dataEnd, bssEnd: header.bssEnd, relocStart: header.relocStart, relocEnd: header.relocStart + header.relocCount * 4 },
    };
  }

  async function streamTransform(bytes, mode) {
    const Ctor = mode === "decompress" ? globalThis.DecompressionStream : globalThis.CompressionStream;
    if (typeof Ctor !== "function") throw new Error(`${mode === "decompress" ? "DecompressionStream" : "CompressionStream"} is not available.`);
    const stream = new Blob([bytes]).stream().pipeThrough(new Ctor("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function logicalImage(bytesInput, parsedInput) {
    const bytes = asBytes(bytesInput);
    const parsed = parsedInput?.format === "bflt" ? parsedInput : parse(bytes);
    if (!parsed?.valid) throw new Error("Invalid bFLT container.");
    const h = parsed.header;
    if (!parsed.compressed) return new Uint8Array(bytes);
    if (h.flags & FLAGS.GZIP) {
      const body = await streamTransform(bytes.subarray(HEADER_SIZE), "decompress");
      const out = new Uint8Array(HEADER_SIZE + body.length);
      out.set(bytes.subarray(0, HEADER_SIZE)); out.set(body, HEADER_SIZE);
      return out;
    }
    const body = await streamTransform(bytes.subarray(h.dataStart), "decompress");
    const out = new Uint8Array(h.dataStart + body.length);
    out.set(bytes.subarray(0, h.dataStart)); out.set(body, h.dataStart);
    return out;
  }

  function parseRelocations(logicalBytesInput, parsed) {
    const logical = asBytes(logicalBytesInput);
    if (!parsed?.valid) return [];
    const h = parsed.header;
    const end = h.relocStart + h.relocCount * 4;
    if (end > logical.length) throw new Error("bFLT relocation table is outside the logical image.");
    const v = new DataView(logical.buffer, logical.byteOffset, logical.byteLength);
    const relocs = [];
    for (let i = 0; i < h.relocCount; i += 1) {
      const address = v.getUint32(h.relocStart + i * 4, false);
      const region = address < h.dataStart ? ".text" : address < h.dataEnd ? ".data" : address < h.bssEnd ? ".bss" : "outside-known-regions";
      relocs.push({ index: i, address, containerOffset: address, runtimeAddress: address, region });
    }
    return relocs;
  }

  async function enrich(bytesInput, parsedInput) {
    const bytes = asBytes(bytesInput);
    const parsed = parsedInput?.format === "bflt" ? parsedInput : parse(bytes);
    if (!parsed?.valid) return parsed;
    const logical = await logicalImage(bytes, parsed);
    const expectedMin = parsed.header.relocStart + parsed.header.relocCount * 4;
    if (logical.length < expectedMin) throw new Error("Inflated bFLT image is shorter than its relocation table.");
    const relocs = parseRelocations(logical, parsed);
    return { ...parsed, logicalBytes: logical, relocs, logicalSize: logical.length };
  }

  async function rebuild(bytesInput, parsedInput, workingLogical) {
    const bytes = asBytes(bytesInput);
    const parsed = parsedInput?.format === "bflt" ? parsedInput : parse(bytes);
    if (!parsed?.valid) throw new Error("Invalid bFLT container.");
    const originalLogical = await logicalImage(bytes, parsed);
    const logical = asBytes(workingLogical);
    if (logical.length !== originalLogical.length) throw new Error("Structural bFLT resizing is not enabled; same-size patches only.");
    if (!isMagic(logical) || new DataView(logical.buffer, logical.byteOffset, logical.byteLength).getUint32(4, false) !== FLAT_VERSION) throw new Error("Working bFLT header is invalid.");
    const h = parsed.header;
    let rebuilt;
    if (!parsed.compressed) rebuilt = new Uint8Array(logical);
    else if (h.flags & FLAGS.GZIP) {
      const gz = await streamTransform(logical.subarray(HEADER_SIZE), "compress");
      rebuilt = new Uint8Array(HEADER_SIZE + gz.length);
      rebuilt.set(logical.subarray(0, HEADER_SIZE)); rebuilt.set(gz, HEADER_SIZE);
    } else {
      const gz = await streamTransform(logical.subarray(h.dataStart), "compress");
      rebuilt = new Uint8Array(h.dataStart + gz.length);
      rebuilt.set(logical.subarray(0, h.dataStart)); rebuilt.set(gz, h.dataStart);
    }
    const reparsed = parse(rebuilt);
    if (!reparsed?.valid) throw new Error("Rebuilt bFLT failed header validation.");
    const round = await logicalImage(rebuilt, reparsed);
    if (round.length !== logical.length || round.some((v, i) => v !== logical[i])) throw new Error("bFLT compression round-trip validation failed.");
    return { bytes: rebuilt, parsed: await enrich(rebuilt, reparsed) };
  }

  function flagNames(flags) {
    const names = [];
    for (const [name, bit] of Object.entries(FLAGS)) if (flags & bit) names.push(`FLAT_FLAG_${name}`);
    return names;
  }

  function memoryMap(parsed) {
    if (!parsed?.valid) return [];
    const h = parsed.header;
    const rows = [
      { name: "bFLT header", domain: "stored", fileStart: 0, fileEnd: HEADER_SIZE },
      { name: ".text", domain: "runtime", runtimeStart: HEADER_SIZE, runtimeEnd: h.dataStart },
      { name: ".data", domain: "runtime", runtimeStart: h.dataStart, runtimeEnd: h.dataEnd },
      { name: ".bss", domain: "runtime", runtimeStart: h.dataEnd, runtimeEnd: h.bssEnd },
      { name: "stack", domain: "runtime", size: h.stackSize },
    ];
    if (h.relocCount) rows.push({ name: "relocations", domain: "runtime", runtimeStart: h.relocStart, runtimeEnd: h.relocStart + h.relocCount * 4 });
    if (!parsed.compressed) {
      rows.push({ name: ".text stored", domain: "stored", fileStart: HEADER_SIZE, fileEnd: h.dataStart });
      rows.push({ name: ".data stored", domain: "stored", fileStart: h.dataStart, fileEnd: h.dataEnd });
      if (h.relocCount) rows.push({ name: "relocations stored", domain: "stored", fileStart: h.relocStart, fileEnd: h.relocStart + h.relocCount * 4 });
    } else if (h.flags & FLAGS.GZIP) rows.push({ name: "gzip stream (.text + data + relocs)", domain: "stored", fileStart: HEADER_SIZE, fileEnd: null });
    else rows.push({ name: "stored .text", domain: "stored", fileStart: HEADER_SIZE, fileEnd: h.dataStart }, { name: "gzip stream (.data + relocs)", domain: "stored", fileStart: h.dataStart, fileEnd: null });
    return rows;
  }

  window.NdlessBflt = Object.freeze({ HEADER_SIZE, FLAT_VERSION, FLAGS, parseHeader, parse, enrich, logicalImage, parseRelocations, rebuild, memoryMap, flagNames, compressionName });
})();
