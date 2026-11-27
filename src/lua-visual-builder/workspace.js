// Persisted editor geometry is independent of calculator coordinates and runtime state.
export const PAGE_WIDTH=264;
export function navigationWorkspace(p){const w=p.navigation||={positions:{},view:{x:24,y:24,z:.75},groups:[],mode:'hierarchical',snap:true};w.positions||={};w.groups||=[];w.view||={x:24,y:24,z:.75};return w;}
export function pageHeight(p,links=[]){return p.navigationDetail==='compact'?85:200+Math.max(1,links.filter(l=>l.from===p.id).length)*29;}
export function layoutPages(project,links,{mode='hierarchical',reset=false,dimensions={}}={}){
 const size=p=>({w:dimensions[p.id]?.width||PAGE_WIDTH,h:dimensions[p.id]?.height||pageHeight(p,links)});
 const w=navigationWorkspace(project),pages=project.pages,ids=new Set(pages.map(p=>p.id)),level=new Map(),adj=new Map(pages.map(p=>[p.id,[]]));
 for(const l of links)if(ids.has(l.from)&&ids.has(l.to)&&l.from!==l.to&&!adj.get(l.from).includes(l.to))adj.get(l.from).push(l.to);
 const roots=[project.startPage,...pages.map(p=>p.id)],order=[];let section=0;
 for(const root of roots){if(level.has(root))continue;level.set(root,section);const queue=[root];while(queue.length){const id=queue.shift();order.push(id);for(const to of adj.get(id)||[])if(!level.has(to)){level.set(to,level.get(id)+1);queue.push(to);}}if(adj.get(root).length)section=Math.max(...level.values())+1;}
 const rows=new Map();for(const id of order){const depth=level.get(id);if(!rows.has(depth))rows.set(depth,[]);rows.get(depth).push(id);}
 // A barycentric ordering reduces crossings without adding a large layout dependency.
 for(const [depth,row]of rows)if(depth){const prev=rows.get(depth-1)||[];const score=id=>{const inbound=links.filter(l=>l.to===id&&prev.includes(l.from)).map(l=>prev.indexOf(l.from));return inbound.length?inbound.reduce((a,b)=>a+b,0)/inbound.length:prev.length+row.indexOf(id);};row.sort((a,b)=>score(a)-score(b));}
 const height=Math.max(300,...pages.map(p=>size(p).h))+65,slots=new Map(),rowOffsets=new Map();let rowOffset=0;for(const [depth,row]of rows){rowOffsets.set(depth,rowOffset);rowOffset+=Math.max(1,Math.ceil(row.length/6));}
 for(const [depth,row]of rows)row.forEach((id,i)=>{let x,y;switch(mode){case'horizontal':x=40+depth*350;y=45+i*height;break;case'vertical':case'hierarchical':x=45+(i%6)*330;y=45+(rowOffsets.get(depth)+Math.floor(i/6))*height;break;case'radial':{const others=order.filter(id=>id!==project.startPage),a=others.indexOf(id)/Math.max(1,others.length)*Math.PI*2;x=650+(id===project.startPage?0:Math.cos(a)*500);y=650+(id===project.startPage?0:Math.sin(a)*500);break;}case'grid':x=40+(order.indexOf(id)%4)*330;y=40+Math.floor(order.indexOf(id)/4)*height;break;default:return;}slots.set(id,{x:Math.round(x),y:Math.round(y)});});
 if(['hierarchical','vertical'].includes(mode)){for(const [depth,row]of [...rows].reverse()){for(const id of row){const children=adj.get(id).filter(to=>level.get(to)>depth);if(children.length){const positions=children.map(id=>slots.get(id)).filter(Boolean);slots.get(id).x=Math.round(positions.reduce((sum,p)=>sum+p.x,0)/positions.length);}}}}
 const occupied=[];for(const p of pages){const old=w.positions[p.id];if(old&&(old.locked||(!reset&&old.manual)))occupied.push({id:p.id,x:old.x,y:old.y,w:size(p).w,h:size(p).h});}
 for(const id of order){const old=w.positions[id];if(old&&(old.locked||(!reset&&old.manual)))continue;const s=slots.get(id);if(!s)continue;const {w:width,h}=size(pages.find(p=>p.id===id));let n=0;while(occupied.some(r=>s.x<r.x+r.w+25&&s.x+width+25>r.x&&s.y<r.y+r.h+25&&s.y+h+25>r.y)&&n++<300)s.y+=height;w.positions[id]={...old,...s,manual:false};occupied.push({id,x:s.x,y:s.y,w:width,h});}
 w.mode=mode;return w;
}
export function arrangeItems(items,ids,mode,{width=230,height=180}={}){
 const list=items.filter(n=>ids.has(n.id)&&!n.locked);if(list.length<2)return;
 const size=n=>({w:n.width||width,h:n.height||height});
 const minX=Math.min(...list.map(n=>n.x)),minY=Math.min(...list.map(n=>n.y)),maxX=Math.max(...list.map(n=>n.x+size(n).w)),maxY=Math.max(...list.map(n=>n.y+size(n).h));
 if(mode==='distributeX'||mode==='distributeY'){const axis=mode==='distributeX'?'x':'y',key=axis==='x'?'w':'h',ordered=[...list].sort((a,b)=>a[axis]-b[axis]),start=ordered[0][axis],end=ordered.at(-1)[axis]+size(ordered.at(-1))[key],gap=(end-start-ordered.reduce((s,n)=>s+size(n)[key],0))/(ordered.length-1);let cursor=start;for(const n of ordered){n[axis]=cursor;cursor+=size(n)[key]+gap;}return;}
 for(const n of list){if(mode==='left')n.x=minX;if(mode==='top')n.y=minY;if(mode==='right')n.x=maxX-size(n).w;if(mode==='bottom')n.y=maxY-size(n).h;}
}
export function semanticGraphLayout(graph,{selection=null,dimensions={},reset=false}={}){
 const movable=n=>!n.locked&&(reset||!n.manual||selection?.has(n.id))&&(!selection||selection.has(n.id)),nodes=new Map(graph.nodes.map(n=>[n.id,n])),execution=e=>['in','next','yes','no','body','first','second'].includes(e.input),placed=new Set(),occupied=[];
 const size=n=>dimensions[n.id]||{width:230,height:135+Math.max(n.type==='if'?3:2,1)*29};
 for(const n of graph.nodes)if(!movable(n))occupied.push({x:n.x,y:n.y,w:size(n).width,h:size(n).height});
 const place=(n,x,y)=>{if(!n||placed.has(n.id))return;placed.add(n.id);if(!movable(n))return;const s=size(n);x=Math.max(20,Math.round(x));y=Math.max(20,Math.round(y));if(x>9000)x=40;if(y>9000)y=40;let count=0;while(occupied.some(r=>x<r.x+r.w+25&&x+s.width+25>r.x&&y<r.y+r.h+25&&y+s.height+25>r.y)&&count++<1500){y+=s.height+45;if(y>9000){y=40;x+=330;if(x>9000)x=40;}}n.x=x;n.y=y;occupied.push({x:n.x,y:n.y,w:s.width,h:s.height});};
 const pending=graph.nodes.filter(n=>n.type==='event').map(n=>({id:n.id,x:650,y:80}));let count=0;
 while(pending.length&&count++<500){const p=pending.shift(),n=nodes.get(p.id);if(!n||placed.has(n.id))continue;place(n,p.x,p.y);for(const e of graph.edges.filter(e=>e.from===n.id&&execution(e))){const dy=e.out==='yes'||e.out==='first'?-270:e.out==='no'||e.out==='second'?270:e.out==='body'?350:0;pending.push({id:e.to,x:n.x+330,y:Math.max(40,n.y+dy)});}}
 function inputs(id,depth=0){if(depth>30)return;const consumer=nodes.get(id);for(const [i,e]of graph.edges.filter(e=>e.to===id&&!execution(e)).entries()){const n=nodes.get(e.from);if(!n)continue;if(!placed.has(n.id))place(n,consumer.x-310,consumer.y+size(consumer).height+60+i*230);inputs(n.id,depth+1);}}
 [...placed].forEach(id=>inputs(id));let y=Math.max(100,...occupied.map(r=>r.y+r.h))+100;for(const n of graph.nodes)if(!placed.has(n.id)){place(n,70,y);y+=size(n).height+45;}
 return graph;
}
export function addReroute(graph,edgeIndex){const e=graph.edges[edgeIndex];if(!e)throw Error('Missing wire');const a=graph.nodes.find(n=>n.id===e.from),b=graph.nodes.find(n=>n.id===e.to),exec=['in','next','yes','no','body','first','second'].includes(e.input);let i=1;while(graph.nodes.some(n=>n.id==='reroute_'+i))i++;const n={id:'reroute_'+i,type:exec?'rerouteExec':'rerouteData',x:(a.x+b.x)/2,y:(a.y+b.y)/2};graph.nodes.push(n);graph.edges.splice(edgeIndex,1,{from:e.from,out:e.out,to:n.id,input:exec?'in':'value'},{from:n.id,out:exec?'next':'value',to:e.to,input:e.input});return n;}
