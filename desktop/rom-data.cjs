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
  if(/\.(sfc|smc)$/i.test(name))throw Error('SNES aún no está admitido: requiere integrar y validar un emulador SNES para Ndless.');
  return inspect(bytes);
}
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
  if(b.length>=4&&b.subarray(0,2).toString()==='PK')return{system:'ZIP',archive:true,convertible:size<=16*1024*1024,title:name,reason:'Selecciona una ROM o un ZIP individual, no un paquete completo.'};
  if(b.subarray(0,4).equals(Buffer.from([78,69,83,26]))){system='NES';return{...inspectNes(b,name,size),convertible:true};}
  if(b.length>=0x150&&(b.subarray(0x104,0x134).equals(GB_LOGO)||/\.(gb|gbc)$/i.test(name))){system=b[0x143]&128?'GBC':'GB';return{...inspectGb(b,size),convertible:true};}
  if(b.length>=64&&[0x80371240,0x37804012,0x40123780].includes(b.readUInt32BE(0))){system='N64';const header=Buffer.from(b.subarray(0,b.length-b.length%4)),magic=header.readUInt32BE(0);if(magic===0x37804012)header.swap16();else if(magic===0x40123780)header.swap32();title=header.subarray(32,52).toString('ascii').replace(/\0.*$/,'').trim();return{system,title,format:'Nintendo 64',convertible:size===8388608&&title==='SUPER MARIO 64'&&header[62]===80,reason:'Detectada Nintendo 64: el perfil disponible admite Super Mario 64 europeo original. Otros juegos requieren un backend N64.'};}
  if(b.length>=0xc0&&b[0xb2]===0x96&&b.subarray(4,8).equals(Buffer.from('24ffae51','hex'))){system='GBA';title=b.subarray(0xa0,0xac).toString('ascii').replace(/\0.*$/,'').trim();}
  else if(b.length>=0x160&&b.readUInt16LE(0x15c)===0xcf56&&b.subarray(0xc0,0xc4).equals(Buffer.from('24ffae51','hex'))){system='NDS';title=b.subarray(0,12).toString('ascii').replace(/\0.*$/,'').trim();}
  else if(b.length>=0x110&&b.subarray(0x100,0x104).toString()==='SEGA'){system='Mega Drive / Genesis';}
  else for(const offset of [0x7fc0,0xffc0,0x81c0,0x101c0])if(b.length>=offset+32&&(b.readUInt16LE(offset+28)^b.readUInt16LE(offset+30))===65535&&b.readUInt16LE(offset+30)!==0){system='SNES';title=b.subarray(offset,offset+21).toString('ascii').trim();break;}
  if(system==='Unknown'&&/\.(sfc|smc)$/i.test(name))system='SNES';
  return{system,title,convertible:false,reason:system==='Unknown'?'No se reconoce una cabecera de ROM compatible.':system+' detectado: aún no hay un backend de conversión y preview integrado para este sistema.'};
 }catch(error){return{system,title,convertible:false,reason:error.message};}
}
module.exports = { normalize, inspect, inspectRom, inspectNes, normalizeNes, inspectGb, detect, GB_LOGO, mio0, SM64_EU_SHA1 };
