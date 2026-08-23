# Agent Automation Guide

TNS Tool WASM now has a terminal-first automation layer for agents. The existing browser UI remains available, but agents should prefer the CLI and JavaScript API below instead of simulating clicks or DOM events.

## Quick Start For Agents

```bash
npm install
npm test
npm run tns-tool -- capabilities --json
npm run tns-tool -- lua mocks --json
npm run tns-tool -- lua check archivo.lua --json
npm run tns-tool -- lua call archivo.lua --function miFuncion --args "[1,2]" --json
npm run tns-tool -- lua suite archivo.lua tests/edo.sample.json --json
```

Use `--json` whenever another program or agent will parse the output. In JSON mode, stdout is JSON only.

## Requirements

- Node.js 18 or newer.
- No browser, DOM, or Pyodide session is required for the Lua CLI/API.
- Paths may be absolute or relative.
- Use `-` for stdin with commands that read source text, for example `lua check -`.

## Main CLI

```bash
npm run tns-tool -- <command>
```

Available commands in this build:

```bash
npm run tns-tool -- capabilities [--json]
npm run tns-tool -- lua check <file|-> [--json]
npm run tns-tool -- lua call <file> --function <name> [--args "[...]" | --arg value] [--json]
npm run tns-tool -- lua suite <file|-> <tests.json> [--json]
npm run tns-tool -- lua mocks [--json]
```

Legacy wrappers are still available:

```bash
npm run lua-test -- archivo.lua
npm run lua-suite -- archivo.lua tests/edo.sample.json --json
```

The canonical agent entrypoint is `npm run tns-tool -- ...`.

## JavaScript API

```js
import {
  getCapabilities,
  getTiNspireMockCapabilities,
  validateLua,
  runLua,
  loadLuaScript,
  callLuaFunction,
  callLuaFunctionFromFile,
  runLuaSuite,
  runLuaTestSuite
} from "./src/api/index.js";

const lua = await loadLuaScript("program.lua");
const result = lua.call("miFuncion", [1, 2, "hola"]);
lua.close();

console.log(result);
```

The lower-level Lua API remains available:

```js
import {
  createLuaRuntime,
  loadLuaScript,
  callLuaFunction,
  runLuaTest,
  runLuaTestSuite
} from "./src/lua/index.js";
```

## Calling Lua Functions

Example:

```bash
npm run tns-tool -- lua call "C:/proyectos/program.lua" \
  --function miFuncion \
  --args "[1,2,\"hola\"]" \
  --json
```

The runner converts supported values automatically:

- Lua table to JavaScript object or array.
- Lua string to JavaScript string.
- Lua number to JavaScript number.
- Lua boolean to JavaScript boolean.
- Lua nil to JavaScript null.

Unsupported conversions, such as returning a Lua function or a circular table, fail explicitly instead of silently returning `nil`.

## Suite JSON Format

Schema: [schemas/lua-suite.schema.json](schemas/lua-suite.schema.json)

Preferred object format:

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

Per-test function override:

```json
[
  {
    "name": "Funcion generica",
    "function": "addPair",
    "args": [2, 3],
    "expected": {
      "sum": 5
    }
  }
]
```

Important: there is no hardcoded default such as `solveAnyEquation`. A suite must define `function`/`functionName` globally or per test.

Expected fields are matched against the returned Lua table converted to JSON. Dot paths are supported:

```json
{
  "expected": {
    "data.items": [1, 2, 3]
  }
}
```

## JSON Output Shapes

Lua result schema: [schemas/lua-result.schema.json](schemas/lua-result.schema.json)

Single check/call results include:

```json
{
  "success": true,
  "syntaxOk": true,
  "runtimeOk": true,
  "stdout": [],
  "stderr": [],
  "errors": [],
  "missingApis": [],
  "results": []
}
```

Suite results include:

```json
{
  "success": true,
  "syntaxOk": true,
  "runtimeOk": true,
  "passed": 2,
  "failed": 0,
  "total": 2,
  "stdout": [],
  "stderr": [],
  "errors": [],
  "missingApis": [],
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

This command announces only capabilities exposed outside the DOM in the current build. In this version, Lua automation is available. TNS/XML/Python browser features still need extraction from `app.js`/Pyodide before they can be safely used by agents through CLI/API.

## TI-Nspire Mocks

```bash
npm run tns-tool -- lua mocks --json
```

The Lua runner separates:

- LuaJS runtime.
- TI-Nspire API mocks.
- User ScriptApp code.

Currently mocked APIs are partial and intended for computational ScriptApps:

- `platform.window`
- `platform.gc`
- `platform.withGC`
- `timer`
- `var`
- `D2Editor`
- `image.new`
- common `string.*` helpers
- partial `math.eval`

Unsupported APIs are reported in `errors` or `missingApis`; they are not silently converted to `nil`, `0`, or `false`.

## Current Programmatic Coverage

| Operation | Core API | CLI | JSON | Test |
| --- | --- | --- | --- | --- |
| Discover capabilities | `getCapabilities()` | `tns-tool capabilities` | Yes | Yes |
| List TI-Nspire mocks | `getTiNspireMockCapabilities()` | `tns-tool lua mocks` | Yes | Yes |
| Validate/load Lua | `validateLua()` / `runLuaTest()` | `tns-tool lua check` | Yes | Yes |
| Call global Lua function | `loadLuaScript().call()` / `callLuaFunctionFromFile()` | `tns-tool lua call` | Yes | Yes |
| Run Lua suite | `runLuaSuite()` / `runLuaTestSuite()` | `tns-tool lua suite` | Yes | Yes |
| Open/inspect TNS | Not extracted yet | Not advertised | No | No |
| Extract/build TNS | Not extracted yet | Not advertised | No | No |
| Add Lua ScriptApp to TNS/XML | UI/Pyodide only | Not advertised | No | No |
| Syntax Doctor XML/PY | UI/Pyodide only | Not advertised | No | No |

## Known Limitations

- This is not a full TI-Nspire emulator.
- Drawing is mocked as no-op behavior, so screenshots are not a test oracle for the CLI.
- ScriptApps that only expose UI event handlers are harder to test. Add small global functions that accept arguments and return tables for automation.
- The current CLI does not yet inspect, extract, build, or mutate `.tns` documents. Those operations exist in the web UI path and must be extracted into `src/core` before agents can use them safely.
- `lua call -` is intentionally not supported yet because direct function calls need a reusable loaded runtime. Save stdin to a temporary file first, or use `lua check -` for load validation.
