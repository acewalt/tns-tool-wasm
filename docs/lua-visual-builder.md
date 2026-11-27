# Lua Visual Builder

Open a Lua ScriptApp, then choose **Edit → Lua Visual Builder** (also available beside Preview Lua).

The builder works locally in the web and portable applications. It generates a standalone Lua 5.1 ScriptApp using TI-Nspire API 2.0. The project is embedded in a Lua comment, so reopening generated Lua restores its visual model. `.tnsvb.json` exports provide an independent backup. The original Lua remains unchanged until **Apply to editor**. V3 also analyzes handwritten Lua and imports the parts it can map safely; it does not promise a complete reverse conversion of arbitrary programs.

## V3: import existing Lua

**Current Lua File** analyzes the active ScriptApp. The start screen also imports external `.lua` and project JSON files, restores drafts and recent projects, and offers searchable templates with live thumbnails and an explicit preview. No Lua executes during analysis. Projects containing valid Visual Builder metadata restore directly.

The offline [luaparse 0.3.1](https://github.com/fstirlitz/luaparse/tree/v0.3.1) parser produces a Lua 5.1 AST with source ranges and lexical scopes. The analyzer records functions, parameters, variables, tables, calls, TI events, arithmetic, conditions, loops, drawing calls and D2Editor instances. A state equality in paint code can identify a possible page. A rectangle becomes a *possible* button only when a matching mouse region provides evidence; the review requires individual confirmation. This classification never replaces the original mouse handler.

- **Native:** restore the complete visual model from metadata.
- **Hybrid:** expose recognized constant `on.paint` calls (`drawString`, `drawRect`, `fillRect`, `drawLine`) as design components. Text and geometry are editable only where bound to literal AST arguments. Line geometry stays read-only. Variable-driven expressions remain linked to their original Lua.
- **Source only:** retain the complete script and expose its structure in Overview and read-only analysis graphs when a dependable editable drawing cannot be inferred.

Hybrid generation patches individual original expression ranges. It does not hoist functions, move captured variables, reorder top-level statements, regenerate original callbacks or introduce a second event dispatcher. Unknown calls, custom functions, D2Editor lifecycle code, loops and effects stay in their original places. Analysis graphs show branches, loops and Custom Lua fragments; they are a structural view, not an alternative executable reconstruction. Tables and helper functions are inventoried but are not automatically interpreted as pages or reusable UI components. Fonts and colors can be inferred for the design thumbnail; editing these inferred styles requires editing the original source. Dynamic paint code may have no faithful static thumbnail: use the explicit original preview.

Import Review shows actual AST counts, functions, scopes, warnings and individually reviewable button regions. **Original / Converted** compares both source versions, changed lines and component-to-source mappings. Each preview starts only on request, using the existing Lua runtime. Functional equivalence is explicitly **unverified**: matching syntax or a successful preview is not proof that every event or calculator behavior is identical.

The editable model supports 50 pages, 200 components per page and 200 nodes per graph. Import analysis accepts source up to 1.5 MB. Scripts exceeding the visual component limit fall back to Source only. Structural graphs cover the first 100 functions with bounded statement/depth expansion; every original function remains in the retained source and function inventory. Very large structural metadata may be reduced with a visible diagnostic to stay within the 4 MB project limit. Always export the original source or JSON as an independent backup.

## V3: navigation and graph workspaces

Navigation pages have persistent ID-based positions, a minimap, wheel zoom, middle-button pan, Shift/marquee multiselection, snap, alignment/distribution, locks, colored collapsible frames, Fit All and Focus Selected. Drag page headers to arrange freely; positions participate in Undo/Redo and survive tab changes and Lua/JSON export. Hierarchical, horizontal, vertical, radial and grid arrangements use real transitions, handle cycles and disconnected pages, and preserve manual/locked positions. **Reset layout** explicitly replaces manual positions, while locks remain respected. This bounded built-in layout avoids adding a second offline graph dependency.

Each existing transition has its own output port and event/node identity. Reconnecting it edits that specific Navigate node, including conditional branches, while retaining sibling transitions and additional actions. New transitions let you select the owner and applicable event. Page entries are separate input ports. Back remains dynamic. Compact history references are shown on the source page; optional history wires can be enabled in View settings.

Event Graph auto layout separates execution and data dependencies, places data near consumers and branches on separate rows, measures visible nodes, and supports selection-only layout. Reroutes preserve execution or data wires. Frames can be renamed, recolored and collapsed; selected nodes can be aligned, distributed or locked. Inspector edits reconcile existing nodes and retain unchanged IDs, connections, reroutes, positions, comments, breakpoints, frames and selection.

**Overview** searches pages, components, events, variables, functions, reusable flows, resources, dependencies and imported fragments across the whole project. Results open the related Design, Logic or source view. Imported structural graphs remain read-only to preserve their original execution semantics.

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

Use the existing `tns-tool lua check`, `lua preview` and TNS CLI commands on the generated source. Regression tests: `npm run test:visual-builder`. Browser integration: `tools/smoke-lua-visual-builder-v50.cjs` (Electron). The browser test blocks external requests and exercises the actual Lua runtime, explicit original/converted previews, import/apply/restore, movable pages, frames, typed sockets, undo/redo, debug, Syntax Doctor and TNS export.

Official API references: [window size](https://education.ti.com/html/eguides/nspire/EG_Nspire/EN/content/eg_lua/m_libraries/platformlib/window/height_and_width.HTML), [graphics drawString](https://education.ti.com/html/eguides/nspire/EG_Nspire/EN/content/eg_lua/m_libraries/graphicslib/drawstring.HTML), [D2Editor](https://education.ti.com/html/webhelp/EG_TINspireLUA/EN/content/libraries/2deditorlib/newrichtext.htm).

## Verification and hardware checks

V2 regression coverage includes the exact Menu mouseDown → navigation → mouseMove → mouseUp failure, keyboard and change-triggered navigation, cancellation of delayed actions, formula ASTs, typed wires, joins and reusable flows, migration, renaming, all starter templates, metadata and TNS roundtrip. Browser tests run the actual generated Lua offline and exercise inline editing, navigation/socket dragging, duplicate-with-event, undo/redo, breakpoints/Step/Resume, Syntax Doctor and the existing TNS exporter.

A physical TI-Nspire must still verify actual key/touchpad behavior, font metrics and clipping, D2Editor rendering, CAS results and timer/drawing performance. The browser preview is not a full emulator or hardware certification. Table and Graph components are builder abstractions; peripheral APIs and arbitrary external Lua libraries are outside the generated UI runtime.


## V4: approachable logic and runtime visual capture

**Logic opens in Simple mode.** Event Explorer can open events across all pages, with component names, search and a configured-only filter. Sequential actions, nested conditions, target selectors, a formula helper and a readable “What this does” explanation edit the same canonical graph as Advanced mode. Switching modes does not rewrite behavior. Advanced flows that cannot safely be represented as a sequence remain intact behind an expandable block. The formula helper builds ordinary calculations and empty-input conditions without typing Lua; Advanced expression remains available for custom expressions.

Advanced nodes expose their essential parameters directly, with typed execution/data sockets, F3 or Shift+A search, compatible-socket suggestions, insertion on execution wires, reroutes, collapsible frames and reusable flows. Drag an unconnected action onto an execution wire, or Shift+right-click a wire to choose a new action. Right-click a wire to add a typed reroute. The optional inspector retains technical identifiers and advanced properties. Debug Preview reads the generated Lua runtime’s actual execution trace and values.

Navigation uses compact page nodes, recognizable start pages, named transitions, separate input/output ports and live thumbnails. Double-click a heading or thumbnail to open Design. View settings select Compact, Standard or Detailed information; individual nodes can also collapse. Zoom progressively reduces detail. Selection emphasizes related connections. Back references never claim a fixed destination. Rounded routing considers node bounds and tries clear corridors; dense cyclic graphs can still need manual arrangement or reroutes. Auto Layout preserves manually moved or locked nodes; Reset positions explicitly replaces manual placement. Minimap can be hidden, resized and used to pan by click/drag.

The compact File/Edit/View/Window/Help shell includes split Code/Preview views, resizable panels and full screen. Overview links to real pages, events, functions, flows and variables. The template launcher uses model-rendered thumbnails, search/categories and a single Create action.

### Capture an existing Lua application

1. Choose **Current Lua File → Analyze**, or import a `.lua` file. Static analysis never starts the application.
2. If needed, run **Extended analysis** to resolve bounded helper calls and constant graphics. Unknown or dynamic source remains explicitly read-only.
3. Select **Start Visual Capture**, then **Start** to execute the original in an isolated preview. Pause, interact, inspect and capture screens deliberately.
4. Review the actual thumbnail, draw operations, font/color state and original source/function/line bindings. Duplicate screens are selected rather than added again. Screens with the same drawing structure can share a reconstruction group.
5. Confirm any observed transition you wish to retain as evidence. Capture does not infer that a transition is always valid or generate replacement handlers.
6. Export the capture session, create a **hybrid** project retaining the original program, or choose **Review & convert all screens** to create a separate editable visual copy of the selected observations. Classify components and confirm their event bindings before converting. Unknown behavior must be configured and verified.

Capture records supported graphics and D2Editor observations from the existing runtime. Helper calls are attributed to their original AST locations before CAS wrappers are added. Session import does not execute Lua. Sampling, operation, screen, source and metadata limits bound memory use: the UI records at most 300 sampled frames, 250,000 operations or two minutes per session. The JSON project still has its 4 MB limit; keep separate session/source backups for large captures. Hardware-only APIs and unsupported external libraries remain explicit preview limitations. No arbitrary Lua-to-visual conversion is guaranteed.

All assets and modules run locally in the Windows portable. No remote graph library or compilation server is required for these builder features. Browser integration tests block external network requests and exercise real generated Lua, helper capture, deduplication, source preservation, Simple/Advanced roundtrips, save/restore, three languages, graph sizes and viewport sizes. These checks do not certify physical calculator compatibility or replace a human beginner usability study.


## V5: graph interactions, Outliner and editable capture

A graph interaction controller owns pointer capture and mutually exclusive wire-drag, chooser, placement, reconnection, node-drag, pan and box-selection states. Releasing an output on empty canvas anchors the provisional wire and opens a fixed, compatible-node chooser. Arrow keys/Enter select; Escape, outside click, pointer cancellation, lost capture or focus loss remove the provisional state. Creation and automatic connection form one Undo operation. Cancelling a reconnection retains its original edge. New nodes use measured DOM bounds for free placement; explicit **Allow overlaps** remains available. Socket colors distinguish execution, numbers, text, booleans, pages, components and tables; connected/compatible states and larger hit areas improve targeting.

**Event Explorer** uses one canonical event graph model. Application events, direct page events and nested component events have semantic icons and configured/empty/error/selected/executing states. Search expands matching branches. Filters cover configured events, errors and favorites; recent events remain accessible. The panel supports keyboard navigation, expand/collapse, resize and collapse with locally retained workspace preferences. Context menus open Design/Logic/generated Lua, find references, rename visible owners, duplicate compatible events or confirm deletion. Add Event only offers events supported by that owner type. Navigation transitions retain readable component/event/destination labels and their original identifiers in tooltips.

**Overview** is a read-only relationship explorer with separate Structure, Dependencies and List modes. It shows real ownership, execution/data edges, navigation targets, component/variable references, flows, resources and source functions. Search, focus, selection and an optional inspector limit detail to relevant relationships. Its bounded workspace has independent scroll, zoom/pan/fit and an optional resizable minimap; page grids and measured node bounds avoid overlap. Selecting a different scope never changes program behavior.

**Editable capture** is an explicit conversion, not a promise of arbitrary reverse compilation. Review all captured screens, exclude drawings and classify their roles. Rectangles reviewed as buttons can merge their contained label. Only confirmed transitions with a reviewed, compatible component/event become navigation handlers. Ambiguous or unconfirmed transitions stay in a pending list. Missing image resources require separate import. The editable copy retains the complete original Lua as a backup and offers Original/Converted comparison with separate explicit previews. Calculations, state, timers and unknown source handlers are not fabricated or silently activated. Hybrid mode continues to execute the preserved original; Source Inspector remains available. Apply/export asks for confirmation when a reconstructed copy replaces the original behavior.

V5 verification adds `tests/lua-visual-builder-v5.test.js` and `tools/smoke-lua-visual-builder-v51.cjs`. The Electron harness uses real pointer input to exercise wire drop/chooser/creation, reconnection, cancellation, keyboard selection, edge clamping and atomic Undo/Redo at multiple zoom levels. It checks Outliner context/filter behavior, actual multipage runtime capture and conversion, plus bounded Overview layouts for 4, 10, 25 and 50 pages. The V4 regression harness remains in use for the actual generated Lua, three languages and existing workflows. External requests are blocked in browser tests.
