(() => {
  "use strict";

  const HYBRID_VERSION = "2026-09-03-ti-cas-hybrid-v1";
  const state = {
    version: HYBRID_VERSION,
    sympyStatus: "idle",
    sympyError: null,
    sympyLoadPromise: null,
    constantCounter: 0,
    lastFallback: null,
    lastExpression: ""
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
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  }

  function parseCall(expression, names) {
    const source = String(expression || "").trim();
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)\s*$/.exec(source);
    if (!match) return null;
    const allowed = new Set(Array.from(names || [], (name) => String(name).toLowerCase()));
    if (!allowed.has(match[1].toLowerCase())) return null;
    return { name: match[1], args: splitTopLevelArgs(match[2]) };
  }

  function isDeSolve(expression) {
    return !!parseCall(expression, ["deSolve", "desolve"]);
  }

  function isIntegral(expression) {
    return !!parseCall(expression, ["integral"]);
  }

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

  function tiFormat(text, independent, dependent, constantName) {
    let out = String(text ?? "").trim();
    if (dependent && independent) {
      const needle = `${dependent}(${independent})`;
      out = out.split(needle).join(dependent);
    }
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
_locals = {
    _x_name: _x,
    _y_name: _yx,
    'ln': sp.log,
    'log': sp.log,
    'sqrt': sp.sqrt,
    'sin': sp.sin,
    'cos': sp.cos,
    'tan': sp.tan,
    'asin': sp.asin,
    'acos': sp.acos,
    'atan': sp.atan,
    'exp': sp.exp,
    'abs': sp.Abs,
    'pi': sp.pi,
    'e': sp.E,
}
for _order in range(6, 0, -1):
    _token = '__D%s__' % _order
    _work = _work.replace(_y_name + ("'" * _order), _token)
    _locals[_token] = sp.diff(_yx, _x, _order)

if '=' in _work:
    _lhs_text, _rhs_text = _work.split('=', 1)
else:
    _lhs_text, _rhs_text = _work, '0'
_lhs = sp.sympify(_lhs_text, locals=_locals)
_rhs = sp.sympify(_rhs_text, locals=_locals)
_ode = sp.Eq(_lhs, _rhs)
_d1 = sp.diff(_yx, _x)
_result = None
_backend = 'sympy-dsolve'

# TI-like first-order separable fallback: build the implicit solution directly.
try:
    _solved = sp.solve(_ode, _d1)
    if _solved:
        _F = sp.cancel(_solved[0])
        _Y = sp.Symbol('__Y__')
        _Fxy = _F.xreplace({_yx: _Y})
        _sep = sp.separatevars(_Fxy, symbols=[_x, _Y], dict=True, force=True)
        if isinstance(_sep, dict) and _x in _sep and _Y in _sep:
            _coeff = _sep.get('coeff', sp.Integer(1))
            _fx = _sep[_x]
            _fy = _sep[_Y]
            _left = sp.integrate(1 / _fy, _Y)
            _right = sp.integrate(_coeff * _fx, _x)
            if not _left.has(sp.Integral) and not _right.has(sp.Integral):
                _left = _left.xreplace({_Y: _yx})
                _result = sp.sstr(_left) + '=' + sp.sstr(_right) + '+' + _const_name
                _backend = 'separable-fallback'
except Exception:
    _result = None

if _result is None:
    try:
        _sol = sp.dsolve(_ode, _yx)
        if isinstance(_sol, (list, tuple)):
            _sol = _sol[0] if _sol else None
        if isinstance(_sol, sp.Equality):
            _result = sp.sstr(_sol.lhs) + '=' + sp.sstr(_sol.rhs)
        elif _sol is not None:
            _result = sp.sstr(_sol)
    except Exception:
        _result = None

if _result is None:
    '__TNS_NO_SOLUTION__'
else:
    _result + '|||BACKEND:' + _backend
`);
      const text = String(raw ?? "").trim();
      if (!text || text === "__TNS_NO_SOLUTION__") return null;
      const marker = "|||BACKEND:";
      const at = text.lastIndexOf(marker);
      const backend = at >= 0 ? text.slice(at + marker.length).trim() : "sympy";
      const value = at >= 0 ? text.slice(0, at) : text;
      state.lastFallback = backend;
      return {
        value: tiFormat(value, independent, dependent, constantName),
        backend
      };
    } catch (error) {
      state.sympyError = String(error?.message || error);
      return null;
    } finally {
      for (const key of ["__tns_ode_equation", "__tns_ode_independent", "__tns_ode_dependent", "__tns_ode_constant"]) {
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

      if (isIntegral(expression)) {
        const translated = translateIntegralAlias(expression);
        return normalizeBindingResult(original(translated));
      }

      const first = normalizeBindingResult(original(expression));
      const [value, error, handled] = first;
      if (!isDeSolve(expression) || (handled && !unresolvedOdeValue(value))) return first;

      const fallback = sympyOdeFallback(expression);
      if (!fallback) return first;
      if (mode === "evalStr") return [fallback.value, null, true];
      return [null, "incompatible data type", true];
    };
  }

  window.TnsCasHybrid = {
    version: HYBRID_VERSION,
    state,
    ensureSympy,
    parseCall,
    splitTopLevelArgs,
    translateIntegralAlias,
    sympyOdeFallback,
    getStatus() {
      return {
        version: state.version,
        sympyStatus: state.sympyStatus,
        sympyError: state.sympyError,
        constantCounter: state.constantCounter,
        lastFallback: state.lastFallback,
        lastExpression: state.lastExpression
      };
    }
  };

  const baseCreateLuaJsPreviewRuntime = window.createLuaJsPreviewRuntime;
  if (typeof baseCreateLuaJsPreviewRuntime !== "function") {
    console.warn("TNS CAS Hybrid: createLuaJsPreviewRuntime no está disponible.");
    return;
  }

  window.createLuaJsPreviewRuntime = async function (code, ctx, canvas, logEl, symbols = {}) {
    if (codeMayNeedSympy(code)) {
      appendLog(logEl, "CAS Hybrid: preparando SymPy como fallback de EDO...");
      const ready = await ensureSympy();
      if (ready) appendLog(logEl, "CAS Hybrid: SymPy listo.");
      else appendLog(logEl, `CAS Hybrid: SymPy no disponible (${state.sympyError || "error desconocido"}).`);
    }

    const variables = { ...(symbols?.variables || {}) };
    if (typeof variables.__tnsCasEvalStr === "function") {
      variables.__tnsCasEvalStr = wrapBinding(variables.__tnsCasEvalStr, "evalStr");
    }
    if (typeof variables.__tnsCasEval === "function") {
      variables.__tnsCasEval = wrapBinding(variables.__tnsCasEval, "eval");
    }

    return baseCreateLuaJsPreviewRuntime(code, ctx, canvas, logEl, {
      ...(symbols || {}),
      variables
    });
  };

  window.__tnsCasHybridInstalled = true;
})();
