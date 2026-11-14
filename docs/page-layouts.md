# Page layouts and Notes templates

Document Inspector distinguishes **Cards** (calculator pages) from **Widgets** (applications). A page containing Graphs and two Notes apps is one card and three widgets. **+ Cards** previews pages in their native order.

Open **Page layout** in Document Inspector, in a Card's Actions, or from a page preview. Select a page to change its preset or move its applications up/down in the native slot order. Designs incompatible with the current app count are disabled. Create applications through **+ Page**, then select their pages in Page layout and choose **Group pages**. A page supports at most four apps. **Ungroup applications** creates adjacent single-app pages. Grouping stays within one problem, preserving variable scope. Save the document as TNS to export the layout.

Eight native presets are supported: single, columns, rows, full top/split bottom, split top/full bottom, split left/full right, full left/split right, and four panes. After saving a preset, **Preview page** lets you drag or keyboard-adjust the dividers; **Save layout** writes the native ratios. Double-click a divider to reopen layout settings.

Group/ungroup operations move the original widget XML; they do not hide or discard Notes. The existing Program Editor eye is different: it removes/restores the editor page while keeping the stored program callable. Snapshot checks reject stale changes. Pages with incompatible additional metadata are refused rather than losing their metadata.

Page layout opens above the current preview. Closing it restores that preview and its focus. Page labels show native application types, including repeated types, instead of XML filenames. Pending Notes and Sheets changes are committed before taking the layout snapshot; unfinished BASIC source remains a draft.

In Notes, select a **Math Template** to insert it directly at the current caret, replacing a selection if present. Matrix/system templates first ask for dimensions. Edit the source in place and press Enter or leave the field to commit; Escape cancels the edit. Double-click a formula to edit it again. Save writes a native Notes mathbox; existing text formatting and stored formula/result data are preserved.

Mixed pages embed Graphs, Notes, editable Sheets, TI.ProgramEditor, TI.Scratchpad, TI.PythonEditor and TI.PythonShell. Program Editor Run prepares its call in the page's Calculator; press Enter there to execute it. Python Run uses the page's shell, or temporarily replaces its editor with the shell when none is present. A shell's Edit action returns to its existing editor. Other applications can still have limited preview support. No preview claims full TI-Nspire OS emulation.

In Sheets, double-click/F2 or use the formula bar to edit. While entering `=B1+C20`, click cells to insert references, or drag a range for `=sum(A1:A4)`. Enter commits, Escape cancels. `=(B1+C20)` is valid and is saved as `=B1+C20`; necessary parentheses such as `=(B1+C20)*D1` remain. Copy/paste and dependent-cell recalculation work in standalone and grouped views. Native saves reject stale file/widget identities and preserve other applications' XML and cached data.

Validation: `npm test` includes native grouping/ungrouping, all eight preset counts, stale-target rejection, namespace/CR preservation, atomic writes and native TNS build/extract roundtrip tests. Electron smoke tools in `tools/smoke-*-v42.cjs` and `tools/smoke-*-v43.cjs` cover browser geometry, caret insertion, Notes serialization, formula picking, mixed-page execution and the offline application. Private user examples are optional local inputs and are not included in the repository.
