// Read-only projections shared by Simple Mode, node editors and navigation.
import {presentFormula} from './formula-presentation.js?v=20261127-builder-v6';
import {eventContext,getEventActions} from './semantics.js?v=20261127-builder-v6';
export const friendlyComponent=c=>String(c?.text||c?.name||c?.id||'').replace(/\s+/g,' ').slice(0,60);
export const words=(lang,en,es,fr)=>lang==='es'?es:lang==='fr'?fr:en;
export function availableEvents(type,scope='component'){
 if(scope==='app')return ['start','timer'];if(scope==='page')return ['show'];
 return ({Button:['click','enter'],Input:['change','enter'],Dropdown:['change','enter'],Checkbox:['change','click'],Radio:['change','click'],Slider:['change']})[type]||[];
}
export function eventLabel(event,lang='en'){
 const labels={click:['When pressed','Al pulsar','Lors de l’appui'],change:['When changed','Al cambiar','Lors du changement'],enter:['When Enter is pressed','Al pulsar Enter','Lors de l’appui sur Entrée'],start:['When application starts','Al iniciar la aplicación','Au démarrage'],timer:['On timer tick','Al activar temporizador','À chaque tick'],show:['When page opens','Al abrir la página','À l’ouverture de la page']};
 return labels[event]?.[lang==='es'?1:lang==='fr'?2:0]||event;
}
export function eventEntries(p,lang='en'){
 const list=[],push=(key,pg,c,ev)=>{let count=0;try{count=getEventActions(p,key).length;}catch{count=(p.graphs?.[key]?.nodes||[]).filter(n=>n.type!=='event').length;}list.push({key,page:pg?.id,component:c?.id,event:ev,label:c?friendlyComponent(c):pg?.name||words(lang,'Application','Aplicación','Application'),pageName:pg?.name||words(lang,'Application','Aplicación','Application'),eventLabel:eventLabel(ev,lang),count});};
 for(const ev of ['start','timer'])push('app:'+ev,null,null,ev);
 for(const pg of p.pages){push(pg.id+':show',pg,null,'show');for(const c of pg.components)for(const ev of new Set([...availableEvents(c.type),...Object.keys(p.graphs||{}).filter(k=>k.startsWith(pg.id+':'+c.id+':')).map(k=>k.split(':').at(-1))]))push(pg.id+':'+c.id+':'+ev,pg,c,ev);}
 return list;
}
export function describeActions(p,key,lang='en'){
 const c=eventContext(p,key),name=id=>friendlyComponent(c.page?.components.find(c=>c.id===id))||id||'…',pg=id=>p.pages.find(p=>p.id===id)?.name||'…',t=(a,b,d)=>words(lang,a,b,d);
 let actions;try{actions=getEventActions(p,key);}catch(e){return {text:t('Advanced graph: ','Grafo avanzado: ','Graphe avancé : ')+e.message,actions:null,advanced:true};}
 const describe=a=>{
  const expr=presentFormula(a.expression||'0',c.page?.components).text;
  const labels={navigate:t('Open ','Abrir ','Ouvrir ')+pg(a.page),back:t('Return to the previous page in history','Volver a la página anterior del historial','Revenir à la page précédente'),home:t('Open the start page','Abrir la página inicial','Ouvrir la page initiale'),nextPage:t('Open the next page','Abrir la siguiente página','Ouvrir la page suivante'),validate:t('Check numeric inputs: ','Comprobar entradas numéricas: ','Vérifier les entrées numériques : ')+(a.inputs||[]).map(name).join(', '),setText:t('Show ','Mostrar ','Afficher ')+expr+t(' in ',' en ',' dans ')+name(a.target)+(a.suffix?' ('+a.suffix+')':''),setValue:t('Set value of ','Cambiar valor de ','Changer la valeur de ')+name(a.target)+': '+expr,setColor:t('Change color of ','Cambiar color de ','Changer la couleur de ')+name(a.target)+': '+a.color,show:t('Show ','Mostrar ','Afficher ')+name(a.target),hide:t('Hide ','Ocultar ','Masquer ')+name(a.target),setVariable:t('Save value in ','Guardar valor en ','Stocker la valeur dans ')+a.target+': '+expr,store:t('Store TI variable ','Guardar variable TI ','Stocker la variable TI ')+a.target,recall:t('Recall TI variable ','Recuperar variable TI ','Rappeler la variable TI ')+a.target,custom:t('Run preserved custom Lua','Ejecutar Lua personalizado conservado','Exécuter le Lua personnalisé conservé'),flow:t('Run reusable flow ','Ejecutar flujo reutilizable ','Exécuter le flux ')+a.flow};
  if(a.type==='if')return t('If ','Si ','Si ')+presentFormula(a.condition||a.expression,c.page?.components).text+': '+(a.yes||[]).map(describe).join('; ')+(a.no?.length?t('. Otherwise: ','. En otro caso: ','. Sinon : ')+a.no.map(describe).join('; '):'');
  if(['repeat','while','sequence'].includes(a.type))return a.type+': '+(a.body||[]).map(describe).join('; ');
  return labels[a.type]||a.type+': '+expr;
 };
 return {actions,text:eventLabel(c.event,lang)+ (c.owner?.type?' '+name(c.owner.id):'')+': '+(actions.length?actions.map(describe).join(' → '):t('No actions configured.','Sin acciones configuradas.','Aucune action configurée.')),describe,advanced:false};
}
export function navigationLabel(p,link,lang='en'){
 const destination=link.type==='back'?words(lang,'Previous page','Página anterior','Page précédente'):p.pages.find(pg=>pg.id===link.to)?.name||words(lang,'Dynamic destination','Destino dinámico','Destination dynamique');
 return eventLabel(link.event,lang)+' → '+destination;
}
// Rounded orthogonal routes. Candidate corridors include obstacle boundaries;
// selection is deterministic and never changes the underlying graph.
export function routeWire(a,b,obstacles=[],{axis='horizontal',lane=0,via}={}){
 if(via)return routeWire(a,via,obstacles,{axis})+' '+routeWire(via,b,obstacles,{axis}).replace(/^M/,'L');
 const vertical=axis==='vertical',s=vertical?{x:a.x,y:a.y+18}:{x:a.x+18,y:a.y},e=vertical?{x:b.x,y:b.y-18}:{x:b.x-18,y:b.y};
 const hit=(p,q,r)=>p.x===q.x?p.x>r.x&&p.x<r.x+r.w&&Math.max(p.y,q.y)>r.y&&Math.min(p.y,q.y)<r.y+r.h:p.y>r.y&&p.y<r.y+r.h&&Math.max(p.x,q.x)>r.x&&Math.min(p.x,q.x)<r.x+r.w;
 const rects=obstacles.filter(r=>![a,b].some(p=>p.x>=r.x-1&&p.x<=r.x+r.w+1&&p.y>=r.y-1&&p.y<=r.y+r.h+1));
 const candidates=[],xs=[(s.x+e.x)/2+lane*7,...rects.flatMap(r=>[r.x-22-lane*3,r.x+r.w+22+lane*3])],ys=[(s.y+e.y)/2+lane*7,...rects.flatMap(r=>[r.y-22-lane*3,r.y+r.h+22+lane*3])];
 for(const x of xs)candidates.push([a,s,{x,y:s.y},{x,y:e.y},e,b]);
 for(const y of ys)candidates.push([a,s,{x:s.x,y},{x:e.x,y},e,b]);
 let best,score=Infinity;for(const points of candidates){let cost=0;for(let i=1;i<points.length;i++){cost+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);for(const r of rects)if(hit(points[i-1],points[i],r))cost+=100000;}if(cost<score){score=cost;best=points;}}
 const points=best.filter((p,i,all)=>!i||p.x!==all[i-1].x||p.y!==all[i-1].y);let d=`M${points[0].x},${points[0].y}`;
 for(let i=1;i<points.length-1;i++){const prev=points[i-1],p=points[i],next=points[i+1],l=Math.hypot(p.x-prev.x,p.y-prev.y),r=Math.min(12,l/2,Math.hypot(next.x-p.x,next.y-p.y)/2),before={x:p.x+(prev.x-p.x)*r/l,y:p.y+(prev.y-p.y)*r/l},len=Math.hypot(next.x-p.x,next.y-p.y),after={x:p.x+(next.x-p.x)*r/len,y:p.y+(next.y-p.y)*r/len};d+=` L${before.x},${before.y} Q${p.x},${p.y} ${after.x},${after.y}`;}
 return d+` L${b.x},${b.y}`;
}
export function insertOnWire(graph,index,node){
 const edge=graph.edges[index];if(!edge)return false;
 if(edge.from===node.id||edge.to===node.id||graph.edges.some(e=>e.to===node.id&&e.input==='in')||edge.input!=='in'||!['navigate','setText','setValue','setColor','show','hide','setVariable','validate','delay','custom','flow','back','home','nextPage'].includes(node.type))return false;
 graph.edges.splice(index,1,{from:edge.from,out:edge.out,to:node.id,input:'in'},{from:node.id,out:'next',to:edge.to,input:edge.input});
 const target=graph.nodes.find(n=>n.id===edge.to);if(target){const dx=Math.max(0,node.x+290-target.x);const seen=new Set();function shift(id){if(seen.has(id))return;seen.add(id);const n=graph.nodes.find(n=>n.id===id);if(n&&!n.locked)n.x+=dx;for(const e of graph.edges.filter(e=>e.from===id&&e.input==='in'))shift(e.to);}shift(target.id);}return true;
}
