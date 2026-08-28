(() => {
  "use strict";
  const SIGNATURE = [0x50, 0x52, 0x47, 0x00];
  // crt0.S in Ndless 3.1 r903 emits: .asciz "PRG" then stmfd sp!, {r4-r11,lr}.
  const LEGACY_STARTUP = [0xF0, 0x4F, 0x2D, 0xE9];
  const asBytes = (input) => input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const match = (bytes, pattern, offset = 0) => pattern.every((v, i) => bytes[offset + i] === v);

  function parse(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (bytes.length < 8 || !match(bytes, SIGNATURE)) return null;
    if (!match(bytes, LEGACY_STARTUP, 4)) return null;
    return {
      valid: true, family: "ndless", format: "prg", formatLabel: "PRG", typeLabel: "Ndless Legacy", architecture: "ARM",
      signature: "PRG\\0", startup: "legacy crt0", startupOffset: 4, physicalSize: bytes.length,
      // This is an analysis start, not a claimed container entry-point field.
      analysisStart: { fileOffset: 4, containerOffset: 4, runtimeAddress: 4 },
      compressed: false, compression: "none", relocs: [], metadata: null,
    };
  }

  function memoryMap(parsed, size) {
    if (!parsed?.valid) return [];
    return [
      { name: "PRG signature", domain: "stored", fileStart: 0, fileEnd: 4 },
      { name: "legacy ARM image (known startup at +4)", domain: "stored", fileStart: 4, fileEnd: size },
      { name: "legacy ARM image", domain: "runtime", runtimeStart: 4, runtimeEnd: size },
    ];
  }

  window.NdlessPrg = Object.freeze({ SIGNATURE, LEGACY_STARTUP, parse, memoryMap });
})();
