const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {makeServer,listen,resolveRequest}=require('../desktop/server.cjs');
const compiler=require('../desktop/compiler.cjs');

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
