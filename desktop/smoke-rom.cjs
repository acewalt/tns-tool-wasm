const fs=require('node:fs/promises');
async function checkRom(win,report){
 const fixture=Buffer.from(require('./rom-test-cartridge.cjs')()).toString('base64');
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const wait=async(fn)=>{const end=Date.now()+30000;while(!fn()){if(Date.now()>end)throw Error('ROM UI timed out: '+document.querySelector('[data-rom-status]')?.textContent+' / '+document.querySelector('.rom-converter [data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,25));}};
  const button=document.querySelector('#xml-rom-converter');if(!button)throw Error('ROM Converter menu entry missing');button.click();
  const q=s=>document.querySelector('.rom-converter '+s),input=q('[data-rom-file]');
  const select=(bytes,name)=>{const dt=new DataTransfer();dt.items.add(new File([bytes],name));input.files=dt.files;input.dispatchEvent(new Event('change'));};
  select(new Uint8Array([1,2,3]),'invalid.n64');await wait(()=>!input.disabled);if(window.TnsRomConverter.state.ready)throw Error('Invalid ROM accepted');
  select(Uint8Array.from(atob(${JSON.stringify(fixture)}),c=>c.charCodeAt(0)),'original-test-cartridge.nes');
  await wait(()=>window.TnsRomConverter.state?.preview==='running');
  const hashes=new Set();for(let n=0;n<8;n++){hashes.add(q('canvas').toDataURL());await new Promise(r=>setTimeout(r,80));}if(hashes.size<2)throw Error('Converted ROM is not animating');
  const blobs=new Map(),downloads=[],create=URL.createObjectURL;URL.createObjectURL=function(blob){const url=create.call(this,blob);blobs.set(url,blob);return url;};
  const capture=e=>{const a=e.target.closest?.('a[download]');if(a&&blobs.has(a.href)){e.preventDefault();e.stopImmediatePropagation();downloads.push({name:a.download,blob:blobs.get(a.href)});}};document.addEventListener('click',capture,true);
  try{
   q('[data-rom-project]').click();await wait(()=>downloads.length===1);
   const zip=await window.JSZip.loadAsync(await downloads[0].blob.arrayBuffer()),meta=JSON.parse(await zip.file('.tnsproject.json').async('string'));if(meta.settings.build.sources.length!==5||!zip.file('embedded_rom.h'))throw Error('Exported project is incomplete');
   q('[data-rom-build]').click();await wait(()=>downloads.length===2);const tns=new Uint8Array(await downloads[1].blob.arrayBuffer());if(tns.length<1000||String.fromCharCode(...tns.slice(0,3))!=='PRG')throw Error('TNS export is not an official PRG executable');
   q('[data-rom-open]').click();await wait(()=>window.TnsRomConverter.state===null&&window.NdlessLivePreview.state?.stage==='running');
   const project=window.NdlessProjectWorkspace.getProject();if(project.settings.romConversion.mapper!==0||project.settings.build.sources.length!==5)throw Error('Converted source project lost metadata on opening');window.NdlessProjectWorkspace.closeProject();
   button.click();q('[data-rom-close]').click();if(window.TnsRomConverter.state!==null)throw Error('ROM dialog did not close');
   return{ok:true,visibleMenu:true,invalidRejected:true,selectedRom:true,animated:true,projectExport:true,projectOpen:true,tnsExport:true,closed:true,embedded:true,tnsBytes:tns.length};
  }finally{document.removeEventListener('click',capture,true);URL.createObjectURL=create;window.TnsRomConverter.close();}
 })()`);
 await fs.writeFile(report+'.rom.json',JSON.stringify(result,null,2));return result;
}
async function checkBrowser(win){return win.webContents.executeJavaScript(`(()=>{const b=document.querySelector('#xml-rom-converter');if(!b)throw Error('Browser ROM menu missing');b.click();const input=document.querySelector('[data-rom-file]');if(input.disabled||!window.TnsRomWeb)throw Error('Browser ROM converter disabled');window.TnsRomConverter.close();return{ok:true,desktopRequired:false};})()`);}
async function checkGb(win,report){
 const fixture=Buffer.from(require('./rom-test-gb.cjs')({battery:true})).toString('base64');
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const wait=async fn=>{const end=Date.now()+30000;while(!await fn()){if(Date.now()>end)throw Error('GB ROM UI timed out: '+document.querySelector('[data-rom-status]')?.textContent+' / '+document.querySelector('.rom-converter [data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,25));}};
  const bytes=Uint8Array.from(atob(${JSON.stringify(fixture)}),c=>c.charCodeAt(0)),select=()=>{const dt=new DataTransfer();dt.items.add(new File([bytes],'renamed-cartridge.bin'));const input=document.querySelector('[data-rom-file]');input.files=dt.files;input.dispatchEvent(new Event('change'));};
  document.querySelector('#xml-rom-converter').click();select();
  const canvas=()=>document.querySelector('.rom-converter canvas'),colors=()=>{const p=canvas().getContext('2d').getImageData(0,0,320,240).data,s=new Set();for(let i=0;i<p.length;i+=4)s.add(p[i]+','+p[i+1]+','+p[i+2]);return s;};
  await wait(()=>window.TnsRomConverter.state?.preview==='running'&&colors().size>1);
  const info=window.TnsRomConverter.state.info;if(info.system!=='GBC')throw Error('Header detection relied on extension');
  const distinct=new Set();for(let n=0;n<12;n++){distinct.add(canvas().toDataURL());await new Promise(r=>setTimeout(r,50));}if(distinct.size<4)throw Error('Direct GB preview is not animating');
  const before=colors();canvas().focus();canvas().dispatchEvent(new KeyboardEvent('keydown',{code:'ControlLeft',bubbles:true}));await wait(()=>[...colors()].some(c=>!before.has(c)));canvas().dispatchEvent(new KeyboardEvent('keyup',{code:'ControlLeft',bubbles:true}));
  document.querySelector('.rom-converter [data-live-pause]').click();await new Promise(r=>setTimeout(r,70));const image=canvas().toDataURL();await new Promise(r=>setTimeout(r,150));if(canvas().toDataURL()!==image)throw Error('GB pause kept animating');document.querySelector('.rom-converter [data-live-pause]').click();
  await wait(async()=>{const save=await window.TnsDesktop.loadRomRam(info.sha1);return save?.some(n=>n!==0);});
  let tnsPromise=null;const capture=e=>{const a=e.target.closest?.('a[download]');if(a){e.preventDefault();e.stopImmediatePropagation();tnsPromise=fetch(a.href).then(r=>r.arrayBuffer());}};document.addEventListener('click',capture,true);
  let tns;try{document.querySelector('[data-rom-build]').click();await wait(()=>tnsPromise!==null);tns=new Uint8Array(await tnsPromise);if(tns.length<50000||String.fromCharCode(...tns.slice(0,3))!=='PRG')throw Error('GB native TNS export failed');}finally{document.removeEventListener('click',capture,true);}
  window.TnsRomConverter.close();await new Promise(r=>setTimeout(r,400));document.querySelector('#xml-rom-converter').click();select();await wait(()=>window.TnsRomConverter.state?.preview==='running'&&colors().size>1);
  const persisted=await window.TnsDesktop.loadRomRam(info.sha1);if(!persisted?.length)throw Error('GB SRAM did not persist');
  window.TnsRomConverter.close();return{ok:true,headerDetection:true,animated:true,distinctFrames:distinct.size,controller:true,pause:true,persistedRam:true,tnsExport:true,tnsBytes:tns.length,closed:true};
 })()`);await fs.writeFile(report+'.gb.json',JSON.stringify(result,null,2));return result;
}
module.exports={checkRom,checkBrowser,checkGb};
