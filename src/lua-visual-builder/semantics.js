import {actionsToGraph,graphToActions,graphDiagnostics} from './logic.js?v=20261126-builder-v49';
const copy=v=>JSON.parse(JSON.stringify(v));
export function eventOwners(project){return [{owner:project,key:'app',page:null},...project.pages.flatMap(p=>[{owner:p,key:p.id,page:p},...p.components.map(c=>({owner:c,key:p.id+':'+c.id,page:p}))])];}
export function eventContext(project,key){const event=key.slice(key.lastIndexOf(':')+1),scope=key.slice(0,key.lastIndexOf(':'));return {...eventOwners(project).find(o=>o.key===scope),scope,event};}
export function migrateProject(value){
  if(![1,2].includes(value?.version))throw Error('Unsupported visual project version');
  const p=copy(value);p.version=2;p.graphs||={};p.flows||={};
  for(const {owner,key} of eventOwners(p)){
    for(const [event,actions]of Object.entries(owner.events||{})){
      const id=key+':'+event,g=p.graphs[id];
      if(!g?.nodes?.length)p.graphs[id]=actionsToGraph(actions,key,event);
      else if(value.version===1){p.migrationArchive||={};p.migrationArchive[id]={actions:copy(actions),graph:copy(g),effective:'graph'};}
    }
    delete owner.events;
  }
  for(const [key,g]of Object.entries(p.graphs)){const c=eventContext(p,key);for(const n of g.nodes||[])if(n.type==='event'){n.owner=c.scope;n.event=c.event;n.page=c.page?.id||'';}}
  return p;
}
export function ensureEventGraph(p,key){p.graphs||={};if(!p.graphs[key]){const c=eventContext(p,key);p.graphs[key]=actionsToGraph(c.owner?.events?.[c.event]||[],c.scope,c.event);if(c.owner?.events)delete c.owner.events[c.event];}return p.graphs[key];}
export function getEventActions(p,key){const c=eventContext(p,key);return p.graphs?.[key]?graphToActions(p.graphs[key],{flows:p.flows||{}}):copy(c.owner?.events?.[c.event]||[]);}
export function setEventActions(p,key,actions){
  const c=eventContext(p,key),old=p.graphs?.[key];p.graphs||={};const next=actionsToGraph(actions,c.scope,c.event);
  if(old){
    const visual=['x','y','comment','group','breakpoint','locked','collapsed','color','width','height'],mapping=new Map(),used=new Set();
    const pair=(id,oldId)=>{if(mapping.has(id)||used.has(oldId))return;const n=next.nodes.find(n=>n.id===id),o=old.nodes.find(n=>n.id===oldId);if(!n||!o)return;mapping.set(id,oldId);used.add(oldId);for(const k of visual)if(Object.hasOwn(o,k))n[k]=copy(o[k]);
      for(const e of next.edges.filter(e=>e.to===id&&!['in'].includes(e.input))){let previous=old.edges.find(v=>v.to===oldId&&v.input===e.input),seen=new Set();while(previous&&old.nodes.find(n=>n.id===previous.from)?.type==='rerouteData'&&!seen.has(previous.from)){seen.add(previous.from);previous=old.edges.find(v=>v.to===previous.from&&v.input==='value');}if(previous)pair(e.from,previous.from);}};
    for(const n of next.nodes)if(n.type==='event'||actionsContain(actions,n.id))pair(n.id,n.id);
    // Fresh data nodes cannot steal the IDs of unrelated preserved nodes.
    const occupied=new Set(old.nodes.map(n=>n.id));for(const n of next.nodes)if(!mapping.has(n.id)){let id=n.id,i=1;while(occupied.has(id)||[...mapping.values()].includes(id))id=n.id+'_new'+i++;mapping.set(n.id,id);occupied.add(id);}
    for(const n of next.nodes)n.id=mapping.get(n.id);for(const e of next.edges){e.from=mapping.get(e.from);e.to=mapping.get(e.to);}
    // An unchanged connection may run through editable reroute nodes. Restore
    // that exact path instead of flattening it when an inspector value changes.
    const retainedReroutes=new Set();next.edges=next.edges.flatMap(edge=>{let e=old.edges.find(e=>e.from===edge.from&&e.out===edge.out),path=[],seen=new Set();while(e&&!seen.has(e.to)){path.push(e);if(e.to===edge.to&&e.input===edge.input){for(const v of path.slice(0,-1))retainedReroutes.add(v.to);return path.map(copy);}const node=old.nodes.find(n=>n.id===e.to);if(!node||!['rerouteData','rerouteExec'].includes(node.type))break;seen.add(node.id);e=old.edges.find(v=>v.from===node.id&&v.out===(node.type==='rerouteExec'?'next':'value'));}return [edge];});
    next.nodes.push(...old.nodes.filter(n=>retainedReroutes.has(n.id)).map(copy));for(const id of retainedReroutes)used.add(id);
    const linked=new Set();const visit=id=>{if(linked.has(id))return;linked.add(id);for(const e of old.edges.filter(e=>e.from===id||e.to===id))visit(e.from===id?e.to:e.from);};old.nodes.filter(n=>n.type==='event').forEach(n=>visit(n.id));
    const extras=old.nodes.filter(n=>!used.has(n.id)&&(n.type==='comment'||!linked.has(n.id)));next.nodes.push(...extras.map(copy));const keep=new Set(extras.map(n=>n.id));next.edges.push(...old.edges.filter(e=>keep.has(e.from)&&keep.has(e.to)).map(copy));
    const nodes=next.nodes,edges=next.edges;Object.assign(next,copy(old),{nodes,edges});Object.assign(old,next);p.graphs[key]=old;
  }else p.graphs[key]=next;
  if(c.owner?.events)delete c.owner.events[c.event];return p.graphs[key];
}
function actionsContain(list,id){return list.some(a=>a.node===id||['yes','no','body'].some(k=>a[k]&&actionsContain(a[k],id)));}
export function setNavigationTarget(project,{key,node,to,owner,page,event='click'}){
 if(project.imported)throw Error('Imported callbacks remain in original Lua. Edit source rather than creating a second navigation handler.');
 if(!project.pages.some(p=>p.id===to))throw Error('Missing destination page');key||=page+(owner?':'+owner:'')+':'+event;const g=ensureEventGraph(project,key);
 if(node){const n=g.nodes.find(n=>n.id===node);if(!n||n.type!=='navigate')throw Error('Select an explicit Navigate transition');n.page=to;g.edges=g.edges.filter(e=>!(e.to===node&&e.input==='page'));return n;}
 const actions=getEventActions(project,key);actions.push({type:'navigate',page:to});setEventActions(project,key,actions);return project.graphs[key].nodes.findLast(n=>n.type==='navigate');
}
export function navigationLinks(p){const links=[];for(const [key,g]of Object.entries(p.graphs||{})){const c=eventContext(p,key);let actions;try{actions=graphToActions(g,{flows:p.flows||{}});}catch{continue;}
  const visit=(list,conditional=false)=>{for(const a of list){if(['navigate','back','home','nextPage'].includes(a.type)){const from=c.page?.id||p.startPage,idx=p.pages.findIndex(pg=>pg.id===from);links.push({key,from,node:a.node,owner:c.owner?.id||'app',event:c.event,type:a.type,to:a.type==='home'?p.startPage:a.type==='nextPage'?p.pages[(idx+1)%p.pages.length]?.id:a.page,conditional});}for(const name of ['yes','no','body'])if(a[name])visit(a[name],conditional||a.type==='if');}};visit(actions);
  }return links;}
export function projectDiagnostics(p){
  const out=[];for(const [key,g]of Object.entries(p.graphs||{})){
    const c=eventContext(p,key);if(!c.owner){out.push({severity:'error',key,message:'Event owner is missing: '+key});continue;}
    const ids=new Set((c.page?.components||p.pages.flatMap(p=>p.components)).map(c=>c.id));const components=['input','setText','setValue','show','hide','setColor','componentRef'];
    for(const n of g.nodes||[]){
      if(components.includes(n.type)&&n.target&&!ids.has(n.target))out.push({severity:'error',key,node:n.id,message:'Missing component: '+n.target});
      if((n.type==='navigate'&&!g.edges.some(e=>e.to===n.id&&e.input==='page')&&!p.pages.some(pg=>pg.id===n.page))||(n.type==='pageRef'&&!p.pages.some(pg=>pg.id===n.target)))out.push({severity:'error',key,node:n.id,message:'Navigation page missing: '+(n.page||n.target)});
      if(n.type==='validate')for(const id of n.inputs||String(n.target||'').split(',').filter(Boolean))if(!ids.has(id))out.push({severity:'error',key,node:n.id,message:'Missing input: '+id});
      for(const k of ['expression','condition','a','b','value'])if(typeof n[k]==='string')for(const m of n[k].matchAll(/(?:input|value|text)\(["']([^"']+)["']\)/g))if(!ids.has(m[1]))out.push({severity:'error',key,node:n.id,message:'Missing component binding: '+m[1]});
    }
    out.push(...graphDiagnostics(g,{flows:p.flows||{}}).map(d=>({...d,key})));
  }
  const links=navigationLinks(p),reachable=new Set([p.startPage]);let size;do{size=reachable.size;for(const l of links)if(reachable.has(l.from)&&l.to)reachable.add(l.to);}while(size!==reachable.size);
  for(const pg of p.pages)if(!reachable.has(pg.id))out.push({severity:'warning',page:pg.id,message:'Unreachable page: '+pg.name});return out;
}
