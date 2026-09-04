(() => {
  "use strict";

  const BRIDGE_VERSION = "2026-09-03-giac-preview-v2";
  const GIAC_WASM_SCRIPT_URL = "https://www-fourier.univ-grenoble-alpes.fr/~parisse/casio/giacwasm.js";
  const GIAC_WASM_URL = "https://www-fourier.univ-grenoble-alpes.fr/~parisse/casio/giacwasm.wasm";
  const GIAC_ASM_SCRIPT_URL = "https://www-fourier.univ-grenoble-alpes.fr/~parisse/casio/giac.js";
  const DEFAULT_LOAD_TIMEOUT_MS = 30000;
  const BACKEND_TIMEOUT_MS = 15000;

  const CAS_FUNCTIONS = new Set([
    "approx", "cfactor", "csolve", "desolve", "diff", "expand", "factor", "fsolve",
    "gcd", "integrate", "int", "laplace", "lcm", "limit", "linsolve", "normal",
    "partfrac", "product", "rsolve", "series", "simplify", "solve", "sum", "taylor",
    "zeros", "ztrans"
  ]);

  const LOCAL_PASSTHROUGH_FUNCTIONS = new Set([
    "afacts", "between", "cfacts", "factstr", "getu", "isder", "isinf", "isnumch",
    "isnumtyp", "isprim", "isvarch", "lfacts", "lincl", "lremove", "lstr", "mfactor",
    "nextfct", "prodl", "sint", "toexpr", "tolower", "tosub", "toupper", "ulist",
    "when", "xinc", "zcoeffstr", "zder", "zint", "zintb", "zparent", "zprettyder",
    "zsint"
  ]);

  const state = {
    version: BRIDGE_VERSION,
    status: "idle",
    backend: null,
    error: null,
    frame: null,
    caseval: null,
    loadPromise: null,
    lastExpression: "",
    lastTranslatedExpression: "",
    lastResult: ""
  };

  function appendLog(logEl, message) {
    if (!logEl || !message) return;
    if (typeof window.appendPreviewLog === "function") {
      try {
        window.appendPreviewLog(logEl, message);
        return;
      } catch (_error) {}
    }
    const prefix = logEl.textContent ? "\n" : "";
    logEl.textContent += `${prefix}${message}`;
    logEl.scrollTop = logEl.scrollHeight || 0;
  }

  function rootFunctionName(expression) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(String(expression || ""));
    return match ? match[1] : "";
  }

  function normalizeFunctionName(name) {
    const value = String(name || "");
    if (/^deSolve$/i.test(value)) return "desolve";
    if (/^nSolve$/i.test(value)) return "fsolve";
    if (/^derive$/i.test(value)) return "diff";
    return value.toLowerCase();
  }

  function translateTiToGiac(expression) {
    let text = String(expression ?? "").trim();
    if (!text) return "";
    return text
      .replace(/[−–]/g, "-")
      .replace(/[×·]/g, "*")
      .replace(/÷/g, "/")
      .replace(/π/g, "pi")
      .replace(/∞/g, "infinity")
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/\bdeSolve\s*\(/gi, "desolve(")
      .replace(/\bnSolve\s*\(/gi, "fsolve(")
      .replace(/\bderive\s*\(/gi, "diff(");
  }

  function translateGiacToTi(result) {
    let text = String(result ?? "").trim();
    if (!text) return text;
    return text
      .replace(/\binfinity\b/gi, "∞")
      .replace(/\bpi\b/g, "π");
  }

  function parseScalarResult(result) {
    const text = String(result ?? "").trim();
    if (!text) return { compatible: false, value: null };
    if (/^true$/i.test(text)) return { compatible: true, value: true };
    if (/^false$/i.test(text)) return { compatible: true, value: false };
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      const value = Number(text);
      if (Number.isFinite(value)) return { compatible: true, value };
    }
    if (/^[+-]?(?:infinity|∞)$/i.test(text)) {
      return { compatible: true, value: text.startsWith("-") ? -Infinity : Infinity };
    }
    const quoted = /^"([\s\S]*)"$/.exec(text);
    if (quoted) return { compatible: true, value: quoted[1] };
    return { compatible: false, value: null };
  }

  function looksLikeGiacError(result) {
    const text = String(result ?? "").trim();
    if (!text) return true;
    return /^(?:error|syntax error|parse error|giac error)\b/i.test(text)
      || /(?:syntax|parse)\s+error/i.test(text)
      || /stopped by user interruption/i.test(text);
  }

  function shouldHandle(expression, mode, excludedFunctions = []) {
    const source = String(expression ?? "").trim();
    if (!source || /^Define\s+/i.test(source)) return false;

    const root = rootFunctionName(source);
    const normalizedRoot = normalizeFunctionName(root);
    const excluded = new Set(Array.from(excludedFunctions || [], (name) => String(name).toLowerCase()));
    if (root && (excluded.has(root.toLowerCase()) || LOCAL_PASSTHROUGH_FUNCTIONS.has(root.toLowerCase()))) return false;
    if (root && CAS_FUNCTIONS.has(normalizedRoot)) return true;
    if (mode === "evalStr") return true;

    return /\b(?:deSolve|nSolve|solve|factor|expand|integrate|diff|limit|simplify|partfrac|taylor|series|sum|product)\s*\(/i.test(source);
  }

  function removeFrame(frame) {
    try { frame?.remove(); } catch (_error) {}
  }

  function createGiacFrame() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.left = "-10000px";
    frame.style.top = "-10000px";
    frame.style.border = "0";
    frame.style.visibility = "hidden";
    frame.src = "about:blank";
    document.body.appendChild(frame);
    return frame;
  }

  function waitForFrameLoad(frame) {
    return new Promise((resolve) => {
      if (frame.contentDocument?.readyState === "complete") return resolve();
      frame.addEventListener("load", resolve, { once: true });
    });
  }

  function exportedCaseval(module) {
    if (!module || typeof module.cwrap !== "function") return null;
    for (const exportName of ["caseval", "_caseval", "_ZN4giac7casevalEPKc"]) {
      try {
        const candidate = module.cwrap(exportName, "string", ["string"]);
        const probe = String(candidate("1+1") ?? "").trim();
        if (probe === "2" || probe === "2.0") return candidate;
      } catch (_error) {}
    }
    return null;
  }

  async function loadBackend(scriptUrl, wasmUrl, backendName, timeoutMs) {
    const frame = createGiacFrame();
    await waitForFrameLoad(frame);
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) {
      removeFrame(frame);
      throw new Error(`No se pudo crear el contexto aislado para ${backendName}.`);
    }

    const module = {};
    module.noInitialRun = true;
    module.print = () => {};
    module.printErr = () => {};
    if (wasmUrl) {
      module.locateFile = (path) => String(path || "").endsWith(".wasm")
        ? wasmUrl
        : new URL(String(path || ""), scriptUrl).href;
    }
    win.Module = module;

    const script = doc.createElement("script");
    script.async = true;
    script.src = `${scriptUrl}?v=${encodeURIComponent(BRIDGE_VERSION)}`;
    await new Promise((resolve, reject) => {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`No se pudo descargar ${backendName}.`)), { once: true });
      (doc.head || doc.documentElement).appendChild(script);
    }).catch((error) => {
      removeFrame(frame);
      throw error;
    });

    const started = performance.now();
    while ((performance.now() - started) < timeoutMs) {
      const candidate = exportedCaseval(win.Module);
      if (candidate) return { frame, caseval: candidate, backend: backendName };
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    removeFrame(frame);
    throw new Error(`${backendName} no estuvo listo después de ${Math.round(timeoutMs / 1000)} s.`);
  }

  async function initializeGiac(timeoutMs = DEFAULT_LOAD_TIMEOUT_MS) {
    if (state.status === "ready" && typeof state.caseval === "function") return true;
    if (state.loadPromise) return state.loadPromise;

    state.status = "loading";
    state.error = null;
    state.loadPromise = (async () => {
      const perBackend = Math.min(BACKEND_TIMEOUT_MS, Math.max(5000, Math.floor(timeoutMs / 2)));
      let wasmError = null;
      try {
        const loaded = await loadBackend(GIAC_WASM_SCRIPT_URL, GIAC_WASM_URL, "Giac WASM", perBackend);
        state.frame = loaded.frame;
        state.caseval = loaded.caseval;
        state.backend = loaded.backend;
        state.status = "ready";
        return true;
      } catch (error) {
        wasmError = String(error?.message || error);
      }

      try {
        const loaded = await loadBackend(GIAC_ASM_SCRIPT_URL, null, "Giac asm.js", perBackend);
        state.frame = loaded.frame;
        state.caseval = loaded.caseval;
        state.backend = loaded.backend;
        state.status = "ready";
        state.error = wasmError ? `WASM: ${wasmError}` : null;
        return true;
      } catch (error) {
        const asmError = String(error?.message || error);
        throw new Error(`WASM: ${wasmError || "falló"}; asm.js: ${asmError}`);
      }
    })().catch((error) => {
      state.status = "error";
      state.backend = null;
      state.error = String(error?.message || error);
      return false;
    }).finally(() => {
      state.loadPromise = null;
    });

    return state.loadPromise;
  }

  function evaluate(expression, options = {}) {
    const mode = options.mode === "evalStr" ? "evalStr" : "eval";
    const excludedFunctions = options.excludedFunctions || [];
    if (!shouldHandle(expression, mode, excludedFunctions)) {
      return { handled: false, value: null, error: null };
    }
    if (state.status !== "ready" || typeof state.caseval !== "function") {
      return { handled: false, value: null, error: state.error };
    }

    const translated = translateTiToGiac(expression);
    state.lastExpression = String(expression ?? "");
    state.lastTranslatedExpression = translated;
    try {
      const raw = String(state.caseval(translated) ?? "").trim();
      state.lastResult = raw;
      if (looksLikeGiacError(raw)) return { handled: false, value: null, error: raw || "Giac no pudo evaluar la expresión." };
      const tiResult = translateGiacToTi(raw);
      if (mode === "evalStr") return { handled: true, value: tiResult, error: null, raw, translated };
      const scalar = parseScalarResult(raw);
      if (scalar.compatible) return { handled: true, value: scalar.value, error: null, raw, translated };
      return { handled: true, value: null, error: "incompatible data type", raw, translated };
    } catch (error) {
      return { handled: false, value: null, error: String(error?.message || error) };
    }
  }

  function luaPatternToRegExp(pattern) {
    const source = String(pattern ?? "");
    let output = "";
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char === "%") {
        const next = source[++index] || "";
        const classes = {
          a: "[A-Za-z]", A: "[^A-Za-z]",
          d: "\\d", D: "\\D",
          s: "\\s", S: "\\S",
          w: "[A-Za-z0-9_]", W: "[^A-Za-z0-9_]",
          x: "[A-Fa-f0-9]", X: "[^A-Fa-f0-9]",
          l: "[a-z]", L: "[^a-z]",
          u: "[A-Z]", U: "[^A-Z]",
          c: "[\\x00-\\x1F\\x7F]", C: "[^\\x00-\\x1F\\x7F]",
          z: "\\x00", Z: "[^\\x00]"
        };
        if (classes[next]) output += classes[next];
        else output += next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      } else if (char === ".") output += "[\\s\\S]";
      else if (char === "-") output += "*?";
      else if (char === "(" || char === ")" || char === "^" || char === "$" || char === "*" || char === "+" || char === "?") output += char;
      else if (char === "[") {
        const end = source.indexOf("]", index + 1);
        if (end > index) {
          let inner = source.slice(index + 1, end)
            .replace(/%a/g, "A-Za-z")
            .replace(/%d/g, "0-9")
            .replace(/%s/g, "\\s")
            .replace(/%w/g, "A-Za-z0-9_")
            .replace(/%x/g, "A-Fa-f0-9");
          output += `[${inner}]`;
          index = end;
        } else output += "\\[";
      } else if ("{}|\\".includes(char)) output += `\\${char}`;
      else output += char;
    }
    try { return new RegExp(output, "g"); } catch (_error) { return null; }
  }

  function createStringGmatch(text, pattern) {
    const source = String(text ?? "");
    const regex = luaPatternToRegExp(pattern);
    if (!regex) return () => [null];
    return () => {
      const match = regex.exec(source);
      if (!match) return [null];
      if (match[0] === "") regex.lastIndex = Math.min(source.length + 1, regex.lastIndex + 1);
      return match.length > 1 ? match.slice(1).map((value) => value ?? null) : [match[0]];
    };
  }

  function createLuaBindings(options = {}) {
    const excludedFunctions = options.excludedFunctions || [];
    return {
      __tnsCasEval: (expression) => {
        const result = evaluate(expression, { mode: "eval", excludedFunctions });
        return [result.value, result.error, result.handled];
      },
      __tnsCasEvalStr: (expression) => {
        const result = evaluate(expression, { mode: "evalStr", excludedFunctions });
        return [result.value, result.error, result.handled];
      },
      __tnsStringGmatch: (text, pattern) => [createStringGmatch(text, pattern)]
    };
  }

  function wrapLuaSource(source) {
    const shim = String.raw`
-- TNS Tool Preview only: compatibility layer; this code is never written to the TNS.
local __tnsOriginalMathEval = math and math.eval or nil
local __tnsOriginalMathEvalStr = math and math.evalStr or nil
if string and __tnsStringGmatch then
  string.gmatch = function(text, pattern)
    return __tnsStringGmatch(text, pattern)
  end
end
if math and __tnsCasEval then
  math.eval = function(expr)
    local value, err, handled = __tnsCasEval(expr)
    if handled then return value, err end
    if __tnsOriginalMathEval then return __tnsOriginalMathEval(expr) end
    return nil, err
  end
end
if math and __tnsCasEvalStr then
  math.evalStr = function(expr)
    local value, err, handled = __tnsCasEvalStr(expr)
    if handled then return value, err end
    if __tnsOriginalMathEvalStr then return __tnsOriginalMathEvalStr(expr) end
    if __tnsOriginalMathEval then
      local fallback, fallbackErr = __tnsOriginalMathEval(expr)
      if fallback ~= nil then return tostring(fallback) end
      return nil, fallbackErr or err
    end
    return nil, err
  end
end
`;
    return `${shim}\n${String(source ?? "")}`;
  }

  function literalMathCalls(source) {
    const code = String(source || "");
    const matches = [];
    const regex = /math\.(evalStr|eval)\s*\(\s*(["'])([\s\S]*?)\2\s*\)/g;
    let match;
    while ((match = regex.exec(code))) matches.push({ mode: match[1], expression: match[3] });
    return matches;
  }

  function sourceNeedsCas(source, excludedFunctions = []) {
    const code = String(source || "");
    const allCalls = code.match(/math\.(?:evalStr|eval)\s*\(/g) || [];
    if (!allCalls.length) return false;
    const literals = literalMathCalls(code);
    if (literals.length < allCalls.length) return true;
    return literals.some((item) => shouldHandle(item.expression, item.mode, excludedFunctions));
  }

  window.TnsCasBridge = {
    version: BRIDGE_VERSION,
    state,
    ensureReady: initializeGiac,
    evaluate,
    createLuaBindings,
    wrapLuaSource,
    sourceNeedsCas,
    translateTiToGiac,
    translateGiacToTi,
    shouldHandle,
    luaPatternToRegExp,
    getStatus() {
      return {
        version: state.version,
        status: state.status,
        backend: state.backend,
        error: state.error,
        lastExpression: state.lastExpression,
        lastTranslatedExpression: state.lastTranslatedExpression,
        lastResult: state.lastResult
      };
    }
  };

  const oldCreateLuaJsPreviewRuntime = window.createLuaJsPreviewRuntime;
  if (typeof oldCreateLuaJsPreviewRuntime !== "function") {
    console.warn("TNS CAS bridge v2: createLuaJsPreviewRuntime no está disponible.");
    return;
  }

  window.createLuaJsPreviewRuntime = async function (code, ctx, canvas, logEl, symbols = {}) {
    const excludedFunctions = Object.keys(symbols?.basicFunctions || {});
    const needsCas = sourceNeedsCas(code, excludedFunctions);
    const needsGmatch = /\bstring\.gmatch\s*\(/.test(String(code || ""));

    if (needsCas) {
      appendLog(logEl, "CAS Preview: cargando Giac/Xcas para math.eval/math.evalStr...");
      const ready = await initializeGiac(DEFAULT_LOAD_TIMEOUT_MS);
      if (ready) {
        appendLog(logEl, `CAS Preview: ${state.backend || "Giac"} listo.`);
        if (state.backend === "Giac asm.js" && state.error) appendLog(logEl, `CAS Preview: fallback asm.js activo (${state.error}).`);
      } else {
        appendLog(logEl, `CAS Preview: Giac no disponible; se usará el evaluador local (${state.error || "error desconocido"}).`);
      }
    }

    if (!needsCas && !needsGmatch) return oldCreateLuaJsPreviewRuntime(code, ctx, canvas, logEl, symbols);

    const bindings = createLuaBindings({ excludedFunctions });
    const mergedSymbols = {
      ...(symbols || {}),
      variables: { ...(symbols?.variables || {}), ...bindings }
    };
    return oldCreateLuaJsPreviewRuntime(wrapLuaSource(code), ctx, canvas, logEl, mergedSymbols);
  };

  window.__tnsCasPreviewBridgeInstalled = true;
})();
