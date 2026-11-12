import {createMathContext, evaluate, expressionTree} from './math.js';

// Stored TI values are data, not JavaScript. Keep matrix rows, booleans,
// Unicode minus and TI's doubled quotation marks intact when loading Lua.
export function parseStoredTiValue(source, type = '') {
  const text = String(source ?? '').trim();
  const split = (body, separator = ',') => {
    const parts = []; let start = 0, depth = 0, quote = false;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (ch === '"') { if (quote && body[i + 1] === '"') { i++; continue; } quote = !quote; }
      if (!quote) {
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        if (ch === separator && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
      }
    }
    if (quote || depth) throw new Error('Malformed stored TI value.');
    parts.push(body.slice(start)); return parts;
  };
  function parse(value, nested = false) {
    value = value.trim();
    if (/^"(?:[^"\n]|"")*"$/u.test(value)) return value.slice(1, -1).replace(/""/g, '"');
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
    const normalized = value.replace(/[−–]/g, '-');
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return Number(normalized);
    // Native exact-number lists may contain rationals instead of decimal
    // approximations. Evaluate only an arithmetic literal here; do not run
    // arbitrary stored calls while importing a document.
    if (/^[\d\s.+\-*/^()]+$/.test(normalized) && /\d/.test(normalized)) {
      const result = evaluate(expressionTree(normalized), Object.create(null), 'RAD', createMathContext());
      if (typeof result === 'number' && Number.isFinite(result)) return result;
      throw new Error('Invalid stored TI arithmetic literal.');
    }
    if (value.startsWith('{') && value.endsWith('}')) return value.length === 2 ? [] : split(value.slice(1, -1)).map(part => parse(part, true));
    if (value.startsWith('[[') && value.endsWith(']]')) {
      const rows = []; const body = value.slice(1, -1); let start = 0, depth = 0, quote = false;
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === '"') { if (quote && body[i + 1] === '"') { i++; continue; } quote = !quote; }
        if (quote) continue;
        if (ch === '[') { if (!depth) start = i + 1; depth++; }
        if (ch === ']' && --depth === 0) rows.push(split(body.slice(start, i)).map(part => parse(part, true)));
      }
      if (quote || depth || !rows.length || rows.some(row => row.length !== rows[0].length)) throw new Error('Malformed stored TI matrix.');
      return rows;
    }
    // A type-4 <v> contains the string itself, without quotation marks.
    if (String(type) === '4' && !nested) return value;
    if (/^[−-]?∞$/.test(value)) return value.startsWith('−') || value.startsWith('-') ? -Infinity : Infinity;
    // Symbolic entries and undef must retain their identity rather than
    // becoming zero or a hole in a Lua table.
    if (nested && /^(?:undef|[\p{L}_][\p{L}\p{N}_.]*)$/u.test(value)) return value;
    throw new Error('Unsupported stored TI value: ' + value.slice(0, 100));
  }
  return parse(text);
}

