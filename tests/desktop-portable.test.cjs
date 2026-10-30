const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {makeServer,listen,resolveRequest}=require('../desktop/server.cjs');
const compiler=require('../desktop/compiler.cjs');
const {loadLocalApp}=require('../desktop/startup.cjs');

test('PRG packaging retains the complete Zehn and rejects truncated output',()=>{
  const zehn=Buffer.alloc(36);zehn.write('Zehn');zehn.writeUInt32LE(1,4);
  zehn.writeUInt32LE(36,8);zehn.writeUInt32LE(36,24);
  const loader=Buffer.from([80,82,71,0,0,0,0,0]);
  const result=compiler.packagePrg(zehn,loader);
  assert.deepEqual(result.subarray(loader.length),zehn);
  assert.throws(()=>compiler.packagePrg(zehn.subarray(0,35),loader),/truncado/);
  assert.throws(()=>compiler.packagePrg(zehn,Buffer.alloc(8)),/cargador/);
});

test('a second instance quits without starting another server or window',()=>{
  let quits=0;
  const app={requestSingleInstanceLock:()=>false,quit:()=>quits++,on:()=>{},
    whenReady:()=>{throw new Error('A second instance must not start');}};
  require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8'),{
    require:id=>id==='electron'?{app}:require(id.startsWith('./')?'../desktop/'+id.slice(2):id),
  });
  assert.equal(quits,1);
});

test('initial Chromium ERR_FAILED is retried before startup succeeds',async()=>{
  let attempts=0;const delays=[];
  const win={isDestroyed:()=>false,loadURL:async url=>{
    assert.equal(url,'http://127.0.0.1:12345/');
    if(++attempts<3)throw Object.assign(new Error('ERR_FAILED'),{errno:-2});
  }};
  await loadLocalApp(win,'http://127.0.0.1:12345/',async ms=>delays.push(ms));
  assert.equal(attempts,3);assert.deepEqual(delays,[250,500]);
});
test('persistent and non-network navigation errors are surfaced',async()=>{
  for(const errno of [-2,-6]){
    let attempts=0;const error=Object.assign(new Error('navigation failed'),{errno});
    await assert.rejects(loadLocalApp({isDestroyed:()=>false,loadURL:async()=>{attempts++;throw error;}},'http://127.0.0.1:12345/',async()=>{}),e=>e===error);
    assert.equal(attempts,errno===-2?3:1);
  }
});

test('desktop path resolver prevents traversal and hidden source files',()=>{
  const root=path.resolve('repo'),vendor=path.resolve('vendor');
  assert.equal(resolveRequest(root,vendor,'/index.html'),path.join(root,'index.html'));
  assert.equal(resolveRequest(root,vendor,'/../secret'),null);
  assert.equal(resolveRequest(root,vendor,'/%2e%2e/secret'),null);
  assert.equal(resolveRequest(root,vendor,'/.git/config'),null);
  assert.equal(resolveRequest(root,vendor,'/__desktop/other/untrusted.js'),null);
});
test('the web app is served unchanged except for local runtime URLs',async()=>{
  const root=await fsp.mkdtemp(path.join(os.tmpdir(),'tns-server-test-'));
  const vendor=path.join(root,'vendor');
  await fsp.writeFile(path.join(root,'index.html'),
    '<script src="https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js"></script>'+
    '<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>');
  const server=makeServer(root,vendor),origin=await listen(server);
  try{
    const response=await fetch(origin);
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/__desktop\/pyodide\/pyodide.js/);
    assert.match(html,/__desktop\/jszip\/jszip.min.js/);
    const hidden=await fetch(origin+'.github/workflows/test.yml');
    assert.equal(hidden.status,403);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fsp.rm(root,{recursive:true,force:true});
  }
});
test('compiler handles unavailable bundled binary explicitly',async()=>{
  const r=await compiler.status(path.join(os.tmpdir(),'nonexistent-ndless-compiler.exe'));
  assert.equal(r.toolchainReady,false);
  assert.equal(r.desktop,true);
});
test('Ndless output names cannot escape temporary directory',()=>{
  assert.equal(compiler.safeName('../../evil'),'evil');
  assert.equal(compiler.safeName('a b / c'),'a-b---c');
});
