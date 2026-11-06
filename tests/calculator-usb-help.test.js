import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window={};
vm.runInNewContext(fs.readFileSync(new URL('../web/ti-nspire-webusb.js',import.meta.url),'utf8'),{window,TextEncoder,TextDecoder,Uint8Array,DataView,setTimeout,clearTimeout,console});
let closed=0;
const device={vendorId:0x0451,productId:0xe022,productName:'TI-Nspire CX II',opened:false,
  configuration:{interfaces:[{interfaceNumber:0,alternates:[{alternateSetting:0,endpoints:[{type:'bulk',direction:'in',endpointNumber:1},{type:'bulk',direction:'out',endpointNumber:1}]}]}]},
  async open(){this.opened=true;},async close(){this.opened=false;closed++;},
  async claimInterface(){throw new Error("Failed to execute 'claimInterface' on 'USBDevice': Unable to claim interface.");}
};
const link=new window.TnsNspireUSB.NspireUSB(device);
await assert.rejects(link.connect(),error=>error.code==='USB_INTERFACE_CLAIM'&&error.usbPhase==='claimInterface'&&error.cause.message.includes('Unable to claim'));
assert.equal(closed,1,'Failed claims release the USB handle before another attempt');
assert.equal(link.connected,false);

class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.style={};this.hidden=true;this.classList={toggle(){},add(){}};}
  setAttribute(){} addEventListener(){} append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;}
}
const nodes=new Map(),root=new Element();root.querySelector=key=>{if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);};root.querySelectorAll=()=>[];
const document={documentElement:{lang:'en'},addEventListener(){},createElement:tag=>new Element(tag)};
const managerSource=fs.readFileSync(new URL('../web/ti-calculator-transfer.js',import.meta.url),'utf8').replace('window.TnsCalculatorTransfer=Object.freeze({open,close});','window.TnsCalculatorTransfer=Object.freeze({open,close,connect});window.__usbHelpState=state;');
window.TnsNspireUSB.NspireUSB.select=async()=>({device,connected:false,async connect(){const error=new Error('Unable to claim interface');error.code='USB_INTERFACE_CLAIM';throw error;}});
vm.runInNewContext(managerSource,{window,document,console,Date,setTimeout,clearTimeout,Uint8Array});
window.__usbHelpState.root=root;
await window.TnsCalculatorTransfer.connect();
const help=nodes.get('[data-ti-usb-help]'),all=node=>[node,...node.children.flatMap(all)];
assert.equal(help.hidden,false,'A failed interface claim opens actionable help');
assert(all(help).some(n=>n.textContent?.includes('0451:e022')));
assert(all(help).some(n=>n.href==='https://zadig.akeo.ie/'&&n.target==='_blank'&&n.rel==='noopener noreferrer'));
assert(all(help).some(n=>n.textContent?.includes('Close TI-Nspire')));
assert(all(help).some(n=>n.textContent?.includes('WinUSB')));
assert.equal(window.__usbHelpState.busy,false,'Retry stays available');
assert(all(help).some(n=>n.tag==='button'&&n.textContent==='Retry connection'&&typeof n.onclick==='function'));
console.log('USB interface errors preserve their cause, close the handle and show targeted recovery help.');
