(() => {
  "use strict";
  const asBytes = (input) => input instanceof Uint8Array ? input : new Uint8Array(input || 0);

  function isDocument(bytes) {
    // The classic TI-Nspire document outer signature begins with *TIMLP (e.g. *TIMLP0500).
    return bytes.length >= 6 && bytes[0] === 0x2a && bytes[1] === 0x54 && bytes[2] === 0x49 && bytes[3] === 0x4d && bytes[4] === 0x4c && bytes[5] === 0x50;
  }

  function detect(bytesInput) {
    const bytes = asBytes(bytesInput);
    const bflt = window.NdlessBflt?.parse?.(bytes);
    if (bflt) return bflt;
    const prg = window.NdlessPrg?.parse?.(bytes);
    if (prg) return prg;
    const zehn = window.NdlessZehn?.findZehn?.(bytes);
    if (zehn) return zehn;
    if (isDocument(bytes)) return { valid: true, family: "document", format: "ti-nspire", formatLabel: "TI-Nspire Document", typeLabel: "TI-Nspire Document", architecture: null };
    return { valid: false, family: "unknown", format: "unknown", reason: "unrecognized-tns" };
  }

  async function inspectFile(file) {
    if (!file || !/\.tns$/i.test(file.name || "")) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let parsed = detect(bytes);
    if (parsed?.valid && parsed.format === "bflt") parsed = await window.NdlessBflt.enrich(bytes, parsed);
    return { ...parsed, file, bytes };
  }

  window.NdlessFormatDetector = Object.freeze({ detect, inspectFile, isDocument });
})();
