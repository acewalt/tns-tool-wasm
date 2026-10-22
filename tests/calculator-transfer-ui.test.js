import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load = relative => fs.readFileSync(new URL(relative, import.meta.url), "utf8");
const controller = load("../ti-nspire-webusb.js");
const ui = load("../ti-calculator-transfer.js");
const markup = load("../index.html");
const style = load("../ti-calculator-transfer.css");
const lang = load("../app.js");
const ndless = load("../ndless-project-workspace.js");

assert.match(markup, /ti-nspire-webusb\.js/);
assert.match(markup, /ti-calculator-transfer\.js/);
assert.doesNotMatch(ui, /webtilp|iframe|window\.open\(/i);
assert.match(ui, /TnsNspireUSB\.NspireUSB\.select/);
assert.match(ui, /data-ti-rows/);
assert.match(ui, /data-ti-capture/);
assert.match(style, /\.ti-manager-dialog/);
assert.match(lang, /transferToCalculator: "Transferir a calculadora"/);
assert.match(ndless, /ndless-project-off-badge/);
assert.doesNotMatch(ndless, /\.tool-menu:first-of-type/);
new vm.Script(ui);

const win = {};
const sandbox = vm.createContext({
  window: win,
  navigator: {},
  Uint8Array, DataView, ArrayBuffer, TextEncoder, TextDecoder, Error,
  console, setTimeout, clearTimeout
});
vm.runInContext(controller, sandbox);
const protocol = win.TnsNspireUSB;
assert.ok(protocol);

assert.equal(protocol.checksum(Uint8Array.of(0, 255)), 0xff00);
assert.equal(protocol.checksum(Uint8Array.of(5, 0, 0)), 0x57ad);
assert.equal(protocol.checksum(Uint8Array.of(0x20,0,0,0,0,0,0,0,5,1,0)), 0xa095);
const large = protocol.packet(new Uint8Array(400).fill(73));
assert.equal(protocol.parsePacket(large).length, 400);
assert.equal(protocol.parsePacket(large).data[0], 73);
assert.deepEqual(Array.from(protocol.decodeRle(Uint8Array.of(3,0xab,254,0x12,0x34,0x56),7)),
  [171,171,171,171,18,52,86]);
assert.throws(() => protocol.pathName("/Examples/../secret"), /Ruta/);
assert.throws(() => protocol.childPath("/", "../secret.tns"), /Nombre/);

const concat = (...arrays) => {
  const bytes=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));
  let at=0;for(const a of arrays){bytes.set(a,at);at+=a.length;}return bytes;
};
const be32 = v => Uint8Array.of(v>>>24,(v>>>16)&255,(v>>>8)&255,v&255);
const dirRow = name => {
  const encoded=new TextEncoder().encode(name);
  const pad=encoded.length<8?new Uint8Array(9-encoded.length):Uint8Array.of(0);
  return concat(Uint8Array.of(0x10,0,0),encoded,pad,be32(0),be32(0),Uint8Array.of(1,0));
};
class FakeUSB {
  vendorId=0x0451;productId=0xe022;opened=false;configuration=null;
  answers=[];currentSid=0x8000;enumAt=0;uploaded=[];expected=0;
  file=Uint8Array.of(1,2,3,4);screenshots=0;
  async open(){this.opened=true;}
  async close(){this.opened=false;}
  async claimInterface(){}
  async releaseInterface(){}
  async selectConfiguration(){
    this.configuration={interfaces:[{interfaceNumber:0,alternates:[{
      alternateSetting:0,endpoints:[
        {type:"bulk",direction:"in",endpointNumber:1},
        {type:"bulk",direction:"out",endpointNumber:1,packetSize:64}]
    }]}]};
  }
  respond(data, service=0x4060){
    this.answers.push(protocol.packet(data,{srcSid:service,dstSid:this.currentSid,seq:0}));
  }
  async transferIn(){
    const bytes=this.answers.shift();
    if(!bytes)throw Error("Unexpected USB read");
    return {status:"ok",data:new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)};
  }
  async transferOut(_ep,bytes){
    if(!bytes.length)return {status:"ok"};
    const p=protocol.parsePacket(bytes),d=p.data;
    if(d[0]===0x64||p.srcSid===0x40de)return {status:"ok"};
    this.currentSid=p.srcSid;
    if(d[0]===13){this.enumAt=0;this.respond(Uint8Array.of(255,0));}
    else if(d[0]===14)this.respond(this.enumAt++===0?dirRow("Examples"):Uint8Array.of(255,17));
    else if([15,10,9,11].includes(d[0]))this.respond(Uint8Array.of(255,0));
    else if(d[0]===3 && d[1]===1){
      this.expected=new DataView(d.buffer,d.byteOffset+d.length-4,4).getUint32(0);
      this.uploaded=[];this.respond(Uint8Array.of(4));
    }
    else if(d[0]===5){
      this.uploaded.push(...d.subarray(1));
      if(this.uploaded.length===this.expected)this.respond(Uint8Array.of(255,0));
    }
    else if(d[0]===7 && d[1]===1)
      this.respond(concat(Uint8Array.of(3,1),new Uint8Array(9),be32(this.file.length)));
    else if(d[0]===4)this.respond(concat(Uint8Array.of(5),this.file));
    else if(d[0]===0 && p.dstSid===0x4024){
      this.screenshots++;
      this.respond(concat(Uint8Array.of(1),be32(3),Uint8Array.of(0,0,0,0,0,2,0,2,4,0)),0x4024);
      this.respond(Uint8Array.of(2,255,0x12,0x34),0x4024);
    }
    return {status:"ok"};
  }
}
const fake=new FakeUSB();
const device=new protocol.NspireUSB(fake);
const listing=await device.connect();
assert.equal(device.connected,true);
assert.equal(listing.length,1);
assert.equal(listing[0].name,"Examples");
assert.equal(listing[0].isDir,true);
await device.makeDir("/Examples/Test");
await device.putFile("/Examples/test.tns",Uint8Array.of(7,8,9));
assert.deepEqual(fake.uploaded,[7,8,9]);
assert.deepEqual(Array.from(await device.getFile("/Examples/download.tns")),[1,2,3,4]);
await device.deleteEntry("/Examples/test.tns",false);
const image=await device.screenshotRle();
assert.deepEqual([image.width,image.height,image.bpp],[2,2,4]);
assert.deepEqual(Array.from(image.pixels),[0x12,0x34]);
await device.close();
assert.equal(device.connected,false);
assert.equal(fake.opened,false);
console.log("Native Nspire WebUSB packets, handshake, filesystem, transfer and RLE screenshot tests passed.");
