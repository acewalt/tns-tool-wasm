# TNS Tool WASM

TNS Tool WASM is an experimental browser-based toolkit for TI-Nspire workflows.

It runs directly in the browser with Pyodide/WebAssembly and JavaScript, so it can decode, inspect, edit, validate, and rebuild TI-Nspire-related files without requiring the original command-line workflow.

## Live Demo

https://acewalt.github.io/tns-tool-wasm/

## Video Demo

[Watch the demo on YouTube](https://youtu.be/ahgmAFpDRj8)

## What It Can Do

- Decode normal `.tns` files into editable XML folders.
- Rebuild normal `.tns` files from XML folders.
- Open `.xml`, `.tns.xml`, `.tns`, and ZIP-style project inputs through upload or drag and drop.
- Detect editable TI-Nspire program blocks inside XML.
- Edit, validate, and save TI-Nspire XML program code visually.
- Create Python Program `.tns` files from Python code and templates.
- Extract `q.py` from Python Program `.tns` files.
- Add and edit Lua ScriptApp pages inside TI-Nspire XML.
- Preview Lua ScriptApps in the browser with a TI-Nspire-like canvas.
- Insert visual Lua templates such as forms, menus, advanced menus, and popups.
- Edit generated Lua pages visually after inserting templates.
- Convert common TI-Basic/PRG menu-and-request programs into visual Lua pages.
- Run Lua ScriptApps programmatically from a Node CLI/API for agent-driven tests.
- Work in Spanish, English, and French.
  
 ![New](docs/images/new.gif)

## Syntax Doctor XML

Syntax Doctor XML is a visual editor for TI-Nspire XML program blocks.

It includes:

- Single XML file and `.tns.xml` folder loading.
- Editable program-block detection.
- Calculator-like code highlighting.
- Line, column, and issue reporting.
- Syntax diagnostics with errors, warnings, and information panels.
- Safe Auto Fix corrections.
- Manual variable resolution for ambiguous fixes.
- Preview of Auto Fix changes before saving.
- Formatting tools for spacing and empty-line cleanup.
- Save-back into XML.
- ZIP download of the edited XML project.

![Syntax](docs/images/sintax_doctor.gif)

## Lua ScriptApp Tools

The Lua editor helps create and edit Lua ScriptApp code inside TI-Nspire XML.

It includes:

- Add Lua ScriptApp with a starter page.
- Lua syntax check.
- Browser-based Lua preview with keyboard buttons, click support, and input simulation.
- Lua guide panel.
- Lua template builder.
- Visual page editor.
- Save Lua back into XML.
- Richer code highlighting for Lua variables, keywords, strings, numbers, and comments.
- Page navigation helpers such as next, back, home, details, and direct page routing.

 ![Lua](docs/images/lua.gif)

## Agent And CLI Lua Testing

TNS Tool WASM also exposes a programmatic Lua runner for agents and automated tests. It does not require browser clicks, DOM state, or the visual preview.

Examples:

```bash
npm install
npm test
npm run tns-tool -- capabilities --json
npm run tns-tool -- lua check archivo.lua --json
npm run tns-tool -- lua call archivo.lua --function miFuncion --args "[1,2]" --json
npm run tns-tool -- lua suite archivo.lua tests/edo.sample.json --json
```

The public JavaScript API is available from `src/api/index.js`:

```js
import { loadLuaScript, runLuaSuite } from "./src/api/index.js";

const lua = await loadLuaScript("archivo.lua");
const result = lua.call("miFuncion", [1, 2]);
console.log(result);
lua.close();
```

See [AGENTS.md](AGENTS.md) for the full machine-readable test format, capabilities, exit codes, JSON output, schemas, and TI-Nspire mock limitations.

## Lua Templates

The template builder can generate reusable visual Lua pages.

 inspired by ProbasMaster, Formula Pro, and ABA Logique Nspire 2, were an experiment.

Available template families include:

- Formulario: calculator-style form with input fields, variable bindings, result output, details popup, and configurable buttons.
- Menu: simple vertical menu with route targets.
- Menu avanzado: TI-Nspire-style list menu with title, subtitle, scroll area, route targets, and optional back button.
- Popup: centered message box with configurable size, colors, text, and action.

Templates can be inserted into existing Lua code. Generated blocks include comments so users can see where each inserted template starts and ends.

![Templates](docs/images/templates.gif)

## TI-Basic/PRG To Lua Visual Converter

The `TNS to Lua convert code` tool is experimental.

It is not a universal converter for every possible program or every programming language. It is a pattern-based converter focused on common TI-Basic/PRG structures:

- `Disp` menu screens.
- `Request` inputs.
- nested `If ... Then ... Else ... EndIf` routing.
- assignments using `→` or `->`.
- formulas using variables, arithmetic, powers, square roots, and common math functions.
- result/procedure text generated from nearby `Disp` lines.
- menu choices that set constants before opening the next form.

  ![Convert](docs/images/convert.gif)

The goal is to convert many structured calculator programs into editable Lua visual pages, not to perfectly understand every possible TI-Basic program.

## Variable And Action System

Lua forms can bind input fields to variables. Buttons can run visual actions such as:

- calculate an expression.
- store the result in a variable.
- show result text.
- show procedure/details text.
- navigate to another page.
- use constants selected from previous menu choices.

This is useful for calculator-style workflows where one screen collects values, another screen routes options, and a details popup explains the calculation.

## Syntax Doctor PY

Syntax Doctor PY is a browser-based Python editor for Python Program workflows.

It includes:

- Python syntax checks through the shared Python analyzer.
- unsupported f-string detection.
- non-ASCII character detection.
- safe Auto Fix corrections.
- change preview.
- save edited code back into the inline Python block.
- `.py` download.
- TI-Nspire-inspired Python highlighting.

## Local Testing

From the repository root:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Do not open `index.html` with `file://`, because browsers block the `fetch()` calls needed to load Python modules and runtime assets.

## Technical Notes

- Pyodide is loaded from the official CDN.
- JSZip is loaded from CDN for ZIP generation.
- Python modules are loaded into Pyodide at runtime.
- Lua preview runs through a browser-side LuaJS/Nspire-like runtime.
- The browser cannot write directly to local Windows paths, so files are handled through upload and download.
- A fully offline version would need bundled Pyodide, JSZip, and runtime assets.

## Feedback

Bug reports, questions, suggestions, and test files are welcome.

## Credits

Developed and implemented by Andres Mauricio Chaparro Pena.

Reverse-engineering packaging logic and base structure are attributed to MaksimirKurtov and the open TnsTools project:

- MaksimirKurtov: https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=393033
- TnsTools: https://tiplanet.org/forum/viewtopic.php?t=27393&p=280845#p280845

The original idea and technical mentoring for the WebAssembly/Web port are attributed to Adriweb:

- Adriweb: https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=1381

## Disclaimer

TNS Tool WASM is an independent software-development project and is not affiliated with, sponsored by, authorized by, or officially associated with Texas Instruments.
