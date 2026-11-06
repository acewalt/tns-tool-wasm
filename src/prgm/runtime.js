// Shared, DOM-free TI-BASIC text and CX II graphics preview.
import { IDENT, key, PrgmError, fail, number, truth, split, expressionTree, evaluate, createMathContext, formatPrgmValue, evaluatePrgmExpression } from './math.js?v=20261105-sonar-math-v32';
import {PrgmDrawing, isDrawingCommand} from './drawing.js?v=20261105-sonar-runtime-v32';
export { PrgmError, formatPrgmValue, evaluatePrgmExpression } from './math.js?v=20261105-sonar-math-v32';
const routineHeader=/^Define\s+(?:(?:LibPub|LibPriv)\s+)?([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*(Prgm|Func)?$/iu;
export function compilePrgm(source) {
  const statements=[];
  for(const [index,raw] of String(source).replace(/\r\n?/g,'\n').split('\n').entries()) {
    // TI's copyright character starts a comment outside a string.
    const uncommented=split(raw,'©')[0];
    for(const text of split(uncommented,':'))if(text.trim())statements.push({text:text.trim(),line:index+1});
  }
  return compileStatements(statements);
}
function routineEnd(statements,start) {
  const scopes=[];let pending=false;
  for(let at=start;at<statements.length;at++){
    const {text,line}=statements[at],header=routineHeader.exec(text);
    if(header){if(header[3])scopes.push(key(header[3]));else pending=true;}
    else if(/^(Prgm|Func)$/i.test(text)){if(!pending)throw new PrgmError('SYNTAX_ERROR','Apertura Prgm/Func sin definición interna.',line);scopes.push(key(text));pending=false;}
    else if(/^End(Prgm|Func)$/i.test(text)){
      const expected=scopes.pop();if(expected!==key(text.slice(3)))throw new PrgmError('SYNTAX_ERROR','Cierre de subrutina incorrecto: '+text+'.',line);
      if(!scopes.length)return at;
    }
  }
  throw new PrgmError('SYNTAX_ERROR','Falta el cierre de la definición interna.',statements[start].line);
}
function compileStatements(statements) {
  const code=[], stack=[], labels=new Map(), warnings=[];let name='',parameters=[],documentKind=null,documentLine=0,documentClosed=false;
  const parsed=s=>expressionTree(s);
  const variable=s=>{s=key(s.trim());if(!IDENT.test(s))fail('UNSUPPORTED_TARGET','Destino de variable no soportado: '+s);return s;};
  const target=s=>{const node=parsed(s);if(node.type==='variable')return {name:variable(node.name)};if(node.type==='index'&&node.base.type==='variable')return {name:variable(node.base.name),indices:node.indices};fail('UNSUPPORTED_TARGET','Destino de variable no soportado: '+s);};
  for(let statementIndex=0;statementIndex<statements.length;statementIndex++) {
    const stmt=statements[statementIndex];
    try {
      const text=stmt.text;let match, op={...stmt,kind:'noop'};const i=code.length;
      if(documentClosed)fail('SYNTAX_ERROR','Hay instrucciones después del cierre del documento.');
      if((match=routineHeader.exec(text))){
        if(code.length||documentKind){
          if(documentKind==='func')fail('SYNTAX_ERROR','Una Func no puede definir subrutinas internas.');
          const end=routineEnd(statements,statementIndex),program=compileStatements(statements.slice(statementIndex,end+1));
          op.kind='defineRoutine';op.name=variable(match[1]);op.program=program;op.parameters=program.parameters;
          statementIndex=end;warnings.push(...program.warnings);
        }else{
          name=match[1];parameters=match[2].trim()?split(match[2],',').map(variable):[];
          if(new Set(parameters).size!==parameters.length)fail('ARGUMENT_ERROR','Los parámetros de la definición deben ser distintos.');
          if(match[3]){documentKind=key(match[3]);documentLine=stmt.line;}
        }
      }else if((match=/^Define\s+([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*(.+)$/iu.exec(text))){
        op.kind='defineFunction';op.name=variable(match[1]);op.parameters=match[2].trim()?split(match[2],',').map(variable):[];op.body=parsed(match[3]);
      }else if((match=/^Define\s+([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.+)$/iu.exec(text))){op.kind='assign';Object.assign(op,target(match[1]));op.expr=parsed(match[2]);
      }else if(/^(Prgm|Func)$/i.test(text)){
        if(documentKind)fail('SYNTAX_ERROR','El documento contiene una apertura Prgm/Func duplicada.');
        documentKind=key(text);documentLine=stmt.line;
      }else if(/^End(Prgm|Func)$/i.test(text)){
        const expected=documentKind==='func'?'EndFunc':'EndPrgm';
        if(!documentKind)fail('SYNTAX_ERROR',text+' no tiene una apertura Prgm/Func.');
        if(key(text)!==key(expected))fail('SYNTAX_ERROR','Se esperaba '+expected+', no '+text+'.');
        if(stack.length)fail('SYNTAX_ERROR','Bloque sin cierre: '+stack.at(-1).kind);
        documentClosed=true;op.kind='end';
      }
      else if((match=/^(Local|DelVar|Lock|Unlock)\s+(.+)$/i.exec(text))){op.kind=key(match[1]);op.names=split(match[2],',').map(variable);}
      else if((match=/^([A-Za-z]+)\b\s*(.*)$/i.exec(text))&&isDrawingCommand(match[1])){
        op.kind='drawing';op.command=key(match[1]);op.args=match[2].trim()?split(match[2],',').map(parsed):[];
      }
      else if((match=/^Wait\s+(.+)$/i.exec(text))){op.kind='wait';op.expr=parsed(match[1]);}
      else if((match=/^(DispAt|Disp|RequestStr|Request)\b\s*(.*)$/i.exec(text))){
        op.kind=key(match[1]);const args=split(match[2],',').map(s=>s.trim());
        if(op.kind.startsWith('request')){if(args.length<2||args.length>4)fail('SYNTAX_ERROR','Request requiere mensaje, variable y hasta dos opciones.');op.prompt=parsed(args[0]);op.name=variable(args[1]);op.flag=args[2]?parsed(args[2]):null;op.statusName=args[3]?variable(args[3]):null;}
        else {if(!args[0])fail('SYNTAX_ERROR','Disp requiere una expresión.');op.args=args.map(parsed);if(op.kind==='dispat'&&args.length<2)fail('SYNTAX_ERROR','DispAt requiere fila y contenido.');}
      }else if(/^ClrIO$/i.test(text)){op.kind='clear';warnings.push({code:'COMPAT_CLRIO',line:stmt.line,message:'ClrIO no es una instrucción TI-Nspire; se omite y se conserva el historial.'});}
      else if((match=/^If\s+(.+?)\s+Then$/i.exec(text))){op.kind='if';op.expr=parsed(match[1]);stack.push({kind:'if',start:i,branch:i,ends:[],hasElse:false});}
      else if((match=/^If\s+(.+)$/i.exec(text))){op.kind='ifSingle';op.expr=parsed(match[1]);}
      else if(/^Try$/i.test(text)){op.kind='try';stack.push({kind:'try',start:i,hasElse:false});}
      else if(/^Else$/i.test(text)&&stack.at(-1)?.kind==='try'){
        const block=stack.at(-1);if(block.hasElse)fail('SYNTAX_ERROR','Else duplicado en Try.');block.hasElse=true;block.branch=i;code[block.start].handler=i+1;op.kind='tryElse';op.start=block.start;
      }else if(/^EndTry$/i.test(text)){
        const block=stack.pop();if(block?.kind!=='try'||!block.hasElse)fail('SYNTAX_ERROR','Try requiere Else y EndTry.');code[block.start].end=i;code[block.branch].end=i;op.kind='endtry';op.start=block.start;
      }else if(/^(ClrErr|PassErr)$/i.test(text))op.kind=key(text);
      else if((match=/^ElseIf\s+(.+?)\s+Then$/i.exec(text))||/^Else$/i.test(text)){
        const block=stack.at(-1);if(block?.kind!=='if'||block.hasElse)fail('SYNTAX_ERROR','Else/ElseIf sin If válido.');
        code[block.branch].jump=i;op.kind=match?'elseif':'else';op.block=block.start;if(match)op.expr=parsed(match[1]);else block.hasElse=true;block.ends.push(i);block.branch=i;
      }else if(/^EndIf$/i.test(text)){
        const block=stack.pop();if(block?.kind!=='if')fail('SYNTAX_ERROR','EndIf sin If correspondiente.');op.kind='endif';op.block=block.start;code[block.start].end=i;code[block.branch].jump=i;for(const branch of block.ends)code[branch].end=i;
      }else if((match=/^While\s+(.+)$/i.exec(text))||/^Loop$/i.test(text)||/^For\s+/i.test(text)){
        op.kind=match?'while':/^Loop$/i.test(text)?'loop':'for';
        if(match)op.expr=parsed(match[1]);
        if(op.kind==='for'){const args=split(text.replace(/^For\s+/i,''),',');if(args.length<3||args.length>4)fail('SYNTAX_ERROR','For requiere variable, inicio, fin y paso opcional.');op.name=variable(args[0]);op.start=parsed(args[1]);op.limit=parsed(args[2]);op.increment=parsed(args[3]||'1');}
        stack.push({kind:op.kind,start:i});
      }else if(/^End(While|For|Loop)$/i.test(text)){
        const block=stack.pop(),kind=text.slice(3).toLowerCase();if(block?.kind!==kind)fail('SYNTAX_ERROR',text+' sin apertura correspondiente.');op.kind='endloop';op.start=block.start;code[block.start].end=i;
      }else if(/^(Exit|Cycle)$/i.test(text)){
        const loop=stack.findLast(b=>['for','while','loop'].includes(b.kind));if(!loop)fail('SYNTAX_ERROR',text+' fuera de un bucle.');op.kind=key(text);op.start=loop.start;
      }else if((match=/^Return(?:\s+(.+))?$/i.exec(text))){op.kind='return';if(match[1])op.expr=parsed(match[1]);}
      else if(/^Stop$/i.test(text))op.kind='stop';
      else if((match=/^(Lbl|Goto)\s+([\p{L}_][\p{L}\p{N}_]*)$/iu.exec(text))){op.kind=key(match[1]);op.name=key(match[2]);if(op.kind==='lbl'){if(labels.has(op.name))fail('SYNTAX_ERROR','Etiqueta duplicada: '+op.name);labels.set(op.name,i);}}
      else {
        const arrow=split(text,'→');const assignment=/^([\p{L}_][\p{L}\p{N}_]*(?:\s*\[[^\]]+\])?)\s*:=\s*(.+)$/u.exec(text);
        if(arrow.length===2){op.kind='assign';Object.assign(op,target(arrow[1]));op.expr=parsed(arrow[0]);}
        else if(assignment){op.kind='assign';Object.assign(op,target(assignment[1]));op.expr=parsed(assignment[2]);}
        else if(/^[\p{L}_][\p{L}\p{N}_]*\s*\(/u.test(text)||/^(?:\d|[([{√+−-])/.test(text)){op.kind='evaluate';op.expr=parsed(text);}
        else fail('UNSUPPORTED_COMMAND','Instrucción no soportada: '+text.slice(0,90));
      }
      code.push(op);
    }catch(error){if(error instanceof PrgmError&&!error.line)error.line=stmt.line;throw error;}
  }
  if(documentKind&&!documentClosed)throw new PrgmError('SYNTAX_ERROR','Falta '+(documentKind==='func'?'EndFunc':'EndPrgm')+' para cerrar el documento.',documentLine);
  if(stack.length)throw new PrgmError('SYNTAX_ERROR','Bloque sin cierre: '+stack.at(-1).kind,code[stack.at(-1).start].line);
  for(const op of code)if(op.kind==='goto'){if(!labels.has(op.name))throw new PrgmError('SYNTAX_ERROR','Etiqueta inexistente: '+op.name,op.line);op.jump=labels.get(op.name);}
  return {code,name,parameters,warnings,documentKind};
}
const copyValue=value=>Array.isArray(value)?value.map(copyValue):value;
// A TI routine's Local variables and arguments never capture the caller's
// Locals. Undeclared names use the shared problem namespace instead.
function namespace(shared,scope,field) {
  return new Proxy(Object.create(null),{
    get:(_,name)=>scope.names.has(name)?scope[field][name]:shared[name],
    set:(_,name,value)=>{(scope.names.has(name)?scope[field]:shared)[name]=value;return true;},
    deleteProperty:(_,name)=>{delete (scope.names.has(name)?scope[field]:shared)[name];return true;},
    ownKeys:()=>[...new Set([...Reflect.ownKeys(shared).filter(name=>!scope.names.has(name)),...Reflect.ownKeys(scope[field])])],
    getOwnPropertyDescriptor:(_,name)=>Object.hasOwn(scope.names.has(name)?scope[field]:shared,name)?{enumerable:true,configurable:true,writable:true,value:(scope.names.has(name)?scope[field]:shared)[name]}:undefined
  });
}
class KeyWait extends Error {}
export class PrgmPreview {
  constructor(source,options={}) {
    const execution=options._execution;
    this.source=String(source);this.options=options;this.angleMode=['DEG','GRAD'].includes(options.angleMode)?options.angleMode:'RAD';this.output=[];this.events=[];this.status='ready';this.pc=0;this.pending=null;this.error=null;this.lastLine=0;this.branches=new Set();this.loops=new Map();this.callStack=[];
    this.globals=execution?.globals||Object.create(null);this.sharedFunctions=execution?.sharedFunctions||Object.create(null);this.scope={names:new Set(),values:Object.create(null),functions:Object.create(null)};this.vars=namespace(this.globals,this.scope,'values');
    this.meter=execution?.meter||{executed:0,window:0};this.keyboard=execution?.keyboard||{queue:[],polling:false,waiting:false};
    this.mathContext=execution?.mathContext||createMathContext({...options,getKey:mode=>this.readKey(mode)});
    if(!execution){
      const context=this.mathContext,shared=this.sharedFunctions;
      context.functions=new Proxy(Object.create(null),{
        get:(_,name)=>{const scope=context.prgmScope;return scope?.names.has(name)?scope.functions[name]:shared[name];},
        set:(_,name,value)=>{const scope=context.prgmScope;(scope?.names.has(name)?scope.functions:shared)[name]=value;return true;},
        deleteProperty:(_,name)=>{const scope=context.prgmScope;delete (scope?.names.has(name)?scope.functions:shared)[name];return true;},
        getOwnPropertyDescriptor:(_,name)=>{const scope=context.prgmScope,target=scope?.names.has(name)?scope.functions:shared;return Object.hasOwn(target,name)?{enumerable:true,configurable:true,writable:true,value:target[name]}:undefined;}
      });
    }
    this.tries=[];this.lastCaughtError=null;this.graphics=execution?.graphics||new PrgmDrawing(options);this.waitUntil=0;this.frameYield=false;
    this.maxInstructions=Math.min(1000000,Math.max(1,options.maxInstructions||50000));this.maxLines=options.maxLines||1000;
    try {this.program=execution?.program||compilePrgm(this.source);this.name=options.name||this.program.name||'programa';
      const supplied=Array.isArray(options.parameters)?options.parameters:String(options.parameters||'').trim()?String(options.parameters).split(','):[];
      const metadata=supplied.map(name=>key(String(name).trim()));
      if(metadata.some(name=>!IDENT.test(name)))fail('ARGUMENT_ERROR','La lista de parámetros del documento no es válida.');
      if(metadata.length&&this.program.parameters.length&&JSON.stringify(metadata)!==JSON.stringify(this.program.parameters))fail('ARGUMENT_ERROR','Los parámetros del documento no coinciden con su definición.');
      const parameters=this.program.parameters.length?this.program.parameters:metadata;
      if(parameters.length&&options.args===undefined)fail('MISSING_ARGUMENTS','El preview necesita valores para los parámetros: '+parameters.join(', ')+'.');
      if(options.args!==undefined&&(!Array.isArray(options.args)||options.args.length!==parameters.length))fail('ARGUMENT_ERROR','Se esperaban '+parameters.length+' argumentos para '+this.name+'().');
      parameters.forEach((name,index)=>{
        const value=options.args[index];
        const valid=value=>typeof value==='number'?Number.isFinite(value):typeof value==='string'||typeof value==='boolean'||Array.isArray(value)&&value.every(valid);
        if(!valid(value))fail('ARGUMENT_ERROR','El argumento «'+name+'» no es un valor válido del preview.');
        this.scope.names.add(name);this.vars[name]=copyValue(value);
      });
    } catch(error){this.program={code:[],warnings:[]};this.name=options.name||'programa';this.handleError(error);}
  }
  get executed(){return this.meter.executed;}
  checkpoint(){if(this.options.interactive)this.meter.window=0;}
  readKey(mode){
    this.keyboard.polling=true;this.frameYield=true;this.checkpoint();
    const external=this.options.getKey?.(mode),value=external===undefined?this.keyboard.queue.shift():external;
    if(value!==undefined&&value!==null&&value!==''){this.keyboard.waiting=false;return String(value);}
    if(mode===1){this.keyboard.waiting=true;throw new KeyWait();}
    this.keyboard.waiting=false;return '';
  }
  sendKey(name){if(this.keyboard.queue.length<100)this.keyboard.queue.push(String(name));this.keyboard.waiting=false;this.checkpoint();return this.snapshot();}
  frame(){return {program:this.program,pc:this.pc,scope:this.scope,vars:this.vars,branches:this.branches,loops:this.loops,tries:this.tries,lastCaughtError:this.lastCaughtError};}
  restoreFrame(frame){Object.assign(this,frame);this.mathContext.prgmScope=this.scope;}
  enterRoutine(fn,args,returnPc){
    if(this.callStack.length+this.mathContext.calls>=100)fail('EXECUTION_LIMIT','Límite de llamadas de subrutina alcanzado.');
    if(args.length!==fn.parameters.length)fail('ARGUMENT_ERROR','Número de argumentos incorrecto para '+fn.program.name+'().');
    const frame=this.frame();frame.pc=returnPc;this.callStack.push(frame);
    this.program=fn.program;this.pc=0;this.branches=new Set();this.loops=new Map();this.tries=[];this.lastCaughtError=null;
    this.scope={names:new Set(fn.parameters),values:Object.create(null),functions:Object.create(null)};this.vars=namespace(this.globals,this.scope,'values');
    fn.parameters.forEach((name,index)=>this.vars[name]=copyValue(args[index]));this.mathContext.prgmScope=this.scope;
  }
  finishRoutine(value,hasValue=false){
    if(this.callStack.length){this.restoreFrame(this.callStack.pop());return this.pc;}
    if(hasValue){this.returnValue=value;if(!this.options._silentReturn)this.append(formatPrgmValue(value),'return');}
    this.status='done';return this.pc+1;
  }
  callFunction(fn,args){
    if(fn.program.documentKind!=='func')fail('PROGRAM_IN_EXPRESSION','Un Prgm solo puede llamarse como instrucción independiente.');
    const previousScope=this.mathContext.prgmScope;
    const child=new PrgmPreview('',{...this.options,name:fn.program.name,parameters:'',args,_silentReturn:true,_execution:{program:fn.program,mathContext:this.mathContext,globals:this.globals,sharedFunctions:this.sharedFunctions,meter:this.meter,keyboard:this.keyboard,graphics:this.graphics}});
    try{
      while(!['done','error','stopped','waiting'].includes(child.status)){
        child.step(false);
        if(child.waitUntil||child.keyboard.waiting)fail('FUNCTION_SIDE_EFFECT','Una Func no puede esperar entradas o tiempo dentro de una expresión.');
      }
      if(child.error)throw child.error;
      if(child.status==='waiting')fail('FUNCTION_SIDE_EFFECT','Una Func no puede solicitar entradas dentro de una expresión.');
      if(child.returnValue===undefined)fail('MISSING_RETURN','La Func '+fn.program.name+'() no devolvió un valor.');
      return copyValue(child.returnValue);
    }finally{this.mathContext.prgmScope=previousScope;}
  }
  assign(op,value){
    if(this.mathContext.locks.has(op.name))fail('LOCKED_VARIABLE','La variable «'+op.name+'» está bloqueada.');
    if(!op.indices){this.vars[op.name]=copyValue(value);return;}
    if(!Object.hasOwn(this.vars,op.name))fail('UNDEFINED_VARIABLE','La variable «'+op.name+'» no está definida.');
    const target=copyValue(this.vars[op.name]),indices=op.indices.map(node=>{const index=number(this.ev(node));if(!Number.isInteger(index)||index<1)fail('INDEX_ERROR','Los índices deben ser enteros positivos.');return index-1;});
    const matrix=Array.isArray(target)&&target.length>0&&target.every(Array.isArray);
    if(!Array.isArray(target)||indices.length<1||indices.length>(matrix?2:1))fail('INDEX_ERROR','Destino indexado no válido.');
    if(indices[0]>=target.length)fail('INDEX_ERROR','Índice fuera de rango.');
    if(matrix&&indices.length===1){const row=Array.isArray(value)&&value.length===1&&Array.isArray(value[0])?value[0]:value;if(!Array.isArray(row)||row.length!==target[0].length||row.some(Array.isArray))fail('DIMENSION_ERROR','La fila asignada debe conservar el ancho de la matriz.');target[indices[0]]=copyValue(row);}
    else if(indices.length===2){if(indices[1]>=target[0].length)fail('INDEX_ERROR','Índice fuera de rango.');if(Array.isArray(value))fail('TYPE_ERROR','Una celda de matriz requiere un valor escalar.');target[indices[0]][indices[1]]=value;}
    else target[indices[0]]=copyValue(value);
    this.vars[op.name]=target;
  }
  handleError(error) {this.error=error instanceof PrgmError?error:new PrgmError('RUNTIME_ERROR',String(error.message||error));if(!this.error.line)this.error.line=this.lastLine;this.status='error';this.pending=null;}
  ev(node) {this.mathContext.steps=0;this.mathContext.prgmScope=this.scope;const value=evaluate(node,this.vars,this.angleMode,this.mathContext);this.angleMode=this.mathContext.modes[2]===2?'DEG':this.mathContext.modes[2]===3?'GRAD':'RAD';return value;}
  append(text,kind='disp') {if(this.output.length>=this.maxLines)fail('OUTPUT_LIMIT','Límite de historial alcanzado.');const row={text:String(text),kind,line:this.lastLine};this.output.push(row);this.event({type:'output',...row});}
  event(value) {this.events.push(value);if(this.events.length>2000)this.events.shift();}
  step(emitSnapshot=true) {
    if(['waiting','done','stopped','error'].includes(this.status))return emitSnapshot?this.snapshot():undefined;
    if(this.waitUntil){if((this.options.now||Date.now)()<this.waitUntil)return emitSnapshot?this.snapshot():undefined;this.waitUntil=0;}
    if(this.pc>=this.program.code.length){this.pc=this.finishRoutine();return emitSnapshot?this.snapshot():undefined;}
    const op=this.program.code[this.pc];this.lastLine=op.line;this.status='paused';
    try {
      this.meter.executed++;if(++this.meter.window>this.maxInstructions)fail('EXECUTION_LIMIT','Se alcanzó el límite de instrucciones; posible bucle infinito.');
      this.mathContext.prgmScope=this.scope;
      let next=this.pc+1;
      if(op.kind==='local')op.names.forEach(name=>this.scope.names.add(name)); // Uninitialized Locals shadow problem variables without becoming zero.
      else if(op.kind==='delvar')op.names.forEach(n=>{if(this.mathContext.locks.has(n))fail('LOCKED_VARIABLE','La variable «'+n+'» está bloqueada.');delete this.vars[n];delete this.mathContext.functions[n];});
      else if(op.kind==='lock'||op.kind==='unlock')op.names.forEach(n=>op.kind==='lock'?this.mathContext.locks.add(n):this.mathContext.locks.delete(n));
      else if(op.kind==='assign')this.assign(op,this.ev(op.expr));
      else if(op.kind==='defineFunction')this.mathContext.functions[op.name]={parameters:op.parameters,body:op.body};
      else if(op.kind==='defineRoutine'){const fn={parameters:op.parameters,program:op.program};fn.invoke=args=>this.callFunction(fn,args);this.mathContext.functions[op.name]=fn;}
      else if(op.kind==='evaluate'){
        const fn=op.expr.type==='call'&&this.mathContext.functions[op.expr.name];
        if(fn?.program?.documentKind==='prgm'){const args=op.expr.args.map(arg=>this.ev(arg));this.enterRoutine(fn,args,next);next=0;}
        else this.ev(op.expr);
      }
      else if(op.kind==='drawing'){this.graphics.execute(op.command,op.args.map(n=>this.ev(n)));this.event({type:'graphics',command:op.command,revision:this.graphics.revision,line:op.line});if(op.command==='paintbuffer'){this.frameYield=true;this.checkpoint();}}
      else if(op.kind==='wait'){const seconds=number(this.ev(op.expr));if(seconds<0||seconds>86400)fail('DOMAIN_ERROR','Wait requiere un tiempo entre 0 y 86400 segundos.');if(!this.options.skipWait)this.waitUntil=(this.options.now||Date.now)()+seconds*1000;this.checkpoint();}
      else if(op.kind==='disp'||op.kind==='dispat') {
        const args=op.args.map(n=>this.ev(n));
        if(op.kind==='disp')this.append(args.map(formatPrgmValue).join('\u2009'));
        else {const row=number(args.shift());if(!Number.isInteger(row)||row<1||row>8)fail('DOMAIN_ERROR','DispAt requiere una fila entre 1 y 8.');while(this.output.length<row)this.append('');this.output[row-1]={text:args.map(formatPrgmValue).join('\u2009'),kind:'disp',line:op.line};}
      }else if(op.kind==='clear'){this.event({type:'compatibility',command:'ClrIO',ignored:true,line:op.line});}
      else if(op.kind==='try')this.tries.push({start:this.pc,handler:op.handler,end:op.end});
      else if(op.kind==='tryElse'){this.tries=this.tries.filter(t=>t.start!==op.start);next=op.end+1;}
      else if(op.kind==='endtry')this.tries=this.tries.filter(t=>t.start!==op.start);
      else if(op.kind==='clrerr'){this.vars.errcode=0;this.lastCaughtError=null;}
      else if(op.kind==='passerr'){if(this.lastCaughtError)throw this.lastCaughtError;fail('NO_ACTIVE_ERROR','PassErr requiere un error capturado.');}
      else if(op.kind==='request'||op.kind==='requeststr') {
        if(this.graphics.active)fail('GRAPHICS_MODE_REQUEST','Request/RequestStr no puede ejecutarse en el modo gráfico.');
        const prompt=this.ev(op.prompt);if(typeof prompt!=='string')fail('TYPE_ERROR','El mensaje Request debe ser texto.');
        this.pending={kind:op.kind,prompt,variable:op.name,display:op.flag?this.ev(op.flag)!==0:true,statusVariable:op.statusName,line:op.line};this.status='waiting';
      }else if(op.kind==='if'||op.kind==='ifSingle') {
        const yes=truth(this.ev(op.expr));if(op.kind==='ifSingle'){if(!yes){const following=this.program.code[next];next=following?.end!==undefined?following.end+1:next+1;}}
        else {if(yes)this.branches.add(this.pc);else {this.branches.delete(this.pc);next=op.jump;}}
      }else if(op.kind==='elseif'||op.kind==='else') {
        if(this.branches.has(op.block))next=op.end;
        else if(op.kind==='else'||truth(this.ev(op.expr)))this.branches.add(op.block);
        else next=op.jump;
      }else if(op.kind==='endif')this.branches.delete(op.block);
      else if(op.kind==='while'){if(!truth(this.ev(op.expr)))next=op.end+1;}
      else if(op.kind==='for') {
        let frame=this.loops.get(this.pc);
        if(!frame){frame={step:number(this.ev(op.increment)),limit:number(this.ev(op.limit))};if(frame.step===0)fail('DOMAIN_ERROR','El paso de For no puede ser cero.');this.vars[op.name]=number(this.ev(op.start));this.loops.set(this.pc,frame);}
        if(frame.step>0?this.vars[op.name]>frame.limit:this.vars[op.name]<frame.limit){this.loops.delete(this.pc);next=op.end+1;}
      }else if(op.kind==='endloop') {
        const begin=this.program.code[op.start];if(begin.kind==='for'){const frame=this.loops.get(op.start);if(!frame)fail('INVALID_CONTROL_FLOW','Goto entró en For sin ejecutar su apertura.');this.vars[begin.name]=number(this.vars[begin.name])+frame.step;}next=op.start;
      }else if(op.kind==='exit'){this.loops.delete(op.start);next=this.program.code[op.start].end+1;}
      else if(op.kind==='cycle')next=this.program.code[op.start].end;
      else if(op.kind==='goto'){
        // A jump inside a loop must retain its For counter; only scopes actually
        // exited by the jump lose their state.
        for(const start of this.loops.keys())if(!(start<op.jump&&op.jump<=this.program.code[start].end))this.loops.delete(start);
        for(const start of this.branches)if(!(start<op.jump&&op.jump<=this.program.code[start].end))this.branches.delete(start);
        this.tries=this.tries.filter(frame=>frame.start<op.jump&&op.jump<=frame.end);next=op.jump;
      }
      else if(op.kind==='return')next=this.finishRoutine(op.expr?this.ev(op.expr):undefined,Boolean(op.expr));
      else if(op.kind==='end')next=this.finishRoutine();
      else if(op.kind==='stop'){this.status='done';this.callStack.length=0;}
      this.pc=next;
      if(this.pc>=this.program.code.length&&this.status==='paused')this.pc=this.finishRoutine();
    }catch(error){
      if(error instanceof KeyWait){this.frameYield=true;return emitSnapshot?this.snapshot():undefined;}
      if(error instanceof PrgmError&&!error.line)error.line=op.line;
      let frame=this.tries.pop();
      while(!frame&&this.callStack.length){this.restoreFrame(this.callStack.pop());frame=this.tries.pop();}
      if(frame&&!['EXECUTION_LIMIT','OUTPUT_LIMIT','RESOURCE_LIMIT'].includes(error.code)){
        this.lastCaughtError=error;this.vars.errcode=({DIVISION_BY_ZERO:250,DOMAIN_ERROR:260,TYPE_ERROR:210,INDEX_ERROR:350,UNDEFINED_VARIABLE:960,UNSUPPORTED_FUNCTION:1040})[error.code]||900;
        this.pc=frame.handler;this.status='paused';this.event({type:'caughtError',code:error.code,line:this.lastLine});
      }else this.handleError(error);
    }
    return emitSnapshot?this.snapshot():undefined;
  }
  run(budget=500) {this.frameYield=false;for(let i=0;i<budget&&!['waiting','done','stopped','error'].includes(this.status);i++){if(this.waitUntil&&(this.options.now||Date.now)()<this.waitUntil)break;this.step(false);if(this.frameYield)break;}return this.snapshot();}
  answer(raw,{cancel=false}={}) {
    if(this.status!=='waiting')return this.snapshot();
    const pending=this.pending;
    // Invalid input is recoverable: keep the same dialog and program counter.
    if(!cancel){try{this.mathContext.steps=0;const value=pending.kind==='requeststr'?String(raw):evaluatePrgmExpression(String(raw),this.vars,{angleMode:this.angleMode,context:this.mathContext});this.vars[pending.variable]=value;}catch(error){return {...this.snapshot(),success:false,inputError:{code:error.code||'INPUT_ERROR',message:error.message,line:pending.line}};}}
    try {
      if(pending.statusVariable)this.vars[pending.statusVariable]=cancel?0:1;
      if(!cancel&&pending.display)this.append(pending.prompt+' '+String(raw),'input');
      this.event({type:cancel?'cancel':'answer',line:pending.line,variable:pending.variable,input:cancel?null:String(raw)});
      this.pending=null;this.status='paused';this.checkpoint();
    }catch(error){this.handleError(error);}
    return this.snapshot();
  }
  stop() {if(!['done','error'].includes(this.status))this.status='stopped';this.pending=null;return this.snapshot();}
  snapshot() {return {success:this.status!=='error',status:this.status,name:this.name,line:this.lastLine,nextLine:this.program?.code[this.pc]?.line??null,executed:this.executed,angleMode:this.angleMode,output:this.output.map(row=>({...row})),text:this.output.map(row=>row.text).join('\n'),returnValue:this.returnValue,variables:{...this.vars},pending:this.pending?{...this.pending}:null,error:this.error?.toJSON()||null,warnings:this.program?.warnings||[],graphics:this.graphics.snapshot(),waitRemainingMs:Math.max(0,this.waitUntil-(this.options.now||Date.now)()),keyPolling:this.keyboard.polling,keyWaiting:this.keyboard.waiting,callDepth:this.callStack.length};}
}
export const createPrgmPreview=(source,options={})=>new PrgmPreview(source,options);
export function runPrgmPreview(source,inputs=[],options={}) {
  const preview=createPrgmPreview(source,{skipWait:true,...options});let state=preview.run();let used=0;
  while(true) {
    if(state.waitRemainingMs>0)return {...state,inputsUsed:used};
    if(state.keyWaiting||(options.interactive&&state.keyPolling&&state.status==='paused'))return {...state,inputsUsed:used};
    if(state.status==='paused'){state=preview.run();continue;}
    if(state.status==='waiting'&&used<inputs.length){const input=inputs[used++];state=preview.answer(input?.cancel?'':input,{cancel:input?.cancel===true});if(state.inputError)return {...state,inputsUsed:used};state=preview.run();continue;}
    return {...state,inputsUsed:used};
  }
}
