const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {gzipSync}=require('node:zlib');
const {createHash}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {ensureRuntime,safeEntry,unpack}=require('../desktop/sdk-runtime.cjs');
const exec=promisify(execFile);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t,overrides={}){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'tns-sdk-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const source=path.join(root,'portable'),cache=path.join(root,'cache');
  await fs.mkdir(source);
  const exe=path.join(source,'compiler.exe');await fs.writeFile(exe,'fake compiler');
  const content=Buffer.from('{"sdk":"fixture"}');
  const entry={path:'sdk-manifest.json',size:content.length,sha256:hash(content),...overrides};
  const index=Buffer.from(JSON.stringify([entry])),size=Buffer.alloc(4);size.writeUInt32LE(index.length);
  const compressed=gzipSync(Buffer.concat([Buffer.from('TNS-SDK-1\n'),size,index,content]));
  const bundle=path.join(source,'sdk.bin.gz');await fs.writeFile(bundle,compressed);
  const manifest={format:1,sha256:hash(compressed),compilerSha256:hash(Buffer.from('fake compiler')),files:1,unpackedBytes:content.length};
  await fs.writeFile(path.join(source,'sdk.json'),JSON.stringify(manifest));
  return{root,source,cache,exe,bundle,manifest};
}
test('SDK prepares once and survives another process without unpacking again',async t=>{
  const f=await fixture(t);
  const [first,concurrent]=await Promise.all([ensureRuntime(f.exe,f.cache),ensureRuntime(f.exe,f.cache)]);
  assert.equal(first,concurrent);assert.notEqual(first,f.exe);
  assert.equal(await fs.readFile(first,'utf8'),'fake compiler');
  const marker=path.join(path.dirname(first),'ready.json'),before=(await fs.stat(marker)).mtimeMs;
  // Removing the bundled payload proves the next process uses the ready cache,
  // rather than decompressing on every launch. Keep an empty bundle marker.
  await fs.writeFile(f.bundle,'not a gzip stream');
  const script=`require(${JSON.stringify(path.resolve(__dirname,'../desktop/sdk-runtime.cjs'))}).ensureRuntime(${JSON.stringify(f.exe)},${JSON.stringify(f.cache)}).then(p=>process.stdout.write(p))`;
  const {stdout}=await exec(process.execPath,['-e',script]);
  assert.equal(stdout,first);assert.equal((await fs.stat(marker)).mtimeMs,before);
});
test('bundle digest failure never publishes a ready cache',async t=>{
  const f=await fixture(t);await fs.appendFile(f.bundle,'corruption');
  await assert.rejects(ensureRuntime(f.exe,f.cache),/dañada/);
  await assert.rejects(fs.access(f.cache));
});
test('unsafe archive paths and damaged entries do not escape staging',async t=>{
  const f=await fixture(t,{path:'../escaped'});
  await assert.rejects(ensureRuntime(f.exe,f.cache),/Ruta/);
  assert.deepEqual(await fs.readdir(f.cache),[]);
  for(const name of ['/absolute','a/../b','a\\b','C:escape','CON.txt','a./file','file?.h'])
    assert.throws(()=>safeEntry(f.root,name),/Ruta/);
  const damaged=await fixture(t,{sha256:'0'.repeat(64)});
  await assert.rejects(ensureRuntime(damaged.exe,damaged.cache),/dañado/);
  assert.deepEqual(await fs.readdir(damaged.cache),[]);
});
test('truncated gzip is rejected and unpacked developer overrides still work',async t=>{
  const f=await fixture(t);const bytes=await fs.readFile(f.bundle);
  await fs.writeFile(f.bundle,bytes.subarray(0,bytes.length-12));
  await assert.rejects(unpack(f.bundle,path.join(f.root,'unpacked'),f.manifest));
  const standalone=path.join(f.root,'standalone.exe');await fs.writeFile(standalone,'dev');
  assert.equal(await ensureRuntime(standalone,f.cache),standalone);
});
