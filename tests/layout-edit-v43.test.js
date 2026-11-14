import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import {createMathSession} from '../src/prgm/math-api.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const extract = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));
const tools = {window: {}};
vm.runInNewContext(fs.readFileSync(new URL('../web/spreadsheet-tools.js', import.meta.url), 'utf8'), tools);
const normalize = tools.window.TnsSpreadsheetTools.normalizeFormula;
const formulas = {window: {TnsTiBasicMath: {createSession: createMathSession}}};
vm.runInNewContext(extract('function spreadsheetColumnName(', 'function extractSpreadsheetStateFromRawXml(') + '\nglobalThis.evaluate=evaluateSpreadsheetFormula;', formulas);

test('direct and redundantly grouped sheet sums have one editable formula and equal results', () => {
  const cells = {'0:1': {formula: '7', data: '7'}, '19:2': {formula: '5', data: '5'}};
  for (const input of ['=B1+C20', '=(B1+C20)', '=(((B1+C20)))', '= ( ( B1+C20 ) ) ']) {
    assert.equal(normalize(input), '=B1+C20');
    assert.equal(formulas.evaluate(input, cells), '12');
    assert.equal(formulas.evaluate(normalize(input), cells), '12');
  }
});

test('formula normalization keeps groups required by arithmetic precedence', () => {
  const cells = {'0:1': {formula: '7', data: '7'}, '19:2': {formula: '5', data: '5'}, '0:3': {formula: '3', data: '3'}};
  assert.equal(normalize('=((B1+C20)*D1)'), '=(B1+C20)*D1');
  assert.equal(normalize('=(B1+C20)*D1'), '=(B1+C20)*D1');
  assert.equal(formulas.evaluate(normalize('=((B1+C20)*D1)'), cells), '36');
  assert.equal(formulas.evaluate('=B1+C20*D1', cells), '22');
});

test('parentheses within quoted strings survive normalization and evaluation', () => {
  for (const value of ['(B1+C20)', 'left ) middle ( right', ')((', 'A1']) {
    const quoted = JSON.stringify(value);
    const input = '=((' + quoted + '))';
    assert.equal(normalize(input), '=' + quoted);
    assert.equal(formulas.evaluate(normalize(input), {}), value);
  }
  assert.equal(normalize('plain (text)'), 'plain (text)');
  assert.equal(normalize('=(B1+C20'), '=(B1+C20');
});

// Run the exact Python sent by the browser bridge, including its final expression.
const pythonBridge = `
import ast, json, sys
sys.path.insert(0, sys.argv[1])
payload = json.load(sys.stdin)
namespace = payload['globals']
if payload.get('failReplace'):
    import page_layout
    def fail_replace(*args):
        raise OSError('simulated atomic replacement failure')
    page_layout.os.replace = fail_replace
tree = ast.parse(payload['code'])
final = tree.body.pop()
exec(compile(tree, '<spreadsheet-save>', 'exec'), namespace)
print(eval(compile(ast.Expression(final.value), '<spreadsheet-result>', 'eval'), namespace))
`;
function python(code, input, args = []) {
  const result = spawnSync(process.env.PYTHON || 'python', ['-c', code, ...args], {cwd: root, input: JSON.stringify(input), encoding: 'utf8', env: {...process.env, PYTHONUTF8: '1'}, timeout: 15000});
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}
const cell = '<tb:cell format="keep"><tb:rowId>1</tb:rowId><tb:formula>=nativeCAS(2)</tb:formula><tb:data>√(2)</tb:data><tb:globalName>named_cell</tb:globalName><tb:style>bold</tb:style></tb:cell>';
const sheet = '<wdgt type="tabulator" marker="selected"><tb:table custom="table-metadata"><tb:columns><tb:column type="cell-column"><tb:columnName>measurements</tb:columnName><tb:columnWidthNative>93</tb:columnWidthNative><tb:cells>' + cell + '</tb:cells></tb:column></tb:columns></tb:table></wdgt>';
const namespaces = 'xmlns="urn:TI.Problem" xmlns:tb="urn:tabulator" xmlns:sp="urn:TI.Scratchpad" xmlns:unused="urn:keep-unused"';
const snapshot = sheet.replace('<wdgt ', '<wdgt ' + namespaces + ' ');
const fixture = '<?xml version="1.0" encoding="UTF-8" ?>' + '<prob ' + namespaces + '><sym><e t="7"><n>keep_program</n><v>Prgm&#13;Disp x&#13;EndPrgm</v></e></sym><card clay="1" w1="5000" h1="10000" w2="10000" h2="10000"><wdgt type="TI.Scratchpad"><sp:payload>literal\rsecond&#13;third</sp:payload></wdgt>' + sheet + '</card><resources><entry>keep-resource</entry></resources></prob>';

function setupSave(t, {failReplace = false} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tns-sheet-v43-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const sourcePath = path.join(directory, 'source'), stagePath = path.join(directory, 'stage');
  fs.mkdirSync(sourcePath); fs.mkdirSync(stagePath);
  const file = path.join(stagePath, 'Problem1.xml'), other = path.join(stagePath, 'Problem2.xml');
  fs.writeFileSync(file, fixture); fs.writeFileSync(other, fixture.replace('selected', 'other-problem'));
  const globals = new Map(), xmlDoctor = {sourcePath, stagePath};
  const context = {JSON, xmlDoctor, ensureXmlStageCopy: async () => {}, pyodide: {
    globals: {set: (key, value) => globals.set(key, value)},
    runPythonAsync: async code => JSON.stringify(python(pythonBridge, {code, globals: Object.fromEntries(globals), failReplace}, [path.join(root, 'editor_XML')])),
  }};
  vm.runInNewContext(extract('async function saveSpreadsheetWidgetToStage(', '\nasync function addSpreadsheetWidgetToStage(') + '\nglobalThis.save=saveSpreadsheetWidgetToStage;', context);
  return {directory, sourcePath, stagePath, file, other, context, item: {file: path.join(sourcePath, 'Problem1.xml'), path: '/prob/card/wdgt[2]', raw_xml: snapshot}};
}

const inspectSaved = `
import json, sys, xml.etree.ElementTree as ET
root = ET.parse(json.load(sys.stdin)['file']).getroot()
p, tb, sp = '{urn:TI.Problem}', '{urn:tabulator}', '{urn:TI.Scratchpad}'
widget = root.find(p+'card').findall(p+'wdgt')[1]
table = widget.find(tb+'table')
column = table.find(tb+'columns').find(tb+'column')
cell = column.find(tb+'cells').find(tb+'cell')
print(json.dumps({'program': root.find(p+'sym').find(p+'e').find(p+'v').text,
 'sibling': root.find(p+'card').find(p+'wdgt').find(sp+'payload').text,
 'table': table.attrib, 'columnName': column.find(tb+'columnName').text,
 'width': column.find(tb+'columnWidthNative').text, 'cell': cell.attrib,
 'values': {node.tag.split('}')[-1]: node.text for node in cell},
 'newCell': {node.tag.split('}')[-1]: node.text for node in column.find(tb+'cells').findall(tb+'cell')[-1]}}))
`;

test('native sheet save preserves exact answers, formatting, names and sibling app statement delimiters', async t => {
  const {context, file, other, item} = setupSave(t), otherBefore = fs.readFileSync(other);
  const result = await context.save(item, {cells: {'0:0': {formula: '=nativeCAS(2)', data: '√(2)'}, '19:0': {formula: '=B1+C20', data: '12'}}});
  assert.equal(result.saved_cells, 2);
  assert.equal(path.resolve(result.file), file);
  const saved = python(inspectSaved, {file});
  assert.deepEqual(saved, {program: 'Prgm\rDisp x\rEndPrgm', sibling: 'literal\rsecond\rthird', table: {custom: 'table-metadata'}, columnName: 'measurements', width: '93', cell: {format: 'keep'}, values: {rowId: '1', formula: '=nativeCAS(2)', data: '√(2)', globalName: 'named_cell', style: 'bold'}, newCell: {rowId: '20', formula: '=B1+C20', data: '12'}});
  assert.match(fs.readFileSync(file, 'utf8'), /xmlns:unused="urn:keep-unused"/);
  assert.deepEqual(fs.readFileSync(other), otherBefore);
  // The returned standalone widget must remain usable as the next save snapshot.
  await context.save({...item, file: result.file, raw_xml: result.raw_xml}, {cells: {'0:0': {formula: '=nativeCAS(2)', data: '√(2)'}}});
});

test('native sheet save rejects stale paths, foreign files and changed snapshots without modifying another sheet', async t => {
  const {context, file, other, item, sourcePath, directory} = setupSave(t);
  const before = fs.readFileSync(file), otherBefore = fs.readFileSync(other);
  for (const invalid of [
    {...item, file: path.join(sourcePath, 'Missing.xml')},
    {...item, file: path.join(directory, 'foreign', 'Problem1.xml')},
    {...item, path: '/prob/card/wdgt[99]'},
    {...item, path: '/prob/card/wdgt[1]'},
    {...item, raw_xml: snapshot.replace('√(2)', 'changed-cache')},
    {...item, raw_xml: ''},
  ]) {
    await assert.rejects(context.save(invalid, {cells: {'0:0': {formula: '999', data: '999'}}}), /selected|inspected|changed|outside|exists/i);
    assert.deepEqual(fs.readFileSync(file), before);
    assert.deepEqual(fs.readFileSync(other), otherBefore);
  }
});

test('failed native save replacement leaves the original Problem intact and removes temporary output', async t => {
  const {context, file, stagePath, item} = setupSave(t, {failReplace: true});
  const before = fs.readFileSync(file);
  await assert.rejects(context.save(item, {cells: {'0:0': {formula: '999', data: '999'}}}), /simulated atomic replacement failure/);
  assert.deepEqual(fs.readFileSync(file), before);
  assert.deepEqual(fs.readdirSync(stagePath).sort(), ['Problem1.xml', 'Problem2.xml']);
});

test('compound layout save uses the latest native app snapshot and rejects pages removed since opening', async () => {
  const current = {file: '/stage/Problem1.xml', path: '/prob/card[2]', raw_xml: '<card><wdgt>saved sheet data</wdgt></card>'};
  const writes = [], page = {file: '/source/Problem1.xml', path: '/prob/card[2]', detail: {w1: 5000}, raw_xml: '<card>old data</card>'};
  const context = {Object, Error, xmlDoctor: {}, ensureXmlStageCopy: async () => {}, inspectXmlDocument: async () => ({items: [current]}), documentLayoutCards: data => data.items, documentPreviewFileKey: file => file.replace(/^\/(source|stage)\//, ''), documentCardPath: value => value, writeDocumentPageLayout: async change => writes.push(change)};
  vm.runInNewContext(extract('async function saveDocumentCardLayout(', '\nfunction documentCardPath(') + '\nglobalThis.save=saveDocumentCardLayout;', context);
  await context.save(page, {w1: 6500});
  assert.equal(writes.length, 1);
  assert.equal(writes[0].cards[0], current);
  assert.equal(writes[0].cards[0].raw_xml, current.raw_xml);
  assert.equal(page.detail.w1, 6500);
  await assert.rejects(context.save({...page, path: '/prob/card[9]'}, {w1: 6000}), /no longer exists/);
  assert.equal(writes.length, 1);
});
