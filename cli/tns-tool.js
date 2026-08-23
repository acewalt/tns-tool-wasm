#!/usr/bin/env node
import {
  addLuaScriptAppFromFile,
  buildTns,
  callLuaFunctionFromFile,
  createTnsDocument,
  extractTns,
  getCapabilities,
  getTiNspireMockCapabilities,
  inspectTns,
  runLuaPreview,
  runLuaSuite,
  validateLua
} from "../src/api/index.js";
import { readJsonInput, readTextInput } from "../src/adapters/node/files.js";
import { EXIT_CODES, structuredError } from "../src/adapters/node/exit-codes.js";
import { formatLuaTestText, formatSuiteText } from "../src/test-runner/reporter.js";

const rawArgs = process.argv.slice(2);
const json = takeFlag(rawArgs, "--json");

main(rawArgs).then(({ output, exitCode = EXIT_CODES.OK }) => {
  writeOutput(output, json);
  process.exit(exitCode);
}).catch((error) => {
  const output = structuredError("CLI_RUNTIME_ERROR", String(error?.message || error), {});
  writeOutput(output, json);
  process.exit(EXIT_CODES.RUNTIME_ERROR);
});

async function main(args) {
  if (!args.length || args[0] === "--help" || args[0] === "-h") {
    return { output: helpText(), exitCode: EXIT_CODES.OK };
  }

  const command = args.shift();
  if (command === "capabilities") {
    return { output: getCapabilities(), exitCode: EXIT_CODES.OK };
  }

  if (command === "lua") {
    return runLuaCommand(args);
  }

  if (command === "tns") {
    return runTnsCommand(args);
  }

  return {
    output: structuredError("INVALID_COMMAND", `Unknown command: ${command}`, { command }),
    exitCode: EXIT_CODES.INVALID_ARGUMENTS
  };
}

async function runTnsCommand(args) {
  const subcommand = args.shift();
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    return { output: tnsHelpText(), exitCode: EXIT_CODES.OK };
  }

  if (subcommand === "inspect") {
    const input = args.shift();
    if (!input) return invalidArgs("tns inspect requires a .tns file path or extracted XML folder");
    const result = await inspectTns(input);
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  if (subcommand === "extract") {
    const input = args.shift();
    const output = takeOption(args, "--output");
    if (!input || !output) return invalidArgs("tns extract requires input.tns and --output dir");
    const result = await extractTns(input, output);
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  if (subcommand === "build") {
    const input = args.shift();
    const output = takeOption(args, "--output");
    if (!input || !output) return invalidArgs("tns build requires an XML project directory and --output file.tns");
    const result = await buildTns(input, output);
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  if (subcommand === "create") {
    const output = takeOption(args, "--output");
    if (!output) return invalidArgs("tns create requires --output file.tns");
    const result = await createTnsDocument(output);
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  if (subcommand === "add-lua") {
    const input = args.shift();
    const luaFile = args.shift();
    const output = takeOption(args, "--output");
    if (!input || !luaFile || !output) return invalidArgs("tns add-lua requires input.tns|xmlDir luaFile.lua --output file.tns");
    const result = await addLuaScriptAppFromFile(input, luaFile, output);
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  return invalidArgs(`Unknown tns command: ${subcommand}`);
}

async function runLuaCommand(args) {
  const subcommand = args.shift();
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    return { output: luaHelpText(), exitCode: EXIT_CODES.OK };
  }

  if (subcommand === "mocks") {
    return { output: getTiNspireMockCapabilities(), exitCode: EXIT_CODES.OK };
  }

  if (subcommand === "check") {
    const luaPath = args.shift();
    if (!luaPath) return invalidArgs("lua check requires a Lua file path or - for stdin");
    const source = await safeReadText(luaPath);
    if (!source.success) return { output: source, exitCode: EXIT_CODES.INVALID_FILE };
    const result = await validateLua(source.text, { filename: luaPath });
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  if (subcommand === "call") {
    const luaPath = args.shift();
    if (!luaPath) return invalidArgs("lua call requires a Lua file path");
    if (luaPath === "-") {
      return invalidArgs("lua call with stdin is not supported yet because loadLuaScript requires a reusable runtime filename; use lua check - or save a temp file.");
    }
    const functionName = takeOption(args, "--function") || takeOption(args, "--call");
    if (!functionName) return invalidArgs("lua call requires --function name");
    const parsedArgs = parseLuaArgs(args);
    if (!parsedArgs.success) return { output: parsedArgs, exitCode: EXIT_CODES.INVALID_ARGUMENTS };
    const readable = await safeReadText(luaPath);
    if (!readable.success) return { output: readable, exitCode: EXIT_CODES.INVALID_FILE };
    const result = await callLuaFunctionFromFile(luaPath, functionName, parsedArgs.args, { filename: luaPath });
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.RUNTIME_ERROR };
  }

  if (subcommand === "suite") {
    const luaPath = args.shift();
    const testsPath = args.shift();
    if (!luaPath || !testsPath) return invalidArgs("lua suite requires a Lua file path and a tests JSON path");
    const [luaSource, suiteDefinition] = await Promise.all([
      safeReadText(luaPath),
      safeReadJson(testsPath)
    ]);
    if (!luaSource.success) return { output: luaSource, exitCode: EXIT_CODES.INVALID_FILE };
    if (!suiteDefinition.success) return { output: suiteDefinition, exitCode: EXIT_CODES.INVALID_FILE };
    const suite = await runLuaSuite(luaSource.text, suiteDefinition.value, {
      filename: luaPath,
      functionName: suiteDefinition.value?.function || suiteDefinition.value?.functionName
    });
    return { output: suite, exitCode: suite.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  if (subcommand === "preview") {
    const luaPath = args.shift();
    if (!luaPath) return invalidArgs("lua preview requires a Lua file path or - for stdin");
    const actionsPath = takeOption(args, "--actions");
    const globals = takeRepeatedOption(args, "--get-global");
    const luaSource = await safeReadText(luaPath);
    if (!luaSource.success) return { output: luaSource, exitCode: EXIT_CODES.INVALID_FILE };

    let actionDefinition = { actions: [], globals };
    if (actionsPath) {
      const parsed = await safeReadJson(actionsPath);
      if (!parsed.success) return { output: parsed, exitCode: EXIT_CODES.INVALID_FILE };
      actionDefinition = Array.isArray(parsed.value)
        ? { actions: parsed.value, globals }
        : { ...parsed.value, globals: [...new Set([...(parsed.value.globals || []), ...globals])] };
    }

    const result = await runLuaPreview(luaSource.text, actionDefinition, {
      filename: luaPath,
      globals: actionDefinition.globals || globals
    });
    return { output: result, exitCode: result.success ? EXIT_CODES.OK : EXIT_CODES.OPERATION_FAILED };
  }

  return invalidArgs(`Unknown lua command: ${subcommand}`);
}

function parseLuaArgs(args) {
  const jsonArgs = takeOption(args, "--args");
  const repeated = takeRepeatedOption(args, "--arg");
  if (jsonArgs != null) {
    try {
      const parsed = JSON.parse(jsonArgs);
      if (!Array.isArray(parsed)) {
        return structuredError("INVALID_ARGS_JSON", "--args must be a JSON array", { args: jsonArgs });
      }
      return { success: true, args: parsed };
    } catch (error) {
      return structuredError("INVALID_ARGS_JSON", String(error?.message || error), { args: jsonArgs });
    }
  }
  return { success: true, args: repeated };
}

async function safeReadText(filePath) {
  try {
    return { success: true, text: await readTextInput(filePath) };
  } catch (error) {
    return structuredError("FILE_READ_ERROR", String(error?.message || error), { file: filePath });
  }
}

async function safeReadJson(filePath) {
  try {
    return { success: true, value: await readJsonInput(filePath) };
  } catch (error) {
    return structuredError("JSON_READ_ERROR", String(error?.message || error), { file: filePath });
  }
}

function invalidArgs(message) {
  return {
    output: structuredError("INVALID_ARGUMENTS", message, {}),
    exitCode: EXIT_CODES.INVALID_ARGUMENTS
  };
}

function takeFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return false;
  args.splice(index, 1);
  return true;
}

function takeOption(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  args.splice(index, 2);
  return value ?? null;
}

function takeRepeatedOption(args, flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag) continue;
    values.push(args[index + 1] ?? "");
    args.splice(index, 2);
    index -= 1;
  }
  return values;
}

function writeOutput(output, jsonMode) {
  if (jsonMode) {
    const payload = typeof output === "string" ? { success: true, message: output } : output;
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  if (typeof output === "string") {
    process.stdout.write(`${output}\n`);
  } else if (output?.results && "passed" in output) {
    process.stdout.write(`${formatSuiteText(output)}\n`);
  } else if ("syntaxOk" in output && "runtimeOk" in output && "results" in output) {
    process.stdout.write(`${formatLuaTestText(output)}\n`);
  } else if (output?.error) {
    process.stderr.write(`ERROR ${output.error.code}: ${output.error.message}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  }
}

function helpText() {
  return `TNS Tool WASM CLI

Usage:
  node cli/tns-tool.js capabilities [--json]
  node cli/tns-tool.js lua <command> [options]
  node cli/tns-tool.js tns <command> [options]

Commands:
  capabilities        Print machine-readable capabilities for this build.
  lua check           Load and syntax/runtime-check a Lua ScriptApp.
  lua call            Call a global Lua function from a ScriptApp.
  lua suite           Run a JSON test suite against a ScriptApp.
  lua preview         Run paint/events and capture draw output.
  lua mocks           List simulated TI-Nspire APIs.
  tns inspect         Inspect a .tns or extracted XML project.
  tns extract         Decode a .tns into XML.
  tns build           Build a .tns from XML.
  tns create          Create a blank .tns document.
  tns add-lua         Insert a Lua ScriptApp and rebuild.

Use --json for JSON-only stdout.`;
}

function luaHelpText() {
  return `Lua commands:

  lua check <file|-> [--json]
  lua call <file> --function <name> [--args '[1,2]'] [--arg value] [--json]
  lua suite <file|-> <tests.json> [--json]
  lua preview <file|-> [--actions actions.json] [--get-global name] [--json]
  lua mocks [--json]

Exit codes:
  0 success
  1 operation or test failed
  2 invalid arguments
  3 invalid or unsupported file
  4 runtime error`;
}

function tnsHelpText() {
  return `TNS commands:

  tns inspect <file.tns|xmlDir> [--json]
  tns extract <file.tns> --output <xmlDir> [--json]
  tns build <xmlDir> --output <file.tns> [--json]
  tns create --output <file.tns> [--json]
  tns add-lua <file.tns|xmlDir> <script.lua> --output <file.tns> [--json]

Exit codes:
  0 success
  1 operation or test failed
  2 invalid arguments
  3 invalid or unsupported file
  4 runtime error`;
}
