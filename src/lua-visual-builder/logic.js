export const NODE_TYPES = {
  event:{category:'Events',inputs:[],outputs:['next']}, input:{category:'Data',inputs:[],outputs:['value']}, variable:{category:'Data',inputs:[],outputs:['value']}, literal:{category:'Data',inputs:[],outputs:['value']},
  add:{category:'Math',inputs:['a','b'],outputs:['value']},subtract:{category:'Math',inputs:['a','b'],outputs:['value']},multiply:{category:'Math',inputs:['a','b'],outputs:['value']},divide:{category:'Math',inputs:['a','b'],outputs:['value']},power:{category:'Math',inputs:['a','b'],outputs:['value']},sqrt:{category:'Math',inputs:['a'],outputs:['value']},sin:{category:'Math',inputs:['a'],outputs:['value']},cos:{category:'Math',inputs:['a'],outputs:['value']},equal:{category:'Conditions',inputs:['a','b'],outputs:['value']},greater:{category:'Conditions',inputs:['a','b'],outputs:['value']},and:{category:'Conditions',inputs:['a','b'],outputs:['value']},or:{category:'Conditions',inputs:['a','b'],outputs:['value']},not:{category:'Conditions',inputs:['a'],outputs:['value']},
  validate:{category:'Conditions',inputs:['in'],outputs:['next']},if:{category:'Conditions',inputs:['in','condition'],outputs:['yes','no']},setText:{category:'Interface',inputs:['in','value'],outputs:['next']},setValue:{category:'Interface',inputs:['in','value'],outputs:['next']},show:{category:'Interface',inputs:['in'],outputs:['next']},hide:{category:'Interface',inputs:['in'],outputs:['next']},setColor:{category:'Interface',inputs:['in'],outputs:['next']},
  setVariable:{category:'Variables',inputs:['in','value'],outputs:['next']},increment:{category:'Variables',inputs:['in','value'],outputs:['next']},reset:{category:'Variables',inputs:['in'],outputs:['next']},navigate:{category:'Navigation',inputs:['in'],outputs:['next']},back:{category:'Navigation',inputs:['in'],outputs:['next']},home:{category:'Navigation',inputs:['in'],outputs:['next']},nextPage:{category:'Navigation',inputs:['in'],outputs:['next']},
  repeat:{category:'Control',inputs:['in','value'],outputs:['body','next']},while:{category:'Control',inputs:['in','condition'],outputs:['body','next']},delay:{category:'Control',inputs:['in','value'],outputs:['next']},listPush:{category:'Data',inputs:['in','value'],outputs:['next']},store:{category:'TI-Nspire',inputs:['in','value'],outputs:['next']},recall:{category:'TI-Nspire',inputs:['in'],outputs:['next']},cas:{category:'TI-Nspire',inputs:['in','value'],outputs:['next']},custom:{category:'Custom Lua',inputs:['in'],outputs:['next']},
};
const execPorts=new Set(['in','next','yes','no','body']);
export const portType = name => execPorts.has(name)?'exec':'data';
export function connect(graph,edge) {
  const from=graph.nodes.find(n=>n.id===edge.from),to=graph.nodes.find(n=>n.id===edge.to);
  if(!from||!to||from===to||!NODE_TYPES[from.type]?.outputs.includes(edge.out)||!NODE_TYPES[to.type]?.inputs.includes(edge.input))throw Error('Invalid connection');
  if(portType(edge.out)!==portType(edge.input))throw Error('Connect execution to execution, data to data.');
  graph.edges=graph.edges.filter(e=>!(e.to===edge.to&&e.input===edge.input)&&!(e.from===edge.from&&e.out===edge.out&&portType(edge.out)==='exec'));
  graph.edges.push(edge);return graph;
}
export function graphToActions(graph) {
  if(!graph?.nodes?.length)return[];if(graph.nodes.length>200)throw Error('At most 200 nodes per event.');
  const nodes=new Map(graph.nodes.map(n=>[n.id,n])),edges=graph.edges||[],events=graph.nodes.filter(n=>n.type==='event');
  if(events.length!==1)throw Error('A logic graph needs exactly one event node.');
  const occupied=new Set();
  for(const edge of edges){const a=nodes.get(edge.from),b=nodes.get(edge.to);if(!a||!b||!NODE_TYPES[a.type]?.outputs.includes(edge.out)||!NODE_TYPES[b.type]?.inputs.includes(edge.input)||portType(edge.out)!==portType(edge.input))throw Error('Invalid graph connection');const key=edge.to+':'+edge.input;if(occupied.has(key))throw Error('Multiple wires on the same input');occupied.add(key);}
  const q=s=>JSON.stringify(String(s??''));
  function data(id,stack=new Set()){
    if(stack.has(id))throw Error('Data cycle: '+id);stack=new Set(stack).add(id);const n=nodes.get(id);if(!n)throw Error('Missing node');
    const get=key=>{const e=edges.find(e=>e.to===id&&e.input===key);return e?data(e.from,stack):String(n[key]??'0');};
    if(n.type==='input')return'input('+q(n.target)+')';if(n.type==='variable')return n.target||'value';if(n.type==='literal')return n.expression||'0';
    const binary={add:'+',subtract:'-',multiply:'*',divide:'/',power:'^',equal:'==',greater:'>',and:'and',or:'or'}[n.type];if(binary)return '('+get('a')+' '+binary+' '+get('b')+')';
    if(n.type==='not')return '(not '+get('a')+')';if(['sqrt','sin','cos'].includes(n.type))return n.type+'('+get('a')+')';throw Error('Node has no data output: '+n.type);
  }
  function walk(id,stack=new Set()){
    if(!id)return[];if(stack.has(id))throw Error('Execution cycle: use a Repeat or While node.');stack=new Set(stack).add(id);const n=nodes.get(id);if(!n)throw Error('Missing node');
    const next=out=>{const e=edges.find(e=>e.from===id&&e.out===out);return e?e.to:null;};
    const get=(key,fallback)=>{const e=edges.find(e=>e.to===id&&e.input===key);return e?data(e.from):String(n[key]??fallback);};
    if(n.type==='event')return walk(next('next'),stack);
    const a={...n,type:n.type,node:n.id,expression:get('value',n.expression||'0')};
    if(n.type==='validate')a.inputs=String(n.target||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(n.type==='if'){a.condition=get('condition',n.expression||'true');a.yes=walk(next('yes'),stack);a.no=walk(next('no'),stack);return[a];}
    if(['repeat','while'].includes(n.type)){a.body=walk(next('body'),stack);a.condition=get('condition',n.expression||'false');a.count=get('value',n.expression||'1');}
    return[a,...walk(next('next'),stack)];
  }
  return walk(events[0].id);
}
