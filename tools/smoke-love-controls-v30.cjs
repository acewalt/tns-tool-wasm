/* Run with Electron: verifies preview controls at the first rendered frame. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'..','portable-0.1.27','desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const out=path.join(root,'release','qa','love-controls-v30.json');let win,server;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const html='<!doctype html><html lang="en"><head><base href="/"><link rel="stylesheet" href="web/styles.css"><link rel="stylesheet" href="web/preview-window.css"><link rel="stylesheet" href="web/love-preview-live-math.css"><link rel="stylesheet" href="web/love-preview-side-controls.css"><script defer src="web/love-preview-side-controls.js"></script><script defer src="web/love-preview-live-math.js"></script></head><body></body></html>';
 fs.writeFileSync(path.join(root,'release','qa','love-controls-fixture-v30.html'),html);
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(info,done)=>done({cancel:!info.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{contextIsolation:true,sandbox:true,offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',(_event,_level,message)=>fs.appendFileSync(out+'.console.log',message+'\n'));
 await win.loadURL(origin+'release/qa/love-controls-fixture-v30.html');
 const result=await win.webContents.executeJavaScript('('+scenario.toString()+')()');
 fs.writeFileSync(out,JSON.stringify(result,null,2));fs.writeFileSync(out+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(result));win.destroy();server.close();app.exit(result.ok?0:1);
}).catch(async error=>{if(win)fs.writeFileSync(out+'.failure.html',await win.webContents.executeJavaScript('document.documentElement.outerHTML'));fs.writeFileSync(out,JSON.stringify({ok:false,error:error.stack},null,2));console.error(error);win?.destroy();server?.close();app.exit(1)});
async function scenario(){
 const errors=[],cases=[],frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const check=(ok,message,details)=>{if(!ok)errors.push({message,details});};
 const rect=node=>{const b=node.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
 const calls=[];window.TnsMathTools={openTemplates:options=>{calls.push({kind:'templates',options});return{close(){}}},openCatalog:options=>{calls.push({kind:'catalog',options});return{close(){}}}};
 const create=(kind,shared=true,expanded=false)=>{
  const backdrop=document.createElement('div');backdrop.className='modal-backdrop'+(shared?' preview-window-backdrop':'');
  const modal=document.createElement('div');modal.className='modal '+(kind==='raw'?'lua-preview-modal':'love-preview-modal')+(shared?' preview-window':'')+(expanded?' preview-window-expanded':'');
  const id=kind==='raw'?'lua':'love',stageClass=kind==='raw'?'lua-preview-calculator':'love-preview-stage';
  const controls='<div class="preview-controls">'+[['Up','up'],['Down','down'],['Left','left'],['Right','right'],['Space','space'],['Enter','return'],['Esc','escape']].map(([label,key])=>'<button data-key="'+key+'">'+label+'</button>').join('')+'</div>';
  const stage='<div class="'+stageClass+' preview-window-stage"><div style="height:26px;background:#30372e"></div><canvas id="'+id+'-preview-canvas" width="320" height="214"></canvas></div>';
  const actions='<div class="modal-actions"><button id="'+id+'-preview-copy-content">Copy content</button><button id="love-copy-nspire">Copy TI-Nspire</button><button id="love-replace-nspire">Replace with TI-Nspire</button><button id="'+id+'-preview-close">Close</button></div>';
  modal.innerHTML='<header class="preview-window-header"><h2>Preview</h2><div class="modal-top-actions"><button>Expanded view</button><button>Close</button></div></header>'+(shared?'<div class="preview-window-body"><aside class="preview-window-left">'+controls+'</aside><main class="preview-window-center">'+stage+'</main><aside class="preview-window-right"><pre id="love-preview-log">ready</pre>'+actions+'</aside></div>':stage+controls+actions)+'<footer class="preview-window-footer"></footer>';
  backdrop.append(modal);return{backdrop,modal};
 };
 const inspect=async(kind,shared,expanded,reuse)=>{
  const {backdrop,modal}=create(kind,shared,expanded);const keys=[];modal.querySelector('canvas').addEventListener('keydown',e=>keys.push(e.key));
  let mountedBackdrop=backdrop;if(reuse){reuse.replaceChildren(modal);mountedBackdrop=reuse;}else document.body.append(backdrop);
  await frame();
  const left=modal.querySelector('.love-preview-side-keys'),dpad=modal.querySelector('.love-preview-dpad'),icon=modal.querySelector('.love-preview-templates-toggle'),catalog=modal.querySelector('.love-preview-catalog-toggle');
  check(!!dpad,'D-pad missing on first rendered frame',{kind,shared,expanded});
  check(dpad?.querySelector('[data-love-key="up"]')?.textContent==='↑','Plain key labels visible',{kind});
  check(modal.querySelectorAll('.love-preview-dpad').length===1,'Duplicate D-pad',{kind});
  check(modal.querySelectorAll('.love-preview-side-workspace').length===1,'Nested preview workspace',{kind});
  check(modal.querySelector('canvas').parentElement.parentElement.classList.contains('love-preview-side-center'),'Stage detached from common center',{kind});
  check(!!icon && !icon.textContent && icon.getAttribute('aria-label')==='Templates','Template icon missing/unnamed',{kind});
  check(!!catalog && catalog.getAttribute('aria-label')==='Catalog','Catalog icon missing/unnamed',{kind});
  check(modal.querySelector('#'+(kind==='raw'?'lua':'love')+'-preview-close').hidden,'Duplicate close still visible',{kind});
  if(shared){const box=rect(left);for(const button of modal.querySelectorAll('.love-preview-dpad button,.love-preview-aux-keys button')){const b=rect(button);check(b.left>=box.left-1&&b.right<=box.right+1,'Key extends outside control rail',{kind,expanded,box,button:button.textContent,rect:b});}}
  const count=calls.length;icon.click();check(calls.length===count+1&&calls.at(-1).kind==='templates','Common template palette not called');calls.at(-1).options.insert('sqrt(9)');check(keys.join('')==='sqrt(9)','Template insertion did not reach preview keys',keys);
  catalog.click();check(calls.at(-1).kind==='catalog','Common catalog not called');
  const common=window.TnsMathTools;window.TnsMathTools=null;icon.click();const fallback=modal.querySelector('.lpm-panel');check(!fallback.hidden&&getComputedStyle(fallback).position==='static','Fallback palette does not open below button');window.TnsMathTools=common;fallback.hidden=true;
  const before=rect(modal.querySelector('canvas').parentElement);for(let i=0;i<3;i++)window.TnsLovePreviewSideControls.refresh();const after=rect(modal.querySelector('canvas').parentElement);check(JSON.stringify(before)===JSON.stringify(after),'Refreshing controls moved the preview display');
  cases.push({kind,shared,expanded,reused:!!reuse,firstFrameDpad:!!dpad,templateIcon:!!icon,catalogIcon:!!catalog,stage:after});return mountedBackdrop;
 };
 let reuse=await inspect('love',true,false);await inspect('love',true,false,reuse);reuse.remove();
 for(const kind of ['love','raw'])for(const expanded of [false,true]){const backdrop=await inspect(kind,true,expanded);backdrop.remove();}
 const legacy=await inspect('love',false,false);legacy.remove();await frame();
 return{ok:!errors.length,cases,errors};
}
