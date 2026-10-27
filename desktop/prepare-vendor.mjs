// Bundle browser runtime assets: no CDN needed for ordinary .tns/Lua/Python work.
// Advanced optional engines (Giac/Unicorn) have separate upstream dependencies.
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const HERE=dirname(fileURLToPath(import.meta.url));
const out=join(HERE,'vendor');
const BASE='https://cdn.jsdelivr.net/pyodide/v0.29.0/full/';
async function download(url,relative){
  const target=join(out,relative);
  await mkdir(dirname(target),{recursive:true});
  if((await stat(target).catch(()=>null))?.size>0)return;
  const response=await fetch(url,{headers:{'User-Agent':'TNS-Tool-Portable-Build/1.0'}});
  if(!response.ok)throw new Error(url+': HTTP '+response.status);
  const buffer=Buffer.from(await response.arrayBuffer());
  if(!buffer.length)throw new Error('Empty asset '+url);
  await writeFile(target,buffer);
  console.log('Vendored '+relative+' ('+Math.ceil(buffer.length/1024)+' KB)');
}
for(const file of ['pyodide.js','pyodide.asm.js','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json']){
  await download(BASE+file,'pyodide/'+file);
}
const lock=JSON.parse(await readFile(join(out,'pyodide','pyodide-lock.json'),'utf8'));
for(const name of ['pycryptodome']){
  const filename=lock.packages?.[name]?.file_name;
  if(!filename)throw new Error('Required Pyodide package missing from lockfile: '+name);
  await download(BASE+filename,'pyodide/'+filename);
}
await download('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','jszip/jszip.min.js');
await download('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjs/pdf.min.js');
await download('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','pdfjs/pdf.worker.min.js');
for(const [file,sha] of [
  ['unicorn.js','3ca0ec4e7682c65ddb7e6df956fd2d8970b86a6c8df6a8d01068b0e9203a1d2a'],
  ['unicorn.wasm','8e65bc98a70029315b588de7db7853fde4b2bce57f8aa73ba20a14a705381290'],
  ['LICENSE','8177f97513213526df2cf6184d8ff986c675afb514d4e68a404010521b880643']
]){
  await download('https://cdn.jsdelivr.net/npm/@alexaltea/unicorn-js@1.0.3/'+(file==='LICENSE'?'':'dist/')+file,'unicorn/'+file);
  const bytes=await readFile(join(out,'unicorn',file));
  if(createHash('sha256').update(bytes).digest('hex')!==sha)throw new Error('Unicorn asset SHA256 mismatch: '+file);
}
