import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load=file=>fs.readFileSync(new URL(file,import.meta.url),"utf8");
const win={};
const sandbox=vm.createContext({
  window:win,navigator:{},Uint8Array,ArrayBuffer,DataView,Date,TextEncoder,TextDecoder,Error,console,
  setTimeout,clearTimeout
});
vm.runInContext(load("../ti-nspire-nnse.js"),sandbox);
vm.runInContext(load("../ti-nspire-webusb.js"),sandbox);
const nnse=win.TnsNspireNNSE,proto=win.TnsNspireUSB;

const acknowledgements=[];
const sequenceCheck=new nnse.NNSETransport({readExact:async()=>{throw Error('Unexpected read');},
  write:async bytes=>acknowledgements.push(nnse.parseFrame(bytes))});
sequenceCheck.seq=65535;
await sequenceCheck.send(8,Uint8Array.of(0x81,3));
for(let i=0;i<700;i++)await sequenceCheck.handle({service:8,src:1,dest:0xfe,
  reqAck:1,seq:i,payload:new Uint8Array(0)});
await sequenceCheck.send(8,Uint8Array.of(0x81,3));
assert.equal(acknowledgements[0].seq,65535);
assert.equal(acknowledgements.at(-1).seq,0,'700 ACKs must not consume the wrapped host sequence');
assert.ok(acknowledgements.slice(1,-1).every((ack,i)=>ack.service===0x88&&ack.seq===i));

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
const packed=concat(proto.packet(Uint8Array.of(0xff,0),{seq:0,bigEndianLength:true}),
  proto.packet(Uint8Array.of(0xff,0x11),{seq:0,bigEndianLength:true}));
assert.equal(nnse.splitNavNetFrames(packed).length,2);
assert.deepEqual(Array.from(proto.decodeRle(
  Uint8Array.of(1,0,0xf8,0xe0,0x07),8,4)),
  [0,248,224,7,0,248,224,7]);

// A bad candidate is not accepted as a file response. Sliding the input
// stream must eventually find the next checksum-valid NNSE boundary.
const validRaw=proto.packet(Uint8Array.of(5,9,8,7),{
  srcAddr:0x6401,dstAddr:0x6400,srcSid:0x4060,dstSid:0x8000,
  seq:0,bigEndianLength:true
});
const invalidRaw=validRaw.slice();invalidRaw[17]^=1;
const goodFrame=nnse.encodeFrame(4,validRaw,{src:1,dest:0xfe,seq:777});
const compactFrame=nnse.encodeFrame(8,Uint8Array.of(2),{src:1,dest:0xfe,seq:778}).subarray(1);
assert.equal(nnse.parseCompactControl(compactFrame).service,8);
const stream=concat(Uint8Array.of(0x6c,0xce),invalidRaw,compactFrame,goodFrame);
let scanOffset=0;
const scanner=new nnse.NNSETransport({
  readExact:async count=>{
    if(scanOffset+count>stream.length)throw Error("Scanner over-read");
    const chunk=stream.subarray(scanOffset,scanOffset+count);
    scanOffset+=count;return chunk;
  },
  write:async()=>{}
});
scanner.ready=true;
assert.deepEqual(Array.from(await scanner.receiveRaw()),Array.from(validRaw));

class FakeNNSEUSB {
  vendorId=0x0451;productId=0xe022;opened=false;configuration=null;
  answers=[];seq=100;rootIndex=0;uploaded=[];expected=0;prompts=0;seenFrames=[];
  file=Uint8Array.of(1,2,3,4);colorScreenshot=false;
  sendBareOnDownload=false;addStalePrefix=false;splitBulkReads=false;
  renameData=null;
  splitScreenshot=false;suppressFinalAck=false;suppressDisconnectAck=false;
  stallScreen=false;stallClose=false;staleScreenBeforeFiles=false;closeCount=0;
  strictScreenSequence=false;expectedHostSeq=null;rejectedSequences=[];
  fullScreenshot=false;screenCount=0;
  async open(){this.opened=true;}
  async close(){this.closeCount++;this.opened=false;}
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
    const raw=proto.packet(data,{srcAddr:0x6401,dstAddr:0x6400,
      srcSid:service,dstSid:destSid,seq:0,bigEndianLength:true});
    if(this.sendBareOnDownload && data[0]===5){
      // Actual recorded failure starts with a two-byte stale fragment,
      // followed by 54 FD 64 01 40 60 (calculator's NavNet file service).
      this.answers.push(concat(Uint8Array.of(0x6c,0xce),raw));
      return;
    }
    const framed=nnse.encodeFrame(4,raw,{
      src:1,dest:0xfe,seq:this.seq++,reqAck:1
    });
    this.answers.push(this.addStalePrefix?
      concat(Uint8Array.of(0xb4,0x72,0x6c,0xce),framed):framed);
  }
  async transferOut(_endpoint,bytes){
    if(!bytes.length)return {status:"ok"};
    const outer=nnse.parseFrame(bytes);
    this.seenFrames.push(outer.service);
    if(this.strictScreenSequence && !(outer.service&0x80) && this.expectedHostSeq!==null){
      if(outer.seq!==this.expectedHostSeq){
        this.rejectedSequences.push([outer.seq,this.expectedHostSeq]);
        return {status:'ok'}; // USB write succeeded; the protocol peer rejected it.
      }
      this.expectedHostSeq=(this.expectedHostSeq+1)&65535;
    }
    if(outer.service===1) {
      this.prompts++;
      if(this.prompts===2){
        this.answers.push(nnse.encodeFrame(1,Uint8Array.of(0),{src:1,dest:0xfe,seq:this.seq++,reqAck:1}));
        this.answers.push(nnse.encodeFrame(2,Uint8Array.of(0),{src:1,dest:0xfe,seq:this.seq++,reqAck:1}));
      }
      return {status:"ok"};
    }
    if(outer.service!==4)return {status:"ok"};
    const cmd=proto.parsePacket(outer.payload,{bigEndianLength:true});
    if(this.stallClose && cmd.srcSid===0x40de)return new Promise(()=>{});
    if(this.suppressDisconnectAck && cmd.srcSid===0x40de)return {status:"ok"};
    if(this.suppressFinalAck && cmd.data[0]===0xff && cmd.data[1]===0)
      return {status:"ok"};
    this.answers.push(nnse.encodeFrame(0x84,new Uint8Array(0),{
      src:1,dest:0xfe,seq:outer.seq
    }));
    assert.equal(cmd.seq,0);
    const d=cmd.data,service=cmd.dstSid,dest=cmd.srcSid;
    if(cmd.srcSid===0x40de)return {status:"ok"};
    if(d[0]===0x21&&d[1]===0x01) {
      this.renameData=d.slice();
      this.respond(Uint8Array.of(255,0),service,dest);
    }
    else if(service===0x4020 && d[0]===1){
      const info=new Uint8Array(33),view=new DataView(info.buffer);info[0]=1;
      view.setBigUint64(1,64n*1024n*1024n);view.setBigUint64(9,128n*1024n*1024n);
      this.respond(info,service,dest);
    }
    else if(d[0]===13){
      this.rootIndex=0;
      if(this.staleScreenBeforeFiles)this.respond(Uint8Array.of(2,255,0x12,0x34),0x4024,dest);
      this.respond(Uint8Array.of(255,0),service,dest);
    }
    else if(d[0]===14)this.respond(this.rootIndex++===0?dirRow("Examples"):Uint8Array.of(255,17),service,dest);
    else if(this.rejectDelete&&[9,11].includes(d[0]))this.respond(Uint8Array.of(255,4),service,dest);
    else if([15,10,9,11].includes(d[0]))this.respond(Uint8Array.of(255,0),service,dest);
    else if(d[0]===3&&d[1]===1){
      this.expected=new DataView(d.buffer,d.byteOffset+d.length-4,4).getUint32(0);
      this.uploaded=[];this.respond(Uint8Array.of(4),service,dest);
    }else if(d[0]===5){
      this.uploaded.push(...d.subarray(1));
      if(this.uploaded.length>=this.expected)this.respond(Uint8Array.of(255,0),service,dest);
    }else if(d[0]===7&&d[1]===1)
      this.respond(concat(Uint8Array.of(3,1),new Uint8Array(9),be32(this.file.length)),service,dest);
    else if(d[0]===4){
      for(let offset=0;offset<this.file.length;offset+=1200)
        this.respond(concat(Uint8Array.of(5),this.file.subarray(offset,offset+1200)),service,dest);
    }
    else if(d[0]===0&&service===0x4024){
      if(this.strictScreenSequence&&this.expectedHostSeq===null)this.expectedHostSeq=(outer.seq+1)&65535;
      if(this.stallScreen)return {status:"ok"};
      if(this.fullScreenshot){
        const shot=++this.screenCount,encoded=new Uint8Array(300*513);
        for(let block=0;block<300;block++){
          encoded[block*513]=129; // literal run of 128 RGB565 pixel pairs
          for(let j=0;j<512;j++)encoded[block*513+1+j]=(shot+block+j)&255;
        }
        this.respond(concat(Uint8Array.of(1),be32(encoded.length),
          Uint8Array.of(0,0,0,0,1,64,0,240,16,0)),service,dest);
        for(let at=0;at<encoded.length;at+=1024){
          this.respond(concat(Uint8Array.of(2),encoded.subarray(at,at+1024)),service,dest);
          if(at===0)this.answers.push(nnse.encodeFrame(8,Uint8Array.of(1),
            {src:1,dest:0xfe,seq:this.seq++,reqAck:1}));
        }
      }else if(this.colorScreenshot){
        this.respond(concat(Uint8Array.of(1),be32(5),Uint8Array.of(0,0,0,0,0,2,0,2)),service,dest);
        if(this.splitScreenshot){
          this.respond(Uint8Array.of(2,1,0,0xf8),service,dest);
          this.respond(Uint8Array.of(2,0xe0,0x07),service,dest);
        }else this.respond(Uint8Array.of(2,1,0,0xf8,0xe0,0x07),service,dest);
      }else{
        this.respond(concat(Uint8Array.of(1),be32(3),Uint8Array.of(0,0,0,0,0,2,0,2,4,0)),service,dest);
        if(this.splitScreenshot){
          this.respond(Uint8Array.of(2,255,0x12),service,dest);
          this.respond(Uint8Array.of(2,0x34),service,dest);
        }else this.respond(Uint8Array.of(2,255,0x12,0x34),service,dest);
      }
    }
    return {status:"ok"};
  }
  async transferIn(){
    let bytes=this.answers.shift();
    if(!bytes && (this.suppressFinalAck||this.stallScreen||this.rejectedSequences.length))return new Promise(()=>{});
    if(!bytes)throw Error("Unexpected USB read - test deadlock");
    if(this.splitBulkReads && bytes.length>40){
      this.answers.unshift(bytes.subarray(40));
      bytes=bytes.subarray(0,40);
    }
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
fake.rejectDelete=true;
await assert.rejects(controller.deleteEntry('/Examples/denied',true),error=>error.code==='USB_DELETE_REJECTED'&&error.path==='/Examples/denied'&&error.deviceStatus==='ff 04');
assert.equal(controller.connected,true,'A rejected delete is not a broken USB connection');
fake.rejectDelete=false;
await controller.renameEntry("/Examples/old.tns","/Examples/new.tns");
assert.equal(fake.renameData[0],0x21);
assert.equal(fake.renameData[1],0x01);
const renameText=new TextDecoder().decode(fake.renameData);
assert.match(renameText,/old\.tns/);
assert.match(renameText,/new\.tns/);
await controller.renameEntry("/Examples/OldFolder","/Examples/NewFolder");
await assert.rejects(controller.renameEntry("/","/renamed"),/raíz/);
await controller.renameEntry("/Examples/a","/Other/a");
assert.match(new TextDecoder().decode(fake.renameData),/Other\/a/);
assert.equal(fake.renameData.at(-1),0,'Move command requires its trailing terminator');
await assert.rejects(controller.renameEntry('/Examples','/Examples/Child'),/sí misma/);
const capacity=await controller.storageInfo();
assert.deepEqual({...capacity},{free:67108864,total:134217728,used:67108864});
await controller.putFile("/Examples/new.tns",Uint8Array.of(7,8,9));
assert.deepEqual(fake.uploaded,[7,8,9]);
assert.deepEqual(Array.from(await controller.getFile("/Examples/current.tns")),[1,2,3,4]);
const completionOrder=[];
const early=await controller.getFile("/Examples/early.tns",
  (_current,_total,phase)=>{if(phase==="finalizing")completionOrder.push("finalizing");},
  data=>{completionOrder.push("bytes");assert.deepEqual(Array.from(data),[1,2,3,4]);}
);
completionOrder.push("resolved");
assert.deepEqual(completionOrder,["bytes","finalizing","resolved"]);
assert.deepEqual(Array.from(early),[1,2,3,4]);
fake.addStalePrefix=true;fake.splitBulkReads=true;
assert.deepEqual(Array.from(await controller.getFile("/Examples/with-stale-nnse.tns")),[1,2,3,4]);
fake.addStalePrefix=false;fake.splitBulkReads=false;
fake.sendBareOnDownload=true;
assert.deepEqual(Array.from(await controller.getFile("/Examples/bare-with-stale.tns")),[1,2,3,4]);
fake.file=Uint8Array.from({length:1900},(_,i)=>i&255);
assert.deepEqual(Array.from(await controller.getFile("/Examples/multiblock.tns")),Array.from(fake.file));
fake.sendBareOnDownload=false;fake.file=Uint8Array.of(1,2,3,4);
await controller.deleteEntry("/Examples/new.tns");
const captureOrder=[];
const snap=await controller.screenshotRle(
  (current,total,phase)=>captureOrder.push([current,total,phase]),
  image=>{captureOrder.push(["image",image.width,image.height]);}
);
assert.deepEqual(captureOrder.at(-2),["image",2,2]);
assert.deepEqual(captureOrder.at(-1),[3,3,"finalizing"]);
assert.deepEqual([snap.width,snap.height,snap.bpp],[2,2,4]);
assert.deepEqual(Array.from(snap.pixels),[0x12,0x34]);
fake.colorScreenshot=true;fake.splitScreenshot=true;
const color=await controller.screenshotRle();
assert.deepEqual([color.width,color.height,color.bpp],[2,2,16]);
assert.deepEqual(Array.from(color.pixels),[0,248,224,7,0,248,224,7]);
fake.colorScreenshot=false;
fake.suppressDisconnectAck=true;
const splitGray=await controller.screenshotRle();
assert.deepEqual(Array.from(splitGray.pixels),[0x12,0x34]);
assert.equal(controller.connected,true,
  "A successful screenshot without disconnect ACK should keep the device connected");
assert.equal(controller.broken,false);
fake.suppressDisconnectAck=false;
const afterScreenFiles=await controller.listDir("/");
assert.equal(afterScreenFiles[0].name,"Examples",
  "Listing must still work immediately after an unacknowledged screenshot close");
await controller.close();
assert.equal(fake.opened,false);
assert.equal(fake.closeCount,1);
await controller.close();
assert.equal(fake.closeCount,1,'Closing a retired handle must be idempotent');

const repeatedUSB=new FakeNNSEUSB(),repeated=new proto.NspireUSB(repeatedUSB);
await repeated.connect();repeatedUSB.suppressDisconnectAck=true;
for(let i=0;i<5;i++)assert.equal((await repeated.screenshotRle()).width,2);
repeatedUSB.suppressDisconnectAck=false;repeatedUSB.staleScreenBeforeFiles=true;
assert.equal((await repeated.listDir('/'))[0].name,'Examples',
  'A late screen packet addressed to the current host SID must not become a file reply');
await repeated.close();

// NNSE sequence numbers advance for new outgoing messages, never for ACKs
// echoing a received sequence (libnspire cx2.cpp NNSEMessage/handlePacket).
// A real-sized screenshot produces hundreds of ACKs. A strict peer can accept
// the first image, then ignore the close and second request if ACKs consumed
// the host's outgoing sequence. USB transferOut still reports success.
const strictUSB=new FakeNNSEUSB(),strict=new proto.NspireUSB(strictUSB);
await strict.connect();strictUSB.strictScreenSequence=true;strict.screenshotTimeoutMs=100;
for(let i=0;i<5;i++)assert.equal((await strict.screenshotRle()).width,2);
assert.deepEqual(strictUSB.rejectedSequences,[],'Screenshot ACKs must not create outgoing sequence gaps');
assert.equal((await strict.listDir('/'))[0].name,'Examples');
await strict.close();

const fullUSB=new FakeNNSEUSB(),full=new proto.NspireUSB(fullUSB);
await full.connect();fullUSB.strictScreenSequence=true;
fullUSB.fullScreenshot=true;fullUSB.splitBulkReads=true;full.screenshotTimeoutMs=2000;
for(let i=1;i<=3;i++){
  const image=await full.screenshotRle();
  assert.deepEqual([image.width,image.height,image.bpp],[320,240,16]);
  assert.equal(image.pixels.length,153600);
  assert.equal(image.pixels[0],i,'Each screenshot must contain the newly received image');
  assert.equal(image.pixels.at(-1),(i+299+511)&255);
}
assert.deepEqual(fullUSB.rejectedSequences,[],
  'Full screenshots and interleaved NNSE control messages must keep consecutive host IDs');
assert.equal((await full.listDir('/'))[0].name,'Examples');
await full.close();

const silentUSB=new FakeNNSEUSB(),silent=new proto.NspireUSB(silentUSB);
await silent.connect();silent.screenshotTimeoutMs=20;silentUSB.stallScreen=true;
await assert.rejects(silent.screenshotRle(),error=>error.code==='USB_TIMEOUT');
assert.equal(silent.busy,false,'Screen timeout must release the operation lock');
assert.equal(silent.connected,false);
await silent.close();
assert.equal(silentUSB.closeCount,1,'Close the timed-out handle before reusing the USB device');

const closeUSB=new FakeNNSEUSB(),closing=new proto.NspireUSB(closeUSB);
await closing.connect();closing.serviceCloseTimeoutMs=20;closeUSB.stallClose=true;
let screenDelivered=false;
await assert.rejects(closing.screenshotRle(()=>{},()=>{screenDelivered=true;}),error=>error.code==='USB_TIMEOUT');
assert.equal(screenDelivered,true,'Completed screenshot must survive stalled service cleanup');
assert.equal(closing.busy,false);
await closing.close();
// Regression: a CX II can deliver every TNS byte but never ACK the terminal
// FF00 command. Never leave the UI permanently disabled in that case.
const stalledUSB=new FakeNNSEUSB();
const stalled=new proto.NspireUSB(stalledUSB);
await stalled.connect();
stalled.usbReadTimeoutMs=25;
stalledUSB.suppressFinalAck=true;
let receivedBytes=false, timeoutDetected=false;
try {
  await stalled.getFile("/Examples/stalled.tns",()=>{},
    data=>{receivedBytes=true;assert.deepEqual(Array.from(data),[1,2,3,4]);});
} catch(error) {
  timeoutDetected=/USB|calculadora|Conexión/.test(String(error.message));
}
assert.equal(receivedBytes,true,"File data must be available before cleanup ACK");
assert.equal(timeoutDetected,true,"Stalled terminal ACK must be reported");
assert.equal(stalled.broken,true,"Do not reuse a timed-out USB connection");
assert.equal(stalled.connected,false);
await stalled.close();
console.log("CX II NNSE, compressed screenshot fragments, timeout recovery and file transfers: passed.");
