const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
async function create(bytes){
 const mod={exports:{}},factory=vm.runInThisContext('(function(module,exports){'+fs.readFileSync(path.join(root,'desktop/vendor/rom/binjgb.js'),'utf8')+';return module.exports;})')(mod,mod.exports);
 const core=await factory({wasmBinary:fs.readFileSync(path.join(root,'desktop/vendor/rom/binjgb.wasm')),print:()=>{},printErr:()=>{}}),ptr=core._malloc(bytes.length);core.HEAPU8.set(bytes,ptr);
 const emulator=core._emulator_new_simple(ptr,bytes.length,8000,256,0);if(!emulator)throw Error('Invalid GB/GBC cartridge');const joy=core._joypad_new();core._emulator_set_default_joypad_callback(emulator,joy);
 function ram(input){const file=core._ext_ram_file_data_new(emulator),size=core._get_file_data_size(file),at=core._get_file_data_ptr(file);if(input){if(input.length!==size)throw Error('RAM size mismatch');core.HEAPU8.set(input,at);core._emulator_read_ext_ram(emulator,file);}core._emulator_write_ext_ram(emulator,file);const out=core.HEAPU8.slice(at,at+size);core._file_data_delete(file);return out;}
 return{core,emulator,ram,key(name,value){core['_set_joyp_'+name](emulator,value?1:0);},step(){const until=core._emulator_get_ticks_f64(emulator)+70224;let event,frame=false;do{event=core._emulator_run_until_f64(emulator,until);if(event&16)throw Error('Invalid GB/GBC opcode');frame||=!!(event&1);}while(!(event&4));return frame;},frame(){const at=core._get_frame_buffer_ptr(emulator),p=core.HEAPU8,out=new Uint8Array(153600);for(let y=0;y<240;y++)for(let x=0;x<266;x++){const i=at+(Math.floor(y*144/240)*160+Math.floor(x*160/266))*4,w=(p[i]>>3)<<11|(p[i+1]>>2)<<5|p[i+2]>>3,d=(y*320+x+27)*2;out[d]=w&255;out[d+1]=w>>>8;}return out;},close(){core._joypad_delete(joy);core._emulator_delete(emulator);}};
}
module.exports={create};
