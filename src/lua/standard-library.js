// Shared by the browser LuaJS preview and the terminal runtime. The accepted
// conversions and the two-digit width/precision limit follow Lua 5.1 lstrlib.c:
// https://www.lua.org/source/5.1/lstrlib.c.html#str_format
// Integer conversions use the calculator's 32-bit C integer representation.
const FLAGS = '-+ #0';
const CONVERSIONS = 'cdiouxXeEfgGqs';
const powersOfTen = [1n];
const pow10 = power => {
  while (powersOfTen.length <= power) powersOfTen.push(powersOfTen.at(-1) * 10n);
  return powersOfTen[power];
};

function typeName(value) {
  return value == null ? 'nil' : typeof value === 'object' ? 'table' : typeof value;
}

function stringArgument(value, index) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError(`bad argument #${index} to 'format' (string expected, got ${typeName(value)})`);
  }
  return String(value);
}

function numberArgument(value, index) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const source = value.trim();
    if (/^[+-]?(?:0[xX][\da-fA-F]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(source)) {
      const number = /^[+-]?0[xX]/.test(source)
        ? (source[0] === '-' ? -1 : 1) * Number(source.replace(/^[+-]/, '')) : Number(source);
      if (!Number.isNaN(number)) return number;
    }
  }
  throw new TypeError(`bad argument #${index} to 'format' (number expected, got ${typeName(value)})`);
}

// C printf rounds the exact binary floating-point value, including ties to
// even. JavaScript toFixed rounds a decimal tie differently (2.5 -> "3"), so
// use the IEEE-754 ratio instead of adding an epsilon or changing the input.
function roundDecimal(value, places) {
  if (!value) return 0n;
  const bits = new DataView(new ArrayBuffer(8)); bits.setFloat64(0, value);
  const high = bits.getUint32(0), low = bits.getUint32(4);
  const exponent = (high >>> 20) & 0x7ff;
  let numerator = (BigInt(high & 0xfffff) << 32n) | BigInt(low);
  if (exponent) numerator |= 1n << 52n;
  const shift = exponent ? exponent - 1023 - 52 : -1074;
  let denominator = 1n;
  if (shift >= 0) numerator <<= BigInt(shift); else denominator <<= BigInt(-shift);
  if (places >= 0) numerator *= pow10(places); else denominator *= pow10(-places);
  const quotient = numerator / denominator, remainder = numerator % denominator;
  return quotient + (remainder * 2n > denominator || remainder * 2n === denominator && quotient % 2n ? 1n : 0n);
}

function fixed(value, precision, alternate) {
  let digits = roundDecimal(value, precision).toString().padStart(precision + 1, '0');
  if (precision) digits = digits.slice(0, -precision) + '.' + digits.slice(-precision);
  else if (alternate) digits += '.';
  return digits;
}

function significant(value, precision) {
  let exponent = value ? Number(value.toExponential().split('e')[1]) : 0;
  let digits = roundDecimal(value, precision - 1 - exponent).toString().padStart(precision, '0');
  if (digits.length > precision) { exponent++; digits = digits.slice(0, precision); }
  return { digits, exponent };
}

function exponential(digits, exponent, alternate, trim) {
  let fraction = digits.slice(1);
  if (trim) fraction = fraction.replace(/0+$/, '');
  const mantissa = digits[0] + (fraction || alternate ? '.' + fraction : '');
  return mantissa + 'e' + (exponent < 0 ? '-' : '+') + String(Math.abs(exponent)).padStart(2, '0');
}

function floatText(value, conversion, precision, alternate) {
  if (Number.isNaN(value)) return 'nan';
  if (!Number.isFinite(value)) return 'inf';
  const kind = conversion.toLowerCase();
  const digits = precision == null ? 6 : kind === 'g' ? Math.max(1, precision) : precision;
  if (kind === 'f') return fixed(value, digits, alternate);
  const rounded = significant(value, kind === 'e' ? digits + 1 : digits);
  if (kind === 'e') return exponential(rounded.digits, rounded.exponent, alternate, false);
  if (rounded.exponent < -4 || rounded.exponent >= digits) return exponential(rounded.digits, rounded.exponent, alternate, !alternate);
  const decimals = Math.max(0, digits - rounded.exponent - 1);
  let result = fixed(value, decimals, alternate);
  if (!alternate && result.includes('.')) result = result.replace(/0+$/, '').replace(/\.$/, '');
  return result;
}

function quote(value) {
  return '"' + value.replace(/["\\\n\r\0]/g, character => character === '\0' ? '\\000'
    : character === '\r' ? '\\r' : '\\' + character) + '"';
}

function pad(text, width, left, zero = false, prefix = '') {
  const padding = Math.max(0, width - prefix.length - text.length);
  if (left) return prefix + text + ' '.repeat(padding);
  return zero ? prefix + '0'.repeat(padding) + text : ' '.repeat(padding) + prefix + text;
}

export function luaStringFormat(format, ...values) {
  const source = stringArgument(format, 1);
  let output = '', cursor = 0;
  for (let position = 0; position < source.length;) {
    if (source[position] !== '%') { output += source[position++]; continue; }
    if (source[++position] === '%') { output += '%'; position++; continue; }
    const start = position;
    while (position < source.length && FLAGS.includes(source[position])) position++;
    const flags = source.slice(start, position);
    if (flags.length > 5) throw new Error('invalid format (repeated flags)');
    const widthStart = position;
    while (/\d/.test(source[position] || '') && position < source.length) position++;
    const widthText = source.slice(widthStart, position);
    let precision = null, precisionText = '';
    if (source[position] === '.') {
      const precisionStart = ++position;
      while (/\d/.test(source[position] || '') && position < source.length) position++;
      precisionText = source.slice(precisionStart, position); precision = Number(precisionText || 0);
    }
    if (widthText.length > 2 || precisionText.length > 2) throw new Error('invalid format (width or precision too long)');
    const conversion = source[position++];
    if (!CONVERSIONS.includes(conversion || '\0')) throw new Error(`invalid option '%${conversion || ''}' to 'format'`);
    if (cursor >= values.length) throw new Error(`bad argument #${cursor + 2} to 'format' (no value)`);
    const value = values[cursor++], argument = cursor + 1, width = Number(widthText || 0);
    const left = flags.includes('-'), alternate = flags.includes('#');
    if (conversion === 'q') { output += quote(stringArgument(value, argument)); continue; }
    if (conversion === 's') {
      let text = stringArgument(value, argument);
      if (text.includes('\0')) throw new Error(`bad argument #${argument} to 'format' (string contains zeros)`);
      if (precision != null) text = text.slice(0, precision);
      output += pad(text, width, left); continue;
    }
    const number = numberArgument(value, argument);
    if (conversion === 'c') {
      if (!Number.isFinite(number)) throw new Error(`bad argument #${argument} to 'format' (finite number expected)`);
      const byte = Math.trunc(number) & 255;
      // Lua 5.1 adds the C buffer using strlen, including for %c.
      output += pad(String.fromCharCode(byte), width, left).split('\0')[0]; continue;
    }
    let text, prefix = '', zero = flags.includes('0') && !left;
    if ('diouxX'.includes(conversion)) {
      if (!Number.isFinite(number)) throw new Error(`bad argument #${argument} to 'format' (finite number expected)`);
      const signed = conversion === 'd' || conversion === 'i';
      const integer = signed ? Math.trunc(number) | 0 : Math.trunc(number) >>> 0;
      const negative = integer < 0;
      text = Math.abs(integer).toString(conversion === 'o' ? 8 : /[xX]/.test(conversion) ? 16 : 10);
      if (precision === 0 && integer === 0) text = '';
      if (precision != null) { text = text.padStart(precision, '0'); zero = false; }
      if (signed) prefix = negative ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
      else if (alternate && conversion === 'o' && text[0] !== '0') text = '0' + text;
      else if (alternate && /[xX]/.test(conversion) && integer !== 0) prefix = '0x';
    } else {
      prefix = number < 0 || Object.is(number, -0) ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '';
      text = floatText(Math.abs(number), conversion, precision, alternate);
      if (!Number.isFinite(number)) zero = false;
    }
    if (/[XEG]/.test(conversion)) { text = text.toUpperCase(); prefix = prefix.toUpperCase(); }
    output += pad(text, width, left, zero, prefix);
  }
  return output;
}

export function installLuaStandardLibrary(global) {
  if (!global.G?.str?.string || typeof global.lua_tableset !== 'function') throw new TypeError('An initialized LuaJS string library is required.');
  global.lua_tableset(global.G.str.string, 'format', (format, ...values) => [luaStringFormat(format, ...values)]);
}
