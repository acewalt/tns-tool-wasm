const fs=require('node:fs/promises');
async function checkWorkspace(win,report,startup={}){
  const result=await win.webContents.executeJavaScript(`(async()=>{
    const deadline=Date.now()+30000;
    while(!window.NdlessProjectWorkspace || !window.TnsMonacoEditor || !window.JSZip || document.querySelector('#xml-toggle-btn')?.disabled){
      if(Date.now()>deadline)throw new Error('Browser runtime did not become ready');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    const uiReadyMs=performance.now();
    const statsIdentity=await window.TnsDesktop.statsIdentity();
    if(statsIdentity.enabled)throw new Error('Smoke runs must not register real visitors');
    const workspace=window.NdlessProjectWorkspace;
    if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))
      document.querySelector('#xml-toggle-btn').click();
    await new Promise(resolve=>setTimeout(resolve,400));
    const cases=[];
    for(const language of ['c','cpp']){
      workspace.newProject();
      const form=document.querySelector('.ndless-project-dialog');
      form.elements.namedItem('language').value=language;
      if(form.elements.namedItem('target').value!=='zehn-modern')
        throw new Error('Desktop new projects must default to the supported modern target');
      form.requestSubmit();
      const project=workspace.getProject();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const host=document.querySelector('.ndless-project-workspace');
      const editor=host?.querySelector('[data-ndless-project-editor] .monaco-editor');
      const source=host?.querySelector('[data-active-file]')?.textContent;
      if(!host || host.getBoundingClientRect().height<100 || !editor || source!==project.activeFile)
        throw new Error('Ndless workspace did not mount for '+language+': '+JSON.stringify({host:!!host,height:host?.getBoundingClientRect().height,editor:!!editor,source,expected:project.activeFile,panel:document.querySelector('#xml-doctor-panel')?.className}));
      if(!host.querySelector('[data-project-files]')?.textContent.includes(project.activeFile))
        throw new Error('Project file tree is missing');
      cases.push({language,source,editor:true});
      workspace.closeProject();
      const grid=document.querySelector('#xml-doctor-panel .doctor-grid');
      if(grid.hidden || getComputedStyle(grid).display==='none')throw new Error('Normal editor was not restored');
    }
    // Exercise the real destination dialog with a simulated calculator;
    // no physical USB device is selected or written during this check.
    const originalUSB=window.TnsNspireUSB,created=[],sent=[];
    let captures=0,closes=0;
    const folders={'/':[]};
    const fake={connected:true,device:{productName:'Smoke calculator'},
      connect:async()=>folders['/'],close:async()=>{closes++;fake.connected=false;},
      listDir:async path=>folders[path],
      makeDir:async path=>{created.push(path);folders[path]=[];folders['/'].push({name:'smoke-folder',path,isDir:true});},
      putFile:async path=>{sent.push(path);},
      screenshotRle:async(_progress,ready)=>{
        const pixels=new Uint8Array(320*240*2);
        const color=++captures%2 ? 0xf800 : 0x07e0;
        for(let i=0;i<pixels.length;i+=2){pixels[i]=color&255;pixels[i+1]=color>>>8;}
        const image={width:320,height:240,bpp:16,pixels};ready(image);return image;
      }};
    window.TnsNspireUSB={...originalUSB,NspireUSB:{select:async()=>fake}};
    const waitFor=async predicate=>{
      const end=Date.now()+5000;
      while(!predicate()){
        if(Date.now()>end)throw new Error('Destination dialog timed out');
        await new Promise(resolve=>setTimeout(resolve,25));
      }
    };
    try{
      window.TnsCalculatorTransfer.open();
      document.querySelector('[data-ti-connect]').click();
      const input=document.querySelector('[data-ti-upload]');
      await waitFor(()=>!input.disabled);
      const transfer=new DataTransfer();transfer.items.add(new File(['test'],'smoke.tns'));
      input.files=transfer.files;input.dispatchEvent(new Event('change'));
      await waitFor(()=>document.querySelector('.ti-destination-new-folder')?.disabled===false);
      document.querySelector('.ti-destination-new-folder').click();
      const name=document.querySelector('.ti-destination-folder-name');name.value='smoke-folder';
      if(name.getBoundingClientRect().width<80)throw new Error('Folder name input is not visible');
      document.querySelector('.ti-destination-create-form').requestSubmit();
      await waitFor(()=>document.querySelector('.ti-destination-path')?.textContent==='/smoke-folder');
      if(sent.length || created[0]!=='/smoke-folder')throw new Error('Incorrect folder creation order');
      await waitFor(()=>document.querySelector('.ti-destination-confirm')?.disabled===false);
      document.querySelector('.ti-destination-confirm').click();
      await waitFor(()=>sent.length===1);
      if(sent[0]!=='/smoke-folder/smoke.tns')throw new Error('Incorrect upload destination');
      await waitFor(()=>!document.querySelector('[data-ti-capture]').disabled);
      for(let i=0;i<3;i++){
        document.querySelector('[data-ti-capture]').click();
        await waitFor(()=>!document.querySelector('[data-ti-capture]').disabled);
        const canvas=document.querySelector('[data-ti-image] canvas');
        if(!canvas || canvas.width!==320 || canvas.height!==240)throw new Error('Native capture bitmap missing');
        const pixel=canvas.getContext('2d').getImageData(0,0,1,1).data;
        if(pixel[i%2?1:0]!==255)throw new Error('Screenshot bitmap was stale');
        window.TnsCalculatorTransfer.close();
        if(!document.querySelector('.ti-manager-overlay').hidden)throw new Error('Manager did not hide');
        window.TnsCalculatorTransfer.open();
        if(canvas!==document.querySelector('[data-ti-image] canvas') || closes)
          throw new Error('Reopening the manager lost its bitmap or USB session');
      }
    }finally{
      document.querySelector('[data-ti-disconnect]').click();
      await waitFor(()=>!document.querySelector('[data-ti-connect]').hidden);
      window.TnsCalculatorTransfer.close();window.TnsNspireUSB=originalUSB;
    }
    return {ok:true,uiReadyMs,cases,desktopBridge:!!window.TnsDesktop,statsIdentity,
      destination:{created,sent,simulatedUSB:true},screenshots:{captures,reopenKeptConnection:true,simulatedUSB:true}};
  })()`);
  if(!result.desktopBridge)throw new Error('Sandboxed desktop preload bridge is missing');
  await fs.writeFile(report,JSON.stringify({...result,startup},null,2));
  return {...result,startup};
}
module.exports={checkWorkspace};
