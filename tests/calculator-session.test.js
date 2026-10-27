import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(){
    this.children=[];this.dataset={};this.style={};this.disabled=false;this.hidden=false;
    this.classList={toggle(){},add(){}};
  }
  setAttribute(){}
  addEventListener(){}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  getContext(){return {
    createImageData:(w,h)=>({data:new Uint8Array(w*h*4)}),
    putImageData:bitmap=>{this.bitmap=bitmap;}
  };}
}
const nodes=new Map(),root=new Element();
root.querySelector=key=>{
  if(!nodes.has(key))nodes.set(key,new Element());
  return nodes.get(key);
};
root.querySelectorAll=()=>[];
const document={documentElement:{lang:'es'},addEventListener(){},createElement:()=>new Element()};
const window={};
const source=fs.readFileSync(new URL('../ti-calculator-transfer.js',import.meta.url),'utf8')
  .replace('window.TnsCalculatorTransfer=Object.freeze({open,close});',
    'window.TnsCalculatorTransfer=Object.freeze({open,close,screenshot,connect,disconnect,controls});window.__session=state;');
vm.runInNewContext(source,{window,document,console,Date,setTimeout,clearTimeout,Uint8Array});
const manager=window.TnsCalculatorTransfer,state=window.__session;
state.root=root;
const usbDevice={productName:'Simulated CX II'};
let closes=0,captures=0,selects=0,reopens=0;
const snapshot=()=>({width:2,height:2,bpp:4,pixels:Uint8Array.of(++captures,0x34)});
const link={device:usbDevice,connected:true,
  async screenshotRle(_progress,ready){const image=snapshot();ready(image);return image;},
  async close(){closes++;}
};
state.link=link;
await manager.screenshot();
const firstCanvas=nodes.get('[data-ti-image]').children[0];
await manager.screenshot();
assert.equal(captures,2);
assert.notEqual(nodes.get('[data-ti-image]').children[0],firstCanvas);
assert.equal(state.busy,false);
assert.equal(nodes.get('[data-ti-capture]').disabled,false);
const lastCanvas=nodes.get('[data-ti-image]').children[0];
manager.close();
assert.equal(root.hidden,true);
assert.equal(closes,0,'Hiding a healthy manager must not close the USB device');
manager.open();
assert.equal(root.hidden,false);
assert.equal(state.link,link);
assert.equal(nodes.get('[data-ti-image]').children[0],lastCanvas,'Keep the last actual bitmap on reopen');
await manager.screenshot();
assert.equal(captures,3);
const beforeFailure=nodes.get('[data-ti-image]').children[0];

let releaseClose;
link.screenshotRle=async()=>{
  link.broken=true;link.connected=false;
  throw Object.assign(new Error('silent USB'),{code:'USB_TIMEOUT'});
};
link.close=()=>new Promise(resolve=>{releaseClose=resolve;});
window.TnsNspireUSB={NspireUSB:class{
  constructor(device){assert.equal(device,usbDevice);this.device=device;reopens++;}
  static async select(){selects++;throw Error('Unexpected permission picker');}
  async connect(){this.connected=true;return [];}
}};
const pending=manager.screenshot();
await new Promise(resolve=>setTimeout(resolve,0));
assert.equal(state.busy,true);
assert.equal(nodes.get('[data-ti-connect]').disabled,true,'Wait for the old handle to finish closing');
await manager.connect();
assert.equal(reopens,0);
releaseClose();await pending;
assert.equal(state.busy,false);
assert.equal(state.link,null);
assert.equal(nodes.get('[data-ti-connect]').disabled,false);
assert.match(nodes.get('[data-ti-status]').textContent,/sesión USB.*cerrado/);
assert.doesNotMatch(nodes.get('[data-ti-status]').textContent,/Ndless/,'A screenshot timeout does not diagnose a native app');
assert.equal(nodes.get('[data-ti-image]').children[0],beforeFailure,'Failed capture retains the last valid bitmap');
await manager.connect();
assert.equal(reopens,1,'Reconnect the already authorised device without unplugging');
assert.equal(selects,0);
assert.equal(state.link.connected,true);
assert.equal(nodes.get('[data-ti-capture]').disabled,false);

let permissionResolve;
state.link=null;state.lastDevice=null;
window.TnsNspireUSB.NspireUSB.select=()=>{selects++;return new Promise(resolve=>{permissionResolve=resolve;});};
const firstConnect=manager.connect();
await manager.connect();
assert.equal(selects,1,'Ignore repeated Connect clicks while the permission picker is open');
permissionResolve({device:usbDevice,async connect(){this.connected=true;return [];}});
await firstConnect;
assert.equal(state.busy,false);
console.log('Repeated screenshots, panel reopen, serial USB recovery and device-picker lock: passed.');
