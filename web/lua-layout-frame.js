(() => {
  'use strict';
  let active = null;
  window.TnsLuaLayoutFrame = {
    async start(options) {
      active?.close();
      const canvas = document.querySelector('canvas'), log = document.querySelector('pre'), error = document.querySelector('[role=alert]');
      let runtime, disposed = false, dimensions = '';
      document.documentElement.lang = options.language || 'en';
      // Native math/var calls run synchronously in the document owner's
      // problem session. Source, Lua globals, images and timers stay local.
      window.documentCalculatorMathSession = () => options.mathSession;
      const size = () => ({ width: Math.max(1, document.documentElement.clientWidth), height: Math.max(1, document.documentElement.clientHeight) });
      Object.assign(canvas, size());
      const resize = () => {
        if (disposed) return;
        const next = size(), key = `${next.width}:${next.height}`;
        if (key === dimensions) return;
        dimensions = key; runtime?.resize(next.width, next.height);
      };
      const focus = () => { if (!disposed) options.onFocus?.(); };
      const onVariablesChange = event => { if (!disposed) options.onVariablesChange?.(event.detail); };
      const controller = {
        resize,
        variablesChanged(detail) {
          if (disposed) return;
          // Dispatch only to the local runtime, without forwarding the event
          // back to the parent and recursively invalidating every pane.
          window.removeEventListener('tns-document-variables-change', onVariablesChange);
          try { window.dispatchEvent(new CustomEvent('tns-document-variables-change', { detail })); }
          finally { if (!disposed) window.addEventListener('tns-document-variables-change', onVariablesChange); }
        },
        getScreenText: () => runtime?.getScreenText() || '',
        close() {
          if (disposed) return; disposed = true;
          runtime?.close(); observer.disconnect(); logObserver.disconnect();
          window.removeEventListener('tns-document-variables-change', onVariablesChange);
          window.removeEventListener('pagehide', controller.close);
          for (const [name, handler] of handlers) canvas.removeEventListener(name, handler);
          if (active === controller) active = null;
        },
      };
      const event = name => pointer => {
        if (!runtime || disposed || pointer.button > 0) return;
        pointer.preventDefault();
        if (name === 'mouseDown') { canvas.focus(); focus(); if (pointer.isTrusted) canvas.setPointerCapture?.(pointer.pointerId); }
        const box = canvas.getBoundingClientRect();
        const x = (pointer.clientX - box.left) * canvas.width / box.width, y = (pointer.clientY - box.top) * canvas.height / box.height;
        runtime.pointerEvent(name, x, y);
      };
      const handlers = [
        ['keydown', key => {
          if (!runtime || disposed || key.ctrlKey || key.metaKey || key.altKey) return;
          const action = previewKeyboardEventToLua(key);
          if (!action) return;
          key.preventDefault(); key.stopPropagation();
          if (action.event) runtime.callEvent(action.event); else runtime.charIn(action.char);
        }],
        ['paste', paste => { const text = paste.clipboardData?.getData('text/plain'); if (text && runtime && !disposed) { paste.preventDefault(); runtime.charIn(text); } }],
        ['focus', focus],
        ['pointerdown', event('mouseDown')], ['pointermove', event('mouseMove')], ['pointerup', event('mouseUp')],
        ['pointercancel', event('mouseUp')],
      ];
      const observer = new ResizeObserver(resize);
      const logObserver = new MutationObserver(() => {
        // Avoid retaining an unbounded log in an invisible iframe.
        if (log.textContent.length > 16384) log.textContent = log.textContent.slice(-8192);
        const lines = log.textContent.split('\n').filter(line => /^ERROR\b/.test(line));
        if (lines.length) { error.textContent = lines.at(-1); error.hidden = false; }
      });
      logObserver.observe(log, { childList: true, characterData: true, subtree: true });
      for (const [name, handler] of handlers) canvas.addEventListener(name, handler);
      window.addEventListener('pagehide', controller.close, { once: true });
      active = controller;
      try {
        window.TnsTiPreviewFontCalibration?.install(); window.TnsTiPreviewPerformance?.install();
        runtime = await createLuaJsPreviewRuntime(options.code, canvas.getContext('2d'), canvas, log, options.symbols);
        if (disposed) { runtime.close(); return controller; }
        runtime.boot(); dimensions = `${canvas.width}:${canvas.height}`;
        window.addEventListener('tns-document-variables-change', onVariablesChange);
        observer.observe(document.documentElement);
        return controller;
      } catch (failure) { controller.close(); throw failure; }
    },
    close() { active?.close(); },
  };
})();
