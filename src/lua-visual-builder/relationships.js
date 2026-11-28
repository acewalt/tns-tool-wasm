// Read-only projections. Graph geometry never changes application semantics.
import {eventEntries,eventLabel,friendlyComponent} from './presentation.js?v=20261128-source-reconstruction-v53';
import {eventContext} from './semantics.js?v=20261128-source-reconstruction-v53';
import {analyzeLuaImport} from './importer.js?v=20261128-source-reconstruction-v53';

export function projectRelationships(project,lang='en') {
 const nodes=[],edges=[],known=new Set();
 const add=(id,kind,title,data={})=>{if(!known.has(id)){known.add(id);nodes.push({id,kind,title,...data});}return id;};
 const link=(from,to,type='contains')=>{if(from&&to&&!edges.some(e=>e.from===from&&e.to===to&&e.type===type))edges.push({from,to,type});};
 const app=add('application','application',project.name,{view:'design'});
 for(const pg of project.pages){
  const page=add('page:'+pg.id,'page',pg.name,{page:pg.id,view:'design'});link(app,page);
  for(const c of pg.components){const id=add('component:'+pg.id+':'+c.id,'component',friendlyComponent(c),{componentType:c.type,page:pg.id,component:c.id,view:'design'});link(c.parent?'component:'+pg.id+':'+c.parent:page,id);
   if(c.asset){add('resource:'+c.asset,'resource',c.asset,{view:'design'});link(id,'resource:'+c.asset,'uses');}
  }
  for(const [name,value]of Object.entries(pg.variables||{})){const id=add('variable:'+pg.id+':'+name,'variable',name,{value,page:pg.id,scope:pg.id,view:'design'});link(page,id,'declares');}
 }
 for(const [name,value]of Object.entries(project.variables||{})){const id=add('variable:global:'+name,'variable',name,{value,scope:'global',view:'design'});link(app,id,'declares');}
 const entries=eventEntries(project,lang).filter(e=>e.count||project.graphs?.[e.key]?.nodes?.length>1);
 for(const e of entries){const id=add('event:'+e.key,'event',eventLabel(e.event,lang),{page:e.page,component:e.component,key:e.key,view:'logic',count:e.count});link(e.component?'component:'+e.page+':'+e.component:e.page?'page:'+e.page:app,id,'owns');}
 const goals={navigate:['Open page','Abrir página','Ouvrir la page'],setText:['Change text','Cambiar texto','Changer le texte'],setValue:['Change value','Cambiar valor','Changer la valeur'],validate:['Check inputs','Validar entradas','Vérifier les entrées'],if:['Check condition','Comprobar condición','Vérifier la condition'],setVariable:['Save value','Guardar valor','Stocker la valeur'],back:['Previous page','Página anterior','Page précédente']};
 const describe=n=>goals[n.type]?.[lang==='es'?1:lang==='fr'?2:0]||n.type;
 for(const [key,g]of Object.entries(project.graphs||{})){
  const ctx=eventContext(project,key),event='event:'+key;
  if(!known.has(event)){add(event,'event',g.imported?.name||eventLabel(ctx.event,lang),{key,page:ctx.page?.id,view:'logic',line:g.imported?.line});link(ctx.page?'page:'+ctx.page.id:app,event,'owns');}
  for(const n of g.nodes){if(n.type==='event')continue;const id=add('node:'+key+':'+n.id,n.type==='custom'?'custom':'node',describe(n),{key,node:n.id,page:ctx.page?.id,view:'logic',line:n.sourceRange?.line,nodeType:n.type});link(event,id,'contains');
   if(['navigate','pageRef'].includes(n.type))link(id,'page:'+(n.type==='pageRef'?n.target:n.page),'navigates');
   if(n.target&&ctx.page?.components.some(c=>c.id===n.target))link(id,'component:'+ctx.page.id+':'+n.target,['input','componentRef'].includes(n.type)?'reads':'modifies');
   if(['variable','setVariable','increment','reset','listPush'].includes(n.type)){const scope=Object.hasOwn(ctx.page?.variables||{},n.target)?ctx.page.id:'global';link(id,'variable:'+scope+':'+n.target,n.type==='variable'?'reads':'modifies');}
   if(n.type==='flow')link(id,'flow:'+n.flow,'calls');
  }
  for(const w of g.edges){const from=g.nodes.find(n=>n.id===w.from),to=g.nodes.find(n=>n.id===w.to);if(!from||!to)continue;link(from.type==='event'?event:'node:'+key+':'+from.id,to.type==='event'?event:'node:'+key+':'+to.id,['in','next','yes','no','body','first','second'].includes(w.input)?'exec':'data');}
 }
 for(const [name,g]of Object.entries(project.flows||{})){const id=add('flow:'+name,'flow',name,{key:name,view:'flow',count:g.nodes.length});link(app,id,'declares');}
 const source=project.imported||((project.functions||'').trim()?analyzeLuaImport(project.functions):null);
 for(const f of source?.functions||[]){const id=add('function:'+f.name,'function',f.name+'('+(f.parameters||[]).join(', ')+')',{line:f.line,view:'code'});link(app,id,'declares');}
 for(const v of source?.variables||[]){const id=add('source-variable:'+v.scope+':'+v.name,'variable',v.name,{line:v.line,scope:v.scope,view:'code'});link(known.has('function:'+v.scope)?'function:'+v.scope:app,id,'declares');}
 for(const call of source?.calls||[])if(known.has('function:'+call.to))link(known.has('function:'+call.from)?'function:'+call.from:app,'function:'+call.to,'calls');
 for(const name of Object.keys(project.assets||{})){const id=add('resource:'+name,'resource',name,{view:'design'});link(app,id,'declares');}
 return {nodes,edges:edges.filter(e=>known.has(e.from)&&known.has(e.to))};
}
