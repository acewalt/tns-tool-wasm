# Lua Visual Builder

Open a Lua ScriptApp, then choose **Edit → Lua Visual Builder** (also available beside Preview Lua).

The builder works locally in the web and portable applications. It generates a standalone Lua 5.1 ScriptApp using TI-Nspire API 2.0. The project is embedded in a Lua comment, so reopening generated Lua restores its visual model. `.tnsvb.json` exports provide an independent backup. The original Lua remains unchanged until **Apply to editor**; the Code tab can download that original source. Arbitrary handwritten Lua is not converted into a visual project, and manual changes to generated code are not merged back into the model.

## Design

- Drag a component from the library, or click it to add one. Drag it on the canvas to move it; use any of its eight handles to resize. Double-click a button or label to edit its text in place: Enter saves, Shift+Enter inserts a line, and Esc cancels. The inspector also accepts exact coordinates, sizes and colors.
- Supported abstractions: Label, Input, Button, Panel, Dropdown, Checkbox, Radio, Slider, Table, Graph, Image, Progress, Scroll, Formula and Shape.
- Panel and Scroll children use coordinates relative to their parent. Select a Scroll area and use arrow keys in Preview to scroll it. A Dropdown cycles its choices when activated.
- Images are resized to a maximum of 96 × 96 and encoded as RGB565-colored runs drawn by Lua; no remote image is required. Large or detailed images cost more drawing time on a calculator.
- Formula uses a read-only native D2Editor expression. Graph renders expressions over the logical range −10…10; it is an application component, not the full TI.Graphs app. Table displays CSV data, rather than implementing TI.Spreadsheet.
- Pages, application themes, layer order, parent containers, duplicate/delete, undo/redo, grid snapping and reusable components are available. Reusable component bundles and draft autosaves stay on the current computer. Export important work.

## Events and logic

Simple mode provides click, change and enter events on components, application start/timer events, and page show events. Actions include validation, formatted output, variables, lists, conditions, bounded loops, delays, navigation, TI variables, CAS and custom Lua. Page-local variables are separate from application globals. Expressions use `input("id")`, `value("id")`, `text("id")`, variable names, arithmetic/comparisons and supported functions. They are parsed; JavaScript `eval` is not used.

The Formula builder binds input IDs to an expression and a result label, with decimals and suffix. It adds an ordinary event action.

Advanced mode uses execution wires (white) and data wires (green). Drag an output socket to an input (or click the two ports); dropping a wire in empty space opens the contextual node search. Drag node headings to arrange. Each event has one canonical graph and an automatically created Event entry. The Design action list, node inspector, Navigation and generated Lua are projections of that graph. Editing either representation updates the others. Invalid connections and data/execution cycles are rejected. Repeat/While nodes are bounded to 1,000 iterations. Unconnected nodes are not executed. Use **Debug preview** for breakpoints, Step and Resume, active page, events, variables and before/after target values. It highlights the latest executed action node. Debug instrumentation is opt-in: normal Lua/TNS export ignores editor breakpoints and does not record traces. Runtime queues are bounded and navigation cancels pending interactions and delayed actions from the previous page.

## V2 workspace and navigation

The Widget Tree lists pages and nested components. It shares selection with the canvas and inspector. Drag rows to change drawing order; drop onto a Panel or Scroll area to change parent (Shift keeps reordering). Locks affect editing, while the two visibility controls distinguish designer visibility from exported runtime visibility. Duplicate preserves the component subtree and its event graphs. Ctrl+C/Ctrl+V/Ctrl+D also work on canvas selections.

The Navigation tab renders live thumbnails from the same renderer used by the designer and template gallery. Drag a trigger socket onto a destination page to configure navigation, or open its event graph. Back uses history rather than a fixed destination. Conditional links, the start page and unreachable-page warnings are distinguished. Double-click a page thumbnail to return to Design.

The designer supports canvas zoom, Fit to View, middle-button panning, marquee/Shift selection, magnetic guides, alignment/distribution, keyboard moves, resizable side panels and full screen. Graphs support typed sockets, context search, zoom/pan, copy/paste, undo/redo, a minimap, auto layout, comments/group labels, property selectors and reusable flows. Structured If, Sequence, Repeat and While ports provide explicit continuation; arbitrary wire cycles are rejected.

The gallery includes Blank, Hooke, Menu, Form, Graph, Quiz, Study, unit converter, scientific calculator, scored quiz, multipage form and animated physics examples. Each thumbnail comes from its project model. Formula actions generate operator/read-input nodes for supported arithmetic; other valid expressions remain in an explicit Expression node. Inputs and output precision/units can be configured without writing Lua.

## Existing projects

Version 1 metadata and JSON projects migrate to version 2 when opened. Where old simple actions conflict with an existing graph, the graph retains its previously effective behavior; both original representations are preserved in `migrationArchive`. Nothing is silently merged into duplicate execution. Export the migrated project to retain this archive independently. Advanced flows show a graph shortcut when a simple action list cannot represent them.

## Run and export

Preview runs the generated Lua in an isolated iframe using the existing TI-Nspire runtime, not a second HTML implementation of the application. Tab moves focus; Enter activates; Esc navigates back. Native inputs accept calculator key events. The Lua Code tab validates generation and downloads `.lua` or packages the current document as `.tns` through the normal TNS builder. **Apply to editor** saves the generated ScriptApp in the current staging document.

Native drawing scales from a 320 × 212 design space to `platform.window:width()` / `height()`, including narrower grouped-page panes. Preview remains a partial TI-Nspire implementation; successful browser tests are not physical-calculator certification. Hardware peripherals and arbitrary external libraries are not emulated.

## Automation

```js
import {template,generateLua,decodeProject} from './src/lua-visual-builder/index.js';
const project=template('hooke');
const lua=generateLua(project);
const restored=decodeProject(lua);
```

Use the existing `tns-tool lua check`, `lua preview` and TNS CLI commands on the generated source. Regression tests: `npm run test:visual-builder`. Browser integration: `tools/smoke-lua-visual-builder-v48.cjs` (Electron).

Official API references: [window size](https://education.ti.com/html/eguides/nspire/EG_Nspire/EN/content/eg_lua/m_libraries/platformlib/window/height_and_width.HTML), [graphics drawString](https://education.ti.com/html/eguides/nspire/EG_Nspire/EN/content/eg_lua/m_libraries/graphicslib/drawstring.HTML), [D2Editor](https://education.ti.com/html/webhelp/EG_TINspireLUA/EN/content/libraries/2deditorlib/newrichtext.htm).

## Verification and hardware checks

V2 regression coverage includes the exact Menu mouseDown → navigation → mouseMove → mouseUp failure, keyboard and change-triggered navigation, cancellation of delayed actions, formula ASTs, typed wires, joins and reusable flows, migration, renaming, all starter templates, metadata and TNS roundtrip. Browser tests run the actual generated Lua offline and exercise inline editing, navigation/socket dragging, duplicate-with-event, undo/redo, breakpoints/Step/Resume, Syntax Doctor and the existing TNS exporter.

A physical TI-Nspire must still verify actual key/touchpad behavior, font metrics and clipping, D2Editor rendering, CAS results and timer/drawing performance. The browser preview is not a full emulator or hardware certification. Table and Graph components are builder abstractions; peripheral APIs and arbitrary external Lua libraries are outside the generated UI runtime.
