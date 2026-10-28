const test=require('node:test'),assert=require('node:assert/strict');
const profile=require('../desktop/project-build.cjs');
test('SDK project profile accepts explicit sources and rejects commands and escaping paths',()=>{
 const p=profile.validate({version:1,sources:['src/main.c','generated/data.c'],includeDirectories:['.','include'],defines:['VERSION_EU','VALUE=2'],common:true});assert.equal(p.sources.length,2);assert.equal(p.common,true);
 for(const name of ['../escape.c','/outside.c','C:/outside.c','src\\main.c','a/../b.c','a/.. /b.c','a/con.c'])assert.throws(()=>profile.validate({version:1,sources:[name]}));
 assert.throws(()=>profile.validate({version:1,sources:['main.c'],defines:['VALUE=1 -include secret']}));
 assert.throws(()=>profile.validate({version:1,sources:['main.c'],optimization:'O2; calc'}));
 assert.throws(()=>profile.validate({version:1,sources:['run.exe']}));
});
test('explicit source profile compiles only listed C files and honors includes, defines and common symbols',
 {skip:process.platform!=='win32'||!process.env.TNS_DESKTOP_COMPILER,timeout:30000},async()=>{
 const {build,preview}=require('./helpers/ndless-native.cjs');
 const meta={settings:{build:{version:1,sources:['src/main.c','src/other.c'],includeDirectories:['include'],defines:['COLOR=2016'],common:true}}};
 const a=await build('explicit-profile',{'.tnsproject.json':JSON.stringify(meta),'src/main.c':'#include <os.h>\n#include "value.h"\nint shared;static unsigned short p[76800];int main(){for(int i=0;i<76800;i++)p[i]=color();lcd_init(0);lcd_blit(p,0);while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}', 'src/other.c':'#include "value.h"\nint shared;int color(){shared=COLOR;return shared;}','include/value.h':'int color(void);','not-a-source.c':'this file must not compile'});
 assert.ok(a.logs.some(s=>s.includes('2 translation units')));
 await preview({bytes:a.bytes,observe:m=>m.frame&&(m.frame[10000]|m.frame[10001]<<8)===2016});
});
