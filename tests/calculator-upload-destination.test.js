import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const script=fs.readFileSync(new URL("../ti-calculator-transfer.js",import.meta.url),"utf8")
  .replace("window.TnsCalculatorTransfer=Object.freeze({open,close});",
  "window.TnsCalculatorTransfer=Object.freeze({open,close,upload,current,controls,chooseDestination});window.__destinationState=state;");
assert.match(script,/window.__destinationState=state/);

class Element {
  constructor(tag="div"){
    this.tag=tag;this.className="";this.children=[];this.events={};this.attributes={};
    this.textContent="";this.dataset={};this.disabled=false;this.hidden=false;this.value="";
    this.checked=false;this.files=[];this.style={};this.focused=false;
    this.classList={toggle:()=>{},add:()=>{}};
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  remove(){this.removed=true;}
  focus(){this.focused=true;}
  setAttribute(name,value){this.attributes[name]=value;}
  addEventListener(event,callback){this.events[event]=callback;}
  dispatchEvent(event){this.events[event.type]?.(event);}
  click(){this.events.click?.({type:"click",target:this,preventDefault(){},stopPropagation(){}});}
}
const childrenOf=node=>[node,...(node.children||[]).flatMap(childrenOf)];
const ui=new Map();
const managerDialog=new Element("section");
ui.set(".ti-manager-dialog",managerDialog);
const root={
  querySelector:key=>{
    if(!ui.has(key))ui.set(key,new Element("control"));
    return ui.get(key);
  },
  querySelectorAll:()=>[]
};
const builderButton=new Element("button");builderButton.disabled=false;
const document={
  documentElement:{lang:"es"},
  activeElement:{focus(){}},
  querySelector:key=>key==="#xml-create-tns-btn"?builderButton:null,
  createElement:tag=>new Element(tag),
  addEventListener:()=>{}
};
const written=[],visited=[],confirmMessages=[],currentBuilds=[];
const directories={
  "/":[{name:"math",path:"/math",isDir:true,size:0},
       {name:"notes",path:"/notes",isDir:true,size:0}],
  "/math":[{name:"nested",path:"/math/nested",isDir:true,size:0}],
  "/math/nested":[{name:"existing.tns",path:"/math/nested/existing.tns",isDir:false,size:1}],
  "/notes":[]
};
const device={
  connected:true,
  async listDir(path){
    visited.push(path);
    assert.ok(Object.hasOwn(directories,path),"Unknown simulated folder: "+path);
    return directories[path].map(entry=>({...entry}));
  },
  async putFile(path,bytes,progress){
    written.push({path,data:Array.from(bytes)});
    progress?.(bytes.length,bytes.length,"finalizing");
  }
};
const fakeWindow={
  TnsNspireUSB:{
    childPath:(path,name)=>{
      if(!name||name.includes("/")||name===".."||name===".")
        throw Error("Invalid filename");
      return (path==="/"?"/":path+"/")+name;
    }
  },
  TnsFileSaveExperimental:{
    async buildXmlDoctorArtifact(){
      currentBuilds.push("build");
      return {ok:true,filename:"current.tns",bytes:Uint8Array.of(9,8,7)};
    }
  }
};
const context=vm.createContext({
  window:fakeWindow,document,console,Uint8Array,Date,
  Event:class{constructor(type){this.type=type}},
  localStorage:{setItem(){},getItem(){return null}},
  confirm:message=>{confirmMessages.push(message);return true;},
  setTimeout,clearTimeout,Error
});
vm.runInContext(script,context);
const manager=fakeWindow.TnsCalculatorTransfer;
const state=fakeWindow.__destinationState;
state.root=root;state.link=device;state.path="/math";state.view="grid";
state.cache.set("/",directories["/"]);state.cache.set("/math",directories["/math"]);
state.files=directories["/math"];
const folderDialog=()=>managerDialog.children.find(x=>x.className==="ti-destination-overlay"&&!x.removed);
const byClass=(className)=>childrenOf(folderDialog()).find(x=>x.className===className);
const visibleFolders=()=>childrenOf(byClass("ti-destination-list")).filter(x=>x.className==="ti-destination-folder");
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

// 1. Normal file picker -> current folder -> nested folder -> confirm.
const file={name:"test.tns",async arrayBuffer(){return Uint8Array.of(1,2,3).buffer;}};
const uploadPromise=manager.upload([file]);
assert.ok(folderDialog(),"Folder picker must appear before USB upload");
assert.equal(written.length,0,"No bytes sent before selecting the destination");
assert.equal(state.destinationPicker.path,"/math");
assert.equal(byClass("ti-destination-path").textContent,"/math");
assert.equal(ui.get("[data-ti-current]").disabled,true,"Other USB actions locked during chooser");
await flush();
assert.deepEqual(visibleFolders().map(x=>x.children[1].textContent),["nested"]);
visibleFolders()[0].click();
await flush();
assert.equal(state.destinationPicker.path,"/math/nested");
byClass("ti-destination-confirm").click();
await uploadPromise;
assert.deepEqual(written,[{path:"/math/nested/test.tns",data:[1,2,3]}]);
assert.equal(state.path,"/math","Destination selection must not navigate the main explorer");
assert.equal(state.destinationPicker,null,"Picker must clean up after confirmation");

// 2. Cancel must never write nor build a current TNS.
const cancelPromise=manager.upload([file]);
assert.ok(folderDialog());
byClass("ti-destination-cancel").click();
await cancelPromise;
assert.equal(written.length,1);
assert.equal(state.destinationPicker,null);

// 3. Current TNS prompts for directory BEFORE generating and sending.
const currentPromise=manager.current();
assert.ok(folderDialog());
assert.equal(currentBuilds.length,0);
byClass("ti-destination-nav").click(); // Home
await flush();
assert.equal(state.destinationPicker.path,"/");
const notes=visibleFolders().find(n=>n.children[1].textContent==="notes");
assert.ok(notes);
notes.click();
await flush();
assert.equal(state.destinationPicker.path,"/notes");
byClass("ti-destination-confirm").click();
await currentPromise;
assert.equal(currentBuilds.length,1);
assert.equal(written[1].path,"/notes/current.tns");
assert.equal(state.path,"/math");

// 4. If a file exists in the TARGET folder, not merely in state.path,
//    ask for overwrite before sending.
const overwrite=manager.upload([{name:"existing.tns",async arrayBuffer(){return Uint8Array.of(5).buffer;}}]);
await flush();
visibleFolders()[0].click();
await flush();
byClass("ti-destination-confirm").click();
await overwrite;
assert.ok(confirmMessages.some(msg=>msg.includes("/math/nested/existing.tns")));
assert.equal(written[2].path,"/math/nested/existing.tns");

// 5. Cancel by Escape and clicking outside the picker.
const esc=manager.upload([file]);
const overlay=folderDialog();
overlay.dispatchEvent({type:"keydown",key:"Escape",preventDefault(){},stopPropagation(){}});
await esc;
assert.equal(written.length,3);
const outside=manager.upload([file]);
const overlay2=folderDialog();
overlay2.dispatchEvent({type:"click",target:overlay2});
await outside;
assert.equal(written.length,3);
assert.equal(state.destinationPicker,null);
assert.equal(ui.get("[data-ti-current]").disabled,false,
  "Manager controls must be re-enabled after picker cancellation");
assert.ok(visited.includes("/math/nested")&&visited.includes("/notes"));

// Create in the chosen destination, await the calculator acknowledgement,
// enter the new folder and only upload after explicit confirmation.
const created=[];
let acknowledgeCreation;
device.makeDir=async path=>{
  created.push(path);
  await new Promise(resolve=>{acknowledgeCreation=resolve;});
  directories[path]=[];
  const parts=path.split("/"),name=parts.pop(),parent=parts.join("/")||"/";
  directories[parent].push({name,path,isDir:true,size:0});
};
const createUpload=manager.upload([file]);await flush();
byClass("ti-destination-new-folder").click();
assert.equal(byClass("ti-destination-create-form").hidden,false);
const nameInput=byClass("ti-destination-folder-name");
const submit=()=>byClass("ti-destination-create-form").dispatchEvent({type:"submit",preventDefault(){}});
nameInput.value="nested";submit();await flush();
assert.equal(created.length,0,"Existing names must not create a USB request");
nameInput.value="../escape";submit();await flush();
assert.equal(created.length,0,"Invalid names must not create a USB request");
nameInput.value="new-games";submit();await flush();
assert.deepEqual(created,["/math/new-games"]);
assert.equal(byClass("ti-destination-confirm").disabled,true);
byClass("ti-destination-cancel").click();
assert.ok(state.destinationPicker,"An in-flight folder creation must hold the USB lock");
assert.equal(written.length,3);
acknowledgeCreation();await flush();
assert.equal(state.destinationPicker.path,"/math/new-games");
assert.equal(byClass("ti-destination-create-form").hidden,true);
assert.equal(byClass("ti-destination-confirm").disabled,false);
assert.ok(state.cache.get("/math").some(entry=>entry.path==="/math/new-games"));
assert.equal(state.path,"/math","Creating a destination must not navigate the main explorer");
byClass("ti-destination-confirm").click();await createUpload;
assert.equal(written[3].path,"/math/new-games/test.tns");

// A rejected creation leaves the chooser open, with no upload or fake folder.
device.makeDir=async()=>{throw Error("USB mkdir refused");};
const failedCreation=manager.upload([file]);await flush();
byClass("ti-destination-new-folder").click();
byClass("ti-destination-folder-name").value="refused";submit();await flush();
assert.equal(state.destinationPicker.path,"/math");
assert.match(byClass("ti-destination-notice").textContent,/USB mkdir refused/);
assert.equal(byClass("ti-destination-confirm").disabled,false);
assert.equal(written.length,4);
byClass("ti-destination-create-cancel").click();
assert.equal(byClass("ti-destination-create-form").hidden,true);
byClass("ti-destination-cancel").click();await failedCreation;
assert.equal(state.destinationPicker,null);
assert.equal(written.length,4);
console.log("Both TNS uploads select destination, check overwrites and cancel without USB writes.");
