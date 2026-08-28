(() => {
  "use strict";

  const MAGIC = [0x4e, 0x56, 0x50, 0x31]; // NVP1
  const HEADER_SIZE = 48;
  const CHUNK_SIZE = 24;
  const asBytes = input => input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const inRange = (offset, size, length) => Number.isInteger(offset) && Number.isInteger(size) && offset >= 0 && size >= 0 && offset + size <= length;

  function hasMagic(bytesInput) {
    const bytes = asBytes(bytesInput);
    return bytes.length >= 4 && MAGIC.every((value, index) => bytes[index] === value);
  }

  function parse(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (!hasMagic(bytes)) return null;
    if (bytes.length < HEADER_SIZE) throw new Error("Truncated NVP header.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const header = {
      magic: "NVP1",
      version: view.getUint16(4, true), flags: view.getUint16(6, true),
      canvasWidth: view.getUint16(8, true), canvasHeight: view.getUint16(10, true),
      videoX: view.getUint16(12, true), videoY: view.getUint16(14, true),
      videoWidth: view.getUint16(16, true), videoHeight: view.getUint16(18, true),
      fpsNum: view.getUint16(20, true), fpsDen: view.getUint16(22, true),
      blockSize: view.getUint16(24, true), chunkFrames: view.getUint16(26, true),
      frameCount: view.getUint32(28, true), chunkCount: view.getUint32(32, true),
      subtitleCount: view.getUint32(36, true), indexOffset: view.getUint32(40, true), subtitleOffset: view.getUint32(44, true),
    };
    if (header.version !== 11) throw new Error(`Unsupported NVP version ${header.version}; expected 11.`);
    if ((header.flags & 0x0f) !== 1) throw new Error("Unsupported NVP codec flags; expected MPEG-4 Part 2.");
    if (!header.fpsNum || !header.fpsDen) throw new Error("Invalid NVP frame rate.");
    if (!header.chunkCount || header.chunkCount > 1000000) throw new Error("Invalid NVP chunk count.");
    const indexBytes = header.chunkCount * CHUNK_SIZE;
    if (!inRange(header.indexOffset, indexBytes, bytes.length)) throw new Error("Truncated NVP chunk index.");

    const chunks = [];
    let coveredFrames = 0;
    let usedEnd = header.indexOffset + indexBytes;
    for (let i = 0; i < header.chunkCount; i += 1) {
      const o = header.indexOffset + i * CHUNK_SIZE;
      const chunk = {
        index: i, tableOffset: o,
        offset: view.getUint32(o, true), packedSize: view.getUint32(o + 4, true), unpackedSize: view.getUint32(o + 8, true),
        firstFrame: view.getUint32(o + 12, true), frameCount: view.getUint32(o + 16, true), frameTableOffset: view.getUint32(o + 20, true),
      };
      if (chunk.packedSize !== chunk.unpackedSize) throw new Error(`Compressed NVP chunk ${i} is not supported by this runtime.`);
      if (!inRange(chunk.offset, chunk.packedSize, bytes.length)) throw new Error(`NVP chunk ${i} is outside the file.`);
      if (chunk.frameTableOffset >= chunk.packedSize) throw new Error(`Invalid frame table in NVP chunk ${i}.`);
      if (!chunk.frameCount) throw new Error(`NVP chunk ${i} contains no frames.`);
      chunks.push(chunk);
      coveredFrames += chunk.frameCount;
      usedEnd = Math.max(usedEnd, chunk.offset + chunk.packedSize);
    }

    const durationSeconds = header.frameCount * header.fpsDen / header.fpsNum;
    return {
      valid: true, family: "custom-container", kind: "video-stream", format: "nvp", formatLabel: "NVP Video Stream", typeLabel: "TNS Video",
      bytes, header, chunks, durationSeconds, fps: header.fpsNum / header.fpsDen,
      codec: "MPEG-4 Part 2", audio: false, coveredFrames,
      trailingBytes: Math.max(0, bytes.length - usedEnd),
    };
  }

  function createSession(result) {
    const original = new Uint8Array(result.bytes);
    const parsed = parse(original);
    return {
      format: "nvp", formatLabel: "NVP Video Stream", originalBytes: original, workingBytes: original, parsed, changes: [],
      validate() { return parse(original); },
      exportBytes() { return new Uint8Array(original); },
    };
  }

  const api = Object.freeze({ parse, detect: hasMagic, createSession, constants: Object.freeze({ HEADER_SIZE, CHUNK_SIZE }) });
  window.TnsNvpFormat = api;
  window.TnsContainerRegistry?.register?.({
    id: "nvp", label: "NVP Video Stream", typeLabel: "TNS Video", kind: "video-stream", priority: 1100,
    extensions: [".tns"], editorGlobal: "TnsNvpEditor", detect: hasMagic, parse, createSession,
  });
})();