/*
 * NNSE ("NavNet SE") USB framing for TI-Nspire CX II (USB configuration #1).
 * First-party protocol implementation; the complete NavNet packet is carried
 * as an NNSE stream payload. No iframe, external website, or local daemon.
 *
 * Protocol references:
 * https://www.hackspire.org/USB_Protocol/
 * https://github.com/adriweb/tilibs (NNSE protocol research)
 */
(() => {
  "use strict";
  const PC=0xfe, CALC=0x01, ALL=0xff, HEADER=12, MAX_PAYLOAD=1472;
  const ADDR=0x01, TIME=0x02, STREAM=0x04, CTRL=0x08;
  const to16=(a,i)=>a[i]*256+a[i+1];
  const fail=message=>{ throw new Error("TI-Nspire CX II (NNSE): "+message); };
  const join=(...parts)=>{
    const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));
    let cursor=0;
    for(const p of parts){out.set(p,cursor);cursor+=p.length;}
    return out;
  };

  function checksum(data) {
    let sum=0;
    for(let i=0;i<data.length;i+=2) {
      sum += (data[i]<<8) | (i+1<data.length?data[i+1]:0);
    }
    while(sum>>>16)sum=(sum&0xffff)+(sum>>>16);
    return sum&0xffff;
  }
  function encodeFrame(service,payload=new Uint8Array(0),opts={}) {
    if(!(payload instanceof Uint8Array))payload=new Uint8Array(payload);
    if(payload.length>MAX_PAYLOAD)fail("Paquete excesivo.");
    const len=HEADER+payload.length,bytes=new Uint8Array(len);
    bytes[0]=0;bytes[1]=service;bytes[2]=opts.src??PC;bytes[3]=opts.dest??CALC;
    bytes[4]=opts.unknown??0;bytes[5]=opts.reqAck??0;
    bytes[6]=len>>>8;bytes[7]=len&255;
    const seq=(opts.seq??0)&0xffff;
    bytes[8]=seq>>>8;bytes[9]=seq&255;
    bytes.set(payload,HEADER);
    const sum=checksum(bytes)^0xffff;
    bytes[10]=sum>>>8;bytes[11]=sum&255;
    return bytes;
  }
  function parseFrame(bytes) {
    if(bytes.length<HEADER)fail("Cabecera NNSE incompleta.");
    const len=to16(bytes,6);
    if(bytes[0]!==0 || bytes[4]!==0 || len<HEADER ||
      len>HEADER+MAX_PAYLOAD || bytes.length!==len)fail("Cabecera NNSE inválida.");
    if(checksum(bytes)!==0xffff)fail("Checksum NNSE inválido.");
    return {service:bytes[1],src:bytes[2],dest:bytes[3],unknown:bytes[4],
      reqAck:bytes[5],seq:to16(bytes,8),payload:bytes.subarray(HEADER)};
  }
  function splitNavNetFrames(bytes) {
    const frames=[];
    let pos=0;
    while(pos<bytes.length) {
      // The firmware sometimes packs more than one NavNet reply into an
      // NNSE stream. Preserve each complete inner packet in FIFO order.
      if(bytes.length-pos<16) {
        if(!frames.length)fail("Paquete NavNet incompleto.");
        break;
      }
      if(bytes[pos]!==0x54||bytes[pos+1]!==0xfd)
        fail("Trama NavNet incorrecta dentro de NNSE.");
      const extended=bytes[pos+12]===255;
      if(extended&&bytes.length-pos<20)fail("Paquete NavNet extendido incompleto.");
      const logical=extended?
        bytes[pos+16]*0x1000000+bytes[pos+17]*65536+bytes[pos+18]*256+bytes[pos+19]:
        bytes[pos+12];
      const end=pos+16+(extended?4:0)+logical;
      if(logical>MAX_PAYLOAD||end>bytes.length)
        fail("Longitud de paquete NavNet incorrecta dentro de NNSE.");
      frames.push(bytes.slice(pos,end));
      pos=end;
    }
    return frames;
  }

  function parseCompactControl(bytes) {
    const len=to16(bytes,5);
    if(bytes[0]!==CTRL||bytes[3]!==0||len<HEADER||len>HEADER+MAX_PAYLOAD||
      bytes.length!==len-1)fail("Cabecera compacta NNSE inválida.");
    if(checksum(join(Uint8Array.of(0),bytes))!==0xffff)
      fail("Checksum compacto NNSE inválido.");
    return {service:bytes[0],src:bytes[1],dest:bytes[2],
      unknown:bytes[3],reqAck:bytes[4],seq:to16(bytes,7),
      payload:bytes.subarray(HEADER-1)};
  }

  class NNSETransport {
    constructor({readExact,write}) {
      if(typeof readExact!=="function"||typeof write!=="function")fail("Transporte USB inválido.");
      this.readExact=readExact;this.write=write;
      this.seq=1;this.ready=false;this.inbox=[];this.lastStreamSeq=null;
      this.frameBuffer=new Uint8Array(0);this.nextBareSeq=0x10000;
    }
    nextSeq(){const n=this.seq;this.seq=(this.seq+1)&65535;return n;}
    async send(service,payload=new Uint8Array(0),opts={}) {
      // ACKs echo the received sequence and do not consume a new host ID.
      // Allocating first and then overwriting opts.seq creates a gap for every
      // screen fragment, so the next request can be ignored by the peer.
      if((service&0x80)&&opts.seq==null)fail("ACK sin secuencia de origen.");
      const seq=opts.seq??this.nextSeq();
      await this.write(encodeFrame(service,payload,{...opts,seq}));
    }
    async promptAddress() {
      await this.send(ADDR,Uint8Array.of(0x80));
      await this.send(ADDR,Uint8Array.of(0x80));
    }
    async handshake() {
      // WebUSB on Windows cannot reliably USB-reset a CX II. Prompt its
      // already-configured NNSE connection rather than waiting for a raw
      // NavNet address packet, which cannot occur in USB configuration #1.
      await this.promptAddress();
      this.ready=true;
    }
    async readFrame() {
      // USB bulk transfers are an unstructured byte stream. An earlier
      // command can leave trailing bytes from a stale fragment in the FIFO.
      // Never assume the first 11 bytes of transferIn form an NNSE header.
      // Retain every byte until a fully checksummed frame can be verified.
      const MAX_RESYNC=8192;
      const fill=async n=>{
        while(this.frameBuffer.length<n) {
          this.frameBuffer=join(this.frameBuffer,
            await this.readExact(n-this.frameBuffer.length));
        }
      };
      let skipped=0;
      while(skipped<=MAX_RESYNC) {
        await fill(11);
        const h=this.frameBuffer;
        const normal=h[0]===0 && h[4]===0 &&
          h[2]===CALC && (h[3]===PC||h[3]===ALL) &&
          (h[1]&0x7f)>=1 && (h[1]&0x7f)<=8 &&
          (h[5]&~0x09)===0 && to16(h,6)>=HEADER &&
          to16(h,6)<=HEADER+MAX_PAYLOAD;
        if(normal) {
          const length=to16(h,6);
          await fill(length);
          try {
            const frame=parseFrame(this.frameBuffer.slice(0,length));
            this.frameBuffer=this.frameBuffer.slice(length);
            return frame;
          } catch (_) {
            // This was not a valid checksum-verified frame boundary.
          }
        }
        const compact=h[0]===CTRL && h[1]===CALC &&
          (h[2]===PC||h[2]===ALL) && h[3]===0 &&
          (h[4]&~0x09)===0 && to16(h,5)>=HEADER &&
          to16(h,5)<=HEADER+MAX_PAYLOAD;
        if(compact) {
          const length=to16(h,5)-1;
          await fill(length);
          try {
            const frame=parseCompactControl(this.frameBuffer.slice(0,length));
            this.frameBuffer=this.frameBuffer.slice(length);
            return frame;
          } catch (_) {
            // Try the next possible boundary instead of losing the buffer.
          }
        }
        // On some CX II exchanges a standalone NavNet packet can follow
        // an NNSE stream fragment. Accept it ONLY if both the NavNet header
        // and data checksums verify; never interpret arbitrary bytes as data.
        if(h[0]===0x54 && h[1]===0xfd && this.ready) {
          await fill(16);
          const raw=this.frameBuffer;
          const headSum=raw.subarray(0,15).reduce((sum,n)=>(sum+n)&255,0);
          if(raw[15]===headSum && to16(raw,2)===0x6401 &&
            to16(raw,6)===0x6400) {
            const extended=raw[12]===255;
            if(extended)await fill(20);
            const bytes=this.frameBuffer;
            const size=extended?
              (bytes[16]*0x1000000 + bytes[17]*65536 +
                bytes[18]*256+bytes[19]) : bytes[12];
            const length=16+(extended?4:0)+size;
            if(size<=MAX_PAYLOAD && length<=HEADER+MAX_PAYLOAD) {
              await fill(length);
              try {
                const valid=window.TnsNspireUSB?.parsePacket(
                  this.frameBuffer.slice(0,length),{bigEndianLength:true});
                if(valid && valid.dstAddr===0x6400) {
                  const payload=this.frameBuffer.slice(0,length);
                  this.frameBuffer=this.frameBuffer.slice(length);
                  // Use distinct sequence IDs for unwrapped replies so the
                  // duplicate NNSE-sequence filter cannot drop this packet.
                  return {service:STREAM,src:CALC,dest:PC,
                    unknown:0,reqAck:0,seq:this.nextBareSeq++,payload};
                }
              } catch (_) {
                // Invalid NavNet checksum: keep searching for NNSE.
              }
            }
          }
        }
        this.frameBuffer=this.frameBuffer.slice(1);
        skipped++;
      }
      const prefix=Array.from(this.frameBuffer.subarray(0,8),
        b=>b.toString(16).padStart(2,"0")).join(" ");
      fail("No se encontró una trama USB válida tras descartar "+skipped+
        " bytes ("+prefix+"). Reconecta la calculadora.");
    }
    async handle(frame) {
      if(frame.dest!==PC&&frame.dest!==ALL)return null;
      if(frame.service&0x80)return frame;
      if(frame.reqAck&1) {
        await this.send(frame.service|0x80,new Uint8Array(0),{
          src:frame.dest,dest:frame.src,unknown:frame.unknown,
          reqAck:frame.reqAck&~1,seq:frame.seq
        });
      }
      switch(frame.service) {
        case ADDR:
          if(frame.payload[0]===0) {
            await this.promptAddress();
            this.lastStreamSeq=null;
          }
          return null;
        case TIME:
          if(frame.payload[0]===0) {
            const body=new Uint8Array(17),ts=(Date.now()/1000)>>>0;
            body[0]=0x80;body[1]=ts>>>24;body[2]=(ts>>>16)&255;
            body[3]=(ts>>>8)&255;body[4]=ts&255;
            await this.send(TIME,body);
            this.ready=true;
          }
          return null;
        case CTRL:
          if(frame.payload.length===1) {
            const op=frame.payload[0];
            if(op===1||op===2||op===0) {
              if(op===2){this.inbox=[];this.lastStreamSeq=null;}
              await this.send(CTRL,Uint8Array.of(op|0x80,op===1?3:0),{dest:frame.src});
            }
          }
          return null;
        case STREAM:
          if(frame.seq!==this.lastStreamSeq) {
            const frames=splitNavNetFrames(frame.payload);
            this.lastStreamSeq=frame.seq;
            this.inbox.push(...frames);
          }
          return null;
        default:return null;
      }
    }
    async sendStream(navnet,{waitForAck=true}={}) {
      if(!(navnet instanceof Uint8Array)||navnet.length>MAX_PAYLOAD)
        fail("Trama NavNet demasiado grande para NNSE.");
      if(!this.ready)await this.handshake();
      const seq=this.nextSeq();
      const bytes=encodeFrame(STREAM,navnet,{seq,reqAck:1});
      // Service disconnect is a one-way NavNet message. On CX II firmware,
      // waiting for its NNSE ACK can hang even though the operation completed.
      // Send it once and let the NEXT normal sendStream() consume/ignore any
      // late matching ACK, without blocking this completed operation.
      if(!waitForAck) {
        await this.write(bytes);
        return;
      }
      // A service reply can precede the NNSE ACK. Queue it rather than
      // discarding the reply and then blocking forever in receiveRaw().
      for(let attempt=0;attempt<3;attempt++) {
        await this.write(bytes);
        for(let n=0;n<32;n++) {
          const frame=await this.readFrame();
          if(frame.service===(STREAM|0x80)&&frame.seq===seq &&
            (frame.dest===PC||frame.dest===ALL))return;
          const wasQueued=this.inbox.length;
          await this.handle(frame);
          if(this.inbox.length>wasQueued)return;
        }
      }
      fail("Sin confirmación NNSE de la calculadora.");
    }
    async receiveRaw() {
      if(this.inbox.length)return this.inbox.shift();
      for(let n=0;n<100;n++) {
        const frame=await this.readFrame();
        await this.handle(frame);
        if(this.inbox.length)return this.inbox.shift();
      }
      fail("No llegó la respuesta NavNet a través de NNSE.");
    }
    reset(){this.ready=false;this.inbox=[];this.lastStreamSeq=null;
      this.frameBuffer=new Uint8Array(0);this.nextBareSeq=0x10000;}
  }
  window.TnsNspireNNSE=Object.freeze({
    NNSETransport,encodeFrame,parseFrame,parseCompactControl,splitNavNetFrames,checksum
  });
})();
