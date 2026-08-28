(() => {
  "use strict";

  const ZEHN_SIGNATURE = 0x6e68655a;
  const ZEHN_VERSION = 1;
  const HEADER_SIZE = 32;
  const ENTRY_SIZE = 4;
  const SEARCH_LIMIT = 20480;
  const MAX_TABLE_ENTRIES = 100000;

  const FLAG_NAMES = [
    "NDLESS_VERSION_MIN", "NDLESS_VERSION_MAX", "NDLESS_REVISION_MIN",
    "NDLESS_REVISION_MAX", "RUNS_ON_COLOR", "RUNS_ON_CLICKPAD",
    "RUNS_ON_TOUCHPAD", "RUNS_ON_32MB", "EXECUTABLE_NAME",
    "EXECUTABLE_AUTHOR", "EXECUTABLE_VERSION", "EXECUTABLE_NOTICE",
    "RUNS_ON_HWW", "USES_LCD_BLIT",
  ];
  const RELOC_NAMES = ["ADD_BASE", "ADD_BASE_GOT", "SET_ZERO", "FILE_COMPRESSED", "UNALIGNED_RELOC"];

  const asBytes = (input) => input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const u32 = (view, offset) => view.getUint32(offset, true);
  const hex = (n, width = 8) => `0x${(Number(n) >>> 0).toString(16).toUpperCase().padStart(width, "0")}`;

  function readCString(bytes, start, end) {
    if (!Number.isInteger(start) || start < 0 || start >= end || end > bytes.length) return null;
    let p = start;
    while (p < end && bytes[p] !== 0) p += 1;
    try { return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(start, p)); }
    catch (_) { return null; }
  }

  function packedEntry(view, offset) {
    const raw = u32(view, offset) >>> 0;
    return { raw, type: raw & 0xff, data: raw >>> 8 };
  }

  function headerCandidate(view, bytesLength, offset) {
    if (offset < 0 || offset + HEADER_SIZE > bytesLength) return null;
    if (u32(view, offset) !== ZEHN_SIGNATURE || u32(view, offset + 4) !== ZEHN_VERSION) return null;
    const header = {
      offset,
      signature: ZEHN_SIGNATURE,
      version: ZEHN_VERSION,
      fileSize: u32(view, offset + 8),
      relocCount: u32(view, offset + 12),
      flagCount: u32(view, offset + 16),
      extraSize: u32(view, offset + 20),
      allocSize: u32(view, offset + 24),
      entryOffset: u32(view, offset + 28),
    };
    const tableBytes = (header.relocCount + header.flagCount) * ENTRY_SIZE;
    const metaSize = HEADER_SIZE + tableBytes + header.extraSize;
    const plausibleCounts = header.relocCount <= MAX_TABLE_ENTRIES && header.flagCount <= MAX_TABLE_ENTRIES;
    const plausibleSizes = header.fileSize >= HEADER_SIZE && header.fileSize >= metaSize && header.allocSize >= metaSize;
    return { header, metaSize, plausibleCounts, plausibleSizes };
  }

  function parseAt(bytesInput, offset) {
    const bytes = asBytes(bytesInput);
    if (bytes.length < HEADER_SIZE || offset + HEADER_SIZE > bytes.length) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const candidate = headerCandidate(view, bytes.length, offset);
    if (!candidate) return null;
    const { header, metaSize, plausibleCounts, plausibleSizes } = candidate;
    if (!plausibleCounts || !plausibleSizes) return { valid: false, malformed: true, format: "zehn", family: "ndless", header, reason: "implausible-header" };

    const end = offset + header.fileSize;
    if (end > bytes.length) return { valid: false, malformed: true, format: "zehn", family: "ndless", header, reason: "truncated-container" };

    const relocStart = offset + HEADER_SIZE;
    const flagStart = relocStart + header.relocCount * ENTRY_SIZE;
    const extraStart = flagStart + header.flagCount * ENTRY_SIZE;
    const extraEnd = extraStart + header.extraSize;
    const execStart = extraEnd;
    if (extraEnd > end) return { valid: false, malformed: true, format: "zehn", family: "ndless", header, reason: "metadata-out-of-range" };

    const relocs = [];
    for (let i = 0; i < header.relocCount; i += 1) {
      const item = packedEntry(view, relocStart + i * ENTRY_SIZE);
      relocs.push({ ...item, index: i, name: RELOC_NAMES[item.type] || `UNKNOWN_${item.type}` });
    }
    const flags = [];
    for (let i = 0; i < header.flagCount; i += 1) {
      const item = packedEntry(view, flagStart + i * ENTRY_SIZE);
      const name = FLAG_NAMES[item.type] || `UNKNOWN_${item.type}`;
      let value = item.data;
      if ([8, 9, 11].includes(item.type)) value = readCString(bytes, extraStart + item.data, extraEnd) ?? "<invalid>";
      flags.push({ ...item, index: i, name, value });
    }

    const byType = new Map(flags.map((flag) => [flag.type, flag]));
    const numberValue = (type) => byType.has(type) ? byType.get(type).data : null;
    const boolValue = (type) => byType.has(type) ? Boolean(byType.get(type).data) : null;
    const stringValue = (type) => byType.has(type) ? byType.get(type).value : null;
    const compressed = relocs.length > 0 && relocs[0].type === 3;
    const compressionType = compressed ? relocs[0].data : null;
    const storedExecLength = end - execStart;

    if (!compressed && header.entryOffset >= storedExecLength && storedExecLength > 0) {
      return { valid: false, malformed: true, format: "zehn", family: "ndless", header, reason: "entry-out-of-range" };
    }
    if (compressed && compressionType !== 0) {
      return { valid: false, malformed: true, format: "zehn", family: "ndless", header, reason: "unsupported-compression-type" };
    }

    return {
      valid: true,
      family: "ndless",
      format: "zehn",
      formatLabel: `Zehn v${header.version}`,
      typeLabel: "Ndless",
      architecture: "ARM",
      header,
      layout: { headerStart: offset, headerEnd: offset + HEADER_SIZE, relocStart, flagStart, extraStart, extraEnd, execStart, containerEnd: end, metaSize },
      relocs,
      flags,
      compressed,
      compression: compressed ? "zlib" : "none",
      compressionType,
      storedExecLength,
      metadata: {
        name: stringValue(8), author: stringValue(9), version: numberValue(10), notice: stringValue(11),
        ndlessMin: numberValue(0), ndlessMax: numberValue(1), ndlessRevisionMin: numberValue(2), ndlessRevisionMax: numberValue(3),
        runsOnColor: boolValue(4), runsOnClickpad: boolValue(5), runsOnTouchpad: boolValue(6), runsOn32MB: boolValue(7),
        runsOnHww: boolValue(12), usesLcdBlit: boolValue(13),
      },
      entry: { kind: "container-relative-exec", containerOffset: header.entryOffset, runtimeAddress: header.entryOffset },
    };
  }

  function findZehn(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (bytes.length < HEADER_SIZE) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const limit = Math.min(bytes.length - HEADER_SIZE, SEARCH_LIMIT);
    let strongMalformed = null;
    for (let offset = 0; offset <= limit; offset += 4) {
      if (u32(view, offset) !== ZEHN_SIGNATURE) continue;
      // A four-byte coincidence is not enough to label a file malformed.
      if (u32(view, offset + 4) !== ZEHN_VERSION) continue;
      const candidate = headerCandidate(view, bytes.length, offset);
      if (!candidate) continue;
      const { header, metaSize, plausibleCounts, plausibleSizes } = candidate;
      if (!plausibleCounts) continue;
      // Only preserve a malformed result after signature + version + a structurally credible header.
      if (!plausibleSizes) {
        if (header.fileSize >= HEADER_SIZE && header.extraSize <= Math.max(header.fileSize, bytes.length)) {
          strongMalformed ||= { valid: false, malformed: true, family: "ndless", format: "zehn", header, reason: "implausible-header" };
        }
        continue;
      }
      if (metaSize > header.fileSize) continue;
      const parsed = parseAt(bytes, offset);
      if (parsed?.valid) return parsed;
      if (parsed?.malformed) strongMalformed ||= parsed;
    }
    return strongMalformed;
  }

  async function transformStream(bytes, mode, format) {
    const Ctor = mode === "decompress" ? globalThis.DecompressionStream : globalThis.CompressionStream;
    if (typeof Ctor !== "function") throw new Error(`${mode === "decompress" ? "DecompressionStream" : "CompressionStream"} is not available in this browser.`);
    const stream = new Blob([bytes]).stream().pipeThrough(new Ctor(format));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function inflateExecutable(bytesInput, parsedInput) {
    const bytes = asBytes(bytesInput);
    const parsed = parsedInput?.format === "zehn" ? parsedInput : findZehn(bytes);
    if (!parsed?.valid) throw new Error("Invalid Zehn container.");
    const stored = bytes.subarray(parsed.layout.execStart, parsed.layout.containerEnd);
    if (!parsed.compressed) return new Uint8Array(stored);
    const working = await transformStream(stored, "decompress", "deflate");
    if (parsed.header.entryOffset >= working.length && working.length > 0) throw new Error("Zehn entry point is outside the inflated executable image.");
    return working;
  }

  async function rebuild(bytesInput, parsedInput, workingExecutable) {
    const bytes = asBytes(bytesInput);
    const parsed = parsedInput?.format === "zehn" ? parsedInput : findZehn(bytes);
    if (!parsed?.valid) throw new Error("Invalid Zehn container.");
    const exec = asBytes(workingExecutable);
    if (parsed.header.entryOffset >= exec.length && exec.length > 0) throw new Error("Entry point is outside the working executable image.");

    const prefix = bytes.subarray(0, parsed.header.offset);
    const meta = new Uint8Array(bytes.subarray(parsed.header.offset, parsed.layout.execStart));
    const suffix = bytes.subarray(parsed.layout.containerEnd);
    const storedExec = parsed.compressed ? await transformStream(exec, "compress", "deflate") : exec;
    const newFileSize = meta.length + storedExec.length;
    new DataView(meta.buffer, meta.byteOffset, meta.byteLength).setUint32(8, newFileSize >>> 0, true);

    // alloc_size describes load allocation. For same-size working images it must stay unchanged even if compression ratio changes.
    const originalWorking = await inflateExecutable(bytes, parsed);
    if (exec.length !== originalWorking.length) throw new Error("Structural executable resizing is not enabled for Zehn yet.");

    const rebuilt = new Uint8Array(prefix.length + meta.length + storedExec.length + suffix.length);
    let p = 0;
    rebuilt.set(prefix, p); p += prefix.length;
    rebuilt.set(meta, p); p += meta.length;
    rebuilt.set(storedExec, p); p += storedExec.length;
    rebuilt.set(suffix, p);
    const reparsed = findZehn(rebuilt);
    if (!reparsed?.valid) throw new Error("Rebuilt Zehn failed structural validation.");
    if (reparsed.compressed) {
      const roundTrip = await inflateExecutable(rebuilt, reparsed);
      if (roundTrip.length !== exec.length || roundTrip.some((v, i) => v !== exec[i])) throw new Error("Zehn compression round-trip validation failed.");
    }
    return { bytes: rebuilt, parsed: reparsed };
  }

  function memoryMap(parsed, workingLength = null) {
    if (!parsed?.valid) return [];
    const h = parsed.header, l = parsed.layout;
    const runtimeExecLength = workingLength == null ? (parsed.compressed ? null : parsed.storedExecLength) : workingLength;
    const rows = [];
    if (h.offset > 0) rows.push({ name: "make-prg loader / prefix", domain: "stored", fileStart: 0, fileEnd: h.offset });
    rows.push({ name: "Zehn header", domain: "stored", fileStart: h.offset, fileEnd: l.headerEnd });
    if (h.relocCount) rows.push({ name: "relocations", domain: "stored", fileStart: l.relocStart, fileEnd: l.flagStart });
    if (h.flagCount) rows.push({ name: "flags", domain: "stored", fileStart: l.flagStart, fileEnd: l.extraStart });
    if (h.extraSize) rows.push({ name: "extra_data", domain: "stored", fileStart: l.extraStart, fileEnd: l.extraEnd });
    rows.push({ name: parsed.compressed ? "stored executable (zlib)" : "stored executable", domain: "stored", fileStart: l.execStart, fileEnd: l.containerEnd });
    if (runtimeExecLength != null) {
      rows.push({ name: "runtime executable", domain: "runtime", runtimeStart: 0, runtimeEnd: runtimeExecLength });
      const runtimeAlloc = Math.max(runtimeExecLength, h.allocSize - l.metaSize);
      if (runtimeAlloc > runtimeExecLength) rows.push({ name: "runtime allocation / BSS", domain: "runtime", runtimeStart: runtimeExecLength, runtimeEnd: runtimeAlloc });
    }
    return rows;
  }

  window.NdlessZehn = Object.freeze({
    constants: Object.freeze({ ZEHN_SIGNATURE, ZEHN_VERSION, HEADER_SIZE, SEARCH_LIMIT, FLAG_NAMES, RELOC_NAMES }),
    findZehn, parseAt, inflateExecutable, rebuild, memoryMap, hex,
  });
})();
