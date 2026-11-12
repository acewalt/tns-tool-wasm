import {createMathSession} from './math-api.js?v=20261110-library-runtime-v37';
import {compilePrgm,createPrgmPreview} from './runtime.js?v=20261110-library-runtime-v37';
import {split,expressionTree,formatPrgmValue,PrgmError} from './math.js?v=20261110-library-runtime-v37';

const key=name=>String(name||'').trim().toLowerCase();
const clone=value=>Array.isArray(value)?value.map(clone):value;
import {captureExactTree} from './exact-format.js';
const terminal=state=>['done','error','stopped'].includes(state.status);

export function normalizeCalculatorProgram(item={}){
  const name=String(item.name||item.program_name||'').trim(),parameters=Array.isArray(item.parameters)?item.parameters.join(','):String(item.parameters||'');
  let source=String(item.source??item.code??'');
  const documentType=String(item.documentType||item.document_type||'Prgm');
  if(key(documentType)==='func'&&!/^\s*(?:Define\b[\s\S]*?=\s*)?Func\b/i.test(source))source=`Define ${name}(${parameters})=Func\nReturn ${source}\nEndFunc`;
  return {...item,name,parameters,source,documentType};
}

// Only a problem's local definitions have unqualified names. A library's public
// definitions may be addressed as library\name; its helpers and global data
// continue to belong to the source problem rather than capturing the caller.
export function createCalculatorSession(options={}){
  const math=options.mathSession||createMathSession(options),rows=(options.initialRows||[]).map(row=>({...row}));
  const localId=key(options.problemId||'local'),libraryScopes=new Map(),libraryExactScopes=new Map();
  let runtime=null,program=null,currentEntry='',committed=false,currentRegistry=null;
  function programs(){const all=typeof options.getPrograms==='function'?options.getPrograms():options.programs||[];return (all||[]).map(normalizeCalculatorProgram).filter(item=>item.name&&item.source.trim());}
  function notify(){options.onRowsChange?.(rows.map(row=>({...row})));options.onSessionChange?.(getVariables());}
  function makeRegistry(){
    const locals=programs(),libraryItems=(typeof options.getLibraryPrograms==='function'?options.getLibraryPrograms():options.libraryPrograms||locals).map(normalizeCalculatorProgram).filter(item=>item.name&&item.source.trim());
    const groups=new Map([[localId,{id:localId,items:[],globals:math.variables,exactBindings:math.context.exactBindings||(math.context.exactBindings=Object.create(null)),table:Object.create(null)}]]),records=new Map(),localNames=new Map(),aliases=new Map();
    const itemScope=item=>key(item.problemId||item.file||localId),identityFor=item=>(locals.some(local=>key(local.name)===key(item.name)&&itemScope(local)===itemScope(item))?localId:itemScope(item))+'\0'+key(item.name);
    function add(item,isLocal){
      const identity=isLocal?localId+'\0'+key(item.name):identityFor(item),id=identity.split('\0')[0];
      if(records.has(identity)){if(isLocal)localNames.set(key(item.name),records.get(identity));return;}
      let group=groups.get(id);
      if(!group){
        const supplied=options.getLibraryVariables?.(item);
        const globals=supplied&&typeof supplied==='object'?supplied:libraryScopes.get(id)||Object.create(null);libraryScopes.set(id,globals);
        if(!libraryExactScopes.has(id))libraryExactScopes.set(id,Object.create(null));group={id,items:[],globals,exactBindings:libraryExactScopes.get(id),table:Object.create(null)};groups.set(id,group);
      }
      let compiled,error;
      try{compiled=compilePrgm(item.source);compiled={...compiled,name:compiled.name||item.name,parameters:compiled.parameters.length?compiled.parameters:item.parameters.split(',').map(key).filter(Boolean)};}catch(failure){error=failure;}
      const descriptor={item,program:compiled,parameters:compiled?.parameters||item.parameters.split(',').map(key).filter(Boolean),globals:group.globals,exactBindings:group.exactBindings,functions:group.table,error};
      group.items.push(item);group.table[key(item.name)]=descriptor;records.set(identity,descriptor);if(isLocal)localNames.set(key(item.name),descriptor);
    }
    locals.forEach(item=>add(item,true));libraryItems.forEach(item=>add(item,false));
    for(const item of libraryItems){
      const descriptor=records.get(identityFor(item)),library=key(item.libraryName||options.libraryName),access=key(item.library_access||item.libraryAccess||item.visibility);
      if(library&&access==='libpub')aliases.set(library+'\\'+key(item.name),descriptor);
    }
    for(const group of groups.values())for(const [name,descriptor]of aliases)group.table[name]=descriptor;
    return {localNames,aliases,records,groups,libraryItems};
  }
  function syncLibraries(registry){for(const group of registry.groups.values())if(group.id!==localId&&group.items[0])options.onLibraryVariablesChange?.(group.items[0],Object.fromEntries(Object.entries(group.globals).map(([name,value])=>[name,clone(value)])));}
  function bind(instance,registry){
    for(const descriptor of registry.records.values())descriptor.invoke=(args,metadata)=>{if(descriptor.error)throw descriptor.error;return instance.callFunction(descriptor,args,metadata);};
  }
  function prepare(descriptor,args=[],registry=currentRegistry,argumentTrees=[]){
    const item=descriptor.item;
    const instance=createPrgmPreview(item.source,{...options.runtimeOptions,language:options.runtimeOptions?.language||options.language,name:item.name,parameters:item.parameters,args,argExpressions:argumentTrees,sharedExactBindings:descriptor.exactBindings,compiledProgram:descriptor.program,sharedVariables:descriptor.globals,sharedFunctions:descriptor.functions,angleMode:options.getAngleMode?.()||options.angleMode||'RAD',interactive:true});
    bind(instance,registry);return instance;
  }
  function runFunction(descriptor,args,registry,metadata={}){
    if(descriptor.error)throw descriptor.error;
    const instance=prepare(descriptor,args,registry,metadata.argumentTrees);let state=instance.snapshot();
    while(!terminal(state)&&state.status!=='waiting'){state=instance.run(250);if(state.keyPolling||instance.waitUntil)throw new PrgmError('FUNCTION_SIDE_EFFECT','Una Func no puede esperar entradas o tiempo dentro de una expresión.');}
    expressionOutput.push(...state.output.filter(row=>row.kind!=='return').map(row=>({...row})));
    syncLibraries(registry);
    if(state.error)throw new PrgmError(state.error.code,state.error.message,state.error.line);
    if(state.status==='waiting')throw new PrgmError('FUNCTION_SIDE_EFFECT','Una Func no puede solicitar entradas dentro de una expresión.');
    if(instance.returnValue===undefined)throw new PrgmError('MISSING_RETURN','La Func '+descriptor.item.name+'() no devolvió un valor.');
    return clone(instance.returnValue);
  }
  let expressionOutput=[];
  function refreshFunctions(registry){
    const registered=math.context.documentFunctions||(math.context.documentFunctions=new Set());for(const name of registered)delete math.context.functions[name];registered.clear();
    const available=new Map([...registry.localNames,...registry.aliases]);
    for(const [name,descriptor]of available){
      registered.add(name);math.context.functions[name]={parameters:descriptor.parameters,invoke:(args,metadata)=>{if(key(descriptor.item.documentType)!=='func')throw new PrgmError('PROGRAM_IN_EXPRESSION','Un Prgm solo puede llamarse como instrucción independiente.');return runFunction(descriptor,args,registry,metadata);}};
    }
    math.context.documentCallNames=new Set([...available.keys()]);
  }
  async function submit(input){
    if(runtime&&!terminal(runtime.snapshot()))throw new PrgmError('PROGRAM_BUSY','El programa sigue ejecutándose.');
    const text=String(input||'').trim();if(!text)return {kind:'empty'};
    const registry=currentRegistry=makeRegistry();refreshFunctions(registry);expressionOutput=[];
    const match=/^([\p{L}_][\p{L}\p{N}_]*(?:\\[\p{L}_][\p{L}\p{N}_]*)*)\s*\(([\s\S]*)\)$/u.exec(text),descriptor=match&&(registry.localNames.get(key(match[1]))||registry.aliases.get(key(match[1])));
    if(match&&match[1].includes('\\')&&!descriptor){
      const hidden=registry.libraryItems.some(item=>key(item.libraryName||options.libraryName)+'\\'+key(item.name)===key(match[1]));
      throw new PrgmError(hidden?'LIBRARY_ACCESS':'UNDEFINED_LIBRARY_FUNCTION',hidden?'Esta definición es privada de la biblioteca.':'La función de biblioteca no está disponible en este documento.');
    }
    if(descriptor&&key(descriptor.item.documentType)!=='func'){
      const argumentSources=match[2].trim()?split(match[2],','):[],argumentTrees=argumentSources.map(source=>captureExactTree(expressionTree(source),math.context.exactBindings,math.variables)),args=argumentSources.map(source=>math.expression(source));
      runtime=prepare(descriptor,args,registry,argumentTrees);
      // Argument Func calls run before the Prgm body. Keep their Disp output in
      // the same transcript instead of losing it when switching runtimes.
      for(const output of expressionOutput)runtime.append(output.text,output.kind,{...output});
      program=descriptor.item;currentEntry=text;committed=false;return {kind:'program',runtime,program,entry:text};
    }
    try{
      const result=await math.evaluateAsync(text),row={entry:text,exact:text,display:result.display,full:result.display,kind:'calculation'};
      if(expressionOutput.length)row.output=expressionOutput.map(output=>({...output}));rows.push(row);trim();notify();return {kind:'calculation',result,output:row.output||[]};
    }catch(error){rows.push({entry:text,exact:text,display:error.message,full:error.message,kind:'calculation',status:'error',...(expressionOutput.length?{output:expressionOutput.map(output=>({...output}))}:{})});trim();notify();throw error;}
  }
  function trim(){while(rows.length>200)rows.shift();}
  function finish(state=runtime?.snapshot()){
    if(!state||!terminal(state)||committed)return false;committed=true;syncLibraries(currentRegistry);
    const display=state.error?.message||({es:'Hecho',en:'Done',fr:'Terminé'})[String(options.language||'en').slice(0,2)]||'Done';
    rows.push({entry:currentEntry,exact:currentEntry,display,full:display,kind:'program',output:state.output.map(row=>({...row})),status:state.status,error:state.error?{...state.error}:null});trim();notify();return true;
  }
  function getVariables(){
    const entries=Object.entries(math.snapshot().variables).map(([name,value])=>({name,value:clone(value),type:'variable',insertion:name}));
    for(const item of math.getDefinitions?.()||[])entries.push(item);
    for(const item of programs())entries.push({name:item.name,type:item.documentType,parameters:item.parameters,insertion:`${item.name}()`,library_access:item.library_access});return entries;
  }
  currentRegistry=makeRegistry();refreshFunctions(currentRegistry);
  return {math,submit,finish,getVariables,getRows:()=>rows.map(row=>({...row})),getRuntime:()=>runtime,getProgram:()=>program,clear:()=>{rows.splice(0);notify();},format:formatPrgmValue};
}
