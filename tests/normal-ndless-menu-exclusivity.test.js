import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
const workspace=fs.readFileSync(new URL("../ndless-project-workspace.js",import.meta.url),"utf8");

class Node{
  constructor(tag="div"){
    this.tagName=tag.toUpperCase();this.id="";this.dataset={};this.style={display:""};
    this.hidden=false;this.disabled=false;this.children=[];this.attributes={};this.listeners={};
    this.className="";this.title="";this.nextSibling=null;
  }
  addEventListener(event,handler){(this.listeners[event] ||= []).push(handler);}
  setAttribute(name,value){this.attributes[name]=value;}
  insertBefore(node,anchor){
    const index=this.children.indexOf(anchor);
    this.children.splice(index<0?this.children.length:index,0,node);
    this.children.forEach((el,i)=>{el.nextSibling=this.children[i+1]||null;});
    return node;
  }
  set innerHTML(value){
    this.html=value;
    if(value.includes("<input"))this.input=new Node("input");
  }
  get innerHTML(){return this.html||"";}
  querySelector(sel){
    if(sel==="input")return this.input||null;
    if(sel==="input#xml-tns-file")return this.tnsInput||null;
    if(sel==="#xml-new-ndless-project")
      return this.children.find(x=>x.id==="xml-new-ndless-project")||null;
    if(sel==="#xml-new-btn")
      return this.children.find(x=>x.id==="xml-new-btn")||null;
    return null;
  }
  querySelectorAll(sel){
    if(sel==="[data-ndless-project-always]")return this.children.filter(n=>n.dataset.ndlessProjectAlways==="1");
    if(sel==="[data-ndless-project-only]")return this.children.filter(n=>n.dataset.ndlessProjectOnly==="1");
    return [];
  }
}
const filePanel=new Node();
const newNormal=new Node("button");newNormal.id="xml-new-btn";
const openNormal=new Node("label"),openInput=new Node("input");
openNormal.input=openInput;openInput.closest=sel=>sel==="label"?openNormal:null;
filePanel.tnsInput=openInput;
filePanel.children=[newNormal,openNormal];filePanel.children[0].nextSibling=openNormal;
const doctor=new Node();
const listeners={};
const document={
  readyState:"loading",documentElement:{lang:"en"},
  querySelector(sel){
    if(sel==="#xml-doctor-panel")return doctor;
    if(sel==="#xml-doctor-panel .doctor-toolbar > .tool-menu > .menu-panel")return filePanel;
    if(sel==="#language-buttons button.active[data-lang]")return null;
    return null;
  },
  createElement:tag=>new Node(tag),
  addEventListener(type,fn){(listeners[type] ||= []).push(fn);},
  dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event);return true;},
};
const window={NdlessProjectCore:{},TnsMonacoEditor:null};
const context=vm.createContext({window,document,Event:class{constructor(type){this.type=type;}},setTimeout:()=>{},console});

// Run actual normal-project status implementation from app.js, independent
// from the large runtime and its asynchronous Pyodide initialization.
const start=app.indexOf("const normalProjectSession =");
const end=app.indexOf("const pyDoctor =",start);
assert.ok(start>0&&end>start);
vm.runInContext(app.slice(start,end),context);
assert.equal(window.TnsNormalProjectState.hasProject(),false);

vm.runInContext(workspace,context);
document.dispatchEvent({type:"DOMContentLoaded"});
const choices=()=>filePanel.querySelectorAll("[data-ndless-project-always]");
assert.equal(choices().length,3,"Ndless separator and both new/open entries exist on empty editor");
assert.equal(choices().filter(x=>x.className.includes("ndless-project-menu-action")).length,2);
assert.ok(choices().every(el=>!el.hidden&&el.style.display!=="none"),
  "Ndless choices should be visible in the empty editor");
assert.equal(newNormal.style.display,"","Normal actions stay visible");

// Simulate a successful normal XML document/page import.
vm.runInContext("markNormalProjectActive()",context);
assert.equal(window.TnsNormalProjectState.hasProject(),true);
assert.ok(choices().every(el=>el.hidden&&el.style.display==="none"),
  "Normal editor hides both Ndless entries and their separator");
assert.equal(newNormal.style.display,"","Normal File menu remains intact");
assert.equal(window.NdlessProjectWorkspace.getProject(),null);
window.NdlessProjectWorkspace.activateProject({name:"accidental-mix"});
assert.equal(window.NdlessProjectWorkspace.getProject(),null,
  "A normal project must not activate an Ndless workspace");
await window.NdlessProjectWorkspace.openProjectZip({name:"ndless-project.zip"});
assert.equal(window.NdlessProjectWorkspace.getProject(),null);

// A simulated active Ndless project also blocks any normal XML import/page
// operation. An empty editor still permits normal documents.
assert.doesNotThrow(()=>vm.runInContext("requireNormalProjectMode()",context));
const originalWorkspace=window.NdlessProjectWorkspace;
window.NdlessProjectWorkspace={getProject:()=>({name:"open-ndless"})};
assert.throws(()=>vm.runInContext("requireNormalProjectMode()",context),/Cierra el proyecto Ndless/);
window.NdlessProjectWorkspace=originalWorkspace;

// Releasing the normal session (fresh empty editor) restores both choices.
vm.runInContext("normalProjectSession.active=false",context);
document.dispatchEvent({type:"tns-normal-project-changed"});
assert.ok(choices().every(el=>!el.hidden&&el.style.display!=="none"));

for(const token of [
  "async function loadXmlDoctorFiles", "async function openTnsInXmlDoctor",
  "async function createNewXmlProject", "async function createEmptyXmlProjectForPageCreation",
  "async function ensureXmlStageCopy"
]){
  const pos=app.indexOf(token);
  assert.ok(pos>0,"Missing entry point: "+token);
  const endNext=app.indexOf("\n}",pos);
  assert.ok(app.slice(pos,endNext+2).includes("markNormalProjectActive()"),
    "Normal project marker missing from "+token);
}
for(const token of [
  "async function loadXmlDoctorFiles", "async function openTnsInXmlDoctor",
  "async function createNewXmlProject", "async function createEmptyXmlProjectForPageCreation",
  "async function addPageFromFileMenu"
]){
  const start=app.indexOf(token);
  assert.ok(start>=0,"Missing normal entry point: "+token);
  const nextFunction=app.indexOf("\n}",start);
  assert.ok(app.slice(start,nextFunction+2).includes("requireNormalProjectMode()"),
    "Normal editor must be blocked during Ndless workspace: "+token);
}
// Desktop must enable the actual menu entry without relying on the later
// generic app-ready button reset. The browser keeps its desktop notice gate.
filePanel.children=[newNormal,openNormal];
document.readyState='complete';window.TnsDesktop={};
vm.runInContext(workspace,context);
const desktopButton=filePanel.querySelector('#xml-new-ndless-project');
assert.equal(desktopButton.disabled,false,'Desktop New Project must be clickable immediately');
assert.equal(desktopButton.title,'');
assert.ok(!desktopButton.innerHTML.includes('off-badge'));
assert.ok(desktopButton.listeners.click?.length,'Base wizard must have a click handler before SDK enhancements load');
console.log("Ndless choices stay exclusive and the desktop menu entry is enabled immediately.");
