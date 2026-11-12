import { createCalculatorSession } from '../prgm/calculator-session.js';
import { createMathSession } from '../prgm/math-api.js';

export {parseStoredTiValue} from '../prgm/stored-values.js';

export function toLuaDocumentValue(global, value) {
  if (Array.isArray(value)) return global.lua_newtable(value.map(child => toLuaDocumentValue(global, child)));
  return value;
}
export function fromLuaDocumentValue(global, value, seen = new Set()) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(child => fromLuaDocumentValue(global, child, seen));
  if (!value.uints || !value.str) throw new Error('Only TI values can be stored in document variables.');
  if (seen.has(value)) throw new Error('A recursive Lua table cannot be stored as a TI value.');
  seen.add(value);
  const result = [];
  for (let i = 1; i <= global.lua_len(value); i++) result.push(fromLuaDocumentValue(global, global.lua_tableget(value, i), seen));
  seen.delete(value); return result;
}

export function installLuaDocumentBindings(global, options = {}) {
  const variables = options.variables || Object.create(null);
  const math = options.mathSession || createMathSession({ variables, language: options.language || 'en' });
  if (math.variables !== variables) for (const [name, value] of Object.entries(variables)) {
    const normalized=name.toLowerCase();
    if (!Object.hasOwn(math.variables, normalized)) math.variables[normalized] = value;
  }
  const definitions = { ...(options.basicFunctions || {}) };
  const programs = () => Object.entries(definitions).map(([name, definition]) => ({
    name, parameters: definition.params || '', source: definition.body || '', documentType: definition.documentType || 'Func',
  }));
  let calculator = createCalculatorSession({ mathSession: math, getPrograms: programs });
  const varTable = global.G.str.var, mathTable = global.G.str.math;
  const key = name => String(name).toLowerCase();
  const errorResult = error => { options.onError?.(error); return [null, String(error.code || error.message || error)]; };
  const recall = name => {
    const normalized = key(name);
    return Object.hasOwn(math.variables, normalized) ? toLuaDocumentValue(global, math.variables[normalized]) : null;
  };
  global.lua_tableset(varTable, 'recall', name => [recall(name)]);
  global.lua_tableset(varTable, 'recallstr', name => {
    const value = math.variables[key(name)];
    return [value === undefined ? null : typeof value === 'string' ? value : calculator.format(value)];
  });
  global.lua_tableset(varTable, 'store', (name, value) => {
    const normalized = key(name), raw = fromLuaDocumentValue(global, value);
    if (raw == null) { delete math.variables[normalized]; delete variables[normalized]; }
    else { math.variables[normalized] = raw; variables[normalized] = raw; }
    options.onStore?.(normalized, raw);
    return [];
  });
  global.lua_tableset(varTable, 'list', () => [global.lua_newtable(Object.keys(math.variables))]);
  // monitor() registers a name; it does not manufacture a value for it.
  const monitored = new Set();
  global.lua_tableset(varTable, 'monitor', name => { monitored.add(key(name)); return [0]; });
  global.lua_tableset(varTable, 'unmonitor', name => { monitored.delete(key(name)); return []; });
  const evaluate = (source, asString = false) => {
    try {
      const text = String(source ?? '').trim();
      const definition = /^Define\s+(?:(?:LibPub|LibPriv)\s+)?([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*((?:Func|Prgm)\b[\s\S]*)$/iu.exec(text);
      if (definition) {
        definitions[definition[1]] = { params: definition[2], body: definition[3], documentType: /^Func\b/i.test(definition[3]) ? 'Func' : 'Prgm' };
        calculator = createCalculatorSession({ mathSession: math, getPrograms: programs });
        return [null];
      }
      const result = math.evaluate(text);
      if (result.stored) options.onStore?.(key(result.stored), math.variables[key(result.stored)]);
      return [asString ? result.display : toLuaDocumentValue(global, result.value ?? null)];
    } catch (error) { return errorResult(error); }
  };
  const evalBinding = source => evaluate(source);
  evalBinding.__tnsDocumentScope = true;
  global.lua_tableset(mathTable, 'eval', evalBinding);
  global.lua_tableset(mathTable, 'evalStr', source => evaluate(source, true));
  for (const [name] of Object.entries(definitions)) if (/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)) {
    global.G.str[name] = (...args) => {
      const fn = math.context.functions[key(name)];
      if (!fn) throw new Error('Stored TI function is unavailable: ' + name);
      return [toLuaDocumentValue(global, fn.invoke(args.map(arg => fromLuaDocumentValue(global, arg))))];
    };
  }
  return { variables: math.variables, math, evaluate, monitored };
}
