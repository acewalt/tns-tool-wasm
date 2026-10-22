import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../ti-calculator-transfer.js",import.meta.url),"utf8")
  .replace("window.TnsCalculatorTransfer=Object.freeze({open,close});",
    "window.TnsCalculatorTransfer=Object.freeze({open,close,rows,toggleFolder,selected});window.__tiTestState=state;");
assert.match(source,/window.__tiTestState=state/);
const css=fs.readFileSync(new URL("../ti-calculator-transfer.css",import.meta.url),"utf8");
assert.match(css,/\.ti-tree-children-wrapper/);
assert.match(css,/\.ti-tree-icon/);
assert.doesNotMatch(css,/^ul\s*\{/m,"Tree styles must not affect the application's other lists.");

class MockElement{
  constructor(tag="div"){
    this.tag=tag;this.children=[];this.handlers={};this.attributes={};
    this.textContent="";this.dataset={};this.disabled=false;this.checked=false;
    this.classes=new Set();
    this.classList={
      toggle:(name,active)=>active?this.classes.add(name):this.classes.delete(name),
      add:name=>this.classes.add(name)
    };
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(name,callback){this.handlers[name]=callback;}
  dispatchEvent(event){this.handlers[event.type]?.(event);}
}
const controls={};
const root={querySelector:selector=>controls[selector]??=new MockElement("control")};
const document={
  documentElement:{lang:"en"},createElement:tag=>new MockElement(tag),
  addEventListener:()=>{}
};
const window={};
new Function("window","document","console",source)(window,document,console);
const state=window.__tiTestState;
state.root=root;
const queried=[];
state.link={connected:true,listDir:async path=>{
  queried.push(path);
  return [{name:"new.tns",path:path+"/new.tns",isDir:false,size:600}];
}};
state.cache.set("/",[
  {name:"math",path:"/math",isDir:true},
  {name:"root.tns",path:"/root.tns",isDir:false,size:2048}
]);
state.cache.set("/math",[
  {name:"algebra.tns",path:"/math/algebra.tns",isDir:false,size:65536}
]);
state.files=state.cache.get("/");
state.expanded.add("/math");
window.TnsCalculatorTransfer.rows();
const contains=(el,match)=>match(el)||(el?.children?.some(child=>contains(child,match))??false);
assert.ok(contains(controls["[data-ti-rows]"],el=>el.textContent==="algebra.tns"));
state.chosen.add("/math/algebra.tns");
assert.equal(window.TnsCalculatorTransfer.selected().length,1);
await window.TnsCalculatorTransfer.toggleFolder("/math");
assert.equal(state.expanded.has("/math"),false);
await window.TnsCalculatorTransfer.toggleFolder("/math");
assert.equal(state.expanded.has("/math"),true);
assert.equal(state.chosen.has("/math/algebra.tns"),true);
assert.deepEqual(queried,[],"Cached directory re-expansion should not cause another USB request.");
await window.TnsCalculatorTransfer.toggleFolder("/math");
state.cache.get("/").push({name:"newfolder",path:"/newfolder",isDir:true});
await window.TnsCalculatorTransfer.toggleFolder("/newfolder");
assert.deepEqual(queried,["/newfolder"]);
assert.equal(state.path,"/newfolder");
assert.equal(state.cache.get("/newfolder")[0].name,"new.tns");
assert.equal(window.TnsCalculatorTransfer.selected().length,1,
  "Selections in another directory must be preserved.");
console.log("Calculator lazy folder tree, cache, USB loading and selection tests passed.");
