import {parse} from '../../vendor/luaparse/index.js';
import {component,page,createProject,clone} from './model.js?v=20261128-source-reconstruction-v53';
import {projectFromImport} from './importer.js?v=20261128-source-reconstruction-v53';
import {bindCapturedComponents} from './captured-bindings.js';
const methods=new Set(['drawString','drawRect','fillRect','drawLine','drawPolyLine','drawPolygon','fillPolygon','drawArc','fillArc','drawImage','setColorRGB','setFont','clipRect','setPen']);
const children=n=>Object.entries(n||{}).filter(([k])=>!['loc','range','comments','globals'].includes(k)).flatMap(([,v])=>Array.isArray(v)?v.filter(x=>x?.type):v?.type?[v]:[]);
export function instrumentCaptureSource(source){
 const ast=parse(source,{luaVersion:'5.1',ranges:true,locations:true,encodingMode:'none'}),sites={},edits=[];let serial=0,name='__tnsVisualCapture';while(source.includes(name))name+='_';
 function visit(n,scope='chunk'){
  if(n.type==='FunctionDeclaration')scope=n.identifier?source.slice(...n.identifier.range):'anonymous@'+n.loc.start.line;
  if(n.type==='CallExpression'&&n.base.type==='MemberExpression'&&n.base.indexer===':'&&methods.has(n.base.identifier.name)){
   const id=++serial,method=n.base.identifier.name,base=source.slice(...n.base.base.range),open=source.indexOf('(',n.base.range[1]);
   if(open<n.range[1]){sites[id]={id,method,function:scope,line:n.loc.start.line,start:n.range[0],end:n.range[1],expression:source.slice(...n.range)};edits.push({start:n.range[0],end:open+1,text:`${name}(${id},${base},"${method}"${n.arguments.length?',':''}`});}
  }
  children(n).forEach(c=>visit(c,scope));
 }visit(ast);let code=source;for(const e of edits.sort((a,b)=>b.start-a.start))code=code.slice(0,e.start)+e.text+code.slice(e.end);return {code,name,sites};
}
export function createCaptureRecorder({sites={},now=()=>Date.now(),maxOperations=50000,maxFrames=300,maxMs=120000,sampleMs=0}={}){
 let active=true,paused=false,started=now(),operations=0,frame=[],frames=[],events=[],currentSite=null,lastFrame=null,stopReason='',style={color:'#000000',font:11,bold:false,clip:null};
 const plain=(v,depth=0)=>{if(v==null||['string','number','boolean'].includes(typeof v))return v;if(depth>2)return '[object]';if(Array.isArray(v))return v.slice(0,256).map(x=>plain(x,depth+1));if(v.str){const out=[];for(let i=1;i<257;i++){const x=v.array?.[i]??v.num?.[i]??v.str[i];if(x===undefined)break;out.push(plain(x,depth+1));}return out.length?out:'[Lua object]';}return '[object]';};
 const can=()=>{if(active&&(now()-started>maxMs||operations>=maxOperations||frames.length>=maxFrames)){active=false;stopReason='Capture limit reached';}return active;};
 return {
  site(id){const old=currentSite;currentSite=sites[id]||null;return()=>currentSite=old;},
  operation(method,args,extra={}){if(!can())return;operations++;const a=args.map(v=>plain(v));if(method==='setColorRGB')style.color='#'+a.slice(0,3).map(v=>Math.max(0,Math.min(255,Math.round(Number(v)||0))).toString(16).padStart(2,'0')).join('');if(method==='setFont'){style.font=Number(a[2])||11;style.bold=String(a[1]).includes('b');}if(method==='clipRect')style.clip=a;frame.push({method,args:a,style:clone(style),source:currentSite?clone(currentSite):null,...extra,order:frame.length});},
  begin(){frame=[];},
  end(editors=[],size={width:320,height:212}){if(!can())return;for(const [i,e]of editors.entries())if(e.visible!==false)this.operation('D2Editor',[String(e.text||''),e.x,e.y,e.w,e.h],{editor:i,readOnly:!!e.readOnly});lastFrame={operations:frame.slice(),size:{...size},time:now()-started,event:events.at(-1)||null};if(!paused&&(!frames.length||lastFrame.time-frames.at(-1).time>=sampleMs))frames.push(lastFrame);},
  event(type,args=[]){if(can())events.push({type,args:args.slice(0,8).map(x=>plain(x)),time:now()-started});},
  pause(value=true){paused=value;},
  snapshot(){return lastFrame?clone(lastFrame):null;},
  export(){return {format:'tns-lua-capture',version:1,frames:clone(frames),events:clone(events),operations,active,paused,stopReason};},
  stop(){active=false;},
 };
}
export function screenFingerprint(frame,{structural=false}={}){
 const data=frame.operations.filter(o=>!o.method.startsWith('set')).map(o=>[o.method,structural&&['drawString','D2Editor'].includes(o.method)?[...o.args.slice(1)]:o.args,o.style]);let hash=2166136261;for(const c of JSON.stringify(data)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);
}
export function reconstructScreen(frame){
 const out=[];for(const op of frame.operations){const a=op.args,s=op.style;let c,status='Read only';
  if(op.method==='drawString'){c=component('Label',Number(a[1])||0,(Number(a[2])||0)-(a[3]==='top'?0:s.font));Object.assign(c,{text:String(a[0]),w:Math.max(4,Math.min(1000,String(a[0]).length*s.font*.6)),h:Math.max(4,s.font+5),foreground:s.color,font:Math.max(6,Math.min(36,s.font)),bold:s.bold});}
  else if(['fillRect','drawRect','drawLine'].includes(op.method)){c=component('Shape',Number(a[0])||0,Number(a[1])||0);Object.assign(c,{w:Math.max(4,Math.abs(Number(a[2])-(op.method==='drawLine'?c.x:0))||4),h:Math.max(4,Math.abs(Number(a[3])-(op.method==='drawLine'?c.y:0))||4),shape:op.method==='drawLine'?'line':'rectangle',color:op.method==='fillRect'?s.color:'#ffffff',foreground:s.color,text:''});}
  else if(op.method==='D2Editor'){c=component('Input',Number(a[1])||0,Number(a[2])||0);Object.assign(c,{value:String(a[0]),w:Math.max(4,Number(a[3])||100),h:Math.max(4,Number(a[4])||24)});status='Dynamic binding';}
  else if(op.method==='drawImage'){c=component('Image',Number(a[1])||0,Number(a[2])||0);status='Unsupported';}
  if(c){c.captureBinding={operation:op.order,source:op.source,status,style:clone(s)};c.locked=true;out.push(c);}
 }
 return out.slice(0,200);
}
export function projectFromCapture(report,session){
 const p=projectFromImport(report);p.pages=[];const groups=new Map(),screenPages={};
 for(const screen of session.screens.slice(0,50)){const key=screen.group||screen.id;let pg=groups.get(key);if(!pg){pg=page(screen.name);pg.components=reconstructScreen(screen.frame);pg.captureThumbnail=screen.thumbnail;pg.captureGroup=key;groups.set(key,pg);p.pages.push(pg);}screenPages[screen.id]=pg.id;}
 if(!p.pages.length)throw Error('Capture at least one screen.');
 p.imported.metrics.sourceLinkedComponents=bindCapturedComponents(report.source||report.original,p.pages);
 p.startPage=p.pages[0].id;p.imported.mode='hybrid';p.imported.capture={format:session.format,version:1,screenPages,screens:session.screens.map(s=>({id:s.id,name:s.name,group:s.group,fingerprint:s.fingerprint})),transitions:clone(session.transitions||[])};return p;
}
export function nativePageFromCapture(frame,name='Captured page'){
 const pg=page(name);pg.components=reconstructScreen(frame).filter(c=>c.type!=='Image').map(c=>{c.locked=false;c.captureBinding.status='Needs review';return c;});return pg;
}
