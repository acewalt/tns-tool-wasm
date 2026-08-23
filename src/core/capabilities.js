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
        preview: true,
        previewAssertions: true,
        mocks: true,
        stdin: true,
        jsonOutput: true
      },
      tns: {
        inspect: true,
        extract: true,
        build: true,
        create: true,
        addLuaScriptApp: true
      },
      document: {
        createDocument: true,
        openDocument: true,
        addLuaScriptApp: true,
        replaceLuaScript: false,
        saveDocument: true
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
      "TNS document automation is available through the Node/Python bridge that calls the same tnstools.py decode/build path.",
      "Lua preview automation captures TI-Nspire draw calls and text output without DOM clicks.",
      "No capability is marked true unless this version exposes it outside the DOM."
    ]
  };
}
