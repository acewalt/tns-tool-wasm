// One transient interaction per graph. Menu selection deliberately owns no pointer.
export const GraphState = Object.freeze(Object.fromEntries([
  'IDLE','DRAGGING_WIRE','CHOOSING_NODE','PLACING_NODE','DRAGGING_NODE',
  'RECONNECTING_WIRE','PANNING','BOX_SELECTION'
].map(s => [s,s])));
export function createGraphInteraction({capture=()=>{},release=()=>{},onState=()=>{}}={}) {
  let state=GraphState.IDLE, data=null, pointer=null;
  function endCapture(){const id=pointer;pointer=null;if(id!=null)release(id);}
  function transition(next,value=null,id=null){
    if(!GraphState[next])throw Error('Unknown graph interaction: '+next);
    state=next;data=value;
    if(pointer!==id)endCapture();
    if(id!=null&&pointer==null){pointer=id;capture(id);}
    onState(state,data);return data;
  }
  return {get state(){return state;},get data(){return data;},get pointer(){return pointer;},
    is(...states){return states.includes(state);},transition,
    cancel(){transition(GraphState.IDLE);},
    lost(id){if(pointer===id){pointer=null;transition(GraphState.IDLE);return true;}return false;}
  };
}
export function freeNodePosition(rect,obstacles,{gap=24,allowOverlap=false}={}){
  const hit=(a,b)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
  if(allowOverlap||!obstacles.some(r=>hit(rect,r)))return{x:Math.round(rect.x),y:Math.round(rect.y)};
  const candidates=obstacles.flatMap(r=>[
    {x:r.x+r.w+gap,y:rect.y},{x:rect.x,y:r.y+r.h+gap},
    {x:r.x+r.w+gap,y:r.y+r.h+gap}
  ]).sort((a,b)=>Math.hypot(a.x-rect.x,a.y-rect.y)-Math.hypot(b.x-rect.x,b.y-rect.y));
  for(const p of candidates)if(!obstacles.some(r=>hit({...rect,...p},r)))return{x:Math.round(p.x),y:Math.round(p.y)};
  return{x:Math.round(rect.x),y:Math.round(Math.max(rect.y,...obstacles.map(r=>r.y+r.h))+gap)};
}
export function menuPosition(point,viewport,size){return{
  x:Math.max(6,Math.min(point.x,viewport.w-size.w-6)),
  y:Math.max(6,Math.min(point.y,viewport.h-size.h-6))
};}
