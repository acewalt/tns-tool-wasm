# Agent Automation Guide

This repository can be used from a terminal without opening the web UI. The CLI loads a TI-Nspire Lua ScriptApp with LuaJS, installs safe TI-Nspire mocks, and lets agents call Lua functions or run large JSON test suites.

## Install

```bash
npm install
npm test
```

## Run One Lua File

```bash
npm run lua-test -- archivo.lua
```

Call a global Lua function directly:

```bash
npm run lua-test -- archivo.lua --call solveAnyEquation --arg "y''+4*y=0"
```

JSON-only output:

```bash
npm run lua-test -- archivo.lua --call solveAnyEquation --arg "y''+4*y=0" --json
```

## Run A Suite

```bash
npm run lua-suite -- archivo.lua tests/edo.sample.json
```

JSON-only output for agents:

```bash
npm run lua-suite -- archivo.lua tests/edo.sample.json --json
```

Exit code is `0` when every test passes. Exit code is nonzero when loading fails, a call fails, or any expectation fails.

## Test JSON Format

The suite can be an array:

```json
[
  {
    "name": "Segundo orden complejo",
    "input": "y''+4*y=0",
    "expected": {
      "solved": true
    }
  }
]
```

Or an object with a default function:

```json
{
  "function": "solveAnyEquation",
  "tests": [
    {
      "name": "Verificar coseno",
      "args": ["y''+4*y=0;y=cos(2*x)"],
      "expected": {
        "verified": true
      }
    }
  ]
}
```

If `function` is omitted, the runner calls `solveAnyEquation` by default. `expected` fields are matched against the returned Lua table converted to JSON. Dot paths are supported, for example `"data.items": [1, 2, 3]`.

## JavaScript API

```js
import {
  createLuaRuntime,
  loadLuaScript,
  callLuaFunction,
  runLuaTestSuite
} from "./src/lua/index.js";

const lua = await loadLuaScript("math_fixed_corregido.LUA");

const result = lua.call("solveAnyEquation", [
  "y''+4*y=0"
]);

console.log(result);

const verified = lua.call("solveAnyEquation", [
  "y''+4*y=0;y=cos(2*x)"
]);

console.log(verified);
lua.close();
```

## Output Shape

`runLuaTest(luaSource, options)` returns:

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

`runLuaTestSuite(luaSource, tests)` returns:

```json
{
  "success": true,
  "syntaxOk": true,
  "runtimeOk": true,
  "passed": 249,
  "failed": 1,
  "total": 250,
  "stdout": [],
  "stderr": [],
  "errors": [],
  "missingApis": [],
  "results": []
}
```

## TI-Nspire Emulation Limits

The runner is not a full calculator emulator. It provides safe mocks for common ScriptApp APIs such as `platform.window`, `platform.gc`, `timer`, `var`, `D2Editor`, `image.new`, `string.uchar`, `string.find`, `string.match`, and `string.gsub`.

The intended automation path is direct function calls, not simulated keyboard or mouse navigation. If a ScriptApp only exposes UI event handlers and no callable solver/classifier functions, add thin global functions that accept inputs and return tables. Example:

```lua
function solveAnyEquation(raw)
  return {
    solved = true,
    result = "..."
  }
end
```

Missing or unsupported APIs are reported in structured errors instead of being treated as successful output. Keep solver logic independent from drawing when possible so agents can run thousands of cases quickly.
