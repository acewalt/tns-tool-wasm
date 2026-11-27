import {parse} from '../../vendor/luaparse/index.js';
import {createProject,component,page,decodeProject,clone} from './model.js?v=20261127-builder-v51';
import {actionsToGraph} from './logic.js?v=20261127-builder-v51';
import {analyzeHelperDrawings} from './extended-analysis.js?v=20261127-builder-v51';

// Analysis never evaluates Lua. Hybrid edits replace individual AST expression ranges
// in the original chunk, so closures, upvalues, event registration and statement order stay intact.
const copy=clone;
const name=n=>n?.type==='Identifier'?n.name:n?.type==='MemberExpression'?name(n.base)+n.indexer+n.identifier.name:n?.type==='IndexExpression'?name(n.base)+'[]':'';
const children=n=>Object.entries(n||{}).filter(([k])=>!['loc','range','comments','globals'].includes(k)).flatMap(([,v])=>Array.isArray(v)?v.filter(x=>x&&typeof x.type==='string'):v&&typeof v.type==='string'?[v]:[]);
// luaparse's byte-oriented encodings reject Unicode UI text. Keep raw source
// ranges and decode only Lua 5.1 literals, without eval or executing the chunk.
function stringValue(raw){
 if(raw.startsWith('[')){const open=raw.match(/^\[(=*)\[/)[0],body=raw.slice(open.length,-open.length);return body.replace(/^\r?\n/,'').replace(/\r\n|\n\r|\r/g,'\n');}
 const body=raw.slice(1,-1);let out='';for(let i=0;i<body.length;i++){if(body[i]!=='\\'){out+=body[i];continue;}const next=body[++i],codes={a:'\x07',b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\x0b'};if(/[0-9]/.test(next)){let digits=next;while(digits.length<3&&/[0-9]/.test(body[i+1]||''))digits+=body[++i];out+=String.fromCharCode(Number(digits));}else if(next==='\r'||next==='\n'){if(next==='\r'&&body[i+1]==='\n')i++;out+='\n';}else out+=codes[next]??next;}return out;
}
const quoteLua=s=>'"'+String(s).replace(/["\\\x00-\x1f\x7f]/g,c=>c==='"'?'\\"':c==='\\'?'\\\\':'\\'+c.charCodeAt(0).toString().padStart(3,'0'))+'"';
const literal=n=>['NumericLiteral','StringLiteral','BooleanLiteral'].includes(n.type)||(n.type==='UnaryExpression'&&n.operator==='-'&&n.argument.type==='NumericLiteral');
function constant(n,env={}){
 if(!n)return undefined;
 if(n.type==='StringLiteral')return stringValue(n.raw);
 if(['NumericLiteral','BooleanLiteral','StringLiteral','NilLiteral'].includes(n.type))return n.value;
 if(n.type==='Identifier')return Object.hasOwn(env,n.name)?env[n.name]:undefined;
 if(n.type==='UnaryExpression'){const a=constant(n.argument,env);if(n.operator==='-'&&typeof a==='number')return-a;if(n.operator==='not'&&a!==undefined)return!a;}
 if(n.type==='BinaryExpression'){const a=constant(n.left,env),b=constant(n.right,env);if(a===undefined||b===undefined)return undefined;if(n.operator==='..')return String(a)+String(b);if(typeof a==='number'&&typeof b==='number'){const v={'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b,'^':()=>a**b,'%':()=>a%b}[n.operator]?.();return Number.isFinite(v)?v:undefined;}}
 return undefined;
}
const range=n=>({start:n.range[0],end:n.range[1],line:n.loc.start.line,endLine:n.loc.end.line});
const text=(s,n)=>s.slice(n.range[0],n.range[1]);
export function analyzeLuaImport(source,{filename='current.lua',extended=false}={}){
 source=String(source);if(source.length>1500000)throw Error('Lua import is limited to 1.5 MB.');
 const report={filename,source,mode:'source',lines:source.split(/\r?\n/).length,functions:[],variables:[],tables:[],events:[],calls:[],drawings:[],editors:[],pages:[],ambiguous:[],fragments:[],math:[],diagnostics:[],units:[],equivalence:'not-verified'};
 try{const native=decodeProject(source);if(native){report.mode='native';report.project=native;report.pages=native.pages.map(p=>({id:p.id,name:p.name}));return report;}}catch(e){report.diagnostics.push({severity:'error',message:'Visual metadata: '+e.message});return report;}
 let ast;try{ast=parse(source,{luaVersion:'5.1',scope:true,ranges:true,locations:true,comments:true,encodingMode:'none'});}catch(e){report.diagnostics.push({severity:'error',message:e.message,line:e.line||1});return report;}
 const env={},functions=[],paint=[],mouse=[];let serial=0;
 const mark=(n,kind,detail)=>{const v={id:'source_'+(++serial),kind,...range(n),detail};report.units.push(v);return v;};
 function visit(n,scope='chunk',path=[],binding=''){
  if(!n||typeof n!=='object')return;
  if(n.type==='FunctionDeclaration'){
   const id=name(n.identifier)||binding||'anonymous_'+n.range[0],parameters=n.parameters.map(p=>p.name||'...'),refs=new Set();
   function refsIn(v){if(v.type==='Identifier'&&!parameters.includes(v.name))refs.add(v.name);for(const c of children(v))refsIn(c);}n.body.forEach(refsIn);
   const f={id,name:id,scope,parameters,local:!!n.isLocal,references:[...refs],...range(n),source:text(source,n)};functions.push({node:n,info:f});report.functions.push(f);
   if(id.startsWith('on.')){report.events.push({...f,event:id.slice(3)});if(id==='on.paint')paint.push(n);if(id==='on.mouseDown')mouse.push(n);}
   for(const c of n.body)visit(c,id,path);return;
  }
  if(['LocalStatement','AssignmentStatement'].includes(n.type)){
   n.variables.forEach((v,i)=>{const id=name(v),value=constant(n.init[i],env);report.variables.push({name:id,scope,local:n.type==='LocalStatement',value,...range(v)});if(scope==='chunk'&&v.type==='Identifier'&&value!==undefined)env[id]=value;if(n.init[i]?.type==='TableConstructorExpression')report.tables.push({name:id,scope,fields:n.init[i].fields.map(f=>name(f.key)||f.key?.value).filter(x=>x!==undefined),...range(n.init[i])});if(n.init[i]?.type==='FunctionDeclaration')visit(n.init[i],scope,path,id);});
  }
  if(n.type==='BinaryExpression'&&['+','-','*','/','%','^'].includes(n.operator))report.math.push({operator:n.operator,scope,...range(n)});
  if(n.type==='CallExpression'){
   const callee=name(n.base);report.calls.push({from:scope,to:callee,...range(n)});
   if(callee==='D2Editor.newRichText')report.editors.push({scope,...range(n),kind:'D2Editor',editable:false});
   const method=n.base.type==='MemberExpression'&&n.base.indexer===':'?n.base.identifier.name:'';
   if(['drawString','fillRect','drawRect','drawLine','fillPolygon','drawPolyLine','drawArc','fillArc'].includes(method)&&scope==='on.paint'&&name(n.base.base)===paint.at(-1)?.parameters[0]?.name){
    const unit=mark(n,'drawing',method),args=n.arguments.map(a=>constant(a,env));
    const required=method==='drawString'?3:4;
    report.drawings.push({id:unit.id,method,args,argNodes:n.arguments.map(a=>({...range(a),literal:literal(a),value:constant(a,env)})),conditions:copy(path),...range(n),convertible:!path.some(p=>p.loop)&&args.length>=required&&args.slice(method==='drawString'?1:0,required).every(v=>Number.isFinite(v)&&Math.abs(v)<=9000)&&(method!=='drawString'||typeof args[0]==='string'),scope});
   }
  }
  if(['IfStatement','ForNumericStatement','ForGenericStatement','WhileStatement','RepeatStatement'].includes(n.type)){
   const unit=mark(n,n.type==='IfStatement'?'condition':'loop',text(source,n).split('\n')[0]);
   if(n.type==='IfStatement'){for(const c of n.clauses){const cond=c.condition?text(source,c.condition):'else';const key=c.condition?.type==='BinaryExpression'&&c.condition.operator==='=='?name(c.condition.left):'';const value=c.condition?constant(c.condition.right,env):undefined;const branch={condition:cond,key,value,line:n.loc.start.line};for(const b of c.body)visit(b,scope,[...path,branch]);}return;}
   for(const c of children(n))visit(c,scope,[...path,{loop:unit.id}]);return;
  }
  for(const c of children(n))if(!(c.type==='FunctionDeclaration'&&['AssignmentStatement','LocalStatement'].includes(n.type)))visit(c,scope,path);
 }
 ast.body.forEach(n=>visit(n));
 if(extended){const analysis=analyzeHelperDrawings(ast,source);report.extended=true;report.observations=analysis.drawings.filter(d=>!report.drawings.some(v=>v.start===d.start));report.resolvedCalls=analysis.calls;report.diagnostics.push(...analysis.diagnostics);}
 const styles=new Map();
 // Only on.paint statements with statically known arguments become editable visuals.
 // Other functions/branches remain in the original chunk, never hoisted into generated closures.
 function styleWalk(nodes,base={color:'#000000',font:11,bold:false}){let style={...base};for(const n of nodes){if(n.type==='CallStatement'&&n.expression.type==='CallExpression'){const c=n.expression,m=c.base.identifier?.name,a=c.arguments.map(n=>constant(n,env));if(m==='setColorRGB'&&a.every(Number.isFinite))style.color='#'+a.slice(0,3).map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')).join('');if(m==='setFont'){style.font=Math.max(6,Math.min(36,Number(a[2])||11));style.bold=a[1]==='b';}styles.set(c.range[0],{...style});}if(n.type==='IfStatement')n.clauses.forEach(c=>styleWalk(c.body,style));}}
 paint.forEach(f=>styleWalk(f.body));
 for(const d of report.drawings)d.style=styles.get(d.start)||{color:'#000000',font:11,bold:false};
 // A literal state equality is evidence of a possible page; it is not a function-name heuristic.
 const pageKeys=new Map();for(const d of report.drawings)for(const c of d.conditions)if(c.key&&['string','number'].includes(typeof c.value)){const id=c.key+':'+c.value;if(!pageKeys.has(id))pageKeys.set(id,{id,name:String(c.value),state:c.key,value:c.value,line:c.line});}
 report.pages=[...pageKeys.values()];
 // Rectangles alone stay shapes. A matching coordinate region in mouseDown is reviewable evidence.
 const rectangles=report.drawings.filter(d=>['fillRect','drawRect'].includes(d.method)&&d.convertible);
 for(const f of mouse){const inspect=n=>{if(n.type==='IfStatement')for(const clause of n.clauses){if(!clause.condition)continue;const comparisons=[];const find=c=>{if(c.type==='BinaryExpression'&&['>=','<=','>','<'].includes(c.operator)&&c.left.type==='Identifier'&&typeof constant(c.right,env)==='number')comparisons.push({axis:c.left.name,op:c.operator,value:constant(c.right,env)});children(c).forEach(find);};find(clause.condition);for(const d of rectangles){const[x,y,w,h]=d.args,[px,py]=f.parameters.map(n=>n.name);if(comparisons.some(c=>c.axis===px&&c.value===x)&&comparisons.some(c=>c.axis===px&&c.value===x+w)&&comparisons.some(c=>c.axis===py&&c.value===y)&&comparisons.some(c=>c.axis===py&&c.value===y+h))report.ambiguous.push({id:d.id,kind:'button-region',drawing:d.id,line:clause.loc.start.line,description:'Drawing overlaps a mouse hit region; visual role only. Original mouse handler is preserved.'});}}children(n).forEach(inspect);};f.body.forEach(inspect);}
 const supported=report.drawings.filter(d=>d.convertible&&['drawString','fillRect','drawRect','drawLine'].includes(d.method));
 for(const n of ast.body)if(!['FunctionDeclaration','LocalStatement','AssignmentStatement'].includes(n.type))report.fragments.push({...range(n),source:text(source,n),reason:'Top-level statement retained in place'});
 const visualLimit=report.pages.length>50||supported.length>200;
 report.mode=supported.length&&!visualLimit?'hybrid':'source';
 if(visualLimit)report.diagnostics.push({severity:'warning',message:'Source only: the drawing exceeds the editable model limit (200 components / 50 pages). The complete Lua remains intact.'});
 report.metrics={drawingCalls:report.drawings.length,editableDrawingCalls:visualLimit?0:supported.length,reviewRegions:report.ambiguous.length,retainedDrawingCalls:report.drawings.length-supported.length,functionsRetained:report.functions.length};
 report.diagnostics.push({severity:'warning',message:'Original handlers, lexical scopes and side effects are preserved. Functional equivalence is not certified; use Original / Converted comparison.'});
 if(report.editors.length)report.diagnostics.push({severity:'info',message:'D2Editor instances remain native Lua; their lifecycle is not rewritten.'});
 if(!supported.length)report.diagnostics.push({severity:'info',message:'Source only: no safely editable constant drawing calls found.'});
 // Retain compact structural callback graphs. They are analysis, not a second execution path.
 report.structures=functions.slice(0,100).map(({node,info})=>({name:info.name,...range(node),actions:structuralActions(node.body,source,0,{remaining:60})}));
 if(functions.length>100)report.diagnostics.push({severity:'info',message:'The first 100 functions have structural graphs. All functions remain in Overview and original source.'});
 return report;
}
function structuralActions(nodes,source,depth=0,budget={remaining:60}){if(depth>8)return[{type:'custom',code:'-- Nested source retained'}];const out=[];for(const n of nodes){if(budget.remaining--<=0)break;
 const common={node:'src_'+n.range[0],sourceRange:range(n),comment:n.type};
 if(n.type==='IfStatement'){const[c,...rest]=n.clauses;out.push({...common,type:'if',condition:c.condition?text(source,c.condition):'true',yes:structuralActions(c.body,source,depth+1,budget),no:rest.length?(rest[0].condition?structuralActions([{...n,clauses:rest,range:rest[0].range,loc:rest[0].loc}],source,depth+1,budget):structuralActions(rest[0].body,source,depth+1,budget)):[]});}
 else if(['WhileStatement','RepeatStatement','ForNumericStatement','ForGenericStatement'].includes(n.type))out.push({...common,type:n.type==='ForNumericStatement'?'repeat':'while',condition:n.condition?text(source,n.condition):'true',count:'1',body:structuralActions(n.body,source,depth+1,budget)});
 else out.push({...common,type:'custom',code:text(source,n).slice(0,8000)});
 }return out;}
export function projectFromImport(report,{accepted=[]}={}){
 if(report.mode==='native')return copy(report.project);
 if(report.diagnostics.some(d=>d.severity==='error'))throw Error('Fix Lua syntax or metadata errors before importing.');
 const p=createProject(report.filename.replace(/\.lua$/i,'').slice(0,200));p.imported={...copy(report),project:undefined,original:report.source,accepted:[...accepted],patches:[]};delete p.imported.source;delete p.imported.structures;for(const f of [...p.imported.functions,...p.imported.events,...p.imported.fragments])delete f.source;
 const pages=report.mode==='hybrid'&&report.pages.length?report.pages:[{id:'source',name:'Original',state:null}];p.pages=pages.map(d=>({...page(d.name),sourceState:d}));p.startPage=p.pages[0].id;
 for(const d of report.mode==='hybrid'?report.drawings:[]){if(!d.convertible||!['drawString','fillRect','drawRect','drawLine'].includes(d.method))continue;const pg=p.pages.find(pg=>d.conditions.some(c=>c.key===pg.sourceState.state&&c.value===pg.sourceState.value))||p.pages[0];let c;
  if(d.method==='drawString'){const[s,x,y,align]=d.args;c={...component('Label',x,y),w:Math.min(300,Math.max(20,String(s).length*d.style.font*.65)),h:d.style.font+10,text:String(s),foreground:d.style.color,font:d.style.font,bold:d.style.bold};if(align!=='top')c.y-=d.style.font;}
  else{const[x,y,w,h]=d.args;c={...component('Shape',Math.min(x,d.method==='drawLine'?w:x),Math.min(y,d.method==='drawLine'?h:y)),w:Math.min(9000,Math.max(4,d.method==='drawLine'?Math.abs(w-x):w)),h:Math.min(9000,Math.max(4,d.method==='drawLine'?Math.abs(h-y):h)),shape:d.method==='drawLine'?'line':'rectangle',foreground:d.style.color,color:d.method==='fillRect'?d.style.color:'#ffffff',text:''};}
  c.id=d.id;c.sourceBinding={method:d.method,args:copy(d.argNodes),initial:copy(c),line:d.line};if(accepted.includes(d.id)&&report.ambiguous.some(a=>a.id===d.id))c.importRole='Button';pg.components.push(c);
 }
 // Helper observations are useful for reconstruction but are never silently
 // turned into edits of a shared function, a loop or a dynamic binding.
 for(const d of report.observations||[]){if(!d.constant||d.conditions.some(c=>c.loop)||!['drawString','fillRect','drawRect','drawLine'].includes(d.method)||p.pages[0].components.length>=200)continue;const a=d.args,c=component(d.method==='drawString'?'Label':'Shape',Number(a[d.method==='drawString'?1:0])||0,Number(a[d.method==='drawString'?2:1])||0);c.id=d.id;c.locked=true;c.foreground=d.style.color;c.text=d.method==='drawString'?a[0]:'';c.w=Math.min(300,Math.max(4,d.method==='drawString'?String(a[0]).length*d.style.font*.65:Number(a[2])||4));c.h=Math.max(4,d.method==='drawString'?d.style.font+5:Number(a[3])||4);c.font=Math.max(6,Math.min(36,d.style.font));c.shape=d.method==='drawLine'?'line':'rectangle';c.captureBinding={status:'Read only',source:{function:d.scope,line:d.line,expression:d.expression},dependencies:d.dependencies};p.pages[0].components.push(c);}
 for(const s of report.structures||[]){const key='app:source_'+s.start,g=actionsToGraph(s.actions,'app','source_'+s.start);g.imported={name:s.name,line:s.line};p.graphs[key]=g;}
 if(JSON.stringify(p).length>3900000){p.graphs={};for(const key of ['drawings','variables','functions','events','calls','tables','math','units','fragments','editors'])p.imported[key]=(p.imported[key]||[]).slice(0,100);p.imported.diagnostics.push({severity:'warning',message:'Structural metadata was limited for this large source file. The complete original Lua is preserved.'});}
 return p;
}
export function generateImportedLua(p,{metadata=true}={}){
 const imported=p.imported,original=imported.original,patches=[];
 for(const pg of p.pages)for(const c of pg.components){const b=c.sourceBinding;if(!b)continue;const mapping=b.method==='drawString'?{text:0,x:1,y:2}:b.method==='drawLine'?{}:{x:0,y:1,w:2,h:3};
  for(const[prop,index]of Object.entries(mapping)){if(c[prop]===b.initial[prop])continue;const arg=b.args[index];if(!arg?.literal)throw Error(c.id+': '+prop+' is linked to original Lua state and cannot be replaced safely.');const value=typeof c[prop]==='number'?arg.value+c[prop]-b.initial[prop]:c[prop];patches.push({start:arg.start,end:arg.end,replacement:typeof value==='string'?quoteLua(value):String(value),component:c.id,property:prop,line:b.line});}
  for(const prop of ['x','y','w','h'])if(!(prop in mapping)&&c[prop]!==b.initial[prop])throw Error(c.id+': '+prop+' is not an editable source argument.');
  for(const prop of ['type','foreground','color','font','bold','visible','parent'])if(c[prop]!==b.initial[prop])throw Error(c.id+': '+prop+' requires editing the original Lua; this import preserves native handlers.');
 }
 const sorted=patches.sort((a,b)=>b.start-a.start);for(let i=1;i<sorted.length;i++)if(sorted[i].end>sorted[i-1].start)throw Error('Overlapping imported source edits');let out=original;for(const patch of sorted)out=out.slice(0,patch.start)+patch.replacement+out.slice(patch.end);
 const header=metadata?'-- @tns-visual-builder:'+encodeURIComponent(JSON.stringify(p))+'\n':'';return header+out;
}
export function compareImported(p){const converted=generateImportedLua(p,{metadata:false}),original=p.imported.original;const a=original.split('\n'),b=converted.split('\n');return{original,converted,equivalence:'not-verified',changedLines:a.map((s,i)=>s===b[i]?null:{line:i+1,original:s,converted:b[i]??''}).filter(Boolean),mappings:p.pages.flatMap(pg=>pg.components.map(c=>({page:pg.id,component:c.id,line:c.sourceBinding?.line}))),diagnostics:p.imported.diagnostics};}
