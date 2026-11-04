import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../document-preview-navigation.js', import.meta.url), 'utf8');

function fixture() {
  class Element {
    constructor(tagName) { this.tagName = tagName; this.children = []; this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
  }
  const context = { document: { createElement: name => new Element(name) } };
  vm.runInNewContext(source, context);
  return context.TnsDocumentPreviewNavigation;
}

const page = (file, card, overrides = {}) => ({
  file: `/document/${file}`, path: `/prob/card[${card}]/wdgt`,
  type: 'Widget', name: 'TI.ProgramEditor', content_label: 'ProgramEditor', ...overrides,
});
const values = iterable => Array.from(iterable);
const tabsOf = nav => nav.children.filter(child => child.className === 'document-preview-tab');

test('Basic groups actual TI.ProgramEditor pages and excludes graph Func symbols', () => {
  const nav = fixture();
  const program = page('Problem1.xml', 3);
  const functionEditor = page('Problem2.xml', 1, { detail: { type: 'Func', name: 'functionEditor' } });
  const graph = page('Problem1.xml', 1, { name: 'TI.GeoGrapher', content_label: 'Graph' });
  const expression = { type: 'Func', name: 'f1', content_label: 'Value', file: graph.file, path: '/prob/sym/e[1]', content: 'sin(x)' };
  const symbol = { type: 'Prgm', name: 'program', content_label: 'Value', file: program.file, path: '/prob/sym/e[2]' };
  const result = nav.groups([expression, program, symbol, graph, functionEditor]);
  assert.deepEqual(values(result.basic), [program, functionEditor]);
  assert.deepEqual(values(result.graphs), [graph]);
  assert.equal(Object.values(result).flat().includes(expression), false);
  assert.equal(Object.values(result).flat().includes(symbol), false);
});

test('empty groups remain empty and only supported app types enter their groups', () => {
  const nav = fixture();
  for (const entries of Object.values(nav.groups())) assert.equal(entries.length, 0);
  const items = [
    { type: 'Lua Script', content_label: 'Lua' },
    { type: 'Widget', content_label: 'Python' },
    { type: 'Resource', content_label: 'Image' },
    { type: 'Widget', content_label: 'Spreadsheet' },
    { type: 'Widget', content_label: 'Notepad' },
    { type: 'Widget', content_label: 'Graph' },
    { type: 'Widget', content_label: 'Scratchpad' },
  ];
  const result = nav.groups(items);
  for (const [index, kind] of ['lua', 'python', 'images', 'sheets', 'notes', 'graphs', 'calculators'].entries()) {
    assert.deepEqual(values(result[kind]), [items[index]]);
  }
  assert.equal(result.basic.length, 0);
});

test('page groups sort natural Problem and card order without reordering the input', () => {
  const nav = fixture();
  const ordered = [page('Problem2.xml', 2), page('Problem2.xml', 10), page('Problem10.xml', 1)];
  const original = [ordered[2], ordered[1], ordered[0]];
  assert.deepEqual(values(nav.groups(original).basic), ordered);
  assert.deepEqual(original, [ordered[2], ordered[1], ordered[0]]);
});

test('labels reference actual Problem/card paths, including Windows paths and implicit first card', () => {
  const nav = fixture();
  assert.equal(nav.pageLabel(page('Problem12.xml', 7), 0), '12.7');
  assert.equal(nav.pageLabel({ file: 'C:\\stage\\Problem3.xml', path: '/prob/card/wdgt' }, 9), '3.1');
  assert.equal(nav.pageLabel({ file: '/stage/Problem4.xml', path: '/prob/card[2]/wdgt/sc/lua' }, 8), '4.2');
  assert.equal(nav.pageLabel({ file: '/stage/image.BMP', path: '/image.BMP' }, 2), '1.3');
});

test('zero/one page hides page navigation and visible window never exceeds three tabs', () => {
  const nav = fixture();
  assert.equal(nav.createTabs(), null);
  assert.equal(nav.createTabs({ items: [page('Problem1.xml', 1)] }), null);
  assert.deepEqual(values(nav.windowFor(0).indices), []);
  assert.deepEqual(values(nav.windowFor(1, 5).indices), [0]);
  assert.deepEqual(values(nav.windowFor(3, 1).indices), [0, 1, 2]);
  const last = nav.windowFor(7, 6);
  assert.deepEqual(values(last.indices), [4, 5, 6]);
  assert.equal(last.previous, true);
  assert.equal(last.next, false);
  for (let selected = 0; selected < 9; selected++) {
    const view = nav.windowFor(9, selected);
    assert.equal(view.indices.length, 3);
    assert.ok(view.indices.includes(selected), `Selected page ${selected} must be visible`);
  }
});

test('arrows reveal more than three pages and clicking a page selects the correct original index', () => {
  const nav = fixture();
  const selected = [];
  const items = Array.from({ length: 5 }, (_, i) => page('Problem2.xml', i + 4));
  const tabs = nav.createTabs({ items, selected: 0, onSelect: index => selected.push(index) });
  assert.deepEqual(tabsOf(tabs).map(tab => tab.textContent), ['2.4', '2.5', '2.6']);
  assert.equal(tabs.children[0].disabled, true);
  assert.equal(tabs.children.at(-1).disabled, false);
  assert.equal(tabsOf(tabs)[0].attributes['aria-current'], 'page');
  tabsOf(tabs)[0].onclick();
  assert.deepEqual(selected, [], 'Clicking the already selected tab should not reopen the preview');

  tabs.children.at(-1).onclick();
  assert.deepEqual(tabsOf(tabs).map(tab => tab.textContent), ['2.5', '2.6', '2.7']);
  tabs.children.at(-1).onclick();
  assert.deepEqual(tabsOf(tabs).map(tab => tab.textContent), ['2.6', '2.7', '2.8']);
  assert.equal(tabs.children.at(-1).disabled, true);
  assert.equal(tabs.children[0].disabled, false);
  tabsOf(tabs).at(-1).onclick();
  assert.deepEqual(selected, [4]);

  tabs.children[0].onclick();
  assert.deepEqual(tabsOf(tabs).map(tab => tab.textContent), ['2.5', '2.6', '2.7']);
  assert.equal(tabsOf(tabs).length, 3);
});
