export const TNS_TOOL_VERSION = "0.1.0";

export function getCapabilities() {
  return {
    success: true,
    version: TNS_TOOL_VERSION,
    capabilities: {
      lua: {
        syntaxCheck: true,
        execute: true,
        callFunction: true,
        testSuite: true,
        mocks: true,
        stdin: true,
        jsonOutput: true
      },
      tns: {
        inspect: false,
        extract: false,
        build: false,
        addLuaScriptApp: false
      },
      document: {
        createDocument: false,
        openDocument: false,
        addLuaScriptApp: false,
        replaceLuaScript: false,
        saveDocument: false
      },
      xml: {
        validateXml: false,
        syntaxDoctor: false
      },
      python: {
        syntaxCheck: false,
        addPythonProgram: false,
        extractPythonProgram: false
      }
    },
    notes: [
      "Lua automation is available through the shared core runner.",
      "TNS/XML/Python browser features still need extraction from the current UI/Pyodide path before they can be advertised for CLI agents.",
      "No capability is marked true unless this version exposes it outside the DOM."
    ]
  };
}

