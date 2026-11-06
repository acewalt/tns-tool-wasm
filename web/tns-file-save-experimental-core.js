(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TnsFileSaveExperimentalCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toUint8Array(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("Expected Uint8Array, ArrayBuffer, or an ArrayBuffer view.");
  }

  function validateArtifact(artifact, validate) {
    if (!artifact || artifact.ok === false) {
      throw new Error(artifact?.message || "TNS generation failed.");
    }
    const bytes = toUint8Array(artifact.bytes);
    if (!bytes.byteLength) throw new Error("Generated TNS is empty.");
    const validation = typeof validate === "function" ? validate(bytes, artifact) : { valid: true };
    if (validation && validation.valid === false) {
      throw new Error(validation.reason ? `Generated TNS is invalid: ${validation.reason}` : "Generated TNS is invalid.");
    }
    return { ...artifact, bytes, validation };
  }

  async function writeValidatedBytes(handle, bytesInput) {
    if (!handle || typeof handle.createWritable !== "function") {
      throw new TypeError("A writable FileSystemFileHandle is required.");
    }
    const bytes = toUint8Array(bytesInput);
    if (!bytes.byteLength) throw new Error("Refusing to write an empty TNS.");

    // createWritable() is intentionally the first operation that can touch the
    // destination. Generation and validation must already have completed.
    const writable = await handle.createWritable();
    let closed = false;
    try {
      await writable.write(bytes);
      await writable.close();
      closed = true;
    } catch (error) {
      if (!closed && typeof writable.abort === "function") {
        try { await writable.abort(); } catch (_) {}
      }
      throw error;
    }
    return { bytesWritten: bytes.byteLength };
  }

  async function buildValidateAndWrite({ build, handle, validate }) {
    if (typeof build !== "function") throw new TypeError("build must be a function.");
    // Critical ordering: no handle access before both operations succeed.
    const built = await build();
    const artifact = validateArtifact(built, validate);
    const writeResult = await writeValidatedBytes(handle, artifact.bytes);
    return { ...writeResult, artifact };
  }

  return Object.freeze({
    toUint8Array,
    validateArtifact,
    writeValidatedBytes,
    buildValidateAndWrite,
  });
});
