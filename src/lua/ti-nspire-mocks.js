export const TI_NSPIRE_MOCK_CAPABILITIES = {
  platform: {
    status: "partial",
    apis: [
      "platform.apilevel",
      "platform.apiLevel",
      "platform.os",
      "platform.hw",
      "platform.isColorDisplay",
      "platform.isDeviceModeRendering",
      "platform.registerErrorHandler",
      "platform.window",
      "platform.gc",
      "platform.withGC"
    ]
  },
  "platform.window": {
    status: "partial",
    apis: [
      "platform.window.width",
      "platform.window.height",
      "platform.window.invalidate",
      "platform.window.setFocus"
    ]
  },
  gc: {
    status: "partial",
    apis: [
      "begin",
      "finish",
      "setFont",
      "setPen",
      "setColorRGB",
      "setAlpha",
      "drawString",
      "drawRect",
      "fillRect",
      "drawLine",
      "drawArc",
      "fillArc",
      "drawImage",
      "fillPolygon",
      "drawPolygon",
      "drawPolyLine",
      "clipRect",
      "getStringWidth",
      "getStringHeight"
    ]
  },
  timer: {
    status: "partial",
    apis: ["timer.start", "timer.stop", "timer.getMilliSecCounter"]
  },
  var: {
    status: "partial",
    apis: ["var.store", "var.recall", "var.list"]
  },
  D2Editor: {
    status: "partial",
    apis: ["D2Editor.newRichText", "D2Editor.createMathBox", "D2Editor.createChemBox"]
  },
  image: {
    status: "partial",
    apis: ["image.new"]
  },
  string: {
    status: "partial",
    apis: ["string.uchar", "string.len", "string.lower", "string.upper", "string.sub", "string.format", "string.find", "string.match", "string.gsub"]
  },
  math: {
    status: "partial",
    apis: ["math.eval"]
  }
};

export function getTiNspireMockCapabilities() {
  return JSON.parse(JSON.stringify({
    success: true,
    mockedApis: TI_NSPIRE_MOCK_CAPABILITIES,
    notes: [
      "This is not a full TI-Nspire emulator.",
      "Drawing APIs are no-op mocks intended to let computational ScriptApp logic load.",
      "Unsupported APIs are reported as structured runtime errors."
    ]
  }));
}

export function installTiNspireMocks(global, state = {}, options = {}) {
  const width = Number(options.width) || 318;
  const height = Number(options.height) || 212;
  const store = state.store || (state.store = {});
  const nativeEditors = state.nativeEditors || (state.nativeEditors = []);

  const platform = ensureLuaTable(global, "platform");
  const on = ensureLuaTable(global, "on");
  const varTable = ensureLuaTable(global, "var");
  const stringTable = ensureLuaTable(global, "string");
  const mathTable = ensureLuaTable(global, "math");
  const timerTable = ensureLuaTable(global, "timer");
  const d2EditorTable = ensureLuaTable(global, "D2Editor");
  const imageTable = ensureLuaTable(global, "image");

  global.lua_tableset(platform, "apilevel", "2.0");
  global.lua_tableset(platform, "apiLevel", "2.0");
  global.lua_tableset(platform, "os", "runner");
  global.lua_tableset(platform, "hw", () => [5]);
  global.lua_tableset(platform, "isColorDisplay", () => [true]);
  global.lua_tableset(platform, "isDeviceModeRendering", () => [false]);
  global.lua_tableset(platform, "registerErrorHandler", (_handler) => {
    state.errorHandler = _handler;
    return [];
  });

  const gc = createGcMock(global, state);
  const windowTable = global.lua_newtable();
  global.lua_tableset(windowTable, "w", width);
  global.lua_tableset(windowTable, "h", height);
  global.lua_tableset(windowTable, "gc", gc);
  global.lua_tableset(windowTable, "invalidated", false);
  global.lua_tableset(windowTable, "width", () => [width]);
  global.lua_tableset(windowTable, "height", () => [height]);
  global.lua_tableset(windowTable, "setFocus", () => []);
  global.lua_tableset(windowTable, "invalidate", () => {
    global.lua_tableset(windowTable, "invalidated", true);
    return [];
  });
  global.lua_tableset(platform, "window", windowTable);
  global.lua_tableset(platform, "gc", () => [gc]);
  global.lua_tableset(platform, "withGC", (callback, ...args) => {
    if (typeof callback !== "function") return [];
    return global.lua_call(callback, [...args, gc]);
  });

  global.lua_tableset(varTable, "store", (key, value) => {
    const cleanKey = String(key);
    store[cleanKey] = value;
    global.G.str[cleanKey] = value;
    return [];
  });
  global.lua_tableset(varTable, "recall", (key) => {
    const cleanKey = String(key);
    return [Object.prototype.hasOwnProperty.call(store, cleanKey) ? store[cleanKey] : null];
  });
  global.lua_tableset(varTable, "list", () => [global.lua_newtable(Object.keys(store))]);

  global.lua_tableset(timerTable, "start", (delay) => {
    global.lua_tableset(timerTable, "delay", Number(delay) || 0);
    global.lua_tableset(timerTable, "running", true);
    return [];
  });
  global.lua_tableset(timerTable, "stop", () => {
    global.lua_tableset(timerTable, "running", false);
    return [];
  });
  global.lua_tableset(timerTable, "getMilliSecCounter", () => [Date.now()]);

  global.lua_tableset(stringTable, "uchar", (codepoint) => [String.fromCodePoint(Number(codepoint) || 0)]);
  global.lua_tableset(stringTable, "len", (source) => [String(source ?? "").length]);
  global.lua_tableset(stringTable, "lower", (source) => [String(source ?? "").toLowerCase()]);
  global.lua_tableset(stringTable, "upper", (source) => [String(source ?? "").toUpperCase()]);
  global.lua_tableset(stringTable, "sub", (source, start, end) => [luaStringSub(source, start, end)]);
  global.lua_tableset(stringTable, "format", (format, ...args) => [luaStringFormat(format, args)]);
  global.lua_tableset(stringTable, "find", (source, pattern, init, plain) => luaStringFind(global, source, pattern, init, plain));
  global.lua_tableset(stringTable, "match", (source, pattern, init) => luaStringMatch(source, pattern, init));
  global.lua_tableset(stringTable, "gsub", (source, pattern, replacement, limit) => luaStringGsub(global, source, pattern, replacement, limit));

  global.lua_tableset(mathTable, "eval", (expr) => {
    const value = evaluateSimpleTiMath(expr, store);
    return [value == null ? null : value];
  });

  global.G.str.tonumber = (value, base) => {
    let parsed;
    if (base == null || Number(base) === 10) parsed = Number.parseFloat(String(value ?? "").replace(/[−–]/g, "-"));
    else parsed = Number.parseInt(String(value ?? ""), Number(base));
    return [Number.isFinite(parsed) ? parsed : null];
  };

  installD2EditorMock(global, d2EditorTable, nativeEditors);
  global.lua_tableset(imageTable, "new", (payload) => [global.lua_newtable(null, "__image", String(payload ?? ""))]);

  global.G.str.print = (...args) => {
    state.stdout.push(args.map((arg) => luaValueToDisplayString(global, arg)).join("\t"));
    return [];
  };

  return { platform, on, varTable, gc, windowTable };
}

export function ensureLuaTable(global, name) {
  if (!global.G?.str) throw new Error("LuaJS global table is not initialized");
  if (!global.G.str[name]) {
    global.G.str[name] = global.lua_newtable();
  }
  return global.G.str[name];
}

function createGcMock(global, state) {
  const gc = global.lua_newtable();
  const noOp = () => [];
  const methods = [
    "begin",
    "finish",
    "default",
    "setFont",
    "setPen",
    "setColorRGB",
    "setAlpha",
    "drawString",
    "drawRect",
    "fillRect",
    "drawLine",
    "drawArc",
    "fillArc",
    "drawImage",
    "fillPolygon",
    "drawPolygon",
    "drawPolyLine",
    "clipRect"
  ];
  for (const method of methods) global.lua_tableset(gc, method, noOp);
  global.lua_tableset(gc, "getStringWidth", (_self, value) => [String(value ?? "").length * 6]);
  global.lua_tableset(gc, "getStringHeight", () => [12]);
  global.lua_tableset(gc, "__screenText", global.lua_newtable());
  state.gc = gc;
  return gc;
}

function installD2EditorMock(global, d2EditorTable, nativeEditors) {
  const createEditor = () => {
    const state = {
      text: "",
      readOnly: false,
      visible: true,
      focused: false,
      filterTable: null
    };
    const editor = global.lua_newtable();
    nativeEditors.push(state);
    global.lua_tableset(editor, "__nativeState", state);
    global.lua_tableset(editor, "move", () => []);
    global.lua_tableset(editor, "resize", () => []);
    global.lua_tableset(editor, "setReadOnly", (_self, value) => {
      state.readOnly = Boolean(value);
      return [];
    });
    global.lua_tableset(editor, "setVisible", (_self, value) => {
      state.visible = Boolean(value);
      return [];
    });
    global.lua_tableset(editor, "setFocus", (_self, value) => {
      state.focused = Boolean(value);
      return [];
    });
    global.lua_tableset(editor, "registerFilter", (_self, filterTable) => {
      state.filterTable = filterTable || null;
      return [];
    });
    global.lua_tableset(editor, "setText", (_self, text) => {
      state.text = String(text ?? "");
      return [];
    });
    global.lua_tableset(editor, "setExpression", (_self, text) => {
      state.text = normalizeTiRichText(String(text ?? ""));
      return [];
    });
    global.lua_tableset(editor, "getText", () => [state.text]);
    global.lua_tableset(editor, "getExpression", () => [state.text]);
    for (const method of [
      "setBorder",
      "setBorderColor",
      "setColorable",
      "setDisable2DinRT",
      "setFontSize",
      "setMainFont",
      "setSelectable",
      "setSelection",
      "setSelectionRange",
      "setSizeChangeListener",
      "setTextChangeListener",
      "setTextColor",
      "setWordWrapWidth",
      "createMathBox"
    ]) {
      global.lua_tableset(editor, method, () => []);
    }
    return editor;
  };
  global.lua_tableset(d2EditorTable, "newRichText", () => [createEditor()]);
  global.lua_tableset(d2EditorTable, "createMathBox", () => [createEditor()]);
  global.lua_tableset(d2EditorTable, "createChemBox", () => [createEditor()]);
}

function luaStringFind(global, source, pattern, init, plain) {
  const text = String(source ?? "");
  const start = Math.max(0, (Number(init) || 1) - 1);
  const needle = String(pattern ?? "");
  if (plain === true) {
    const index = text.indexOf(needle, start);
    return index < 0 ? [null] : [index + 1, index + needle.length];
  }
  const regex = luaPatternToRegExp(needle);
  regex.lastIndex = 0;
  const match = regex.exec(text.slice(start));
  if (!match) return [null];
  const matchStart = start + match.index;
  return [matchStart + 1, matchStart + match[0].length, ...match.slice(1).map((value) => value ?? null)];
}

function luaStringSub(source, start, end) {
  const text = String(source ?? "");
  const length = text.length;
  let from = Number(start) || 1;
  let to = end == null ? length : Number(end) || 0;
  if (from < 0) from = length + from + 1;
  if (to < 0) to = length + to + 1;
  from = Math.max(1, from);
  to = Math.min(length, to);
  if (to < from) return "";
  return text.slice(from - 1, to);
}

function luaStringFormat(format, args) {
  let argIndex = 0;
  return String(format ?? "").replace(/%([%+\- 0#]*)(\d*)(?:\.(\d+))?([dfs])/g, (match, flags, width, precision, type) => {
    const value = args[argIndex++];
    if (type === "s") return applyStringWidth(String(value ?? ""), width, flags);
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return match;
    let output;
    if (type === "d") output = String(Math.trunc(numeric));
    else output = numeric.toFixed(precision == null ? 6 : Number(precision));
    return applyStringWidth(output, width, flags);
  }).replace(/%%/g, "%");
}

function applyStringWidth(text, width, flags = "") {
  const size = Number(width) || 0;
  if (text.length >= size) return text;
  const pad = " ".repeat(size - text.length);
  return flags.includes("-") ? `${text}${pad}` : `${pad}${text}`;
}

function luaStringMatch(source, pattern, init) {
  const text = String(source ?? "");
  const start = Math.max(0, (Number(init) || 1) - 1);
  const regex = luaPatternToRegExp(String(pattern ?? ""));
  regex.lastIndex = 0;
  const match = regex.exec(text.slice(start));
  if (!match) return [null];
  return match.length > 1 ? match.slice(1).map((value) => value ?? null) : [match[0]];
}

function luaStringGsub(global, source, pattern, replacement, limit) {
  const text = String(source ?? "");
  const max = limit == null ? Infinity : Math.max(0, Number(limit) || 0);
  if (max === 0) return [text, 0];
  const regex = luaPatternToRegExp(String(pattern ?? ""));
  let count = 0;
  const output = text.replace(regex, (...args) => {
    if (count >= max) return args[0];
    count += 1;
    if (typeof replacement === "function") {
      const captures = args.slice(1, -2);
      const result = global.lua_call(replacement, captures.length ? captures : [args[0]])[0];
      return result == null ? args[0] : String(result);
    }
    if (replacement && typeof replacement === "object") {
      const key = args[1] ?? args[0];
      const result = global.lua_tableget(replacement, key);
      return result == null ? args[0] : String(result);
    }
    return String(replacement ?? "").replace(/%(\d)/g, (_match, index) => String(args[Number(index)] ?? ""));
  });
  return [output, count];
}

function luaPatternToRegExp(pattern) {
  let output = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "%") {
      const next = pattern[index + 1] || "";
      index += 1;
      if (next === "a") output += "[A-Za-z]";
      else if (next === "d") output += "\\d";
      else if (next === "s") output += "\\s";
      else if (next === "w") output += "[A-Za-z0-9_]";
      else if (next === "0") output += "0";
      else if (next === "1") output += "1";
      else output += escapeRegExp(next);
    } else if (char === "[") {
      const end = pattern.indexOf("]", index + 1);
      if (end > index) {
        output += luaPatternClassToRegExp(pattern.slice(index, end + 1));
        index = end;
      } else {
        output += "\\[";
      }
    } else if (char === ".") {
      output += "[\\s\\S]";
    } else if (char === "(" || char === ")") {
      output += char;
    } else if (char === "^") {
      output += index === 0 ? "^" : "\\^";
    } else if (char === "$") {
      output += index === pattern.length - 1 ? "$" : "\\$";
    } else if (char === "*" || char === "+" || char === "?") {
      output += char;
    } else if (char === "-") {
      output += "*?";
    } else if ("^$.*+?{}|\\".includes(char)) {
      output += `\\${char}`;
    } else {
      output += char;
    }
  }
  return new RegExp(output, "g");
}

function luaPatternClassToRegExp(text) {
  let inner = text.slice(1, -1);
  inner = inner
    .replace(/%a/g, "A-Za-z")
    .replace(/%d/g, "\\d")
    .replace(/%s/g, "\\s")
    .replace(/%w/g, "A-Za-z0-9_")
    .replace(/%0/g, "0")
    .replace(/%1/g, "1")
    .replace(/%([()[\].*+?^$|{}\\/+])/g, "\\$1");
  return `[${inner}]`;
}

function evaluateSimpleTiMath(expr, store) {
  const source = String(expr ?? "").trim();
  if (!source) return null;
  let normalized = source
    .replace(/∞/g, "Infinity")
    .replace(/[−–]/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/\^/g, "**")
    .replace(/π/g, "PI")
    .replace(/\bpi\b/gi, "PI")
    .replace(/\bln\s*\(/gi, "log(");
  normalized = normalized.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (name) => {
    if (["Infinity", "PI", "sin", "cos", "tan", "sqrt", "abs", "exp", "log"].includes(name)) return name;
    if (Object.prototype.hasOwnProperty.call(store, name)) return String(Number(store[name]) || 0);
    return name;
  });
  try {
    const fn = Function("sin", "cos", "tan", "sqrt", "abs", "exp", "log", "PI", `"use strict"; return (${normalized});`);
    const value = fn(Math.sin, Math.cos, Math.tan, Math.sqrt, Math.abs, Math.exp, Math.log, Math.PI);
    return Number.isFinite(Number(value)) ? Number(value) : null;
  } catch (_error) {
    return null;
  }
}

function normalizeTiRichText(text) {
  return text
    .replace(/\\0el\s*\{\s*/g, "")
    .replace(/\}/g, "")
    .replace(//g, "e");
}

function luaValueToDisplayString(global, value) {
  if (value == null) return "nil";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const tostring = global.G?.str?.tostring;
    if (tostring) return String(global.lua_call(tostring, [value])[0]);
  } catch (_error) {
    // Keep print robust; structured errors are handled by the caller.
  }
  return "[table]";
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
