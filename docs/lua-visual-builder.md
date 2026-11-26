# Lua Visual Builder

Open a Lua ScriptApp, then choose **Edit → Lua Visual Builder** (also available beside Preview Lua).

The builder works locally in the web and portable applications. It generates a standalone Lua 5.1 ScriptApp using TI-Nspire API 2.0. The project is embedded in a Lua comment, so reopening generated Lua restores its visual model. `.tnsvb.json` exports provide an independent backup. The original Lua remains unchanged until **Apply to editor**; the Code tab can download that original source. Arbitrary handwritten Lua is not converted into a visual project, and manual changes to generated code are not merged back into the model.

## Design

- Drag a component from the library, or click it to add one. Drag it on the canvas to move it; drag its bottom-right handle to resize. The inspector also accepts exact coordinates, sizes and colors.
- Supported abstractions: Label, Input, Button, Panel, Dropdown, Checkbox, Radio, Slider, Table, Graph, Image, Progress, Scroll, Formula and Shape.
- Panel and Scroll children use coordinates relative to their parent. Select a Scroll area and use arrow keys in Preview to scroll it. A Dropdown cycles its choices when activated.
- Images are resized to a maximum of 96 × 96 and encoded as RGB565-colored runs drawn by Lua; no remote image is required. Large or detailed images cost more drawing time on a calculator.
- Formula uses a read-only native D2Editor expression. Graph renders expressions over the logical range −10…10; it is an application component, not the full TI.Graphs app. Table displays CSV data, rather than implementing TI.Spreadsheet.
- Pages, application themes, layer order, parent containers, duplicate/delete, undo/redo, grid snapping and reusable components are available. Reusable component bundles and draft autosaves stay on the current computer. Export important work.

## Events and logic

Simple mode provides click, change and enter events on components, application start/timer events, and page show events. Actions include validation, formatted output, variables, lists, conditions, bounded loops, delays, navigation, TI variables, CAS and custom Lua. Page-local variables are separate from application globals. Expressions use `input("id")`, `value("id")`, `text("id")`, variable names, arithmetic/comparisons and supported functions. They are parsed; JavaScript `eval` is not used.

The Formula builder binds input IDs to an expression and a result label, with decimals and suffix. It adds an ordinary event action.

Advanced mode uses execution wires (white) and data wires (green). Click an output, then an input; drag node headings to arrange. A graph needs exactly one Event node. Its connected flow replaces the simple actions for that event. Invalid connections and data/execution cycles are rejected. Repeat/While nodes are bounded to 1,000 iterations. Unconnected nodes are not executed. Breakpoints pause the generated action queue: **Enter** steps, **R** resumes. The generated `VB.trace` retains the last 100 action IDs for custom diagnostics.

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

Use the existing `tns-tool lua check`, `lua preview` and TNS CLI commands on the generated source. Regression tests: `node --test tests/lua-visual-builder.test.js`. Browser integration: `tools/smoke-lua-visual-builder-v47.cjs` (Electron).

Official API references: [window size](https://education.ti.com/html/eguides/nspire/EG_Nspire/EN/content/eg_lua/m_libraries/platformlib/window/height_and_width.HTML), [graphics drawString](https://education.ti.com/html/eguides/nspire/EG_Nspire/EN/content/eg_lua/m_libraries/graphicslib/drawstring.HTML), [D2Editor](https://education.ti.com/html/webhelp/EG_TINspireLUA/EN/content/libraries/2deditorlib/newrichtext.htm).
