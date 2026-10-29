// Real Chromium browser acceptance; no preload and no native bridge.
const {app,BrowserWindow,session}=require('electron'),path=require('node:path'),fs=require('node:fs/promises');
const root=path.resolve(__dirname,'..');
app.whenReady().then(async()=>{
 const server=require('./server.cjs').makeServer(root,path.join(__dirname,'vendor'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest({urls:['https://tns-tool-stats.guard-mauricio-save.workers.dev/*']},(d,cb)=>cb({cancel:true}));
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,offscreen:true}});
 const report={ok:false};try{
 await win.loadURL(process.env.TNS_ROM_WEB_URL||origin);const fixtures={};for(const s of ['gb','snes','gba','nds','nes','n64'])fixtures[s]=Buffer.from(require('./rom-test-'+(s==='nes'?'cartridge':s)+'.cjs')(s==='gb'?{battery:true}:undefined)).toString('base64');
 report.result=await win.webContents.executeJavaScript(`(async()=>{
 const wait=async fn=>{const end=Date.now()+60000;while(!await fn()){if(Date.now()>end)throw Error('Browser timeout: '+document.querySelector('[data-rom-status]')?.textContent+' / '+document.querySelector('[data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,50));}};
 await wait(()=>window.TnsRomWeb&&window.TnsRomConverter&&window.NdlessLivePreview);if(window.TnsDesktop)throw Error('Test has a native bridge');const fixtures=${JSON.stringify(fixtures)},results=[];
 for(const system of ['gb','snes','gba','nds','nes','n64']){
 window.TnsRomConverter.open();const q=s=>document.querySelector('.rom-converter '+s),input=q('[data-rom-file]'),bytes=Uint8Array.from(atob(fixtures[system]),c=>c.charCodeAt(0));if(input.disabled)throw Error('Web converter disabled');const dt=new DataTransfer();dt.items.add(new File([bytes],'renamed.bin'));input.files=dt.files;input.dispatchEvent(new Event('change'));
 await wait(()=>window.TnsRomConverter.state?.preview==='running');const seen=new Set();for(let n=0;n<14;n++){seen.add(q('canvas').toDataURL());await new Promise(r=>setTimeout(r,100));}if(system!=='n64'&&seen.size<2)throw Error(system+' web preview did not animate');
 if(system==='gb'){q('canvas').focus();q('canvas').dispatchEvent(new KeyboardEvent('keydown',{code:'ControlLeft',bubbles:true}));await new Promise(r=>setTimeout(r,120));q('canvas').dispatchEvent(new KeyboardEvent('keyup',{code:'ControlLeft',bubbles:true}));q('[data-live-pause]').click();await new Promise(r=>setTimeout(r,100));const image=q('canvas').toDataURL();await new Promise(r=>setTimeout(r,120));if(image!==q('canvas').toDataURL())throw Error('Web pause failed');q('[data-live-pause]').click();}
 if(system==='gb'){const hash=window.TnsRomConverter.state.info.sha1;await wait(()=>localStorage.getItem('tns-rom-save:'+hash));const saved=localStorage.getItem('tns-rom-save:'+hash);window.TnsRomConverter.close();await new Promise(r=>setTimeout(r,400));window.TnsRomConverter.open();const next=document.querySelector('[data-rom-file]'),again=new DataTransfer();again.items.add(new File([bytes],'renamed.bin'));next.files=again.files;next.dispatchEvent(new Event('change'));await wait(()=>window.TnsRomConverter.state?.preview==='running');if(!localStorage.getItem('tns-rom-save:'+hash)||!saved.length)throw Error('Browser save lost on reopening');}
 const downloads=[],capture=e=>{const a=e.target.closest?.('a[download]');if(a){e.preventDefault();e.stopImmediatePropagation();downloads.push({name:a.download,bytes:fetch(a.href).then(r=>r.arrayBuffer())});}};document.addEventListener('click',capture,true);
 try{q('[data-rom-project]').click();q('[data-rom-build]').click();await wait(()=>downloads.length===2);const project=await JSZip.loadAsync(await downloads[0].bytes),meta=JSON.parse(await project.file('.tnsproject.json').async('string'));if(!meta.settings.romResources?.length||!project.file('web-rom.c'))throw Error('Project export missing sources');const bundle=await JSZip.loadAsync(await downloads[1].bytes),program=Object.values(bundle.files).find(f=>!f.dir&&f.name.endsWith('.tns')&&!f.name.endsWith('.rom.tns'));if((await program.async('uint8array'))[0]!==80)throw Error('Invalid PRG export');results.push({system,frames:seen.size,project:true,calculatorPackage:true});}finally{document.removeEventListener('click',capture,true);}
 window.TnsRomConverter.close();await new Promise(r=>setTimeout(r,400));
 }
 return results;})()`);
 report.ok=true;
 }catch(e){report.error=e.stack;await fs.writeFile(path.join(root,'release/rom-web-error.png'),(await win.webContents.capturePage()).toPNG());}finally{await fs.writeFile(path.join(root,'release/rom-web-browser.json'),JSON.stringify(report,null,2));win.destroy();server.close();app.exit(report.ok?0:1);}
}).catch(e=>{console.error(e);app.exit(1);});
