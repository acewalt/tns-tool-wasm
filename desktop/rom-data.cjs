// ROM data readers used by supported conversion profiles. No ROM is bundled.
const crypto = require('node:crypto');
const SM64_EU_SHA1 = '4ac5721683d0e0b6bbb561b58a71740845dceea9';
function normalize(input) {
  const bytes = Buffer.from(input);
  if (bytes.length !== 8 * 1024 * 1024) throw Error('Esta conversión admite Super Mario 64 europeo de 8 MiB.');
  const magic = bytes.readUInt32BE(0);
  let byteOrder = 'z64';
  if (magic === 0x37804012) { bytes.swap16(); byteOrder = 'v64'; }
  else if (magic === 0x40123780) { bytes.swap32(); byteOrder = 'n64'; }
  else if (magic !== 0x80371240) throw Error('La cabecera no corresponde a una ROM Nintendo 64 válida.');
  return { bytes, byteOrder };
}
function inspect(input) {
  const { bytes, byteOrder } = normalize(input);
  const sha1 = crypto.createHash('sha1').update(bytes).digest('hex');
  if (sha1 !== SM64_EU_SHA1) throw Error('ROM no admitida: se requiere la edición europea original de Super Mario 64 (sin modificaciones).');
  return { id: 'sm64-eu', title: 'Super Mario 64', region: 'Europa', byteOrder, sha1, bytes: bytes.length };
}
function mio0(input, base = 0) {
  const data = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (base < 0 || base + 16 > data.length || data.toString('ascii', base, base + 4) !== 'MIO0') throw Error('Bloque MIO0 inválido.');
  const size = data.readUInt32BE(base + 4);
  if (!size || size > 16 * 1024 * 1024) throw Error('Tamaño MIO0 inválido.');
  let compressed = base + data.readUInt32BE(base + 8), raw = base + data.readUInt32BE(base + 12), bits = base + 16, mask = 0, flags = 0, out = 0;
  const result = Buffer.alloc(size);
  while (out < size) {
    if (!mask) { if (bits >= data.length) throw Error('MIO0 truncado.'); flags = data[bits++]; mask = 128; }
    if (flags & mask) { if (raw >= data.length) throw Error('MIO0 truncado.'); result[out++] = data[raw++]; }
    else {
      if (compressed + 2 > data.length) throw Error('MIO0 truncado.');
      const token = data.readUInt16BE(compressed); compressed += 2;
      const length = (token >>> 12) + 3, distance = (token & 4095) + 1;
      if (distance > out || out + length > size) throw Error('Referencia MIO0 inválida.');
      for (let i = 0; i < length; i++, out++) result[out] = result[out - distance];
    }
    mask >>>= 1;
  }
  return result;
}
function inspectNes(input, name='NES game', totalSize=input.length) {
  const bytes=Buffer.from(input),profile=require('./rom/nes-profile.json');
  if(bytes.length<16||totalSize>4*1024*1024||!bytes.subarray(0,4).equals(Buffer.from([78,69,83,26])))throw Error('Cartucho iNES inválido o mayor de 4 MiB.');
  const nes2=(bytes[7]&12)===8;
  if(nes2&&(bytes[8]||bytes[9]))throw Error('NES 2.0: submapper, mapper extendido o tamaños extendidos aún no admitidos.');
  const ramSize=n=>n?64*(2**n):0;
  if(nes2&&(ramSize(bytes[10]&15)+ramSize(bytes[10]>>>4)>8192||ramSize(bytes[11]&15)+ramSize(bytes[11]>>>4)>8192))throw Error('NES 2.0: la memoria adicional del cartucho supera el perfil de NesNspire.');
  if((bytes[7]&3)!==0)throw Error('Este perfil admite cartuchos de consola NES/Famicom estándar.');
  const mapper=(bytes[6]>>>4)|(bytes[7]&240),expected=16+(bytes[6]&4?512:0)+bytes[4]*16384+bytes[5]*8192;
  if(!bytes[4]||expected>totalSize)throw Error('El cartucho NES está truncado.');
  if(!profile.mappers.includes(mapper))throw Error('Mapper NES '+mapper+' no admitido por NesNspire.');
  return{id:'nes',system:'NES',title:String(name).replace(/\.(nes|zip)$/i,''),region:(nes2?bytes[12]&3:bytes[9]&1)===1?'PAL':'NTSC',format:nes2?'NES 2.0 (compatible iNES)':'iNES',normalizedForEmulator:nes2,mapper,prgBytes:bytes[4]*16384,chrBytes:bytes[5]*8192,bytes:totalSize,sha1:bytes.length===totalSize?crypto.createHash('sha1').update(bytes).digest('hex'):null};
}
function normalizeNes(input){const info=inspectNes(input),bytes=Buffer.from(input);if(info.normalizedForEmulator){bytes[7]&=0xf3;bytes.fill(0,8,16);if(info.region==='PAL')bytes[9]=1;}return bytes;}
function inspectRom(input,name='ROM'){
  const bytes=Buffer.from(input);
  if(bytes.subarray(0,4).equals(Buffer.from([78,69,83,26])))return inspectNes(bytes,name);
  if(bytes.length>=0x150&&(bytes.subarray(0x104,0x134).equals(GB_LOGO)||/\.(gb|gbc)$/i.test(name)))return inspectGb(bytes);
  if(bytes.length>=0xc0&&bytes[0xb2]===0x96&&bytes.subarray(4,8).equals(Buffer.from('24ffae51','hex')))return inspectGba(bytes);
  if(bytes.length>=0x160&&bytes.readUInt16LE(0x15c)===0xcf56&&bytes.subarray(0xc0,0xc4).equals(Buffer.from('24ffae51','hex')))return inspectNds(bytes);
  if(snesHeader(bytes)||/\.(sfc|smc)$/i.test(name))return inspectSnes(bytes);
  if(bytes.length>=64&&[0x80371240,0x37804012,0x40123780].includes(bytes.readUInt32BE(0))){try{return inspect(bytes);}catch(_){return inspectN64(bytes);}}
  return inspect(bytes);
}
function inspectGba(input,totalSize=input.length){
 const b=Buffer.from(input);if(b.length<0xc0||totalSize<0xc0||totalSize>32*1024*1024||b[0xb2]!==0x96||!b.subarray(4,8).equals(Buffer.from('24ffae51','hex')))throw Error('Cartucho GBA inválido o mayor de 32 MiB.');
 let checksum=-0x19;for(let i=0xa0;i<=0xbc;i++)checksum-=b[i];if((checksum&255)!==b[0xbd])throw Error('La cabecera GBA tiene un checksum incorrecto.');
 return{id:'gba',system:'GBA',title:b.subarray(0xa0,0xac).toString('ascii').replace(/\0.*$/,'').trim()||'Game Boy Advance',region:b[0xaf]===80?'Europa':b[0xaf]===74?'Japan':'International',format:'Game Boy Advance',bytes:totalSize,sha1:b.length===totalSize?crypto.createHash('sha1').update(b).digest('hex'):null};
}
function snesHeader(input){
 const b=Buffer.from(input),candidates=[];
 for(const headerBytes of [0,512])for(const base of [0x7fc0,0xffc0,0x40ffc0]){
  const at=base+headerBytes;if(b.length<at+64)continue;
  let mode=b[at+21];const checksum=b.readUInt16LE(at+30),inverse=b.readUInt16LE(at+28),reset=b.readUInt16LE(at+60),title=b.subarray(at,at+21);
  // A few older cartridges let the title spill into the map byte. As in
  // Snes9x, a valid checksum/vector/size can identify that header without
  // rewriting the selected cartridge or relying on its filename.
  if(![0,1,0x20,0x21,0x22,0x23,0x25,0x30,0x31,0x32,0x35].includes(mode)){
   if(mode<32||mode>126||(checksum^inverse)!==65535||!checksum||b[at+23]<5||b[at+23]>13)continue;mode=base===0x7fc0?0x20:0x21;
  }
  if(reset<0x8000||!title.every(n=>n===0||(n>=32&&n<127)))continue;
  if(mode<2&&(checksum^inverse)!==65535)continue;
  const score=((checksum^inverse)===65535&&checksum?8:0)+(mode&1?base!==0x7fc0:base===0x7fc0?2:0)+title.filter(n=>n>32).length/32;
  candidates.push({at,headerBytes,mode,score});
 }
 return candidates.sort((a,b)=>b.score-a.score)[0]||null;
}
function inspectSnes(input,totalSize=input.length){
 const b=Buffer.from(input),h=snesHeader(b);if(!h||totalSize-h.headerBytes<32768||totalSize-h.headerBytes>8*1024*1024||(totalSize-h.headerBytes)%8192)throw Error('Imagen SNES inválida: se requiere un cartucho LoROM/HiROM de hasta 8 MiB.');
 const chip=b[h.at+22];if([0xf5,0xf9].includes(chip))throw Error('El cartucho usa SPC7110, un chip que este núcleo SNES aún no implementa.');
 return{id:'snes',system:'SNES',title:b.subarray(h.at,h.at+21).toString('ascii').replace(/\0.*$/,'').trim()||'Super Nintendo',region:b[h.at+25]>=2&&b[h.at+25]<=12?'PAL':'NTSC',format:(h.mode&1?'HiROM':'LoROM')+(h.headerBytes?' + copier header':''),chip,headerBytes:h.headerBytes,bytes:totalSize,sha1:b.length===totalSize?crypto.createHash('sha1').update(b).digest('hex'):null};
}
function normalizeSnes(input){const b=Buffer.from(input),info=inspectSnes(b);return b.subarray(info.headerBytes);}
function inspectNds(input,totalSize=input.length){
 const b=Buffer.from(input);if(b.length<0x160||b.readUInt16LE(0x15c)!==0xcf56||!b.subarray(0xc0,0xc4).equals(Buffer.from('24ffae51','hex')))throw Error('Cabecera DS inválida.');
 if(totalSize<512||totalSize>128*1024*1024)throw Error('Este perfil DS admite cartuchos de hasta 128 MiB.');
 if(b[0x12]===3)throw Error('Este perfil ejecuta Nintendo DS; no implementa DSi.');
 for(const at of [0x20,0x30]){const offset=b.readUInt32LE(at),length=b.readUInt32LE(at+12);if(offset<0x160||!length||offset>totalSize||length>totalSize-offset)throw Error('Las secciones ARM del cartucho DS están truncadas.');}
 return{id:'nds',system:'NDS',title:b.subarray(0,12).toString('ascii').replace(/\0.*$/,'').trim()||'Nintendo DS',region:'International',format:'Nintendo DS',experimental:true,bytes:totalSize,sha1:b.length===totalSize?crypto.createHash('sha1').update(b).digest('hex'):null};
}
function normalizeN64(input){const b=Buffer.from(input);if(b.length<4096||b.length>64*1024*1024||b.length%4)throw Error('Imagen N64 fuera del límite de 4 KiB a 64 MiB.');const magic=b.readUInt32BE(0);if(magic===0x37804012)b.swap16();else if(magic===0x40123780)b.swap32();else if(magic!==0x80371240)throw Error('Cabecera N64 inválida.');return b;}
function inspectN64(input,totalSize=input.length){const b=Buffer.from(input),header=Buffer.from(b.subarray(0,b.length-b.length%4)),magic=header.readUInt32BE(0);if(magic===0x37804012)header.swap16();else if(magic===0x40123780)header.swap32();else if(magic!==0x80371240)throw Error('Cabecera N64 inválida.');if(totalSize<4096||totalSize>64*1024*1024||totalSize%4)throw Error('Este perfil N64 admite cartuchos de hasta 64 MiB.');return{id:'n64',system:'N64',title:header.subarray(32,52).toString('ascii').replace(/\0.*$/,'').trim()||'Nintendo 64',region:header[62]===80?'Europa':header[62]===74?'Japan':'International',format:'Nintendo 64',experimental:true,bytes:totalSize,sha1:b.length===totalSize?crypto.createHash('sha1').update(normalizeN64(b)).digest('hex'):null};}
const GB_LOGO=Buffer.from('ceed6666cc0d000b03730083000c000d0008111f8889000edccc6ee6ddddd999bbbb67636e0eecccdddc999fbbb9333e','hex');
function inspectGb(input,totalSize=input.length){
 const bytes=Buffer.from(input),profile=require('./rom/gb-profile.json');
 if(bytes.length<0x150||totalSize<32768||totalSize>8*1024*1024)throw Error('Cartucho GB/GBC fuera del límite de 32 KiB a 8 MiB.');
 let checksum=0;for(let i=0x134;i<=0x14c;i++)checksum=(checksum-bytes[i]-1)&255;
 if(checksum!==bytes[0x14d])throw Error('La cabecera GB/GBC tiene un checksum incorrecto.');
 const sizeCode=bytes[0x148],expected=sizeCode<=8?32768*(2**sizeCode):({82:1179648,83:1310720,84:1572864})[sizeCode];
 if(!expected||totalSize!==expected)throw Error('El tamaño GB/GBC no coincide con la cabecera.');
 if(!profile.cartridgeTypes.includes(bytes[0x147])||bytes[0x149]>5)throw Error('El controlador o accesorio del cartucho GB/GBC no está admitido.');
 const color=(bytes[0x143]&128)!==0,title=bytes.subarray(0x134,color?0x143:0x144).toString('ascii').replace(/\0.*$/,'').trim();
 return{id:'gb',system:color?'GBC':'GB',title:title||'Game Boy',region:bytes[0x14a]?'International':'Japan',format:color?'Game Boy Color':'Game Boy',mapper:bytes[0x147],bytes:totalSize,sha1:bytes.length===totalSize?crypto.createHash('sha1').update(bytes).digest('hex'):null};
}
function detect(input,{name='ROM',size=input.length}={}){
 const b=Buffer.from(input);let system='Unknown',title=name;
 try{
  if(b.length>=4&&b.subarray(0,2).toString()==='PK')return{system:'ZIP',archive:true,convertible:size<=144*1024*1024,title:name,reason:'Selecciona una ROM o un ZIP individual, no un paquete completo.'};
  if(b.subarray(0,4).equals(Buffer.from([78,69,83,26]))){system='NES';return{...inspectNes(b,name,size),convertible:true};}
  if(b.length>=0x150&&(b.subarray(0x104,0x134).equals(GB_LOGO)||/\.(gb|gbc)$/i.test(name))){system=b[0x143]&128?'GBC':'GB';return{...inspectGb(b,size),convertible:true};}
  if(b.length>=64&&[0x80371240,0x37804012,0x40123780].includes(b.readUInt32BE(0))){system='N64';return{...inspectN64(b,size),convertible:true};}
  if(b.length>=0xc0&&b[0xb2]===0x96&&b.subarray(4,8).equals(Buffer.from('24ffae51','hex'))){system='GBA';return{...inspectGba(b,size),convertible:true};}
  else if(b.length>=0x160&&b.readUInt16LE(0x15c)===0xcf56&&b.subarray(0xc0,0xc4).equals(Buffer.from('24ffae51','hex'))){system='NDS';return{...inspectNds(b,size),convertible:true};}
  else if(b.length>=0x110&&b.subarray(0x100,0x104).toString()==='SEGA'){system='Mega Drive / Genesis';}
  else if(snesHeader(b)||/\.(sfc|smc)$/i.test(name)){system='SNES';return{...inspectSnes(b,size),convertible:true};}
  return{system,title,convertible:false,reason:system==='Unknown'?'No se reconoce una cabecera de ROM compatible.':system+' detectado: aún no hay un backend de conversión y preview integrado para este sistema.'};
 }catch(error){return{system,title,convertible:false,reason:error.message};}
}
module.exports = { normalize, inspect, inspectRom, inspectNes, normalizeNes, inspectGb, inspectGba, inspectSnes, normalizeSnes, inspectNds, inspectN64, normalizeN64, detect, GB_LOGO, mio0, SM64_EU_SHA1 };
