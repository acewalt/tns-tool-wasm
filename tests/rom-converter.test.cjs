const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const data=require('../desktop/rom-data.cjs'),converter=require('../desktop/rom-converter.cjs');
const cartridge=require('../desktop/rom-test-cartridge.cjs');
test('port text encoding preserves comments and literals and uses longest charmap entries',()=>{
 const {convert}=require('../desktop/rom-text.cjs');
 const map="'a' = 0x0A\n'b' = 0x0B\n'ab' = 0x22\n'\\n' = 0xFE\n";
 const source='// _("ab")\nconst char *s="_(\\"ab\\")";\nint x[]={_("ab" "\\n")};int y[]={__("ab")};';
 const output=convert(source,map);assert.ok(output.includes('// _("ab")'));assert.ok(output.includes('"_(\\"ab\\")"'));assert.ok(output.includes('{0x22,0xFE,0xFF}'));assert.ok(output.includes('{0x0A,0x0B,0xFF}'));
});
test('SM64 conversion profile contains extraction locations instead of ROM byte arrays',()=>{
 const profile=require('../desktop/rom/sm64-eu-profile.json');assert.equal(profile.recipes.length,1246);assert.equal(profile.recipes.reduce((n,r)=>n+r.chunks.length,0),1855);
 for(const recipe of profile.recipes){assert.ok(!recipe.template||!/(?:0x[\da-fA-F]{1,2},\s*){8,}/.test(recipe.template));for(const chunk of recipe.chunks)assert.deepEqual(Object.keys(chunk).sort(),chunk.token?['block','length','start','token']:['block','length','start']);}
});
test('N64 byte orders normalize identically without changing the selected file',()=>{
 const rom=Buffer.alloc(8388608);rom.writeUInt32BE(0x80371240);rom[51]=177;
 for(const [name,copy]of [['z64',rom],['v64',Buffer.from(rom).swap16()],['n64',Buffer.from(rom).swap32()]]){const original=Buffer.from(copy),r=data.normalize(copy);assert.equal(r.byteOrder,name);assert.deepEqual(r.bytes,rom);assert.deepEqual(copy,original);}
 assert.throws(()=>data.inspect(rom),/no admitida/);assert.throws(()=>data.normalize(Buffer.alloc(10)),/8 MiB/);
});
test('MIO0 handles literals and overlapping back references and rejects invalid streams',()=>{
 const encoded=Buffer.alloc(22);encoded.write('MIO0');encoded.writeUInt32BE(9,4);encoded.writeUInt32BE(17,8);encoded.writeUInt32BE(19,12);encoded[16]=224;encoded.writeUInt16BE(0x3002,17);encoded.write('ABC',19);
 assert.equal(data.mio0(encoded).toString(),'ABCABCABC');const bad=Buffer.from(encoded);bad.writeUInt16BE(0x300f,17);assert.throws(()=>data.mio0(bad),/Referencia/);assert.throws(()=>data.mio0(encoded.subarray(0,20)),/truncado/);
});
test('NES validation reports mapper support, malformed headers and unsupported systems explicitly',()=>{
 const rom=cartridge(),info=data.inspectRom(rom,'test.nes');assert.equal(info.id,'nes');assert.equal(info.mapper,0);assert.equal(info.prgBytes,16384);
 const altered=Buffer.from(rom);altered[6]=0xc0;assert.throws(()=>data.inspectNes(altered),/Mapper NES 12/);altered[7]=8;altered[8]=16;assert.throws(()=>data.inspectNes(altered),/NES 2.0/);
 const modern=Buffer.from(rom);modern[7]=8;modern[15]=1;assert.equal(data.inspectNes(modern).normalizedForEmulator,true);const normalized=data.normalizeNes(modern);assert.equal(normalized[7]&12,0);assert.equal(normalized[15],0);assert.deepEqual(normalized.subarray(16),Buffer.from(rom).subarray(16));assert.equal(modern[7],8);
 assert.throws(()=>data.inspectNes(rom.subarray(0,100)),/truncado/);assert.throws(()=>data.inspectRom(Buffer.alloc(32768),'test.sfc'),/SNES/);
});
test('automatic header detection distinguishes GB/GBC and validates SNES, GBA and DS headers',()=>{
 const make=require('../desktop/rom-test-gb.cjs');for(const color of [false,true]){const bytes=make({color});assert.equal(data.detect(bytes.subarray(0,0x150),{name:'renamed.bin',size:bytes.length}).system,color?'GBC':'GB');assert.equal(data.inspectRom(bytes,'not-a-game.txt').id,'gb');}
 const broken=Buffer.from(make());broken[0x134]^=1;assert.equal(data.detect(broken,{name:'bad.gbc'}).convertible,false);
 const gba=Buffer.alloc(512);gba.set(Buffer.from('24ffae51','hex'),4);gba[0xb2]=0x96;assert.equal(data.detect(gba).system,'GBA');assert.equal(data.detect(gba).convertible,false);
 for(const system of ['snes','gba','nds']){const bytes=require('../desktop/rom-test-'+system+'.cjs')(),info=data.detect(bytes,{name:'renamed.bin'});assert.equal(info.id,system);assert.equal(info.convertible,true);assert.equal(data.inspectRom(bytes,'renamed.bin').id,system);}
 const legacySnes=require('../desktop/rom-test-snes.cjs')();legacySnes[0x7fd5]=0;assert.equal(data.detect(legacySnes).convertible,true);
 legacySnes[0x7fd5]=83;assert.equal(data.detect(legacySnes).format,'LoROM');
 assert.equal(data.detect(Buffer.from('unknown')).convertible,false);
});
test('ROM RAM storage is bounded, hash scoped and survives a new storage instance',async()=>{
 const os=require('node:os'),storage=require('../desktop/rom-saves.cjs'),root=await fs.mkdtemp(path.join(os.tmpdir(),'tns-rom-save-test-')),hash='a'.repeat(40);
 try{const save=storage.create(root);assert.equal(await save.load(hash),null);await save.save({hash,bytes:new Uint8Array([3,4,5])});assert.deepEqual(await storage.create(root).load(hash),new Uint8Array([3,4,5]));await assert.rejects(save.save({hash:'../escape',bytes:new Uint8Array(1)}));await assert.rejects(save.save({hash,bytes:new Uint8Array(1024*1024+1)}));}
 finally{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('tns-rom-save-test-'));await fs.rm(root,{recursive:true,force:true});}
});
test('GB/GBC direct core animates, responds to the controller and roundtrips battery RAM',
 {skip:!process.env.TNS_DESKTOP_COMPILER,timeout:15000},async()=>{
 const {create}=require('./helpers/gb-direct.cjs');
 for(const color of [false,true]){const game=await create(require('../desktop/rom-test-gb.cjs')({color,battery:true}));try{const hashes=new Set();for(let i=0;i<30;i++){game.step();hashes.add(Buffer.from(game.frame()).toString('base64'));}assert.ok(hashes.size>3);assert.equal(game.ram()[1],1);game.key('A',true);for(let n=0;n<3;n++)game.step();assert.equal(game.ram()[1],0);const ram=game.ram();assert.ok(ram.some(n=>n!==0));ram[0]=173;assert.equal(game.ram(ram)[0],173);}finally{game.close();}}
});
test('GB/GBC ROM exports an editable ARM source project and compiles with the bundled SDK',
 {skip:!process.env.TNS_DESKTOP_COMPILER,timeout:30000},async()=>{
 const rom=require('../desktop/rom-test-gb.cjs')(),result=await converter.convert(rom,{name:'renamed.bin'}),Z=await converter.zipLibrary(),zip=await Z.loadAsync(result.zip),meta=JSON.parse(await zip.file('.tnsproject.json').async('string'));
 assert.equal(meta.settings.romConversion.system,'GBC');assert.equal(meta.settings.build.sources.length,4);assert.deepEqual(result.previewRom,rom);
 const output=await require('../desktop/compiler.cjs').build(process.env.TNS_DESKTOP_COMPILER,{name:result.name,zip:result.zip});assert.ok(output.bytes.length>50000);assert.equal(output.format,'prg-zehn');
});
test('public NES template exports a self-contained editable source project from raw and zipped cartridges',
 {skip:!process.env.TNS_DESKTOP_COMPILER,timeout:30000},async()=>{
 const JSZip=await converter.zipLibrary(),rom=cartridge(),archive=new JSZip();archive.file('a/game.nes',rom);
 for(const input of [rom,await archive.generateAsync({type:'uint8array'})]){
  const result=await converter.convert(input,{name:'test.nes'}),zip=await JSZip.loadAsync(result.zip),meta=JSON.parse(await zip.file('.tnsproject.json').async('string'));
  assert.equal(meta.settings.romConversion.mapper,0);assert.equal(meta.language,'cpp');assert.equal(meta.settings.build.sources.length,5);
  assert.ok((await zip.file('embedded_rom.h').async('string')).includes('tns_rom_data'));assert.ok(!Object.keys(zip.files).some(n=>/\.(n64|nes|tns)$/i.test(n)));
 }
 archive.file('second.nes',rom);await assert.rejects(converter.convert(await archive.generateAsync({type:'uint8array'})),/una sola ROM/);
});
test('converted NES project compiles and animates without an external cartridge resource',
 {skip:!process.env.TNS_DESKTOP_COMPILER,timeout:40000},async()=>{
 const result=await converter.convert(cartridge(),{name:'fixture.nes'}),artifact=await require('../desktop/compiler.cjs').build(process.env.TNS_DESKTOP_COMPILER,{name:result.name,zip:result.zip});
 const report=await require('./helpers/ndless-native.cjs').preview({bytes:artifact.bytes,observe:(m,{stats})=>stats.frames>=4&&stats.hashes.size>=3});assert.ok(report.hashes.size>=3);
});
