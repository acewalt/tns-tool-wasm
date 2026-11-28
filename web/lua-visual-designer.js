import {evaluateExpression} from '../src/lua-visual-builder/expressions.js?v=20261128-source-reconstruction-v53';
// Design-only renderer. Run mode always executes the generated Lua in its own VM.
export function mountDesigner(canvas,{project,page,selected,selection=[],zoom=1.5,grid=true,onSelect=()=>{},onSelection=()=>{},onMove=()=>{},onDrop=()=>{},onZoom,interactive=true}) {
  const ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,W=320,H=212;
  canvas.style.width=W*zoom+'px';canvas.style.height=H*zoom+'px';canvas.width=Math.round(W*zoom*dpr);canvas.height=Math.round(H*zoom*dpr);
  const rect=c=>{let x=c.x,y=c.y,parent=c.parent,seen=new Set([c.id]);while(parent){const p=page.components.find(c=>c.id===parent);if(!p||seen.has(parent))break;seen.add(parent);x+=p.x;y+=p.y;parent=p.parent;}return{x,y,w:c.w,h:c.h};};
  const visible=c=>{if(c.editorVisible===false)return false;const p=page.components.find(p=>p.id===c.parent);return p?visible(p):true;};
  function paint(){
    ctx.setTransform(zoom*dpr,0,0,zoom*dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle=page.background;ctx.fillRect(0,0,W,H);if(page.captureThumbnail){const img=new Image();img.onload=()=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(img,0,0,canvas.width,canvas.height);ctx.restore();};img.src=page.captureThumbnail;return;}
    for(const c of page.components){if(!visible(c))continue;ctx.save();if(c.visible===false)ctx.globalAlpha=.4;let parent=c.parent;while(parent){const p=page.components.find(p=>p.id===parent);if(!p)break;const r=rect(p);ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();parent=p.parent;}
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
    for(const c of page.components.filter(c=>selection.includes(c.id)||c.id===selected)){ const r=rect(c);ctx.strokeStyle='#148dff';ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.strokeRect(r.x-1,r.y-1,r.w+2,r.h+2);ctx.setLineDash([]);ctx.fillStyle='#fff';for(const [x,y]of [[r.x,r.y],[r.x+r.w/2,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h/2],[r.x+r.w,r.y+r.h/2],[r.x,r.y+r.h],[r.x+r.w/2,r.y+r.h],[r.x+r.w,r.y+r.h]]){ctx.fillRect(x-2,y-2,4,4);ctx.strokeRect(x-2,y-2,4,4);}}
  }
  const point=e=>{const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H};};
  let drag,guide,pan,boxSelection;
  const selectedIds=()=>new Set([...selection,selected].filter(Boolean));
  const hit=p=>[...page.components].reverse().find(c=>{const r=rect(c);return visible(c)&&p.x>=r.x&&p.y>=r.y&&p.x<=r.x+r.w&&p.y<=r.y+r.h;});
  const select=ids=>{selection=ids;selected=ids.at(-1)||null;onSelection(ids);onSelect(selected,false);};
  if(!interactive){paint();return {paint,rect};}
  canvas.onpointerdown=e=>{
    if(e.button===1){const viewport=canvas.closest('.lvb-design');pan={viewport,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}
    if(e.button!==0)return;e.preventDefault();canvas.focus();const p=point(e);let c=page.components.find(c=>c.id===selected),handle='';
    if(c&&!c.locked&&(!c.sourceBinding||['fillRect','drawRect'].includes(c.sourceBinding.method)&&c.sourceBinding.args.slice(0,4).every(a=>a?.literal||a?.offset))){const r=rect(c);for(const [hx,hy,name]of [[0,0,'nw'],[.5,0,'n'],[1,0,'ne'],[0,.5,'w'],[1,.5,'e'],[0,1,'sw'],[.5,1,'s'],[1,1,'se']])if(Math.abs(p.x-r.x-r.w*hx)<5&&Math.abs(p.y-r.y-r.h*hy)<5)handle=name;}
    if(!handle)c=hit(p);
    if(c){if(e.shiftKey)select(selectedIds().has(c.id)?[...selectedIds()].filter(id=>id!==c.id):[...selectedIds(),c.id]);else if(!selectedIds().has(c.id))select([c.id]);
      if(!c.locked&&(!c.sourceBinding||(c.sourceBinding.method==='drawString'?c.sourceBinding.args.slice(1,3):c.sourceBinding.method==='drawLine'?[]:c.sourceBinding.args.slice(0,2)).length===2&&(c.sourceBinding.method==='drawString'?c.sourceBinding.args.slice(1,3):c.sourceBinding.args.slice(0,2)).every(a=>a?.literal||a?.offset)))drag={id:c.id,origin:p,handle,items:page.components.filter(c=>selectedIds().has(c.id)&&!c.locked).map(c=>({c,start:{x:c.x,y:c.y,w:c.w,h:c.h}}))};
    }else{select(e.shiftKey?[...selectedIds()]:[]);boxSelection={origin:p,end:p,base:[...selection]};}canvas.setPointerCapture(e.pointerId);paint();
  };
  canvas.onpointermove=e=>{
    if(pan){pan.viewport.scrollLeft=pan.left+pan.x-e.clientX;pan.viewport.scrollTop=pan.top+pan.y-e.clientY;return;}
    const p=point(e);if(boxSelection){boxSelection.end=p;paint();ctx.strokeStyle='#148dff';ctx.fillStyle='#148dff22';ctx.fillRect(boxSelection.origin.x,boxSelection.origin.y,p.x-boxSelection.origin.x,p.y-boxSelection.origin.y);ctx.strokeRect(boxSelection.origin.x,boxSelection.origin.y,p.x-boxSelection.origin.x,p.y-boxSelection.origin.y);return;}
    if(!drag)return;const dx=p.x-drag.origin.x,dy=p.y-drag.origin.y,snap=n=>grid?Math.round(n/4)*4:Math.round(n);guide=null;if(Math.abs(dx)+Math.abs(dy)>.5)drag.changed=true;
    for(const {c,start}of drag.items){if(drag.handle){if(drag.handle.includes('e'))c.w=Math.max(8,snap(start.w+dx));if(drag.handle.includes('s'))c.h=Math.max(8,snap(start.h+dy));if(drag.handle.includes('w')){c.w=Math.max(8,snap(start.w-dx));c.x=start.x+start.w-c.w;}if(drag.handle.includes('n')){c.h=Math.max(8,snap(start.h-dy));c.y=start.y+start.h-c.h;}}
      else{c.x=snap(start.x+dx);c.y=snap(start.y+dy);if(drag.items.length===1)for(const other of page.components.filter(o=>o!==c&&o.parent===c.parent)){for(const edge of [0,.5,1]){const xx=other.x+other.w*edge,yy=other.y+other.h*edge;if(Math.abs(c.x+c.w*edge-xx)<3){c.x=xx-c.w*edge;guide={axis:'x',v:rect(other).x+other.w*edge};}if(Math.abs(c.y+c.h*edge-yy)<3){c.y=yy-c.h*edge;guide={axis:'y',v:rect(other).y+other.h*edge};}}}}}
    paint();if(guide){ctx.strokeStyle='#db3686';ctx.beginPath();ctx.moveTo(guide.axis==='x'?guide.v:0,guide.axis==='y'?guide.v:0);ctx.lineTo(guide.axis==='x'?guide.v:W,guide.axis==='y'?guide.v:H);ctx.stroke();}
  };
  canvas.onpointerup=()=>{if(boxSelection){const a=boxSelection.origin,b=boxSelection.end;select([...new Set([...boxSelection.base,...page.components.filter(c=>{const r=rect(c);return visible(c)&&r.x>=Math.min(a.x,b.x)&&r.y>=Math.min(a.y,b.y)&&r.x+r.w<=Math.max(a.x,b.x)&&r.y+r.h<=Math.max(a.y,b.y);}).map(c=>c.id)])]);boxSelection=null;paint();}if(drag){const changed=drag.changed;drag=null;if(changed)onMove();}pan=null;};canvas.onpointercancel=canvas.onpointerup;
  canvas.ondblclick=e=>{
    const c=hit(point(e));if(!c||c.locked||(c.sourceBinding&&!c.sourceBinding.args[0]?.literal)||!['Label','Button','Input','Checkbox','Radio'].includes(c.type))return;select([c.id]);
    document.querySelector('.lvb-inline-editor')?.blur();const r=rect(c),input=document.createElement('textarea'),property=c.type==='Input'?'value':'text';input.className='lvb-inline-editor';input.value=c[property];input.setAttribute('aria-label',c.text||c.id);let done=false,inlineKeys;const observer=new ResizeObserver(()=>position());
    // Use the actual canvas rectangle, including ancestor transforms and scroll.
    // A body portal avoids a transformed/scrolling parent becoming the containing
    // block. The visible text uses the same metrics as the canvas renderer.
    const position=()=>{ctx.font=`${c.bold?'bold ':''}${c.font}px Arial`;if(!canvas.isConnected){finish(false);return;}const b=canvas.getBoundingClientRect(),sx=b.width/W,sy=b.height/H,indent=['Checkbox','Radio'].includes(c.type)?ctx.measureText('    ').width:0;
      Object.assign(input.style,{position:'fixed',left:b.left+(r.x+indent)*sx+'px',top:b.top+r.y*sy+'px',width:Math.max(1,r.w-indent)*sx+'px',height:r.h*sy+'px',minWidth:'0',minHeight:'0',maxWidth:'none',maxHeight:'none',margin:'0',boxSizing:'border-box',border:'0',borderRadius:'0',padding:`${(c.type==='Button'?Math.max(1,(r.h-c.font)/2):3)*sy}px ${4*sx}px 0`,fontFamily:'Arial',fontSize:c.font*sy+'px',fontWeight:c.bold?'bold':'normal',lineHeight:(c.font+3)*sy+'px',textAlign:c.type==='Button'?'center':'left',color:c.foreground,background:c.color,resize:'none',overflow:'auto',zIndex:'2147483000',outline:'1px solid #148dff',transform:'none'});
    };
    const finish=save=>{if(done)return;done=true;observer.disconnect();window.removeEventListener('keydown',inlineKeys,true);window.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);if(save)c[property]=input.value;input.remove();paint();if(save)onMove();};
    document.body.append(input);position();observer.observe(canvas);window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
    // Keep calculator/editor shortcuts from consuming Enter while editing a label.
    inlineKeys=e=>{if(e.target!==input)return;e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();finish(false);}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finish(true);}};
    window.addEventListener('keydown',inlineKeys,true);input.onblur=()=>finish(true);input.focus();input.select();
  };
  canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();for(const c of page.components.filter(c=>selectedIds().has(c.id)&&!c.locked&&!c.sourceBinding)){const step=e.shiftKey?10:1;c.x+=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;c.y+=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;}onMove();};
  canvas.onwheel=e=>{if(onZoom){e.preventDefault();onZoom(Math.max(.25,Math.min(4,zoom*(e.deltaY>0?.9:1.1))));}};
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

// Template gallery and Navigation use the exact same model renderer as Design.
export function renderPageThumbnail(canvas,project,page,zoom=.6){return mountDesigner(canvas,{project,page,selected:null,zoom,grid:false,interactive:false});}
