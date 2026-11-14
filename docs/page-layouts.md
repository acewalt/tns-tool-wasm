# Page layouts and Notes templates

Document Inspector distinguishes **Cards** (calculator pages) from **Widgets** (applications). A page containing Graphs and two Notes apps is one card and three widgets. **+ Cards** previews pages in their native order.

Open **Page layout** in Document Inspector, in a Card's Actions, or from a page preview. Select a page to change its preset or move its applications up/down in the native slot order. Designs incompatible with the current app count are disabled. Create applications through **+ Page**, then select their pages in Page layout and choose **Group pages**. A page supports at most four apps. **Ungroup applications** creates adjacent single-app pages. Grouping stays within one problem, preserving variable scope. Save the document as TNS to export the layout.

Eight native presets are supported: single, columns, rows, full top/split bottom, split top/full bottom, split left/full right, full left/split right, and four panes. After saving a preset, **Preview page** lets you drag or keyboard-adjust the dividers; **Save layout** writes the native ratios. Double-click a divider to reopen layout settings.

Group/ungroup operations move the original widget XML; they do not hide or discard Notes. The existing Program Editor eye is different: it removes/restores the editor page while keeping the stored program callable. Snapshot checks reject stale changes. Pages with incompatible additional metadata are refused rather than losing their metadata.

In Notes, use the **Math Templates** icon, complete the expression and choose **Insert expression**. Matrix/system templates first ask for dimensions. The formula is inserted at the remembered Notes caret, replacing a selection if present. Double-click an inserted formula to edit it. Save writes a native Notes mathbox; existing text formatting and stored formula/result data are preserved.

Mixed-page preview currently embeds Graphs, Notes and cached Spreadsheet values. Other app types still export in native layouts but may show an explicit unsupported-preview message. Edit Spreadsheet cells in the individual Sheet editor. No preview claims full TI-Nspire OS emulation.

Validation: `npm test` includes native grouping/ungrouping, all eight preset counts, stale-target rejection, namespace/CR preservation, atomic writes and native TNS build/extract roundtrip tests. Electron smoke tools in `tools/smoke-*-v42.cjs` cover real browser geometry, caret insertion, Notes serialization and the offline application. Private user examples are optional local inputs and are not included in the repository.
