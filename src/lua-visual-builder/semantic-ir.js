import {parse} from '../../vendor/luaparse/index.js';

export const luaName=n=>n?.type==='Identifier'?n.name:n?.type==='MemberExpression'?luaName(n.base)+n.indexer+n.identifier.name:'';
export const astChildren=n=>Object.entries(n||{}).filter(([k])=>!['loc','range','comments','globals'].includes(k)).flatMap(([,v])=>Array.isArray(v)?v.filter(x=>x?.type):v?.type?[v]:[]);
export const sourceOf=(source,node)=>source.slice(...node.range);
export function luaLiteral(n){
 if(!n)return undefined;if(n.type==='NilLiteral')return null;if(n.type==='NumericLiteral'||n.type==='BooleanLiteral')return n.value;
 if(n.type==='StringLiteral'){const r=n.raw;if(r[0]==='['){const m=r.match(/^\[(=*)\[/)[0];return r.slice(m.length,-m.length).replace(/^\r?\n/,'');}return r.slice(1,-1).replace(/\\(\d{1,3}|\r?\n|.)/gs,(_,c)=>/^\d/.test(c)?String.fromCharCode(+c):({n:'\n',r:'\r',t:'\t',a:'\x07',b:'\b',f:'\f',v:'\v','\n':'\n'})[c]??c);}
 throw Error('Not a literal: '+n.type);
}
export function luaData(n){
 if(n?.type==='TableConstructorExpression'){const out={},array=[];let keyed=false;for(const f of n.fields){if(f.type==='TableValue')array.push(luaData(f.value));else{keyed=true;out[f.key.name??luaLiteral(f.key)]=luaData(f.value);}}if(!keyed)return array;array.forEach((v,i)=>out[i+1]=v);return out;}
 if(n?.type==='UnaryExpression'&&n.operator==='-')return -luaData(n.argument);return luaLiteral(n);
}
// Serializable IR records ownership and source ranges before any visual compiler
// makes a decision. Unknown operations are retained, never represented as no-ops.
export function analyzeLuaIR(source){
 const ast=parse(source,{luaVersion:'5.1',scope:true,ranges:true,locations:true,comments:true,encodingMode:'none'}),scopes=[{id:'chunk',parent:null,symbols:[]}],functions=[],calls=[],operations=[],pages=[];
 const walk=(node,scope='chunk')=>{if(!node)return;let own=scope;
  if(node.type==='FunctionDeclaration'){const id='fn_'+node.range[0],label=luaName(node.identifier)||'callback@'+node.loc.start.line;functions.push({id,name:label,scope,local:!!node.isLocal,parameters:node.parameters.map(p=>p.name||'...'),range:node.range,line:node.loc.start.line,body:node.body.map(n=>({type:n.type,range:n.range}))});scopes.push({id,parent:scope,symbols:node.parameters.map(p=>({name:p.name,kind:'parameter'}))});own=id;}
  if(['LocalStatement','AssignmentStatement'].includes(node.type))for(const v of node.variables)scopes.find(s=>s.id===own).symbols.push({name:luaName(v),kind:node.type==='LocalStatement'?'local':'assignment',range:v.range});
  if(node.type==='CallExpression'){calls.push({from:own,to:luaName(node.base),range:node.range,line:node.loc.start.line});if(luaName(node.base)==='addPage'&&node.arguments[0]?.type==='TableConstructorExpression')pages.push(node.arguments[0]);}
  if(['BinaryExpression','LogicalExpression','UnaryExpression','IfStatement','ForNumericStatement','ForGenericStatement','WhileStatement','RepeatStatement','ReturnStatement'].includes(node.type))operations.push({id:'op_'+node.range[0],kind:node.type,operator:node.operator,scope:own,range:node.range,line:node.loc.start.line});
  for(const child of astChildren(node))walk(child,own);
 };walk(ast);
 return {ast,pages,ir:{version:1,scopes,functions,calls,operations,dependencies:functions.map(f=>({function:f.id,calls:calls.filter(c=>c.from===f.id).map(c=>c.to)}))}};
}

// Bounded, side-effect-free evaluation of the *paint* subset. No loadstring,
// network, timers, filesystem, globals or user callback execution is involved.
// Dynamic/unknown operations stop analysis and become review diagnostics.
export function paintEvidence(fn,self,source,{width=320,height=212}={}){
 const draws=[],inputs=[],issues=[],style={color:'#000000',font:10,bold:false};let fuel=6000,depth=0;
 const truth=v=>v!==false&&v!==null&&v!==undefined;
 const rgb=args=>'#'+args.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
 const env=Object.create(null);Object.assign(env,{self,gc:{$gc:true},platform:{window:{$window:true}},_G:{},math:{pi:Math.PI}});
 const get=(base,key)=>base?.[key];
 const value=(n,e)=>{if(--fuel<0)throw Error('Paint analysis budget exceeded');if(!n)return null;
  if(n.type.endsWith('Literal'))return luaLiteral(n);if(n.type==='Identifier'){if(n.name in e)return e[n.name];throw Error('Dynamic value: '+n.name);}
  if(n.type==='MemberExpression')return get(value(n.base,e),n.identifier.name);
  if(n.type==='IndexExpression')return get(value(n.base,e),value(n.index,e));
  if(n.type==='TableConstructorExpression'){const a={};let i=1;for(const f of n.fields)a[f.type==='TableValue'?i++:f.key.name??value(f.key,e)]=value(f.value,e);return a;}
  if(n.type==='FunctionDeclaration')return {$fn:n,env:e};
  if(n.type==='UnaryExpression'){const v=value(n.argument,e);if(n.operator==='-')return -v;if(n.operator==='not')return !truth(v);if(n.operator==='#')return typeof v==='string'?v.length:Object.keys(v||{}).filter(k=>/^\d+$/.test(k)).length;}
  if(n.type==='BinaryExpression'||n.type==='LogicalExpression'){const a=value(n.left,e),op=n.operator;if(op==='and')return truth(a)?value(n.right,e):a;if(op==='or')return truth(a)?a:value(n.right,e);const b=value(n.right,e);switch(op){case '+':return +a + +b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return ((a%b)+b)%b;case '^':return a**b;case '..':return String(a)+String(b);case '==':return a===b;case '~=':return a!==b;case '>':return a>b;case '<':return a<b;case '>=':return a>=b;case '<=':return a<=b;}}
  if(n.type==='CallExpression')return call(n,e);throw Error('Dynamic expression: '+n.type);
 };
 const call=(n,e)=>{const name=luaName(n.base),args=n.arguments.map(a=>value(a,e));
  if(name==='platform.window:width')return width;if(name==='platform.window:height')return height;
  if(name==='tostring')return args[0]==null?'nil':String(args[0]);if(name==='tonumber'){const v=Number(args[0]);return Number.isFinite(v)?v:null;}
  if(/^math\.(min|max|floor|ceil|abs|sqrt|sin|cos|tan)$/.test(name))return Math[name.slice(5)](...args);
  if(name.startsWith('gc:')){const method=name.slice(3);if(method==='getStringWidth')return String(args[0]??'').length*style.font*.55;if(method==='getStringHeight')return style.font+2;if(method==='setColorRGB'){style.color=rgb(args);return;}if(method==='setFont'){style.font=args[2];style.bold=args[1]==='b';return;}if(['drawString','fillRect','drawRect','drawLine','drawArc','fillArc','drawPolyLine','fillPolygon'].includes(method)){draws.push({method,args,style:{...style},range:n.range,line:n.loc.start.line});return;}throw Error('Unsupported paint API: '+name);}
  if(name==='self:drawInput'){inputs.push({field:args[1],x:args[2],y:args[3],w:args[4],h:args[5],range:n.range});return;}
  if(name==='self:drawMultiline'){String(args[1]||'').split('\n').slice(0,args[5]||100).forEach((s,i)=>draws.push({method:'drawString',args:[s,args[2],args[3]+i*args[4],'top'],style:{...style},range:n.range,line:n.loc.start.line}));return;}
  let f,actual=args;if(n.base.type==='MemberExpression'&&n.base.indexer===':'){const obj=value(n.base.base,e);f=obj?.[n.base.identifier.name];actual=[obj,...args];}else f=value(n.base,e);
  if(!f?.$fn)throw Error('Dynamic paint call: '+name);if(++depth>16)throw Error('Paint helper depth exceeded');const child=Object.create(f.env);f.$fn.parameters.forEach((p,i)=>child[p.name]=actual[i]);try{return block(f.$fn.body,child)?.value;}finally{depth--;}
 };
 const assign=(v,x,e,local=false)=>{if(v.type==='Identifier'){if(local)e[v.name]=x;else{let owner=e;while(owner&&!Object.hasOwn(owner,v.name))owner=Object.getPrototypeOf(owner);(owner||e)[v.name]=x;}}else if(v.type==='MemberExpression')value(v.base,e)[v.identifier.name]=x;else if(v.type==='IndexExpression')value(v.base,e)[value(v.index,e)]=x;else throw Error('Unsupported paint assignment');};
 const block=(body,e)=>{for(const n of body){if(--fuel<0)throw Error('Paint analysis budget exceeded');switch(n.type){
  case 'LocalStatement':case 'AssignmentStatement':{const vals=n.init.map(v=>value(v,e));n.variables.forEach((v,i)=>assign(v,vals[i],e,n.type==='LocalStatement'));break;}
  case 'CallStatement':call(n.expression,e);break;
  case 'IfStatement':{const c=n.clauses.find(c=>!c.condition||truth(value(c.condition,e)));if(c){const result=block(c.body,Object.create(e));if(result)return result;}break;}
  case 'ForNumericStatement':{const a=value(n.start,e),b=value(n.end,e),step=n.step?value(n.step,e):1;if(!step||Math.abs((b-a)/step)>200)throw Error('Paint loop exceeds 200 iterations');for(let i=a;step>0?i<=b:i>=b;i+=step){const child=Object.create(e);child[n.variable.name]=i;const r=block(n.body,child);if(r)return r;}break;}
  case 'ForGenericStatement':{const iterator=n.iterators[0];if(!['ipairs','pairs'].includes(luaName(iterator.base)))throw Error('Dynamic iterator');const table=value(iterator.arguments[0],e),entries=Object.entries(table||{});if(entries.length>200)throw Error('Paint loop exceeds 200 iterations');for(const [k,v]of entries){const child=Object.create(e);child[n.variables[0].name]=/^\d+$/.test(k)?+k:k;if(n.variables[1])child[n.variables[1].name]=v;const r=block(n.body,child);if(r)return r;}break;}
  case 'FunctionDeclaration':assign(n.identifier,{$fn:n,env:e},e,n.isLocal);break;
  case 'ReturnStatement':return {value:n.arguments[0]?value(n.arguments[0],e):null};
  default:throw Error('Dynamic paint statement: '+n.type);
 }}};
 try{block(fn.body,env);}catch(error){issues.push({reason:error.message,line:fn.loc.start.line,range:fn.range});}
 return {draws,inputs,issues};
}
