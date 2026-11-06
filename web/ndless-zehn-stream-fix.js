(() => {
  "use strict";

  const PATCH_MARK = "__tnsZehnStreamFixV1";
  let attempts = 0;

  const asBytes = input => input instanceof Uint8Array ? input : new Uint8Array(input || 0);

  async function collectReadable(stream) {
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = asBytes(value);
        if (!chunk.length) continue;
        chunks.push(chunk);
        total += chunk.length;
      }
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  async function transform(bytesInput, mode, format) {
    const bytes = asBytes(bytesInput);
    const Ctor = mode === "decompress" ? globalThis.DecompressionStream : globalThis.CompressionStream;
    const apiName = mode === "decompress" ? "DecompressionStream" : "CompressionStream";
    if (typeof Ctor !== "function") throw new Error(`${apiName} is not available in this browser.`);
    const input = new Blob([bytes]).stream();
    const output = input.pipeThrough(new Ctor(format));
    return collectReadable(output);
  }

  function looksLikeZlib(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (bytes.length < 2) return false;
    const cmf = bytes[0], flg = bytes[1];
    return (cmf & 0x0f) === 8 && (((cmf << 8) | flg) % 31) === 0;
  }

  function headHex(bytesInput, count = 8) {
    return Array.from(asBytes(bytesInput).subarray(0, count), value => value.toString(16).padStart(2, "0").toUpperCase()).join(" ");
  }

  async function inflateWithCompatibility(stored) {
    // genzehn uses zlib compress(), which corresponds to DecompressionStream("deflate").
    // Some legacy/custom producers have emitted raw DEFLATE while still using the ZLIB marker,
    // so keep a raw fallback after the standards-compliant attempt.
    const formats = looksLikeZlib(stored) ? ["deflate", "deflate-raw"] : ["deflate-raw", "deflate"];
    const errors = [];
    for (const format of formats) {
      try {
        const bytes = await transform(stored, "decompress", format);
        if (bytes.length) return { bytes, format };
        errors.push(`${format}: empty output`);
      } catch (error) {
        errors.push(`${format}: ${error?.message || error}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  function patchZehn() {
    const original = window.NdlessZehn;
    if (!original?.findZehn || original[PATCH_MARK]) return !!original?.[PATCH_MARK];

    async function inflateExecutable(bytesInput, parsedInput) {
      const bytes = asBytes(bytesInput);
      const parsed = parsedInput?.format === "zehn" ? parsedInput : original.findZehn(bytes);
      if (!parsed?.valid) throw new Error("Invalid Zehn container.");
      const stored = bytes.subarray(parsed.layout.execStart, parsed.layout.containerEnd);
      if (!parsed.compressed) return new Uint8Array(stored);
      if (!stored.length) throw new Error("Zehn marks the executable as compressed but the stored payload is empty.");

      try {
        const inflated = await inflateWithCompatibility(stored);
        const working = inflated.bytes;
        if (parsed.header.entryOffset >= working.length && working.length > 0) {
          throw new Error(`entry 0x${parsed.header.entryOffset.toString(16)} is outside inflated image (${working.length} bytes)`);
        }
        if (inflated.format !== "deflate") {
          console.warn(`[Ndless Zehn] Accepted compatibility compression ${inflated.format}; Zehn marker says ZLIB.`);
        }
        return working;
      } catch (error) {
        const start = parsed.layout.execStart >>> 0;
        throw new Error(
          `Zehn zlib payload could not be decompressed. ` +
          `stored=${stored.length} B, payloadOffset=0x${start.toString(16).toUpperCase()}, ` +
          `head=${headHex(stored)}. ${error?.message || error}`
        );
      }
    }

    async function rebuild(bytesInput, parsedInput, workingExecutable) {
      const bytes = asBytes(bytesInput);
      const parsed = parsedInput?.format === "zehn" ? parsedInput : original.findZehn(bytes);
      if (!parsed?.valid) throw new Error("Invalid Zehn container.");
      const exec = asBytes(workingExecutable);
      if (parsed.header.entryOffset >= exec.length && exec.length > 0) throw new Error("Entry point is outside the working executable image.");

      const prefix = bytes.subarray(0, parsed.header.offset);
      const meta = new Uint8Array(bytes.subarray(parsed.header.offset, parsed.layout.execStart));
      const suffix = bytes.subarray(parsed.layout.containerEnd);
      const storedExec = parsed.compressed ? await transform(exec, "compress", "deflate") : exec;
      const newFileSize = meta.length + storedExec.length;
      new DataView(meta.buffer, meta.byteOffset, meta.byteLength).setUint32(8, newFileSize >>> 0, true);

      const originalWorking = await inflateExecutable(bytes, parsed);
      if (exec.length !== originalWorking.length) throw new Error("Structural executable resizing is not enabled for Zehn yet.");

      const rebuilt = new Uint8Array(prefix.length + meta.length + storedExec.length + suffix.length);
      let p = 0;
      rebuilt.set(prefix, p); p += prefix.length;
      rebuilt.set(meta, p); p += meta.length;
      rebuilt.set(storedExec, p); p += storedExec.length;
      rebuilt.set(suffix, p);

      const reparsed = original.findZehn(rebuilt);
      if (!reparsed?.valid) throw new Error("Rebuilt Zehn failed structural validation.");
      if (reparsed.compressed) {
        const roundTrip = await inflateExecutable(rebuilt, reparsed);
        if (roundTrip.length !== exec.length || roundTrip.some((value, index) => value !== exec[index])) {
          throw new Error("Zehn compression round-trip validation failed.");
        }
      }
      return { bytes: rebuilt, parsed: reparsed };
    }

    window.NdlessZehn = Object.freeze({
      ...original,
      [PATCH_MARK]: true,
      inflateExecutable,
      rebuild,
    });
    console.info("[Ndless Zehn] Robust zlib stream handling installed.");
    return true;
  }

  function retry() {
    patchZehn();
    if (attempts++ < 300) setTimeout(retry, 100);
  }

  retry();
  window.addEventListener("tns-runtime-ready", patchZehn);
  try { window.NdlessRuntimeReady?.then?.(patchZehn).catch?.(() => {}); } catch (_) {}

  window.NdlessZehnStreamFix = Object.freeze({
    patchZehn,
    collectReadable,
    looksLikeZlib,
    inflateWithCompatibility,
  });
})();
