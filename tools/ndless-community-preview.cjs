/* Reproducible integration tests of real community ARM games. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),zlib=require('node:zlib');
const {root,pack,build,preview}=require('../tests/helpers/ndless-native.cjs');
const cache=path.resolve(process.env.TNS_COMMUNITY_CACHE||path.join(root,'release/community-preview'));
const projects={ndoom:{url:'https://github.com/critor/ndoom.git',commit:'deca0127ec83d1401d62cee380e5f35a93ad1863',source:'source'},nesnspire:{url:'https://github.com/mihkeymouse/NesNspire.git',commit:'b7b6e48c6e5229eada88deccffebdb21518e4fbd',source:'src'}};
const wadZipSha='3f9b264f3e3ce503b4fb7f6bdcb1f419d93c7b546f4df3e874dd878db9688f59';
const wadSha='7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function git(args,cwd){return cp.execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();}
async function prepare(){
 fs.mkdirSync(cache,{recursive:true});
 for(const [name,p] of Object.entries(projects)){
  const dir=path.join(cache,name);
  if(!fs.existsSync(path.join(dir,'.git')))git(['clone','--depth','1',p.url,dir],root);
  if(git(['rev-parse','HEAD'],dir)!==p.commit){git(['fetch','--depth','1','origin',p.commit],dir);git(['checkout','--detach',p.commit],dir);}
  if(git(['status','--porcelain'],dir))throw Error('Community source has local changes: '+dir);
 }
 const zip=path.join(cache,'freedoom-0.13.0.zip');
 if(!fs.existsSync(zip)){const response=await fetch('https://github.com/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0.zip');if(!response.ok)throw Error('Freedoom download '+response.status);fs.writeFileSync(zip,Buffer.from(await response.arrayBuffer()));}
 if(hash(fs.readFileSync(zip))!==wadZipSha)throw Error('Freedoom ZIP checksum mismatch');
 const wad=path.join(cache,'freedoom1.wad');
 if(!fs.existsSync(wad))cp.execFileSync(process.env.PYTHON||'python',['-c','import sys,zipfile,pathlib; z=zipfile.ZipFile(sys.argv[1]); pathlib.Path(sys.argv[2]).write_bytes(z.read("freedoom-0.13.0/freedoom1.wad"))',zip,wad],{windowsHide:true});
 if(hash(fs.readFileSync(wad))!==wadSha)throw Error('Freedoom WAD checksum mismatch');
 console.log('Pinned community sources and Freedoom hashes verified');
}
function sources(name){
 const result={},p=projects[name];
 function walk(dir,prefix=''){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(ent.name.startsWith('.'))continue;const rel=prefix+ent.name,full=path.join(dir,ent.name);if(ent.isDirectory())walk(full,rel+'/');else if(/\.(c|cpp|cc|cxx|s|h|hpp|inc)$/i.test(rel)){
  let text=fs.readFileSync(full,'utf8'),dest=rel;
  if(name==='ndoom'){
   text=text.replace(/^([ \t]*(?:char|uint16_t|touchpad_report_t)[ \t*]+(?:doomwad\[64\]|doomsav\[32\]|sscreen|tpreport))\s*;/gm,'$1 __attribute__((common));').replace(/^(unsigned char sscreen\[SCREEN_SIZE\])\s*;/gm,'$1 __attribute__((common));');
   if(/\.c$/i.test(rel))text='#define OLD_SCREEN_API\n#pragma GCC diagnostic warning "-Wimplicit-function-declaration"\n#pragma GCC diagnostic warning "-Wint-conversion"\n#pragma GCC diagnostic warning "-Wincompatible-pointer-types"\n#pragma GCC diagnostic warning "-Wimplicit-int"\n#pragma GCC diagnostic ignored "-Wmisleading-indentation"\n'+text;
  }else{
   if(rel.startsWith('mapper/')&&rel.endsWith('.cpp'))dest=rel.slice(0,-4)+'.inc';
   text=text.replace(/(mapper\/InfoNES_Mapper_\d+)\.cpp/g,'$1.inc');
   if(/\.cpp$/i.test(rel))text='#include <strings.h>\n'+text;
  }
  result[dest]=text;
 }}}
 walk(path.join(cache,name,p.source));
 result.LICENSE=fs.readFileSync(path.join(cache,name,'LICENSE'),'utf8');
 const active=Object.keys(result).find(n=>/\.(c|cpp)$/.test(n)&&/int\s+main\s*\(/.test(result[n]));
 result['.tnsproject.json']=JSON.stringify({type:'tns-tool-ndless-project',version:1,name,language:name==='ndoom'?'c':'cpp',template:'basic',target:'zehn-modern',activeFile:active,settings:{}},null,2);
 return result;
}
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function png(filename,frame){
 const row=Buffer.alloc(240*(1+320*3));for(let y=0;y<240;y++)for(let x=0;x<320;x++){const p=(y*320+x)*2,w=frame[p]|frame[p+1]<<8,at=y*961+1+x*3;row[at]=(w>>>11)*255/31;row[at+1]=((w>>>5)&63)*255/63;row[at+2]=(w&31)*255/31;}
 const chunk=(name,data)=>{const type=Buffer.from(name),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([head,type,data,tail]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(320);header.writeUInt32BE(240,4);header[8]=8;header[9]=2;
 fs.writeFileSync(filename,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(row)),chunk('IEND',Buffer.alloc(0))]));
}
function colors(frame){const result=new Set();for(let i=0;i<frame.length;i+=2)result.add(frame[i]|frame[i+1]<<8);return result;}
function difference(a,b,rect){let n=0,total=0;for(let y=rect.y;y<rect.y+rect.h;y++)for(let x=rect.x;x<rect.x+rect.w;x++){const at=(y*320+x)*2;if(a[at]!==b[at]||a[at+1]!==b[at+1])n++;total++;}return n/total;}
async function testNes(bytes){
 const rom=require('../tests/fixtures/nes-homebrew.cjs')();let phase='browser',baseline=null,requested=false;
 const result=await preview({bytes,files:[['preview-homebrew.nes.tns',rom]],args:['/documents/nesnspire.tns'],timeoutMs:30000,observe(m,{key,requestFiles,stats}){
  stats.phase=phase;
  if(m.frame){const set=colors(m.frame);
   if(phase==='browser'&&set.size>=6){key('Enter',true);phase='loading';}
   else if(phase==='loading'&&set.size===4){key('Enter',false);baseline=set;png(path.join(cache,'nes-before-input.png'),m.frame);key('ControlLeft',true);phase='input';}
   else if(phase==='input'&&[...set].some(c=>!baseline.has(c))&&stats.frames>5){png(path.join(cache,'nes-after-input.png'),m.frame);key('ControlLeft',false);key('Home',true);phase='exit';}
  }
  if(m.stage==='exited'&&phase==='exit'&&!requested){requested=true;requestFiles();}
  if(m.type==='files'){const log=m.files.find(f=>f.path.endsWith('/InfoNES.log'));const text=log?Buffer.from(log.bytes).toString('utf8'):'';if(!text.includes('ROM loaded')||!text.includes('Quit'))throw Error('NesNspire did not load and exit normally');fs.writeFileSync(path.join(cache,'nes-log.txt'),text);return true;}
  return false;
 }});
 return{game:'NesNspire',source:projects.nesnspire,frames:result.frames,distinct:result.hashes.size,ms:result.elapsedMs,browser:true,controller:true,cleanExit:true,rom:'Original animated/input-sensitive NROM fixture'};
}
async function testDoom(bytes){
 let phase='menus',start=0,before=null,turned=null,bootMs=0,camera=0,fire=0,keys=null;
 const pulse=setInterval(()=>{if(phase==='menus'&&keys){keys('Enter',true);setTimeout(()=>keys?.('Enter',false),200);}},1000);
 try{
 const result=await preview({bytes,files:[['freedoom1.wad',new Uint8Array(fs.readFileSync(path.join(cache,'freedoom1.wad')))]],args:['/documents/ndoom.tns','/documents/freedoom1.wad'],timeoutMs:155000,observe(m,{key,stats}){
  keys=key;if(!m.frame)return false;const now=performance.now(),set=colors(m.frame);
  if(phase==='menus'&&stats.logs.some(s=>s.includes('heap OK'))&&set.size>30&&set.size<=256){
   phase='turn';clearInterval(pulse);key('Enter',false);before=m.frame;bootMs=stats.elapsedMs;start=now;png(path.join(cache,'doom-before-input.png'),m.frame);key('ArrowRight',true);console.log('nDoom entered the first 3D map after '+bootMs+' ms');
  }else if(phase==='turn'&&now-start>8000){
   camera=difference(before,m.frame,{x:10,y:25,w:300,h:125});if(camera<.15)return false;
   key('ArrowRight',false);turned=m.frame;png(path.join(cache,'doom-after-turn.png'),m.frame);key('ControlLeft',true);phase='fire';start=now;
  }else if(phase==='fire'&&now-start>8000){
   fire=difference(turned,m.frame,{x:0,y:185,w:50,h:30});if(fire<.003)return false;
   key('ControlLeft',false);png(path.join(cache,'doom-after-fire.png'),m.frame);return true;
  }
  return false;
 }});
 return{game:'nDoom',source:projects.ndoom,wadSha256:wadSha,frames:result.frames,distinct:result.hashes.size,ms:result.elapsedMs,firstMapMs:bootMs,cameraChange:camera,ammoHudChange:fire,palette:true};
 }finally{clearInterval(pulse);}
}
async function main(){
 await prepare();if(process.argv.includes('--prepare-only'))return;
 const results=[];
 for(const name of ['nesnspire','ndoom'].filter(n=>!process.env.TNS_COMMUNITY_GAME||n===process.env.TNS_COMMUNITY_GAME)){
  const files=sources(name);fs.writeFileSync(path.join(cache,name+'-project.zip'),pack(files));
  console.log('Building pinned '+name+' source');const artifact=await build(name,files);fs.writeFileSync(path.join(cache,name+'.tns'),artifact.bytes);
  const result=await(name==='ndoom'?testDoom(artifact.bytes):testNes(artifact.bytes));results.push(result);fs.writeFileSync(path.join(cache,'report.json'),JSON.stringify({ok:true,results},null,2));console.log(JSON.stringify(result));
 }
}
if(require.main===module)main().catch(error=>{console.error(error.stack);fs.mkdirSync(cache,{recursive:true});fs.writeFileSync(path.join(cache,'failure.txt'),String(error.stack));process.exitCode=1;});
module.exports={prepare,sources,png,colors,difference};
