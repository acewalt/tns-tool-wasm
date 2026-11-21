import assert from 'node:assert/strict';
import test from 'node:test';
import {luaStringFormat} from '../src/lua/standard-library.js';
import {createLuaRuntime} from '../src/lua/runtime.js';

test('Lua format converts integer, byte, hexadecimal and octal fields', () => {
  const cases = [
    ['%d', [42], '42'], ['%i', [-3.9], '-3'], ['%u', [-1], '4294967295'],
    ['%02X', [15], '0F'], ['%x', [255], 'ff'], ['%#x', [255], '0xff'],
    ['%#08X', [255], '0X0000FF'], ['%#o', [8], '010'], ['%.0x', [0], ''],
    ['%#.0o', [0], '0'], ['%c', [65], 'A'], ['%c', [256], ''],
    ['%4c', [0], '   '], ['%-4c', [0], ''], ['%s:%02d', ['x', 4], 'x:04'],
  ];
  for (const [format, args, expected] of cases) assert.equal(luaStringFormat(format, ...args), expected, format);
});

test('Lua format places sign and base prefix before zero padding and respects precision', () => {
  const cases = [
    ['%04d', [7], '0007'], ['%05d', [-7], '-0007'], ['%+05d', [7], '+0007'],
    ['% 05d', [7], ' 0007'], ['%-05d', [7], '7    '], ['%+.4d', [7], '+0007'],
    ['%08.4d', [7], '    0007'], ['%-5s', ['a'], 'a    '], ['%8s', ['b'], '       b'],
    ['%.3s', ['abcdef'], 'abc'], ['%05s', ['a'], '    a'], ['%.0d', [0], ''],
    ['%+.0d', [0], '+'], ['%#x', [0], '0'], ['%#06o', [8], '000010'],
  ];
  for (const [format, args, expected] of cases) assert.equal(luaStringFormat(format, ...args), expected, format);
});

test('Lua format rounds binary64 correctly and uses C scientific/general notation', () => {
  const cases = [
    ['%.2f', [1.234], '1.23'], ['%.3f', [2.5], '2.500'], ['%.0f', [1.6], '2'],
    ['%.0f', [2.5], '2'], ['%.0f', [3.5], '4'], ['%.2f', [1.005], '1.00'],
    ['%+08.2f', [-2.5], '-0002.50'], ['%#.0f', [2], '2.'], ['%f', [-0], '-0.000000'],
    ['%e', [12.5], '1.250000e+01'], ['%.2E', [0.00125], '1.25E-03'],
    ['%.0e', [9.9], '1e+01'], ['%#.0e', [9.9], '1.e+01'],
    ['%g', [12.5], '12.5'], ['%g', [0.0001], '0.0001'], ['%g', [0.00001], '1e-05'],
    ['%.3g', [999.5], '1e+03'], ['%#.3g', [12], '12.0'], ['%.2G', [1000000], '1E+06'],
    ['%g', [Number.MIN_VALUE], '4.94066e-324'], ['%f', [Infinity], 'inf'],
    ['%+E', [Infinity], '+INF'], ['%f', [NaN], 'nan'],
  ];
  for (const [format, args, expected] of cases) assert.equal(luaStringFormat(format, ...args), expected, format);
  assert.equal(luaStringFormat('%.99f', 0).length, 101);
  assert.equal(luaStringFormat('%.0f', 1e21), '1000000000000000000000');
});

test('Lua format handles literal percent and round-trippable Lua quoted strings', () => {
  assert.equal(luaStringFormat('50%% %s', '100%'), '50% 100%');
  assert.equal(luaStringFormat('%s %d', 42, ' 0x10 '), '42 16');
  assert.equal(luaStringFormat('%q', 'a"b\\c\n\r\0x'), '"a\\"b\\\\c\\\n\\r\\000x"');
  assert.equal(luaStringFormat('%8.2q', 'abcdef'), '"abcdef"');
});

test('Lua format rejects missing values, bad types and unsupported options explicitly', () => {
  for (const [format, args] of [
    ['%d', []], ['%s', [null]], ['%s', [false]], ['%d', ['12bad']], ['%f', [{}]],
    ['%p', [1]], ['%a', [1]], ['%*d', [2, 1]], ['%100d', [1]], ['%.100f', [1]],
    ['%------d', [1]], ['tail%', [1]], ['%c', [Infinity]], ['%s', ['a\0b']],
  ]) assert.throws(() => luaStringFormat(format, ...args), /format/);
});

test('real Lua source uses the shared formatter including colon syntax and protected failures', async () => {
  const runtime = await createLuaRuntime();
  try {
    await runtime.load(`
      function result()
        local formats={"%.2f","%.3f","%d","%s","%04d","%-5s","%8s","%02X","%x","%c","50%%","%s:%02d","%+d","%.0f"}
        local result={string.format(formats[1],1.234),string.format(formats[2],2.5),string.format(formats[3],42),
          string.format(formats[4],"hola"),string.format(formats[5],7),string.format(formats[6],"a"),
          string.format(formats[7],"b"),string.format(formats[8],15),string.format(formats[9],255),
          string.format(formats[10],65),string.format(formats[11]),string.format(formats[12],"x",4),
          string.format(formats[13],3),string.format(formats[14],1.6)}
        return table.concat(result,"|")
      end
      function colon() return ("%+05d"):format(-7) end
      function bad() return pcall(string.format,"%d","bad") end
      function quote() return string.format("%q", "a\\\"b\\\\c\\n\\r\\000x") end
    `);
    assert.equal(runtime.call('result'), '1.23|2.500|42|hola|0007|a    |       b|0F|ff|A|50%|x:04|+3|2');
    assert.equal(runtime.call('colon'), '-0007');
    const [success, error] = runtime.call('bad');
    assert.equal(success, false); assert.match(error, /number expected/);
    assert.equal(runtime.call('quote'), '"a\\"b\\\\c\\\n\\r\\000x"');
  } finally { runtime.close(); }
});
