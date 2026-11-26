import {actionsToGraph,graphToActions,graphDiagnostics} from './logic.js?v=20261126-builder-v48';
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
  // Comments survive projection edits. All meaningful nodes are regenerated from the changed actions.
  if(old){next.view=copy(old.view||{});const used=new Set();for(const n of next.nodes){const same=old.nodes.find(o=>o.id===n.id&&o.type===n.type)||old.nodes.find(o=>!used.has(o.id)&&o.type===n.type&&o.target===n.target&&o.expression===n.expression);if(same){used.add(same.id);n.x=same.x;n.y=same.y;if(same.comment)n.comment=same.comment;if(same.group)n.group=same.group;}}}
  if(old)next.nodes.push(...old.nodes.filter(n=>n.type==='comment').map(copy));p.graphs[key]=next;if(c.owner?.events)delete c.owner.events[c.event];return next;
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
