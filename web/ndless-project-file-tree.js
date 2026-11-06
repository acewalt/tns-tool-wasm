(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function normalizeProjectPath(value) {
    return String(value || "")
      .replace(/\\+/g, "/")
      .split("/")
      .map(part => part.trim())
      .filter(part => part && part !== "." && part !== "..")
      .map(part => part.replace(/[:*?"<>|]/g, "_"))
      .join("/");
  }

  function buildPathTree(paths = []) {
    const tree = { name: "", path: "", folders: Object.create(null), files: [] };
    for (const raw of paths) {
      const path = normalizeProjectPath(raw);
      if (!path) continue;
      const parts = path.split("/");
      const file = parts.pop();
      let node = tree;
      let current = "";
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        node.folders[part] ||= { name: part, path: current, folders: Object.create(null), files: [] };
        node = node.folders[part];
      }
      node.files.push({ name: file, path });
    }
    return tree;
  }

  const api = Object.freeze({ normalizeProjectPath, buildPathTree });
  root.NdlessProjectFileTree = api;
  if (typeof document === "undefined") return;

  const folderState = new Map();
  const listObservers = new WeakMap();
  let bodyObserver = null;
  let panelObserver = null;
  let suppressRender = false;

  const icons = {
    folderClosed: `<svg class="ndless-tree-icon ndless-tree-folder-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"/></svg>`,
    folderOpen: `<svg class="ndless-tree-icon ndless-tree-folder-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/></svg>`,
    file: `<svg class="ndless-tree-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-12.21c.342.052.682.107 1.022.166M5.772 5.79 6.84 19.673a2.25 2.25 0 0 0 2.244 2.077h5.832a2.25 2.25 0 0 0 2.244-2.077L18.228 5.79M4.772 5.79a48.11 48.11 0 0 1 3.478-.397m7.5 0a48.108 48.108 0 0 1 3.478.397M15.75 5.393v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>`
  };

  function project() { return root.NdlessProjectWorkspace?.getProject?.() || null; }
  function workspace() { return document.querySelector("#xml-doctor-panel .ndless-project-workspace"); }

  function fileBadge(name) {
    if (/^Makefile$/i.test(name) || /\.mk$/i.test(name)) return "BUILD";
    if (/\.(?:cpp|cc|cxx)$/i.test(name)) return "C++";
    if (/\.c$/i.test(name)) return "C";
    if (/\.(?:h|hpp|hh)$/i.test(name)) return "H";
    if (/\.(?:S|s)$/i.test(name)) return "ASM";
    if (/\.lua$/i.test(name)) return "LUA";
    if (/\.md$/i.test(name)) return "MD";
    return "FILE";
  }

  function findOriginalButton(box, path) {
    return $$(":scope > button.ndless-project-flat-entry", box).find(button => button.querySelector("span")?.textContent === path) || null;
  }

  function createFileRow(file, box, activeFile) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `ndless-tree-file${file.path === activeFile ? " is-selected" : ""}`;
    row.dataset.treeFile = file.path;
    row.title = file.path;
    row.innerHTML = `${icons.file}<span>${esc(file.name)}</span><small>${esc(fileBadge(file.name))}</small>`;
    row.addEventListener("click", () => findOriginalButton(box, file.path)?.click());
    return row;
  }

  function folderKey(projectName, path) { return `${projectName}::${path || "/"}`; }

  function createFolderNode(node, box, projectName, activeFile, isRoot = false) {
    const item = document.createElement("li");
    item.className = "ndless-tree-item ndless-tree-folder-item";
    const key = folderKey(projectName, node.path);
    const defaultOpen = isRoot || activeFile === node.path || activeFile?.startsWith(`${node.path}/`);
    const open = folderState.has(key) ? folderState.get(key) : defaultOpen || true;

    const label = document.createElement("button");
    label.type = "button";
    label.className = `ndless-tree-label${open ? " is-open" : ""}`;
    label.setAttribute("aria-expanded", String(open));
    label.innerHTML = `${icons.folderClosed}${icons.folderOpen}<span>${esc(isRoot ? projectName : node.name)}</span>`;

    const wrapper = document.createElement("div");
    wrapper.className = `ndless-tree-children-wrapper${open ? " is-open" : ""}`;
    const children = document.createElement("ul");
    children.className = "ndless-tree-children";

    const folderNames = Object.keys(node.folders).sort((a,b) => a.localeCompare(b));
    for (const name of folderNames) children.appendChild(createFolderNode(node.folders[name], box, projectName, activeFile));
    const files = [...node.files].sort((a,b) => {
      if (a.path === activeFile) return -1;
      if (b.path === activeFile) return 1;
      if (a.name === "Makefile") return -1;
      if (b.name === "Makefile") return 1;
      return a.name.localeCompare(b.name);
    });
    for (const file of files) {
      const child = document.createElement("li");
      child.className = "ndless-tree-item";
      child.appendChild(createFileRow(file, box, activeFile));
      children.appendChild(child);
    }
    wrapper.appendChild(children);
    label.addEventListener("click", () => {
      const next = label.getAttribute("aria-expanded") !== "true";
      label.setAttribute("aria-expanded", String(next));
      label.classList.toggle("is-open", next);
      wrapper.classList.toggle("is-open", next);
      folderState.set(key, next);
    });

    item.append(label, wrapper);
    return item;
  }

  function enhanceDeleteButton(scope) {
    const button = scope?.querySelector?.("[data-project-delete-file]");
    if (!button || button.dataset.treeDeleteStyled === "1") return;
    button.dataset.treeDeleteStyled = "1";
    button.classList.add("ndless-project-delete-action");
    button.innerHTML = icons.trash;
    button.title = "Delete selected file";
    button.setAttribute("aria-label", "Delete selected file");
  }

  function renderTree() {
    const p = project(), ws = workspace();
    if (!p || !ws) return;
    enhanceDeleteButton(ws);
    const box = ws.querySelector("[data-project-files]");
    if (!box || suppressRender) return;

    const directButtons = $$(":scope > button", box).filter(button => !button.closest(".ndless-project-tree"));
    for (const button of directButtons) button.classList.add("ndless-project-flat-entry");
    if (!directButtons.length && box.querySelector(".ndless-project-tree")) return;

    box.querySelector(".ndless-project-tree")?.remove();
    const tree = buildPathTree(Object.keys(p.files || {}));
    const host = document.createElement("div");
    host.className = "ndless-project-tree";
    const list = document.createElement("ul");
    list.className = "ndless-tree-root";
    list.appendChild(createFolderNode(tree, box, p.name || "project", p.activeFile, true));
    host.appendChild(list);

    suppressRender = true;
    box.prepend(host);
    requestAnimationFrame(() => { suppressRender = false; });

    if (!listObservers.has(box)) {
      const observer = new MutationObserver(() => {
        if (suppressRender) return;
        requestAnimationFrame(renderTree);
      });
      observer.observe(box, { childList: true });
      listObservers.set(box, observer);
    }
  }

  function enhanceNewFileDialog(overlay) {
    if (!overlay || overlay.dataset.treeFolders === "1") return;
    const form = overlay.querySelector("form.ndless-sdk-dialog");
    if (!form) return;
    overlay.dataset.treeFolders = "1";
    const nameLabel = form.querySelector('input[name="name"]')?.closest("label");
    if (!nameLabel) return;
    const folderLabel = document.createElement("label");
    folderLabel.innerHTML = `Folder <input name="folder" placeholder="src (optional)" autocomplete="off"><small>Use paths such as src, include or assets.</small>`;
    nameLabel.before(folderLabel);

    form.addEventListener("submit", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const p = project();
      if (!p) return;
      const type = form.querySelector('select[name="type"]')?.value || "c";
      const name = normalizeProjectPath(form.querySelector('input[name="name"]')?.value || "").split("/").pop();
      const folder = normalizeProjectPath(form.querySelector('input[name="folder"]')?.value || "");
      if (!name) return;
      const path = folder ? `${folder}/${name}` : name;
      if (p.files[path] != null) { alert("File already exists."); return; }
      const starters = {
        c: "#include <os.h>\n\nvoid feature(void) {\n    \n}\n",
        cpp: "#include <os.h>\n\nvoid feature() {\n    \n}\n",
        header: "#pragma once\n\n",
        asm: ".syntax unified\n.arm\n.text\n\n.global my_function\nmy_function:\n    bx lr\n",
        lua: "-- Auxiliary Lua file. It is not compiled by the Ndless Makefile.\n\n",
        text: ""
      };
      p.files[path] = starters[type] ?? "";
      p.activeFile = path;
      overlay.remove();
      root.NdlessProjectWorkspace?.activateProject?.(p);
      requestAnimationFrame(renderTree);
    }, true);
  }

  function setup() {
    const ws = workspace();
    if (ws) renderTree();
  }

  function init() {
    const panel = document.querySelector("#xml-doctor-panel");
    if (panel && !panelObserver) {
      panelObserver = new MutationObserver(() => requestAnimationFrame(setup));
      panelObserver.observe(panel, { childList: true });
    }
    if (!bodyObserver) {
      bodyObserver = new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(".ndless-sdk-dialog-overlay")) enhanceNewFileDialog(node);
        }
      });
      bodyObserver.observe(document.body, { childList: true });
    }
    setup();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();