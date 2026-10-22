import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../theme-transition-toggle.js", import.meta.url), "utf8");
new vm.Script(source);

async function exercise(useNative) {
  const animations = [];
  const state = { nativeCalls: 0, layers: 0, removed: 0 };
  const storage = new Map([["tns-tool-theme", "dark"]]);
  const makeAnimation = (frames, options) => {
    animations.push({ frames, options });
    return { finished: Promise.resolve() };
  };
  function makeButton() {
    const events = {};
    return {
      className: "theme-button",
      classList: { toggle() {} },
      setAttribute() {},
      addEventListener(name, listener) { events[name] = listener; },
      getBoundingClientRect() { return { left: 900, top: 15, width: 36, height: 36 }; },
      cloneNode() { return makeButton(); },
      replaceWith(next) { state.button = next; },
      events,
    };
  }
  const original = makeButton();
  const root = {
    dataset: { theme: "dark" },
    style: {},
    animate: makeAnimation,
  };
  const doc = {
    readyState: "complete",
    documentElement: root,
    getElementById(id) { return id === "theme-btn" ? original : null; },
    createElement(tag) {
      if (tag === "style") return { textContent: "", id: "" };
      return {
        style: {}, className: "",
        animate: makeAnimation,
        remove() { state.removed++; },
      };
    },
    head: { appendChild() {} },
    body: { appendChild() { state.layers++; } },
  };
  if (useNative) {
    doc.startViewTransition = callback => {
      state.nativeCalls++;
      callback();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    };
  }
  const win = {
    innerWidth: 1000, innerHeight: 800,
    matchMedia: () => ({ matches: true }), // System motion reduction must not silently disable the reveal.
    dispatchEvent() {},
  };
  const sandbox = {
    document: doc, window: win,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    CustomEvent: class { constructor(name, config) { this.name = name; this.detail = config?.detail; } },
    console,
    setTimeout(fn) { fn(); },
  };
  vm.runInNewContext(source, sandbox);
  assert.ok(state.button, "animated handler must replace the legacy button");
  state.button.events.click({ preventDefault() {}, stopPropagation() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(root.dataset.theme, "light");
  assert.equal(storage.get("tns-tool-theme"), "light");
  assert.equal(root.dataset.tnsThemeRevealLast, useNative ? "native" : "fallback");
  assert.equal(state.nativeCalls, useNative ? 1 : 0);
  assert.ok(animations.some(({ frames }) => Array.isArray(frames.clipPath) && frames.clipPath.length === 2),
    "the transition must expand a circular clip-path");
  if (!useNative) {
    assert.equal(state.layers, 1);
    assert.equal(state.removed, 1);
    assert.equal(animations.length, 2, "wipe and fade both animate");
  }
}

await exercise(true);
await exercise(false);
console.log("Circular theme reveal works with native and fallback animations, even with system reduced-motion enabled.");
