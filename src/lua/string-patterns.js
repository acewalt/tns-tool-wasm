/* Lua 5.1 patterns are a language, not JavaScript regular expressions.
 * Semantics reference: https://www.lua.org/manual/5.1/manual.html#5.4.1
 * In particular %w excludes '_', %b is balanced, () captures a position,
 * and the ^ anchor is deliberately not special in string.gmatch.
 */
const stringArg = value => {
  if (typeof value !== 'string' && typeof value !== 'number') throw Error('string expected');
  return String(value);
};
const numberArg = value => { const n = Number(value); if (!Number.isFinite(n)) throw Error('number expected'); return n; };
const cloneCaptures = captures => captures.map(value => value && { ...value });

function inClass(char, kind) {
  const c = char.charCodeAt(0), lower = kind.toLowerCase();
  let value;
  switch (lower) {
    case 'a': value = c >= 65 && c <= 90 || c >= 97 && c <= 122; break;
    case 'c': value = c < 32 || c === 127; break;
    case 'd': value = c >= 48 && c <= 57; break;
    case 'l': value = c >= 97 && c <= 122; break;
    case 'p': value = c >= 33 && c <= 126 && !(c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122); break;
    case 's': value = c === 32 || c >= 9 && c <= 13; break;
    case 'u': value = c >= 65 && c <= 90; break;
    case 'w': value = c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122; break;
    case 'x': value = c >= 48 && c <= 57 || c >= 65 && c <= 70 || c >= 97 && c <= 102; break;
    case 'z': value = c === 0; break;
    default: return char === kind;
  }
  return kind === lower ? value : !value;
}

function readSet(pattern, start) {
  let cursor = start + 1, inverse = pattern[cursor] === '^';
  if (inverse) cursor++;
  const members = [];
  // ']' is a literal when it is the first set member, just as in Lua.
  do {
    if (cursor >= pattern.length) throw Error("malformed pattern (missing ']')");
    const first = pattern[cursor++];
    if (first === '%') {
      if (cursor >= pattern.length) throw Error("malformed pattern (missing ']')");
      members.push({ kind: pattern[cursor++] });
    } else if (pattern[cursor] === '-' && cursor + 1 < pattern.length && pattern[cursor + 1] !== ']') {
      cursor++; members.push({ from: first.charCodeAt(0), to: pattern[cursor++].charCodeAt(0) });
    } else members.push({ literal: first });
  } while (pattern[cursor] !== ']');
  return { end: cursor + 1, test: char => {
    const c = char.charCodeAt(0);
    const found = members.some(item => item.kind != null ? inClass(char, item.kind) : item.literal != null ? char === item.literal : c >= item.from && c <= item.to);
    return inverse ? !found : found;
  } };
}

function compile(pattern, anchored = true) {
  const tokens = [], pending = [];
  let index = 0, captures = 0;
  const anchor = anchored && pattern[0] === '^';
  if (anchor) index++;
  while (index < pattern.length) {
    const c = pattern[index++]; let token;
    if (c === '(') {
      if (captures === 32) throw Error('too many captures');
      const id = captures++;
      if (pattern[index] === ')') { index++; token = { type: 'position', id }; }
      else { pending.push(id); token = { type: 'open', id }; }
    } else if (c === ')') {
      if (!pending.length) throw Error('invalid pattern capture');
      token = { type: 'close', id: pending.pop() };
    } else if (c === '$' && index === pattern.length) token = { type: 'end' };
    else if (c === '%' && pattern[index] === 'b') {
      if (index + 2 >= pattern.length) throw Error('unbalanced pattern');
      token = { type: 'balance', open: pattern[index + 1], close: pattern[index + 2] }; index += 3;
    } else if (c === '%' && pattern[index] === 'f') {
      index++; if (pattern[index] !== '[') throw Error("missing '[' after '%f' in pattern");
      const set = readSet(pattern, index); index = set.end; token = { type: 'frontier', test: set.test };
    } else if (c === '%' && /[0-9]/.test(pattern[index] || ' ')) {
      token = { type: 'reference', id: Number(pattern[index++]) - 1 };
    } else {
      let test;
      if (c === '[') { const set = readSet(pattern, index - 1); index = set.end; test = set.test; }
      else if (c === '%') { if (index === pattern.length) throw Error("malformed pattern (ends with '%')"); const kind = pattern[index++]; test = char => inClass(char, kind); }
      else test = c === '.' ? () => true : char => char === c;
      const quantifier = '*+?-'.includes(pattern[index] || ' ') ? pattern[index++] : '';
      token = { type: 'character', test, quantifier };
    }
    tokens.push(token);
  }
  if (pending.length) throw Error('unfinished capture');
  return { tokens, captures, anchor };
}

function engine(source, parsed) {
  let steps = 0;
  const tick = () => { if (++steps > 1000000) throw Error('Lua pattern operation limit exceeded'); };
  function match(position, tokenIndex, captures, depth = 0) {
    if (depth > 500) throw Error('Lua pattern is too complex');
    while (tokenIndex < parsed.tokens.length) {
      tick(); const token = parsed.tokens[tokenIndex++];
      if (token.type === 'open') captures[token.id] = { start: position, end: null };
      else if (token.type === 'close') captures[token.id].end = position;
      else if (token.type === 'position') captures[token.id] = { position: position + 1 };
      else if (token.type === 'end') { if (position !== source.length) return null; }
      else if (token.type === 'reference') {
        const cap = captures[token.id]; if (!cap || cap.end == null) throw Error('invalid capture index');
        const text = source.slice(cap.start, cap.end); if (!source.startsWith(text, position)) return null; position += text.length;
      } else if (token.type === 'frontier') {
        if (token.test(position ? source[position - 1] : '\0') || !token.test(source[position] ?? '\0')) return null;
      } else if (token.type === 'balance') {
        if (source[position] !== token.open) return null;
        let nesting = 1; position++;
        while (position < source.length && nesting) { tick(); const c = source[position++]; if (c === token.close) nesting--; else if (c === token.open) nesting++; }
        if (nesting) return null;
      } else {
        const fits = offset => offset < source.length && token.test(source[offset]);
        if (!token.quantifier) { if (!fits(position)) return null; position++; continue; }
        if (token.quantifier === '?') {
          if (fits(position)) { const result = match(position + 1, tokenIndex, cloneCaptures(captures), depth + 1); if (result) return result; }
          continue;
        }
        const minimum = token.quantifier === '+' ? 1 : 0;
        if (minimum && !fits(position)) return null;
        if (token.quantifier === '-') {
          let end = position;
          for (;;) { const result = match(end, tokenIndex, cloneCaptures(captures), depth + 1); if (result) return result; if (!fits(end)) return null; tick(); end++; }
        }
        let end = position + minimum;
        while (fits(end)) { tick(); end++; }
        for (; end >= position + minimum; end--) { const result = match(end, tokenIndex, cloneCaptures(captures), depth + 1); if (result) return result; }
        return null;
      }
    }
    return { end: position, captures };
  }
  return { at(position) { tick(); return match(position, 0, []); } };
}

function values(source, start, result, wholeWhenEmpty = true) {
  return result.captures.length ? result.captures.map(cap => cap.position ?? source.slice(cap.start, cap.end)) : wholeWhenEmpty ? [source.slice(start, result.end)] : [];
}
function initialPosition(value, length) {
  let start = value == null ? 1 : Math.trunc(numberArg(value));
  if (start < 0) start = length + start + 1;
  // Lua 5.1 clamps positions beyond the end (5.4 changed this behavior).
  return Math.min(length, Math.max(0, start - 1));
}
function search(source, parsed, start) {
  const matcher = engine(source, parsed);
  for (let index = start; index <= source.length; index++) {
    const result = matcher.at(index); if (result) return { start: index, ...result };
    if (parsed.anchor) break;
  }
  return null;
}
export function luaStringFind(source, pattern, init, plain) {
  const text = stringArg(source), needle = stringArg(pattern), start = initialPosition(init, text.length);
  if (plain != null && plain !== false || !/[$^*+?.([%\-]/.test(needle)) { const found = text.indexOf(needle, start); return found < 0 ? [null] : [found + 1, found + needle.length]; }
  const found = search(text, compile(needle), start);
  return found ? [found.start + 1, found.end, ...values(text, found.start, found, false)] : [null];
}
export function luaStringMatch(source, pattern, init) {
  const text = stringArg(source), found = search(text, compile(stringArg(pattern)), initialPosition(init, text.length));
  return found ? values(text, found.start, found) : [null];
}
export function createLuaStringGmatch(source, pattern) {
  const text = stringArg(source), parsed = compile(stringArg(pattern), false);
  let position = 0, ended = false;
  return () => {
    if (ended) return [];
    const found = search(text, parsed, position);
    if (!found) { ended = true; return []; }
    position = found.end + (found.end === found.start ? 1 : 0); ended = position > text.length;
    return values(text, found.start, found);
  };
}
export function luaStringGsub(source, pattern, replacement, limit, adapter = {}) {
  const text = stringArg(source), parsed = compile(stringArg(pattern)), matcher = engine(text, parsed);
  if (!['string', 'number', 'function', 'object'].includes(typeof replacement) || replacement == null) throw Error('string/function/table expected');
  const maximum = limit == null ? text.length + 1 : Math.max(0, Math.trunc(numberArg(limit)));
  let position = 0, count = 0; const output = [];
  while (count < maximum) {
    const found = matcher.at(position);
    if (found) {
      count++;
      const whole = text.slice(position, found.end), captures = values(text, position, found);
      let result;
      if (typeof replacement === 'function') result = (adapter.call ? adapter.call(replacement, captures) : replacement(...captures));
      else if (typeof replacement === 'object') result = adapter.get ? adapter.get(replacement, captures[0]) : replacement[captures[0]];
      else {
        const value = String(replacement); result = '';
        for (let i = 0; i < value.length; i++) {
          if (value[i] !== '%') result += value[i];
          else {
            const next = value[++i];
            if (next === '0') result += whole;
            else if (/[1-9]/.test(next || ' ')) { const capture = captures[Number(next) - 1]; if (capture == null) throw Error('invalid capture index'); result += capture; }
            else if (next != null) result += next;
            else result += '\0'; // Lua 5.1's trailing escape copies its terminator.
          }
        }
      }
      if (result == null || result === false) result = whole;
      if (typeof result !== 'string' && typeof result !== 'number') throw Error('invalid replacement value');
      output.push(String(result));
    }
    if (found && found.end > position) position = found.end;
    else if (position < text.length) output.push(text[position++]);
    else break;
    if (parsed.anchor) break;
  }
  output.push(text.slice(position));
  return [output.join(''), count];
}

export function installLuaStringPatterns(global) {
  const table = global.G?.str?.string;
  if (!table) throw Error('Lua string library is unavailable');
  global.lua_tableset(table, 'find', luaStringFind);
  global.lua_tableset(table, 'match', luaStringMatch);
  global.lua_tableset(table, 'gmatch', (source, pattern) => [createLuaStringGmatch(source, pattern)]);
  global.lua_tableset(table, 'gsub', (source, pattern, replacement, limit) => luaStringGsub(source, pattern, replacement, limit, {
    call: (fn, args) => global.lua_call(fn, args)[0], get: (target, key) => global.lua_tableget(target, key),
  }));
}
