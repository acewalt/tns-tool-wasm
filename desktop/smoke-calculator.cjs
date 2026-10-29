// Real renderer/MediaRecorder acceptance; only the physical USB peer is simulated.
async function checkCalculator(win){
 return win.webContents.executeJavaScript(`(async()=>{
  let phase='startup';const wait=async fn=>{const end=Date.now()+20000;while(!await fn()){if(Date.now()>end)throw Error('Calculator acceptance timeout ('+phase+'): '+document.querySelector('[data-ti-status]')?.textContent);await new Promise(r=>setTimeout(r,30));}};
  await wait(()=>window.TnsCalculatorTransfer&&window.TnsNspireUSB);
  const original=window.TnsNspireUSB,entry=(path,isDir=false)=>({path,name:path.split('/').pop(),isDir,size:isDir?0:4});
  const dirs=new Map([['/',[entry('/A',true),entry('/B',true)]],['/A',[entry('/A/test.tns')]],['/B',[]]]);let gate=null,captures=0,active=0,peak=0,moves=0,writes=0;
  class Calculator{
   constructor(){this.device={productName:'Acceptance CX II'};this.connected=false;}
   static async select(){return new Calculator();}
   async connect(){this.connected=true;return dirs.get('/');}
   async close(){this.connected=false;}
   async listDir(path){if(gate)await gate;return dirs.get(path).map(f=>({...f}));}
   async storageInfo(){return {free:67108864,total:134217728,used:67108864};}
   async putFile(path,data,progress){writes++;const parent=path.slice(0,path.lastIndexOf('/'))||'/';dirs.get(parent).push(entry(path));progress(data.length,data.length);}
   async renameEntry(src,dest){moves++;const parent=src.slice(0,src.lastIndexOf('/'))||'/';dirs.set(parent,dirs.get(parent).filter(f=>f.path!==src));dirs.get(dest.slice(0,dest.lastIndexOf('/'))||'/').push(entry(dest));}
   async screenshotRle(progress,ready){active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,40));const pixels=new Uint8Array(153600);for(let p=0;p<pixels.length;p+=2){pixels[p]=captures%2?0:255;pixels[p+1]=captures%2?248:7;}captures++;const image={width:320,height:240,bpp:16,pixels};ready(image);return image;}finally{active--;}}
  }
  window.TnsNspireUSB={...original,NspireUSB:Calculator};window.TnsCalculatorTransfer.open();
  const q=s=>document.querySelector('.ti-manager-overlay '+s),row=path=>[...document.querySelectorAll('[data-calculator-path]')].find(el=>el.dataset.calculatorPath===path);
  q('[data-ti-connect]').click();await wait(()=>!q('[data-ti-disconnect]').disabled);
  if(q('[data-ti-storage-meter]').value!==67108864||q('[data-ti-storage-meter]').max!==134217728)throw Error('Storage must come from device response');
  phase='expand';let release;gate=new Promise(r=>release=r);row('/A').querySelector('button').click();await wait(()=>q('.ti-manager-dialog').getAttribute('aria-busy')==='true');
  const busy=getComputedStyle(row('/A').querySelector('button'));if(busy.backgroundColor!=='rgba(0, 0, 0, 0)'||busy.opacity!=='1')throw Error('Busy folder label became a grey skeleton');gate=null;release();await wait(()=>!q('[data-ti-capture]').disabled);
  phase='drop upload';const drop=new DataTransfer();drop.items.add(new File([new Uint8Array([1,2,3,4])],'uploaded.tns'));row('/B').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:drop}));await wait(()=>writes===1&&!q('[data-ti-capture]').disabled);if(!dirs.get('/B').some(f=>f.name==='uploaded.tns'))throw Error('Dropped TNS ignored the target folder');
  phase='move';const drag=new DataTransfer();row('/A/test.tns').dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:drag}));row('/B').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:drag}));await wait(()=>moves===1&&!q('[data-ti-capture]').disabled);if(dirs.get('/A').length||!dirs.get('/B').some(f=>f.name==='test.tns'))throw Error('Internal move failed');
  // A collision must fail before the native move command, with both files intact.
  dirs.get('/A').push(entry('/A/test.tns'));row('/A').querySelector('button').click();row('/A').querySelector('button').click();q('[data-ti-refresh]').click();await wait(()=>!q('[data-ti-capture]').disabled);
  phase='collision';const collision=new DataTransfer();row('/A/test.tns').dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:collision}));row('/B').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:collision}));await wait(()=>!q('[data-ti-capture]').disabled);if(moves!==1||dirs.get('/A').length!==1)throw Error('Move collision modified the source');
  phase='record';q('[data-ti-record]').click();await wait(()=>captures>=3);q('[data-ti-record-stop]').click();await wait(()=>q('[data-ti-record-status] a'));
  const a=q('[data-ti-record-status] a'),video=await(await fetch(a.href)).arrayBuffer(),signature=[...new Uint8Array(video,0,4)];if(signature.join(',')!=='26,69,223,163'||video.byteLength<100)throw Error('Recording is not a real WebM file');if(peak!==1)throw Error('Concurrent screenshot requests');
  const player=document.createElement('video');player.muted=true;player.src=a.href;await new Promise((resolve,reject)=>{player.onloadeddata=resolve;player.onerror=()=>reject(Error('WebM did not decode'));player.load();});if(player.videoWidth!==320||player.videoHeight!==240)throw Error('Wrong recorded resolution');player.removeAttribute('src');player.load();
  q('[data-ti-capture]').click();await wait(()=>!q('[data-ti-capture]').disabled);if(captures<4)throw Error('USB did not resume after recording');
  await window.TnsCalculatorTransfer.close();window.TnsNspireUSB=original;
  return{ok:true,busyLabels:true,deviceStorage:true,dropUpload:true,nativeMove:true,collisionSafe:true,webmBytes:video.byteLength,recordedScreenshots:captures,serialRequests:peak};
 })()`);
}
module.exports={checkCalculator};
