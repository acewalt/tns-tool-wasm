import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const excluded=new Set(['vite.monaco.config.js','ndless-coi-sw.js']);
const names=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(?:js|css)$/.test(e.name)&&!excluded.has(e.name)).map(e=>e.name);
if(!names.length){console.log(JSON.stringify({root,alreadyOrganized:true}));process.exit();}
const namesSet=new Set(names);
const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const urls=new RegExp('((?:\\.\\./)+|\\./)('+names.map(escaped).join('|')+')(?=[?\\s\'"`)<\\],;]|$)','g');
const bare=new RegExp('([\'"`])('+names.map(escaped).join('|')+')(?=\\1|[?])','g');
const rooted=new RegExp('([\'"`])/(?!web/)('+names.map(escaped).join('|')+')(?=[?\'"`])','g');
const tracked=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean))];
const skip=p=>/^(?:assets\/|dist\/|vendor\/|node_modules\/|release\/|\.git\/)/.test(p);
const plan=[];
for(const file of tracked){
 if(skip(file)||!/\.(?:js|cjs|mjs|css|html|json|yml|yaml|py|md|bat|ps1|txt)$/.test(file)||file==='scripts/organize-web-assets.mjs')continue;
 const absolute=path.resolve(root,file);if(!fs.existsSync(absolute)||fs.statSync(absolute).size>2_000_000)continue;
 let text=fs.readFileSync(absolute,'utf8'),next=text.replace(urls,(_m,prefix,name)=>prefix+'web/'+name).replace(rooted,(_m,quote,name)=>quote+'/web/'+name);
 // Filesystem-based tests and developer tools resolve these bare names from
 // the repository root. Browser code keeps its public labels and basenames.
 if(/^(?:tests|tools|scripts|desktop)\//.test(file)&&file!=='desktop/server.cjs')next=next.replace(bare,(_m,quote,name)=>quote+'web/'+name);
 if(file.startsWith('.github/'))for(const name of names)next=next.replace(new RegExp('(^|[\\s\'"/])'+escaped(name)+'(?=[\\s\'"?]|$)','gm'),(_m,prefix)=>prefix+'web/'+name);
 if(namesSet.has(file)){
  next=next.replace(/(new Worker\(\s*['"])([^'"?]+)(?=[?'"])/g,(_m,prefix,name)=>prefix+(namesSet.has(name)?'web/'+name:name));
  // Worker imports are relative to their own script, not document.baseURI.
  next=next.replace(/importScripts\(([^)]*)\)/g,(_m,args)=>'importScripts('+args.replace(/(['"`])\.\/web\//g,'$1./')+')');
  next=next.replace(/(\bfrom\s+['"])\.\/src\//g,'$1../src/');
  if(file==='program-editor-tools.js')next=next.replace("new URL('.', document.currentScript?.src || document.baseURI)","new URL(document.currentScript?.src ? '../' : './', document.currentScript?.src || document.baseURI)");
  if(file==='rom-web-converter-worker.js')next=next.replace("new URL('./assets/rom/',self.location.href)","new URL('../assets/rom/',self.location.href)");
  if(file.endsWith('.css'))next=next.replace(/url\(\s*(['"]?)(\.\/)?(assets|icon)\//g,'url($1../$3/');
 }
 if(file==='tests/helpers/ndless-preview-worker.cjs')next=next.replace('path.join(root,path.basename(url))',"path.join(root,'web',path.basename(url))");
 if(file.startsWith('.github/workflows/'))next=next.replace(/(['"])([^/'"\n]+\.(?:js|css|\*))\1/g,(_m,quote,name)=>quote+(name.includes('*')?'web/':'')+name+quote);
 const destination=namesSet.has(file)?'web/'+file:file;
 if(next!==text||destination!==file)plan.push({file,destination,text:next});
}
console.log(JSON.stringify({root,moved:names.length,rewritten:plan.length-names.length,apply:process.argv.includes('--apply')},null,2));
if(!process.argv.includes('--apply'))process.exit();
for(const item of plan){
 const from=path.resolve(root,item.file),to=path.resolve(root,item.destination);
 if(!to.startsWith(root+path.sep)||!from.startsWith(root+path.sep))throw Error('Path outside workspace');
 if(from!==to&&fs.existsSync(to))throw Error('Destination already exists: '+item.destination);
}
fs.mkdirSync(path.join(root,'web'),{recursive:true});
for(const {file,destination,text} of plan){const target=path.join(root,destination);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);if(file!==destination)fs.unlinkSync(path.join(root,file));}
fs.writeFileSync(path.join(root,'web','README.md'),'# Browser interface\n\nApplication scripts and styles live here. The public entry point remains `../index.html`; shared assets and the CLI remain in their existing folders. Run the project commands from the repository root.\n');
