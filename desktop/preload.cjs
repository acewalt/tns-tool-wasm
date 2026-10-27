const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('TnsDesktop',Object.freeze({
  platform:'windows',
  statsIdentity:()=>ipcRenderer.invoke('tns:stats-identity'),
  compilerStatus:()=>ipcRenderer.invoke('tns:compiler-status'),
  buildNdless:(project)=>ipcRenderer.invoke('tns:ndless-build',project),
}));
