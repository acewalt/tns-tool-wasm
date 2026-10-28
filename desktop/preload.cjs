const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('TnsDesktop',Object.freeze({
  platform:'windows',
  statsIdentity:()=>ipcRenderer.invoke('tns:stats-identity'),
  compilerStatus:()=>ipcRenderer.invoke('tns:compiler-status'),
  buildNdless:(project)=>ipcRenderer.invoke('tns:ndless-build',project),
  convertRom:(payload)=>ipcRenderer.invoke('tns:rom-convert',payload),
  inspectRom:(payload)=>ipcRenderer.invoke('tns:rom-inspect',payload),
  loadRomRam:(hash)=>ipcRenderer.invoke('tns:rom-save-load',hash),
  saveRomRam:(payload)=>ipcRenderer.invoke('tns:rom-save-store',payload),
}));
