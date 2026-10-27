import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../ndless-desktop-required.js',import.meta.url),'utf8');
function fixture(desktop=false){
  const listeners={},nodes=new Map();
  let active;
  class Element{
    constructor(){this.children=[];this.dataset={};this.attributes={};this.classList={add(){},remove(){}};}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(){}
    append(...children){this.children.push(...children);}
    remove(){nodes.delete(this.className);}
    focus(){active=this;}
    querySelector(selector){
      if(selector==='[data-desktop-download]')return walk(this).find(n=>n.dataset.desktopDownload);
      return null;
    }
    querySelectorAll(){return walk(this).filter(n=>n.type==='button'||n.href);}
  }
  function walk(n){return n.children.flatMap(c=>[c,...walk(c)]);}
  const newButton=new Element();newButton.id='xml-new-ndless-project';newButton.disabled=true;
  const previous=new Element();active=previous;
  const body=new Element();body.append=n=>nodes.set(n.className,n);
  const document={body,documentElement:{lang:'es',classList:{add(){},remove(){}}},
    get activeElement(){return active;},createElement:()=>new Element(),
    getElementById:id=>id===newButton.id?newButton:null};
  const window={...(desktop?{TnsDesktop:{}}:{}),addEventListener:(name,fn)=>listeners[name]=fn};
  vm.runInNewContext(source,{window,document,MutationObserver:class{observe(){}}});
  function click(action){
    const event={target:{closest:()=>action},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
    listeners.click(event);return event;
  }
  return {window,click,newButton,nodes,previous,get active(){return active;},listeners};
}

const web=fixture();
assert.equal(web.newButton.disabled,false);
assert.equal(web.click(web.newButton).prevented,true);
const overlay=web.nodes.get('ndless-desktop-required-overlay');
const card=overlay.children[0];
assert.equal(card.attributes.role,'dialog');
assert.equal(card.attributes['aria-modal'],'true');
assert.match(card.children[2].textContent,/requiere TNS Tool Portable/);
assert.equal(card.children[3].children.length,3);
assert.match(web.active.href,/github.com\/acewalt\/tns-tool-wasm\/actions\/workflows\/desktop-portable-windows.yml/);
web.listeners.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
assert.equal(web.nodes.size,0);
assert.equal(web.active,web.previous);
const openProject={querySelector:selector=>selector==='input[accept=".zip"]'?{}:null};
assert.equal(web.click(openProject).prevented,true);
web.window.TnsNdlessDesktopRequired.close();
assert.equal(web.click(null).prevented,undefined,'normal Open TNS must remain untouched');
const native=fixture(true);
assert.equal(native.click(native.newButton).prevented,undefined);
assert.equal(native.window.TnsNdlessDesktopRequired.open(),false);
assert.equal(native.nodes.size,0);
console.log('Ndless desktop requirement: web New/Open, normal TNS, Escape focus, and native bypass pass.');
