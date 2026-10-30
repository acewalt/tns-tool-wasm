// Adapt only the Ndless platform layer; the N64 CPU/RSP/software renderer stay intact.
const fs=require('node:fs/promises'),path=require('node:path');
function functionBody(text,name,body){const re=new RegExp('(?:^|\\n)[ \\t]*(?:static[ \\t]+)?(?:inline[ \\t]+)?(?:void|unsigned|u32|u16|int)[ \\t]+'+name+'\\s*\\([^;{}]*\\)\\s*\\{'),m=re.exec(text);if(!m)throw Error('N64 platform function missing: '+name);const start=m.index+m[0].length;let at=start,depth=1;while(depth&&at<text.length){if(text[at]==='{')depth++;else if(text[at]==='}')depth--;at++;}if(depth)throw Error('Unclosed N64 platform function');return text.slice(0,start)+body+text.slice(at-1);}
async function adapt(work,profile){
 const edit=async(file,fn)=>{const p=path.join(work,file);await fs.writeFile(p,fn(await fs.readFile(p,'utf8')));};
 await edit('Source/Input/NDLESS/InputManagerNDLESS.cpp',s=>s.replace('// Face buttons',
  'if(tns_preview_keys & (1u<<20)) pPad[0].button |= U_JPAD;\n'+
  'if(tns_preview_keys & (1u<<21)) pPad[0].button |= D_JPAD;\n'+
  'if(tns_preview_keys & (1u<<22)) pPad[0].button |= L_JPAD;\n'+
  'if(tns_preview_keys & (1u<<23)) pPad[0].button |= R_JPAD;\n// Face buttons'));
 profile.sources=profile.sources.filter(s=>!s.startsWith('Source/DynaRec/ARM/')&&!s.startsWith('Source/SysNDLESS/Utility/')&&!s.startsWith('Source/SysNDLESS/UI/'));
 for(const item of await fs.readdir(path.join(work,'Source/DynaRec/dummy')))if(item.endsWith('.cpp'))profile.sources.push('Source/DynaRec/dummy/'+item);
 let names=new Set();for(const file of profile.sources){const text=await fs.readFile(path.join(work,file),'utf8');for(const m of text.matchAll(/\bKEY_NSPIRE_\w+/g))names.add(m[0]);}
 const aliases={KEY_NSPIRE_8:0,KEY_NSPIRE_2:1,KEY_NSPIRE_4:2,KEY_NSPIRE_6:3,KEY_NSPIRE_MINUS:4,KEY_NSPIRE_PLUS:5,KEY_NSPIRE_CTRL:8,KEY_NSPIRE_SHIFT:6,KEY_NSPIRE_VAR:9,KEY_NSPIRE_ENTER:10,KEY_NSPIRE_ESC:12,KEY_NSPIRE_UP:16,KEY_NSPIRE_DOWN:17,KEY_NSPIRE_LEFT:18,KEY_NSPIRE_RIGHT:19};
 const header='#pragma once\n#include <stdio.h>\n#include <sys/stat.h>\n#include <stdlib.h>\n#include <string.h>\n#include <emscripten.h>\nextern unsigned tns_preview_keys,tns_frame_count;\nextern unsigned short tns_n64_pixels[76800];\n'+[...names].map(n=>'#define '+n+' '+(aliases[n]??31)).join('\n')+'\n#define SCR_320x240_565 0\n#define SCR_TYPE_INVALID -1\nstatic inline int lcd_type(){return 0;}\nstatic inline int lcd_init(int){return 1;}\nstatic inline void lcd_blit(const void *p,int){memcpy(tns_n64_pixels,p,153600);++tns_frame_count;}\nstatic inline int isKeyPressed(unsigned key){return (tns_preview_keys>>key)&1;}\nstatic inline int on_key_pressed(){return 0;}\nstatic inline void show_msgbox(const char *t,const char *s){fprintf(stderr,"%s: %s\\n",t,s);}\n';
 await fs.writeFile(path.join(work,'libndls.h'),header);await fs.writeFile(path.join(work,'os.h'),'#include "libndls.h"\n');
 await fs.mkdir(path.join(work,'nspireio'),{recursive:true});await fs.writeFile(path.join(work,'nspireio/nspireio.h'),'#pragma once\n');
 await edit('Source/Debug/Checkpoint.h',s=>{
  s='#include <emscripten.h>\n'+s;s=functionBody(s,'Daedalus_TimerInit','');s=functionBody(s,'Daedalus_Ticks','return (unsigned)(emscripten_get_now()*32.768);');return s;
 });
 await edit('Source/SysNDLESS/Graphics/GraphicsContextNDLESS.cpp',s=>{
  s=functionBody(s,'NdRunMemBenchmarks','');for(const name of ['ReadCP15_MainID','ReadCP15_CacheType','ReadCP15_Control','ReadCP15_DTCM','ReadCP15_ITCM'])s=functionBody(s,name,'return 0;');return s;
 });
 await edit('Source/Core/CPU.cpp',s=>{
  // A worker executes the interpreter only, in bounded slices. Keep the native
  // ARM dynarec in native builds; it cannot execute inside WebAssembly.
  s=functionBody(s,'CPU_SelectCore','Inter_SelectCore();');
  return s.replace('gVerticalInterrupts++;','gVerticalInterrupts++;\nCPU_Halt("preview vertical blank");');
 });
 await edit('Source/Core/Interpret.cpp',s=>'extern unsigned tns_instruction_budget;\n'+s.replace('CPU_EXECUTE_OP< false >();','CPU_EXECUTE_OP< false >();\nif (--tns_instruction_budget == 0) CPU_Halt("preview timeslice");'));
 await edit('Source/SysNDLESS/main.cpp',s=>{
  s=s.replace(/#define ND_READ_CPSR\(dst\)[^\n]+/,'#define ND_READ_CPSR(dst) ((dst)=0)').replace('int main(int argc, char* argv[])','int n64_unused_main(int argc, char* argv[])');
  return s+'\nunsigned tns_preview_keys,TNS_ROM_SIZE,tns_instruction_budget,tns_frame_count;\nconst unsigned char *tns_rom_data;\nunsigned short tns_n64_pixels[76800];\nextern "C" {\nint tns_load(const unsigned char *p,unsigned n){tns_rom_data=p;TNS_ROM_SIZE=n;mkdir("/documents",0700);Initialize();if(!System_Open("embedded.z64"))return 1;CPU_SelectCore();return 0;}\nunsigned tns_step(unsigned keys){tns_preview_keys=keys;tns_instruction_budget=200000;CPU_Run();return tns_frame_count;}\nunsigned tns_debug_pc(){return gCPUState.CurrentPC;}\nunsigned short *tns_pixels(){return tns_n64_pixels;}\nstatic unsigned char save_data[262144];\nunsigned char *tns_save(){memcpy(save_data,g_pMemoryBuffers[MEM_SAVE],131072);memcpy(save_data+131072,g_pMemoryBuffers[MEM_MEMPACK],131072);return save_data;}\nunsigned tns_save_size(){return 262144;}\nvoid tns_restore_save(const unsigned char *data,unsigned size){if(size==262144){memcpy(g_pMemoryBuffers[MEM_SAVE],data,131072);memcpy(g_pMemoryBuffers[MEM_MEMPACK],data+131072,131072);}}\n}\n';
 });
 // Cache management is unnecessary for WebAssembly's interpreter-only core.
 const cache='extern "C" {void clear_cache(void*,void*){} void clean_dcache(){} void invalidate_icache(){} void flush_cache(){} void __clear_cache(void*,void*){}}\n';
 await fs.writeFile(path.join(work,'preview-cache.cpp'),cache);profile.sources.push('preview-cache.cpp');
}
module.exports={adapt};
