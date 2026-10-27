const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {webcrypto}=require('node:crypto');
const {persistentVisitorId}=require('../desktop/stats-identity.cjs');
const exec=promisify(execFile);

async function renderer({bridge,storage=new Map(),fetch}){
  const app=await fs.readFile(path.join(__dirname,'../app.js'),'utf8');
  const from=app.indexOf('const STATS_API_BASE_URL ='),to=app.indexOf('const PYTHON_FILES =',from);
  assert.ok(from>0&&to>from);
  const context=vm.createContext({
    window:{TNS_TOOL_STATS_API_BASE_URL:'https://stats.invalid',...(bridge?{TnsDesktop:bridge}:{})},
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    document:{querySelector:()=>null},language:'es',Date,Intl,Uint8Array,crypto:webcrypto,
    fetch,AbortController,setTimeout,clearTimeout,console:{warn(){}}
  });
  vm.runInContext(app.slice(from,to),context);
  return context;
}

test('desktop identity survives independent processes and renderer origins',async t=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'tns-stats-'));
  t.after(()=>fs.rm(profile,{recursive:true,force:true}));
  const id=await persistentVisitorId(profile)();
  const module=path.join(__dirname,'../desktop/stats-identity.cjs');
  const child=await exec(process.execPath,['-e',
    `require(${JSON.stringify(module)}).persistentVisitorId(${JSON.stringify(profile)})().then(id=>process.stdout.write(id))`]);
  assert.equal(child.stdout,id);
  const visitors=new Set(),posts=[];
  for(let port=50100;port<50104;port++){
    // Each loop is a fresh origin/localStorage, as with the portable's server.
    const context=await renderer({bridge:{statsIdentity:async()=>({visitorId:await persistentVisitorId(profile)(),enabled:true})},
      fetch:async(url,options)=>{
        posts.push(JSON.parse(options.body));visitors.add(posts.at(-1).visitorId);
        return {ok:true,json:async()=>({visitorsToday:visitors.size})};
      }});
    context.window.location={origin:'http://127.0.0.1:'+port};
    await vm.runInContext('recordTodayVisit()',context);
    await vm.runInContext('recordTodayVisit()',context);
  }
  assert.equal(posts.length,4);
  assert.deepEqual([...visitors],[id],'All launches report one anonymous visitor');
});

test('web retains its existing localStorage daily duplicate guard',async()=>{
  const storage=new Map();let posts=0;
  const fetch=async()=>{posts++;return {ok:true,json:async()=>({visitorsToday:1})};};
  const first=await renderer({storage,fetch});await vm.runInContext('recordTodayVisit()',first);
  const second=await renderer({storage,fetch});await vm.runInContext('recordTodayVisit()',second);
  assert.equal(posts,1);
});

test('smoke runs and failed desktop identity never send statistic mutations',async()=>{
  for(const statsIdentity of [async()=>({visitorId:'test-identity-00000000000',enabled:false}),async()=>{throw Error('disk failure');}]){
    let writes=0;
    const context=await renderer({bridge:{statsIdentity},fetch:async()=>{writes++;throw Error('Unexpected network write');}});
    await vm.runInContext('recordTodayVisit()',context);
    await vm.runInContext('recordSuccessfulTnsGeneration()',context);
    assert.equal(writes,0,'Do not invent a replacement ID or count diagnostic launches');
  }
});

test('invalid persisted identity is preserved and fails closed',async t=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'tns-stats-invalid-'));
  t.after(()=>fs.rm(profile,{recursive:true,force:true}));
  const directory=path.join(profile,'tns-tool');await fs.mkdir(directory);
  const filename=path.join(directory,'stats-identity.json');await fs.writeFile(filename,'{}');
  await assert.rejects(persistentVisitorId(profile)(),/Invalid persistent/);
  assert.equal(await fs.readFile(filename,'utf8'),'{}');
});
