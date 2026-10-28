const fs=require('node:fs/promises');
async function check(win,report){
 const fixtures=Object.fromEntries(['snes','gba','nds','n64'].map(s=>[s,require('./rom-test-'+s+'.cjs')().toString('base64')]));
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const fixtures=${JSON.stringify(fixtures)},results=[];
  const wait=async fn=>{const end=Date.now()+45000;while(!await fn()){if(Date.now()>end)throw Error('ROM core UI timed out: '+document.querySelector('[data-rom-status]')?.textContent+' / '+document.querySelector('[data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,25));}};
  for(const system of Object.keys(fixtures)){
   document.querySelector('#xml-rom-converter').click();const q=s=>document.querySelector('.rom-converter '+s),bytes=Uint8Array.from(atob(fixtures[system]),c=>c.charCodeAt(0)),dt=new DataTransfer();dt.items.add(new File([bytes],'renamed.bin'));q('[data-rom-file]').files=dt.files;q('[data-rom-file]').dispatchEvent(new Event('change'));
   await wait(()=>window.TnsRomConverter.state?.preview==='running'&&/frames/.test(q('[data-preview-note]').textContent));if(window.TnsRomConverter.state.info.id!==system)throw Error('Wrong header detection: '+system);
   const images=new Set();for(let i=0;i<12;i++){images.add(q('canvas').toDataURL());await new Promise(r=>setTimeout(r,60));}if(system!=='n64'&&images.size<3)throw Error(system+' animation is stale');
   q('[data-live-pause]').click();await new Promise(r=>setTimeout(r,80));const paused=q('canvas').toDataURL();await new Promise(r=>setTimeout(r,150));if(q('canvas').toDataURL()!==paused)throw Error(system+' pause failed');q('[data-live-pause]').click();
   if(system==='nds'){const c=q('canvas'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:r.left+r.width/2,clientY:r.top+r.height*0.8,buttons:1,bubbles:true}));c.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:r.left+r.width/2,clientY:r.top+r.height*0.8,buttons:0,bubbles:true}));}
   const hash=window.TnsRomConverter.state.info.sha1;q('[data-live-stop]').click();await wait(()=>window.TnsRomConverter.state.preview==='stopped');q('[data-live-restart]').click();await wait(()=>window.TnsRomConverter.state.preview==='running');window.TnsRomConverter.close();
   results.push({system,detected:true,animated:system!=='n64',distinctFrames:images.size,pause:true,restart:true,closed:true});
  }
  const large=new Uint8Array(8*1024*1024);large.set(Uint8Array.from(atob(fixtures.nds),c=>c.charCodeAt(0)));const converted=await window.TnsDesktop.convertRom({bytes:large,name:'large-original.nds'}),source=await JSZip.loadAsync(converted.zip);source.file('include/retained.inl','// original test include');source.file('nested/COPYING','Original test license');source.file('nested/diagnostic.asm','; original test assembly');const file=new File([await source.generateAsync({type:'uint8array'})],'external-project.zip');await window.NdlessProjectWorkspace.openProjectZip(file);window.NdlessLivePreview.stop();
  const project=window.NdlessProjectWorkspace.getProject(),resource=project.settings.romResources[0];if(!project.files[resource.chunks[0]]||!project.files['include/retained.inl']||!project.files['nested/COPYING']||!project.files['nested/diagnostic.asm'])throw Error('Project import dropped resources or supporting sources');window.NdlessProjectWorkspace.closeProject();
  return{ok:true,cases:results,companionProjectOpen:true,preservedSourceExtensions:true};
 })()`);
 await fs.writeFile(report+'.rom-cores.json',JSON.stringify(result,null,2));return result;
}
module.exports={check};
