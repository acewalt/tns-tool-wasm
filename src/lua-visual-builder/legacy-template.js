import {createProject,page,component} from './model.js?v=20261128-source-reconstruction-v53';
import {setEventActions} from './semantics.js?v=20261128-source-reconstruction-v53';
import {parseExpression,luaString as q} from './expressions.js?v=20261128-source-reconstruction-v53';
import {luaName,luaData,astChildren,paintEvidence,sourceOf} from './semantic-ir.js?v=20261128-source-reconstruction-v53';

const fields=n=>Object.fromEntries(n.fields.filter(f=>f.type==='TableKeyString').map(f=>[f.key.name,f.value]));
const luaify=v=>Array.isArray(v)?Object.fromEntries(v.map((v,i)=>[i+1,luaify(v)])):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,luaify(v)])):v;
const all=n=>[n,...astChildren(n).flatMap(all)];
const ident=s=>/^[A-Za-z_]\w*$/.test(s||'');
// This adapter recognizes the repository's original addPage/fields/actions
// generator, rather than guessing that arbitrary rectangles are functional UI.
// Every conversion carries the original and a separate pending-behavior report.
export function reconstructLegacyTemplate(source,analysis,filename){
 const names=new Set(analysis.ir.functions.map(f=>f.name));
 if(!['addPage','goToPage','goHome','goBack','goNext','getVar','setVar'].every(n=>names.has(n))||!analysis.pages.length)return null;
 if(analysis.pages.length>50)return null;
 const p=createProject(filename.replace(/\.lua$/i,'')),pending=[],mappings=[],convertedFunctions=new Set();p.pages=[];
 const data=analysis.pages.map((node,i)=>{const f=fields(node),obj={};for(const[k,v]of Object.entries(f))try{obj[k]=v.type==='FunctionDeclaration'?{$fn:v,env:{}}:luaify(luaData(v));}catch{pending.push({line:v.loc.start.line,reason:'Dynamic page field: '+k});}const pg=page(typeof obj.name==='string'?obj.name:'Page '+(i+1));pg.id='legacy_page_'+(i+1);p.pages.push(pg);return{node,f,obj,pg,index:i};});p.startPage=p.pages[0].id;
 const branch=(fn,kind)=>all(fn||{}).find(n=>n.type==='IfClause'&&n.condition&&sourceOf(source,n.condition).includes('button.id')&&sourceOf(source,n.condition).includes('\"'+kind+'\"'));
 const event=(pg,owner,ev,actions)=>setEventActions(p,pg.id+(owner?':'+owner:'')+':'+ev,actions);
 const navigate=index=>p.pages[index-1]?{type:'navigate',page:p.pages[index-1].id}:null;
 const route=(fn,context)=>{if(!fn)return[];const actions=[];for(const call of all(fn).filter(n=>n.type==='CallExpression')){const name=luaName(call.base);if(name==='goBack')actions.push({type:'back'});if(name==='goHome')actions.push({type:'home'});if(name==='goNext')actions.push({type:'nextPage'});if(name==='goToPage')try{const target=navigate(luaData(call.arguments[0]));if(target)actions.push(target);else throw Error();}catch{if(context?.target)actions.push(navigate(context.target)||{type:'nextPage'});else pending.push({line:call.loc.start.line,reason:'Dynamic navigation destination requires review.'});}}return actions;};
 for(const item of data){const {node,f,obj,pg}=item;const evidence=f.paint?paintEvidence(f.paint,obj,source):{draws:[],inputs:[],issues:[]};pending.push(...evidence.issues);
  const add=(type,x,y,props={})=>{const c=Object.assign(component(type,x,y),props);c.id='legacy_'+pg.id+'_'+pg.components.length;c.semanticOrigin={line:node.loc.start.line,status:'native'};pg.components.push(c);return c;};
  const isForm=!!f.fields&&!!f.drawInput&&!!f.actions&&!!f.buttons;
  const isMenu=!!f.items&&!!f.targets;
  for(const [key,fn]of Object.entries(f))if(fn.type==='FunctionDeclaration'&&!['paint','drawButton','drawInput','drawMultiline','activateButton','enterKey','escapeKey','arrowKey','charIn','backspaceKey','mouseDown'].includes(key))pending.push({line:fn.loc.start.line,reason:'Custom page callback retained in original source; not integrated: '+key});
  if(f.visible)pending.push({line:f.visible.loc.start.line,reason:'Popup visibility and dismissal require review.'});
  const buttonRects=[];
  if(isForm){for(const b of Object.values(obj.buttons||{}))buttonRects.push({x:b.x,y:b.y,w:b.w,h:24,text:b.text,kind:b.id});}
  else if(!isMenu){for(const d of evidence.draws.filter(d=>d.method==='fillRect')){const [x,y,w,h]=d.args;if(w<40||w>200||h<18||h>40)continue;const label=evidence.draws.find(v=>v.method==='drawString'&&v.args[1]>=x&&v.args[1]<=x+w&&v.args[2]>=y&&v.args[2]<=y+h);if(label&&(f.enterKey||f.mouseDown))buttonRects.push({x,y,w,h,text:label.args[0],label,kind:'primary'});}}
  for(const d of evidence.draws){const a=d.args;if(d.method==='fillRect'&&a[0]===0&&a[1]===0&&a[2]>=320&&a[3]>=212){pg.background=d.style.color;continue;}
   if(buttonRects.some(b=>d.method==='drawString'?d===b.label||(a[0]===b.text&&a[1]>=b.x&&a[1]<=b.x+b.w&&a[2]>=b.y&&a[2]<=b.y+b.h):['fillRect','drawRect'].includes(d.method)&&Math.abs(a[0]-b.x)<3&&Math.abs(a[1]-b.y)<3&&Math.abs(a[2]-b.w)<5))continue;
   if(d.method==='drawString'){if(isMenu&&Object.values(obj.items).includes(a[0]))continue;const c=add('Label',a[1]-4,a[2]-3,{text:String(a[0]??''),w:Math.min(320,Math.max(12,String(a[0]??'').length*d.style.font*.65)),h:d.style.font+6,font:Math.max(6,Math.min(36,d.style.font)),bold:d.style.bold,foreground:d.style.color,color:pg.background});mappings.push({component:c.id,page:pg.id,line:d.line});}
   else if(['fillRect','drawRect','drawLine'].includes(d.method)){const c=add(d.method==='drawLine'?'Shape':'Panel',Math.min(a[0],d.method==='drawLine'?a[2]:a[0]),Math.min(a[1],d.method==='drawLine'?a[3]:a[1]),{w:Math.max(4,d.method==='drawLine'?Math.abs(a[2]-a[0]):a[2]),h:Math.max(4,d.method==='drawLine'?Math.abs(a[3]-a[1]):a[3]),shape:d.method==='drawLine'?'line':'rectangle',color:d.method==='fillRect'?d.style.color:pg.background,foreground:d.style.color,border:d.style.color,text:''});c.semanticOrigin.line=d.line;}
   else pending.push({line:d.line,reason:'Drawing API requires capture review: '+d.method});
  }
  if(isForm){const bound={},inputs=[];for(const field of Object.values(obj.fields||{})){const ev=evidence.inputs.find(v=>v.field===field),i=inputs.length;const c=add('Input',ev?.x??82,ev?.y??(42+i*28),{w:ev?.w??158,h:ev?.h??22,value:String(field.value||''),text:field.label||'Input'});inputs.push(c.id);if(ident(field.bind)){bound[field.bind]=c.id;p.variables[field.bind]=field.value||'';event(pg,c.id,'change',[{type:'setVariable',target:field.bind,expression:'value('+q(c.id)+')'},{type:'store',target:field.bind,expression:field.bind}]);}}
   const resultCall=all(f.paint).find(n=>n.type==='CallExpression'&&luaName(n.base)==='gc:drawString'&&luaName(n.arguments[0])==='self.resultText');
   const result=add('Label',resultCall?luaData(resultCall.arguments[1])-4:78,resultCall?luaData(resultCall.arguments[2])-3:157,{text:obj.resultText||'',w:238,h:22,color:pg.background,font:10,bold:false}),detail=add('Label',12,80,{text:'',w:296,h:80,visible:false,color:pg.background});let primary;
   for(const b of buttonRects){const c=add('Button',b.x,b.y,{w:b.w,h:b.h,text:b.text,color:'#ffffff',foreground:'#000000',font:10,bold:false});if(b.kind==='back'){event(pg,c.id,'click',route(branch(f.activateButton,'back')));continue;}if(b.kind==='details'){event(pg,c.id,'click',[{type:'show',target:detail.id}]);pending.push({line:node.loc.start.line,reason:'Details popup is an editable label; original overlay and keyboard behavior require review.'});continue;}primary=c;
    const actions=[],sourceActions=Object.values(obj.actions||{});
    for(const action of sourceActions){try{let list=[];if(action.type==='calc'&&ident(action.target)){parseExpression(action.expression);const used=Object.keys(bound).filter(k=>new RegExp('\\b'+k+'\\b').test(action.expression));if(used.length)list.push({type:'validate',inputs:used.map(k=>bound[k])});list.push({type:'setVariable',target:action.target,expression:action.expression},{type:'store',target:action.target,expression:action.target});if(!action.silent)list.push({type:'setText',target:result.id,expression:'concat('+q(action.target+'=')+','+action.target+')'});}
      else if(action.type==='set'&&ident(action.target)){list.push({type:'setVariable',target:action.target,expression:q(action.value??'')},{type:'store',target:action.target,expression:action.target},{type:'setText',target:result.id,expression:'concat('+q(action.target+'=')+','+action.target+')'});}
      else if(action.type==='goto'){const target=navigate(action.targetPage);if(!target)throw Error('Missing target page');list.push(target);}else throw Error('Unsupported visual action: '+action.type);
      // Legacy calc ignores condition unless strictCondition is true. Other
      // actions use it unless explicitly disabled. Preserve that distinction.
      if(action.condition&&action.strictCondition!==false&&(action.type!=='calc'||action.strictCondition===true)){const condition=action.condition.replace(/([^<>=~])=([^=])/g,'$1==$2');parseExpression(condition);list=[{type:'if',condition,yes:list,no:[]}];}
      if(action.details&&action.details.includes('[['))pending.push({line:f.actions.loc.start.line,reason:'Interpolated procedure text requires review.'});if(action.details)list.push({type:'setText',target:detail.id,expression:q(action.details)});actions.push(...list);
     }catch(error){pending.push({line:f.actions.loc.start.line,reason:error.message});}}
    if(!sourceActions.length)actions.push(...route({body:f.activateButton.body.filter(n=>n.type==='IfStatement').flatMap(n=>n.clauses.filter(c=>c.type==='ElseClause').flatMap(c=>c.body))}));event(pg,c.id,'click',actions);
   }
   if(primary){for(const id of inputs)event(pg,id,'enter',[{type:'custom',code:'VB.focus='+q(primary.id)+' VB.focusPage=VB.current'}]);}
   convertedFunctions.add(pg.id+':form');
  }else if(isMenu){Object.values(obj.items||{}).forEach((label,i)=>{const c=add('Button',18,42+i*24,{w:150,h:22,text:String(label),font:10,color:pg.background,foreground:'#000000'}),target=+obj.targets?.[i+1];event(pg,c.id,'click',[...(target&&navigate(target)?[navigate(target)]:route(f.enterKey))]);});pending.push({line:node.loc.start.line,reason:'Menu selection variable, keyboard and optional action sequences require review.'});convertedFunctions.add(pg.id+':menu');}
  else {for(const b of buttonRects){const c=add('Button',b.x,b.y,{w:b.w,h:b.h,text:b.text,color:evidence.draws.find(d=>d.method==='fillRect'&&d.args[0]===b.x&&d.args[1]===b.y)?.style.color||'#244d78',foreground:b.label?.style.color||'#ffffff',font:b.label?.style.font||10});event(pg,c.id,'click',route(f.enterKey));event(pg,null,'show',[{type:'custom',code:'VB.focus='+q(c.id)+' VB.focusPage=VB.current'}]);}if(buttonRects.length)convertedFunctions.add(pg.id+':start');else pending.push({line:node.loc.start.line,reason:'No verified interactive template on this page.'});}
 }
 const knownHelpers=new Set('addPage goToPage goHome goNext goBack setVar getVar prepareVisualFieldValues visualNormalizeExpression visualSubstituteVariables evalArithmeticExpression consume readNumber visualMissingVariable evalVisualExpression visualConditionOk visualReplaceVars visualActionDetails runVisualActions finish on.paint on.enterKey on.escapeKey on.arrowKey on.charIn on.backspaceKey on.mouseDown on.mouseUp'.split(' '));
 for(const f of analysis.ir.functions)if(!knownHelpers.has(f.name)&&!f.name.startsWith('callback@'))pending.push({line:f.line,reason:'Custom function retained in original source; not compiled to native events: '+f.name});
 // Unknown top-level executable code is not run alongside generated callbacks.
 for(const n of analysis.ast.body){if(n.type==='CallStatement'&&luaName(n.expression.base)==='addPage')continue;if(['FunctionDeclaration','LocalStatement','AssignmentStatement'].includes(n.type))continue;pending.push({line:n.loc.start.line,reason:'Top-level code preserved in original only: '+sourceOf(source,n).slice(0,100)});}
 p.reconstruction={version:2,strategy:'tns-tool-legacy',original:source,filename,pending,ir:analysis.ir,mappings,convertedFunctions:[...convertedFunctions],notice:'Native UI and canonical event graphs reconstructed from TNS Tool templates. See pending behavior and compare the original before export.'};
 return p;
}
