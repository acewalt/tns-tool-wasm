import {createProject,page,component,clone,validateProject} from './model.js?v=20261127-builder-v51';
import {reconstructScreen} from './capture.js?v=20261127-builder-v51';
import {availableEvents} from './presentation.js?v=20261127-builder-v51';
import {setEventActions} from './semantics.js?v=20261127-builder-v51';

// Conversion is explicit: observations remain evidence, not inferred execution.
export function reviewCapturedScreen(screen){
 const items=reconstructScreen(screen.frame),review=screen.review||{};
 return items.map(c=>{
  const saved=review[c.captureBinding.operation]||{};
  return {...c,...saved,id:'capture_'+c.captureBinding.operation,include:saved.include!==false,locked:false};
 });
}
export function editableCaptureProject(report,session){
 const p=createProject((report.filename||'Lua')+' — editable'),screenPages=new Map(),pending=[];
 const screens=session.screens.filter(s=>s.include!==false).slice(0,50);
 if(!screens.length)throw Error('Capture and select at least one screen.');
 for(const screen of screens){
  const pg=page(screen.name),all=reviewCapturedScreen(screen).filter(c=>c.include),components=[];
  for(const c of all){
   if(c.type==='Image'&&!c.asset){pending.push({screen:screen.id,operation:c.captureBinding.operation,reason:'Image resource must be imported separately.'});continue;}
   const replacement=component(c.type,c.x,c.y);Object.assign(replacement,c);replacement.locked=false;replacement.captureBinding.status='Reviewed editable copy';
   if(c.type==='Button'&&!c.text){const label=all.find(v=>v.type==='Label'&&v.x>=c.x&&v.y>=c.y&&v.x+v.w<=c.x+c.w+5&&v.y+v.h<=c.y+c.h+8);if(label){replacement.text=label.text;replacement.foreground=label.foreground;replacement.font=label.font;replacement.bold=label.bold;replacement.captureMergedOperation=label.captureBinding.operation;}}
   components.push(replacement);
  }
  const merged=new Set(components.map(c=>c.captureMergedOperation).filter(v=>v!==undefined));pg.components=components.filter(c=>!merged.has(c.captureBinding.operation));
  screenPages.set(screen.id,pg);p.pages.push(pg);
 }
 // createProject starts with an empty page. Replace it with the reviewed screens.
 p.pages=p.pages.filter(pg=>[...screenPages.values()].includes(pg));p.startPage=p.pages[0].id;
 for(const transition of session.transitions||[]){
  const from=screenPages.get(transition.from),to=screenPages.get(transition.to);if(!from||!to||from===to)continue;
  if(!transition.confirmed){pending.push({from:transition.from,to:transition.to,reason:'Unconfirmed observed transition.'});continue;}
  const event=transition.event?.type,point=transition.event?.args||[];
  const target=from.components.find(c=>c.id===transition.component)||from.components.findLast(c=>c.type==='Button'&&event==='mouseDown'&&point[0]>=c.x&&point[0]<=c.x+c.w&&point[1]>=c.y&&point[1]<=c.y+c.h);
  const kind=transition.trigger||({mouseDown:'click',enterKey:'enter'})[event];
  if(!target||!['Button','Input','Dropdown','Checkbox','Radio','Slider'].includes(target.type)||!availableEvents(target.type).includes(kind)){
   pending.push({from:transition.from,to:transition.to,reason:'Choose a reviewed component and trigger for this transition.'});continue;
  }
  const key=from.id+':'+target.id+':'+kind;
  if(p.graphs[key]){pending.push({from:transition.from,to:transition.to,reason:'Ambiguous multiple destinations for one event.'});continue;}
  setEventActions(p,key,[{type:'navigate',page:to.id}]);
 }
 p.reconstruction={version:1,original:report.source||report.original,filename:report.filename,pending,screenPages:Object.fromEntries([...screenPages].map(([id,pg])=>[id,pg.id])),sourceFunctions:clone(report.functions||[]),notice:'Appearance and confirmed transitions only. Review calculations, state, timers, resources and custom Lua before replacing the original.'};
 const errors=validateProject(p);if(errors.length)throw Error(errors.join('\n'));return p;
}
