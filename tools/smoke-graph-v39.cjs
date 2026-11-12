/* Local graph interaction checks. Real user XML is read only from the ignored
   release/qa directory; no provided document is bundled with this tool. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const qa=path.join(root,'release/qa/widgets-v39'),reportPath=path.join(qa,'graph-browser.json');
const cases=[['case1-Problem2-graph2','case1-Problem2'],['case2-Problem1-graph2','case2-Problem1'],['case3-Problem1-graph1','case3-Problem1']].map(([file,scope])=>({file,xml:fs.readFileSync(path.join(qa,file+'.xml'),'utf8'),variables:JSON.parse(fs.readFileSync(path.join(qa,scope+'.graph-vars.json'),'utf8'))}));
fs.writeFileSync(path.join(qa,'graph-test.html'),'<html lang="es"><head><link rel="stylesheet" href="../../../web/graph-preview.css"><script src="../../../web/graph-preview.js"></script><script type="module">import "../../../src/prgm/math-api.js";window.graphTestReady=true;</script></head><body style="background:#edf0f4"><div id="test" style="width:640px;height:428px"></div></body></html>');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-graph-v39-')));app.commandLine.appendSwitch('disable-gpu');
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 win=new BrowserWindow({show:false,width:900,height:700,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin+'release/qa/widgets-v39/graph-test.html');
 const results=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(cases)})`);
 fs.writeFileSync(reportPath,JSON.stringify(results,null,2));fs.writeFileSync(path.join(qa,'graph-browser.png'),(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(results));win.destroy();server.close();app.exit(0);
}).catch(error=>{fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error)},null,2));console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(cases){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(condition,message)=>{if(!condition)throw Error(message);};
 for(let i=0;i<100&&!window.graphTestReady;i++)await pause(30);must(window.graphTestReady,'Math runtime did not load');
 const results=[],host=document.querySelector('#test');
 for(const source of cases){
  const mathSession=window.TnsTiBasicMath.createSession(),updates=[];
  const view=window.TnsGraphPreview.mount(host,{file:source.file,raw_xml:source.xml},{mathSession,storedVariables:source.variables,onVariablesChange:values=>updates.push({...values}),controls:false});
  await pause(30);must(!view.root.dataset.error,'Graph error: '+view.root.dataset.error);
  const canvas=view.canvas,rect=canvas.getBoundingClientRect(),before=view.getState().viewport;
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let marked=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<240||pixels[i+1]<240||pixels[i+2]<240)marked++;
  must(marked>300,'Native graph is blank');
  canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-200,clientX:rect.left+rect.width*.4,clientY:rect.top+rect.height*.6,cancelable:true,bubbles:true}));await pause(30);
  const zoomed=view.getState().viewport;must(zoomed.xmax-zoomed.xmin<before.xmax-before.xmin,'Wheel did not zoom');
  canvas.setPointerCapture=()=>{};
  // Choose a corner away from graph points so this gesture pans the window.
  canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:rect.left+12,clientY:rect.top+12,pointerId:1,bubbles:true,cancelable:true}));
  canvas.dispatchEvent(new PointerEvent('pointermove',{button:0,clientX:rect.left+52,clientY:rect.top+32,pointerId:1,bubbles:true}));canvas.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));await pause(30);
  must(view.getState().viewport.xmin!==zoomed.xmin,'Dragging did not pan');
  canvas.dispatchEvent(new MouseEvent('contextmenu',{clientX:rect.left+150,clientY:rect.top+100,bubbles:true,cancelable:true}));
  must(!view.root.querySelector('.ti-graph-context').hidden,'Right-click menu is hidden');
  view.reset();let animation=false;
  if(view.getState().animationAvailable){const initial=view.getState().objects.find(object=>object.type==='point'&&object.children.pton_c)?.children.pton_c.t;view.toggleAnimation();await pause(140);view.toggleAnimation();const after=view.getState().objects.find(object=>object.type==='point'&&object.children.pton_c)?.children.pton_c.t;animation=initial!==after;must(animation,'Constrained point animation did not advance');must(updates.length>0,'Animation did not publish dependent variables');}
  const state=view.getState();results.push({file:source.file,ok:true,curves:state.curves.length,markedPixels:marked,animation,sharedUpdates:updates.length,viewport:state.viewport,error:view.root.dataset.error||''});
  if(source!==cases.at(-1))view.dispose();
 }
 return{ok:true,results};
}
