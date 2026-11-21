import test from 'node:test';
import assert from 'node:assert/strict';
import { luaStringFind as find, luaStringMatch as match, luaStringGsub as gsub, createLuaStringGmatch as gmatch } from '../src/lua/string-patterns.js';

const collect = iterator => { const values = []; for (;;) { const result = iterator(); if (!result.length) return values; values.push(result); assert.ok(values.length < 1000, 'iterator must terminate'); } };

test('Lua classes, sets, captures and indices use Lua 5.1 semantics', () => {
  assert.deepEqual(find('abc123def', '(%a+)(%d+)'), [1, 6, 'abc', '123']);
  assert.deepEqual(find('abc123def', '%d+', -6), [4, 6]);
  assert.deepEqual(find('a.b', '.', 1, true), [2, 2]);
  assert.deepEqual(find('abc', '', 100), [4, 3]);
  assert.deepEqual(find('abc', '^b', 2), [2, 2]);
  assert.deepEqual(match('a_b2', '%w+'), ['a']);
  assert.deepEqual(match('a_b2', '[%w_]+'), ['a_b2']);
  assert.deepEqual(match('9AZ_f', '[%dA-F]+'), ['9A']);
  assert.deepEqual(match(']-a', '[]%-]+'), [']-']);
  assert.deepEqual(match('\0abc', '%z'), ['\0']);
  assert.deepEqual(match('abc1XYZ', '%D+'), ['abc']);
  assert.deepEqual(match('A! ', '%p'), ['!']);
  assert.deepEqual(match('A! \t', '%s+'), [' \t']);
  assert.deepEqual(match('word word', '(%a+)%s+%1'), ['word']);
  assert.deepEqual(match('word word', '()(%a+)()'), [1, 'word', 5]);
});

test('balanced/frontier operators and greedy/minimal repetition', () => {
  assert.deepEqual(match('pre (a(b)c) post', '%b()'), ['(a(b)c)']);
  assert.deepEqual(match('<<nested>> rest', '%b<>'), ['<<nested>>']);
  assert.deepEqual(match('((unfinished)', '^%b()'), [null]);
  assert.deepEqual(match('one two three', '%f[%a]two%f[%A]'), ['two']);
  assert.deepEqual(match('two', '%f[%a]%a+%f[%A]'), ['two']);
  assert.deepEqual(match('12abc 34', '%f[%d]%d+%f[%D]'), ['12']);
  assert.deepEqual(match('<a><b>', '<.->'), ['<a>']);
  assert.deepEqual(match('<a><b>', '<.*>'), ['<a><b>']);
  assert.deepEqual(match('colr color colour', 'colou?r'), ['color']);
  assert.deepEqual(match('aaab', '(a*)aab'), ['a']);
  assert.deepEqual(match('abbbc', 'a(b*)bc$'), ['bb']);
  assert.deepEqual(match('x^y', '%^'), ['^']);
});

test('gmatch has independent state and terminates after empty/position matches', () => {
  assert.deepEqual(collect(gmatch('uno dos\ttres', '%S+')), [['uno'], ['dos'], ['tres']]);
  assert.deepEqual(collect(gmatch('a=1 b=22', '(%a+)=(%d+)')), [['a', '1'], ['b', '22']]);
  assert.deepEqual(collect(gmatch('ab', '()')), [[1], [2], [3]]);
  assert.deepEqual(collect(gmatch('ab', '')), [[''], [''], ['']]);
  assert.deepEqual(collect(gmatch('a', 'a*')), [['a'], ['']]);
  assert.deepEqual(collect(gmatch('^ab', '^.')), [['^a']]);
  const a = gmatch('1 2', '%d+'), b = gmatch('x y', '%a+');
  assert.deepEqual(a(), ['1']); assert.deepEqual(b(), ['x']); assert.deepEqual(a(), ['2']); assert.deepEqual(b(), ['y']);
  assert.deepEqual(a(), []); assert.deepEqual(a(), []);
});

test('gsub substitutes captures, function/table values, false and empty matches', () => {
  assert.deepEqual(gsub('hello world', '(%w+)', '%1/%0/%%'), ['hello/hello/% world/world/%', 2]);
  assert.deepEqual(gsub('a=1 b=2', '(%a+)=(%d+)', '%2:%1', 1), ['1:a b=2', 1]);
  assert.deepEqual(gsub('abc', '.', () => false), ['abc', 3]);
  assert.deepEqual(gsub('one two', '%w+', { one: 'uno', two: false }), ['uno two', 2]);
  assert.deepEqual(gsub('a1 b2', '(%a)(%d)', (a, n) => a.toUpperCase() + (+n + 1)), ['A2 B3', 2]);
  assert.deepEqual(gsub('ab', '', '-'), ['-a-b-', 3]);
  assert.deepEqual(gsub('a', 'a*', 'x'), ['xx', 2]);
  assert.deepEqual(gsub('abc', '^', '!'), ['!abc', 1]);
  assert.deepEqual(gsub('abc', '.', 'x', 0), ['abc', 0]);
  assert.deepEqual(gsub('abc', '.', 7), ['777', 3]);
  assert.deepEqual(gsub('abc', '()', '%1'), ['1a2b3c4', 4]);
  assert.throws(() => gsub('x', '.', () => ({})), /replacement/);
  assert.throws(() => gsub('x', '(.)', '%2'), /capture/);
});

test('invalid patterns and excessive backtracking fail explicitly', () => {
  for (const pattern of ['%', '[abc', '%f', '%b(', '(', ')', '%0', '%1']) assert.throws(() => match('abc', pattern), /pattern|capture|balance/);
  assert.throws(() => match('a'.repeat(50), 'a*'.repeat(20) + 'b'), /limit|complex/);
  assert.equal(match('x'.repeat(10000) + '!', '%S+')[0].length, 10001);
});

test('actual Lua calls, generic for, closures and replacement tables use the same library', async () => {
  const { createLuaRuntime } = await import('../src/lua/runtime.js');
  const runtime = await createLuaRuntime();
  try {
    await runtime.load(`function probe()
      local a,b=string.gmatch("a=1 b=2", "(%a+)=(%d+)"),string.gmatch("x y", "%S+")
      local k,v=a()
      local x=b()
      local k2,v2=a()
      local y=b()
      local done=a()
      local words={}
      for word in string.gmatch("uno dos tres", "%S+") do words[#words+1]=word end
      local changed,n=string.gsub("one two", "%w+", {one="uno",two=false})
      local f,c=string.gsub("a1 b2", "(%a)(%d)", function(l,d) return l..(tonumber(d)+1) end)
      return {k,v,x,k2,v2,y,done==nil,table.concat(words,"|"),changed,n,f,c,string.match("(a(b)c)","%b()")}
    end`);
    assert.deepEqual(runtime.call('probe'), ['a','1','x','b','2','y',true,'uno|dos|tres','uno two',2,'a2 b3',2,'(a(b)c)']);
  } finally { runtime.close(); }
});
