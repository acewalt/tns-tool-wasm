const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function load(system,options={},vendor=path.join(process.resourcesPath||__dirname,'vendor/rom')){
 if(!['nes','snes','gba','nds','n64'].includes(system))throw Error('Unsupported ROM core');
 const filename=path.join(vendor,system+'-preview.js'),module={exports:{}},context={module,exports:module.exports,require,__filename:filename,__dirname:path.dirname(filename),process,Buffer,TextEncoder,TextDecoder,setTimeout,clearTimeout,performance,console};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});
 return module.exports({...options,wasmBinary:fs.readFileSync(filename.replace(/\.js$/,'.wasm'))});
}
module.exports={load};
