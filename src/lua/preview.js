import { createLuaRuntime, serializeError } from "./runtime.js";

export async function createLuaPreview(luaSource, options = {}) {
  const runtime = await createLuaRuntime(options);
  const session = new LuaPreviewSession(runtime, options);
  try {
    await runtime.load(luaSource, {
      ...options,
      callLifecycle: options.callLifecycle ?? true
    });
    if (options.paintOnLoad !== false) session.paint();
  } catch (_error) {
    // Runtime stores structured load errors; callers inspect snapshot().
  }
  return session;
}

export async function runLuaPreviewActions(luaSource, actions = [], options = {}) {
  const session = await createLuaPreview(luaSource, options);
  const steps = [];
  try {
    for (const action of normalizeActions(actions)) {
      steps.push(await session.runAction(action));
    }
    return {
      success: steps.every((step) => step.success) && session.snapshot().errors.length === 0,
      steps,
      final: session.snapshot({ globals: options.globals || [] })
    };
  } finally {
    session.close();
  }
}

export class LuaPreviewSession {
  constructor(runtime, options = {}) {
    this.runtime = runtime;
    this.options = options;
    this.lastSnapshot = null;
  }

  paint() {
    this.runtime.resetDrawCalls();
    try {
      const paintFn = this.runtime.getGlobalPath("on.paint") || this.runtime.getGlobalPath("onpaint");
      if (typeof paintFn === "function") {
        const gc = this.runtime.state.gc;
        this.runtime.context.lua_call(paintFn, [gc]);
      }
    } catch (error) {
      this.runtime.state.errors.push(serializeError(error, "event:paint"));
    }
    this.lastSnapshot = this.snapshot();
    return this.lastSnapshot;
  }

  event(eventName, args = []) {
    const normalized = normalizeEvent(eventName, args);
    if (normalized.eventName === "paint") return this.paint();
    try {
      const handler = this.runtime.getGlobalPath(`on.${normalized.eventName}`);
      if (typeof handler === "function") {
        this.runtime.context.lua_call(handler, normalized.args);
      }
    } catch (error) {
      this.runtime.state.errors.push(serializeError(error, `event:${normalized.eventName}`));
    }
    return this.paint();
  }

  call(functionName, args = []) {
    const value = this.runtime.call(functionName, args);
    return {
      value,
      snapshot: this.paint()
    };
  }

  getGlobal(name) {
    return this.runtime.getGlobal(name);
  }

  setGlobal(name, value) {
    this.runtime.setGlobal(name, value);
    return this.paint();
  }

  snapshot(options = {}) {
    const snapshot = this.runtime.snapshot();
    const globals = {};
    for (const name of options.globals || []) {
      try {
        globals[name] = this.runtime.getGlobal(name);
      } catch (error) {
        snapshot.errors.push(serializeError(error, `global:${name}`));
      }
    }
    return {
      ...snapshot,
      globals
    };
  }

  async runAction(action = {}) {
    const normalized = normalizeAction(action);
    try {
      if (normalized.type === "paint") {
        return stepResult(normalized, this.paint());
      }
      if (normalized.type === "event") {
        return stepResult(normalized, this.event(normalized.event, normalized.args));
      }
      if (normalized.type === "call") {
        const call = this.call(normalized.functionName, normalized.args);
        return stepResult(normalized, call.snapshot, { value: call.value });
      }
      if (normalized.type === "setGlobal") {
        return stepResult(normalized, this.setGlobal(normalized.name, normalized.value));
      }
      if (normalized.type === "getGlobal") {
        return stepResult(normalized, this.paint(), { value: this.getGlobal(normalized.name) });
      }
      throw new Error(`Unknown preview action type: ${normalized.type}`);
    } catch (error) {
      this.runtime.state.errors.push(serializeError(error, `action:${normalized.type}`));
      return {
        action: normalized,
        success: false,
        error: serializeError(error, `action:${normalized.type}`),
        snapshot: this.snapshot()
      };
    }
  }

  close() {
    this.runtime.close();
  }
}

function stepResult(action, snapshot, extra = {}) {
  return {
    action,
    success: snapshot.errors.length === 0,
    snapshot,
    ...extra
  };
}

function normalizeActions(actions) {
  if (Array.isArray(actions)) return actions;
  if (Array.isArray(actions?.actions)) return actions.actions;
  return [];
}

function normalizeAction(action) {
  if (typeof action === "string") return { type: "event", event: action, args: [] };
  const type = action.type || action.command || action.action || (action.event ? "event" : "paint");
  if (type === "event") {
    return {
      type,
      event: action.event || action.name,
      args: Array.isArray(action.args) ? action.args : action.arg == null ? [] : [action.arg]
    };
  }
  if (type === "call") {
    return {
      type,
      functionName: action.function || action.functionName,
      args: Array.isArray(action.args) ? action.args : []
    };
  }
  if (type === "setGlobal") return { type, name: action.name, value: action.value };
  if (type === "getGlobal") return { type, name: action.name };
  return { type: "paint" };
}

function normalizeEvent(eventName, args = []) {
  const name = String(eventName || "");
  const arrowAliases = {
    arrowUp: "up",
    arrowDown: "down",
    arrowLeft: "left",
    arrowRight: "right",
    up: "up",
    down: "down",
    left: "left",
    right: "right"
  };
  if (Object.prototype.hasOwnProperty.call(arrowAliases, name)) {
    return { eventName: "arrowKey", args: [arrowAliases[name]] };
  }
  return { eventName: name.replace(/^on\./, ""), args };
}
