(() => {
  "use strict";

  const DEFAULT_MAX_INSTRUCTIONS = 20000;
  const DEFAULT_MAX_FUNCTIONS = 1500;
  const DEFAULT_MAX_CALL_EDGES = 5000;
  const DEFAULT_MAX_PSEUDOCODE_INSTRUCTIONS = 240;

  const hex = (n, w = 8) => n == null ? "N/A" : `0x${(Number(n) >>> 0).toString(16).toUpperCase().padStart(w, "0")}`;
  const internal = (addr, min, max) => Number.isInteger(addr) && addr >= min && addr < max && ((addr - min) & 3) === 0;
  const fnName = (address, entry) => address === entry ? "entry" : `sub_${(address >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;

  function lowerBound(rows, address) {
    let lo = 0;
    let hi = rows.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (rows[mid].address < address) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function detectFunctions(instructions, entry, options = {}) {
    if (!instructions.length) return [];
    const maxFunctions = options.maxFunctions ?? DEFAULT_MAX_FUNCTIONS;
    const min = instructions[0].address;
    const max = instructions[instructions.length - 1].address + 4;
    const starts = new Set();
    let totalDetected = 0;

    const addStart = (address) => {
      if (!internal(address, min, max)) return;
      totalDetected += 1;
      if (starts.size < maxFunctions) starts.add(address >>> 0);
    };

    if (internal(entry, min, max)) addStart(entry >>> 0);
    for (const ins of instructions) {
      if (ins.call) addStart(ins.target);
      if (ins.prologue) addStart(ins.address);
    }

    const sorted = [...starts].sort((a, b) => a - b);
    if (!sorted.length) sorted.push(min);
    const functions = sorted.map((start, i) => ({
      address: start,
      name: fnName(start, entry),
      end: sorted[i + 1] ?? max,
      source: "heuristic",
    }));
    attachInstructionRanges(instructions, functions);
    functions.truncated = totalDetected > functions.length;
    functions.totalDetected = Math.max(totalDetected, functions.length);
    return functions;
  }

  function attachInstructionRanges(instructions, functions) {
    for (const fn of functions) {
      fn.startInstructionIndex = lowerBound(instructions, fn.address);
      fn.endInstructionIndex = lowerBound(instructions, fn.end);
      const next = instructions[fn.endInstructionIndex - 1];
      if (next && next.address + 4 < fn.end) fn.end = next.address + 4;
    }
    return functions;
  }

  function instructionsForFunction(instructions, fn, limit = Infinity) {
    if (!fn) return [];
    const start = Number.isInteger(fn.startInstructionIndex) ? fn.startInstructionIndex : lowerBound(instructions, fn.address);
    const end = Number.isInteger(fn.endInstructionIndex) ? fn.endInstructionIndex : lowerBound(instructions, fn.end);
    return instructions.slice(start, Math.min(end, start + limit));
  }

  function buildCfg(instructions, fn) {
    const rows = instructionsForFunction(instructions, fn);
    if (!rows.length) return { blocks: [], edges: [] };
    const leaders = new Set([rows[0].address]);
    const byAddr = new Map(rows.map(i => [i.address, i]));

    for (const ins of rows) {
      const next = ins.address + 4;
      if ((ins.flow === "branch" || ins.flow === "conditional-branch") && byAddr.has(ins.target)) leaders.add(ins.target);
      if ((ins.flow === "conditional-branch" || ins.flow === "call") && byAddr.has(next)) leaders.add(next);
      if ((ins.flow === "branch" || ins.return) && byAddr.has(next)) leaders.add(next);
    }

    const starts = [...leaders].sort((a, b) => a - b);
    const blocks = [];
    for (let i = 0; i < starts.length; i += 1) {
      const start = starts[i];
      const end = starts[i + 1] ?? fn.end;
      const s = lowerBound(rows, start);
      const e = lowerBound(rows, end);
      const insns = rows.slice(s, e);
      if (insns.length) blocks.push({ id: `block_${hex(start)}`, start, end: insns[insns.length - 1].address + 4, instructions: insns });
    }

    const edges = [];
    const blockStarts = new Set(blocks.map(b => b.start));
    for (const block of blocks) {
      const last = block.instructions.at(-1);
      const next = last.address + 4;
      if (last.call) {
        if (last.target != null) edges.push({ from: block.start, to: last.target, type: "call" });
        if (blockStarts.has(next)) edges.push({ from: block.start, to: next, type: "fallthrough" });
        continue;
      }
      if (last.return) {
        edges.push({ from: block.start, to: null, type: "return" });
        continue;
      }
      if (last.flow === "branch") {
        edges.push({ from: block.start, to: last.target, type: "unconditional" });
        continue;
      }
      if (last.flow === "conditional-branch") {
        edges.push({ from: block.start, to: last.target, type: "true", condition: last.condition });
        if (blockStarts.has(next)) edges.push({ from: block.start, to: next, type: "false" });
        continue;
      }
      if (blockStarts.has(next)) edges.push({ from: block.start, to: next, type: "fallthrough" });
    }
    return { blocks, edges };
  }

  function buildCallGraph(instructions, functions, entry, options = {}) {
    const maxEdges = options.maxCallEdges ?? DEFAULT_MAX_CALL_EDGES;
    const known = new Set(functions.map(f => f.address));
    const edges = [];
    let truncated = false;
    for (const fn of functions) {
      for (const ins of instructionsForFunction(instructions, fn)) {
        if (!ins.call || !known.has(ins.target)) continue;
        if (edges.length >= maxEdges) {
          truncated = true;
          break;
        }
        edges.push({ from: fn.address, to: ins.target, fromName: fn.name, toName: fnName(ins.target, entry), at: ins.address });
      }
      if (truncated) break;
    }
    return { nodes: functions.map(f => ({ address: f.address, name: f.name })), edges, truncated };
  }

  function opText(op) {
    if (!op) return "?";
    return op.text?.replace(/#0x([0-9A-F]+)/i, "0x$1") || "?";
  }

  function pseudocodeForFunction(instructions, fn, entry, options = {}) {
    const limit = options.maxInstructions ?? DEFAULT_MAX_PSEUDOCODE_INSTRUCTIONS;
    const rows = instructionsForFunction(instructions, fn, limit);
    const total = Math.max(0, (fn.endInstructionIndex ?? 0) - (fn.startInstructionIndex ?? 0));
    const lines = [`${fn.name}() {`];
    for (const ins of rows) {
      let s = "";
      const m = ins.mnemonic.replace(/(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)$/i, "").toLowerCase();
      if (m === "mov") s = `${window.NdlessArmDecoder.REGS[ins.rd]} = ${opText(ins.operand2)};`;
      else if (["add", "sub", "and", "orr", "eor"].includes(m)) {
        const sym = { add: "+", sub: "-", and: "&", orr: "|", eor: "^" }[m];
        s = `${window.NdlessArmDecoder.REGS[ins.rd]} = ${window.NdlessArmDecoder.REGS[ins.rn]} ${sym} ${opText(ins.operand2)};`;
      } else if (["cmp", "cmn", "tst"].includes(m)) s = `/* ${ins.text} */`;
      else if (ins.call && ins.target != null) s = `${fnName(ins.target, entry)}();`;
      else if (ins.return) s = "return;";
      else if (ins.flow === "conditional-branch") s = `if (${ins.condition}) goto label_${hex(ins.target).slice(2)};`;
      else if (ins.flow === "branch") s = `goto label_${hex(ins.target).slice(2)};`;
      else if (m.startsWith("ldr")) s = `${window.NdlessArmDecoder.REGS[ins.rd]} = mem_${ins.literalAddress != null ? hex(ins.literalAddress).slice(2) : "..."};`;
      else if (m.startsWith("str")) s = `mem_... = ${window.NdlessArmDecoder.REGS[ins.rd]};`;
      if (s) lines.push(`  ${s}`);
    }
    if (total > rows.length) lines.push(`  /* Pseudocode truncated after ${rows.length} of ${total} instructions. */`);
    lines.push("}");
    return lines.join("\n");
  }

  function scanStrings(bytes, start, end, minLen = 4) {
    const out = [];
    const seen = new Set();
    const fatal = new TextDecoder("utf-8", { fatal: true });
    start = Math.max(0, start);
    end = Math.min(bytes.length, end);
    let i = start;
    while (i < end) {
      const s = i;
      while (i < end && bytes[i] !== 0 && i - s < 512) i += 1;
      if (i < end && bytes[i] === 0 && i - s >= minLen) {
        try {
          const value = fatal.decode(bytes.subarray(s, i));
          if (value.length >= minLen && ![...value].some(ch => ch.charCodeAt(0) < 32 && ch !== "\t")) {
            const ascii = [...bytes.subarray(s, i)].every(b => b >= 32 && b <= 126);
            out.push({ kind: "Detected string", encoding: ascii ? "ASCII" : "UTF-8", offset: s, length: i - s, value, nullTerminated: true });
            seen.add(s);
          }
        } catch (_) {}
      }
      i = Math.max(i + 1, s + 1);
      if (out.length >= 1200) break;
    }
    i = start;
    while (i < end && out.length < 1500) {
      const s = i;
      while (i < end && bytes[i] >= 32 && bytes[i] <= 126) i += 1;
      if (i - s >= minLen && !seen.has(s)) out.push({ kind: "Detected string", encoding: "ASCII", offset: s, length: i - s, value: String.fromCharCode(...bytes.subarray(s, i)), nullTerminated: i < end && bytes[i] === 0 });
      i = Math.max(i + 1, s + 1);
    }
    return out;
  }

  function scanNumericCandidates(bytes, start, end, limit = 500) {
    const out = [];
    start = Math.max(0, start + (start % 4 ? 4 - start % 4 : 0));
    end = Math.min(bytes.length, end);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let off = start; off + 4 <= end && out.length < limit; off += 4) {
      const u = v.getUint32(off, true);
      const s = v.getInt32(off, true);
      const f = v.getFloat32(off, true);
      if (u !== 0 && Math.abs(s) <= 1000000000) out.push({ kind: "Integer candidate", offset: off, value: s, raw: u });
      if (Number.isFinite(f) && Math.abs(f) >= 1e-12 && Math.abs(f) <= 1e12 && !Number.isInteger(f) && out.length < limit) out.push({ kind: "Float32 candidate", offset: off, value: f, raw: u });
    }
    return out;
  }

  function resolveFunction(functions, fnOrAddress) {
    if (fnOrAddress == null) return null;
    if (typeof fnOrAddress === "object") return fnOrAddress;
    const address = Number(fnOrAddress);
    return functions.find(f => f.address === address) || null;
  }

  function analyze(model, options = {}) {
    const maxInstructions = options.maxInstructions ?? DEFAULT_MAX_INSTRUCTIONS;
    const maxBytes = maxInstructions * 4;
    const analysisStart = model.codeStart ?? 0;
    const requestedEnd = model.codeEnd ?? model.image.length;
    const analysisEnd = Math.min(requestedEnd, analysisStart + maxBytes, model.image.length);
    const truncated = analysisEnd < requestedEnd;
    const warnings = [];

    if (truncated) warnings.push(`Disassembly limited to ${maxInstructions} instructions (${analysisEnd - analysisStart} bytes) from a requested ${(requestedEnd - analysisStart)} byte range.`);

    const instructions = window.NdlessArmDecoder.disassemble(model.image, {
      start: analysisStart,
      end: analysisEnd,
      runtimeBase: model.runtimeBase,
      fileOffsetBase: model.fileOffsetBase,
      containerOffsetBase: model.containerOffsetBase,
    });
    const annotated = window.NdlessArmDecoder.annotatePcRelative(instructions, model.image, model);
    const functions = detectFunctions(annotated, model.entry, options);
    if (functions.truncated) warnings.push(`Function list limited to ${functions.length} of ${functions.totalDetected} heuristic function starts.`);
    const callGraph = buildCallGraph(annotated, functions, model.entry, options);
    if (callGraph.truncated) warnings.push(`Call graph limited to ${callGraph.edges.length} edges.`);

    const cfgCache = new Map();
    const pseudoCache = new Map();
    const getFunction = fnOrAddress => resolveFunction(functions, fnOrAddress) || functions[0] || null;
    const cfgForFunction = (fnOrAddress) => {
      const fn = getFunction(fnOrAddress);
      if (!fn) return null;
      if (!cfgCache.has(fn.address)) cfgCache.set(fn.address, buildCfg(annotated, fn));
      return cfgCache.get(fn.address);
    };
    const pseudocodeCached = (fnOrAddress) => {
      const fn = getFunction(fnOrAddress);
      if (!fn) return "";
      if (!pseudoCache.has(fn.address)) pseudoCache.set(fn.address, pseudocodeForFunction(annotated, fn, model.entry, options));
      return pseudoCache.get(fn.address);
    };

    if (functions[0]) {
      cfgForFunction(functions[0].address);
      pseudocodeCached(functions[0].address);
    }

    return {
      instructions: annotated,
      functions,
      cfg: cfgCache,
      callGraph,
      pseudocode: pseudoCache,
      warnings,
      truncated,
      analysisStart,
      analysisEnd,
      totalInstructionEstimate: Math.max(0, Math.floor((requestedEnd - analysisStart) / 4)),
      decodedInstructionCount: annotated.length,
      instructionsForFunction: (fnOrAddress, limit = Infinity) => instructionsForFunction(annotated, getFunction(fnOrAddress), limit),
      cfgForFunction,
      pseudocodeForFunction: pseudocodeCached,
    };
  }

  window.NdlessAnalysis = Object.freeze({
    detectFunctions,
    buildCfg,
    buildCallGraph,
    pseudocodeForFunction,
    scanStrings,
    scanNumericCandidates,
    analyze,
    fnName,
    hex,
    DEFAULT_MAX_INSTRUCTIONS,
    DEFAULT_MAX_FUNCTIONS,
  });
})();
