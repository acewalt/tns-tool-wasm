(() => {
  'use strict';
  // TI.GeoGrapher stores geometry in paper coordinates and the graph window in
  // axes_system. ToolGrapher's xmin/xmax are tool defaults, not that window.
  const finite = (value, fallback = 0) => { const n = Number(String(value ?? '').replaceAll('−', '-')); return Number.isFinite(n) ? n : fallback; };
  const child = (node, name) => node?.children?.find(entry => entry.name === name);
  const value = (node, name, fallback = '') => child(node, name)?.text?.trim() ?? fallback;
  const decode = text => String(text).replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, code, named) => code ? String.fromCodePoint(parseInt(code.replace(/^x/i, ''), /^x/i.test(code) ? 16 : 10)) : ({ amp:'&',lt:'<',gt:'>',quot:'"',apos:"'" })[named]);
  function xmlTree(source) {
    const root = { name: '#document', children: [], text: '' }, stack = [root];
    for (const token of String(source || '').match(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || []) {
      if (/^<\?|^<!DOCTYPE|^<!--/.test(token)) continue;
      if (token.startsWith('<![CDATA[')) { stack.at(-1).text += token.slice(9, -3); continue; }
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (token.startsWith('<')) {
        const name = token.match(/^<([^\s/>]+)/)?.[1]; if (!name) continue;
        const node = { name: name.split(':').at(-1), children: [], text: '' };
        stack.at(-1).children.push(node); if (!/\/\s*>$/.test(token)) stack.push(node);
      } else stack.at(-1).text += decode(token);
    }
    return root;
  }
  function descend(node, name) {
    if (node.name === name) return node;
    for (const entry of node.children || []) { const result = descend(entry, name); if (result) return result; }
    return null;
  }
  const scalarChildren = node => Object.fromEntries((node?.children || []).filter(entry => !entry.children.length).map(entry => [entry.name, entry.text.trim()]));
  const colors = ['#0000ff', '#ff0000', '#008000', '#8b00bf', '#008b8b'];
  function color(raw, fallback = '#111111') {
    const n = finite(raw, -1); return n >= 0 && n <= 0xffffff ? '#' + Math.round(n).toString(16).padStart(6, '0') : fallback;
  }
  function parseXml(source) {
    const root = xmlTree(source), fig = descend(root, 'fig'), objs = child(fig, 'objs');
    const axes = child(objs, 'axes_system'), a = scalarChildren(axes);
    const viewport = { xmin: finite(a.umin, -10), xmax: finite(a.umax, 10), ymin: finite(a.vmin, -6.6666666667), ymax: finite(a.vmax, 6.6666666667) };
    if (!(viewport.xmax > viewport.xmin) || !(viewport.ymax > viewport.ymin)) Object.assign(viewport, { xmin:-10,xmax:10,ymin:-6.6666666667,ymax:6.6666666667 });
    const surface = { x:finite(a.srfx),y:finite(a.srfy),width:finite(a.srfw,1),height:finite(a.srfh,1) };
    const objects = (objs?.children || []).map(node => ({ ...scalarChildren(node), nativeType:value(node,'type'), type:node.name, children:Object.fromEntries(node.children.filter(entry=>entry.children.length).map(entry=>[entry.name,scalarChildren(entry)])), kinds:node.children.map(entry=>entry.name) }));
    const byId = new Map(objects.map(object => [object.id, object]));
    const expressions = objects.filter(object => object.type === 'expression');
    const curves = objects.filter(object => object.type === 'graph').map((graph,index) => {
      const expression = String(graph.par || '').trim().split(/\s+/).map(id=>byId.get(id)).find(object=>object?.type==='expression');
      return { id:graph.id,expressionId:expression?.id,name:expression?.lbl || graph.pref?.replace(/\(.*$/, '') || `f${index+1}`,formula:expression?.expr || graph.expr || '',color:color(graph.alco,colors[index%colors.length]),visible:graph.asho!=='0',style:finite(graph.apst),width:Math.max(1,finite(graph.apth,1)) };
    });
    if (!curves.length) for (const [index, expression] of expressions.entries()) curves.push({ id:expression.id,expressionId:expression.id,name:expression.lbl || `f${index+1}`,formula:expression.expr || '',color:colors[index%colors.length],visible:true,style:0,width:1 });
    const axisObjects = objects.filter(object=>object.type==='axis');
    const tick = (axis, fallback) => finite(objects.find(object=>object.type==='number'&&object.children.axistic?.ty===axis)?.num, finite(fallback));
    return { version:1,viewport,surface,objects,curves,axesVisible:a.asho!=='0',grid:objects.some(object=>object.type==='grid'&&object.asho==='1'),xLabel:axisObjects[0]?.lbl||'x',yLabel:axisObjects[1]?.lbl||'y',tickX:tick('0',a.tivu),tickY:tick('1',a.tivv),animationAvailable:objects.some(object=>object.type==='point'&&object.kinds.includes('pton_c')),animationRunning:false };
  }
  function paperToWorld(state, x, y) {
    const s=state.surface,v=state.originalViewport || state.viewport;
    return { x:v.xmin+(finite(x)-s.x)/s.width*(v.xmax-v.xmin),y:v.ymin+(finite(y)-s.y)/s.height*(v.ymax-v.ymin) };
  }
  function worldToPaper(state, x, y) {
    const s=state.surface,v=state.originalViewport || state.viewport;
    return { x:s.x+(x-v.xmin)/(v.xmax-v.xmin)*s.width,y:s.y+(y-v.ymin)/(v.ymax-v.ymin)*s.height };
  }
  function zoomViewport(viewport, factor, fx=.5, fy=.5) {
    const x=viewport.xmin+(viewport.xmax-viewport.xmin)*fx,y=viewport.ymax-(viewport.ymax-viewport.ymin)*fy;
    const width=(viewport.xmax-viewport.xmin)*factor,height=(viewport.ymax-viewport.ymin)*factor;
    if (width<1e-12 || width>1e15 || height<1e-12 || height>1e15) return { ...viewport };
    return { xmin:x-width*fx,xmax:x+width*(1-fx),ymin:y-height*(1-fy),ymax:y+height*fy };
  }
  function variableMap(input) {
    return Array.isArray(input) ? Object.fromEntries(input.filter(entry=>entry?.type!=='program'&&entry?.name).map(entry=>[entry.name,entry.value])) : input || {};
  }
  function expandFormula(source, variables = {}, stack = []) {
    const entries = new Map(Object.entries(variables).map(([name,data])=>[name.toLocaleLowerCase(),data]));
    return String(source).replace(/[\p{L}_][\p{L}\p{N}_]*/gu, name => {
      if (name.toLowerCase()==='x') return name;
      const data=entries.get(name.toLocaleLowerCase()); if (typeof data!=='string' || !data.trim() || /^"/.test(data.trim())) return name;
      if (stack.includes(name.toLocaleLowerCase()) || stack.length>20) throw new Error(`Circular graph variable: ${name}`);
      return '('+expandFormula(data,variables,[...stack,name.toLocaleLowerCase()])+')';
    });
  }
  function sampleCurve(curve, viewport, count, evaluate, variables = {}) {
    const formula=expandFormula(curve.formula,variables), points=[], errors=new Set();
    for(let i=0;i<count;i++) {
      const x=viewport.xmin+(viewport.xmax-viewport.xmin)*i/(count-1);
      try { const y=evaluate(formula,{...variables,x}); points.push(typeof y==='number'&&Number.isFinite(y)?{x,y}:null); }
      catch(error) { points.push(null); errors.add(String(error.message||error)); }
    }
    return {points,errors:[...errors],formula};
  }
  // Native constructions retain their dependency graph. Recompute points and
  // measurements when a constrained point moves instead of animating a bitmap.
  function geometry(state, variables = () => ({})) {
    const byId=new Map(state.objects.map(object=>[object.id,object]));
    const ids=obj=>String(obj?.par||'').trim().split(/\s+/);
    const next=(visited,id)=>{if(visited.has(id))return null;const set=new Set(visited);set.add(id);return set;};
    function point(id,visited=new Set()) {
      const seen=next(visited,id),obj=byId.get(id);if(!seen||!obj||obj.type!=='point')return null;
      const parents=ids(obj),stored=paperToWorld(state,obj.x,obj.y);
      if(obj.children.pton_c){const circle=circleGeometry(byId.get(parents[0]),seen);if(circle){const t=finite(obj.children.pton_c.t);return{x:circle.x+circle.radius*Math.cos(t),y:circle.y+circle.radius*Math.sin(t)};}}
      if(obj.kinds.includes('point_ll')){const a=line(byId.get(parents[0]),seen),b=line(byId.get(parents[1]),seen);if(a&&b){const den=a.dx*b.dy-a.dy*b.dx;if(Math.abs(den)>1e-14){const t=((b.x-a.x)*b.dy-(b.y-a.y)*b.dx)/den;return{x:a.x+t*a.dx,y:a.y+t*a.dy};}}}
      if(obj.children.vx_pol){const vertices=polygon(byId.get(parents[0]),seen);if(vertices.length)return vertices[(Math.max(1,finite(obj.children.vx_pol.i))-1)%vertices.length];}
      const vars=variables(),x=state.objects.find(n=>n.type==='number'&&n.children.coord_p?.ty==='0'&&ids(n)[0]===id),y=state.objects.find(n=>n.type==='number'&&n.children.coord_p?.ty==='1'&&ids(n)[0]===id);
      if(x?.lbl&&y?.lbl&&Number.isFinite(vars[x.lbl])&&Number.isFinite(vars[y.lbl]))return{x:vars[x.lbl],y:vars[y.lbl]};
      if(obj.children.pton_axes)return{x:finite(obj.children.pton_axes.x),y:finite(obj.children.pton_axes.y)};
      return stored;
    }
    function line(obj,visited=new Set()) {
      if(!obj)return null;const seen=next(visited,obj.id);if(!seen)return null;
      if(obj.type==='axis')return{x:0,y:0,dx:obj.kinds.includes('yaxis')?0:1,dy:obj.kinds.includes('yaxis')?1:0};
      const parents=ids(obj);
      if(obj.kinds.includes('perpline_lp')||obj.kinds.includes('parline_lp')){const a=line(byId.get(parents[0]),seen),p=point(parents[1],seen);if(a&&p)return{...p,dx:obj.kinds.includes('perpline_lp')?-a.dy:a.dx,dy:obj.kinds.includes('perpline_lp')?a.dx:a.dy};}
      const a=point(parents[0],seen),b=point(parents[1],seen);return a&&b?{...a,dx:b.x-a.x,dy:b.y-a.y}:null;
    }
    function circleGeometry(obj,visited=new Set()) {
      if(!obj||obj.type!=='circle')return null;const seen=next(visited,obj.id);if(!seen)return null;
      const parents=ids(obj),center=point(parents[0],seen);if(!center)return null;
      const edge=point(parents[1],seen),radius=obj.kinds.includes('circle_pr')?finite(byId.get(parents[1])?.num,NaN):edge?Math.hypot(edge.x-center.x,edge.y-center.y):NaN;
      return Number.isFinite(radius)&&radius>=0?{...center,radius}:null;
    }
    function polygon(obj,visited=new Set()) {
      if(!obj)return[];const seen=next(visited,obj.id);if(!seen)return[];const parents=ids(obj),points=parents.map(id=>point(id,seen)).filter(Boolean);
      if(obj.children.pol_reg&&points.length>=2){const [a,b]=points,count=Math.min(360,Math.max(3,finite(obj.children.pol_reg.s,3))),rotation=2*Math.PI/count*(finite(obj.children.pol_reg.r,1)>=0?1:-1),edge={x:b.x-a.x,y:b.y-a.y},vertices=[a,b];let dx=edge.x,dy=edge.y;for(let i=2;i<count;i++){[dx,dy]=[dx*Math.cos(rotation)-dy*Math.sin(rotation),dx*Math.sin(rotation)+dy*Math.cos(rotation)];const last=vertices.at(-1);vertices.push({x:last.x+dx,y:last.y+dy});}return vertices;}
      return points;
    }
    function numberValue(obj) {
      const parents=ids(obj),p=point(parents[0]);
      if(obj?.children.coord_p&&p)return obj.children.coord_p.ty==='0'?p.x:p.y;
      if(obj?.kinds.includes('angle_ppp')){const a=point(parents[0]),b=point(parents[1]),c=point(parents[2]);if(a&&b&&c){const angle=Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(a.y-b.y,a.x-b.x);return(angle+Math.PI*2)%(Math.PI*2);}}
      if(obj?.children.axisval)return state.viewport[{'0':'xmax','1':'xmin','2':'ymax','3':'ymin'}[obj.children.axisval.ty]];
      return finite(obj?.num);
    }
    return {point,line,circle:circleGeometry,polygon,number:numberValue};
  }
  const phrases = {
    en:{title:'Graphs',intro:'Wheel to zoom. Drag to pan; drag a point to move it.',save:'Save',close:'Close',reset:'Original window',standard:'Standard window',square:'Square scale',grid:'Grid',axes:'Axes',trace:'Trace',equations:'Equations',window:'Window settings',animate:'Play animation',pause:'Pause animation',hide:'Hide / show',select:'Select',ready:'Ready',empty:'This graph has no expressions.',apply:'Apply',badWindow:'Enter valid increasing window bounds.',error:'Graph evaluation',unsupported:'Unsupported geometry',formula:'Formula'},
    es:{title:'Gráficos',intro:'Rueda para acercar. Arrastra para desplazar o mover un punto.',save:'Guardar',close:'Cerrar',reset:'Ventana original',standard:'Ventana estándar',square:'Escala cuadrada',grid:'Cuadrícula',axes:'Ejes',trace:'Trazar',equations:'Ecuaciones',window:'Ajustes de ventana',animate:'Iniciar animación',pause:'Pausar animación',hide:'Ocultar / mostrar',select:'Seleccionar',ready:'Listo',empty:'Este gráfico no tiene expresiones.',apply:'Aplicar',badWindow:'Introduce límites válidos y crecientes.',error:'Evaluación del gráfico',unsupported:'Geometría no compatible',formula:'Fórmula'},
    fr:{title:'Graphiques',intro:'Molette pour zoomer. Faites glisser la vue ou un point.',save:'Enregistrer',close:'Fermer',reset:'Fenêtre originale',standard:'Fenêtre standard',square:'Échelle orthonormée',grid:'Grille',axes:'Axes',trace:'Trace',equations:'Équations',window:'Réglages de fenêtre',animate:'Lancer l’animation',pause:'Pause de l’animation',hide:'Masquer / afficher',select:'Sélectionner',ready:'Prêt',empty:'Ce graphique ne contient aucune expression.',apply:'Appliquer',badWindow:'Saisissez des limites valides et croissantes.',error:'Évaluation du graphique',unsupported:'Géométrie non prise en charge',formula:'Formule'}
  };
  const language = () => phrases[String(globalThis.document?.documentElement?.lang||'en').slice(0,2)] || phrases.en;
  const copy = state => JSON.parse(JSON.stringify(state));
  const button = (label, action, className='') => { const element=document.createElement('button');element.type='button';element.textContent=label;element.className=className;element.addEventListener('click',action);return element; };
  function mount(host, item, options = {}) {
    const labels=language(),state=copy(options.state || options.draft || parseXml(item?.raw_xml)),initial=copy(state);
    state.originalViewport ||= copy(initial.viewport);
    if (!state.curves.length && !state.objects.length && item?.detail?.expression) state.curves.push({id:'',name:item.detail.function||'f1',formula:item.detail.expression,color:colors[0],visible:true});
    const root=document.createElement('div');root.className='ti-graph-root';root.tabIndex=0;
    const canvas=document.createElement('canvas');canvas.className='ti-graph-canvas';canvas.setAttribute('aria-label',labels.title);root.append(canvas);host.replaceChildren(root);
    const menu=document.createElement('div');menu.className='ti-graph-context';menu.hidden=true;root.append(menu);
    const status=document.createElement('div');status.className='ti-graph-status';status.setAttribute('role','status');
    const controls=options.controls===false?null:document.createElement('div');if(controls){controls.className='ti-graph-controls';options.controlsHost?.append(controls);}
    let width=320,height=214,disposed=false,trace=false,hover=null,drag=null,animation=0,lastTime=0,renderPending=false,lastError='';
    const byId=new Map(state.objects.map(object=>[object.id,object]));
    
    const getVars=()=>({...variableMap(options.storedVariables),...variableMap(options.mathSession?.snapshot?.()?.variables||options.mathSession?.variables),...variableMap(options.getVariables?.())});
    const evalMath=(source,vars)=>{
      if(options.evaluate)return options.evaluate(source,vars);
      if(!globalThis.TnsTiBasicMath?.evaluate)throw new Error('TI math runtime is unavailable.');
      const numeric=Object.fromEntries(Object.entries(vars).filter(([,data])=>typeof data!=='string'||/^"/.test(data)));
      return globalThis.TnsTiBasicMath.evaluate(source,numeric,{angleMode:options.mathSession?.angleMode||'RAD',context:options.mathSession?.context});
    };
    const xy=point=>({x:(point.x-state.viewport.xmin)/(state.viewport.xmax-state.viewport.xmin)*width,y:(state.viewport.ymax-point.y)/(state.viewport.ymax-state.viewport.ymin)*height});
    const world=(x,y)=>({x:state.viewport.xmin+x/width*(state.viewport.xmax-state.viewport.xmin),y:state.viewport.ymax-y/height*(state.viewport.ymax-state.viewport.ymin)});
    const construction=geometry(state,getVars),point=construction.point,circleGeometry=construction.circle,numberValue=construction.number;
    function updateVariables() {
      const changed={};for(const obj of state.objects)if(obj.type==='number'&&obj.lbl){const n=numberValue(obj);if(Number.isFinite(n)){obj.num=String(n);changed[obj.lbl]=n;if(options.mathSession?.variables)options.mathSession.variables[obj.lbl]=n;}}
      options.onVariablesChange?.(changed);return changed;
    }
    function stroke(ctx,obj){ctx.strokeStyle=color(obj.alco||obj.acol);ctx.lineWidth=1+Math.min(3,finite(obj.apth));ctx.setLineDash(finite(obj.apst)===1?[5,4]:finite(obj.apst)===2?[1,3]:[]);}
    const niceStep=(range,pixels)=>{const power=Math.pow(10,Math.floor(Math.log10(range/Math.max(2,pixels/65)))),unit=range/Math.max(2,pixels/65)/power;return(unit>5?10:unit>2?5:unit>1?2:1)*power;};
    const format=n=>Math.abs(n)<1e-12?'0':Number(n.toPrecision(5)).toString();
    function drawAxes(ctx) {
      const v=state.viewport,x0=xy({x:0,y:0}).x,y0=xy({x:0,y:0}).y;
      const stepX=state.tickX>0?state.tickX:niceStep(v.xmax-v.xmin,width),stepY=state.tickY>0?state.tickY:niceStep(v.ymax-v.ymin,height);
      ctx.lineWidth=1;ctx.setLineDash([]);ctx.font='9px Arial';ctx.fillStyle='#111';
      const xTicks=[],yTicks=[];for(let x=Math.ceil(v.xmin/stepX)*stepX;x<=v.xmax&&xTicks.length<200;x+=stepX)xTicks.push(x);for(let y=Math.ceil(v.ymin/stepY)*stepY;y<=v.ymax&&yTicks.length<200;y+=stepY)yTicks.push(y);
      if(state.grid){ctx.strokeStyle='#dadada';ctx.beginPath();for(const x of xTicks){const p=xy({x,y:0});ctx.moveTo(p.x,0);ctx.lineTo(p.x,height);}for(const y of yTicks){const p=xy({x:0,y});ctx.moveTo(0,p.y);ctx.lineTo(width,p.y);}ctx.stroke();}
      if(!state.axesVisible)return;
      ctx.strokeStyle='#111';ctx.beginPath();if(y0>=0&&y0<=height){ctx.moveTo(0,y0);ctx.lineTo(width,y0);}if(x0>=0&&x0<=width){ctx.moveTo(x0,0);ctx.lineTo(x0,height);}ctx.stroke();
      ctx.beginPath();ctx.textAlign='center';ctx.textBaseline='top';for(const x of xTicks){const p=xy({x,y:0});if(y0>=0&&y0<=height){ctx.moveTo(p.x,y0-2);ctx.lineTo(p.x,y0+2);if(Math.abs(x)>stepX*.001&&p.x>12&&p.x<width-12&&Math.abs(Math.round(x/stepX))%Math.max(1,Math.ceil(34/(stepX/(v.xmax-v.xmin)*width)))===0)ctx.fillText(format(x),p.x,Math.min(height-12,y0+4));}}ctx.stroke();
      ctx.beginPath();ctx.textAlign='right';ctx.textBaseline='middle';for(const y of yTicks){const p=xy({x:0,y});if(x0>=0&&x0<=width){ctx.moveTo(x0-2,p.y);ctx.lineTo(x0+2,p.y);if(Math.abs(y)>stepY*.001&&p.y>10&&p.y<height-10&&Math.abs(Math.round(y/stepY))%Math.max(1,Math.ceil(13/(stepY/(v.ymax-v.ymin)*height)))===0)ctx.fillText(format(y),Math.max(15,x0-4),p.y);}}ctx.stroke();
      ctx.font='italic 10px Arial';if(y0>0&&y0<height){ctx.textAlign='right';ctx.fillText(state.xLabel,width-3,Math.max(6,y0-7));}if(x0>0&&x0<width){ctx.textAlign='left';ctx.fillText(state.yLabel,Math.min(width-12,x0+5),7);}
    }
    function drawCurves(ctx) {
      const errors=[];for(const curve of state.curves){if(!curve.visible||!curve.formula.trim())continue;let samples;
        try{samples=sampleCurve(curve,state.viewport,Math.min(1400,Math.max(240,width*2)),evalMath,getVars());}catch(error){errors.push(`${curve.name}: ${error.message}`);continue;}
        if(samples.points.every(p=>!p)){errors.push(`${curve.name}: ${samples.errors[0]||labels.error}`);continue;}
        ctx.strokeStyle=curve.color;ctx.lineWidth=curve.width||1.2;ctx.setLineDash(curve.style===1?[5,4]:curve.style===2?[1,3]:[]);ctx.beginPath();let previous=null;
        for(const p of samples.points){if(!p){previous=null;continue;}const screen=xy(p);if(!Number.isFinite(screen.y)||Math.abs(screen.y)>height*8){previous=null;continue;}if(previous&&Math.abs(previous.y-screen.y)<height*1.5)ctx.lineTo(screen.x,screen.y);else ctx.moveTo(screen.x,screen.y);previous=screen;}ctx.stroke();
      }return errors;
    }
    function textForObject(obj) {
      const ids=String(obj.par||'').trim().split(/\s+/).map(id=>byId.get(id)).filter(parent=>parent?.type==='number');let dynamic=0;
      return String(obj.chrs||'').split('\n').map(line=>{const m=line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*)$/);if(!m)return line;return m[6]!=='0'&&ids[dynamic]?m[7].replace(/[−-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/,format(numberValue(ids[dynamic++]))):m[7];}).join('').trim();
    }
    function drawObjects(ctx) {
      const unsupported=new Set();
      for(const obj of state.objects){if(obj.asho==='0')continue;stroke(ctx,obj);const ids=String(obj.par||'').trim().split(/\s+/),p=point(obj.id);
        if(obj.type==='circle') {const c=circleGeometry(obj);if(!c){unsupported.add('circle');continue;}const center=xy(c);ctx.beginPath();ctx.ellipse(center.x,center.y,c.radius/(state.viewport.xmax-state.viewport.xmin)*width,c.radius/(state.viewport.ymax-state.viewport.ymin)*height,0,0,Math.PI*2);ctx.stroke();}
        else if(['segment','vector','line','ray'].includes(obj.type)){const line=construction.line(obj);if(!line){unsupported.add(obj.type);continue;}let q=xy(line),r=xy({x:line.x+line.dx,y:line.y+line.dy});if(obj.type==='line'||obj.type==='ray'){const dx=r.x-q.x,dy=r.y-q.y,k=Math.max(width,height)*4/Math.max(1,Math.hypot(dx,dy));r={x:q.x+dx*k,y:q.y+dy*k};if(obj.type==='line')q={x:q.x-dx*k,y:q.y-dy*k};}ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.stroke();if(obj.type==='vector'){const angle=Math.atan2(r.y-q.y,r.x-q.x);ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-6*Math.cos(angle-.4),r.y-6*Math.sin(angle-.4));ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-6*Math.cos(angle+.4),r.y-6*Math.sin(angle+.4));ctx.stroke();}}
        else if(obj.type==='polygon'){const vertices=construction.polygon(obj);if(vertices.length<3){unsupported.add('polygon');continue;}ctx.beginPath();for(const[i,vertex]of vertices.entries()){const q=xy(vertex);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}ctx.closePath();if(finite(obj.afco,268435199)<=0xffffff){ctx.fillStyle=color(obj.afco);ctx.fill();}ctx.stroke();}
        else if(obj.type==='circle_arc'){const angle=byId.get(ids[0]),parents=String(angle?.par||'').trim().split(/\s+/),a=point(parents[0]),b=point(parents[1]);if(!a||!b){unsupported.add('circle_arc');continue;}const q=xy(b),start=-Math.atan2(a.y-b.y,a.x-b.x),sweep=numberValue(angle);ctx.beginPath();ctx.arc(q.x,q.y,13,start,start-sweep,true);ctx.stroke();}
        else if(obj.type==='point'&&p){const q=xy(p);ctx.setLineDash([]);ctx.fillStyle=color(obj.acol);ctx.beginPath();ctx.arc(q.x,q.y,finite(obj.adst)>=7?2.5:1.6,0,Math.PI*2);ctx.fill();}
        else if(['text','label'].includes(obj.type)) {const label=textForObject(obj);if(!label)continue;let q=paperToWorld(state,obj.x,obj.y);if(obj.children.lbl_p){const parent=point(ids[0]);if(parent){q={x:parent.x+finite(obj.children.lbl_p.dx)/state.surface.width*(state.originalViewport.xmax-state.originalViewport.xmin),y:parent.y+finite(obj.children.lbl_p.dy)/state.surface.height*(state.originalViewport.ymax-state.originalViewport.ymin)};}}
          const pos=xy(q);ctx.fillStyle=color(obj.atco||obj.acol);ctx.font='11px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(label,pos.x,pos.y);}
        else if(['conic','locus','implicit','surface','image'].includes(obj.type))unsupported.add(obj.type);
      }
      ctx.setLineDash([]);return[...unsupported];
    }
    function draw() {
      if(disposed)return;const ctx=canvas.getContext('2d');if(!ctx)return;
      ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
      drawAxes(ctx);const errors=drawCurves(ctx),unsupported=drawObjects(ctx);ctx.restore();
      if(trace&&hover&&state.curves.some(c=>c.visible)){const curve=state.curves.find(c=>c.visible);try{const x=world(hover.x,hover.y).x,y=evalMath(expandFormula(curve.formula,getVars()),{...getVars(),x});if(Number.isFinite(y)){const p=xy({x,y});ctx.fillStyle=curve.color;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font='10px Arial';ctx.textAlign='left';ctx.textBaseline='bottom';ctx.fillText(`x=${format(x)}  y=${format(y)}`,5,height-5);}}catch(error){errors.push(error.message);}}
      if(state.animationAvailable){ctx.fillStyle='#eee';ctx.fillRect(2,height-20,24,18);ctx.fillStyle='#333';ctx.font='12px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(state.animationRunning?'Ⅱ':'▶',14,height-11);}
      const message=[...errors,unsupported.length?`${labels.unsupported}: ${unsupported.join(', ')}`:''].filter(Boolean).join(' · ');if(message!==lastError){lastError=message;status.textContent=message;status.hidden=!message;root.dataset.error=message;options.onStatus?.(message);}
      options.onStateChange?.(getState());
    }
    function schedule(){if(renderPending||disposed)return;renderPending=true;requestAnimationFrame(()=>{renderPending=false;draw();});}
    function resize(w,h) {if(disposed)return;width=Math.max(40,Math.round(w||host.clientWidth||320));height=Math.max(40,Math.round(h||host.clientHeight||214));const ratio=Math.min(2,globalThis.devicePixelRatio||1);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);draw();}
    function getState(){return copy(state);}
    function setViewport(view){if(['xmin','xmax','ymin','ymax'].some(key=>!Number.isFinite(Number(view[key])))||!(view.xmax>view.xmin)||!(view.ymax>view.ymin))throw new Error(labels.badWindow);state.viewport={...view};schedule();}
    function square(){const center=(state.viewport.ymin+state.viewport.ymax)/2,span=(state.viewport.xmax-state.viewport.xmin)*height/width;setViewport({...state.viewport,ymin:center-span/2,ymax:center+span/2});}
    function frame(time){if(disposed||!state.animationRunning)return;const dt=Math.min(.1,lastTime?(time-lastTime)/1000:0);lastTime=time;for(const obj of state.objects)if(obj.type==='point'&&obj.children.pton_c&&(finite(obj.children.pton_c.aani)>0||state.objects.filter(o=>o.type==='point'&&o.children.pton_c).length===1))obj.children.pton_c.t=String(finite(obj.children.pton_c.t)+dt*.6);updateVariables();draw();animation=requestAnimationFrame(frame);}
    function toggleAnimation(){state.animationRunning=!state.animationRunning;lastTime=0;if(state.animationRunning)animation=requestAnimationFrame(frame);else cancelAnimationFrame(animation);schedule();if(controls)renderControls();}
    const reset=()=>{state.viewport=copy(initial.viewport);state.grid=initial.grid;state.axesVisible=initial.axesVisible;schedule();};
    function settings(){menu.replaceChildren();menu.hidden=false;menu.style.left='4px';menu.style.top='4px';const form=document.createElement('form');for(const key of ['xmin','xmax','ymin','ymax']){const label=document.createElement('label');label.textContent=key;const field=document.createElement('input');field.type='number';field.step='any';field.name=key;field.value=state.viewport[key];label.append(field);form.append(label);}const apply=button(labels.apply,()=>{});apply.type='submit';form.append(apply);form.addEventListener('submit',event=>{event.preventDefault();try{setViewport(Object.fromEntries(Array.from(new FormData(form),([k,v])=>[k,Number(v)])));menu.hidden=true;}catch(error){status.textContent=error.message;status.hidden=false;}});menu.append(form);}
    function openMenu(event){event.preventDefault();menu.replaceChildren();menu.hidden=false;const bounds=root.getBoundingClientRect();menu.style.left=Math.max(2,Math.min(width-164,(event.clientX-bounds.left)*width/bounds.width))+'px';menu.style.top=Math.max(2,Math.min(height-205,(event.clientY-bounds.top)*height/bounds.height))+'px';const add=(label,action)=>menu.append(button(label,()=>{menu.hidden=true;action();}));add(labels.select,()=>{trace=false;schedule();});add(labels.trace,()=>{trace=!trace;schedule();});add(labels.window,settings);add(labels.reset,reset);add(labels.square,square);add(labels.axes,()=>{state.axesVisible=!state.axesVisible;schedule();});add(labels.grid,()=>{state.grid=!state.grid;schedule();});if(state.animationAvailable)add(state.animationRunning?labels.pause:labels.animate,toggleAnimation);}
    function renderControls(){if(!controls)return;controls.replaceChildren();for(const curve of state.curves){const row=document.createElement('label');row.className='ti-graph-equation';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=curve.visible;checkbox.addEventListener('change',()=>{curve.visible=checkbox.checked;schedule();});const field=document.createElement('input');field.value=curve.formula;field.setAttribute('aria-label',`${curve.name}(x)`);field.addEventListener('input',()=>{curve.formula=field.value;schedule();});row.append(checkbox,document.createTextNode(curve.name+'(x)='),field);controls.append(row);}controls.append(button(labels.reset,reset),button(labels.window,settings),button(labels.square,square));if(state.animationAvailable)controls.append(button(state.animationRunning?labels.pause:labels.animate,toggleAnimation));controls.append(status);}
    function location(event){const bounds=canvas.getBoundingClientRect();return{x:(event.clientX-bounds.left)*width/bounds.width,y:(event.clientY-bounds.top)*height/bounds.height};}
    function down(event){if(event.button!==0)return;const pos=location(event);menu.hidden=true;if(state.animationAvailable&&pos.x<28&&pos.y>height-22){toggleAnimation();return;}const target=state.objects.filter(o=>o.type==='point'&&o.asho!=='0'&&o.pin!=='1').map(o=>({object:o,p:point(o.id)})).filter(entry=>entry.p).find(entry=>{const q=xy(entry.p);return Math.hypot(q.x-pos.x,q.y-pos.y)<9;});drag={start:pos,viewport:{...state.viewport},target:target?.object};root.classList.add('dragging');canvas.setPointerCapture?.(event.pointerId);event.preventDefault();}
    function move(event){hover=location(event);if(drag){if(drag.target){const p=world(hover.x,hover.y),obj=drag.target,c=circleGeometry(byId.get(String(obj.par||'').trim().split(/\s+/)[0]));if(c&&obj.children.pton_c)obj.children.pton_c.t=String(Math.atan2(p.y-c.y,p.x-c.x));else{const paper=worldToPaper(state,p.x,p.y);obj.x=String(paper.x);obj.y=String(paper.y);if(obj.children.pton_axes){obj.children.pton_axes.x=String(p.x);obj.children.pton_axes.y=String(p.y);}}updateVariables();}else{const dx=(hover.x-drag.start.x)/width*(drag.viewport.xmax-drag.viewport.xmin),dy=(hover.y-drag.start.y)/height*(drag.viewport.ymax-drag.viewport.ymin);state.viewport={xmin:drag.viewport.xmin-dx,xmax:drag.viewport.xmax-dx,ymin:drag.viewport.ymin+dy,ymax:drag.viewport.ymax+dy};}schedule();}else if(trace)schedule();}
    function up(){drag=null;root.classList.remove('dragging');}
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('contextmenu',openMenu);
    canvas.addEventListener('wheel',event=>{event.preventDefault();const pos=location(event);setViewport(zoomViewport(state.viewport,Math.exp(Math.max(-1,Math.min(1,event.deltaY*.0015))),pos.x/width,pos.y/height));},{passive:false});
    root.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.hidden=true;return;}if(event.target!==root&&event.target!==canvas)return;if(['+','=','-'].includes(event.key)){event.preventDefault();setViewport(zoomViewport(state.viewport,event.key==='-'?1.25:.8));}});
    const variablesChanged=event=>{if(!event.detail?.file||event.detail.file===item?.file)schedule();};
    globalThis.addEventListener?.('tns-document-variables-change',variablesChanged);
    const observer=new ResizeObserver(()=>resize());observer.observe(host);renderControls();resize();
    if(options.statusHost)options.statusHost.append(status);
    return {dispose(){disposed=true;cancelAnimationFrame(animation);observer.disconnect();globalThis.removeEventListener?.('tns-document-variables-change',variablesChanged);root.remove();controls?.remove();status.remove();},resize,getState,setViewport,reset,square,toggleAnimation,root,canvas,controls,status,draw};
  }
  function open(item,options={}) {
    const labels=language(),backdrop=options.createBackdrop?.('modal-backdrop')||document.createElement('div');backdrop.classList.add('modal-backdrop');
    const modal=document.createElement('div');modal.className='modal widget-preview-modal graph-preview-modal';
    const title=document.createElement('h2');title.textContent=labels.title;const intro=document.createElement('p');intro.className='muted-text';intro.textContent=labels.intro;
    const top=document.createElement('div');top.className='modal-top-actions';const close=button(labels.close,()=>{view.dispose();options.onClose?.();if(options.closeBackdrop)options.closeBackdrop(backdrop);else backdrop.remove();});close.setAttribute('data-widget-close','');top.append(close);
    const stage=document.createElement('div');stage.className='widget-preview-calculator';const chrome=document.createElement('div');chrome.className='graph-preview-chrome';const content=document.createElement('div');content.className='ti-graph-viewport';stage.append(chrome,content);
    const controls=document.createElement('div');controls.className='preview-controls';const actions=document.createElement('div');actions.className='modal-actions';
    const status=document.createElement('div');status.className='ti-graph-status-holder';actions.append(status);
    modal.append(title,intro,top,controls,stage,actions);backdrop.append(modal);if(!backdrop.isConnected)document.body.append(backdrop);
    const view=mount(content,item,{...options,controlsHost:controls,statusHost:status});
    if(options.onSave){const save=button(labels.save,async()=>{save.disabled=true;try{await options.onSave(view.getState());}catch(error){view.status.textContent=error.message;view.status.hidden=false;}finally{save.disabled=false;}},'green-tool-button');actions.prepend(save);}
    if(options.mountWindow)options.mountWindow(backdrop);else{globalThis.TnsDocumentPreviewNavigation?.mountChrome(chrome,{title:options.documentName||'documento',onClose:()=>close.click()});globalThis.TnsPreviewWindow?.mount(backdrop,options);}
    const cleanup=backdrop.__previewWindowCleanup;backdrop.__previewWindowCleanup=()=>{view.dispose();cleanup?.();};
    const previousCleanup=backdrop.__previewWindowCleanup;
    backdrop.__previewWindowCleanup=()=>{view.dispose();previousCleanup?.();};
    return {backdrop,view,dispose:()=>close.click()};
  }
  globalThis.TnsGraphPreview=Object.freeze({parseXml,paperToWorld,worldToPaper,zoomViewport,expandFormula,sampleCurve,geometry,mount,open});
})();
