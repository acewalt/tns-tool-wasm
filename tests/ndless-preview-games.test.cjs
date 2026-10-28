const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {root,build,preview}=require('./helpers/ndless-native.cjs');
const names=['platformer','raycaster','pong','snake','blocks','sprites'];
const fields=line=>Object.fromEntries([...line.matchAll(/(\w+)=(-?\d+)/g)].map(m=>[m[1],+m[2]]));
test('sequential playable-game previews: platform, 3D ray casting, paddle, snake, falling blocks, external sprites',
 {skip:process.platform!=='win32'||!process.env.TNS_DESKTOP_COMPILER,timeout:240000},async t=>{
 for(const name of names.filter(n=>!process.env.TNS_PREVIEW_GAME||n===process.env.TNS_PREVIEW_GAME))await t.test(name,{timeout:35000},async()=>{
  const dir=path.join(root,'examples/ndless-games'),files={'main.c':fs.readFileSync(path.join(dir,name,'main.c'),'utf8'),'lab.h':fs.readFileSync(path.join(dir,'lab.h'),'utf8')};
  const artifact=await build('game-'+name,files),assets=name==='sprites'?[['sprite.bmp',require('./fixtures/sprite-bmp.cjs')()]]:[];
  let initial=null,last=null,changed=false;
  const result=await preview({bytes:artifact.bytes,files:assets,timeoutMs:28000,observe(message,{key,stats}){
   const prefix={platformer:'platform',raycaster:'ray',pong:'pong',snake:'snake',blocks:'blocks',sprites:'sprites'}[name];
   const line=stats.logs.filter(s=>s.startsWith(prefix+' ')).at(-1);if(!line)return false;
   last=fields(line);
   if(!initial){initial=last;
    if(name==='platformer'){key('ArrowRight',true);key('Space',true);}
    if(name==='raycaster'){key('ArrowRight',true);key('ArrowUp',true);key('Space',true);}
    if(name==='pong')key('ArrowDown',true);
    if(name==='snake')key('ArrowDown',true);
    if(name==='blocks'){key('ArrowUp',true);key('Space',true);}
    if(name==='sprites')key('Space',true);
   }
   changed=name==='platformer'?last.x>initial.x&&last.jumps>initial.jumps:
    name==='raycaster'?last.angle!==initial.angle&&last.shots>initial.shots:
    name==='pong'?last.paddle>initial.paddle&&last.x!==initial.x:
    name==='snake'?last.y!==initial.y:
    name==='blocks'?last.placed>initial.placed:
    last.count>initial.count&&last.asset===1;
   return changed&&stats.hashes.size>=3;
  }});
  assert.ok(changed,'Game mechanics must react to input');assert.ok(result.hashes.size>=3,'Real pixels must change');
  if(process.env.TNS_PREVIEW_DIAGNOSTICS){fs.mkdirSync(process.env.TNS_PREVIEW_DIAGNOSTICS,{recursive:true});fs.writeFileSync(path.join(process.env.TNS_PREVIEW_DIAGNOSTICS,name+'-game-frame.bin'),result.lastFrame);}
  t.diagnostic(JSON.stringify({game:name,frames:result.frames,distinct:result.hashes.size,ms:result.elapsedMs,initial,last}));
 });
});

test('sprites missing and malformed BMP show the real nSDL dialog and continue with fallback pixels',
 {skip:process.platform!=='win32'||!process.env.TNS_DESKTOP_COMPILER,timeout:70000},async t=>{
 const dir=path.join(root,'examples/ndless-games'),artifact=await build('sprites-resource-errors',{'main.c':fs.readFileSync(path.join(dir,'sprites/main.c'),'utf8'),'lab.h':fs.readFileSync(path.join(dir,'lab.h'),'utf8')});
 for(const mode of ['missing','malformed','abort'])await t.test(mode+' BMP',async()=>{
  let dialogs=0;
  await preview({bytes:artifact.bytes,files:mode==='malformed'?[['sprite.bmp',new Uint8Array([66,77,1,2,3])]]:[],observe(m,{stats,respondDialog}){
   if(m.dialog){dialogs++;assert.match(m.dialog.title,/nSDL/);assert.ok(m.dialog.message.length>5);const choice=m.dialog.buttons.find(b=>b.label===(mode==='abort'?'Abort':'Continue'));assert.ok(choice);respondDialog(m.dialog.id,choice.value);}
   if(m.stage==='exited'){assert.equal(mode,'abort');assert.equal(m.exitCode,1);return true;}
   if(dialogs&&stats.hashes.size>=3&&stats.logs.join('').includes('asset=0'))return true;return false;
  }});assert.equal(dialogs,1);
 });
});

test('three-button SDK dialog suspends ARM until a valid response and returns the selected value',
 {skip:process.platform!=='win32'||!process.env.TNS_DESKTOP_COMPILER,timeout:30000},async()=>{
 const artifact=await build('dialog-three',{'main.c':'#include <os.h>\n#include <stdio.h>\nint main(){unsigned v=show_msgbox_3b("Preview","Choose the third","One","Two","Three");printf("CHOICE=%u\\n",v);fflush(stdout);return v==3?0:2;}'});
 let seen=false;
 await preview({bytes:artifact.bytes,observe(m,{stats,respondDialog}){
  if(m.dialog){assert.equal(seen,false);seen=true;assert.equal(m.dialog.title,'Preview');assert.deepEqual(m.dialog.buttons.map(b=>b.label),['One','Two','Three']);respondDialog(m.dialog.id+1,3);respondDialog(m.dialog.id,99);setTimeout(()=>respondDialog(m.dialog.id,3),180);}
  if(m.stage==='exited'){assert.ok(seen);assert.equal(m.exitCode,0);assert.match(stats.logs.join(''),/CHOICE=3/);return true;}return false;
 }});
});
