import assert from "node:assert/strict";
globalThis.window=globalThis;
await import("../tns-container-registry.js");
await import("../nzp-content-format.js");

function u16(v,o,n){new DataView(v.buffer).setUint16(o,n,true)}
function i16(v,o,n){new DataView(v.buffer).setInt16(o,n,true)}
function u32(v,o,n){new DataView(v.buffer).setUint32(o,n,true)}
function makeNzp(){
  const strings=new TextEncoder().encode("AliceHello");
  const size=22+28+3*24+strings.length+8;
  const b=new Uint8Array(size);b.set([0x4e,0x5a,0x50,0x4b],0);u16(b,4,0);u32(b,6,1);u32(b,10,0);u32(b,14,3);u32(b,18,strings.length);
  let o=22;u16(b,o,1);u16(b,o+2,2);u16(b,o+4,2);u16(b,o+6,2);b[o+8]=8;u32(b,o+10,4);
  o=50;b[o]=1;u16(b,o+2,1);
  o+=24;b[o]=4;u32(b,o+8,0);u32(b,o+12,5);u32(b,o+16,5);u32(b,o+20,5);
  o+=24;b[o]=5;
  const sp=22+28+72;b.set(strings,sp);o=sp+strings.length;u16(b,o,0xf800);u16(b,o+2,0x07e0);b.set([0,1,0,1],o+4);return b;
}
const bytes=makeNzp();
const result=window.TnsContainerRegistry.detect(bytes,{name:"story.tns"});
assert.equal(result.family,"custom-container");
assert.equal(result.format,"nzp");
assert.equal(result.events.length,3);
assert.equal(result.scenes.length,1);
assert.equal(result.events[1].speakerText,"Alice");
assert.equal(result.events[1].textValue,"Hello");
const image=window.TnsNzpFormat.decodeImage(result,1);
assert.equal(image.width,2);
assert.deepEqual(Array.from(image.rgba.slice(0,4)),[255,0,0,255]);
const session=window.TnsNzpFormat.createSession(result);
session.patchEvent(0,{x:12,y:-4});
assert.equal(session.parsed.events[0].x,12);
assert.equal(session.parsed.events[0].y,-4);
session.patchText(1,"text","Hi");
assert.equal(session.parsed.events[1].textValue,"Hi");
assert.equal(session.validate().valid,true);
session.revertAll();
assert.deepEqual(session.workingBytes,bytes);

window.TnsContainerRegistry.register({id:"synthetic-pack",label:"Synthetic",priority:5,detect:b=>b[0]===0x41&&b[1]===0x42,parse:b=>({valid:true,bytes:b,marker:"ok"})});
const generic=window.TnsContainerRegistry.detect(new Uint8Array([0x41,0x42,1]));
assert.equal(generic.format,"synthetic-pack");
assert.equal(generic.marker,"ok");
console.log("PASS generic TNS container registry and NZP content pack parser/editor session");
