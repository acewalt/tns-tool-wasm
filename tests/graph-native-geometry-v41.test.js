import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope = {};
vm.runInNewContext(fs.readFileSync(new URL('../web/graph-preview.js', import.meta.url), 'utf8'), scope);
const graph = scope.TnsGraphPreview;
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const node = (type, content) => `<g:${type}>${content}</g:${type}>`;

function circleConstruction() {
  const objects = [
    node('axes_system', '<g:id>axes</g:id><g:umin>-2</g:umin><g:umax>2</g:umax><g:vmin>-2</g:vmin><g:vmax>2</g:vmax><g:srfx>0</g:srfx><g:srfy>0</g:srfy><g:srfw>4</g:srfw><g:srfh>4</g:srfh>'),
    node('point', '<g:id>center</g:id><g:x>2</g:x><g:y>2</g:y>'),
    node('point', '<g:id>radius</g:id><g:x>3</g:x><g:y>2</g:y>'),
    node('circle', '<g:id>circle</g:id><g:par>center radius</g:par><g:circle_pp/>'),
    node('point', '<g:id>tip</g:id><g:par>circle</g:par><g:pton_c><g:t>1</g:t><g:aani>0</g:aani></g:pton_c><g:adst>7</g:adst>')
  ];
  for (const count of [12, 8]) {
    objects.push(node('polygon', `<g:id>poly${count}</g:id><g:par>center radius</g:par><g:pol_reg><g:s>${count}</g:s><g:r>1</g:r></g:pol_reg>`));
    for (let i = 0; i < count; i++) objects.push(node('point', `<g:id>p${count}-${i}</g:id><g:par>poly${count}</g:par><g:vx_pol><g:i>${i}</g:i></g:vx_pol>`));
    for (let i = 1; i < count / 2; i++) objects.push(node('segment', `<g:id>d${count}-${i}</g:id><g:par>p${count}-${i} p${count}-${i + count / 2}</g:par><g:apst>1</g:apst>`));
  }
  return graph.parseXml(`<wdgt type="TI.GeoGrapher" xmlns:g="urn:TI.GeoGrapher"><g:fig><g:objs>${objects.join('')}</g:objs></g:fig></wdgt>`);
}

test('native regular polygons use a center, radius point and clockwise vertex indices', () => {
  const state = circleConstruction(), geometry = graph.geometry(state);
  near(geometry.point('p12-1').x, Math.sqrt(3) / 2);
  near(geometry.point('p12-1').y, -.5);
  near(geometry.point('p8-1').x, Math.SQRT1_2);
  near(geometry.point('p8-1').y, -Math.SQRT1_2);
  for (const count of [12, 8]) {
    for (let i = 0; i < count; i++) {
      const point = geometry.point(`p${count}-${i}`);
      near(Math.hypot(point.x, point.y), 1);
    }
    for (let i = 1; i < count / 2; i++) {
      const line = geometry.line(state.objects.find(object => object.id === `d${count}-${i}`));
      near(Math.hypot(line.x, line.y), 1);
      near(Math.hypot(line.x + line.dx, line.y + line.dy), 1);
      near(line.x + line.dx / 2, 0);
      near(line.y + line.dy / 2, 0);
    }
  }
});

test('polygon dependencies follow a translated center and rotated radius instead of saved vertex coordinates', () => {
  const state = circleConstruction(), geometry = graph.geometry(state);
  Object.assign(state.objects.find(object => object.id === 'center'), { x: '2.5', y: '1.5' });
  Object.assign(state.objects.find(object => object.id === 'radius'), { x: '2.5', y: '3.5' });
  const point = geometry.point('p8-1');
  near(point.x, .5 + Math.SQRT2);
  near(point.y, -.5 + Math.SQRT2);
  for (const vertex of geometry.polygon(state.objects.find(object => object.id === 'poly12'))) near(Math.hypot(vertex.x - .5, vertex.y + .5), 2);
});

test('only a natively enabled point animation adds playback controls', () => {
  assert.equal(circleConstruction().animationAvailable, false);
  const xml = '<wdgt><fig><objs><point><id>p</id><pton_c><aani>1</aani></pton_c></point></objs></fig></wdgt>';
  assert.equal(graph.parseXml(xml).animationAvailable, true);
});

test('native dotted and dashed lines remain distinct and thickness is preserved', () => {
  assert.deepEqual(Array.from(graph.nativeLineStyle({ apst: '1', apth: '0' }).dash), [1, 3]);
  assert.deepEqual(Array.from(graph.nativeLineStyle({ apst: '2', apth: '0' }).dash), [5, 4]);
  assert.equal(graph.nativeLineStyle({ apst: '0', apth: '1' }).width, 2);
});

test('explicit endpoint and tick-spacing labels replace dense automatic axis values', () => {
  const state = circleConstruction();
  for (const [type, key] of [['0', 'xmax'], ['1', 'xmin'], ['2', 'ymax'], ['3', 'ymin']]) {
    state.objects.push({ type: 'number', id: key, children: { axisval: { ty: type } } });
    state.objects.push({ type: 'text', id: `label-${key}`, par: key, children: {}, asho: '1' });
  }
  state.tickX = .1; state.tickY = .2;
  for (const [type, axis] of [['0', 'x'], ['1', 'y']]) {
    state.objects.push({ type: 'number', id: `tick-${axis}`, children: { axistic: { ty: type } } });
    state.objects.push({ type: 'text', id: `label-tick-${axis}`, par: `tick-${axis}`, children: {}, asho: '1' });
  }
  state.objects.push({ type: 'text', id: 'hidden', par: 'xmin', children: {}, asho: '0' });
  const labels = graph.nativeAxisLabels(state);
  assert.equal(labels.length, 6);
  assert.equal(labels.filter(label => label.kind === 'bound').length, 4);
  assert.equal(labels.find(label => label.kind === 'tick' && label.axis === 'x').value, .1);
  assert.equal(labels.find(label => label.kind === 'tick' && label.axis === 'y').value, .2);
  state.viewport.xmax = 5;
  assert.equal(graph.nativeAxisLabels(state).find(label => label.kind === 'bound' && label.type === '0').value, 5);
  // Rounding a fractional split pane to CSS pixels must not turn a native
  // endpoint such as 1.1 into a visually distracting 1.1001 annotation.
  state.originalViewport = { ...state.viewport, ymax: 1.1 };
  state.viewport.ymax = 1.1001;
  assert.equal(graph.nativeAxisLabels(state).find(label => label.kind === 'bound' && label.type === '2').value, 1.1);
});
