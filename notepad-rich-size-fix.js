(() => {
  "use strict";

  // The rich Notes editor historically used execCommand("fontSize") and then
  // searched for <font size="7"> nodes. After the first custom size change,
  // Chromium may reuse/style an existing span instead of creating that exact
  // <font> element, so later size changes appear to stay stuck on the old size.
  // This patch applies TI point sizes directly to the user's saved selection.

  const savedRanges = new WeakMap();

  function editorForControl(control) {
    return control?.closest?.(".ti-note-rich-modal")?.querySelector?.(".ti-note-rich-view") || null;
  }

  function selectionBelongsTo(editor, selection = window.getSelection()) {
    if (!editor || !selection?.rangeCount) return false;
    return editor.contains(selection.anchorNode) && editor.contains(selection.focusNode);
  }

  function rememberSelection(editor) {
    const selection = window.getSelection();
    if (!selectionBelongsTo(editor, selection)) return false;
    savedRanges.set(editor, selection.getRangeAt(0).cloneRange());
    return true;
  }

  function restoreSelection(editor) {
    const range = savedRanges.get(editor);
    if (!range || !range.startContainer?.isConnected || !range.endContainer?.isConnected) return null;
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return range;
    } catch (_) {
      return null;
    }
  }

  function setElementSize(element, pt) {
    element.dataset.tiFs = String(pt);
    element.style.fontSize = `${pt * 4 / 3}px`;
  }

  function textNodesInRange(editor, range) {
    const nodes = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue) continue;
      try {
        if (range.intersectsNode(node)) nodes.push(node);
      } catch (_) {
        // Detached/transient nodes are ignored.
      }
    }
    return nodes;
  }

  function applyCollapsedSize(editor, range, pt) {
    let element = range.startContainer?.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer?.parentElement;
    if (!element) return false;

    if (element === editor && editor.childNodes.length) {
      const index = Math.max(0, Math.min(editor.childNodes.length - 1, range.startOffset || 0));
      const child = editor.childNodes[index];
      element = child?.nodeType === Node.ELEMENT_NODE ? child : child?.parentElement || element;
    }

    const target = element.closest?.("[data-ti-fs], .ti-note-run") || element;
    if (!target || target === editor || !editor.contains(target)) return false;
    setElementSize(target, pt);
    return true;
  }

  function applySelectedSize(editor, range, pt) {
    if (range.collapsed) return applyCollapsedSize(editor, range, pt);

    const nodes = textNodesInRange(editor, range);
    if (!nodes.length) return false;

    const wrappers = [];

    // Work backwards so splitting later text nodes cannot disturb earlier ones.
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const node = nodes[i];
      const originalLength = node.nodeValue?.length || 0;
      if (!originalLength || !node.parentNode) continue;

      let start = 0;
      let end = originalLength;
      if (node === range.startContainer) start = Math.max(0, Math.min(originalLength, range.startOffset));
      if (node === range.endContainer) end = Math.max(0, Math.min(originalLength, range.endOffset));
      if (end <= start) continue;

      const parent = node.parentElement;
      const coversWholeNode = start === 0 && end === originalLength;
      if (
        coversWholeNode &&
        parent &&
        parent !== editor &&
        parent.childNodes.length === 1 &&
        (parent.classList.contains("ti-note-run") || parent.hasAttribute("data-ti-fs"))
      ) {
        setElementSize(parent, pt);
        wrappers.unshift(parent);
        continue;
      }

      if (end < originalLength) node.splitText(end);
      const selectedNode = start > 0 ? node.splitText(start) : node;
      const span = document.createElement("span");
      span.className = "ti-note-size-run";
      setElementSize(span, pt);
      selectedNode.parentNode.insertBefore(span, selectedNode);
      span.appendChild(selectedNode);
      wrappers.unshift(span);
    }

    if (!wrappers.length) return false;

    // Keep the formatted text selected so another size can be chosen immediately.
    try {
      const first = wrappers[0];
      const last = wrappers[wrappers.length - 1];
      const firstText = first.firstChild;
      const lastText = last.lastChild;
      if (firstText?.nodeType === Node.TEXT_NODE && lastText?.nodeType === Node.TEXT_NODE) {
        const nextRange = document.createRange();
        nextRange.setStart(firstText, 0);
        nextRange.setEnd(lastText, lastText.nodeValue?.length || 0);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(nextRange);
        savedRanges.set(editor, nextRange.cloneRange());
      }
    } catch (_) {
      // Formatting already succeeded; selection restoration is best effort.
    }

    return true;
  }

  function emitInput(editor) {
    try {
      editor.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "formatFontSize",
        data: null
      }));
    } catch (_) {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const editors = document.querySelectorAll('.ti-note-rich-view[contenteditable="true"]');
    for (const editor of editors) {
      if (selectionBelongsTo(editor, selection)) {
        savedRanges.set(editor, selection.getRangeAt(0).cloneRange());
        break;
      }
    }
  });

  document.addEventListener("pointerdown", event => {
    const select = event.target?.closest?.(".ti-note-size-select");
    if (!select) return;
    const editor = editorForControl(select);
    if (editor) rememberSelection(editor);
  }, true);

  document.addEventListener("change", event => {
    const select = event.target?.closest?.(".ti-note-size-select");
    if (!select) return;

    const editor = editorForControl(select);
    if (!editor || editor.getAttribute("contenteditable") !== "true") return;

    // If we do not have a valid editor selection, leave the original handler alone.
    const saved = savedRanges.get(editor);
    if (!saved || !saved.startContainer?.isConnected || !saved.endContainer?.isConnected) return;

    const pt = Number(select.value);
    if (!Number.isFinite(pt) || pt <= 0) return;

    // Capture phase runs before notepad-rich-view.js's target handler. Prevent the
    // unreliable execCommand/font[size=7] path and use deterministic Range styling.
    event.stopImmediatePropagation();
    event.preventDefault();

    editor.focus({ preventScroll: true });
    const range = restoreSelection(editor);
    if (!range) return;

    if (applySelectedSize(editor, range, pt)) {
      emitInput(editor); // marks the editor dirty so Save rebuilds the r2dtotree
      rememberSelection(editor);
    }
  }, true);

  window.TiNotepadSizeFix = Object.freeze({ version: "20260904-v1" });
})();
