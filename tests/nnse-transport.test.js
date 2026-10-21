import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load=file=>fs.readFileSync(new URL(file,import.meta.url),"utf8");
const win={};
const sandbox=vm.createContext({
  window:win,navigator:{},Uint8Array,ArrayBuffer,DataView,Date,TextEncoder,TextDecoder,Error,console
});
vm.runInContext(load("../ti-nspire-nnse.js"),sandbox);
vm.runInContext(load("../ti-nspire-webusb.js"),sandbox);
const nnse=win.TnsNspireNNSE,proto=win.TnsNspireUSB;

const concat=(...arrays)=>{
  const out=new Uint8Array(arrays.reduce((n,v)=>n+v.length,0));
  let pos=0;for(const v of arrays){out.set(v,pos);pos+=v.length;}return out;
};
const be32=v=>Uint8Array.of(v>>>24,(v>>>16)&255,(v>>>8)&255,v&255);
const dirRow=name=>{
  const b=new TextEncoder().encode(name);
  return concat(Uint8Array.of(0x10,0,0),b,b.length<8?
    new Uint8Array(9-b.length):Uint8Array.of(0),be32(0),be32(0),Uint8Array.of(1,0));
};
const frame=nnse.encodeFrame(4,Uint8Array.of(0x54,0xfd),{seq:42,reqAck:1});
assert.equal(nnse.checksum(frame),0xffff);
assert.equal(nnse.parseFrame(frame).seq,42);
assert.deepEqual(Array.from(nnse.parseFrame(frame).payload),[0x54,0xfd]);
const corrupt=frame.slice();corrupt[12]^=1;
assert.throws(()=>nnse.parseFrame(corrupt),/Checksum/);
const large=proto.packet(new Uint8Array(320).fill(0x5a),{bigEndianLength:true});
assert.deepEqual(Array.from(large.slice(16,20)),[0,0,1,64]);
assert.equal(proto.parsePacket(large,{bigEndianLength:true}).length,320);
assert.deepEqual(Array.from(proto.decodeRle(
  Uint8Array.of(1,0,0xf8,0xe0,0x07),8,4)),
  [0,248,224,7,0,248,224,7]);

class FakeNNSEUSB {
  vendorId=0x0451;productId=0xe022;opened=false;configuration=null;
  answers=[];seq=100;rootIndex=0;uploaded=[];expected=0;prompts=0;seenFrames=[];
  file=Uint8Array.of(1,2,3,4);colorScreenshot=false;
  async open(){this.opened=true;}
  async close(){this.opened=false;}
  async claimInterface(){}
  async releaseInterface(){}
  async selectConfiguration(value){
    assert.equal(value,1);
    this.configuration={configurationValue:1,interfaces:[{interfaceNumber:0,alternates:[{
      alternateSetting:0,endpoints:[
        {type:"bulk",direction:"in",endpointNumber:1},
        {type:"bulk",direction:"out",endpointNumber:1,packetSize:64}
      ]
    }]}]};
  }
  respond(data,service=0x4060,destSid=0x8000){
    const raw=proto.packet(data,{srcSid:service,dstSid:destSid,seq:0,bigEndianLength:true});
    this.answers.push(nnse.encodeFrame(4,raw,{
      src:1,dest:0xfe,seq:this.seq++,reqAck:1
    }));
  }
  async transferOut(_endpoint,bytes){
    if(!bytes.length)return {status:"ok"};
    const outer=nnse.parseFrame(bytes);
    this.seenFrames.push(outer.service);
    if(outer.service===1) {
      this.prompts++;
      if(this.prompts===2){
        this.answers.push(nnse.encodeFrame(1,Uint8Array.of(0),{src:1,dest:0xfe,seq:this.seq++,reqAck:1}));
        this.answers.push(nnse.encodeFrame(2,Uint8Array.of(0),{src:1,dest:0xfe,seq:this.seq++,reqAck:1}));
      }
      return {status:"ok"};
    }
    if(outer.service!==4)return {status:"ok"};
    this.answers.push(nnse.encodeFrame(0x84,new Uint8Array(0),{
      src:1,dest:0xfe,seq:outer.seq
    }));
    const cmd=proto.parsePacket(outer.payload,{bigEndianLength:true});
    assert.equal(cmd.seq,0);
    const d=cmd.data,service=cmd.dstSid,dest=cmd.srcSid;
    if(cmd.srcSid===0x40de)return {status:"ok"};
    if(d[0]===13){this.rootIndex=0;this.respond(Uint8Array.of(255,0),service,dest);}
    else if(d[0]===14)this.respond(this.rootIndex++===0?dirRow("Examples"):Uint8Array.of(255,17),service,dest);
    else if([15,10,9,11].includes(d[0]))this.respond(Uint8Array.of(255,0),service,dest);
    else if(d[0]===3&&d[1]===1){
      this.expected=new DataView(d.buffer,d.byteOffset+d.length-4,4).getUint32(0);
      this.uploaded=[];this.respond(Uint8Array.of(4),service,dest);
    }else if(d[0]===5){
      this.uploaded.push(...d.subarray(1));
      if(this.uploaded.length>=this.expected)this.respond(Uint8Array.of(255,0),service,dest);
    }else if(d[0]===7&&d[1]===1)
      this.respond(concat(Uint8Array.of(3,1),new Uint8Array(9),be32(this.file.length)),service,dest);
    else if(d[0]===4)this.respond(concat(Uint8Array.of(5),this.file),service,dest);
    else if(d[0]===0&&service===0x4024){
      if(this.colorScreenshot){
        this.respond(concat(Uint8Array.of(1),be32(8),Uint8Array.of(0,0,0,0,0,2,0,2)),service,dest);
        this.respond(Uint8Array.of(2,1,0,0xf8,0xe0,0x07),service,dest);
      }else{
        this.respond(concat(Uint8Array.of(1),be32(2),Uint8Array.of(0,0,0,0,0,2,0,2,4,0)),service,dest);
        this.respond(Uint8Array.of(2,255,0x12,0x34),service,dest);
      }
    }
    return {status:"ok"};
  }
  async transferIn(){
    const bytes=this.answers.shift();
    if(!bytes)throw Error("Unexpected USB read - test deadlock");
    return {status:"ok",data:new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)};
  }
}
const fake=new FakeNNSEUSB();
const controller=new proto.NspireUSB(fake);
const files=await controller.connect();
assert.equal(controller.connected,true);
assert.ok(controller.nnse);
assert.equal(files[0].name,"Examples");
assert.equal(files[0].isDir,true);
assert.ok(fake.seenFrames.includes(0x82),"NNSE time request answered");
await controller.makeDir("/Examples/New");
await controller.putFile("/Examples/new.tns",Uint8Array.of(7,8,9));
assert.deepEqual(fake.uploaded,[7,8,9]);
assert.deepEqual(Array.from(await controller.getFile("/Examples/current.tns")),[1,2,3,4]);
await controller.deleteEntry("/Examples/new.tns");
const snap=await controller.screenshotRle();
assert.deepEqual([snap.width,snap.height,snap.bpp],[2,2,4]);
assert.deepEqual(Array.from(snap.pixels),[0x12,0x34]);
fake.colorScreenshot=true;
const color=await controller.screenshotRle();
assert.deepEqual([color.width,color.height,color.bpp],[2,2,16]);
assert.deepEqual(Array.from(color.pixels),[0,248,224,7,0,248,224,7]);
await controller.close();
assert.equal(fake.opened,false);
console.log("CX II NNSE framing, handshake, directory, upload, download, delete, screenshot: passed.");
