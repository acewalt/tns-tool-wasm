import {parseExpression} from './expressions.js?v=20261126-builder-v48';
export const NODE_TYPES = {
  event:{category:'Events',inputs:[],outputs:['next']}, end:{category:'Control',inputs:['in'],outputs:[]}, comment:{category:'Comment',inputs:[],outputs:[]},
  input:{category:'Data',inputs:[],outputs:['value']},variable:{category:'Data',inputs:[],outputs:['value']},literal:{category:'Data',inputs:[],outputs:['value']},expression:{category:'Math',inputs:[],outputs:['value']},componentRef:{category:'Data',inputs:[],outputs:['value']},pageRef:{category:'Data',inputs:[],outputs:['value']},
  ...Object.fromEntries(['add','subtract','multiply','divide','power','equal','greater','and','or'].map(k=>[k,{category:['equal','greater','and','or'].includes(k)?'Conditions':'Math',inputs:['a','b'],outputs:['value']}])),
  ...Object.fromEntries(['sqrt','sin','cos','not'].map(k=>[k,{category:k==='not'?'Conditions':'Math',inputs:['a'],outputs:['value']}])),
  validate:{category:'Conditions',inputs:['in'],outputs:['next']},if:{category:'Conditions',inputs:['in','condition'],outputs:['yes','no','next']},sequence:{category:'Control',inputs:['in'],outputs:['first','second','next']},
  ...Object.fromEntries(['setText','setValue','setColor'].map(k=>[k,{category:'Interface',inputs:['in','value','target'],outputs:['next']}])),
  ...Object.fromEntries(['show','hide'].map(k=>[k,{category:'Interface',inputs:['in','target'],outputs:['next']}])),
  ...Object.fromEntries(['setVariable','increment','listPush','store','recall','cas'].map(k=>[k,{category:['store','recall','cas'].includes(k)?'TI-Nspire':'Variables',inputs:['in','value'],outputs:['next']}])),
  reset:{category:'Variables',inputs:['in'],outputs:['next']},navigate:{category:'Navigation',inputs:['in','page'],outputs:['next']},back:{category:'Navigation',inputs:['in'],outputs:['next']},home:{category:'Navigation',inputs:['in'],outputs:['next']},nextPage:{category:'Navigation',inputs:['in'],outputs:['next']},
  repeat:{category:'Control',inputs:['in','value'],outputs:['body','next']},while:{category:'Control',inputs:['in','condition'],outputs:['body','next']},delay:{category:'Control',inputs:['in','value'],outputs:['next']},custom:{category:'Custom Lua',inputs:['in'],outputs:['next']},flow:{category:'Control',inputs:['in'],outputs:['next']}
};
const execPorts=new Set(['in','next','yes','no','body','first','second']);
export const portType=name=>execPorts.has(name)?'exec':'data';
export function socketType(node,name,direction){
  if(portType(name)==='exec')return 'exec';if(name==='target')return 'component';if(name==='page')return 'page';if(name==='condition'||['and','or','not'].includes(node.type))return 'boolean';
  if(direction==='out'){
    if(['variable','expression'].includes(node.type)&&['number','string','boolean','list','component','page'].includes(node.valueType))return node.valueType;
    if(node.type==='componentRef')return 'component';if(node.type==='pageRef')return 'page';
    if(['equal','greater','and','or','not'].includes(node.type))return 'boolean';
    if(node.type==='literal'){try{const ast=parseExpression(node.expression||'0');return ast.kind==='literal'?typeof ast.value:'any';}catch{return 'any';}}
    return ['input','add','subtract','multiply','divide','power','sqrt','sin','cos'].includes(node.type)?'number':'any';
  }
  if(['add','subtract','multiply','divide','power','sqrt','sin','cos','greater','repeat','delay'].includes(node.type))return 'number';return 'any';
}
export function connectionError(graph,edge){
  const a=graph.nodes.find(n=>n.id===edge.from),b=graph.nodes.find(n=>n.id===edge.to);
  if(!a||!b||a===b||!NODE_TYPES[a.type]?.outputs.includes(edge.out)||!NODE_TYPES[b.type]?.inputs.includes(edge.input))return 'Invalid connection';
  const at=socketType(a,edge.out,'out'),bt=socketType(b,edge.input,'input');
  if((at==='exec')!==(bt==='exec'))return 'Connect execution to execution, data to data.';
  if(at!=='any'&&bt!=='any'&&at!==bt)return 'Incompatible ports: '+at+' → '+bt;
  // Adding a wire may not introduce a cycle. Bounded loops use structured body ports.
  const visit=(id,seen=new Set())=>{if(id===a.id)return true;if(seen.has(id))return false;seen.add(id);return graph.edges.filter(e=>e.from===id&&e!==edge).some(e=>visit(e.to,seen));};
  if(visit(b.id))return 'Connection creates a cycle. Use Repeat or While.';return '';
}
export function connect(graph,edge){const error=connectionError(graph,edge);if(error)throw Error(error);graph.edges=graph.edges.filter(e=>!(e.to===edge.to&&e.input===edge.input&&portType(edge.input)!=='exec')&&!(e.from===edge.from&&e.out===edge.out&&portType(edge.out)==='exec'));graph.edges.push({...edge});return graph;}
export function graphToActions(graph,{flows={},stack=[]}={}){
  if(!graph?.nodes?.length)return[];if(graph.nodes.length>200)throw Error('At most 200 nodes per event.');
  const nodes=new Map(graph.nodes.map(n=>[n.id,n])),edges=graph.edges||[],events=graph.nodes.filter(n=>n.type==='event');if(events.length!==1)throw Error('A logic graph needs exactly one event node.');
  const occupied=new Set();for(const e of edges){const a=nodes.get(e.from),b=nodes.get(e.to);if(!a||!b||!NODE_TYPES[a.type]?.outputs.includes(e.out)||!NODE_TYPES[b.type]?.inputs.includes(e.input))throw Error('Invalid graph connection');const at=socketType(a,e.out,'out'),bt=socketType(b,e.input,'input');if((at==='exec')!==(bt==='exec')||(at!=='any'&&bt!=='any'&&at!==bt))throw Error('Incompatible graph connection');const key=e.to+':'+e.input;if(bt!=='exec'&&occupied.has(key))throw Error('Multiple wires on the same input');occupied.add(key);}
  const q=s=>JSON.stringify(String(s??''));
  function data(id,seen=new Set()){
    if(seen.has(id))throw Error('Data cycle: '+id);seen=new Set(seen).add(id);const n=nodes.get(id);if(!n)throw Error('Missing node');
    const get=k=>{const e=edges.find(e=>e.to===id&&e.input===k);return e?data(e.from,seen):String(n[k]??'0');};
    if(n.type==='input')return 'input('+q(n.target)+')';if(n.type==='variable')return n.target||'value';if(['literal','expression'].includes(n.type))return n.expression||'0';
    const op={add:'+',subtract:'-',multiply:'*',divide:'/',power:'^',equal:'==',greater:'>',and:'and',or:'or'}[n.type];if(op)return '('+get('a')+' '+op+' '+get('b')+')';if(n.type==='not')return '(not '+get('a')+')';if(['sqrt','sin','cos'].includes(n.type))return n.type+'('+get('a')+')';throw Error('Node has no expression output: '+n.type);
  }
  function walk(id,seen=new Set(),stop=null){
    if(!id||id===stop)return[];if(seen.has(id))throw Error('Execution cycle: use a Repeat or While node.');seen=new Set(seen).add(id);const n=nodes.get(id);if(!n)throw Error('Missing node');
    const next=out=>edges.find(e=>e.from===id&&e.out===out)?.to;
    const get=(k,fallback)=>{const e=edges.find(e=>e.to===id&&e.input===k);return e?data(e.from):String(n[k]??fallback);};
    const ref=(port,kind,fallback)=>{const e=edges.find(e=>e.to===id&&e.input===port);if(!e)return fallback;const r=nodes.get(e.from);if(r.type!==kind)throw Error('Expected '+kind+' at '+n.id);return r.target;};
    if(n.type==='event')return walk(next('next'),seen,stop);if(n.type==='end')return[];
    const a={...n,type:n.type,node:n.id,expression:get('value',n.expression||'0')};delete a.x;delete a.y;
    if(['setText','setValue','show','hide','setColor'].includes(n.type))a.target=ref('target','componentRef',n.target);
    if(n.type==='navigate')a.page=ref('page','pageRef',n.page);
    if(n.type==='validate')a.inputs=n.inputs||String(n.target||'').split(',').map(s=>s.trim()).filter(Boolean);
    const continuation=next('next');
    if(n.type==='if'){a.condition=get('condition',n.condition||n.expression||'true');a.yes=walk(next('yes'),seen,continuation||stop);a.no=walk(next('no'),seen,continuation||stop);}
    if(['repeat','while'].includes(n.type)){a.body=walk(next('body'),seen,continuation||stop);a.condition=get('condition',n.condition||n.expression||'false');a.count=get('value',n.count||n.expression||'1');}
    if(n.type==='sequence'){a.type='sequence';a.body=[...walk(next('first'),seen,continuation||stop),...walk(next('second'),seen,continuation||stop)];}
    if(n.type==='flow'){if(stack.length>12||stack.includes(n.flow)||!flows[n.flow])throw Error('Missing or recursive flow: '+n.flow);a.type='sequence';a.body=graphToActions(flows[n.flow],{flows,stack:[...stack,n.flow]});}
    return[a,...walk(continuation,seen,stop)];
  }
  return walk(events[0].id);
}
// The action list is a projection of this graph, never a second execution path.
export function actionsToGraph(actions=[],owner='app',event='start'){
  const graph={nodes:[{id:'event',type:'event',owner,event,x:40,y:40}],edges:[]};let serial=0;
  const node=(type,fields={},x=300,y=40)=>{let id=fields.node;while(!id||graph.nodes.some(n=>n.id===id))id='n'+(++serial);const n={...fields,id,type,x,y};graph.nodes.push(n);return n;};
  const wire=(a,out,b,input)=>graph.edges.push({from:a.id,out,to:b.id,input});
  const data=(ast,x,y)=>{
    if(ast.kind==='literal')return node('literal',{expression:ast.value===null?'nil':JSON.stringify(ast.value)},x,y);
    if(ast.kind==='variable')return node('variable',{target:ast.name},x,y);
    if(ast.kind==='call'&&ast.name==='input'&&ast.args[0]?.kind==='literal')return node('input',{target:ast.args[0].value},x,y);
    const types={'+':'add','-':'subtract','*':'multiply','/':'divide','^':'power','==':'equal','>':'greater',and:'and',or:'or'};
    if(ast.kind==='binary'&&types[ast.op]){const n=node(types[ast.op],{},x,y);wire(data(ast.left,x-240,y-120),'value',n,'a');wire(data(ast.right,x-240,y+120),'value',n,'b');return n;}
    if(ast.kind==='call'&&['sqrt','sin','cos'].includes(ast.name)&&ast.args.length===1){const n=node(ast.name,{},x,y);wire(data(ast.args[0],x-240,y),'value',n,'a');return n;}
    return null;
  };
  function list(items,prev,out='next',level=0){let tail=prev;for(const a of items){const n=node(a.type,{...a},300+level*300,40+serial*75);wire(tail,out,n,'in');out='next';tail=n;
    if(['setText','setValue','setVariable','increment','delay','cas','store','listPush'].includes(a.type)){
      const before=graph.nodes.length;let d;try{d=data(parseExpression(a.expression??'0'),n.x+270,n.y+120);}catch{}if(!d){graph.nodes.splice(before);graph.edges=graph.edges.filter(e=>graph.nodes.some(n=>n.id===e.from)&&graph.nodes.some(n=>n.id===e.to));d=node('expression',{expression:a.expression??'0'},n.x+270,n.y+120);}wire(d,'value',n,'value');
    }
    if(a.type==='if'){list(a.yes||[],n,'yes',level+1);list(a.no||[],n,'no',level+1);}if(['repeat','while','sequence'].includes(a.type))list(a.body||[],n,a.type==='sequence'?'first':'body',level+1);
  }return tail;}
  list(actions,graph.nodes[0]);return autoLayout(graph);
}
export function graphDiagnostics(graph,context={}){
  const result=[];try{graphToActions(graph,context);}catch(e){result.push({severity:'error',node:graph.nodes?.find(n=>e.message.includes(n.id))?.id,message:e.message});}
  const live=new Set();const visit=id=>{if(live.has(id))return;live.add(id);for(const e of graph.edges.filter(e=>e.from===id||e.to===id))visit(e.from===id?e.to:e.from);};graph.nodes.filter(n=>n.type==='event').forEach(n=>visit(n.id));
  for(const n of graph.nodes)if(n.type!=='comment'&&!live.has(n.id))result.push({severity:'warning',node:n.id,message:'Disconnected node: '+n.id});return result;
}
export function autoLayout(graph){
  const levels=new Map(),visiting=new Set(),bottom=new Map();
  function level(id){if(levels.has(id))return levels.get(id);if(visiting.has(id))return 0;visiting.add(id);const parents=graph.edges.filter(e=>e.to===id).map(e=>level(e.from)+1);visiting.delete(id);const result=Math.min(28,Math.max(0,...parents));levels.set(id,result);return result;}
  for(const n of graph.nodes){let col=level(n.id);const spec=NODE_TYPES[n.type],height=150+Math.max(spec.inputs.length,spec.outputs.length)*29;while((bottom.get(col)||60)+height>9500)col=(col+1)%29;n.x=60+col*280;n.y=bottom.get(col)||60;bottom.set(col,n.y+height+30);}return graph;
}
