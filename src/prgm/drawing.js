// Bounded TI-Nspire CX II graphics model. Source is parsed/evaluated by runtime.js;
// this module stores device-space drawing operations without a browser dependency.
// TI reference: https://education.ti.com/html/webhelp/EG_TINspireCode/EN/Subsystems/RG_Nspire_EN/Content/M_RefGuide/RG_DrawCommand.htm
import {fail, number, formatPrgmValue} from './math.js';

export const DRAWING_COMMANDS = Object.freeze(['clear','drawarc','drawcircle','drawline','drawpoly','drawrect','drawtext','fillarc','fillcircle','fillpoly','fillrect','paintbuffer','plotxy','setcolor','setpen','setwindow','usebuffer']);
const commands = new Set(DRAWING_COMMANDS);
export const isDrawingCommand = name => commands.has(String(name).toLowerCase());
const clone = value => structuredClone(value);
const integer = value => {
  const n=Math.round(number(value));
  if(Math.abs(n)>1e7)fail('RESOURCE_LIMIT','La coordenada de dibujo supera el límite del preview.');
  return Object.is(n,-0)?0:n;
};
function count(name,args,min,max=min){if(args.length<min||args.length>max)fail('ARGUMENT_ERROR',name+' requiere '+(min===max?min:`${min}–${max}`)+' argumentos.');}
const nonnegative=(value,name)=>{const n=integer(value);if(n<0)fail('DOMAIN_ERROR',name+' no puede ser negativo.');return n;};

export class PrgmDrawing {
  constructor(options={}) {
    this.width=318;this.height=212;this.active=false;this.buffering=false;this.revision=0;this.total=0;this.resources=0;
    this.maxOperations=Math.min(20000,Math.max(1,options.maxDrawingOperations||10000));
    this.color=[0,0,0];this.pen={thickness:1,style:1};this.window=null;this.front=[];this.back=[];
  }
  point(x,y){x=integer(x);y=integer(y);return this.window?[(x-this.window[0])*this.width/(this.window[1]-this.window[0]),this.height-(y-this.window[2])*this.height/(this.window[3]-this.window[2])]:[x,y];}
  size(w,h){w=nonnegative(w,'El ancho');h=nonnegative(h,'La altura');return this.window?[w*this.width/(this.window[1]-this.window[0]),h*this.height/(this.window[3]-this.window[2])]:[w,h];}
  add(operation) {
    if(++this.total>this.maxOperations)fail('RESOURCE_LIMIT','Se alcanzó el límite de objetos gráficos del preview.');
    this.resources+=operation.points?.length||operation.text?.length||1;
    if(this.resources>100000)fail('RESOURCE_LIMIT','Se alcanzó el límite de puntos/texto del preview gráfico.');
    this.active=true;
    const target=this.buffering?this.back:this.front;
    // A full clear replaces previous objects and bounds retained drawing memory.
    if(operation.kind==='clear'&&!operation.rect)target.length=0;
    target.push({...operation,color:[...this.color],pen:{...this.pen}});
    if(!this.buffering)this.revision++;
  }
  execute(name,args) {
    name=String(name).toLowerCase();
    if(!commands.has(name))fail('UNSUPPORTED_COMMAND','Instrucción de dibujo no soportada: '+name);
    if(name==='setcolor'){count(name,args,3);const values=args.map(integer);if(values.some(n=>n<0||n>255))fail('DOMAIN_ERROR','SetColor requiere componentes RGB entre 0 y 255.');this.color=values;return;}
    if(name==='setpen'){count(name,args,2);const [thickness,style]=args.map(integer);if(thickness<1||thickness>3||style<1||style>3)fail('DOMAIN_ERROR','SetPen requiere grosor y estilo entre 1 y 3.');this.pen={thickness,style};return;}
    if(name==='setwindow'){count(name,args,4);const values=args.map(integer);if(values.every(n=>n===0))this.window=null;else {if(values[0]>=values[1]||values[2]>=values[3])fail('DOMAIN_ERROR','SetWindow requiere xmin < xmax e ymin < ymax.');this.window=values;}return;}
    if(name==='usebuffer'){count(name,args,0);if(!this.buffering){this.back=clone(this.front);this.buffering=true;}return;}
    if(name==='paintbuffer'){count(name,args,0);this.active=true;if(this.buffering)this.front=clone(this.back);this.revision++;return;}
    if(name==='clear'){if(args.length!==0&&args.length!==4)fail('ARGUMENT_ERROR','Clear requiere cero o cuatro argumentos.');let rect=null;if(args.length){const [x,y]=this.point(args[0],args[1]),[w,h]=this.size(args[2],args[3]);rect=[x,y,w,this.window?-h:h];}this.add({kind:'clear',rect});return;}
    if(name==='drawline'){count(name,args,4);this.add({kind:'line',points:[this.point(args[0],args[1]),this.point(args[2],args[3])]});return;}
    if(name==='drawrect'||name==='fillrect'){count(name,args,4);const [x,y]=this.point(args[0],args[1]),[w,h]=this.size(args[2],args[3]);this.add({kind:'rect',rect:[x,y,w,this.window?-h:h],fill:name==='fillrect'});return;}
    if(name==='drawcircle'||name==='fillcircle'){count(name,args,3);const r=nonnegative(args[2],'El radio'),[rx,ry]=this.size(r,r);this.add({kind:'ellipse',center:this.point(args[0],args[1]),radius:[rx,ry],fill:name==='fillcircle'});return;}
    if(name==='drawarc'||name==='fillarc'){count(name,args,6);const [x,y]=this.point(args[0],args[1]),[w,h]=this.size(args[2],args[3]),start=integer(args[4]),sweep=integer(args[5]);this.add({kind:'arc',rect:[x,y,w,this.window?-h:h],start,sweep:Math.max(-360,Math.min(360,sweep)),fill:name==='fillarc'});return;}
    if(name==='drawpoly'||name==='fillpoly'){
      let pairs;
      if(args.length===2&&Array.isArray(args[0])&&Array.isArray(args[1])){const [xs,ys]=args;if(xs.length!==ys.length)fail('DIMENSION_ERROR','Las listas de DrawPoly/FillPoly deben tener la misma longitud.');pairs=xs.map((x,i)=>[x,ys[i]]);}
      else {if(args.length%2)fail('ARGUMENT_ERROR','DrawPoly/FillPoly requiere pares x,y o dos listas.');pairs=Array.from({length:args.length/2},(_,i)=>[args[2*i],args[2*i+1]]);}
      if(pairs.length<(name==='fillpoly'?3:2))fail('ARGUMENT_ERROR',name+' no tiene suficientes puntos.');
      if(pairs.length>2000)fail('RESOURCE_LIMIT','El polígono supera 2000 puntos.');
      this.add({kind:'poly',points:pairs.map(p=>this.point(...p)),fill:name==='fillpoly'});return;
    }
    if(name==='drawtext'){count(name,args,3,100);const text=args.slice(2).map(formatPrgmValue).join('\u2009');if(text.length>8192)fail('RESOURCE_LIMIT','DrawText supera el límite de texto.');this.add({kind:'text',point:this.point(args[0],args[1]),text});return;}
    if(name==='plotxy'){count(name,args,3);const shape=integer(args[2]);if(shape<1||shape>13)fail('DOMAIN_ERROR','PlotXY requiere un estilo entre 1 y 13.');this.add({kind:'point',point:this.point(args[0],args[1]),shape});}
  }
  snapshot(){return {active:this.active,width:this.width,height:this.height,buffering:this.buffering,revision:this.revision,operationCount:this.total,bufferedOperations:this.back.length,commands:clone(this.front),color:[...this.color],pen:{...this.pen},window:this.window?[...this.window]:null};}
}

// Render a snapshot on an existing CanvasRenderingContext2D. This keeps runtime
// results inspectable in CLI/API tests and uses native clipping in the browser.
export function renderPrgmGraphics(ctx,state) {
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,state.width,state.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,state.width,state.height);
  ctx.beginPath();ctx.rect(0,0,state.width,state.height);ctx.clip();
  for(const op of state.commands){
    ctx.strokeStyle=ctx.fillStyle=`rgb(${op.color.join(',')})`;ctx.lineWidth=op.pen.thickness;ctx.lineCap='butt';ctx.lineJoin='miter';ctx.setLineDash(op.pen.style===2?[1,2]:op.pen.style===3?[5,3]:[]);
    const path=()=>ctx.beginPath(),paint=()=>op.fill?ctx.fill():ctx.stroke();
    if(op.kind==='clear'){ctx.fillStyle='#fff';ctx.fillRect(...(op.rect||[0,0,state.width,state.height]));}
    else if(op.kind==='line'||op.kind==='poly'){path();ctx.moveTo(...op.points[0]);for(const point of op.points.slice(1))ctx.lineTo(...point);if(op.fill)ctx.closePath();paint();}
    else if(op.kind==='rect'){if(op.fill)ctx.fillRect(...op.rect);else ctx.strokeRect(...op.rect);}
    else if(op.kind==='ellipse'){if(op.radius.some(n=>n<=0))continue;path();ctx.ellipse(...op.center,...op.radius,0,0,Math.PI*2);paint();}
    else if(op.kind==='arc'){
      const [x,y,w,h]=op.rect;if(!w||!h||!op.sweep)continue;const cx=x+w/2,cy=y+h/2,rx=Math.abs(w/2),ry=Math.abs(h/2),direction=h<0?-1:1;
      // TI arc angles are always degrees and counter-clockwise from the right.
      const start=-direction*op.start*Math.PI/180,end=-direction*(op.start+op.sweep)*Math.PI/180;
      path();if(op.fill)ctx.moveTo(cx,cy);ctx.ellipse(cx,cy,rx,ry,0,start,end,direction*op.sweep>0);if(op.fill)ctx.closePath();paint();
    }else if(op.kind==='text'){ctx.font='12px Arial,sans-serif';ctx.textBaseline='bottom';ctx.textAlign='left';ctx.fillText(op.text,...op.point);}
    else if(op.kind==='point'){
      const [x,y]=op.point,s=op.shape;ctx.setLineDash([]);ctx.lineWidth=1;path();
      if(s===5||s===6){const d=3;if(s===5){ctx.moveTo(x-d,y-d);ctx.lineTo(x+d,y+d);ctx.moveTo(x-d,y+d);ctx.lineTo(x+d,y-d);}else{ctx.moveTo(x-d,y);ctx.lineTo(x+d,y);ctx.moveTo(x,y-d);ctx.lineTo(x,y+d);}ctx.stroke();}
      else if(s===3||s===4){s===3?ctx.fillRect(x-2,y-2,5,5):ctx.strokeRect(x-2,y-2,5,5);}
      else if(s===7)ctx.fillRect(x,y,1,1);
      else {const radius=s<3?2:s<10?2:s<12?3:4;ctx.arc(x,y,radius,0,Math.PI*2);[1,8,10,12].includes(s)?ctx.fill():ctx.stroke();}
    }
  }
  ctx.restore();
}
