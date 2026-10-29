// Exercise the real ROM screen, responsive CSS and user-supplied console icons.
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..');
app.whenReady().then(async()=>{
 const server=require('./server.cjs').makeServer(root,path.join(__dirname,'vendor'));const origin=await require('./server.cjs').listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['https://tns-tool-stats.guard-mauricio-save.workers.dev/*']},(d,cb)=>cb({cancel:true}));
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,offscreen:true}}),report={ok:false,source:process.env.TNS_ROM_WEB_URL||origin};
 try{
  await win.loadURL(report.source);
  const gb=Buffer.from(require('./rom-test-gb.cjs')({color:true,battery:true})).toString('base64'),mono=Buffer.from(require('./rom-test-gb.cjs')({color:false})).toString('base64');
  report.controls=await win.webContents.executeJavaScript(`(async()=>{
   const wait=async fn=>{const end=Date.now()+30000;while(!await fn()){if(Date.now()>end)throw Error('Design timeout: '+document.querySelector('[data-rom-status]')?.textContent+' / '+document.querySelector('[data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,40));}};window.romDesignWait=wait;await wait(()=>window.TnsRomConverterView&&window.TnsRomConverter);
   window.romDesignOpener=document.createElement('button');window.romDesignOpener.textContent='ROM preview test opener';document.body.append(window.romDesignOpener);window.romDesignOpener.focus();window.TnsRomConverter.open();const q=s=>document.querySelector('.rom-converter '+s);window.romDesignQ=q;
   await wait(()=>getComputedStyle(q('.rom-layout')).display==='grid');if(document.querySelector('.rom-converter-overlay').dataset.console!=='unknown')throw Error('Initial console must be unknown');
   q('[data-rom-autoplay]').checked=false;const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(${JSON.stringify(gb)}),c=>c.charCodeAt(0))],'renamed.bin'));
   q('.rom-dropzone').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));await wait(()=>window.TnsRomConverter.state.ready);
   if(window.TnsRomConverter.state.preview)throw Error('Disabled autoplay still started');if(!q('[data-rom-console-icon]').src.endsWith('/gbc.svg'))throw Error('GBC icon did not follow header');if(q('[data-rom-info="file"]').textContent!=='renamed.bin')throw Error('Dropped file went to another importer');
   q('[data-rom-preview]').click();await wait(()=>window.TnsRomConverter.state.preview==='running');await wait(()=>Number(q('[data-rom-frames]').textContent)>5);
   const canvas=q('canvas');canvas.focus();canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'ControlLeft',bubbles:true}));await new Promise(r=>setTimeout(r,100));canvas.dispatchEvent(new KeyboardEvent('keyup',{code:'ControlLeft',bubbles:true}));
   q('[data-live-pause]').click();await wait(()=>window.TnsRomConverter.state.preview==='paused');const image=canvas.toDataURL();await new Promise(r=>setTimeout(r,180));if(canvas.toDataURL()!==image)throw Error('Pause did not stop animation');if(q('[data-rom-start]').disabled)throw Error('Resume disabled while paused');q('[data-rom-start]').click();await wait(()=>window.TnsRomConverter.state.preview==='running');
   q('[data-live-stop]').click();await wait(()=>window.TnsRomConverter.state.preview==='stopped');q('[data-rom-start]').click();await wait(()=>window.TnsRomConverter.state.preview==='running');q('[data-live-restart]').click();await wait(()=>window.TnsRomConverter.state.preview==='running');
   q('[data-rom-pixels]').checked=false;q('[data-rom-pixels]').dispatchEvent(new Event('change'));if(getComputedStyle(canvas).imageRendering!=='auto')throw Error('Rendering option ignored');q('[data-rom-pixels]').checked=true;q('[data-rom-pixels]').dispatchEvent(new Event('change'));
   const width=canvas.getBoundingClientRect().width;q('[data-rom-expand]').click();if(q('[data-rom-expand]').getAttribute('aria-pressed')!=='true'||canvas.getBoundingClientRect().width<=width)throw Error('Expanded preview did not enlarge');q('[data-rom-expand]').click();
   if([...document.querySelectorAll('.rom-converter img')].some(img=>!img.complete||!img.naturalWidth))throw Error('Console icon failed to load');
   await wait(()=>Number(q('[data-rom-frames]').textContent)>100);
   return{drop:true,headerIcon:true,autoPreview:true,pauseResume:true,stopStart:true,restart:true,displayOption:true,expanded:true,frameCounter:true};
  })()`);
  await fs.writeFile(path.join(root,'release/rom-design-desktop.png'),(await win.webContents.capturePage()).toPNG());
  win.setContentSize(430,900);
  report.mobile=await win.webContents.executeJavaScript(`(async()=>{await new Promise(r=>setTimeout(r,100));const q=window.romDesignQ,dialog=document.querySelector('.rom-converter'),layout=q('.rom-layout');if(!dialog.clientWidth||dialog.scrollWidth>dialog.clientWidth+1||layout.scrollWidth>layout.clientWidth+1)throw Error('Mobile layout overflows horizontally');q('[data-rom-screen]').scrollIntoView({block:'start'});return{width:dialog.clientWidth,content:dialog.scrollWidth};})()`);
  await fs.writeFile(path.join(root,'release/rom-design-mobile.png'),(await win.webContents.capturePage()).toPNG());
  win.setContentSize(1440,1000);
  report.reset=await win.webContents.executeJavaScript(`(async()=>{const q=window.romDesignQ,wait=window.romDesignWait;q('[data-rom-remove]').click();if(window.TnsRomConverter.state.ready||!q('[data-rom-project]').disabled||!q('[data-rom-console-icon]').src.endsWith('/unknown.svg'))throw Error('Remove kept a stale cartridge');const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(${JSON.stringify(mono)}),c=>c.charCodeAt(0))],'color-misleading.gbc'));const input=q('[data-rom-file]');input.files=dt.files;input.dispatchEvent(new Event('change'));await wait(()=>window.TnsRomConverter.state.ready);if(!q('[data-rom-console-icon]').src.endsWith('/gb.svg'))throw Error('GB icon relied on extension');window.TnsRomConverter.close();if(document.documentElement.classList.contains('rom-converter-lock'))throw Error('Modal scroll lock leaked');if(document.activeElement!==window.romDesignOpener)throw Error('Modal did not restore focus');return{removed:true,monoHeaderIcon:true,closed:true};})()`);
  report.improvements=await require('./smoke-rom-improvements.cjs').check(win);
  win.setContentSize(430,900);
  report.mobileImprovements=await require('./smoke-rom-improvements.cjs').check(win);
  report.ok=true;
 }catch(e){report.error=e.stack||String(e);await fs.writeFile(path.join(root,'release/rom-design-error.png'),(await win.webContents.capturePage()).toPNG());}
 finally{await fs.writeFile(path.join(root,'release/rom-design-report.json'),JSON.stringify(report,null,2));win.destroy();server.close();app.exit(report.ok?0:1);}
}).catch(e=>{console.error(e);app.exit(1);});
