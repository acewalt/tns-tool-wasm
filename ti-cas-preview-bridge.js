(() => {
  "use strict";

  const BRIDGE_VERSION = "2026-09-03-giac-preview-v1";
  const GIAC_SCRIPT_URL = "https://www-fourier.univ-grenoble-alpes.fr/~parisse/giacwasm.js";
  const GIAC_WASM_URL = "https://www-fourier.univ-grenoble-alpes.fr/~parisse/giacwasm.wasm";
  const DEFAULT_LOAD_TIMEOUT_MS = 30000;

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

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    text = text
      .replace(/[−–]/g, "-")
      .replace(/[×·]/g, "*")
      .replace(/÷/g, "/")
      .replace(/π/g, "pi")
      .replace(/∞/g, "infinity")
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/\bdeSolve\s*\(/gi, "desolve(")
      .replace(/\bnSolve\s*\(/gi, "fsolve(")
      .replace(/\bderive\s*\(/gi, "diff(");
    return text;
  }

  function translateGiacToTi(result) {
    let text = String(result ?? "").trim();
    if (!text) return text;
    text = text
      .replace(/\binfinity\b/gi, "∞")
      .replace(/\bpi\b/g, "π");
    return text;
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
    if (!source) return false;
    if (/^Define\s+/i.test(source)) return false;

    const root = rootFunctionName(source);
    const normalizedRoot = normalizeFunctionName(root);
    const excluded = new Set(Array.from(excludedFunctions || [], (name) => String(name).toLowerCase()));
    if (root && (excluded.has(root.toLowerCase()) || LOCAL_PASSTHROUGH_FUNCTIONS.has(root.toLowerCase()))) return false;
    if (root && CAS_FUNCTIONS.has(normalizedRoot)) return true;
    if (mode === "evalStr") return true;

    return /\b(?:deSolve|nSolve|solve|factor|expand|integrate|diff|limit|simplify|partfrac|taylor|series|sum|product)\s*\(/i.test(source);
  }

  function waitForFrameLoad(frame) {
    return new Promise((resolve) => {
      if (frame.contentDocument?.readyState === "complete") {
        resolve();
        return;
      }
      frame.addEventListener("load", () => resolve(), { once: true });
    });
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

  async function initializeGiac(timeoutMs = DEFAULT_LOAD_TIMEOUT_MS) {
    if (state.status === "ready" && typeof state.caseval === "function") return true;
    if (state.loadPromise) return state.loadPromise;

    state.status = "loading";
    state.error = null;
    state.loadPromise = (async () => {
      const frame = state.frame && state.frame.isConnected ? state.frame : createGiacFrame();
      state.frame = frame;
      await waitForFrameLoad(frame);

      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc) throw new Error("No se pudo crear el contexto aislado de Giac.");

      let runtimeInitialized = false;
      const existingModule = win.Module && typeof win.Module === "object" ? win.Module : {};
      existingModule.noInitialRun = true;
      existingModule.print = () => {};
      existingModule.printErr = () => {};
      existingModule.locateFile = (path) => {
        const name = String(path || "");
        if (name.endsWith(".wasm")) return GIAC_WASM_URL;
        return new URL(name, GIAC_SCRIPT_URL).href;
      };
      const previousInit = existingModule.onRuntimeInitialized;
      existingModule.onRuntimeInitialized = () => {
        runtimeInitialized = true;
        if (typeof previousInit === "function") {
          try { previousInit(); } catch (_error) {}
        }
      };
      win.Module = existingModule;

      const script = doc.createElement("script");
      script.async = true;
      script.src = `${GIAC_SCRIPT_URL}?v=${encodeURIComponent(BRIDGE_VERSION)}`;
      const scriptLoaded = new Promise((resolve, reject) => {
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", () => reject(new Error("No se pudo descargar Giac WASM.")), { once: true });
      });
      (doc.head || doc.documentElement).appendChild(script);
      await scriptLoaded;

      const started = performance.now();
      while ((performance.now() - started) < timeoutMs) {
        const module = win.Module;
        if (module && typeof module.cwrap === "function" && (runtimeInitialized || module.ready || module.calledRun)) {
          try {
            const candidate = module.cwrap("caseval", "string", ["string"]);
            const probe = String(candidate("1+1") ?? "").trim();
            if (probe === "2" || probe === "2.0") {
              state.caseval = candidate;
              state.status = "ready";
              state.error = null;
              return true;
            }
          } catch (_error) {}
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
      throw new Error(`Giac WASM no estuvo listo después de ${Math.round(timeoutMs / 1000)} s.`);
    })().catch((error) => {
      state.status = "error";
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
      if (looksLikeGiacError(raw)) {
        return { handled: false, value: null, error: raw || "Giac no pudo evaluar la expresión." };
      }
      const tiResult = translateGiacToTi(raw);
      if (mode === "evalStr") {
        return { handled: true, value: tiResult, error: null, raw, translated };
      }
      const scalar = parseScalarResult(raw);
      if (scalar.compatible) {
        return { handled: true, value: scalar.value, error: null, raw, translated };
      }
      return {
        handled: true,
        value: null,
        error: "incompatible data type",
        raw,
        translated
      };
    } catch (error) {
      return { handled: false, value: null, error: String(error?.message || error) };
    }
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
      }
    };
  }

  function wrapLuaSource(source) {
    const shim = String.raw`
-- TNS Tool Preview only: route symbolic math through the browser CAS bridge.
local __tnsOriginalMathEval = math and math.eval or nil
local __tnsOriginalMathEvalStr = math and math.evalStr or nil
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
    while ((match = regex.exec(code))) {
      matches.push({ mode: match[1], expression: match[3] });
    }
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
    getStatus() {
      return {
        version: state.version,
        status: state.status,
        error: state.error,
        lastExpression: state.lastExpression,
        lastTranslatedExpression: state.lastTranslatedExpression,
        lastResult: state.lastResult
      };
    }
  };

  const oldCreateLuaJsPreviewRuntime = window.createLuaJsPreviewRuntime;
  if (typeof oldCreateLuaJsPreviewRuntime !== "function") {
    console.warn("TNS CAS bridge: createLuaJsPreviewRuntime no está disponible.");
    return;
  }

  window.createLuaJsPreviewRuntime = async function (code, ctx, canvas, logEl, symbols = {}) {
    const excludedFunctions = Object.keys(symbols?.basicFunctions || {});
    const needsCas = sourceNeedsCas(code, excludedFunctions);
    if (needsCas) {
      appendLog(logEl, "CAS Preview: cargando Giac/Xcas WASM para math.eval/math.evalStr...");
      const ready = await initializeGiac(DEFAULT_LOAD_TIMEOUT_MS);
      if (ready) appendLog(logEl, "CAS Preview: Giac/Xcas WASM listo.");
      else appendLog(logEl, `CAS Preview: Giac no disponible; se usará el evaluador local${state.error ? ` (${state.error})` : ""}.`);
    }

    const bindings = createLuaBindings({ excludedFunctions });
    const mergedSymbols = {
      ...(symbols || {}),
      variables: {
        ...(symbols?.variables || {}),
        ...bindings
      }
    };
    const previewCode = wrapLuaSource(code);
    return oldCreateLuaJsPreviewRuntime(previewCode, ctx, canvas, logEl, mergedSymbols);
  };

  window.__tnsCasPreviewBridgeInstalled = true;
  window.__tnsCasPreviewBridgeVersion = BRIDGE_VERSION;
})();
