// TI-BASIC expressions shared by Program Preview and the Calculator widget.
// This is a bounded parser/evaluator: source is never evaluated as JavaScript.
import {captureExactTree,exactExpressionText} from './exact-format.js';
export const IDENT = /^[\p{L}_][\p{L}\p{N}_]*$/u;
export const QUALIFIED_IDENT = /^[\p{L}_][\p{L}\p{N}_]*(?:\\[\p{L}_][\p{L}\p{N}_]*)*$/u;
export const key = value => String(value).toLowerCase();
export class PrgmError extends Error {
  constructor(code, message, line = 0) { super(message); this.code = code; this.line = line; }
  toJSON() { return { code: this.code, message: this.message, line: this.line }; }
}
export const fail = (code, message) => { throw new PrgmError(code, message); };
export function number(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('TYPE_ERROR', 'Se esperaba un número real finito.');
  return value;
}
export function truth(value) {
  if (typeof value === 'boolean') return value;
  fail('TYPE_ERROR', 'La condición debe ser verdadera o falsa.');
}
export function isMatrix(value) { return Array.isArray(value) && value.length > 0 && value.every(Array.isArray); }
export function formatPrgmValue(value) {
  if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(Number(value.toPrecision(6)));
  if (isMatrix(value)) return '[' + value.map(row => '[' + row.map(formatPrgmValue).join(',') + ']').join('') + ']';
  if (Array.isArray(value)) return '{' + value.map(formatPrgmValue).join(',') + '}';
  return String(value);
}
export function split(source, separator) {
  const parts = []; let start = 0, quote = '', depth = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === quote) { if (source[i + 1] === quote) { i++; continue; } quote = ''; } continue; }
    if (c === '"' || c === '“') { quote = c === '“' ? '”' : '"'; continue; }
    if ('({['.includes(c)) depth++;
    if (')}]'.includes(c)) depth--;
    if (c === separator && depth === 0 && !(c === ':' && source[i + 1] === '=')) { parts.push(source.slice(start, i)); start = i + 1; }
  }
  parts.push(source.slice(start)); return parts;
}
// TI's math font uses private glyphs for e and derivative. Keep strings intact.
export function normalizeTiMath(source) {
  let quote = '', out = ''; source = String(source ?? '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quote) { out += c; if (c === quote) { if (source[i + 1] === quote) out += source[++i]; else quote = ''; } continue; }
    if (c === '"' || c === '“') { quote = c === '“' ? '”' : '"'; out += c; continue; }
    const inverse = (i === 0 || !/[\p{L}\p{N}_]/u.test(source[i - 1])) && /^(sinh|cosh|tanh|sin|cos|tan)(?:⁻¹|\uF005)/i.exec(source.slice(i));
    if (inverse) { out += ({ sin: 'asin', cos: 'acos', tan: 'atan', sinh: 'asinh', cosh: 'acosh', tanh: 'atanh' })[key(inverse[1])]; i += inverse[0].length - 1; continue; }
    const conversion = (i === 0 || !/[\p{L}\p{N}_]/u.test(source[i - 1])) && /^(mat(?:[▶►]|@>)list|list(?:[▶►]|@>)mat)(?=\s*\()/i.exec(source.slice(i));
    if (conversion) { out += /^mat/i.test(conversion[0]) ? 'mat2list' : 'list2mat'; i += conversion[0].length - 1; continue; }
    out += ({ '\uF03F': 'ℯ', '\uF008': 'd', '∑': 'sumSeq', 'Σ': 'sumSeq', '∏': 'prodSeq', 'Π': 'prodSeq', '∫': 'integral', '′': "'", '″': "''", '²': '^2' }[c] ?? c);
  }
  return out;
}
function tokens(source) {
  const out = []; let i = 0; source = normalizeTiMath(source);
  const symbols = { '−': '-', '–': '-', '×': '*', '·': '*', '÷': '/', '≤': '<=', '≥': '>=', '≠': '!=', '√': 'sqrt', '\uF002': 'transpose' };
  while (i < source.length) {
    const c = source[i];
    if (/\s/u.test(c)) { i++; continue; }
    if (c === '"' || c === '“') {
      const end = c === '“' ? '”' : '"'; let text = '', closed = false; i++;
      while (i < source.length) { if (source[i] === end) { i++; if (source[i] === end) { text += end; i++; } else { closed = true; break; } } else text += source[i++]; }
      if (!closed) fail('SYNTAX_ERROR', 'Cadena sin comillas de cierre.'); out.push({ type: 'string', value: text }); continue;
    }
    const dms = /^(\d+(?:\.\d*)?)\s*°\s*(\d+(?:\.\d*)?)\s*'\s*(?:(\d+(?:\.\d*)?)\s*'')?/.exec(source.slice(i));
    if (dms) {
      const minutes = Number(dms[2]), seconds = Number(dms[3] || 0);
      if (minutes >= 60 || seconds >= 60) fail('DOMAIN_ERROR', 'Minutos y segundos deben ser menores de 60.');
      out.push({ type: 'number', value: (Number(dms[1]) + minutes / 60 + seconds / 3600) * Math.PI / 180, angle: true }); i += dms[0].length; continue;
    }
    if (/^0[bh]/i.test(source.slice(i))) {
      const based = /^0(b[01]+|h[0-9a-f]+)(?![\p{L}\p{N}_])/iu.exec(source.slice(i));
      if (!based) fail('SYNTAX_ERROR', 'Literal binario o hexadecimal no válido.');
      const value = Number.parseInt(based[1].slice(1), based[1][0].toLowerCase() === 'b' ? 2 : 16);
      if (!Number.isSafeInteger(value)) fail('UNSUPPORTED_PRECISION', 'Este entero excede la precisión exacta del preview numérico.');
      out.push({ type: 'number', value }); i += based[0].length; continue;
    }
    const numeric = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eEᴇ][+−-]?\d+)?/.exec(source.slice(i));
    if (numeric) { out.push({ type: 'number', value: Number(numeric[0].replace('ᴇ', 'e').replace('−', '-')) }); i += numeric[0].length; continue; }
    const id = /^[\p{L}_][\p{L}\p{N}_]*(?:\\[\p{L}_][\p{L}\p{N}_]*)*/u.exec(source.slice(i));
    if (id) { out.push({ type: 'id', value: key(id[0]) }); i += id[0].length; continue; }
    const pair = source.slice(i, i + 2);
    if (['<=', '>=', '!=', '<>', '=='].includes(pair)) { out.push({ type: 'op', value: pair }); i += 2; continue; }
    if(c==='?'){out.push({type:'id',value:c});i++;continue;}
    if ('+-*/^&=<>(),{}[]!°\'%∠|'.includes(c) || symbols[c]) { out.push({ type: 'op', value: symbols[c] || c }); i++; continue; }
    fail('UNSUPPORTED_EXPRESSION', 'Símbolo no soportado en una expresión: ' + c);
  }
  out.push({ type: 'end', value: '' }); return out;
}
const PRECEDENCE = { '|':0, or: 1, xor: 1, and: 2, '=': 3, '==': 3, '!=': 3, '<>': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, '&': 4, '+': 5, '-': 5, '*': 6, '/': 6, '^': 8 };
const comparisons=new Set(['=','==','!=','<>','<','>','<=','>=']);
export function expressionTree(source) {
  if (String(source).length > 100000) fail('RESOURCE_LIMIT', 'La expresión supera 100000 caracteres.');
  const ts = tokens(source); let at = 0;
  const peek = () => ts[at], take = () => ts[at++];
  const expect = v => { if (take().value !== v) fail('SYNTAX_ERROR', 'Se esperaba ' + v + '.'); };
  function sequence(end) { const args = []; if (peek().value !== end) { do { args.push(expr()); if (peek().value !== ',') break; take(); } while (true); } expect(end); return args; }
  function expr(min = 0) {
    const token = take(); let node;
    if (token.type === 'number' || token.type === 'string') node = { type: 'literal', value: token.value, ...(token.angle ? { angle: true } : {}) };
    else if (['+', '-', 'not'].includes(token.value)) node = { type: 'unary', op: token.value, arg: expr(token.value === 'not' ? 3 : 7) };
    else if (token.value === '∠') node = { type: 'polarAngle', arg: expr() };
    else if (token.value === '(') { node = {...expr(),grouped:true}; expect(')'); }
    else if (token.value === '{') node = { type: 'list', args: sequence('}') };
    else if (token.value === '[') {
      const rows = [];
      if (peek().value === '[') {
        do { expect('['); rows.push(sequence(']')); if (peek().value === ',' && ts[at + 1]?.value === '[') take(); } while (peek().value === '[');
        expect(']');
      } else rows.push(sequence(']'));
      if (!rows[0]?.length || rows.some(row => row.length !== rows[0].length)) fail('DIMENSION_ERROR', 'Las filas de una matriz deben tener la misma longitud.');
      if (rows.length * rows[0].length > 4096) fail('RESOURCE_LIMIT', 'La matriz supera 4096 celdas.');
      node = { type: 'matrix', rows };
    } else if (token.type === 'id' || token.value === 'sqrt') {
      if (peek().value === '(') { take(); node = { type: 'call', name: token.value, args: sequence(')') }; }
      else node = { type: 'variable', name: token.value };
    } else fail('SYNTAX_ERROR', 'Expresión incompleta cerca de «' + token.value + '».');
    while (true) {
      const next = peek();
      if (next.value === '[') { take(); node = { type: 'index', base: node, indices: sequence(']') }; continue; }
      if (['!', '°', '%', 'transpose'].includes(next.value)) { take(); node = { type: 'unary', op: next.value, arg: node }; continue; }
      let op = next.value, implicit = false;
      if ((next.type === 'number' || next.type === 'id' && !['and', 'or', 'xor'].includes(next.value) || next.value === '(') && PRECEDENCE[op] === undefined) { op = '*'; implicit = true; }
      const priority = PRECEDENCE[op]; if (priority === undefined || priority < min) break;
      if (!implicit) take();
      const right=expr(priority+(op==='^'?0:1));
      if(comparisons.has(op)&&node.type==='comparison'&&!node.grouped)node={type:'comparison',operands:[...node.operands,right],operators:[...node.operators,op]};
      else if(comparisons.has(op))node={type:'comparison',operands:[node,right],operators:[op]};
      else node = { type: 'binary', op, left: node, right };
    }
    return node;
  }
  const result = expr(); if (peek().type !== 'end') fail('SYNTAX_ERROR', 'Texto inesperado: ' + peek().value); return result;
}
function integer(value, min = -1e9, max = 1e9) { const n = number(value); if (!Number.isInteger(n) || n < min || n > max) fail('DOMAIN_ERROR', 'Se esperaba un entero entre ' + min + ' y ' + max + '.'); return n; }
function dimensions(value) { if (!isMatrix(value) || !value[0].length || value.some(row => row.length !== value[0].length)) fail('TYPE_ERROR', 'Se esperaba una matriz rectangular.'); return [value.length, value[0].length]; }
const matrix = (rows, cols, fn = () => 0) => { integer(rows, 1, 100); integer(cols, 1, 100); if (rows * cols > 4096) fail('RESOURCE_LIMIT', 'La matriz supera el límite de 4096 celdas del preview.'); return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => fn(r, c))); };
const identity = size => matrix(size, size, (r, c) => r === c ? 1 : 0);
const clone = value => Array.isArray(value) ? value.map(clone) : value;
function mapNumbers(value, fn) { return Array.isArray(value) ? value.map(item => mapNumbers(item, fn)) : fn(number(value)); }
function zipValues(a, b, fn) { if (!Array.isArray(a) && !Array.isArray(b)) return fn(number(a), number(b)); if (Array.isArray(a) && Array.isArray(b)) { if (a.length !== b.length) fail('DIMENSION_ERROR', 'Dimensiones incompatibles.'); return a.map((v, i) => zipValues(v, b[i], fn)); } return Array.isArray(a) ? a.map(v => zipValues(v, b, fn)) : b.map(v => zipValues(a, v, fn)); }
function multiply(a, b) {
  if (!isMatrix(a) || !isMatrix(b)) return zipValues(a, b, (x, y) => number(x * y));
  const [ar, ac] = dimensions(a), [br, bc] = dimensions(b); if (ac !== br) fail('DIMENSION_ERROR', 'El número de columnas debe coincidir con el de filas.');
  return matrix(ar, bc, (r, c) => a[r].reduce((sum, v, k) => sum + number(v) * number(b[k][c]), 0));
}
function elimination(input, reduced = true) {
  const [rows, cols] = dimensions(input), result = input.map(row => row.map(number)); let pivotRow = 0;
  for (let col = 0; col < cols && pivotRow < rows; col++) {
    let p = pivotRow; for (let r = p + 1; r < rows; r++) if (Math.abs(result[r][col]) > Math.abs(result[p][col])) p = r;
    if (Math.abs(result[p][col]) < 1e-12) continue;
    [result[p], result[pivotRow]] = [result[pivotRow], result[p]]; const scale = result[pivotRow][col]; result[pivotRow] = result[pivotRow].map(v => v / scale);
    for (let r = reduced ? 0 : pivotRow + 1; r < rows; r++) if (r !== pivotRow) { const factor = result[r][col]; result[r] = result[r].map((v, c) => v - factor * result[pivotRow][c]); }
    pivotRow++;
  }
  return result.map(row => row.map(v => Math.abs(v) < 1e-12 ? 0 : v));
}
function inverse(input) { const [rows, cols] = dimensions(input); if (rows !== cols) fail('DIMENSION_ERROR', 'La inversa requiere una matriz cuadrada.'); const full = elimination(input.map((row, r) => [...row, ...identity(rows)[r]])); if (full.some((row, r) => row.slice(0, cols).some((v, c) => Math.abs(v - (r === c ? 1 : 0)) > 1e-8))) fail('SINGULAR_MATRIX', 'La matriz es singular.'); return full.map(row => row.slice(cols)); }
function determinant(input) { const [n, cols] = dimensions(input); if (n !== cols) fail('DIMENSION_ERROR', 'El determinante requiere una matriz cuadrada.'); const a = input.map(row => row.map(number)); let result = 1; for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r; if (Math.abs(a[p][c]) < 1e-14) return 0; if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; result *= -1; } const v = a[c][c]; result *= v; for (let r = c + 1; r < n; r++) { const factor = a[r][c] / v; for (let k = c + 1; k < n; k++) a[r][k] -= factor * a[c][k]; } } return number(result); }
function seededRandom(seed) { let state = Number(seed) >>> 0; return () => { state += 0x6D2B79F5; let n = Math.imul(state ^ state >>> 15, 1 | state); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
export function createMathContext(options = {}) {
  return { random: options.random || (options.randomSeed === undefined ? Math.random : seededRandom(options.randomSeed)), getKey: typeof options.getKey === 'function' ? options.getKey : () => '', modes: { 1: 7, 2: options.angleMode === 'DEG' ? 2 : options.angleMode === 'GRAD' ? 3 : 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }, functions: Object.create(null), locks: new Set(), language: options.language || 'en', calls: 0, steps: 0, maxSteps: Math.min(500000, options.maxMathSteps || 100000) };
}
const NUMERIC_FUNCTIONS = 'string expr dim left right mid approx sqrt root abs floor ceiling ipart exp ln log sign sin cos tan asin acos atan arcsin arccos arctan sinh cosh tanh asinh acosh atanh sec csc cot min max round mod remain int intdiv fpart gcd lcm ncr npr rand randint randmat randseed newmat identity diag rowdim coldim det trace norm dotp unitv mat2list ref rref transpose augment colaugment submat rowswap rowadd mrow mrowadd newlist sum count product mean median stdevpop stdevsamp varpop varsamp seq sumseq prodseq piecewise when getmode setmode getlanginfo getplatform getlockinfo getkey char ord instring gettype isnumtype isvoid'.split(' ');
NUMERIC_FUNCTIONS.push('isprime','factor','list2mat');
export const supportedMathFunctions = Object.freeze([...NUMERIC_FUNCTIONS]);
function primeFactors(value,context){
  value=number(value);if(!Number.isSafeInteger(value))fail('DOMAIN_ERROR','La factorización numérica requiere un entero exacto.');
  const factors=[];let remaining=Math.abs(value);
  if(remaining<2)return [[value,1]];
  for(let divisor=2;divisor<=remaining/divisor;divisor+=divisor===2?1:2){
    if(++context.steps>context.maxSteps)fail('RESOURCE_LIMIT','La factorización supera el límite de operaciones del preview.');
    let count=0;while(remaining%divisor===0){remaining/=divisor;count++;}if(count)factors.push([divisor,count]);
  }
  if(remaining>1)factors.push([remaining,1]);if(value<0)factors.unshift([-1,1]);return factors;
}
export function formatExpressionValue(node,value,context=createMathContext()){
  if(node?.type==='call'&&node.name==='factor'&&typeof value==='number')return primeFactors(value,context).map(([base,power])=>String(base)+(power>1?'^'+power:'')).join('*');
  if(typeof value==='number'){
    const exact=exactExpressionText(node,{bindings:context.exactBindings,variables:context.exactVariables,angleMode:context.modes[2]===2?'DEG':context.modes[2]===3?'GRAD':'RAD'});
    if(exact!==null)return exact;
  }
  return formatPrgmValue(value);
}
export function evaluate(node, vars, angle = 'RAD', context = createMathContext({ angleMode: angle })) {
  if (++context.steps > context.maxSteps) fail('RESOURCE_LIMIT', 'La expresión supera el límite de operaciones del preview.');
  const ev = n => evaluate(n, vars, angle, context), n = node.name;
  const currentAngle = context.modes[2] === 2 ? 'DEG' : context.modes[2] === 3 ? 'GRAD' : 'RAD';
  const angleScale = currentAngle === 'DEG' ? Math.PI / 180 : currentAngle === 'GRAD' ? Math.PI / 200 : 1;
  if (node.type === 'literal') return node.angle ? node.value / angleScale : node.value;
  if(node.type==='comparison'){
    let a=ev(node.operands[0]);
    for(let i=0;i<node.operators.length;i++){
      const b=ev(node.operands[i+1]),op=node.operators[i];let yes;
      if(['=','==','!=','<>'].includes(op))yes=['=','=='].includes(op)?JSON.stringify(a)===JSON.stringify(b):JSON.stringify(a)!==JSON.stringify(b);
      else{if(typeof a!==typeof b||!['number','string'].includes(typeof a))fail('TYPE_ERROR','Comparación de tipos incompatibles.');yes=op==='<'?a<b:op==='>'?a>b:op==='<='?a<=b:a>=b;}
      if(!yes)return false;a=b;
    }
    return true;
  }
  if(node.type==='binary'&&node.op==='|'){
    const binding=node.right;
    if(binding.type!=='comparison'||binding.operators.length!==1||binding.operators[0]!=='='||binding.operands[0].type!=='variable')fail('UNSUPPORTED_SUBSTITUTION','La sustitución requiere una variable y un valor: expresión|x=valor.');
    const scope=Object.assign(Object.create(null),vars);scope[binding.operands[0].name]=ev(binding.operands[1]);
    return evaluate(node.left,scope,currentAngle,context);
  }
  if (node.type === 'list') return node.args.map(ev);
  if (node.type === 'matrix') return node.rows.map(row => {
    if (!row.some(item => item.type === 'polarAngle')) return row.map(ev);
    if (row.length !== 2 || row[0].type === 'polarAngle' || row[1].type !== 'polarAngle') fail('UNSUPPORTED_COORDINATES', 'El preview admite vectores polares de dos coordenadas [radio,∠ángulo].');
    const radius = number(ev(row[0])), theta = number(ev(row[1].arg)) * angleScale;
    return [radius * Math.cos(theta), radius * Math.sin(theta)];
  });
  if (node.type === 'variable') {
    if (Object.hasOwn(vars, n)) return vars[n];
    const constants = { pi: Math.PI, 'π': Math.PI, e: Math.E, 'ℯ': Math.E, true: true, false: false };
    if (Object.hasOwn(constants, n)) return constants[n];
    fail('UNDEFINED_VARIABLE', 'La variable «' + n + '» no está definida.');
  }
  if (node.type === 'index') {
    const value = ev(node.base), indices = node.indices.map(v => integer(ev(v), 1));
    if (!Array.isArray(value) || !indices.length || indices.length > (isMatrix(value) ? 2 : 1)) fail('INDEX_ERROR', 'Se requiere un índice para lista, o uno/dos para fila/elemento de matriz.');
    if (isMatrix(value) && indices.length === 1) { if (indices[0] > value.length) fail('INDEX_ERROR', 'Índice fuera de rango.'); return [clone(value[indices[0] - 1])]; }
    let result = value; for (const i of indices) { if (i > result.length) fail('INDEX_ERROR', 'Índice fuera de rango.'); result = result[i - 1]; } return result;
  }
  if (node.type === 'unary') {
    const value = ev(node.arg); if (node.op === 'not') return !truth(value);
    if (node.op === 'transpose') { const [r, c] = dimensions(value); return matrix(c, r, (i, j) => clone(value[j][i])); }
    return mapNumbers(value, v => { if (node.op === '-') return -v; if (node.op === '+') return v; if (node.op === '%') return v / 100; if (node.op === '°') return v * (Math.PI / 180) / angleScale; integer(v, 0, 170); let f = 1; for (let k = 2; k <= v; k++) f *= k; return f; });
  }
  if (node.type === 'binary') {
    const a = ev(node.left); if (node.op === 'and') return truth(a) && truth(ev(node.right)); if (node.op === 'or') return truth(a) || truth(ev(node.right)); const b = ev(node.right);
    if (node.op === 'xor') return truth(a) !== truth(b);
    if (node.op === '&') return formatPrgmValue(a) + formatPrgmValue(b);
    if (['=', '==', '!=', '<>'].includes(node.op)) return ['=', '=='].includes(node.op) ? JSON.stringify(a) === JSON.stringify(b) : JSON.stringify(a) !== JSON.stringify(b);
    if (['<', '>', '<=', '>='].includes(node.op)) { if (typeof a !== typeof b || !['number', 'string'].includes(typeof a)) fail('TYPE_ERROR', 'Comparación de tipos incompatibles.'); return node.op === '<' ? a < b : node.op === '>' ? a > b : node.op === '<=' ? a <= b : a >= b; }
    if (node.op === '*') return multiply(a, b);
    if (node.op === '/' && isMatrix(b)) return multiply(a, inverse(b));
    if (['+', '-'].includes(node.op) && isMatrix(a) !== isMatrix(b) && (isMatrix(a) || isMatrix(b))) {
      const target = isMatrix(a) ? a : b, [rows, cols] = dimensions(target);
      if (rows !== cols) fail('DIMENSION_ERROR', 'Sumar un escalar requiere una matriz cuadrada.');
      const left = isMatrix(a) ? a : identity(rows).map(row => row.map(v => v * number(a)));
      const right = isMatrix(b) ? b : identity(rows).map(row => row.map(v => v * number(b)));
      return zipValues(left, right, (x, y) => node.op === '+' ? x + y : x - y);
    }
    if (node.op === '^' && isMatrix(a)) { let power = integer(b, -100, 100), result = identity(dimensions(a)[0]), base = power < 0 ? inverse(a) : a; if (a.length !== a[0].length) fail('DIMENSION_ERROR', 'La potencia requiere una matriz cuadrada.'); for (let k = 0; k < Math.abs(power); k++) result = multiply(result, base); return result; }
    return zipValues(a, b, (x, y) => { if (node.op === '/' && !y) fail('DIVISION_BY_ZERO', 'División por cero.'); return number(node.op === '+' ? x + y : node.op === '-' ? x - y : node.op === '/' ? x / y : x ** y); });
  }
  if (node.type !== 'call') fail('INTERNAL_ERROR', 'Expresión desconocida.');
  if (Object.hasOwn(context.functions, n)) {
    const fn = context.functions[n]; if (++context.calls > 100) { context.calls--; fail('EXECUTION_LIMIT', 'Límite de llamadas de función alcanzado.'); }
    try {
      if (node.args.length !== fn.parameters.length) fail('ARGUMENT_ERROR', 'Número de argumentos incorrecto para ' + n + '().');
      const argumentTrees=node.args.map(arg=>captureExactTree(arg,context.exactBindings,vars)),args=node.args.map(ev);
      if(typeof fn.invoke==='function')return fn.invoke(args,{argumentTrees});
      const scope=Object.assign(Object.create(null),vars),bindings=Object.assign(Object.create(null),context.exactBindings);
      fn.parameters.forEach((p,i)=>{scope[p]=args[i];bindings[p]={value:args[i],expr:argumentTrees[i]};});
      const before=context.exactBindings,beforeVars=context.exactVariables;
      context.exactBindings=bindings;context.exactVariables=scope;
      try{return evaluate(fn.body,scope,currentAngle,context);}finally{context.exactBindings=before;context.exactVariables=beforeVars;}
    } finally { context.calls--; }
  }
  if (!NUMERIC_FUNCTIONS.includes(n)) fail('UNSUPPORTED_FUNCTION', 'Función no soportada por el preview numérico: ' + n + '(). Use el CAS para operaciones simbólicas.');
  const arity = (min, max = min) => { if (node.args.length < min || node.args.length > max) fail('ARGUMENT_ERROR', 'Número de argumentos incorrecto para ' + n + '().'); };
  if (n === 'piecewise') { arity(2, 41); const pairs = Math.floor(node.args.length / 2); for (let i = 0; i < pairs; i++) if (truth(ev(node.args[i * 2 + 1]))) return ev(node.args[i * 2]); if (node.args.length % 2) return ev(node.args.at(-1)); fail('UNDEFINED_RESULT', 'Ninguna condición de piecewise es verdadera.'); }
  if (n === 'when') { arity(2, 3); return truth(ev(node.args[0])) ? ev(node.args[1]) : node.args[2] ? ev(node.args[2]) : fail('UNDEFINED_RESULT', 'when() no tiene resultado falso.'); }
  if (['seq', 'sumseq', 'prodseq'].includes(n)) {
    arity(4, n === 'seq' ? 5 : 4); const name = node.args[1]; if (name.type !== 'variable') fail('ARGUMENT_ERROR', 'El segundo argumento debe ser un nombre de variable.');
    const lo = number(ev(node.args[2])), hi = number(ev(node.args[3])), step = node.args[4] ? number(ev(node.args[4])) : 1; if (!step || (hi - lo) / step < 0) return n === 'seq' ? [] : n === 'sumseq' ? 0 : 1;
    const count = Math.floor((hi - lo) / step + 1e-10) + 1; if (count > 10000) fail('RESOURCE_LIMIT', 'La secuencia supera 10000 elementos.'); const scope = Object.assign(Object.create(null), vars), out = [];
    for (let k = 0; k < count; k++) { scope[name.name] = lo + k * step; out.push(evaluate(node.args[0], scope, currentAngle, context)); }
    return n === 'seq' ? out : out.reduce((v, x) => n === 'sumseq' ? number(v + number(x)) : number(v * number(x)), n === 'sumseq' ? 0 : 1);
  }
  if (n === 'getlockinfo') { arity(1); if (node.args[0].type !== 'variable') fail('ARGUMENT_ERROR', 'getLockInfo requiere un nombre de variable.'); return context.locks.has(node.args[0].name) ? 1 : 0; }
  const args = node.args.map(ev);
  if (n === 'string') { arity(1); return formatExpressionValue(node.args[0],args[0],context); }
  if (n === 'expr') { arity(1); if (typeof args[0] !== 'string') fail('TYPE_ERROR', 'expr() requiere una cadena.'); return typeof context.executeString==='function'?context.executeString(args[0],vars):evaluate(expressionTree(args[0]), vars, currentAngle, context); }
  if(n==='factor'){arity(1);primeFactors(args[0],context);return args[0];}
  if(n==='isprime'){arity(1);const value=number(args[0]);if(!Number.isSafeInteger(value))fail('DOMAIN_ERROR','isPrime() requiere un entero exacto.');if(value<2)return false;const factors=primeFactors(value,context);return factors.length===1&&factors[0][0]===value&&factors[0][1]===1;}
  if (n === 'getkey') { arity(0, 1); const mode = integer(args[0] ?? 0, 0, 1), value = context.getKey?.(mode) ?? ''; if (typeof value !== 'string') fail('TYPE_ERROR', 'getKey() debe devolver una cadena de tecla.'); return value; }
  if (n === 'dim') { arity(1); if (isMatrix(args[0])) return dimensions(args[0]); if (typeof args[0] !== 'string' && !Array.isArray(args[0])) fail('TYPE_ERROR', 'dim() requiere texto, lista o matriz.'); return args[0].length; }
  if (['left', 'right', 'mid'].includes(n)) { arity(n === 'mid' ? 2 : 1, n === 'mid' ? 3 : 2); const text = args[0]; if (typeof text !== 'string' && !Array.isArray(text)) fail('TYPE_ERROR', 'Se esperaba texto o lista.'); const count = integer(args[1] ?? 1,n==='mid'?1:0,100000); return n === 'left' ? text.slice(0, count) : n === 'right' ? count?text.slice(-count):text.slice(0,0) : text.slice(count - 1, args[2] === undefined ? undefined : count - 1 + integer(args[2],0,100000)); }
  if (n === 'root') { arity(1, 2); const degree = args[1] === undefined ? 2 : number(args[1]); if (!degree) fail('DOMAIN_ERROR', 'El índice de raíz no puede ser cero.'); return mapNumbers(args[0], x => number(x < 0 && Number.isInteger(degree) && degree % 2 ? -((-x) ** (1 / degree)) : x ** (1 / degree))); }
  if (n === 'log') { arity(1, 2); const base = args[1] === undefined ? 10 : number(args[1]); if (base <= 0 || base === 1) fail('DOMAIN_ERROR', 'La base del logaritmo debe ser positiva y distinta de 1.'); return mapNumbers(args[0], x => { if (x <= 0) fail('DOMAIN_ERROR', 'El argumento de log debe ser positivo.'); return number(Math.log(x) / Math.log(base)); }); }
  const degree = angleScale;
  const unitInput=x=>Math.abs(x)<=1+8*Number.EPSILON?Math.max(-1,Math.min(1,x)):x;
  const unary = { approx: x => x, sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceiling: Math.ceil, ipart: Math.trunc, int: Math.floor, exp: Math.exp, ln: Math.log, sign: Math.sign, fpart: x => x - Math.trunc(x), sin: x => Math.sin(x * degree), cos: x => Math.cos(x * degree), tan: x => Math.tan(x * degree), sec: x => 1 / Math.cos(x * degree), csc: x => 1 / Math.sin(x * degree), cot: x => 1 / Math.tan(x * degree), asin: x => Math.asin(unitInput(x)) / degree, acos: x => Math.acos(unitInput(x)) / degree, atan: x => Math.atan(x) / degree, arcsin: x => Math.asin(unitInput(x)) / degree, arccos: x => Math.acos(unitInput(x)) / degree, arctan: x => Math.atan(x) / degree, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh };
  if (Object.hasOwn(unary, n)) { arity(1); return mapNumbers(args[0], x => number(unary[n](x))); }
  if (n === 'min' || n === 'max') { arity(1, 100); const values = args.length === 1 && Array.isArray(args[0]) ? args[0].flat() : args; return number(Math[n](...values.map(number))); }
  if (n === 'round') { arity(1, 2); const factor = 10 ** (args[1] === undefined ? 0 : number(args[1])); return mapNumbers(args[0], x => number(Math.round(x * factor) / factor)); }
  if (n === 'mod' || n === 'remain' || n === 'intdiv') { arity(2); return zipValues(args[0], args[1], (a, b) => { if (!b) fail('DIVISION_BY_ZERO', 'División por cero.'); return n === 'mod' ? ((a % b) + b) % b : n === 'remain' ? a % b : Math.trunc(a / b); }); }
  if (n === 'gcd' || n === 'lcm') { arity(2); const a = integer(args[0]), b = integer(args[1]); let x = Math.abs(a), y = Math.abs(b); while (y) [x, y] = [y, x % y]; return n === 'gcd' ? x : x ? Math.abs(a / x * b) : 0; }
  if (n === 'ncr' || n === 'npr') { arity(2); const a = integer(args[0], 0, 170), b = integer(args[1], 0, a); let out = 1; for (let k = 0; k < b; k++) out = out * (a - k) / (n === 'ncr' ? k + 1 : 1); return number(out); }
  const rand = () => { const value = context.random(); if (!(value >= 0 && value < 1)) fail('RANDOM_ERROR', 'El generador aleatorio debe devolver un valor en [0,1).'); return value; };
  if (n === 'rand') { arity(0, 1); return args.length ? Array.from({ length: integer(args[0], 1, 10000) }, rand) : rand(); }
  if (n === 'randint') { arity(2, 3); const lo = integer(args[0]), hi = integer(args[1], lo); const one = () => Math.floor(rand() * (hi - lo + 1)) + lo; return args[2] === undefined ? one() : Array.from({ length: integer(args[2], 1, 10000) }, one); }
  if (n === 'randseed') { arity(1); context.random = seededRandom(integer(args[0])); return undefined; }
  if (n === 'newmat' || n === 'randmat') { arity(2); return matrix(args[0], args[1], n === 'randmat' ? () => Math.floor(rand() * 19) - 9 : undefined); }
  if (n === 'identity') { arity(1); return identity(args[0]); }
  if (n === 'diag') { arity(1); if (isMatrix(args[0])) { const [r, c] = dimensions(args[0]); if (r !== c) fail('DIMENSION_ERROR', 'diag() requiere una matriz cuadrada.'); return [Array.from({ length: r }, (_, i) => args[0][i][i])]; } if (!Array.isArray(args[0])) fail('TYPE_ERROR', 'diag() requiere lista o matriz.'); return matrix(args[0].length, args[0].length, (r, c) => r === c ? args[0][r] : 0); }
  if (n === 'rowdim' || n === 'coldim') { arity(1); return dimensions(args[0])[n === 'rowdim' ? 0 : 1]; }
  if (n === 'det') { arity(1); return determinant(args[0]); }
  if (n === 'trace') { arity(1); const [r, c] = dimensions(args[0]); if (r !== c) fail('DIMENSION_ERROR', 'trace() requiere matriz cuadrada.'); return args[0].reduce((v, row, i) => v + number(row[i]), 0); }
  if (n === 'norm') { arity(1); if (!Array.isArray(args[0])) fail('TYPE_ERROR', 'norm() requiere una lista o matriz.'); return Math.hypot(...args[0].flat().map(number)); }
  if (n === 'dotp') {
    arity(2); const a = args[0], b = args[1];
    if (!Array.isArray(a) || !Array.isArray(b) || isMatrix(a) !== isMatrix(b)) fail('TYPE_ERROR', 'dotP() requiere dos listas o dos vectores del mismo tipo.');
    if (isMatrix(a)) { const [ar, ac] = dimensions(a), [br, bc] = dimensions(b); if ((ar !== 1 && ac !== 1) || ar !== br || ac !== bc) fail('DIMENSION_ERROR', 'dotP() requiere vectores de igual dimensión y orientación.'); }
    const av = a.flat(), bv = b.flat(); if (av.length !== bv.length) fail('DIMENSION_ERROR', 'Los vectores de dotP() deben tener la misma dimensión.');
    return number(av.reduce((sum, value, i) => sum + number(value) * number(bv[i]), 0));
  }
  if (n === 'unitv') {
    arity(1); const [r, c] = dimensions(args[0]); if (r !== 1 && c !== 1) fail('DIMENSION_ERROR', 'unitV() requiere un vector fila o columna.');
    const magnitude = Math.hypot(...args[0].flat().map(number)); if (!magnitude) fail('DOMAIN_ERROR', 'El vector cero no tiene vector unitario.');
    return mapNumbers(args[0], value => number(value / magnitude));
  }
  if (n === 'mat2list') { arity(1); dimensions(args[0]); return clone(args[0].flat()); }
  if(n==='list2mat'){arity(1,2);if(!Array.isArray(args[0])||isMatrix(args[0])||!args[0].length)fail('TYPE_ERROR','list▶mat() requiere una lista no vacía.');const columns=integer(args[1]??args[0].length,1,100),rows=Math.ceil(args[0].length/columns);return matrix(rows,columns,(r,c)=>clone(args[0][r*columns+c]??0));}
  if (n === 'ref' || n === 'rref') { arity(1); return elimination(args[0], n === 'rref'); }
  if (n === 'transpose') { arity(1); const [r, c] = dimensions(args[0]); return matrix(c, r, (i, j) => args[0][j][i]); }
  if (n === 'augment' || n === 'colaugment') { arity(2); if (!Array.isArray(args[0]) || !Array.isArray(args[1])) fail('TYPE_ERROR', 'Se requieren listas o matrices.'); if (n === 'colaugment') { const [, a] = dimensions(args[0]), [, b] = dimensions(args[1]); if (a !== b) fail('DIMENSION_ERROR', 'Columnas incompatibles.'); return clone([...args[0], ...args[1]]); } if (isMatrix(args[0]) && isMatrix(args[1])) { const [a] = dimensions(args[0]), [b] = dimensions(args[1]); if (a !== b) fail('DIMENSION_ERROR', 'Filas incompatibles.'); return args[0].map((row, i) => clone([...row, ...args[1][i]])); } return clone([...args[0], ...args[1]]); }
  if (n === 'submat') { arity(1, 5); const [r, c] = dimensions(args[0]), r1 = integer(args[1] ?? 1, 1, r), c1 = integer(args[2] ?? 1, 1, c), r2 = integer(args[3] ?? r, r1, r), c2 = integer(args[4] ?? c, c1, c); return args[0].slice(r1 - 1, r2).map(row => row.slice(c1 - 1, c2)); }
  if (['rowswap', 'rowadd', 'mrow', 'mrowadd'].includes(n)) { const scaled = n.startsWith('m'), adding = n === 'rowadd' || n === 'mrowadd'; arity(n === 'mrowadd' ? 4 : 3); const scale = scaled ? number(args[0]) : 1, a = clone(args[scaled ? 1 : 0]), [rows] = dimensions(a), from = integer(args[scaled ? 2 : 1], 1, rows) - 1, to = adding || n === 'rowswap' ? integer(args.at(-1), 1, rows) - 1 : from; if (n === 'rowswap') [a[from], a[to]] = [a[to], a[from]]; else a[to] = a[to].map((v, i) => adding ? number(v) + scale * number(a[from][i]) : scale * number(v)); return a; }
  if (n === 'newlist') { arity(1); return Array(integer(args[0], 0, 10000)).fill(0); }
  // TI count() counts numeric entries, not list length. Text and void are skipped.
  if (n === 'count') {
    arity(1,100);
    let total=0;
    const visit=value=>{
      if(Array.isArray(value)) { for(const item of value)visit(item); }
      else if(typeof value==='number'&&Number.isFinite(value)) total++;
    };
    for(const argument of args)visit(argument);
    return total;
  }
  if (['sum', 'product', 'mean', 'median', 'stdevpop', 'stdevsamp', 'varpop', 'varsamp'].includes(n)) { arity(1); if (!Array.isArray(args[0])) fail('TYPE_ERROR', 'Se esperaba una lista o matriz numérica.'); if (isMatrix(args[0])) { const [rows, cols] = dimensions(args[0]); return [Array.from({ length: cols }, (_, c) => evaluate({ type: 'call', name: n, args: [{ type: 'literal', value: Array.from({ length: rows }, (_, r) => args[0][r][c]) }] }, vars, angle, context))]; } const list = args[0].map(number), sum = list.reduce((a, b) => a + b, 0); if (n === 'sum') return sum; if (n === 'product') return list.reduce((a, b) => a * b, 1); if (!list.length) fail('DOMAIN_ERROR', 'La lista está vacía.'); if (n === 'mean') return sum / list.length; if (n === 'median') { const s = [...list].sort((a, b) => a - b), k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; } const divisor = list.length - (n.endsWith('samp') ? 1 : 0); if (!divisor) fail('DOMAIN_ERROR', 'Se requieren más elementos.'); const variance = list.reduce((v, x) => v + (x - sum / list.length) ** 2, 0) / divisor; return n.startsWith('stdev') ? Math.sqrt(variance) : variance; }
  if (n === 'getmode') { arity(1); const group = integer(args[0], 0, 8); return group ? context.modes[group] : Object.entries(context.modes).flatMap(([group, value]) => [Number(group), value]); }
  if (n === 'setmode') { arity(1, 2); const values = args.length === 1 ? args[0] : args; if (!Array.isArray(values) || values.length % 2) fail('ARGUMENT_ERROR', 'setMode requiere pares de grupo y valor.'); const old = []; for (let i = 0; i < values.length; i += 2) { const group = integer(values[i], 1, 8), value = integer(values[i + 1], 1, ({ 1: 26, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 2 })[group]); old.push(group, context.modes[group]); context.modes[group] = value; } return old; }
  if (n === 'getlanginfo') { arity(0); return context.language; }
  if (n === 'getplatform') { arity(0); fail('UNSUPPORTED_PLATFORM', 'El preview no reproduce getPlatform() de una calculadora física.'); }
  if (n === 'char') { arity(1); return String.fromCodePoint(integer(args[0], 0, 0x10ffff)); }
  if (n === 'ord') { arity(1); if (typeof args[0] !== 'string' || !args[0].length) fail('TYPE_ERROR', 'ord() requiere texto no vacío.'); return args[0].codePointAt(0); }
  if (n === 'instring') { arity(2, 3); if (typeof args[0] !== 'string' || typeof args[1] !== 'string') fail('TYPE_ERROR', 'inString() requiere dos cadenas.'); return args[0].indexOf(args[1], (args[2] ?? 1) - 1) + 1; }
  if (n === 'gettype') { arity(1); return isMatrix(args[0]) ? 'MAT' : Array.isArray(args[0]) ? 'LIST' : typeof args[0] === 'string' ? 'STR' : typeof args[0] === 'boolean' ? 'EXPR' : 'NUM'; }
  if (n === 'isnumtype') { arity(1); return typeof args[0] === 'number'; }
  if (n === 'isvoid') { arity(1); return args[0] == null; }
  fail('UNSUPPORTED_FUNCTION', 'Función no soportada: ' + n + '().');
}
export function evaluatePrgmExpression(source, variables = {}, options = {}) {
  const vars = Object.create(null); for (const [name, value] of Object.entries(variables)) vars[key(name)] = value;
  return evaluate(expressionTree(String(source)), vars, options.angleMode || 'RAD', options.context || createMathContext(options));
}
