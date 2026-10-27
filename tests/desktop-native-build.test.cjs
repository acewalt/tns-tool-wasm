const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {inflateSync}=require('node:zlib');
const compiler=require('../desktop/compiler.cjs');
const exe=process.env.TNS_DESKTOP_COMPILER;

test('bundled Ndless SDK compiles allocation and visible SDL starters with official PRG loader',
  {skip:process.platform!=='win32'||!exe},async()=>{
    const window={};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ti-calculator-zip.js'),'utf8'),
      {window,TextEncoder,Uint8Array,Uint32Array,DataView,Date,Array,Error});
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ndless-project-core.js'),'utf8'),{window});
    const status=await compiler.status(exe);
    assert.equal(status.toolchainReady,true);
    assert.ok(status.sdk?.sdkSha256,'Official SDK provenance must be available');
    const cases=[['c','main.c',`#define OLD_SCREEN_API
#include <stdio.h>
#include <stdlib.h>
#include <libndls.h>
int main(void){int *p=malloc(sizeof(int));if(!p)return 1;*p=42;printf("C: %d\\n",*p);free(p);wait_key_pressed();return 0;}`],
    ['cpp','main.cpp',`#define OLD_SCREEN_API
#include <cstdio>
#include <vector>
#include <libndls.h>
int main(){std::vector<int> values{1,2,3};std::printf("C++: %u\\n",(unsigned)values.size());wait_key_pressed();return 0;}`]];
    for(const language of ['c','cpp'])for(const template of ['basic','graphics']){
      const project=window.NdlessProjectCore.createProject({language,template,target:'zehn-modern'});
      cases.push([language+'-'+template,project.activeFile,project.files[project.activeFile],true]);
    }
    for(const [language,filename,source,modernScreen] of cases){
      const zip=window.TnsCalculatorZip.pack([{path:filename,data:new TextEncoder().encode(source)}]);
      const result=await compiler.build(exe,{name:'sdk-test-'+language,zip});
      const bytes=Buffer.from(result.bytes);
      assert.equal(result.format,'prg-zehn');
      assert.equal(bytes.subarray(0,4).toString('hex'),'50524700');
      let offset=-1;
      for(let at=4;at<Math.min(bytes.length-32,20*1024);at+=4)
        if(bytes.toString('ascii',at,at+4)==='Zehn' && bytes.readUInt32LE(at+4)===1){offset=at;break;}
      assert.ok(offset>0,'A valid Zehn must be embedded in the PRG');
      const zehn=bytes.subarray(offset),info=compiler.zehnInfo(zehn);
      const relocs=zehn.readUInt32LE(12),flags=zehn.readUInt32LE(16);
      const meta=32+4*(relocs+flags)+zehn.readUInt32LE(20);
      const executable=info.compressed?inflateSync(zehn.subarray(meta)):zehn.subarray(meta);
      assert.ok(executable.length>0 && executable.length<=zehn.readUInt32LE(24)-meta);
      if(modernScreen){
        const values=new Map();
        for(let i=0;i<flags;i++){
          const flag=zehn.readUInt32LE(32+4*(relocs+i));
          values.set(flag&255,flag>>>8);
        }
        assert.equal(values.get(13),1,'SDL starter must use lcd_blit');
        assert.equal(values.get(12),1,'SDL starter must support newer LCD hardware');
      }
      for(let i=0;i<relocs;i++){
        const entry=zehn.readUInt32LE(32+i*4),type=entry&255,address=entry>>>8;
        assert.ok(type<=4,'Unknown relocation type');
        if(type<=2)assert.ok(address+4<=zehn.readUInt32LE(24)-meta,'Relocation out of allocation');
      }
    }
  });
