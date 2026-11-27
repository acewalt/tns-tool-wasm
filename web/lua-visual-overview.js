import {mountRelationshipOverview} from './lua-visual-overview-workspace.js?v=20261126-builder-v51';
import {eventContext} from '../src/lua-visual-builder/semantics.js?v=20261126-builder-v51';
import {friendlyComponent,eventLabel} from '../src/lua-visual-builder/presentation.js?v=20261126-builder-v51';
import {analyzeLuaImport} from '../src/lua-visual-builder/importer.js?v=20261126-builder-v51';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function overviewItems(p){
 const out=[],add=(kind,title,data={})=>out.push({kind,title,...data});
 for(const page of p.pages){add('page',page.name,{page:page.id,view:'design'});for(const c of page.components)add('component',friendlyComponent(c)+' · '+c.type,{page:page.id,component:c.id,view:'design',line:c.sourceBinding?.line});for(const [k,v]of Object.entries(page.variables||{}))add('variable',k+' = '+JSON.stringify(v),{page:page.id,scope:page.name,view:'design'});}
 for(const [k,v]of Object.entries(p.variables||{}))add('variable',k+' = '+JSON.stringify(v),{scope:'global',view:'design'});
 for(const [key,g]of Object.entries(p.graphs||{})){const ctx=eventContext(p,key);add('event',g.imported?.name||((ctx.page?.name||'Application')+' / '+(friendlyComponent(ctx.owner)||'')+' / '+eventLabel(ctx.event)),{key,view:'logic',line:g.imported?.line});for(const n of g.nodes)if(n.type!=='event')add(n.type==='custom'?'custom':'node',n.type+' · '+(n.target||n.flow||n.id),{key,node:n.id,view:'logic',line:n.sourceRange?.line});}
 for(const [k,g]of Object.entries(p.flows||{}))add('flow',k+' · '+g.nodes.length+' nodes',{view:'flow',key:k});for(const [k,a]of Object.entries(p.assets||{}))add('resource',k+' · '+a.width+'×'+a.height,{view:'design'});
 const source=p.imported||((p.functions||'').trim()?analyzeLuaImport(p.functions):null);if(source){for(const f of source.functions||[])add('function',f.name+'('+f.parameters.join(', ')+')',{line:f.line,scope:f.scope,view:'code'});for(const v of source.variables||[])add('variable',v.name,{line:v.line,scope:v.scope,view:'code'});for(const m of source.math||[])add('node',m.operator+' · L'+m.line,{line:m.line,scope:m.scope,view:'code'});for(const c of source.calls||[])add('dependency',c.from+' → '+c.to,{line:c.line,view:'code'});for(const f of source.fragments||[])add('fragment','L'+f.line+' · '+f.reason,{line:f.line,view:'code'});}
 return out;
}
export const mountOverview=mountRelationshipOverview;
