import {validateProject} from './model.js?v=20261128-source-reconstruction-v53';
import {compileExpression as expr,luaString as q,luaValue} from './expressions.js?v=20261128-source-reconstruction-v53';
import {graphToActions} from './logic.js?v=20261128-source-reconstruction-v53';
import {runtimeLua} from './runtime.js?v=20261128-source-reconstruction-v53';
import {migrateProject,projectDiagnostics} from './semantics.js?v=20261128-source-reconstruction-v53';
import {generateImportedLua} from './importer.js?v=20261128-source-reconstruction-v53';
export function generateLua(project,{metadata=true,debug=false}={}) {
  if(project.imported)return generateImportedLua(project,{metadata});
  project=migrateProject(project);
  const errors=validateProject(project);if(errors.length)throw Error(errors.join('\n'));
  const refs=projectDiagnostics(project).filter(d=>d.severity==='error');if(refs.length)throw Error(refs.map(d=>d.key+' / '+(d.node||'')+': '+d.message).join('\n'));
  const definitions=[],handlers=[];
  function actions(list,depth=0){
    if(depth>12)throw Error('Actions nested too deeply');if(!Array.isArray(list)||list.length>200)throw Error('Invalid action list');
    return '{'+list.map(a=>{
      const e=()=>expr(a.expression??'0'),target=q(a.target||'');let code;
      switch(a.type){
        case 'setText':{const decimals=Number(a.decimals??-1);if(!Number.isInteger(decimals)||decimals < -1||decimals > 12)throw Error('Decimals must be an integer from -1 to 12');code=`VB.setText(${target}, VB.format(${e()},${decimals},${q(a.prefix||'')},${q(a.suffix||'')}))`;break;}
        case 'setValue':code=`VB.setValue(${target},${e()})`;break;
        case 'show':case 'hide':code=`VB.setVisible(${target},${a.type==='show'})`;break;
        case 'setColor':if(!/^#[a-f0-9]{6}$/i.test(a.color||''))throw Error('Invalid action color');code=`VB.get(${target}).color=${q(a.color)}`;break;
        case 'setVariable':code=`VB.setVariable(${target},${e()},${q(a.scope||'global')})`;break;
        case 'increment':code=`VB.setVariable(${target},VB.number(VB.variable(${target}))+VB.number(${e()}),${q(a.scope||'global')})`;break;
        case 'reset':code=`VB.resetVariable(${target},${q(a.scope||'global')})`;break;
        case 'navigate':if(!project.pages.some(p=>p.id===a.page))throw Error('Navigation page missing');code=`VB.go(${q(a.page)})`;break;
        case 'back':code='VB.back()';break;case 'home':code='VB.go(VB.startPage)';break;case 'nextPage':code='VB.nextPage()';break;
        case 'validate':code=`if not VB.validate(${luaValue(a.inputs||[])}) then return false end`;break;
        case 'sequence':code=`VB.prepend(${actions(a.body||[],depth+1)})`;break;
        case 'if':code=`if ${expr(a.condition||'false')} then VB.prepend(${actions(a.yes||[],depth+1)}) else VB.prepend(${actions(a.no||[],depth+1)}) end`;break;
        case 'repeat':code=`VB.repeatActions(VB.number(${expr(a.count||a.expression||'1')}),${actions(a.body||[],depth+1)})`;break;
        case 'while':code=`VB.whileActions(function() return ${expr(a.condition||'false')} end,${actions(a.body||[],depth+1)})`;break;
        case 'delay':code=`return math.max(0.05,math.min(60,VB.number(${e()})))`;break;
        case 'listPush':code=`if type(VB.vars[${target}])~="table" then VB.vars[${target}]={} end table.insert(VB.vars[${target}],${e()})`;break;
        case 'store':code=`var.store(${target},${e()})`;break;
        case 'recall':code=`VB.vars[${target}]=var.recall(${q(a.name||a.target||'')})`;break;
        case 'cas':code=`VB.vars[${target}]=VB.cas(${e()})`;break;
        case 'custom':code=String(a.code||'-- Add Lua here');break;
        default:throw Error('Unknown action: '+a.type);
      }
      return `-- Node ${String(a.node||a.type).replace(/[\r\n]/g," ")} ${String(a.comment||"").replace(/[\r\n]/g," ")}\n{id=${q(a.node||a.type)},target=${target},stop=${debug&&!!a.breakpoint},run=function() ${code}\nend}`;
    }).join(',\n')+'}';
  }
  const eventMap=(events,scope)=>{
    for(const event of new Set([...Object.keys(events||{}),...Object.keys(project.graphs||{}).filter(k=>k.slice(0,k.lastIndexOf(':'))===scope).map(k=>k.slice(scope.length+1))])){
      const graph=project.graphs?.[scope+':'+event],list=graph?.nodes?.length?graphToActions(graph,{flows:project.flows||{}}):events?.[event]||[];
      handlers.push(`VB.handlers[${q(scope+':'+event)}]=${actions(list)}`);
    }
  };
  eventMap(project.events,'app');
  for(const p of project.pages){
    const clean={...p,initialVariables:p.variables||{},events:undefined,components:p.components.map(c=>({...c,events:undefined}))};definitions.push(`-- Page ${p.id} ${p.name.replace(/[\r\n]/g," ")}\nVB.pages[${q(p.id)}]=${luaValue(clean)}`);eventMap(p.events,p.id);
    for(const c of p.components){eventMap(c.events,p.id+':'+c.id);if(c.type==='Graph')definitions.push(`VB.plots[${q(p.id+':'+c.id)}]=function(x) return ${expr(c.expression||'0',['x'])} end`);if(c.type==='Formula')definitions.push(`VB.formulas[${q(p.id+':'+c.id)}]=function() return ${expr(c.expression||'0')} end`);}
  }
  const header=metadata?'-- @tns-visual-builder:'+encodeURIComponent(JSON.stringify(project))+'\n':'';
  return header+`-- ${project.name.replace(/[\r\n]/g,' ')} · Generated by TNS Lua Visual Builder\nplatform.apilevel = "2.0"\n`+runtimeLua+`\nVB.debug=${debug}\nVB.initial=${luaValue(project.variables)}\nVB.vars=${luaValue(project.variables)}\nVB.assets=${luaValue(project.assets||{})}\nVB.order=${luaValue(project.pages.map(p=>p.id))}\nVB.startPage=${q(project.startPage)}\nVB.current=VB.startPage\n`+definitions.join('\n')+'\n'+handlers.join('\n')+'\n'+String(project.functions||'')+'\nVB.setupFormulas()\nlocal startupEpoch=VB.epoch\nVB.emit("app:start")\nif startupEpoch==VB.epoch then VB.emit(VB.current..":show") end\n';
}
