// Shared, DOM-free TI-BASIC text and CX II graphics preview.
import { IDENT, key, PrgmError, fail, number, truth, split, expressionTree, evaluate, createMathContext, formatPrgmValue, evaluatePrgmExpression } from './math.js';
import {PrgmDrawing, isDrawingCommand} from './drawing.js';
export { PrgmError, formatPrgmValue, evaluatePrgmExpression } from './math.js';
export function compilePrgm(source) {
  const statements=[];
  for(const [index,raw] of String(source).replace(/\r\n?/g,'\n').split('\n').entries()) {
    // TI's copyright character starts a comment outside a string.
    const uncommented=split(raw,'©')[0];
    for(const text of split(uncommented,':'))if(text.trim())statements.push({text:text.trim(),line:index+1});
  }
  const code=[], stack=[], labels=new Map(), warnings=[];let name='',parameters=[],documentKind=null,documentLine=0,documentClosed=false;
  const parsed=s=>expressionTree(s);
  const variable=s=>{s=key(s.trim());if(!IDENT.test(s))fail('UNSUPPORTED_TARGET','Destino de variable no soportado: '+s);return s;};
  for(const stmt of statements) {
    try {
      const text=stmt.text;let match, op={...stmt,kind:'noop'};const i=code.length;
      if(documentClosed)fail('SYNTAX_ERROR','Hay instrucciones después del cierre del documento.');
      if((match=/^Define\s+(?:(?:LibPub|LibPriv)\s+)?([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*(Prgm|Func)?$/iu.exec(text))){
        if(code.length)fail('UNSUPPORTED_COMMAND','Las definiciones anidadas no están soportadas.');
        name=match[1];parameters=match[2].trim()?split(match[2],',').map(variable):[];
        if(match[3]){documentKind=key(match[3]);documentLine=stmt.line;}
      }else if((match=/^Define\s+([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*(.+)$/iu.exec(text))){
        op.kind='defineFunction';op.name=variable(match[1]);op.parameters=match[2].trim()?split(match[2],',').map(variable):[];op.body=parsed(match[3]);
      }else if((match=/^Define\s+([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.+)$/iu.exec(text))){op.kind='assign';op.name=variable(match[1]);op.expr=parsed(match[2]);
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
      }else if((match=/^Return(?:\s+(.+))?$/i.exec(text))){op.kind=match[1]?'return':'end';if(match[1])op.expr=parsed(match[1]);}
      else if(/^Stop$/i.test(text))op.kind='end';
      else if((match=/^(Lbl|Goto)\s+([\p{L}_][\p{L}\p{N}_]*)$/iu.exec(text))){op.kind=key(match[1]);op.name=key(match[2]);if(op.kind==='lbl'){if(labels.has(op.name))fail('SYNTAX_ERROR','Etiqueta duplicada: '+op.name);labels.set(op.name,i);}}
      else {
        const arrow=split(text,'→');const assignment=/^([\p{L}_][\p{L}\p{N}_]*)\s*:=\s*(.+)$/u.exec(text);
        if(arrow.length===2){op.kind='assign';op.name=variable(arrow[1]);op.expr=parsed(arrow[0]);}
        else if(assignment){op.kind='assign';op.name=variable(assignment[1]);op.expr=parsed(assignment[2]);}
        else if(/^[\p{L}_][\p{L}\p{N}_]*\s*\(/u.test(text)||/^(?:\d|[([{√+−-])/.test(text)){op.kind='evaluate';op.expr=parsed(text);}
        else fail('UNSUPPORTED_COMMAND','Instrucción no soportada: '+text.slice(0,90));
      }
      code.push(op);
    }catch(error){if(error instanceof PrgmError)error.line=stmt.line;throw error;}
  }
  if(documentKind&&!documentClosed)throw new PrgmError('SYNTAX_ERROR','Falta '+(documentKind==='func'?'EndFunc':'EndPrgm')+' para cerrar el documento.',documentLine);
  if(stack.length)throw new PrgmError('SYNTAX_ERROR','Bloque sin cierre: '+stack.at(-1).kind,code[stack.at(-1).start].line);
  for(const op of code)if(op.kind==='goto'){if(!labels.has(op.name))throw new PrgmError('SYNTAX_ERROR','Etiqueta inexistente: '+op.name,op.line);op.jump=labels.get(op.name);}
  return {code,name,parameters,warnings,documentKind};
}
export class PrgmPreview {
  constructor(source,options={}) {
    this.source=String(source);this.options=options;this.angleMode=options.angleMode==='DEG'?'DEG':'RAD';this.vars=Object.create(null);this.output=[];this.events=[];this.status='ready';this.pc=0;this.executed=0;this.pending=null;this.error=null;this.lastLine=0;this.branches=new Set();this.loops=new Map();
    this.mathContext=createMathContext(options);this.tries=[];this.lastCaughtError=null;this.graphics=new PrgmDrawing(options);this.waitUntil=0;this.frameYield=false;
    this.maxInstructions=Math.min(1000000,Math.max(1,options.maxInstructions||50000));this.maxLines=options.maxLines||1000;
    try {this.program=compilePrgm(this.source);this.name=options.name||this.program.name||'programa';
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
        this.vars[name]=value;
      });
    } catch(error){this.program={code:[],warnings:[]};this.name=options.name||'programa';this.handleError(error);}
  }
  handleError(error) {this.error=error instanceof PrgmError?error:new PrgmError('RUNTIME_ERROR',String(error.message||error));if(!this.error.line)this.error.line=this.lastLine;this.status='error';this.pending=null;}
  ev(node) {this.mathContext.steps=0;const value=evaluate(node,this.vars,this.angleMode,this.mathContext);this.angleMode=this.mathContext.modes[2]===2?'DEG':this.mathContext.modes[2]===3?'GRAD':'RAD';return value;}
  append(text,kind='disp') {if(this.output.length>=this.maxLines)fail('OUTPUT_LIMIT','Límite de historial alcanzado.');const row={text:String(text),kind,line:this.lastLine};this.output.push(row);this.event({type:'output',...row});}
  event(value) {this.events.push(value);if(this.events.length>2000)this.events.shift();}
  step(emitSnapshot=true) {
    if(['waiting','done','stopped','error'].includes(this.status))return emitSnapshot?this.snapshot():undefined;
    if(this.waitUntil){if((this.options.now||Date.now)()<this.waitUntil)return emitSnapshot?this.snapshot():undefined;this.waitUntil=0;}
    if(this.pc>=this.program.code.length){this.status='done';return emitSnapshot?this.snapshot():undefined;}
    const op=this.program.code[this.pc];this.lastLine=op.line;this.status='paused';
    try {
      if(++this.executed>this.maxInstructions)fail('EXECUTION_LIMIT','Se alcanzó el límite de instrucciones; posible bucle infinito.');
      let next=this.pc+1;
      if(op.kind==='local'){} // Declaring Local never defines it as zero.
      else if(op.kind==='delvar')op.names.forEach(n=>{if(this.mathContext.locks.has(n))fail('LOCKED_VARIABLE','La variable «'+n+'» está bloqueada.');delete this.vars[n];delete this.mathContext.functions[n];});
      else if(op.kind==='lock'||op.kind==='unlock')op.names.forEach(n=>op.kind==='lock'?this.mathContext.locks.add(n):this.mathContext.locks.delete(n));
      else if(op.kind==='assign'){if(this.mathContext.locks.has(op.name))fail('LOCKED_VARIABLE','La variable «'+op.name+'» está bloqueada.');this.vars[op.name]=this.ev(op.expr);}
      else if(op.kind==='defineFunction')this.mathContext.functions[op.name]={parameters:op.parameters,body:op.body};
      else if(op.kind==='evaluate')this.ev(op.expr);
      else if(op.kind==='drawing'){this.graphics.execute(op.command,op.args.map(n=>this.ev(n)));this.event({type:'graphics',command:op.command,revision:this.graphics.revision,line:op.line});if(op.command==='paintbuffer')this.frameYield=true;}
      else if(op.kind==='wait'){const seconds=number(this.ev(op.expr));if(seconds<0||seconds>86400)fail('DOMAIN_ERROR','Wait requiere un tiempo entre 0 y 86400 segundos.');if(!this.options.skipWait)this.waitUntil=(this.options.now||Date.now)()+seconds*1000;}
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
      else if(op.kind==='return'){this.returnValue=this.ev(op.expr);this.append(formatPrgmValue(this.returnValue),'return');this.status='done';}
      else if(op.kind==='end')this.status='done';
      this.pc=next;
      if(this.pc>=this.program.code.length&&this.status==='paused')this.status='done';
    }catch(error){
      const frame=this.tries.pop();
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
      this.pending=null;this.status='paused';
    }catch(error){this.handleError(error);}
    return this.snapshot();
  }
  stop() {if(!['done','error'].includes(this.status))this.status='stopped';this.pending=null;return this.snapshot();}
  snapshot() {return {success:this.status!=='error',status:this.status,name:this.name,line:this.lastLine,nextLine:this.program?.code[this.pc]?.line??null,executed:this.executed,angleMode:this.angleMode,output:this.output.map(row=>({...row})),text:this.output.map(row=>row.text).join('\n'),returnValue:this.returnValue,variables:{...this.vars},pending:this.pending?{...this.pending}:null,error:this.error?.toJSON()||null,warnings:this.program?.warnings||[],graphics:this.graphics.snapshot(),waitRemainingMs:Math.max(0,this.waitUntil-(this.options.now||Date.now)())};}
}
export const createPrgmPreview=(source,options={})=>new PrgmPreview(source,options);
export function runPrgmPreview(source,inputs=[],options={}) {
  const preview=createPrgmPreview(source,{skipWait:true,...options});let state=preview.run();let used=0;
  while(true) {
    if(state.waitRemainingMs>0)return {...state,inputsUsed:used};
    if(state.status==='paused'){state=preview.run();continue;}
    if(state.status==='waiting'&&used<inputs.length){const input=inputs[used++];state=preview.answer(input?.cancel?'':input,{cancel:input?.cancel===true});if(state.inputError)return {...state,inputsUsed:used};state=preview.run();continue;}
    return {...state,inputsUsed:used};
  }
}
