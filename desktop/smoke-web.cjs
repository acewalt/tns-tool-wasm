const fs=require('node:fs/promises');
async function checkBrowserRequirement(win,screenshot){
  const result=await win.webContents.executeJavaScript(`(async()=>{
    const end=Date.now()+30000;
    while(!window.NdlessProjectWorkspace || !window.TnsMonacoEditor || document.querySelector('#xml-toggle-btn')?.disabled || document.querySelector('#startup-loader')){
      if(Date.now()>end)throw Error('Web runtime did not become ready');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(window.TnsDesktop)throw Error('Browser gate test must not have a native preload');
    if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();
    const button=document.querySelector('#xml-new-ndless-project');
    if(!button || button.disabled)throw Error('Desktop notice entry must be accessible');
    button.click();
    const dialog=document.querySelector('.ndless-desktop-required-card');
    if(!dialog || dialog.getBoundingClientRect().width<300 || document.querySelector('.ndless-project-dialog'))
      throw Error('Browser opened a project instead of the desktop recommendation');
    const download=dialog.querySelector('[data-desktop-download]').href;
    if(!download.startsWith('https://github.com/acewalt/tns-tool-wasm/actions/workflows/desktop-portable-windows.yml'))
      throw Error('Wrong desktop download destination');
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await new Promise(resolve=>setTimeout(resolve,500));
    return {required:true,download,steps:dialog.querySelectorAll('li').length};
  })()`);
  await fs.writeFile(screenshot,(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`(()=>{
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    if(document.querySelector('.ndless-desktop-required-card'))throw Error('Escape did not close the desktop notice');
    document.querySelector('label[data-ndless-project-action] input[accept=".zip"]').closest('label').click();
    if(!document.querySelector('.ndless-desktop-required-card'))throw Error('Opening a project must show the same notice');
    if(document.querySelector('.ndless-project-dialog'))throw Error('Project workspace was opened in browser');
  })()`);
  return result;
}
module.exports={checkBrowserRequirement};
