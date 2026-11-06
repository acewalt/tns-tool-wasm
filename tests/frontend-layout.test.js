import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const frontend=path.join(root,'web');
const allowedRootAssets=new Set(['vite.monaco.config.js','ndless-coi-sw.js']);
const isExternal=url=>/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url);
const withoutSuffix=url=>url.split(/[?#]/,1)[0];
const filesInWeb=extension=>fs.readdirSync(frontend,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith(extension))
  .map(entry=>path.join(frontend,entry.name));

function localFile(url,base){
  const pathname=decodeURIComponent(withoutSuffix(url));
  return path.resolve(pathname.startsWith('/')?root:base,'.'+(pathname.startsWith('/')?pathname:path.sep+pathname));
}

function assertFile(filename,reference){
  assert.ok(filename.startsWith(root),`${reference} escapes the project root`);
  assert.ok(fs.existsSync(filename)&&fs.statSync(filename).isFile(),`${reference} does not resolve to a file: ${path.relative(root,filename)}`);
}

test('browser scripts and styles are grouped in web while public entry points stay at the root',()=>{
  assert.ok(fs.existsSync(frontend)&&fs.statSync(frontend).isDirectory(),'web/ must contain the browser interface');
  const unexpected=fs.readdirSync(root,{withFileTypes:true})
    .filter(entry=>entry.isFile()&&/\.(?:js|css)$/.test(entry.name)&&!allowedRootAssets.has(entry.name))
    .map(entry=>entry.name);
  assert.deepEqual(unexpected,[],'Move browser JS/CSS into web/; only the Vite configuration and root-scoped service worker stay here');
  for(const name of ['index.html','vite.monaco.config.js','ndless-coi-sw.js'])assertFile(path.join(root,name),name);
  assert.ok(filesInWeb('.js').length>0,'web/ must contain JavaScript');
  assert.ok(filesInWeb('.css').length>0,'web/ must contain styles');
});

test('every local script and stylesheet referenced by index.html exists',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<!--[\s\S]*?-->/g,'');
  let checked=0;
  for(const match of html.matchAll(/<(script|link)\b([^>]*)>/gi)){
    const attributes=new Map([...match[2].matchAll(/([\w-]+)\s*=\s*(['"])(.*?)\2/g)].map(item=>[item[1].toLowerCase(),item[3]]));
    const tag=match[1].toLowerCase();
    if(tag==='link'&&!attributes.get('rel')?.split(/\s+/).includes('stylesheet'))continue;
    const url=attributes.get(tag==='script'?'src':'href');
    if(!url||isExternal(url))continue;
    assertFile(localFile(url,root),`index.html ${tag} ${url}`);checked++;
  }
  assert.ok(checked>0,'The public HTML entry must load local browser assets');
});

test('CSS asset and icon URLs resolve relative to their stylesheet after the move',()=>{
  let checked=0;
  for(const filename of filesInWeb('.css')){
    const source=fs.readFileSync(filename,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for(const match of source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)'";]+))\s*\)/g)){
      const url=match[1]??match[2]??match[3];
      if(isExternal(url)||!/(?:^|\/)(?:assets|icon)\//.test(url))continue;
      assertFile(localFile(url,path.dirname(filename)),`${path.relative(root,filename)} url(${url})`);checked++;
    }
  }
  assert.ok(checked>0,'Check the local template/catalog and calculator action icons');
});

test('literal ES module imports in web resolve from the importing module',()=>{
  let checked=0;
  for(const filename of filesInWeb('.js')){
    const source=fs.readFileSync(filename,'utf8');
    // ESM imports have module-relative semantics. require() in rom-data-web.js
    // uses its embedded profile table; Worker URLs and importScripts have
    // different bases and are deliberately not treated as ESM imports here.
    const imports=[
      ...source.matchAll(/^\s*(?:import|export)\s+(?:[^;]*?\s+from\s+)?(['"])(\.{1,2}\/[^'"\r\n]+)\1/gm),
      ...source.matchAll(/\bimport\(\s*(['"])(\.{1,2}\/[^'"\r\n]+)\1\s*\)/g),
    ];
    for(const match of imports){
      const url=match[2];
      assertFile(localFile(url,path.dirname(filename)),`${path.relative(root,filename)} imports ${url}`);checked++;
    }
  }
  assert.ok(checked>=3,'The Prgm preview must retain its real runtime, drawing and calculator imports');
});
