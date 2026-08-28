self.window = self;
importScripts("ndless-arm-decoder.js", "ndless-analysis.js");

let cancelled = false;

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }
  if (msg.type !== "analyze") return;
  cancelled = false;
  try {
    const p = msg.model || {};
    const image = new Uint8Array(msg.image);
    const model = {
      image,
      codeStart: p.codeStart,
      codeEnd: p.codeEnd,
      runtimeBase: p.runtimeBase,
      entry: p.entry,
      fileOffsetBase: p.fileOffsetBase,
      containerOffsetBase: p.containerOffsetBase,
      runtimeToImage(address) {
        // Current PRG, bFLT and Zehn adapters all use a logical image whose
        // indexes match runtime addresses. Keep this mapping explicit here so
        // the worker payload remains structured-clone safe.
        return Number.isInteger(address) && address >= 0 && address < image.length ? address : null;
      },
    };
    self.postMessage({ type: "progress", phase: "decode", progress: 0.15 });
    const analysis = self.NdlessAnalysis.analyze(model, {
      mode: msg.mode || "reachable",
      maxInstructions: msg.maxInstructions || 250000,
      maxFunctions: msg.maxFunctions || 4000,
      maxCallEdges: msg.maxCallEdges || 12000,
    });
    if (cancelled) return;
    self.postMessage({ type: "progress", phase: "index", progress: 0.85 });

    // Maps/functions are not directly serializable in a useful API shape.
    // Send the stable raw analysis; the main thread recreates lazy CFG/pseudo.
    self.postMessage({
      type: "result",
      result: {
        instructions: analysis.instructions,
        functions: analysis.functions,
        callGraph: analysis.callGraph,
        warnings: analysis.warnings || [],
        truncated: !!analysis.truncated,
        decodedInstructionCount: analysis.decodedInstructionCount || analysis.instructions.length,
        analysisMode: analysis.analysisMode || (msg.mode || "reachable"),
      },
    });
  } catch (error) {
    self.postMessage({ type: "error", message: error?.message || String(error) });
  }
};
