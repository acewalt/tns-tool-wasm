import {evaluateExpression} from '../src/lua-visual-builder/expressions.js';
// Design-only renderer. Run mode always executes the generated Lua in its own VM.
export function mountDesigner(canvas,{project,page,selected,zoom=1.5,grid=true,onSelect,onMove,onDrop}) {
  const ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,W=320,H=212;
  canvas.style.width=W*zoom+'px';canvas.style.height=H*zoom+'px';canvas.width=Math.round(W*zoom*dpr);canvas.height=Math.round(H*zoom*dpr);
  const rect=c=>{let x=c.x,y=c.y,parent=c.parent,seen=new Set([c.id]);while(parent){const p=page.components.find(c=>c.id===parent);if(!p||seen.has(parent))break;seen.add(parent);x+=p.x;y+=p.y;parent=p.parent;}return{x,y,w:c.w,h:c.h};};
  const visible=c=>{if(c.visible===false)return false;const p=page.components.find(p=>p.id===c.parent);return p?visible(p):true;};
  function paint(){
    ctx.setTransform(zoom*dpr,0,0,zoom*dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=page.background;ctx.fillRect(0,0,W,H);
    for(const c of page.components){if(!visible(c))continue;ctx.save();let parent=c.parent;while(parent){const p=page.components.find(p=>p.id===parent);if(!p)break;const r=rect(p);ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();parent=p.parent;}
      const {x,y,w,h}=rect(c);ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=c.color;ctx.fillRect(x,y,w,h);ctx.strokeStyle=c.border;ctx.lineWidth=.7;
      if(!['Label','Formula'].includes(c.type))ctx.strokeRect(x+.5,y+.5,w-1,h-1);
      ctx.fillStyle=c.foreground;ctx.strokeStyle=c.foreground;ctx.font=`${c.bold?'bold ':''}${c.font}px Arial`;ctx.textBaseline='top';let text=c.text;
      if(c.type==='Input')text=c.value;
      if(c.type==='Dropdown')text=(c.value||c.options.split('\n')[0]||'')+' ▾';
      if(['Checkbox','Radio'].includes(c.type)){ctx.strokeRect(x+3,y+5,12,12);if(c.value===true||c.value==='true')ctx.fillRect(x+6,y+8,6,6);text='    '+text;}
      if(['Panel','Scroll'].includes(c.type))text='';
      if(['Slider','Progress'].includes(c.type)){const f=Math.max(0,Math.min(1,(Number(c.value)-c.min)/(c.max-c.min)));if(c.type==='Progress')ctx.fillRect(x+2,y+2,(w-4)*f,h-4);else{ctx.beginPath();ctx.moveTo(x+4,y+h/2);ctx.lineTo(x+w-4,y+h/2);ctx.stroke();ctx.fillRect(x+f*(w-8),y+3,8,h-6);}text='';}
      if(c.type==='Shape'){if(c.shape==='circle'){ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,Math.max(1,w/2-2),Math.max(1,h/2-2),0,0,Math.PI*2);ctx.fill();}else if(c.shape==='line'){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.stroke();}else ctx.fillRect(x+2,y+2,w-4,h-4);text='';}
      if(c.type==='Graph'){ctx.strokeStyle=c.border;ctx.beginPath();ctx.moveTo(x,y+h/2);ctx.lineTo(x+w,y+h/2);ctx.moveTo(x+w/2,y);ctx.lineTo(x+w/2,y+h);ctx.stroke();ctx.strokeStyle=c.foreground;ctx.beginPath();let last=false;for(let i=0;i<=Math.floor(w);i++){try{const v=evaluateExpression(c.expression,{variables:{...project.variables,...page.variables,x:i/w*20-10}}),yy=y+h/2-v*h/20;if(!last||Math.abs(yy-last)>h)ctx.moveTo(x+i,yy);else ctx.lineTo(x+i,yy);last=yy;}catch{last=false;}}ctx.stroke();text='';}
      if(c.type==='Table'){c.rows.split('\n').forEach((r,i)=>r.split(',').forEach((s,j)=>ctx.fillText(s,x+4+j*w/3,y+4+i*18)));text='';}
      if(c.type==='Image'){const a=project.assets[c.asset];if(a){let i=0;for(const run of a.runs){ctx.fillStyle=`rgb(${run[1]},${run[2]},${run[3]})`;for(let k=0;k<run[0];k++,i++)if(run[4])ctx.fillRect(x+(i%a.width)*w/a.width,y+Math.floor(i/a.width)*h/a.height,Math.ceil(w/a.width),Math.ceil(h/a.height));}}text=a?'':'▧ Image';}
      if(c.type==='Formula')text=c.expression;
      const tx=c.type==='Button'?x+Math.max(2,(w-ctx.measureText(String(text)).width)/2):x+4,ty=c.type==='Button'?y+Math.max(1,(h-c.font)/2):y+3;
      String(text??'').split('\n').forEach((s,i)=>ctx.fillText(s,tx,ty+i*(c.font+3)));ctx.restore();
    }
    if(grid){ctx.fillStyle='#71879f66';for(let x=0;x<W;x+=8)for(let y=0;y<H;y+=8)ctx.fillRect(x,y,.7,.7);}
    const c=page.components.find(c=>c.id===selected);if(c){const r=rect(c);ctx.strokeStyle='#148dff';ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.strokeRect(r.x-1,r.y-1,r.w+2,r.h+2);ctx.setLineDash([]);ctx.fillStyle='#fff';for(const [x,y]of [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]]){ctx.fillRect(x-2,y-2,4,4);ctx.strokeRect(x-2,y-2,4,4);}}
  }
  const point=e=>{const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H};};
  let drag;
  canvas.onpointerdown=e=>{
    if(e.button!==0)return;e.preventDefault();const p=point(e);let c=page.components.find(c=>c.id===selected),resize=false;
    if(c){const r=rect(c);resize=Math.abs(p.x-r.x-r.w)<6&&Math.abs(p.y-r.y-r.h)<6;}
    if(!resize)c=[...page.components].reverse().find(c=>{const r=rect(c);return visible(c)&&p.x>=r.x&&p.y>=r.y&&p.x<=r.x+r.w&&p.y<=r.y+r.h;});
    if(c){drag={id:c.id,origin:p,start:{x:c.x,y:c.y,w:c.w,h:c.h},resize};canvas.setPointerCapture(e.pointerId);onSelect(c.id,false);selected=c.id;}else{onSelect(null);selected=null;}paint();
  };
  canvas.onpointermove=e=>{if(!drag)return;const c=page.components.find(c=>c.id===drag.id),p=point(e),snap=n=>grid?Math.round(n/4)*4:Math.round(n);if(drag.resize){c.w=Math.max(8,snap(drag.start.w+p.x-drag.origin.x));c.h=Math.max(8,snap(drag.start.h+p.y-drag.origin.y));}else{c.x=snap(drag.start.x+p.x-drag.origin.x);c.y=snap(drag.start.y+p.y-drag.origin.y);}paint();};
  canvas.onpointerup=()=>{if(drag){drag=null;onMove();}};canvas.onpointercancel=canvas.onpointerup;
  canvas.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';};canvas.ondrop=e=>{e.preventDefault();const p=point(e);onDrop(e.dataTransfer.getData('application/x-tns-component'),Math.round(p.x),Math.round(p.y));};paint();return{paint,rect};
}
export async function imageAsset(file) {
  if(!file.type.startsWith('image/')||file.size>10*1024*1024)throw Error('Choose an image under 10 MB.');
  const bitmap=await createImageBitmap(file);try{
    const s=Math.min(1,96/bitmap.width,96/bitmap.height),width=Math.max(1,Math.round(bitmap.width*s)),height=Math.max(1,Math.round(bitmap.height*s));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,width,height);const data=ctx.getImageData(0,0,width,height).data,runs=[];
    for(let i=0;i<data.length;i+=4){const r=[1,data[i]>>3<<3,data[i+1]>>2<<2,data[i+2]>>3<<3,data[i+3]>128?1:0],last=runs.at(-1);if(last&&r.slice(1).every((v,j)=>v===last[j+1]))last[0]++;else runs.push(r);}
    return{width,height,runs,name:file.name};
  }finally{bitmap.close();}
}
