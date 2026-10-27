const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{Worker}=require('node:worker_threads');
const cases=require('./fixtures/ndless-preview-projects.cjs');
const exe=process.env.TNS_DESKTOP_COMPILER;
const root=path.resolve(__dirname,'..');
function pack(files){const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'ti-calculator-zip.js'),'utf8'),{window,TextEncoder,Uint8Array,Uint32Array,DataView,Date,Array,Error});return window.TnsCalculatorZip.pack(Object.entries(files).map(([name,source])=>({path:name,data:new TextEncoder().encode(source)})));}
test('real SDK + isolated ARM preview stress: C, C++, multifile, doubles, animation, input, assembly and failures',
 {skip:process.platform!=='win32'||!exe,timeout:180000},async t=>{
  for(const fixture of cases.filter(f=>!process.env.TNS_PREVIEW_CASE||f.name===process.env.TNS_PREVIEW_CASE))await t.test(fixture.name,{timeout:25000},async()=>{
   const start=performance.now();
   const build=()=>require('../desktop/compiler.cjs').build(exe,{name:fixture.name,zip:pack(fixture.files)});
   if(fixture.kind==='compile-error'){await assert.rejects(build(),/error/i);return;}
   const artifact=await build();
   if(process.env.TNS_PREVIEW_DIAGNOSTICS){fs.mkdirSync(process.env.TNS_PREVIEW_DIAGNOSTICS,{recursive:true});fs.writeFileSync(path.join(process.env.TNS_PREVIEW_DIAGNOSTICS,fixture.name+'.tns'),artifact.bytes);}
   const worker=new Worker(path.join(__dirname,'helpers/ndless-preview-worker.cjs'),{workerData:{bytes:artifact.bytes}});
   const hashes=new Set();let frames=0,sentKey=false,green=false,logs=[],last={};
   try{
    await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('No expected preview result within 18 s: '+fixture.name+' logs='+JSON.stringify(logs)+' state='+JSON.stringify(last))),18000);
     const done=error=>{clearTimeout(timeout);error?reject(error):resolve();};
     worker.on('error',done);
     worker.on('message',message=>{
      try{
       last={stage:message.stage,pc:message.pc?.toString(16),frames:message.frames};
       if(message.stage==='error'){
        if(fixture.kind==='unsupported'){assert.equal(message.code,'NDLESS_SWI_UNSUPPORTED');assert.equal(message.syscall,0x123456);done();}
        else if(fixture.kind==='lcd'){assert.equal(message.code,'NDLESS_LCD_UNSUPPORTED');done();}
        else if(fixture.kind==='memory'){assert.match(message.error,/UNMAPPED|memory/i);done();}
        else done(Error(fixture.name+': '+message.error));return;
       }
       if(message.logs?.length)logs=message.logs;
       if(fixture.kind==='infinite'&&message.stage==='running'&&message.steps>2){done();return;}
       if(!message.frame)return;frames++;
       const b=Buffer.from(message.frame);let colors=new Set();for(let i=0;i<b.length;i+=2)colors.add(b.readUInt16LE(i));
       const hash=require('node:crypto').createHash('sha256').update(b).digest('hex');hashes.add(hash);
       if(fixture.kind==='gradient'&&colors.size>=50&&logs.join('').includes('computed=42 float=3.75'))done();
       if(fixture.kind==='cpp'&&b.readUInt16LE(10000)===0xd09c)done();
       if(fixture.kind==='fractal'&&colors.size>=15)done();
       if(fixture.kind==='arm'&&b.readUInt16LE(10000)===31)done();
       if(fixture.kind==='allocation'&&b.readUInt16LE(10000)===0xffe0)done();
       if(fixture.kind==='animation'&&colors.size===1&&b.readUInt16LE(10000)!==0){
        if(!sentKey){worker.postMessage({type:'key',code:'Enter',down:true});sentKey=true;}
        if((b.readUInt16LE(10000)&0x7e0)===0x7e0)green=true;
        if(green&&hashes.size>=3){worker.postMessage({type:'key',code:'Enter',down:false});done();}
       }
      }catch(error){done(error);}
     });
    });
    t.diagnostic(JSON.stringify({name:fixture.name,ms:Math.round(performance.now()-start),frames,distinctFrames:hashes.size,logs}));
   }finally{await worker.terminate();}
  });
 });
