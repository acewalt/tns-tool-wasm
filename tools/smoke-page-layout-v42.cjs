/* Native layout geometry and real DOM regression; no private files required. */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = path.resolve(process.env.TNS_SMOKE_WEB_ROOT || path.join(__dirname, '..'));
const report = process.env.TNS_SMOKE_REPORT || path.join(root, 'release/qa/widgets-v42/page-layout-browser.json');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'tns-layout-v42-')));
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1200, height: 900, webPreferences: { sandbox: true, contextIsolation: true } });
  try {
    await win.loadURL('data:text/html,<html lang="en"><body></body></html>');
    await win.webContents.insertCSS(fs.readFileSync(path.join(root, 'web/document-compound-preview.css'), 'utf8'));
    await win.webContents.insertCSS('.compound-preview-calculator{width:320px;height:240px}.compound-preview-chrome{height:26px;flex:none}.modal-backdrop{position:relative}.compound-preview-modal{display:block}');
    await win.webContents.executeJavaScript(fs.readFileSync(path.join(root, 'web/document-compound-preview.js'), 'utf8'));
    await win.webContents.executeJavaScript(fs.readFileSync(path.join(root, 'web/spreadsheet-tools.js'), 'utf8'));
    const result = await win.webContents.executeJavaScript(`(${check.toString()})()`);
    fs.mkdirSync(path.dirname(report), { recursive: true }); fs.writeFileSync(report, JSON.stringify(result, null, 2));
    fs.writeFileSync(report + '.png', (await win.webContents.capturePage()).toPNG());
    console.log(JSON.stringify(result)); app.exit(0);
  } catch (error) {
    fs.mkdirSync(path.dirname(report), { recursive: true }); fs.writeFileSync(report, JSON.stringify({ ok: false, error: error.stack }, null, 2));
    console.error(error); app.exit(1);
  } finally { win.destroy(); }
});
async function check() {
  const must = (condition, message) => { if (!condition) throw Error(message); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  let mounted = 0, disposed = 0, resizes = 0, edits = 0, ungroups = 0, saves = 0, lastDraft;
  const mount = (host, item) => { mounted++; host.textContent = item.name; return { resize() { resizes++; }, dispose() { disposed++; } }; };
  window.TnsGraphPreview = { mount }; window.TiNotepadRichView = { mount };
  window.TnsDocumentPreviewNavigation = { accentFor: kind => kind === 'graphs' ? '#299bbe' : '#ffad32', updateChrome(host, { appKind }) { host.dataset.previewAppKind = appKind; } };
  // Independent expected slot order for each native code, with x=40%,
  // first row=60%, and second column row=30% for asymmetric four-app pages.
  const expected = [
    [[0, 0, 100, 100]],
    [[0, 0, 40, 100], [40, 0, 60, 100]],
    [[0, 0, 100, 60], [0, 60, 100, 40]],
    [[0, 0, 100, 60], [0, 60, 40, 40], [40, 60, 60, 40]],
    [[0, 0, 40, 60], [40, 0, 60, 60], [0, 60, 100, 40]],
    [[0, 0, 40, 60], [40, 0, 60, 100], [0, 60, 40, 40]],
    [[0, 0, 40, 100], [40, 0, 60, 30], [40, 30, 60, 70]],
    [[0, 0, 40, 60], [40, 0, 60, 30], [0, 60, 40, 40], [40, 30, 60, 70]],
  ];
  const results = [];
  for (let clay = 0; clay < expected.length; clay++) {
    const page = { file: 'Problem1.xml', path: '/prob/card', detail: { clay, w1: 4000, h1: 6000, w2: 7000, h2: 3000 }, previewItems: expected[clay].map((_, index) => ({ name: `App ${index}`, previewKind: index === 0 ? 'graphs' : 'notes' })) };
    const opened = TnsCompoundPreview.open(page, {
      setDraft(draft) { lastDraft = draft; },
      onEditLayout(selected, layout) { must(selected === page && layout.clay === clay, 'Layout callback lost page context'); edits++; },
      onUngroup(selected) { must(selected === page, 'Ungroup callback lost page context'); ungroups++; },
      onSave(layout) { must(layout.w2 === 7000 && layout.h2 === 3000, 'Save dropped secondary ratios'); saves++; },
    });
    const stage = opened.backdrop.querySelector('.compound-preview-panes'), bounds = stage.getBoundingClientRect();
    const actual = [...stage.querySelectorAll('.compound-preview-pane')].map(pane => {
      const box = pane.getBoundingClientRect(); return [box.left - bounds.left, box.top - bounds.top, box.width, box.height];
    });
    must(bounds.width === 320 && bounds.height === 214, 'Native calculator dimensions changed');
    for (const [index, box] of expected[clay].entries()) {
      const leftGap = box[0] > 0 ? 1 : 0, topGap = box[1] > 0 ? 1 : 0;
      const px = [box[0] / 100 * 320 + leftGap, box[1] / 100 * 214 + topGap, box[2] / 100 * 320 - leftGap - (box[0] + box[2] < 100 ? 1 : 0), box[3] / 100 * 214 - topGap - (box[1] + box[3] < 100 ? 1 : 0)];
      must(actual[index].every((value, axis) => Math.abs(value - px[axis]) < .1), `clay=${clay}: wrong native position in slot ${index}: ${JSON.stringify(actual[index])}`);
    }
    const dividerBoxes = [...stage.querySelectorAll('.compound-preview-divider')].map(handle => {
      const box = handle.getBoundingClientRect(); return { key: handle.dataset.layoutField, width: box.width, height: box.height };
    });
    if (clay === 3) must(dividerBoxes.find(d => d.key === 'w1').height < bounds.height * .41, 'Bottom split divider covers the top app');
    if (clay === 4) must(dividerBoxes.find(d => d.key === 'w1').height < bounds.height * .61, 'Top split divider covers the bottom app');
    if (clay === 5) must(dividerBoxes.find(d => d.key === 'h1').width < bounds.width * .41, 'Left divider covers the full right app');
    if (clay === 6) must(dividerBoxes.find(d => d.key === 'h2').width < bounds.width * .61, 'Right divider covers the full left app');
    const edit = opened.backdrop.querySelector('[data-compound-edit]'); must(!edit.hidden, 'Page layout control missing'); edit.click(); await pause();
    const ungroup = opened.backdrop.querySelector('[data-compound-ungroup]'); must(ungroup.hidden === (clay === 0), 'Ungroup availability wrong');
    if (!ungroup.hidden) { ungroup.click(); await pause(); }
    opened.backdrop.querySelector('[data-compound-save]').click(); await pause();
    const handle = stage.querySelector('[data-layout-field=w1]');
    if (handle) {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      must(opened.layout.w1 === 4250 && lastDraft.layout.w1 === 4250, 'Keyboard resize did not preserve the draft');
      must(lastDraft.layout.w2 === 7000 && lastDraft.layout.h2 === 3000, 'Resize dropped secondary ratios');
    }
    if (page.previewItems.length > 1) {
      stage.querySelector('[data-pane="1"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
      must(stage.querySelector('[data-pane="1"]').dataset.active === 'true', 'Active app state missing');
      must(opened.backdrop.querySelector('.compound-preview-chrome').dataset.previewAppKind === 'notes', 'Active app accent did not update');
    }
    results.push({ clay, positions: actual, dividers: dividerBoxes });
    opened.backdrop.querySelector('[data-widget-close]').click();
    must(!opened.backdrop.isConnected, 'Closing a page left its backdrop mounted');
  }
  must(mounted === disposed, 'A page change leaked app controllers');
  must(edits === 8 && ungroups === 7 && saves === 8 && resizes > 0, 'Layout callbacks did not run');
  const draft = TnsCompoundPreview.layoutFor({ previewItems: [{}, {}], detail: { clay: 1, w1: 4000 } }, { clay: 2, h1: 6500 });
  must(draft.clay === 2 && draft.h1 === 6500, 'Reopening a page ignored the draft layout preset');
  const sheetState = { cells: { '0:0': { formula: '2', data: '2' } }, rows: 20, cols: 12, activeRow: 0, activeCol: 0 };
  let adapterCalls = 0, adapterDestroyed = false, changedCells;
  const sheetPage = { file: 'Problem1.xml', path: '/prob/card', detail: { clay: 1 }, previewItems: [{ name: 'Graph', previewKind: 'graphs' }, { name: 'Sheet', previewKind: 'sheets' }] };
  const embedded = TnsCompoundPreview.open(sheetPage, {
    mountApplication(host, item) {
      must(item.previewKind === 'sheets', 'Adapter received the wrong application'); adapterCalls++;
      host.innerHTML = '<div class="spreadsheet-grid-shell"><div class="spreadsheet-grid" tabindex="0"></div></div><div class="spreadsheet-formula-bar"><span class="spreadsheet-cell-name"></span><input class="spreadsheet-formula-value" aria-label="Formula" /></div>';
      const controller = TnsSpreadsheetTools.mount(host, sheetState, { onChange(_state, change) { changedCells = change.changedCellKeys; } });
      return { ...controller, destroy() { controller.destroy(); adapterDestroyed = true; } };
    },
  });
  const sheetPane = embedded.backdrop.querySelector('[data-app-kind=sheets]');
  must(adapterCalls === 1 && sheetPane.querySelectorAll('.sheet-cell').length === 240, 'Embedded sheet did not use the spreadsheet controller');
  must(!sheetPane.querySelector('.compound-preview-unavailable'), 'Embedded sheet displays unavailable despite a live adapter');
  const formula = sheetPane.querySelector('.spreadsheet-formula-value'); formula.value = '42'; formula.dispatchEvent(new Event('change', { bubbles: true }));
  must(sheetState.cells['0:0'].formula === '42' && sheetState.cells['0:0'].data === '42' && changedCells.includes('0:0'), 'Embedded sheet editing did not update its source state');
  must(sheetPane.querySelector('[data-row="0"][data-col="0"].sheet-cell').textContent === '42', 'Edited sheet did not repaint');
  embedded.backdrop.querySelector('[data-widget-close]').click();
  must(adapterDestroyed, 'Embedded spreadsheet controller was not cleaned up');
  formula.value = '99'; formula.dispatchEvent(new Event('change', { bubbles: true }));
  must(sheetState.cells['0:0'].formula === '42', 'Disposed spreadsheet retained event handlers');
  return { ok: true, checks: ['all eight native presets', 'asymmetric four-pane dividers', 'native clay=5 app order', 'scoped dividers', 'keyboard resizing', 'draft ratios', 'active app header', 'layout and ungroup callbacks', 'controller cleanup', 'embedded spreadsheet editing and cleanup'], results, mounted, disposed };
}
