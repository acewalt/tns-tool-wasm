# TNS Tool WASM

TNS Tool WASM is an experimental web port of TNS Tool for TI-Nspire workflows.

It runs in the browser with Pyodide/WebAssembly and provides a visual interface for converting, inspecting, editing, and validating TI-Nspire related files without using the original command-line workflow.

## Live Demo

https://acewalt.github.io/tns-tool-wasm/

## Video Demo

[(https://youtu.be/ahgmAFpDRj8)](https://youtu.be/ahgmAFpDRj8)

## Main Features

- Decode normal .tns files into XML folders.
- Rebuild normal .tns files from XML folders.
- Create Python Program .tns files from Python code and a template.
- Extract q.py from Python Program .tns files.
- Work directly in the browser using file upload/download.
- Interface available in Spanish, English, and French.

## Syntax Doctor XML

Syntax Doctor XML is a visual editor for TI-Nspire XML program blocks.

It includes:

- Open a single XML file or a .tns.xml folder.
- Detect editable program blocks.
- Preview XML program code in a human-readable format.
- Run syntax diagnostics.
- Apply safe Auto Fix corrections.
- Resolve ambiguous variables manually with suggestions.
- Show Auto Fix changes before saving.
- Format code by removing empty lines and trimming spacing.
- Mark error and warning lines with visual indicators.
- Highlight TI-Nspire code using calculator-like colors.
- Embed the edited code back into XML.
- Download the resulting XML as a ZIP.

## Syntax Doctor PY

Syntax Doctor PY is a browser-based Python editor for Python Program workflows.

It includes:

- Run Python syntax checks through the shared Python analyzer.
- Detect unsupported f-strings and non-ASCII characters.
- Apply safe Auto Fix corrections.
- Show Auto Fix changes.
- Save edited code back into the inline Python block.
- Download the edited code as a .py file.
- Highlight Python code with a TI-Nspire-inspired color scheme.

## Local Testing

From the repository root:

python -m http.server 8000

Then open:

http://localhost:8000/

Do not open index.html with file://, because browsers block fetch() calls needed to load the Python modules.

## Technical Notes

- Pyodide is loaded from the official CDN.
- JSZip is loaded from CDN for ZIP generation.
- Python modules are loaded into Pyodide at runtime.
- The browser cannot write directly to local Windows paths, so files are handled through upload and download.
- For a fully offline version, Pyodide and JSZip assets would need to be bundled locally.

## Any bugs, questions, or suggestions are completely welcome.

## Credits

Developed and implemented by Andres Mauricio Chaparro Pena.

Reverse-engineering packaging logic and base structure are attributed to MaksimirKurtov and the open TnsTools project:

- MaksimirKurtov: https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=393033
- TnsTools: https://tiplanet.org/forum/viewtopic.php?t=27393&p=280845#p280845

The original idea and technical mentoring for the WebAssembly/Web port are attributed to Adriweb:

- Adriweb: https://tiplanet.org/forum/memberlist.php?mode=viewprofile&u=1381

## Disclaimer

TNS Tool WASM is an independent software-development project and is not affiliated with, sponsored by, authorized by, or officially associated with Texas Instruments.