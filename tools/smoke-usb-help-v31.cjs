const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),desktop=path.resolve(root,'../portable-0.1.27/desktop');
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const output=path.join(root,'release/qa/usb-help-v31.json');let server,win;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1280,height:860,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);
 const data=await win.webContents.executeJavaScript(`(${run.toString()})()`);
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.png',(await win.webContents.capturePage()).toPNG());data.retry=await win.webContents.executeJavaScript('window.__retryUsbHelp()');data.ok&&=data.retry.ok;fs.writeFileSync(output,JSON.stringify(data,null,2));
 console.log(JSON.stringify(data));win.destroy();server.close();app.exit(data.ok?0:1);
}).catch(error=>{console.error(error);win?.destroy();server?.close();app.exit(1);});
async function run(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async fn=>{const end=Date.now()+30000;while(!fn()){if(Date.now()>end)throw Error('USB help timeout');await pause(30);}};
 await wait(()=>window.TnsCalculatorTransfer&&window.TnsNspireUSB&&!document.querySelector('#startup-loader'));
 applyLanguage('en');let attempts=0;
 const device={productName:'TI-Nspire CX II test',vendorId:0x0451,productId:0xe022};
 const Constructor=window.TnsNspireUSB.NspireUSB;
 Constructor.select=async()=>({device,connected:false,async connect(){attempts++;const error=new Error('Unable to claim interface');error.code='USB_INTERFACE_CLAIM';throw error;}});
 window.TnsCalculatorTransfer.open();document.querySelector('[data-ti-connect]').click();
 await wait(()=>document.querySelector('[data-ti-usb-help]')?.hidden===false&&!document.querySelector('[data-ti-connect]').disabled);
 const panel=document.querySelector('[data-ti-usb-help]');panel.querySelector('details').open=true;await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await pause(200);
 const box=panel.getBoundingClientRect();
 must(box.width>300&&box.left>=0&&box.right<=innerWidth,'Help exceeds horizontal viewport');must(box.top>=0&&box.bottom<=innerHeight,'Help exceeds vertical viewport');
 must(panel.textContent.includes('0451:e022'),'Device identifier missing');must(panel.querySelector('a').href==='https://zadig.akeo.ie/','Unexpected download host');must(panel.querySelector('ol').children.length===5,'Driver steps missing');
 window.__retryUsbHelp=async()=>{Constructor.prototype.connect=async function(){attempts++;this.connected=true;return [];};[...panel.querySelectorAll('button')].find(node=>node.textContent==='Retry connection').click();await wait(()=>panel.hidden);must(attempts===2,'Retry failed');return {ok:true,attempts,helpHidden:panel.hidden};};
 return {ok:true,simulatedUSB:true,attempts,deviceId:true,panel:{width:box.width,height:box.height}};
}
