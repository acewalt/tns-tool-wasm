import {NODE_TYPES,connectionError,socketType} from './logic.js?v=20261127-builder-v6';

// A connection intent has one fixed end. It is independent of pointer capture,
// camera coordinates and the chooser DOM, and is used for both drag directions.
export function intentEdge(intent,node,port) {
  return intent.to ? {from:node.id,out:port,to:intent.to,input:intent.input}
    : {from:intent.from,out:intent.out,to:node.id,input:port};
}
export function compatiblePort(graph,intent,node) {
  const ports=NODE_TYPES[node.type]?.[intent.to?'outputs':'inputs']||[];
  return ports.find(port=>!connectionError(graph,intentEdge(intent,node,port)));
}
export function nodeChoices(graph,intent,{query='',recent=[]}={}) {
  const owner=graph.nodes.find(n=>n.id===(intent?.to||intent?.from));
  const type=owner&&socketType(owner,intent.to?intent.input:intent.out,intent.to?'input':'out');
  const preferred=intent?.to ? {
    number:['input','variable','literal','add','multiply','divide','expression'],
    boolean:['equal','greater','and','or','not','variable'],page:['pageRef'],component:['componentRef'],
    exec:['validate','if','setVariable','navigate','sequence'],
  } : {exec:['navigate','setText','if','flow','setVariable','validate'],
    number:['multiply','add','greater','equal','setVariable','setText'],
    boolean:['if','and','or','not'],page:['navigate'],component:['setText','setValue','show','hide']};
  const priority=preferred[type]||['setText','setVariable','equal'];
  return Object.entries(NODE_TYPES).filter(([k])=>!['event','comment'].includes(k)).map(([type,spec])=>{
    const node={id:'__candidate__',type,expression:type==='literal'?'1':'0'};
    const candidate={...graph,nodes:[...graph.nodes,node]};
    const port=intent?compatiblePort(candidate,intent,node):null;
    return {type,spec,port,recommended:priority.includes(type),recent:recent.includes(type),
      score:priority.includes(type)?priority.indexOf(type):recent.includes(type)?20+recent.indexOf(type):100};
  }).filter(c=>(!intent||c.port)&&(!query||(c.type+' '+c.spec.category).toLowerCase().includes(query.toLowerCase())))
    .sort((a,b)=>a.score-b.score||a.type.localeCompare(b.type));
}
