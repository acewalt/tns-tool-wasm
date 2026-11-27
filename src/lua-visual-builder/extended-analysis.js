// Bounded abstract interpretation. This walks Lua syntax; it never runs Lua or JS
// supplied by the user. Inferred helper drawings stay read-only until reviewed.
const children=n=>Object.entries(n||{}).filter(([k])=>!['loc','range','comments','globals'].includes(k)).flatMap(([,v])=>Array.isArray(v)?v.filter(x=>x?.type):v?.type?[v]:[]);
const GC=Symbol('graphics context'),unknown=Symbol('dynamic');
export function analyzeHelperDrawings(ast,source,{maxSteps=12000,maxCalls=400,maxDepth=16}={}){
 const drawings=[],calls=[],functions=[],tables=[],diagnostics=[];let steps=0,callCount=0;
 const root={parent:null,values:new Map([['on',new Map()]])},frames=[];
 const get=(env,id)=>env.values.has(id)?env.values.get(id):env.parent?get(env.parent,id):unknown;
 const owner=(env,id)=>env.values.has(id)||!env.parent?env:owner(env.parent,id);
 const raw=n=>source.slice(...n.range),range=n=>({start:n.range[0],end:n.range[1],line:n.loc.start.line,endLine:n.loc.end.line});
 const fnName=n=>n?.type==='Identifier'?n.name:n?.type==='MemberExpression'?fnName(n.base)+n.indexer+n.identifier.name:'callback@'+(n?.loc.start.line||1);
 const bounded=()=>++steps<=maxSteps;
 function value(n,env){if(!n||!bounded())return unknown;
  if(['NumericLiteral','BooleanLiteral'].includes(n.type))return n.value;
  if(n.type==='NilLiteral')return null;
  if(n.type==='StringLiteral'){const r=n.raw;if(r.startsWith('[')){const open=r.match(/^\[(=*)\[/)?.[0];return open?r.slice(open.length,-open.length).replace(/^\r?\n/,''):unknown;}return r.slice(1,-1).replace(/\\([nrt\\"'])/g,(_,c)=>({n:'\n',r:'\r',t:'\t'}[c]||c));}
  if(n.type==='Identifier')return get(env,n.name);
  if(n.type==='TableConstructorExpression'){const table=new Map();let i=1;for(const f of n.fields){const k=f.type==='TableKeyString'?f.key.name:f.type==='TableValue'?i++:value(f.key,env);if(k!==unknown)table.set(k,value(f.value,env));}return table;}
  if(n.type==='MemberExpression'||n.type==='IndexExpression'){const table=value(n.base,env),key=n.type==='MemberExpression'?n.identifier.name:value(n.index,env);return table instanceof Map?table.get(key)??unknown:unknown;}
  if(n.type==='FunctionDeclaration'){const f={node:n,env,name:fnName(n.identifier)};functions.push({name:f.name,...range(n),parameters:n.parameters.map(p=>p.name)});return f;}
  if(n.type==='UnaryExpression'){const a=value(n.argument,env);if(a===unknown)return unknown;return n.operator==='-'&&typeof a==='number'?-a:n.operator==='not'?!a:unknown;}
  if(n.type==='BinaryExpression'||n.type==='LogicalExpression'){const a=value(n.left,env),b=value(n.right,env);if(a===unknown||b===unknown)return unknown;const op=n.operator;if(op==='..')return String(a)+String(b);if(op==='==')return a===b;if(op==='~=')return a!==b;if(op==='and')return a&&b;if(op==='or')return a||b;if(typeof a==='number'&&typeof b==='number'){const v={'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b,'^':()=>a**b,'%':()=>a%b,'<':()=>a<b,'>':()=>a>b,'<=':()=>a<=b,'>=':()=>a>=b}[op]?.();return typeof v==='boolean'||Number.isFinite(v)?v:unknown;}return unknown;}
  if(n.type==='CallExpression')return call(n,env);
  return unknown;
 }
 function assign(n,v,env,local=false){if(n.type==='Identifier')(local?env:owner(env,n.name)).values.set(n.name,v);else if(n.type==='MemberExpression'||n.type==='IndexExpression'){const table=value(n.base,env),k=n.type==='MemberExpression'?n.identifier.name:value(n.index,env);if(table instanceof Map&&k!==unknown)table.set(k,v);}}
 function invoke(f,args,origin){if(!f?.node||++callCount>maxCalls||frames.length>=maxDepth)return unknown;const env={parent:f.env,values:new Map()};f.node.parameters.forEach((p,i)=>env.values.set(p.name,args[i]??unknown));frames.push({name:f.name,line:origin?.loc.start.line,path:frames.at(-1)?.path||[],style:{...(frames.at(-1)?.style||{color:'#000000',font:11,bold:false})}});const result=body(f.node.body,env);frames.pop();return result?.returnValue??unknown;}
 function call(n,env){const method=n.base.type==='MemberExpression'?n.base.identifier.name:'',receiver=n.base.type==='MemberExpression'?value(n.base.base,env):unknown,args=n.arguments.map(a=>value(a,env)),frame=frames.at(-1);
  if(frame&&receiver===GC){if(method==='setColorRGB'&&args.slice(0,3).every(Number.isFinite))frame.style.color='#'+args.slice(0,3).map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');if(method==='setFont'){frame.style.font=Number(args[2])||11;frame.style.bold=args[1]==='b';}if(['drawString','fillRect','drawRect','drawLine','drawArc','fillArc','drawPolyLine','fillPolygon','drawImage'].includes(method)){const required=method==='drawString'?3:4,known=args.length>=required&&args.slice(method==='drawString'?1:0,required).every(Number.isFinite)&&(method!=='drawString'||typeof args[0]==='string');drawings.push({id:'helper_'+n.range[0]+'_'+drawings.length,method,args:args.map(v=>v===unknown||v===GC||typeof v==='object'?null:v),style:{...frame.style},scope:frame.name,conditions:[...frame.path],...range(n),expression:raw(n),callPath:frames.map(f=>({function:f.name,line:f.line})),constant:known,convertible:false,status:known?'read-only':'dynamic',dependencies:n.arguments.flatMap(a=>{const out=[];const walk=x=>{if(x.type==='Identifier')out.push(x.name);children(x).forEach(walk);};walk(a);return out;})});}return unknown;}
  const f=value(n.base,env);if(f?.node){calls.push({from:frame?.name||'chunk',to:f.name,...range(n)});return invoke(f,n.base.indexer===':'?[receiver,...args]:args,n);}return unknown;
 }
 function body(nodes,env){for(const n of nodes){if(!bounded())break;
  if(n.type==='FunctionDeclaration'){const f=value(n,env);assign(n.identifier,f,env,n.isLocal);}
  else if(n.type==='LocalStatement'||n.type==='AssignmentStatement'){const vals=n.init.map(a=>value(a,env));n.variables.forEach((v,i)=>{const val=vals[i]??unknown;if(val?.node&&val.name.startsWith('callback@'))val.name=fnName(v);assign(v,val,env,n.type==='LocalStatement');if(val instanceof Map)tables.push({name:fnName(v),fields:[...val.keys()].filter(k=>typeof k==='string'),...range(n)});});}
  else if(n.type==='CallStatement')call(n.expression,env);
  else if(n.type==='ReturnStatement')return {returnValue:value(n.arguments[0],env)};
  else if(n.type==='IfStatement'){for(const clause of n.clauses){const condition=clause.condition?value(clause.condition,env):true;if(condition===false)continue;const frame=frames.at(-1),old=frame?.path;if(frame)frame.path=[...old,{condition:clause.condition?raw(clause.condition):'else',line:n.loc.start.line}];const result=body(clause.body,{parent:env,values:new Map()});if(frame)frame.path=old;if(condition===true){if(result)return result;break;}}}
  else if(['WhileStatement','RepeatStatement','ForNumericStatement','ForGenericStatement'].includes(n.type)){const frame=frames.at(-1),old=frame?.path;if(frame)frame.path=[...old,{loop:n.range[0],condition:raw(n).split('\n')[0]}];body(n.body,{parent:env,values:new Map()});if(frame)frame.path=old;}
 }return null;}
 // Register the chunk without executing top-level calls, timers or callbacks.
 body(ast.body.filter(n=>['FunctionDeclaration','LocalStatement','AssignmentStatement'].includes(n.type)),root);
 const on=get(root,'on'),paint=on instanceof Map?on.get('paint'):null;
 // Lua allows function on.paint without an earlier `on = {}` in ScriptApps.
 if(paint?.node)invoke(paint,[GC]);
 else {const decl=ast.body.find(n=>n.type==='FunctionDeclaration'&&fnName(n.identifier)==='on.paint');if(decl)invoke({node:decl,env:root,name:'on.paint'},[GC]);}
 if(steps>maxSteps||callCount>maxCalls)diagnostics.push({severity:'info',message:'Extended static analysis reached its bound. Use Visual Capture for remaining dynamic drawing.'});
 return {drawings:drawings.slice(0,1000),calls,functions,tables,diagnostics,steps};
}
