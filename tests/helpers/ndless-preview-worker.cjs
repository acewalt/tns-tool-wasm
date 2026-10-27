// Node worker adapter: execute the same worker script used by Electron.
const {parentPort,workerData}=require('node:worker_threads');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
globalThis.onmessage=null;
globalThis.addEventListener=()=>{};
globalThis.postMessage=(value,transfer)=>parentPort.postMessage(value,transfer);
globalThis.importScripts=(...urls)=>{for(const url of urls){
 if(/unicorn\.js$/.test(url)){
  const filename=path.join(root,'desktop/vendor/unicorn/unicorn.js');
  // The upstream UMD bundle needs CommonJS when used from Node.
  const mod={exports:{}};const code=fs.readFileSync(filename,'utf8');
  const factory=vm.runInThisContext('(function(module,exports,require,__dirname,__filename){'+code+';return module.exports;})',{filename})(mod,mod.exports,require,path.dirname(filename),filename);
  globalThis.MUnicorn=opts=>factory({...opts,wasmBinary:fs.readFileSync(path.join(root,'desktop/vendor/unicorn/unicorn.wasm'))});
 }else vm.runInThisContext(fs.readFileSync(path.join(root,path.basename(url)),'utf8'),{filename:url});
}};
vm.runInThisContext(fs.readFileSync(path.join(root,'ndless-arm-preview-worker.js'),'utf8'),{filename:'ndless-arm-preview-worker.js'});
parentPort.on('message',data=>globalThis.onmessage({data}));
globalThis.onmessage({data:{type:'start',bytes:workerData.bytes,engine:'unicorn.js',wasm:'unicorn.wasm'}});
