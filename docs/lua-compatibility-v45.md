# Lua preview compatibility — 0.1.45

Validated on 21 November 2026 in the browser application and subsequently in the packaged Windows application, with external network requests blocked. The user's Lua source files were read unchanged. These results concern LuaJS preview; they do not certify equivalence with a physical TI-Nspire.

## Measured results

The original `Diagnostico_TI_Nspire_LuaJS_Exhaustivo_v2.lua` contains 343 checks. A temporary in-memory probe calls its existing test runner and reads each result; the source file is not edited. Both runs use the same browser runtime and drawing context. The second run also dispatches the timer callback, which accounts for the former waiting result.

| Diagnostic status | Before | 0.1.45 |
| --- | ---: | ---: |
| OK | 290 | 327 |
| Failed expectation | 19 | 0 |
| Runtime error | 22 | 7 |
| NO API | 10 | 8 |
| N/A | 1 | 1 |
| Waiting for event | 1 | 0 |
| Total | 343 | 343 |

There are 34 fewer failures/errors. The additional three OK results are `table.foreach`, `table.getn` and the explicitly dispatched timer event. Full after-results are in [the diagnostic data](qa/lua-compatibility-v45.json).

## Corrections and their causes

| Files / functions | Cause and resulting behavior |
| --- | --- |
| `src/lua/string-patterns.js`, `installLuaStringPatterns` | The vendor `gmatch` raised `Not supported`; other layers approximated Lua patterns with JavaScript regexes. The shared implementation now handles independent iterators, captures, positions, balanced/frontier patterns, Lua classes, greedy/minimal quantifiers, anchors and substitution counts. |
| `src/lua/standard-library.js`, `installLuaStandardLibrary` | Formatting was partial and a LÖVE shim replaced it with placeholder text. One formatter now handles width, precision, signs, integer/hex/octal/character, fixed/scientific/general, quoted strings and literal percent conversions. |
| `vendor/luajs/lua.js`, parser local-function binding | Local recursive functions compiled before their name was bound and looked up a global instead. The enclosing local is bound before compiling the function body. Tests cover closures, shadowing and mutual forward declarations. |
| `vendor/luajs/lua.js`, `math.rad/deg`, `rawequal`, `assert`, `pcall/xpcall` | Reversed angle conversions and inconsistent scalar/multiple-return handling are corrected. Protected calls return values or errors without aborting the preview. |
| `web/app.js`, `createLuaJsPreviewRuntime` | Paint/event failures previously propagated out of the preview. Diagnostics now identify the callback and its declaration location; another input event can recover the same session. Source parsing/loading errors still fail explicitly. |
| `src/lua/runtime.js`, mocks, `web/love-project-compat.js`, CAS bridge v3 | Browser, CLI and LÖVE use the shared final string implementations. The injected Lua gmatch shim and the late placeholder formatter were removed. |
| `web/lua-compatibility-report.js` | Static analysis no longer labels supported gmatch calls as incompatible. It warns about the remaining bytecode/coroutine/heap limitations instead, in Spanish, English and French. |

The initialization order remains vendor sources → TI/preview adapters → shared string library. Existing CAS and document bindings remain in place. No Lua user program, TNS generator, file import/export or Lua editor code was changed for these compatibility corrections. Other UI changes in this release address the previously requested grouped-page controls.

## Functional checks

- The required gmatch example renders exactly three lines: `Hola`, `Mundo`, `Lua`.
- The original `Termodinamica_Parcial_Modo_Examen.lua` opens Home, topics, tasks and input forms. Its 800 J / 300 J example returns 500 J. Keyboard navigation opens and scrolls the procedure; mouse controls clear the form, calculate 900 − 200 = 700 J and open the new procedure.
- An intentionally failing `on.paint` produces a callback/source diagnostic, then the same runtime renders “Recovered after Enter” after an Enter event.
- Twenty additional automated tests exercise patterns, replacement tables/functions, independent and empty iterators, formatter rounding/boundaries, local recursion, multiple returns, protected errors and named unsupported operations.
- Existing CLI, CAS, document-symbol, drawing, persistence and grouped-page regression suites pass. Layout smoke tests cover normal, magnified and expanded display, horizontal/vertical panes, repeated Calculator input and native Notes formatting persistence.

Reproduction: `npm run test:lua-compat`. Browser/packaged acceptance uses `tools/smoke-lua-compat-v45.cjs` with Electron and the two original files in `TNS_LUA_FIXTURE_DIR` (defaults to Downloads). External requests are cancelled by the harness.

## Remaining differences

Seven diagnostic checks still fail: `string.dump`, five coroutine checks, and `collectgarbage("count")`. They now report named limitations instead of generic errors or fabricated success.

LuaJS compiles Lua functions to ordinary JavaScript functions. It cannot suspend/resume their call stack, emit Lua 5.1 bytecode, or control/measure a separate Lua heap. A generator retrofit would need to propagate suspension across every generated call and loop, protected call and native adapter; changing only `coroutine.create/resume` would be incorrect. No fake coroutine implementation was added.

A full VM compiled to WebAssembly is feasible, but requires porting TI drawing, events, document/CAS bindings and editor/image resources, maintaining per-preview state and testing Lua 5.1 compatibility. [Wasmoon](https://github.com/ceifa/wasmoon) demonstrates a browser-capable VM but implements Lua 5.4, so it is not a direct Lua 5.1 replacement. That migration is **not implemented in 0.1.45**.

The eight NO API results are `package.loaded`, `gc.resetClip`, `gc.copy`, `D2Editor.newText/newMath`, `locale.get/set` and an undefined `on.resize`. The [TI API guide](https://education.ti.com/html/webhelp/EG_TINspireLUA/EN/content/eg_splash_page/splash_luaapiguide.htm) documents `D2Editor.newRichText`, `locale.name` and resize as an application-defined callback; these diagnostic names were not blindly added as stubs. The test script does not define `on.resize`. The single N/A text-width check is not a visual fidelity assertion.

`os.clock` returns elapsed wall time in this JavaScript runtime, not Lua CPU time; OS/package access is not a guarantee of ScriptApp support. JavaScript string storage is not a byte-for-byte Lua string implementation for every Unicode/binary case. Pattern matching has an operation limit to stop pathological backtracking. `%+d` follows [Lua 5.1 formatting](https://www.lua.org/manual/5.1/manual.html#pdf-string.format): 3 becomes `+3`; the reported physical-calculator discrepancy was not intentionally reproduced.

Physical-device output and exact graphical fidelity were not independently remeasured in this run. Passing API existence checks does not prove pixel-identical fonts, graphics, complete CAS coverage or every TI event behavior.
