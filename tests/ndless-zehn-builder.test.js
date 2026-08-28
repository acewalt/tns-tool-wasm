import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../ndless-elf32.js');
await import('../ndless-zehn.js');
await import('../ndless-zehn-builder.js');

function align(n,a=4){return (n+a-1)&~(a-1);}
function makeElf(){
  const names=['','.text','.data','.bss','.symtab','.strtab','.rel.data','.shstrtab'];
  let shstr='\0'; const nameOff={}; for(const n of names.slice(1)){nameOff[n]=shstr.length;shstr+=n+'\0';}
  const strtab='\0foo\0';
  const text=Uint8Array.from([0x1e,0xff,0x2f,0xe1]);
  const data=Uint8Array.from([0,0,0,0]);
  const sym=new Uint8Array(32); const sv=new DataView(sym.buffer);
  sv.setUint32(16,1,true); sv.setUint32(20,0,true); sv.setUint32(24,4,true);
  sym[28]=(1<<4)|2; sv.setUint16(30,1,true);
  const rel=new Uint8Array(8); const rv=new DataView(rel.buffer); rv.setUint32(0,4,true); rv.setUint32(4,(1<<8)|2,true);
  const shstrBytes=new TextEncoder().encode(shstr), strBytes=new TextEncoder().encode(strtab);
  const payloads=[null,text,data,null,sym,strBytes,rel,shstrBytes];
  let off=52; const offsets=[];
  for(let i=0;i<payloads.length;i++){const p=payloads[i];if(!p){offsets[i]=0;continue;}off=align(off,4);offsets[i]=off;off+=p.length;}
  const shoff=align(off,4), shnum=8, total=shoff+shnum*40;
  const bytes=new Uint8Array(total); const v=new DataView(bytes.buffer);
  bytes.set([0x7f,0x45,0x4c,0x46,1,1,1,0],0);
  v.setUint16(16,2,true); v.setUint16(18,40,true); v.setUint32(20,1,true); v.setUint32(24,0,true);
  v.setUint32(32,shoff,true); v.setUint32(36,0x5000000,true); v.setUint16(40,52,true); v.setUint16(46,40,true); v.setUint16(48,shnum,true); v.setUint16(50,7,true);
  for(let i=0;i<payloads.length;i++) if(payloads[i]) bytes.set(payloads[i],offsets[i]);
  function sh(i,name,type,flags,addr,offset,size,link=0,info=0,alignv=4,entsize=0){const o=shoff+i*40;v.setUint32(o,nameOff[name]||0,true);v.setUint32(o+4,type,true);v.setUint32(o+8,flags,true);v.setUint32(o+12,addr,true);v.setUint32(o+16,offset,true);v.setUint32(o+20,size,true);v.setUint32(o+24,link,true);v.setUint32(o+28,info,true);v.setUint32(o+32,alignv,true);v.setUint32(o+36,entsize,true);}
  sh(1,'.text',1,0x6,0,offsets[1],text.length,0,0,4,0);
  sh(2,'.data',1,0x3,4,offsets[2],data.length,0,0,4,0);
  sh(3,'.bss',8,0x3,8,0,4,0,0,4,0);
  sh(4,'.symtab',2,0,0,offsets[4],sym.length,5,1,4,16);
  sh(5,'.strtab',3,0,0,offsets[5],strBytes.length,0,0,1,0);
  sh(6,'.rel.data',9,0,0,offsets[6],rel.length,4,2,4,8);
  sh(7,'.shstrtab',3,0,0,offsets[7],shstrBytes.length,0,0,1,0);
  return bytes;
}

const elfBytes=makeElf();
const parsedElf=globalThis.NdlessElf32.parse(elfBytes);
assert.equal(parsedElf.header.machine,40);
assert.equal(parsedElf.sectionByName('.text').address,0);
assert.equal(parsedElf.relocations.length,1);
assert.equal(parsedElf.relocations[0].type,2);
assert.equal(parsedElf.relocations[0].symbolIndex,1);
assert.equal(parsedElf.relocations[0].relocatedSection?.name,'.data');
assert.equal(parsedElf.relocations[0].symbol?.sectionIndex,1);

const built=await globalThis.NdlessZehnBuilder.buildFromElf(elfBytes,{name:'browser-test',author:'TNS Tool WASM',compress:false});
assert.ok(built.bytes instanceof Uint8Array);
const zehn=globalThis.NdlessZehn.findZehn(built.bytes);
assert.ok(zehn?.valid,'generated Zehn should parse');
assert.equal(zehn.header.entryOffset,0);
assert.equal(zehn.metadata.name,'browser-test');
assert.equal(zehn.metadata.author,'TNS Tool WASM');
console.log('DEBUG relocation', JSON.stringify({elf:parsedElf.relocations.map(r=>({type:r.type,offset:r.offset,symbol:r.symbolIndex,section:r.relocatedSection?.name,shndx:r.symbol?.sectionIndex})),stats:built.stats,zehn:zehn.relocs.map(r=>({type:r.type,data:r.data,raw:r.raw}))}));
assert.equal(zehn.relocs.filter(r=>r.type===0).length,1);
assert.equal(zehn.relocs.find(r=>r.type===0).data,4);
assert.equal(built.stats.executableSize,8);
assert.equal(built.stats.bssSize,4);
console.log('PASS ELF32 ARM -> Zehn browser builder');
