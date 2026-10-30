import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../ti-calculator-transfer.js",import.meta.url),"utf8")
  .replace("window.TnsCalculatorTransfer=Object.freeze({open,close});",
  "window.TnsCalculatorTransfer=Object.freeze({open,close,controls,rows,setView,enterGridFolder,selected});window.__gridTestState=state;");
assert.match(source,/window.__gridTestState=state/);

class Node {
  constructor(tag="div"){
    this.tag=tag;this.children=[];this.handlers={};this.attributes={};this.dataset={};
    this.className="";this.textContent="";this.disabled=false;this.checked=false;this.hidden=false;this.value="";
    this.classes=new Set();
    this.classList={
      toggle:(name,value)=>value?this.classes.add(name):this.classes.delete(name),
      add:name=>this.classes.add(name)
    };
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(event,handler){this.handlers[event]=handler;}
  dispatchEvent(event){this.handlers[event.type]?.(event);}
}
const descendants=node=>[node,...(node.children||[]).flatMap(descendants)];
const controls={};
const root={
  querySelector:selector=>controls[selector]??=new Node("control"),
  querySelectorAll:selector=>{
    if(selector.includes(".ti-tree-row input"))
      return descendants(controls["[data-ti-rows]"]||new Node()).filter(n=>n.tag==="input"||n.tag==="button");
    return [];
  }
};
const document={
  documentElement:{lang:"es"},
  createElement:tag=>new Node(tag),
  addEventListener:()=>{}
};
const store=new Map();
const localStorage={
  setItem:(key,value)=>store.set(key,value),
  getItem:key=>store.get(key)||null
};
const window={};
vm.runInNewContext(source,{
  window,document,localStorage,console,Date,
  Event:class{constructor(type){this.type=type}},
});
const manager=window.TnsCalculatorTransfer;
const state=window.__gridTestState;
state.root=root;
manager.controls();
assert.equal(controls["[data-ti-connect]"].hidden,false);
assert.equal(controls["[data-ti-disconnect]"].hidden,true);
assert.equal(controls[".ti-manager-dialog"].attributes["data-connection-state"],"disconnected");

const calls=[];
state.link={
  connected:true,
  listDir:async path=>{
    calls.push(path);
    return [{name:"child.tns",path:path+"/child.tns",isDir:false,size:123}];
  }
};
state.cache.set("/",[
  {name:"math",path:"/math",isDir:true},
  {name:"root.tns",path:"/root.tns",isDir:false,size:300}
]);
state.files=state.cache.get("/");
manager.rows();
assert.equal(controls["[data-ti-connect]"].hidden,true);
assert.equal(controls["[data-ti-disconnect]"].hidden,false);
assert.equal(controls[".ti-manager-dialog"].attributes["data-connection-state"],"connected");
assert.ok(descendants(controls["[data-ti-rows]"]).some(n=>n.className==="ti-tree-list"),
  "Default view must remain the existing nested list.");

manager.setView("grid");
assert.equal(state.view,"grid");
assert.equal(controls[".ti-manager-table"].dataset.view,"grid");
assert.equal(store.get("tns-tool-calculator-view"),"grid");
assert.equal(controls["[data-ti-view-grid]"].attributes["aria-pressed"],"true");
assert.equal(controls["[data-ti-view-list]"].attributes["aria-pressed"],"false");
let gallery=descendants(controls["[data-ti-rows]"]);
let tiles=gallery.filter(n=>n.className==="ti-grid-tile");
assert.equal(tiles.length,2);
assert.equal(gallery.filter(n=>n.className==="ti-row-action").length,4);
assert.equal(gallery.filter(n=>n.className==="ti-row-action ti-row-action-danger").length,2);
const check=gallery.find(n=>n.className==="ti-manager-item-check"&&
  n.attributes["aria-label"].includes("root.tns"));
assert.ok(check);
check.checked=true;check.dispatchEvent({type:"change"});
assert.equal(manager.selected()[0].path,"/root.tns");

await manager.enterGridFolder("/math");
assert.deepEqual(calls,["/math"]);
assert.equal(state.path,"/math");
gallery=descendants(controls["[data-ti-rows]"]);
assert.ok(gallery.some(n=>n.textContent==="child.tns"));
assert.equal(manager.selected()[0].path,"/root.tns","Selections remain across folders");
await manager.enterGridFolder("/math");
assert.deepEqual(calls,["/math"],"Cached folders must not repeat the USB listing.");

manager.setView("list");
assert.equal(state.view,"list");
assert.equal(controls["[data-ti-view-list]"].attributes["aria-pressed"],"true");
assert.ok(descendants(controls["[data-ti-rows]"]).some(n=>n.className==="ti-tree-list"));
assert.equal(manager.selected()[0].path,"/root.tns","View changes retain existing selections");

state.link=null;
manager.controls();
assert.equal(controls["[data-ti-connect]"].hidden,false,
  "Connect returns when the calculator disconnects");
assert.equal(controls["[data-ti-disconnect]"].hidden,true);
assert.equal(controls[".ti-manager-dialog"].attributes["data-connection-state"],"disconnected");
const css=fs.readFileSync(new URL("../ti-calculator-transfer.css",import.meta.url),"utf8");
assert.match(css,/\.ti-grid-gallery/);
assert.match(css,/\.ti-grid-tile:hover \.ti-row-actions/);
assert.match(css,/\.ti-manager-table\[data-view="grid"\] \.ti-manager-cols/);
assert.match(css,/\[data-ti-connect\]\[hidden\]/);
assert.match(css,/\.ti-manager-dialog\[data-connection-state="disconnected"\] \.ti-manager-grid/);
assert.match(css,/@media\(hover:none\),\(pointer:coarse\)/);
console.log("Calculator connection button and list/grid selection/navigation tests passed.");
