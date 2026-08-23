# Agent Automation Guide

TNS Tool WASM exposes a terminal-first automation layer for agents. The browser UI remains available, but agents should prefer the CLI and JavaScript API instead of simulating DOM clicks.

## Quick Start

```bash
npm install
npm test
npm run tns-tool -- capabilities --json
npm run tns-tool -- lua mocks --json
npm run tns-tool -- lua check archivo.lua --json
npm run tns-tool -- lua call archivo.lua --function miFuncion --args "[1,2]" --json
npm run tns-tool -- lua suite archivo.lua tests/edo.sample.json --json
npm run tns-tool -- lua preview archivo.lua --actions tests/preview.actions.json --json
npm run tns-tool -- tns create --output out/document.tns --json
```

Use `--json` whenever another program will parse the output. In JSON mode, stdout is JSON only.

## Requirements

- Node.js 18 or newer.
- Python 3.10 or newer for `.tns` decode/build operations.
- No browser, DOM, or Pyodide session is required for the CLI/API.
- Paths may be absolute or relative.
- Use `-` for stdin with commands that read source text, such as `lua check -`.

## Main CLI

```bash
npm run tns-tool -- <command>
```

Available commands:

```bash
npm run tns-tool -- capabilities [--json]
npm run tns-tool -- lua check <file|-> [--json]
npm run tns-tool -- lua call <file> --function <name> [--args "[...]" | --arg value] [--json]
npm run tns-tool -- lua suite <file|-> <tests.json> [--json]
npm run tns-tool -- lua preview <file|-> [--actions actions.json] [--get-global name] [--json]
npm run tns-tool -- lua mocks [--json]
npm run tns-tool -- tns inspect <file.tns|xmlDir> [--json]
npm run tns-tool -- tns extract <file.tns> --output <xmlDir> [--json]
npm run tns-tool -- tns build <xmlDir> --output <file.tns> [--json]
npm run tns-tool -- tns create --output <file.tns> [--json]
npm run tns-tool -- tns add-lua <file.tns|xmlDir> <script.lua> --output <file.tns> [--json]
```

Legacy wrappers remain available:

```bash
npm run lua-test -- archivo.lua
npm run lua-suite -- archivo.lua tests/edo.sample.json --json
npm run lua-preview -- archivo.lua --actions tests/preview.actions.json --json
npm run tns -- inspect archivo.tns --json
```

The canonical agent entrypoint is `npm run tns-tool -- ...`.

## JavaScript API

```js
import {
  addLuaScriptApp,
  buildTns,
  createLuaPreview,
  createTnsDocument,
  extractTns,
  getCapabilities,
  inspectTns,
  loadLuaScript,
  runLuaPreview,
  runLuaSuite
} from "./src/api/index.js";

const lua = await loadLuaScript("program.lua");
const result = lua.call("solveAnyEquation", ["y''+4*y=0"]);
lua.close();

console.log(result);
```

The lower-level Lua API is available from `src/lua/index.js`:

```js
import {
  createLuaRuntime,
  loadLuaScript,
  callLuaFunction,
  createLuaPreview,
  runLuaPreviewActions,
  runLuaTest,
  runLuaTestSuite
} from "./src/lua/index.js";
```

## Calling Lua Functions

```bash
npm run tns-tool -- lua call "C:/proyectos/program.lua" \
  --function solveAnyEquation \
  --args "[\"y''+4*y=0\"]" \
  --json
```

Supported return conversions:

- Lua table to JavaScript object or array.
- Lua string to JavaScript string.
- Lua number to JavaScript number.
- Lua boolean to JavaScript boolean.
- Lua nil to JavaScript null.

Unsupported conversions, such as returning a Lua function or circular table, fail explicitly.

## Function Suite Format

Schema: [schemas/lua-suite.schema.json](schemas/lua-suite.schema.json)

```json
{
  "function": "solveAnyEquation",
  "tests": [
    {
      "name": "Segundo orden complejo",
      "args": ["y''+4*y=0"],
      "expected": {
        "solved": true
      }
    }
  ]
}
```

There is no hardcoded default function. A suite must define `function`/`functionName` globally or per test.

Expected fields are matched against the returned Lua table converted to JSON. Dot paths are supported:

```json
{
  "expected": {
    "data.items": [1, 2, 3]
  }
}
```

## Lua Preview Actions

`lua preview` loads a ScriptApp, calls lifecycle handlers, runs actions, paints through instrumented TI-Nspire mocks, and returns draw calls plus visible text.

Example `actions.json`:

```json
{
  "globals": ["counter", "textValue"],
  "actions": [
    { "type": "event", "event": "charIn", "args": ["A"] },
    { "type": "event", "event": "enterKey" },
    { "type": "event", "event": "arrowDown" },
    { "type": "paint" }
  ]
}
```

Supported action types:

- `paint`
- `event` with `enterKey`, `escapeKey`, `backspaceKey`, `charIn`, `arrowKey`, `arrowUp`, `arrowDown`, `arrowLeft`, `arrowRight`, `mouseDown`, `mouseUp`, `mouseMove`, `timer`
- `call`
- `setGlobal`
- `getGlobal`

Preview output includes:

```json
{
  "success": true,
  "final": {
    "runtimeOk": true,
    "drawCalls": [],
    "texts": [],
    "globals": {}
  }
}
```

## Preview Suite Format

Use `"type": "preview"` or include `actions` in each test:

```json
{
  "type": "preview",
  "globals": ["counter"],
  "tests": [
    {
      "name": "paint initial text",
      "actions": [{ "type": "paint" }],
      "expected": {
        "runtimeOk": true,
        "noErrors": true,
        "textContains": ["Counter: 0"],
        "drawCallExists": "drawString",
        "globalEquals": {
          "counter": 0
        }
      }
    }
  ]
}
```

Supported preview assertions:

- `runtimeOk`
- `noErrors`
- `textContains`
- `textNotContains`
- `drawCallExists`
- `globalEquals`

## TNS Document Automation

The TNS CLI uses a Node/Python bridge over the repository `tnstools.py` decode/build path.

```bash
npm run tns-tool -- tns create --output tmp/base.tns --json
npm run tns-tool -- tns add-lua tmp/base.tns script.lua --output tmp/with-lua.tns --json
npm run tns-tool -- tns inspect tmp/with-lua.tns --json
npm run tns-tool -- tns extract tmp/with-lua.tns --output tmp/xml --json
npm run tns-tool -- tns build tmp/xml --output tmp/rebuilt.tns --json
```

`tns inspect` returns detected Lua ScriptApps with file path, element path, script id/version, source length, and source text.

## JSON Output Shapes

Lua check/call results include:

```json
{
  "success": true,
  "syntaxOk": true,
  "runtimeOk": true,
  "stdout": [],
  "stderr": [],
  "errors": [],
  "missingApis": [],
  "unsupportedApis": [],
  "results": []
}
```

Suite results include:

```json
{
  "success": true,
  "passed": 2,
  "failed": 0,
  "total": 2,
  "results": []
}
```

Errors are structured:

```json
{
  "success": false,
  "error": {
    "code": "LUA_RUNTIME_ERROR",
    "message": "...",
    "file": "program.lua",
    "line": 173,
    "details": {}
  }
}
```

## Exit Codes

- `0`: success.
- `1`: operation or test failed.
- `2`: invalid arguments.
- `3`: invalid, missing, or unsupported file.
- `4`: runtime error.

## Capabilities

```bash
npm run tns-tool -- capabilities --json
```

Schema: [schemas/capabilities.schema.json](schemas/capabilities.schema.json)

This command announces only capabilities exposed outside the DOM in the current build.

## TI-Nspire Mocks

```bash
npm run tns-tool -- lua mocks --json
```

The Lua runner separates:

- LuaJS runtime.
- TI-Nspire API mocks.
- User ScriptApp code.

Currently mocked APIs are partial:

- `platform.window`
- `platform.gc`
- `platform.withGC`
- `timer`
- `var`
- `D2Editor`
- `image.new`
- common `string.*` helpers
- partial `math.eval`

Unsupported APIs are reported in `errors`, `missingApis`, or `unsupportedApis`; they are not silently converted to `nil`, `0`, or `false`.

## Current Programmatic Coverage

| Operation | Core API | CLI | JSON | Test |
| --- | --- | --- | --- | --- |
| Discover capabilities | `getCapabilities()` | `tns-tool capabilities` | Yes | Yes |
| List TI-Nspire mocks | `getTiNspireMockCapabilities()` | `tns-tool lua mocks` | Yes | Yes |
| Validate/load Lua | `validateLua()` / `runLuaTest()` | `tns-tool lua check` | Yes | Yes |
| Call global Lua function | `loadLuaScript().call()` / `callLuaFunctionFromFile()` | `tns-tool lua call` | Yes | Yes |
| Run Lua function suite | `runLuaSuite()` / `runLuaTestSuite()` | `tns-tool lua suite` | Yes | Yes |
| Run Lua preview actions | `createLuaPreview()` / `runLuaPreview()` | `tns-tool lua preview` | Yes | Yes |
| Run Lua preview suite | `runLuaSuite()` | `tns-tool lua suite` | Yes | Yes |
| Create TNS document | `createTnsDocument()` | `tns-tool tns create` | Yes | Yes |
| Open/inspect TNS/XML | `inspectTns()` | `tns-tool tns inspect` | Yes | Yes |
| Extract/build TNS | `extractTns()` / `buildTns()` | `tns-tool tns extract/build` | Yes | Yes |
| Add Lua ScriptApp | `addLuaScriptApp()` | `tns-tool tns add-lua` | Yes | Yes |
| Syntax Doctor XML/PY UI | Browser UI only | Not advertised | No | No |

## Known Limitations

- This is not a full TI-Nspire emulator.
- Drawing is captured as structured calls and text, not as pixel-perfect screenshots.
- Some ScriptApps require APIs that are not mocked yet; unsupported APIs are reported explicitly.
- `lua call -` is intentionally not supported because direct function calls need a reusable loaded runtime. Use a temporary file or `lua check -`.
- `tns add-lua` adds a ScriptApp card; replace/remove are not advertised until they are extracted and tested.
