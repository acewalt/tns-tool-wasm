// Let the renderer's editor handle Ctrl+B/Ctrl+R instead of Electron's menu
// accelerator (View → Reload). This does not suppress DOM keyboard events.
function installEditorShortcutMenuGuard(contents) {
  contents.on('before-input-event',(_event,input)=>{
    const editorCommand=(input.control||input.meta)&&!input.alt&&!input.shift&&['b','r'].includes(String(input.key||'').toLowerCase());
    contents.setIgnoreMenuShortcuts(Boolean(editorCommand));
  });
}
module.exports={installEditorShortcutMenuGuard};
