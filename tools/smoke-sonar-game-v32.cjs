const {app,BrowserWindow,session}=require('electron');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),desktop=path.resolve(root,'../portable-0.1.27/desktop');
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=path.join(root,'release/qa/sonar-game-v32.json');
const source=fs.readFileSync(process.env.TNS_SONAR_SOURCE||path.join(root,'release/qa/sonar-import-v32.tib'),'utf8');
let win,server;const report={ok:false,blocked:[]};app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});
 fs.writeFileSync(path.join(root,'release/qa/sonar-game-v32.html'),'<!doctype html><html lang="en"><link rel="stylesheet" href="/web/styles.css"><link rel="stylesheet" href="/web/preview-window.css"><link rel="stylesheet" href="/web/prgm-preview.css"><script defer src="/web/document-preview-navigation.js"></script><script defer src="/web/preview-window.js"></script><script type="module" src="/web/prgm-preview.js"></script><body></body></html>');
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,done)=>{const blocked=!details.url.startsWith(origin);if(blocked)report.blocked.push(details.url);done({cancel:blocked});});
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin+'release/qa/sonar-game-v32.html');
 report.game=await win.webContents.executeJavaScript(`(${game.toString()})(${JSON.stringify(source)})`);
 await new Promise(r=>setTimeout(r,100));fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
 report.ok=report.game.ok&&!report.blocked.length;fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(report.ok?0:1);
}).catch(async error=>{report.error=error.stack;fs.writeFileSync(reportPath,JSON.stringify(report,null,2));if(win&&!win.isDestroyed()){fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());win.destroy();}console.error(error);server?.close();app.exit(1);});
async function game(source){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),assert=(ok,message)=>{if(!ok)throw Error(message);};
 const wait=async(fn,label,time=7000)=>{const end=Date.now()+time;while(!fn()){const s=window.TnsPrgmPreview?.getSnapshot();if(s?.error)throw Error(label+': '+JSON.stringify(s.error));if(Date.now()>end)throw Error('Timeout '+label);await pause(15);}};
 await wait(()=>window.TnsPrgmPreview,'module');const api=window.TnsPrgmPreview;
 const key=value=>(document.activeElement?.closest?.('.prgm-preview-modal')?document.activeElement:document.querySelector('.prgm-preview-modal')).dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
 api.open({source,name:'sonar',documentName:'Sonar'});
 await wait(()=>api.getSnapshot().keyPolling&&api.getSnapshot().graphics.active,'sonar initialization');
 const first=api.getSnapshot(),angle=first.variables.balayage;
 await wait(()=>api.getSnapshot().variables.balayage!==angle,'moving radar sweep');
 const pixels=()=>{const c=document.querySelector('[data-graphics-canvas]');return c.getContext('2d').getImageData(0,0,318,212).data;};
 let green=0,black=0;const initialPixels=pixels();for(let i=0;i<initialPixels.length;i+=4){if(initialPixels[i]<30&&initialPixels[i+1]>100&&initialPixels[i+2]<30)green++;if(initialPixels[i]+initialPixels[i+1]+initialPixels[i+2]<10)black++;}
 assert(green>250&&black>10000,'Radar pixels are missing');
 key('t');await wait(()=>api.getSnapshot().keyWaiting,'blocking angle input');
 assert(!document.querySelector('[data-keyboard]').hidden,'Virtual keys hidden');
 document.querySelector('[data-program-key="9"]').click();await pause(30);document.querySelector('[data-program-key="0"]').click();await pause(30);
 document.querySelector('[data-program-key="0"]').focus();key('Enter');await wait(()=>Array.isArray(api.getSnapshot().variables.torpille)&&typeof api.getSnapshot().variables.angle_tir==='number','torpedo fire');
 const fired=api.getSnapshot();assert(fired.variables.status===1,'Torpedo status missing');assert(Math.abs(fired.variables.angle_tir-Math.PI/2)<1e-10,'Angle is not 90 degrees');
 await wait(()=>{const v=api.getSnapshot().variables;return v.torpillex!==v.xcentre||v.torpilley!==v.ycentre;},'moving torpedo');
 const moving=api.getSnapshot();key('Escape');await wait(()=>api.getSnapshot().status==='done','Esc ends Sonar');
 assert(document.querySelector('.prgm-preview-modal'),'Esc closed the preview instead of the game');
 const ended=api.getSnapshot();assert(Object.keys(ended.variables).length===0,'Final DelVar cleanup was skipped');
 document.querySelector('[data-enter]').click();assert(document.querySelector('[data-graphics]').hidden,'Enter did not return to Calculator');
 api.close();api.open({source:'Prgm\nDrawLine 0,0,10,10\nkey:=getKey(1)\nDrawText 1,20,key\nEndPrgm',name:'blocking'});
 await wait(()=>api.getSnapshot().keyWaiting,'separate blocking read');document.querySelector('[data-program-key="5"]').click();await wait(()=>api.getSnapshot().status==='done','blocking read resumes');
 assert(api.getSnapshot().graphics.commands.at(-1).text==='5','Virtual key did not reach getKey(1)');
 api.close();api.open({source:'Prgm\nSetColor 20,30,40\nFillRect 0,0,318,212\nFor n,1,2300\nSetColor 255,0,0\nFillRect 1,1,5,5\nEndFor\nEndPrgm',name:'checkpoint'});
 await wait(()=>api.getSnapshot().status==='done','raster checkpoint');const compact=api.getSnapshot();assert(compact.graphics.operationCount===2301,'Stress loop incomplete');assert(compact.graphics.commands.length<=1000&&compact.graphics.raster?.length===318*212*4,'Checkpoint not bounded');
 const p=pixels(),pixel=(x,y)=>[...p.slice((y*318+x)*4,(y*318+x)*4+3)];assert(JSON.stringify(pixel(2,2))==='[255,0,0]'&&JSON.stringify(pixel(300,200))==='[20,30,40]','Checkpoint lost prior overdraw pixels');
 api.close();api.open({source,name:'sonar',documentName:'Sonar'});await wait(()=>api.getSnapshot().keyPolling,'final radar');await pause(100);
 return {ok:true,greenPixels:green,blackPixels:black,angleAdvanced:true,keyboardT:true,enteredDegrees:90,fired:true,torpedoPosition:[moving.variables.torpillex,moving.variables.torpilley],escapeFinished:true,cleanup:true,blockingKey:true,checkpointOperations:compact.graphics.operationCount,retainedCommands:compact.graphics.commands.length,checkpointPixels:true};
}
