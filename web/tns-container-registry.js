(() => {
  "use strict";

  const adapters = [];
  const asBytes = input => input instanceof Uint8Array ? input : new Uint8Array(input || 0);

  function register(adapter) {
    if (!adapter || typeof adapter !== "object") throw new TypeError("Container adapter must be an object.");
    if (!adapter.id || typeof adapter.id !== "string") throw new TypeError("Container adapter requires a string id.");
    if (typeof adapter.detect !== "function" || typeof adapter.parse !== "function") {
      throw new TypeError(`Container adapter ${adapter.id} requires detect() and parse().`);
    }
    const existing = adapters.findIndex(item => item.id === adapter.id);
    const normalized = Object.freeze({ priority: 100, kind: "content-pack", ...adapter });
    if (existing >= 0) adapters.splice(existing, 1, normalized);
    else adapters.push(normalized);
    adapters.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return normalized;
  }

  function unregister(id) {
    const index = adapters.findIndex(item => item.id === id);
    if (index >= 0) adapters.splice(index, 1);
  }

  function list() {
    return adapters.map(({ id, label, kind, priority, extensions }) => ({ id, label, kind, priority, extensions }));
  }

  function detect(bytesInput, file = null) {
    const bytes = asBytes(bytesInput);
    for (const adapter of adapters) {
      let matched = false;
      try { matched = Boolean(adapter.detect(bytes, file)); }
      catch (error) { console.warn(`TNS container detector ${adapter.id} failed.`, error); }
      if (!matched) continue;
      try {
        const parsed = adapter.parse(bytes, file);
        if (!parsed) continue;
        return {
          valid: parsed.valid !== false,
          family: "custom-container",
          kind: adapter.kind || "content-pack",
          format: adapter.id,
          formatLabel: adapter.label || adapter.id,
          typeLabel: adapter.typeLabel || "Custom TNS content",
          adapterId: adapter.id,
          adapter,
          ...parsed,
          bytes,
          file: file || parsed.file || null,
        };
      } catch (error) {
        return {
          valid: false,
          family: "custom-container",
          kind: adapter.kind || "content-pack",
          format: adapter.id,
          formatLabel: adapter.label || adapter.id,
          typeLabel: adapter.typeLabel || "Custom TNS content",
          adapterId: adapter.id,
          adapter,
          reason: error?.message || String(error),
          error,
          bytes,
          file,
        };
      }
    }
    return null;
  }

  async function inspectFile(file) {
    if (!file || !/\.tns$/i.test(file.name || "")) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    return detect(bytes, file);
  }

  function getAdapter(id) { return adapters.find(item => item.id === id) || null; }

  window.TnsContainerRegistry = Object.freeze({ register, unregister, list, detect, inspectFile, getAdapter });
})();
