import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load=path=>fs.readFileSync(new URL(path,import.meta.url),"utf8");
const win={};
const context=vm.createContext({window:win,Uint8Array,DataView,TextEncoder,Date,Error,console});
vm.runInContext(load("../ti-calculator-zip.js"),context);
const zip=win.TnsCalculatorZip;
const files=[
  {path:"matematicas/",isDir:true},
  {path:"matematicas/sub/",isDir:true},
  {path:"matematicas/sub/fórmula.tns",data:Uint8Array.of(1,2,3,4,5)},
  {path:"matematicas/empty.tns",data:new Uint8Array(0)}
];
const out=zip.pack(files);
const dv=new DataView(out.buffer,out.byteOffset,out.byteLength);
assert.equal(dv.getUint32(0,true),0x04034b50);
assert.equal(dv.getUint32(out.length-22,true),0x06054b50);
assert.equal(dv.getUint16(out.length-22+10,true),files.length);
assert.equal(zip.crc32(Uint8Array.of(49,50,51,52,53,54,55,56,57)),0xcbf43926);
const centralStart=dv.getUint32(out.length-22+16,true);
assert.equal(dv.getUint32(centralStart,true),0x02014b50);
assert.throws(()=>zip.pack([{path:"../unsafe.tns",data:Uint8Array.of(1)}]),/insegura/);
assert.throws(()=>zip.pack([{path:"same",data:Uint8Array.of(1)},
  {path:"same",data:Uint8Array.of(2)}]),/duplicada/);

class Node{
  constructor(tag="div"){
    this.tag=tag;this.children=[];this.handlers={};this.attributes={};
    this.textContent="";this.dataset={};this.disabled=false;this.checked=false;
    this.classList={toggle:()=>{},add:()=>{}};
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,callback){this.handlers[name]=callback;}
  dispatchEvent(event){this.handlers[event.type]?.(event);}
}
const controls={};
const root={
  querySelector:sel=>controls[sel]??=new Node("control"),
  querySelectorAll:()=>[]
};
const doc={
  documentElement:{lang:"es"},
  addEventListener:()=>{},
  createElement:tag=>new Node(tag)
};
const js=load("../ti-calculator-transfer.js").replace(
  "window.TnsCalculatorTransfer=Object.freeze({open,close});",
  "window.TnsCalculatorTransfer=Object.freeze({open,close,rows,selected});window.__testState=state;"
);
assert.match(js,/window.__testState=state/);
vm.runInNewContext(js,{
  window:win,document:doc,console,Uint8Array,TextEncoder,Error,Date,
  Event:class{constructor(type){this.type=type}},
  setTimeout,clearTimeout,confirm:()=>true,prompt:()=>null
});
const state=win.__testState;
state.root=root;state.path="/";
const listing=[
  {name:"algebra",path:"/algebra",isDir:true,size:0},
  {name:"new.tns",path:"/new.tns",isDir:false,size:2500}
];
state.link={connected:true};
state.files=listing;state.cache.set("/",listing);
win.TnsCalculatorTransfer.rows();
const descendants=node=>[node,...(node.children||[]).flatMap(descendants)];
const nodes=descendants(controls["[data-ti-rows]"]);
const hoverButtons=nodes.filter(node=>node.className?.includes("ti-row-action"));
assert.equal(hoverButtons.length,6,"Each file and folder needs 3 individual actions");
const names=hoverButtons.map(node=>node.attributes["aria-label"]);
for(const name of ["Descargar new.tns","Renombrar new.tns","Eliminar new.tns",
                   "Descargar algebra","Renombrar algebra","Eliminar algebra"])
  assert.ok(names.includes(name),name);
assert.ok(!hoverButtons.find(node=>node.attributes["aria-label"]==="Eliminar algebra").disabled);
// Icons are real SVG assets rendered as currentColor masks, never emojis or
// static PNGs that cannot follow the light/dark theme.
for(const button of hoverButtons){
  assert.equal(button.children.length,1,"Action must render one icon");
  const icon=button.children[0];
  const kind=button.attributes["aria-label"].startsWith("Descargar")?"download":
    button.attributes["aria-label"].startsWith("Renombrar")?"rename":"delete";
  assert.equal(icon.className,"ti-action-icon ti-action-icon-"+kind);
  assert.equal(icon.attributes["aria-hidden"],"true");
  assert.equal(button.textContent,"","No emoji text in icon-only actions");
}
for(const kind of ["download","rename","delete"]){
  const svg=load("../assets/calculator-actions/"+kind+".svg");
  assert.match(svg,/viewBox="0 0 24 24"/);
  assert.match(svg,/stroke="currentColor"/);
  assert.doesNotMatch(svg,/<(rect|image)[^>]+fill="(?:#|rgb)/i);
}
const style=load("../ti-calculator-transfer.css");
for(const kind of ["download","rename","delete"])
  assert.ok(style.includes('url("./assets/calculator-actions/'+kind+'.svg")'),
    "Missing CSS mask URL for "+kind);
assert.match(style,/background-color:currentColor/);

assert.match(style,/\.ti-tree-row:hover \.ti-row-actions/);
assert.match(style,/:focus-within \.ti-row-actions/);
assert.match(style,/@media\(hover:none\)/);
const html=load("../index.html");
assert.match(html,/ti-calculator-zip\.js/);
console.log("Calculator per-item hover actions and safe folder ZIP validation passed.");
