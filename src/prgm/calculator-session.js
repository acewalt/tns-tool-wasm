import {createMathSession} from './math-api.js?v=20261106-program-editor-v35';
import {compilePrgm,createPrgmPreview} from './runtime.js?v=20261105-sonar-runtime-v32';
import {split,formatPrgmValue,PrgmError} from './math.js?v=20261105-sonar-math-v32';

const key=name=>String(name||'').trim().toLowerCase();
const clone=value=>Array.isArray(value)?value.map(clone):value;
const terminal=state=>['done','error','stopped'].includes(state.status);

export function normalizeCalculatorProgram(item={}){
  const name=String(item.name||item.program_name||'').trim(),parameters=Array.isArray(item.parameters)?item.parameters.join(','):String(item.parameters||'');
  let source=String(item.source??item.code??'');
  const documentType=String(item.documentType||item.document_type||'Prgm');
  if(key(documentType)==='func'&&!/^\s*(?:Define\b[\s\S]*?=\s*)?Func\b/i.test(source))source=`Define ${name}(${parameters})=Func\nReturn ${source}\nEndFunc`;
  return {...item,name,parameters,source,documentType};
}

// One problem's Calculator and program execution share values, while Local and
// arguments remain inside the runtime's private scope. Merely opening this
// session never executes a program or replays saved Calculator entries.
export function createCalculatorSession(options={}){
  const math=options.mathSession||createMathSession(options),rows=(options.initialRows||[]).map(row=>({...row}));
  let runtime=null,program=null,currentEntry='',committed=false;
  function programs(){const all=typeof options.getPrograms==='function'?options.getPrograms():options.programs||[];return (all||[]).map(normalizeCalculatorProgram).filter(item=>item.name&&item.source.trim());}
  function notify(){options.onRowsChange?.(rows.map(row=>({...row})));options.onSessionChange?.(getVariables());}
  function descriptors(instance){
    for(const item of programs()){
      let compiled;try{compiled=compilePrgm(item.source);}catch(_){continue;}
      const parameters=compiled.parameters.length?compiled.parameters:item.parameters.split(',').map(key).filter(Boolean);
      compiled={...compiled,name:compiled.name||item.name,parameters};
      const descriptor={program:compiled,parameters};descriptor.invoke=args=>instance.callFunction(descriptor,args);
      instance.sharedFunctions[key(item.name)]=descriptor;
    }
  }
  function prepare(item,args=[]){
    const instance=createPrgmPreview(item.source,{...options.runtimeOptions,name:item.name,parameters:item.parameters,args,angleMode:options.getAngleMode?.()||options.angleMode||'RAD',interactive:true});
    Object.assign(instance.globals,Object.fromEntries(Object.entries(math.variables).map(([name,value])=>[name,clone(value)])));descriptors(instance);return instance;
  }
  function commitValues(instance){
    for(const name of Object.keys(math.variables))delete math.variables[name];
    for(const [name,value]of Object.entries(instance.globals))math.variables[name]=clone(value);
  }
  function refreshFunctions(){
    const registered=math.context.documentFunctions||(math.context.documentFunctions=new Set());for(const name of registered)delete math.context.functions[name];registered.clear();for(const item of programs())if(key(item.documentType)==='func')registered.add(key(item.name));
    for(const item of programs())if(key(item.documentType)==='func')math.context.functions[key(item.name)]={parameters:(/^\s*Define\s+(?:(?:LibPub|LibPriv)\s+)?[^\s(]+\(([^)]*)\)/iu.exec(item.source)?.[1]||item.parameters).split(',').map(key).filter(Boolean),invoke:args=>{
      const instance=prepare(item,args);let state=instance.snapshot();
      while(!terminal(state)&&state.status!=='waiting'){state=instance.run(250);if(state.keyPolling||instance.waitUntil)throw new PrgmError('FUNCTION_SIDE_EFFECT','Una Func no puede esperar entradas o tiempo dentro de una expresión.');}
      if(state.error)throw new PrgmError(state.error.code,state.error.message,state.error.line);
      if(state.status==='waiting')throw new PrgmError('FUNCTION_SIDE_EFFECT','Una Func no puede solicitar entradas dentro de una expresión.');
      if(instance.returnValue===undefined)throw new PrgmError('MISSING_RETURN','La Func '+item.name+'() no devolvió un valor.');
      commitValues(instance);return clone(instance.returnValue);
    }};
  }
  async function submit(input){
    if(runtime&&!terminal(runtime.snapshot()))throw new PrgmError('PROGRAM_BUSY','El programa sigue ejecutándose.');
    const text=String(input||'').trim();if(!text)return {kind:'empty'};
    const match=/^([\p{L}_][\p{L}\p{N}_]*)\s*\(([\s\S]*)\)$/u.exec(text),item=match&&programs().find(item=>key(item.name)===key(match[1]));
    refreshFunctions();
    if(item){
      const args=match[2].trim()?split(match[2],',').map(value=>math.expression(value)):[];
      runtime=prepare(item,args);program=item;currentEntry=text;committed=false;return {kind:'program',runtime,program:item,entry:text};
    }
    try{const result=await math.evaluateAsync(text);rows.push({entry:text,exact:text,display:result.display,full:result.display,kind:'calculation'});trim();notify();return {kind:'calculation',result};}
    catch(error){rows.push({entry:text,exact:text,display:error.message,full:error.message,kind:'calculation',status:'error'});trim();notify();throw error;}
  }
  function trim(){while(rows.length>200)rows.shift();}
  function finish(state=runtime?.snapshot()){
    if(!state||!terminal(state)||committed)return false;committed=true;commitValues(runtime);
    const display=state.error?.message||state.output.map(row=>row.text).join('\n');
    rows.push({entry:currentEntry,exact:currentEntry,display,full:display,kind:'program',output:state.output.map(row=>({...row})),status:state.status,error:state.error?{...state.error}:null});trim();notify();return true;
  }
  function getVariables(){
    const values={...math.snapshot().variables,...(runtime&&!terminal(runtime.snapshot())?runtime.globals:{})};
    const entries=Object.entries(values).map(([name,value])=>({name,value:clone(value),type:'variable',insertion:name}));
    for(const item of math.getDefinitions?.()||[])entries.push(item);
    for(const item of programs())entries.push({name:item.name,type:item.documentType,parameters:item.parameters,insertion:`${item.name}()`});return entries;
  }
  refreshFunctions();
  return {math,submit,finish,getVariables,getRows:()=>rows.map(row=>({...row})),getRuntime:()=>runtime,getProgram:()=>program,clear:()=>{rows.splice(0);notify();},format:formatPrgmValue};
}
