const test=require('node:test'),assert=require('node:assert/strict');
const {makeSources,defaultSources}=require('../desktop/project-sources.cjs');
const {validate}=require('../desktop/project-build.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

test('root wildcard Makefile excludes independent test executables',()=>{
 const files=['main.c','inverse_laplace.c','laplace_engine.c','math_draw.c','tests/test_engine.c','tests/test_inverse.c'];
 const make='GCCFLAGS = -Wall -Os -marm -Iinclude -DAPP=1\nC_OBJS = $(patsubst %.c,%.o,$(wildcard *.c))\nOBJS = $(C_OBJS)\nall:\n\t$(shell this-must-never-run)\n';
 const profile=makeSources(make,files);
 assert.deepEqual(profile.sources,['inverse_laplace.c','laplace_engine.c','main.c','math_draw.c']);
 assert.equal(profile.optimization,'Os');assert.deepEqual(profile.includeDirectories,['.','include']);assert.deepEqual(profile.defines,['APP=1']);
 assert.equal(validate(profile).sources.length,4);
});

test('explicit source lists keep nested app sources and test sources when requested',()=>{
 const files=['src/main.cpp','src/engine.cpp','tests/fixture.cpp','tests/other.cpp'];
 const make='SOURCES := src/main.cpp src/engine.cpp \\\n  tests/fixture.cpp\n';
 assert.deepEqual(makeSources(make,files).sources,['src/main.cpp','src/engine.cpp','tests/fixture.cpp']);
});

test('common make filters and object substitutions resolve archive files only',()=>{
 const files=['src/main.c','src/engine.c','src/test_tool.c'];
 const make='SRC = $(filter-out src/test_tool.c,$(wildcard src/*.c))\nOBJS = $(SRC:.c=.o)\n';
 assert.deepEqual(makeSources(make,files).sources,['src/engine.c','src/main.c']);
});

test('source expressions cannot run shell commands or silently include unrelated files',()=>{
 assert.throws(()=>makeSources('SOURCES = $(shell find . -name *.c)',['main.c']),/Unsupported Makefile source function: shell/);
 assert.throws(()=>makeSources('OBJS = missing.o',['main.c','tests/test.c']),/Cannot resolve Makefile source/);
 assert.throws(()=>makeSources('OBJS = $(OTHER)\nOTHER = $(OBJS)',['main.c']),/Circular Makefile/);
 assert.throws(()=>makeSources('SOURCES = $(wildcard absent/*.c)',['main.c']),/empty source list/);
});

test('generated recursive project source lists resolve C, C++ and ARM from the archive without a shell',()=>{
 const files=['main.c','src/helper.c','src/extra.cpp','asm/helper.S','assets/data.bin'];
 const make="C_SRCS = $(shell find . -type f -name '*.c')\nCPP_SRCS = $(shell find . -type f -name '*.cpp')\nASM_SRCS = $(shell find . -type f -name '*.S')\n";
 assert.deepEqual(makeSources(make,files).sources,['main.c','src/helper.c','src/extra.cpp','asm/helper.S']);
 for(const value of ["find . -type f -name '*.c'; echo unsafe", "find ../ -type f -name '*.c'", "find . -type f -name '*.c' -exec echo unsafe", "curl https://example.com"])
  assert.throws(()=>makeSources('SOURCES = $(shell '+value+')',files),/Unsupported Makefile source function: shell/);
});

test('default selection excludes test directories without deleting test files',()=>{
 const files=['src/main.c','src/engine.cpp','tests/unit/main.c','__tests__/a.c','contest/main.c'];
 assert.deepEqual(defaultSources(files).sources,['src/main.c','src/engine.cpp','contest/main.c']);
 assert.equal(files.length,5);assert.equal(defaultSources(['src/main.c']),null);
 assert.throws(()=>defaultSources(['tests/test.c']),/Only test sources/);
 assert.throws(()=>validate({version:1,sources:['../main.c']}),/Invalid project path/);
});

test('real ARM build honors application Makefile instead of linking test mains',
 {skip:process.platform!=='win32'||!process.env.TNS_DESKTOP_COMPILER},async()=>{
  if(process.env.TNS_DESKTOP_RESOURCES)process.resourcesPath=process.env.TNS_DESKTOP_RESOURCES;
  const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/ti-calculator-zip.js'),'utf8'),{window,TextEncoder,Uint8Array,Uint32Array,DataView,Date,Array,Error});
  const entries={
   '.tnsproject.json':JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'source-selection',settings:{}}),
   'Makefile':'C_OBJS = $(patsubst %.c,%.o,$(wildcard *.c))\nOBJS = $(C_OBJS)\n',
   'main.c':'extern int answer(void); int main(void){return answer()!=42;}',
   'engine.c':'int answer(void){return 42;}',
   'tests/test_engine.c':'#error Separate test executable must not be compiled into the application\nint main(void){return 1;}'
  };
  const zip=window.TnsCalculatorZip.pack(Object.entries(entries).map(([name,data])=>({path:name,data:new TextEncoder().encode(data)})));
  const info=await require('../desktop/project-build.cjs').profileFromArchive(zip,process.env.TNS_DESKTOP_COMPILER);
  assert.equal(info.archive.file('tests/test_engine.c')!==null,true);
  assert.deepEqual(info.profile.sources,['engine.c','main.c']);
  const result=await require('../desktop/compiler.cjs').build(process.env.TNS_DESKTOP_COMPILER,{name:'source-selection',zip});
  assert.equal(result.ok,true);assert.equal(result.format,'prg-zehn');assert.ok(result.bytes.length>100);
  assert.match(result.logs.join('\n'),/2 translation units \(Makefile OBJS\)/);
 });
