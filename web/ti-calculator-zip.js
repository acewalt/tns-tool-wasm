/*
 * Small, dependency-free ZIP writer for calculator folder downloads.
 * Stores entries without recompression (TNS documents are compressed already).
 * ZIP32 with UTF-8 names. Rejects traversal and archive-size overflows.
 */
(() => {
  "use strict";
  const encoder=new TextEncoder();
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;for(let bit=0;bit<8;bit++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  const crc32=bytes=>{
    let c=0xffffffff;
    for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);
    return (c^0xffffffff)>>>0;
  };
  const checkPath=path=>{
    if(typeof path!=="string"||!path||path.startsWith("/")||
       path.includes("\\")||path.includes("\0")||
       path.split("/").some(p=>p==="."||p===".."))
      throw Error("Ruta insegura dentro del ZIP.");
    return path;
  };
  const words=(size,writer)=>{
    const out=new Uint8Array(size);
    const view=new DataView(out.buffer);
    writer({
      u16:(p,n)=>view.setUint16(p,n,true),
      u32:(p,n)=>view.setUint32(p,n>>>0,true)
    });
    return out;
  };
  const join=parts=>{
    const size=parts.reduce((sum,x)=>sum+x.length,0);
    if(size>128*1024*1024)throw Error("La carpeta excede el límite seguro del ZIP.");
    const bytes=new Uint8Array(size);let pos=0;
    for(const part of parts){bytes.set(part,pos);pos+=part.length;}
    return bytes;
  };
  function pack(entries){
    if(!Array.isArray(entries)||!entries.length||entries.length>1000)
      throw Error("El ZIP necesita entre 1 y 1000 entradas.");
    const local=[],central=[];let offset=0,centralSize=0;const seen=new Set();
    const now=new Date(),time=((now.getHours()&31)<<11)|((now.getMinutes()&63)<<5)|((now.getSeconds()>>>1)&31);
    const date=(((Math.max(1980,now.getFullYear())-1980)&127)<<9)|(((now.getMonth()+1)&15)<<5)|(now.getDate()&31);
    for(const entry of entries){
      let path=checkPath(entry.path);
      if(entry.isDir&&!path.endsWith("/"))path+="/";
      const name=encoder.encode(path);
      if(!name.length||name.length>65535||seen.has(path))throw Error("Ruta de ZIP inválida o duplicada.");
      seen.add(path);
      const data=entry.isDir?new Uint8Array():entry.data;
      if(!(data instanceof Uint8Array))throw Error("Datos de documento ZIP inválidos.");
      if(data.length>0xffffffff)throw Error("Archivo demasiado grande para ZIP32.");
      const sum=crc32(data);
      const head=words(30,le=>{
        le.u32(0,0x04034b50);le.u16(4,20);le.u16(6,0x0800);le.u16(8,0);
        le.u16(10,time);le.u16(12,date);le.u32(14,sum);
        le.u32(18,data.length);le.u32(22,data.length);le.u16(26,name.length);le.u16(28,0);
      });
      local.push(head,name,data);
      const directory=words(46,le=>{
        le.u32(0,0x02014b50);le.u16(4,20);le.u16(6,20);
        le.u16(8,0x0800);le.u16(10,0);le.u16(12,time);le.u16(14,date);
        le.u32(16,sum);le.u32(20,data.length);le.u32(24,data.length);
        le.u16(28,name.length);le.u16(30,0);le.u16(32,0);le.u16(34,0);
        le.u16(36,0);le.u32(38,entry.isDir?0x10:0x20);le.u32(42,offset);
      });
      central.push(directory,name);centralSize+=46+name.length;
      offset+=30+name.length+data.length;
      if(offset+centralSize>128*1024*1024)throw Error("ZIP demasiado grande.");
    }
    const tail=words(22,le=>{
      le.u32(0,0x06054b50);le.u16(4,0);le.u16(6,0);
      le.u16(8,entries.length);le.u16(10,entries.length);
      le.u32(12,centralSize);le.u32(16,offset);le.u16(20,0);
    });
    return join([...local,...central,tail]);
  }
  window.TnsCalculatorZip=Object.freeze({pack,crc32});
})();
