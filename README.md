# TNS Tool WASM

**TNS Tool WASM lets you create, edit and preview TI-Nspire content in your browser. It now includes ROM Converter and direct USB file transfers to the calculator from the website. You can create, edit and compile Ndless C/C++ projects in TNS Tool Portable for Windows, with the SDK included. A Linux desktop version is coming soon. Some preview features and game compatibility remain experimental.**

TNS Tool WASM is an experimental browser-based toolkit for TI-Nspire workflows.

It runs directly in the browser with Pyodide/WebAssembly and JavaScript, so it can decode, inspect, edit, validate, and rebuild TI-Nspire-related files without requiring the original command-line workflow.

 ![New](docs/images/+page.png)

## Live Demo

https://acewalt.github.io/tns-tool-wasm/

## Windows portable download

[Download TNS Tool Portable for Windows x64](https://github.com/acewalt/tns-tool-wasm/releases/latest/download/TNS-Tool-Portable-Windows-x64.zip) · [Release notes and SHA256](https://github.com/acewalt/tns-tool-wasm/releases/latest)

Close any older version, extract the entire ZIP into a new folder, and open **TNS Tool Portable.exe**. Check the version in the window title. The Ndless SDK is included; no separate toolchain installation is required. The web New/Open Ndless Project actions link to this same download.

Cierra la versión anterior, extrae todo el ZIP en una carpeta nueva y abre **TNS Tool Portable.exe**. La versión aparece en el título. El SDK de Ndless viene incluido. **Los proyectos Ndless C/C++ se compilan actualmente solo en Windows; la versión para Linux llegará próximamente y todavía no tiene una descarga publicada.**

## What's new

- **ROM Converter:** select a local cartridge, detect its console, preview it with interactive controls, and download an editable project or calculator package. Available in the web and Windows versions.
- **Working Ndless Projects on Windows:** create, open, edit, preview and compile supported C/C++ projects using the bundled ARM SDK. Linux desktop support is planned next.
- **Direct calculator transfers from the website:** send and receive TNS files over USB, browse folders, create a destination folder, and capture the calculator screen.
- **Interactive TI-BASIC Prgm preview:** test text programs, answer `Request` prompts, inspect variables, step through code and switch to an expanded view.
- **Updated ROM Converter interface:** console-specific icons, a central game display, keyboard and on-screen controls, pause/restart, frame and FPS information, and an expanded preview.

### Web and desktop availability

| Feature | Web version | Windows portable |
| --- | --- | --- |
| XML/TNS editing, Lua/LÖVE and numerical Prgm previews | Available | Available |
| ROM detection, supported cartridge previews and project ZIP export | Available | Available |
| Prepare a ROM calculator package | Uses a precompiled ARM emulator and companion cartridge | Compiles the generated native project |
| Create/open/edit and compile general Ndless C/C++ source projects | Requires the desktop version | Available; Ndless SDK included |
| USB calculator manager | Available in a compatible WebUSB browser | Available through the desktop USB integration |

**Linux desktop: coming soon.** The website can already be used from a compatible Linux browser; a Linux desktop package with the integrated Ndless compiler has not been released yet.

## ROM Converter

Open **File → ROM Converter** (Archivo → ROM Converter). Choose a ROM or a ZIP containing a single game, or drag it into the module. Detection reads the cartridge header rather than relying only on its filename. The interface shows the detected console with its icon, the selected file and its size.

![ROM Converter: console detection, interactive preview and project/package downloads](docs/images/Converter_ROM.gif)

Supported cartridge families:

| Console | File formats | Status |
| --- | --- | --- |
| NES | `.nes` | Supported cartridges and mappers |
| Game Boy / Game Boy Color | `.gb`, `.gbc` | Supported cartridge controllers; header-based GB/GBC detection |
| Super Nintendo | `.sfc`, `.smc` | Supported LoROM/HiROM cartridges |
| Game Boy Advance | `.gba` | Emulator integration available |
| Nintendo 64 | `.z64`, `.v64`, `.n64` | Experimental; game compatibility and performance vary |
| Nintendo DS | `.nds` | Experimental; game compatibility and performance vary |

Use **Preview** to run the cartridge with the local emulator. The preview includes console-specific buttons, keyboard input, pause/resume, stop, restart and an expanded view. GB/GBC cartridge RAM is saved per game in the browser or desktop profile; preview saves are separate from calculator saves.

- **Download project ZIP** exports the editable emulator sources and the selected cartridge resources. Open it with **Open Ndless Project** in TNS Tool Portable to edit and compile its C/C++ code.
- **Web version:** **Download program + cartridge ZIP** prepares the calculator files locally using a precompiled ARM emulator. It does not require the Windows app or a compilation server. Keep the program and its companion cartridge `.tns` in the same calculator folder, then open the program.
- **Windows version:** **Compile and download TNS** builds the generated source project with the included SDK. **Open project** opens those sources directly in the workspace. Some profiles produce a standalone TNS; packages that include a companion cartridge require both files in the same folder.

ROM processing happens locally; the app does not upload your cartridge. No commercial games or ROMs are included. The Windows version also has a dedicated native-port path for the supported original European Super Mario 64 ROM; the web version uses the experimental N64 emulator.

A successful preview or package build does not guarantee complete gameplay or compatibility with every calculator. Native output requires active Ndless and suitable hardware. See [supported profiles, size limits and controls](desktop/README.md#rom-converter) and [browser emulator sources and licenses](assets/rom/README.md).

## Ndless Projects — Windows

**Ndless Projects is functional in TNS Tool Portable for Windows.** The app includes the native ARM compiler, official Ndless SDK libraries and TNS packaging tools; no separate toolchain installation is required.

1. Choose **File → New Ndless Project** to create a C or C++ project, or **Open Ndless Project** to import a source project ZIP.
2. Edit the source files and use the project preview and controls to test the supported screen, drawing and input behavior.
3. Choose **Build TNS** to compile the project and download its calculator executable. Projects with cartridge resources can produce a ZIP containing the program and its companion files.
4. Transfer the output to a compatible calculator with Ndless installed and active.

To preview an existing native TNS, choose **Preview** in **Edit Ndless**. Restart uses the current edited working copy. A compiled `.tns` is an executable; editing its original C/C++ sources requires the source project ZIP.

**General C/C++ project compilation is currently Windows-only.** New/Open Ndless Project in the web version displays the desktop download dialog. ROM Converter can still prepare its precompiled-emulator packages in the browser. **Linux desktop support is coming soon; no release date is set.**

The preview is not a full TI-Nspire OS emulator. Unsupported native APIs, hardware-specific behavior and custom build steps may require additional project support. See [native previews and supported SDK build profiles](desktop/README.md#preview-an-existing-ndless-tns).

## Transfer files to the calculator — web and Windows

**You can transfer TNS files directly from the website over USB.** Open **Transfer to calculator / Transferir a calculadora** from the File/Save tools and connect your TI-Nspire in the integrated calculator manager.

- Send one or more `.tns` files, or send the current generated document directly.
- Browse calculator folders, choose the destination and create a new folder from the destination picker.
- Receive selected files from the calculator and download them to your computer.
- Capture the calculator screen and save it as PNG.
- Reopen the manager while preserving the current connection, folder and last valid screenshot. An interrupted session can be reconnected from the panel.

For the web version, use desktop **Chrome, Edge or Brave**, the HTTPS website, a USB data cable and a compatible USB driver. Allow access when the browser asks you to choose the calculator. Close other applications that are using the same USB connection. Browser, operating-system and calculator support can vary; see the [USB requirements, screenshot behavior and troubleshooting guide](docs/calculator-transfer.md).

## TI-BASIC Prgm preview

Open a normal TNS in Syntax Doctor, select a `Prgm` block, and click **Prgm Preview** beside Run syntax. The preview reads the current editor code, including unsaved changes. Its calculator-style 320×240 screen includes text history and interactive `Request` / `RequestStr` dialogs, with Enter to accept input and Esc to cancel.

Run/pause, step, stop and restart controls let you inspect variables and follow the current source line or an error. The expanded view gives the output more room and reflows text without restarting the program or discarding an active input. It simulates numerical TI-BASIC text programs; symbolic CAS, units, graphics and external functions are not emulated. Available in both the web and Windows versions. [Coverage and CLI/API usage](docs/prgm-preview.md).

## Feedback

Bug reports, questions, suggestions, and test files are welcome.
https://github.com/acewalt/tns-tool-wasm/discussions/2

## Video Demo

[Watch the demo on YouTube](https://youtu.be/ahgmAFpDRj8)

If my tool was useful to you and you'd like to support its development, you can buy me a coffee. Thank you very much for your support!
https://paypal.me/waltDx

Si mi herramienta te resultó útil y quieres apoyar su desarrollo, puedes invitarme un café. ¡Muchas gracias por tu apoyo!
https://paypal.me/waltDx


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
- Preview numerical TI-BASIC `Prgm` blocks with interactive input, stepping, variables and an expanded view.
- Detect and preview supported game cartridges with ROM Converter; export editable projects and calculator packages locally.
- Create, edit, preview and compile supported Ndless C/C++ projects in TNS Tool Portable for Windows; Linux desktop support is planned.
- Transfer TNS files directly between the website and a TI-Nspire over USB, manage folders and save screen captures.
- Insert visual Lua templates such as forms, menus, advanced menus, and popups.
- Edit generated Lua pages visually after inserting templates.
- Convert common TI-Basic/PRG menu-and-request programs into visual Lua pages.
- Run Lua ScriptApps programmatically from a Node CLI/API for agent-driven tests.
- Work in Spanish, English, and French.
  
 ![New](docs/images/new.gif)

## Syntax Doctor

Syntax Doctor is the general workspace for inspecting, editing and checking TI-Nspire code. Its tools include editable TNS/XML program blocks, Lua ScriptApps, numerical TI-BASIC Prgm previews and, in the Windows app, Ndless source projects.

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
npm run tns-tool -- lua preview archivo.lua --actions tests/preview.actions.json --json
npm run tns-tool -- tns create --output out/document.tns --json
npm run tns-tool -- tns add-lua out/document.tns archivo.lua --output out/with-lua.tns --json
```

The public JavaScript API is available from `src/api/index.js`:

```js
import { loadLuaScript, runLuaSuite } from "./src/api/index.js";

const lua = await loadLuaScript("archivo.lua");
const result = lua.call("miFuncion", [1, 2]);
console.log(result);
lua.close();
```

See [AGENTS.md](AGENTS.md) for the full machine-readable test format, preview actions, TNS commands, capabilities, exit codes, JSON output, schemas, and TI-Nspire mock limitations.

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
- Lua preview runs through a LuaJS/Nspire-like runtime. The CLI/API can capture paint output as structured draw calls and visible text for agents.
- TNS CLI commands reuse the repository `tnstools.py` decode/build path through a Node/Python bridge.
- The browser cannot write directly to local Windows paths, so files are handled through upload and download.
- A fully offline version would need bundled Pyodide, JSZip, and runtime assets.



## Current Page, Resource, And Preview Updates

Recent development has expanded TNS Tool WASM beyond program editing into a broader TI-Nspire document-building workflow.

### `+Page` system

 ![New](docs/images/+page.png)

A new `+Page` workflow can add pages directly to the current TI-Nspire document.

Current page types include:

- Program Editor
- Python
- Lua ScriptApp
- Lists & Spreadsheet
- Notes
- Graphs
- Images

`+Page` is available from the `File` menu and from `Document Inspector`.

If no document is open, `+Page` can create an empty base document automatically instead of forcing the user to create a default Program Editor document first.

`New document` and `Add Program Editor` remain separate operations:

- `New document` creates a new base Program Editor project.
- `Add Program Editor` adds another Program Editor card to the current document.

### Document Inspector improvements

`Document Inspector` can now identify and expose more TI-Nspire document elements, including:

- Cards
- Widgets
- Lua ScriptApps
- Program Editor
- Python
- Resources
- Images
- Lists & Spreadsheet
- Notes
- Graphs
- Symbols

Context-specific actions are shown when supported, such as:

- View XML
- View/Edit Lua
- View Image
- Open Sheet
- Open Notes
- Open Graph

The inspector and `+Page` menu were also adjusted for smaller/mobile layouts.

### Image resources and Add Image

![Syntax](docs/images/image.gif)

`Add Image` can currently import:

- PNG
- JPG / JPEG
- BMP
- GIF
- PDF

 
  ![img](docs/images/img.gif)

Imported images are converted into the TI-Nspire image-resource format used by the tested ScriptApp documents.

The current resource path is based on:

```text
source image
    ↓
browser canvas / RGBA
    ↓
RGB565 little-endian
    ↓
auxiliary 0xFF plane
    ↓
pageN.BMP
    ↓
TI ResourceHandle
    ↓
_R.IMG.img
    ↓
image.new(_R.IMG.img)
```

Multiple image cards use separate resources such as:

```text
page0.BMP
page1.BMP
page2.BMP
...
```

Image ScriptApps use API level `2.3` so `_R.IMG` resources are available.

![img](docs/images/contview.jpeg)
![img](docs/images/editimg.jpeg)

### Image Viewer and Calculator View

The image viewer can decode and display the tested TI-Nspire resource format directly in the browser.

A `Calculator View` is also available to estimate how the resource will appear on the calculator.

For image ScriptApps, the preview uses the calculator-oriented viewport instead of simply fitting the full source image into the browser window. This makes it possible to inspect the approximate crop and visible area before rebuilding the TNS.

The tested calculator-oriented dimensions are approximately:

```text
320 × 240 total display
320 × 212 ScriptApp content area
```

The initial image view is handled at approximately 1:1 scale, matching the behavior observed in the reference image viewer documents.

### Preview LÖVE

![love](docs/images/test1.gif)

`Preview LÖVE` has been expanded into a compatibility environment for both LÖVE-style Lua and TI-Nspire ScriptApps.

The goal is not to reproduce the full desktop LÖVE runtime. Instead, it provides enough compatibility to preview and test a growing subset of scripts directly in the browser.

![love](docs/images/test2.gif)

Implemented or partially implemented areas include:

- `love.load`
- `love.update`
- `love.draw`
- `love.resize`
- keyboard and mouse callbacks
- drawing primitives
- text
- colors
- transforms
- Canvas
- Image / ImageData
- Quads
- Text objects
- SpriteBatch
- Mesh
- timer
- keyboard
- mouse
- virtual filesystem support
- math helpers
- TI-Nspire `platform`, `on.*`, `gc`, and image-resource compatibility

Some complex APIs still use safe shims or partial implementations rather than full native behavior.

Examples include:

- shaders
- advanced audio
- video
- physics
- threads
- joystick
- sensors

### Experimental LÖVE → TI-Nspire conversion

  ![Convert](docs/images/lov.gif)

The project also includes an experimental conversion layer for turning some LÖVE-style Lua programs into TI-Nspire ScriptApps.

The generated compatibility layer maps supported LÖVE behavior to TI-Nspire-oriented APIs such as:

```text
platform
on.paint
on.timer
on.charIn
on.arrowKey
gc
```

The intended workflow is:

```text
LÖVE-style Lua
    ↓
compatibility conversion
    ↓
TI-Nspire Lua ScriptApp
    ↓
TNS
```

This is not a universal converter.

Programs that depend heavily on desktop-only features, external native libraries, advanced shaders, audio engines, physics, threads, or complex filesystem behavior may require manual changes or may not be compatible.

### Lists & Spreadsheet

![Syntax](docs/images/Spreadsheet.gif)

Experimental `Lists & Spreadsheet` support has been added using the native `tabulator` widget structure.

The browser preview reproduces a calculator-style spreadsheet with:

- column labels
- row numbers
- selected cells
- formula/value display
- editable cells
- Save / Cancel workflow

Cell values are read from and written back to native TI-Nspire XML structures such as:

```xml
<tb:cell>
    <tb:rowId>1</tb:rowId>
    <tb:formula>111</tb:formula>
    <tb:data>111</tb:data>
</tb:cell>
```

This allows basic round-trip editing between the browser XML project and the calculator.

The spreadsheet preview also includes experimental `.xlsx` import for the first worksheet.

Current XLSX support is focused on basic cell data and simple formulas. Full Excel compatibility is not expected.

### Notes

`TI.Notepad` pages can now be detected, created, opened, edited, and saved from `Document Inspector`.

The Notes editor is intended to provide a lightweight calculator-style editing experience while preserving the native Notepad widget inside the document.

### Graphs
![Syntax](docs/images/graf.gif)

Experimental `TI.GeoGrapher` support has been added.

Graph pages can be created from `+Page`, detected in `Document Inspector`, and opened directly in `Preview LÖVE`.

The graph preview includes an editable function field such as:

```text
f1(x)=sin(x)
```

or:

```text
f1(x)=3*cos(2*x+π/2)+1
```

The preview draws the function on a calculator-style coordinate plane, and the formula can be edited or pasted directly before saving it back into the native Graphs XML structure.

Multiple graph pages can use function names such as:

```text
f1
f2
f3
...
```

Graph parsing and expression compatibility are still experimental and will continue to expand.

### Ndless projects and ROM packages

See [Ndless Projects — Windows](#ndless-projects--windows) for the working C/C++ source workflow, [ROM Converter](#rom-converter) for browser and desktop cartridge packages, and [calculator transfers](#transfer-files-to-the-calculator--web-and-windows) for direct USB delivery. Linux desktop support is planned next.

## Current limitations and planned work

Recent image and PDF workflow additions are now implemented:
![pdf](docs/images/pdf.gif)
- PDF import into TNS documents. Each PDF page is rendered as an image and passed through the same `Add Image` pipeline.
- batch / multi-select image import.
- automatic creation of one image card and one `pageN.BMP` resource per selected image.
- PDFs with more than 30 pages show a size/memory warning; if confirmed, all pages can be imported instead of being truncated to 30.
- when a document contains more than one image, the `Images: N` summary in `Document Inspector` becomes clickable and opens a continuous calculator-style gallery of all image resources.
- each image in the gallery can still be opened individually with the existing image viewer.

Remaining planned or incomplete areas include:

- a Linux desktop package with the integrated Ndless compilation environment (coming soon)
- browser-based compilation of general Ndless C/C++ source projects
- broader XLSX compatibility
- more TI-Nspire page/widget types
- more complete Graphs support
- a more complete mathematical expression parser
- broader LÖVE runtime coverage
- improved LÖVE → TI-Nspire conversion
- more accurate calculator previews where possible

The batch-image workflow now supports selecting multiple files such as:

```text
image1.png
image2.jpg
image3.png
image4.bmp
```

and automatically generates separate image cards/resources such as:

```text
Card 1 → page0.BMP
Card 2 → page1.BMP
Card 3 → page2.BMP
Card 4 → page3.BMP
```

without requiring a separate `Add Image` operation for each file.

PDF import follows the same image-card model: each imported PDF page becomes its own image resource/card and can be reviewed together from the `Images: N` gallery.


## Credits

Developed and implemented by Andres Mauricio Chaparro Pena.

Reverse-engineering packaging logic and base structure are attributed to MaksimirKurtov and the open TnsTools project:

- MaksimirKurtov: https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=393033
- TnsTools: https://tiplanet.org/forum/viewtopic.php?t=27393&p=280845#p280845

The original idea and technical mentoring for the WebAssembly/Web port are attributed to Adriweb:

- Adriweb: https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=1381

The image and PDF import workflow also benefited from the work of **critor** and **mViewer GX**, available through TI-Planet. mViewer GX served as an important reference that helped inform the implementation of adding images and PDF pages to TNS Tool WASM documents:

- critor: https://github.com/critor
- mViewer GX / TI-Planet: https://tiplanet.org/

## Disclaimer

TNS Tool WASM is an independent software-development project and is not affiliated with, sponsored by, authorized by, or officially associated with Texas Instruments.
