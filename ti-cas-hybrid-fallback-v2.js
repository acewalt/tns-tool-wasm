(() => {
  "use strict";

  const HYBRID_VERSION = "2026-09-03-ti-cas-hybrid-v2";
  const state = {
    version: HYBRID_VERSION,
    sympyStatus: "idle",
    sympyError: null,
    sympyLoadPromise: null,
    constantCounter: 0,
    lastFallback: null,
    lastExpression: "",
    lastFallbackError: null,
    logEl: null
  };

  function appendLog(logEl, message) {
    if (!logEl || !message) return;
    if (typeof window.appendPreviewLog === "function") {
      try { window.appendPreviewLog(logEl, message); return; } catch (_error) {}
    }
    const prefix = logEl.textContent ? "\n" : "";
    logEl.textContent += `${prefix}${message}`;
    logEl.scrollTop = logEl.scrollHeight || 0;
  }

  function logFallback(message) {
    appendLog(state.logEl, `CAS Hybrid v2: ${message}`);
  }

  function getPyodideRuntime() {
    try {
      if (typeof pyodide !== "undefined" && pyodide) return pyodide;
    } catch (_error) {}
    try {
      if (window.pyodide) return window.pyodide;
    } catch (_error) {}
    return null;
  }

  async function ensureSympy() {
    if (state.sympyStatus === "ready") return true;
    if (state.sympyLoadPromise) return state.sympyLoadPromise;
    state.sympyStatus = "loading";
    state.sympyError = null;
    state.sympyLoadPromise = (async () => {
      const runtime = getPyodideRuntime();
      if (!runtime) throw new Error("Pyodide no está disponible.");
      await runtime.loadPackage("sympy");
      await runtime.runPythonAsync("import sympy as sp");
      state.sympyStatus = "ready";
      return true;
    })().catch((error) => {
      state.sympyStatus = "error";
      state.sympyError = String(error?.message || error);
      return false;
    }).finally(() => {
      state.sympyLoadPromise = null;
    });
    return state.sympyLoadPromise;
  }

  function splitTopLevelArgs(text) {
    const source = String(text || "");
    const out = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
      if (ch === "," && depth === 0) {
        out.push(current.trim());
        current = "";
      } else current += ch;
    }
    out.push(current.trim());
    return out;
  }

  function splitTopLevelEquality(text) {
    const source = String(text || "");
    let depth = 0;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
      else if (ch === "=" && depth === 0) return [source.slice(0, i).trim(), source.slice(i + 1).trim()];
    }
    return [source.trim(), "0"];
  }

  function parseCall(expression, names) {
    const source = String(expression || "").trim();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)\s*$/.exec(source);
    if (!match) return null;
    const allowed = new Set(Array.from(names || [], (name) => String(name).toLowerCase()));
    if (!allowed.has(match[1].toLowerCase())) return null;
    return { name: match[1], args: splitTopLevelArgs(match[2]) };
  }

  function isDeSolve(expression) { return !!parseCall(expression, ["deSolve", "desolve"]); }
  function isIntegral(expression) { return !!parseCall(expression, ["integral"]); }
  function translateIntegralAlias(expression) {
    return String(expression || "").replace(/^\s*integral\s*\(/i, "integrate(");
  }

  function normalizeBindingResult(result) {
    if (Array.isArray(result)) return result;
    return [result, null, result !== undefined];
  }

  function unresolvedOdeValue(value) {
    const text = String(value ?? "").trim();
    return !text || text === "[]" || text === "{}" || /^desolve\s*\(/i.test(text) || /^deSolve\s*\(/i.test(text);
  }

  function identifierPresent(text, name) {
    const escaped = String(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(String(text || ""));
  }

  function tiFormat(text, independent, dependent, constantName) {
    let out = String(text ?? "").trim();
    if (dependent && independent) out = out.split(`${dependent}(${independent})`).join(dependent);
    out = out
      .replace(/\blog\(/g, "ln(")
      .replace(/\bAbs\(/g, "abs(")
      .replace(/\*\*/g, "^")
      .replace(/\bE\b/g, "e")
      .replace(/\bpi\b/g, "π")
      .replace(/\binfinity\b/gi, "∞");
    if (constantName) out = out.replace(/\bC\d+\b/g, constantName);
    return out;
  }

  function bindingString(original, expression) {
    const [value, error, handled] = normalizeBindingResult(original(expression));
    if (!handled || value == null) return { ok: false, value: "", error };
    const text = String(value).trim();
    if (!text || /^(?:error|syntax error|parse error)/i.test(text)) return { ok: false, value: text, error: error || text };
    return { ok: true, value: text, error: null };
  }

  function parseExplicitFirstOrder(call) {
    if (!call || call.args.length < 3) return null;
    const equation = call.args[0];
    const independent = call.args[1].trim();
    const dependent = call.args[2].trim();
    const derivative = `${dependent}'`;
    const [lhs, rhs] = splitTopLevelEquality(equation);
    if (lhs.replace(/\s+/g, "") === derivative) return { rhs, independent, dependent };
    if (rhs.replace(/\s+/g, "") === derivative) return { rhs: lhs, independent, dependent };
    return null;
  }

  function giacSeparableFallback(expression, original) {
    const call = parseCall(expression, ["deSolve", "desolve"]);
    const parsed = parseExplicitFirstOrder(call);
    if (!parsed) return null;
    const { rhs, independent, dependent } = parsed;

    try {
      const factoredResult = bindingString(original, `factor(${rhs})`);
      if (!factoredResult.ok) return null;
      const factored = factoredResult.value;

      // Build F(x) from a safe numeric substitution y=a, then G(y)=R/F.
      // This avoids needing a second symbolic parser while still checking the
      // separation identity with Giac before integrating.
      const candidates = [0, 1, 2, -1, 3, -2, 4, 5];
      let fx = null;
      let gy = null;
      for (const sample of candidates) {
        const fxResult = bindingString(original, `simplify(subst((${factored}),${dependent},${sample}))`);
        if (!fxResult.ok) continue;
        const candidateFx = fxResult.value;
        if (!candidateFx || candidateFx === "0" || identifierPresent(candidateFx, dependent)) continue;

        const gyResult = bindingString(original, `simplify((${factored})/(${candidateFx}))`);
        if (!gyResult.ok) continue;
        const candidateGy = gyResult.value;
        if (!candidateGy || identifierPresent(candidateGy, independent)) continue;

        const verify = bindingString(original, `simplify((${factored})-((${candidateFx})*(${candidateGy})))`);
        if (!verify.ok || !/^0(?:\.0+)?$/.test(verify.value)) continue;
        fx = candidateFx;
        gy = candidateGy;
        break;
      }
      if (!fx || !gy) return null;

      const leftResult = bindingString(original, `integrate(1/(${gy}),${dependent})`);
      const rightResult = bindingString(original, `integrate((${fx}),${independent})`);
      if (!leftResult.ok || !rightResult.ok) return null;
      if (/\b(?:integrate|int)\s*\(/i.test(leftResult.value) || /\b(?:integrate|int)\s*\(/i.test(rightResult.value)) return null;

      state.constantCounter += 1;
      const constantName = `c${state.constantCounter}`;
      state.lastFallback = "giac-separable";
      state.lastFallbackError = null;
      return {
        value: tiFormat(`${leftResult.value}=${rightResult.value}+${constantName}`, independent, dependent, constantName),
        backend: "giac-separable"
      };
    } catch (error) {
      state.lastFallbackError = String(error?.message || error);
      return null;
    }
  }

  function sympyOdeFallback(expression) {
    const call = parseCall(expression, ["deSolve", "desolve"]);
    if (!call || call.args.length < 3 || state.sympyStatus !== "ready") return null;
    const runtime = getPyodideRuntime();
    if (!runtime) return null;

    const equation = call.args[0];
    const independent = call.args[1];
    const dependent = call.args[2];
    state.constantCounter += 1;
    const constantName = `c${state.constantCounter}`;

    try {
      runtime.globals.set("__tns_ode_equation", equation);
      runtime.globals.set("__tns_ode_independent", independent);
      runtime.globals.set("__tns_ode_dependent", dependent);
      runtime.globals.set("__tns_ode_constant", constantName);
      const raw = runtime.runPython(`
import sympy as sp
_eq_text = str(__tns_ode_equation).strip()
_x_name = str(__tns_ode_independent).strip()
_y_name = str(__tns_ode_dependent).strip()
_const_name = str(__tns_ode_constant).strip()
_x = sp.Symbol(_x_name)
_yf = sp.Function(_y_name)
_yx = _yf(_x)
_work = _eq_text.replace('^', '**').replace('π', 'pi')
_locals = {_x_name:_x, _y_name:_yx, 'ln':sp.log, 'log':sp.log, 'sqrt':sp.sqrt,
           'sin':sp.sin, 'cos':sp.cos, 'tan':sp.tan, 'asin':sp.asin, 'acos':sp.acos,
           'atan':sp.atan, 'exp':sp.exp, 'abs':sp.Abs, 'pi':sp.pi, 'e':sp.E}
for _order in range(6,0,-1):
    _token='__D%s__' % _order
    _work=_work.replace(_y_name+("'"*_order),_token)
    _locals[_token]=sp.diff(_yx,_x,_order)
if '=' in _work:
    _lhs_text,_rhs_text=_work.split('=',1)
else:
    _lhs_text,_rhs_text=_work,'0'
_lhs=sp.sympify(_lhs_text,locals=_locals)
_rhs=sp.sympify(_rhs_text,locals=_locals)
_ode=sp.Eq(_lhs,_rhs)
_d1=sp.diff(_yx,_x)
_result=None
_backend='sympy-dsolve'
try:
    _solved=sp.solve(_ode,_d1)
    if _solved:
        _F=sp.cancel(_solved[0])
        _Y=sp.Symbol('__Y__')
        _Fxy=_F.xreplace({_yx:_Y})
        _sep=sp.separatevars(_Fxy,symbols=[_x,_Y],dict=True,force=True)
        if isinstance(_sep,dict) and _x in _sep and _Y in _sep:
            _coeff=_sep.get('coeff',sp.Integer(1))
            _left=sp.integrate(1/_sep[_Y],_Y)
            _right=sp.integrate(_coeff*_sep[_x],_x)
            if not _left.has(sp.Integral) and not _right.has(sp.Integral):
                _left=_left.xreplace({_Y:_yx})
                _result=sp.sstr(_left)+'='+sp.sstr(_right)+'+'+_const_name
                _backend='sympy-separable'
except Exception:
    _result=None
if _result is None:
    try:
        _sol=sp.dsolve(_ode,_yx)
        if isinstance(_sol,(list,tuple)):_sol=_sol[0] if _sol else None
        if isinstance(_sol,sp.Equality):_result=sp.sstr(_sol.lhs)+'='+sp.sstr(_sol.rhs)
        elif _sol is not None:_result=sp.sstr(_sol)
    except Exception:
        _result=None
'__TNS_NO_SOLUTION__' if _result is None else _result+'|||BACKEND:'+_backend
`);
      const text = String(raw ?? "").trim();
      if (!text || text === "__TNS_NO_SOLUTION__") return null;
      const marker = "|||BACKEND:";
      const at = text.lastIndexOf(marker);
      const backend = at >= 0 ? text.slice(at + marker.length).trim() : "sympy";
      const value = at >= 0 ? text.slice(0, at) : text;
      state.lastFallback = backend;
      state.lastFallbackError = null;
      return { value: tiFormat(value, independent, dependent, constantName), backend };
    } catch (error) {
      state.sympyError = String(error?.message || error);
      state.lastFallbackError = state.sympyError;
      return null;
    } finally {
      for (const key of ["__tns_ode_equation","__tns_ode_independent","__tns_ode_dependent","__tns_ode_constant"]) {
        try { runtime.globals.delete(key); } catch (_error) {}
      }
    }
  }

  function codeMayNeedSympy(code) {
    const source = String(code || "");
    if (/\bdeSolve\s*\(/i.test(source)) return true;
    const calls = source.match(/math\.(?:evalStr|eval)\s*\(/g) || [];
    const literalCalls = source.match(/math\.(?:evalStr|eval)\s*\(\s*["']/g) || [];
    return calls.length > literalCalls.length;
  }

  function wrapBinding(original, mode) {
    return (expression) => {
      state.lastExpression = String(expression ?? "");

      if (isIntegral(expression)) return normalizeBindingResult(original(translateIntegralAlias(expression)));

      const first = normalizeBindingResult(original(expression));
      const [value, _error, handled] = first;
      if (!isDeSolve(expression) || (handled && !unresolvedOdeValue(value))) return first;

      const giacFallback = giacSeparableFallback(expression, original);
      if (giacFallback) {
        logFallback(`deSolve resuelto con fallback separable Giac (${giacFallback.value}).`);
        if (mode === "evalStr") return [giacFallback.value, null, true];
        return [null, "incompatible data type", true];
      }

      const sympyFallback = sympyOdeFallback(expression);
      if (sympyFallback) {
        logFallback(`deSolve resuelto con ${sympyFallback.backend}.`);
        if (mode === "evalStr") return [sympyFallback.value, null, true];
        return [null, "incompatible data type", true];
      }

      logFallback(`deSolve siguió sin solución; Giac devolvió ${String(value)}${state.lastFallbackError ? `; fallback: ${state.lastFallbackError}` : ""}.`);
      return first;
    };
  }

  window.TnsCasHybrid = {
    version: HYBRID_VERSION,
    state,
    ensureSympy,
    parseCall,
    splitTopLevelArgs,
    splitTopLevelEquality,
    translateIntegralAlias,
    giacSeparableFallback,
    sympyOdeFallback,
    getStatus() {
      return {
        version: state.version,
        sympyStatus: state.sympyStatus,
        sympyError: state.sympyError,
        constantCounter: state.constantCounter,
        lastFallback: state.lastFallback,
        lastExpression: state.lastExpression,
        lastFallbackError: state.lastFallbackError
      };
    }
  };

  const baseCreateLuaJsPreviewRuntime = window.createLuaJsPreviewRuntime;
  if (typeof baseCreateLuaJsPreviewRuntime !== "function") {
    console.warn("TNS CAS Hybrid v2: createLuaJsPreviewRuntime no está disponible.");
    return;
  }

  window.createLuaJsPreviewRuntime = async function (code, ctx, canvas, logEl, symbols = {}) {
    state.logEl = logEl;
    if (codeMayNeedSympy(code)) {
      appendLog(logEl, "CAS Hybrid v2: preparando SymPy como fallback secundario de EDO...");
      const ready = await ensureSympy();
      if (ready) appendLog(logEl, "CAS Hybrid v2: SymPy listo.");
      else appendLog(logEl, `CAS Hybrid v2: SymPy no disponible (${state.sympyError || "error desconocido"}).`);
    }

    const variables = { ...(symbols?.variables || {}) };
    if (typeof variables.__tnsCasEvalStr === "function") variables.__tnsCasEvalStr = wrapBinding(variables.__tnsCasEvalStr, "evalStr");
    if (typeof variables.__tnsCasEval === "function") variables.__tnsCasEval = wrapBinding(variables.__tnsCasEval, "eval");

    return baseCreateLuaJsPreviewRuntime(code, ctx, canvas, logEl, { ...(symbols || {}), variables });
  };

  window.__tnsCasHybridInstalled = true;
})();
