// Shared, DOM-free TI-BASIC text preview. Source is parsed, never evaluated as JS.
const IDENT = /^[\p{L}_][\p{L}\p{N}_]*$/u;
const key = value => String(value).toLowerCase();
export class PrgmError extends Error {
  constructor(code, message, line = 0) { super(message); this.code = code; this.line = line; }
  toJSON() { return {code:this.code, message:this.message, line:this.line}; }
}
const fail = (code, message) => { throw new PrgmError(code, message); };
export function formatPrgmValue(value) {
  if (typeof value === 'number') return Object.is(value,-0) ? '0' : String(Number(value.toPrecision(6)));
  if (Array.isArray(value)) return '{'+value.map(formatPrgmValue).join(',')+'}';
  return String(value);
}
function number(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('TYPE_ERROR','Se esperaba un número real finito.');
  return value;
}
function truth(value) {
  if (typeof value === 'boolean') return value;
  fail('TYPE_ERROR','La condición debe ser verdadera o falsa.');
}
// Split only outside quoted strings and paired brackets. Colons inside := stay intact.
function split(source, separator) {
  const parts=[]; let start=0, quote='', depth=0;
  for(let i=0;i<source.length;i++) {
    const c=source[i];
    if(quote) { if(c===quote){if(source[i+1]===quote){i++;continue;}quote='';} continue; }
    if(c==='"'||c==='“') { quote=c==='“'?'”':'"'; continue; }
    if('({['.includes(c))depth++;
    if(')}]'.includes(c))depth--;
    if(c===separator && depth===0 && !(c===':'&&source[i+1]==='=')) {parts.push(source.slice(start,i));start=i+1;}
  }
  parts.push(source.slice(start)); return parts;
}
function tokens(source) {
  const out=[]; let i=0;
  const symbols={'−':'-','–':'-','×':'*','·':'*','÷':'/','≤':'<=','≥':'>=','≠':'!=','√':'sqrt'};
  while(i<source.length) {
    const c=source[i];
    if(/\s/u.test(c)){i++;continue;}
    if(c==='"'||c==='“') {
      const end=c==='“'?'”':'"'; let text='',closed=false;i++;
      while(i<source.length){if(source[i]===end){i++;if(source[i]===end){text+=end;i++;}else{closed=true;break;}}else text+=source[i++];}
      if(!closed)fail('SYNTAX_ERROR','Cadena sin comillas de cierre.');
      out.push({type:'string',value:text});continue;
    }
    const numeric=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eEᴇ][+−-]?\d+)?/.exec(source.slice(i));
    if(numeric){out.push({type:'number',value:Number(numeric[0].replace('ᴇ','e').replace('−','-'))});i+=numeric[0].length;continue;}
    const id=/^[\p{L}_][\p{L}\p{N}_]*/u.exec(source.slice(i));
    if(id){out.push({type:'id',value:key(id[0])});i+=id[0].length;continue;}
    const pair=source.slice(i,i+2);
    if(['<=','>=','!=','<>','=='].includes(pair)){out.push({type:'op',value:pair});i+=2;continue;}
    if('+-*/^&=<>(),{}[]!°'.includes(c)||symbols[c]){out.push({type:'op',value:symbols[c]||c});i++;continue;}
    fail('UNSUPPORTED_EXPRESSION','Símbolo no soportado en una expresión: '+c);
  }
  out.push({type:'end',value:''});return out;
}
const PRECEDENCE={or:1,xor:1,and:2,'=':3,'==':3,'!=':3,'<>':3,'<':3,'>':3,'<=':3,'>=':3,'&':4,'+':5,'-':5,'*':6,'/':6,'^':8};
const FUNCTIONS=new Set('string dim left right mid approx sqrt abs floor ceiling ipart exp ln log sign sin cos tan asin acos atan min max round mod remain'.split(' '));
function expressionTree(source) {
  const ts=tokens(source);let at=0;
  const peek=()=>ts[at], take=()=>ts[at++];
  const expect=v=>{if(take().value!==v)fail('SYNTAX_ERROR','Se esperaba '+v+'.');};
  function expr(min=0) {
    const token=take();let node;
    if(token.type==='number'||token.type==='string')node={type:'literal',value:token.value};
    else if(['+','-','not'].includes(token.value))node={type:'unary',op:token.value,arg:expr(token.value==='not'?3:7)};
    else if(token.value==='('){node=expr();expect(')');}
    else if(token.value==='{') {
      const args=[];if(peek().value!=='}'){do{args.push(expr());if(peek().value!==',')break;take();}while(true);}expect('}');node={type:'list',args};
    } else if(token.type==='id'||token.value==='sqrt') {
      if(peek().value==='('){take();const args=[];if(peek().value!==')'){do{args.push(expr());if(peek().value!==',')break;take();}while(true);}expect(')');node={type:'call',name:token.value,args};}
      else node={type:'variable',name:token.value};
    } else fail('SYNTAX_ERROR','Expresión incompleta cerca de «'+token.value+'».');
    while(true) {
      const next=peek();
      if(next.value==='['){take();const index=expr();expect(']');node={type:'index',base:node,index};continue;}
      if(next.value==='!'||next.value==='°'){take();node={type:'unary',op:next.value,arg:node};continue;}
      let op=next.value, implicit=false;
      if((next.type==='number'||next.type==='id'&&!['and','or','xor'].includes(next.value)||next.value==='(')&&PRECEDENCE[op]===undefined){op='*';implicit=true;}
      const priority=PRECEDENCE[op]; if(priority===undefined||priority<min)break;
      if(!implicit)take();node={type:'binary',op,left:node,right:expr(priority+(op==='^'?0:1))};
    }
    return node;
  }
  const result=expr();if(peek().type!=='end')fail('SYNTAX_ERROR','Texto inesperado: '+peek().value);return result;
}
function evaluate(node, vars, angle) {
  const ev=n=>evaluate(n,vars,angle);
  if(node.type==='literal')return node.value;
  if(node.type==='list')return node.args.map(ev);
  if(node.type==='variable') {
    if(Object.hasOwn(vars,node.name))return vars[node.name];
    const constants={pi:Math.PI,'π':Math.PI,'ℯ':Math.E,true:true,false:false};
    if(Object.hasOwn(constants,node.name))return constants[node.name];
    fail('UNDEFINED_VARIABLE','La variable «'+node.name+'» no está definida.');
  }
  if(node.type==='index') {
    const list=ev(node.base), index=number(ev(node.index));
    if(!Array.isArray(list)||!Number.isInteger(index)||index<1||index>list.length)fail('INDEX_ERROR','Índice de lista fuera de rango.');
    return list[index-1];
  }
  if(node.type==='unary') {
    const value=ev(node.arg);
    if(node.op==='not')return !truth(value);
    const n=number(value);
    if(node.op==='-')return -n;if(node.op==='+')return n;
    if(node.op==='°')return n*Math.PI/180;
    if(!Number.isInteger(n)||n<0||n>170)fail('DOMAIN_ERROR','Factorial fuera del dominio soportado.');
    let f=1;for(let k=2;k<=n;k++)f*=k;return f;
  }
  if(node.type==='binary') {
    const a=ev(node.left);
    if(node.op==='and')return truth(a)&&truth(ev(node.right));
    if(node.op==='or')return truth(a)||truth(ev(node.right));
    const b=ev(node.right);
    if(node.op==='xor')return truth(a)!==truth(b);
    if(node.op==='&')return formatPrgmValue(a)+formatPrgmValue(b);
    if(['=','==','!=','<>'].includes(node.op))return ['=','=='].includes(node.op)?JSON.stringify(a)===JSON.stringify(b):JSON.stringify(a)!==JSON.stringify(b);
    if(['<','>','<=','>='].includes(node.op)) {
      if(typeof a!==typeof b||!['number','string'].includes(typeof a))fail('TYPE_ERROR','Comparación de tipos incompatibles.');
      return node.op==='<'?a<b:node.op==='>'?a>b:node.op==='<='?a<=b:a>=b;
    }
    const x=number(a),y=number(b);
    if(node.op==='/'&&y===0)fail('DIVISION_BY_ZERO','División por cero.');
    return number(node.op==='+'?x+y:node.op==='-'?x-y:node.op==='*'?x*y:node.op==='/'?x/y:x**y);
  }
  if(node.type==='call') {
    if(!FUNCTIONS.has(node.name))fail('UNSUPPORTED_FUNCTION','Función no soportada por el preview numérico: '+node.name+'().');
    const args=node.args.map(ev), n=node.name;
    const arity=(min,max=min)=>{if(args.length<min||args.length>max)fail('ARGUMENT_ERROR','Número de argumentos incorrecto para '+n+'().');};
    if(n==='string'){arity(1);return formatPrgmValue(args[0]);}
    if(n==='dim'){arity(1);if(typeof args[0]!=='string'&&!Array.isArray(args[0]))fail('TYPE_ERROR','dim() requiere texto o lista.');return args[0].length;}
    if(n==='left'||n==='right'||n==='mid'){arity(n==='mid'?2:1,n==='mid'?3:2);const text=args[0];if(typeof text!=='string')fail('TYPE_ERROR','Se esperaba texto.');const count=args[1]??1;return n==='left'?text.slice(0,count):n==='right'?text.slice(-count):text.slice(count-1,args[2]===undefined?undefined:count-1+args[2]);}
    const degree=angle==='DEG'&&node.args[0]?.op!=='°';
    const functions={approx:x=>x,sqrt:Math.sqrt,abs:Math.abs,floor:Math.floor,ceiling:Math.ceil,ipart:Math.trunc,exp:Math.exp,ln:Math.log,log:Math.log10,sign:Math.sign,
      sin:x=>Math.sin(degree?x*Math.PI/180:x),cos:x=>Math.cos(degree?x*Math.PI/180:x),tan:x=>Math.tan(degree?x*Math.PI/180:x),
      asin:x=>Math.asin(x)*(angle==='DEG'?180/Math.PI:1),acos:x=>Math.acos(x)*(angle==='DEG'?180/Math.PI:1),atan:x=>Math.atan(x)*(angle==='DEG'?180/Math.PI:1)};
    if(Object.hasOwn(functions,n)){arity(1);return number(functions[n](number(args[0])));}
    if(n==='min'||n==='max'){arity(1,100);const values=args.length===1&&Array.isArray(args[0])?args[0]:args;return number(Math[n](...values.map(number)));}
    if(n==='round'){arity(1,2);const factor=10**(args[1]===undefined?0:number(args[1]));return number(Math.round(number(args[0])*factor)/factor);}
    if(n==='mod'||n==='remain'){arity(2);const a=number(args[0]),b=number(args[1]);if(!b)fail('DIVISION_BY_ZERO','División por cero.');return n==='mod'?((a%b)+b)%b:a%b;}
    fail('UNSUPPORTED_FUNCTION','Función no soportada por el preview numérico: '+n+'().');
  }
  fail('INTERNAL_ERROR','Expresión desconocida.');
}
export function evaluatePrgmExpression(source, variables={}, options={}) {
  const vars=Object.create(null);for(const [name,value] of Object.entries(variables))vars[key(name)]=value;
  return evaluate(expressionTree(String(source)),vars,options.angleMode==='DEG'?'DEG':'RAD');
}
export function compilePrgm(source) {
  const statements=[];
  for(const [index,raw] of String(source).replace(/\r\n?/g,'\n').split('\n').entries()) {
    // TI's copyright character starts a comment outside a string.
    const uncommented=split(raw,'©')[0];
    for(const text of split(uncommented,':'))if(text.trim())statements.push({text:text.trim(),line:index+1});
  }
  const code=[], stack=[], labels=new Map(), warnings=[];let name='',parameters=[];
  const parsed=s=>expressionTree(s);
  const variable=s=>{s=key(s.trim());if(!IDENT.test(s))fail('UNSUPPORTED_TARGET','Destino de variable no soportado: '+s);return s;};
  for(const stmt of statements) {
    try {
      const text=stmt.text;let match, op={...stmt,kind:'noop'};const i=code.length;
      if((match=/^Define\s+(?:(?:LibPub|LibPriv)\s+)?([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*(Prgm)?$/iu.exec(text))){
        if(code.length)fail('UNSUPPORTED_COMMAND','Las definiciones anidadas no están soportadas.');
        name=match[1];parameters=match[2].trim()?split(match[2],',').map(variable):[];
      }else if(/^Prgm$/i.test(text)){}
      else if(/^EndPrgm$/i.test(text))op.kind='end';
      else if((match=/^(Local|DelVar)\s+(.+)$/i.exec(text))){op.kind=key(match[1]);op.names=split(match[2],',').map(variable);}
      else if((match=/^(DispAt|Disp|RequestStr|Request)\b\s*(.*)$/i.exec(text))){
        op.kind=key(match[1]);const args=split(match[2],',').map(s=>s.trim());
        if(op.kind.startsWith('request')){if(args.length<2||args.length>4)fail('SYNTAX_ERROR','Request requiere mensaje, variable y hasta dos opciones.');op.prompt=parsed(args[0]);op.name=variable(args[1]);op.flag=args[2]?parsed(args[2]):null;op.statusName=args[3]?variable(args[3]):null;}
        else {if(!args[0])fail('SYNTAX_ERROR','Disp requiere una expresión.');op.args=args.map(parsed);if(op.kind==='dispat'&&args.length<2)fail('SYNTAX_ERROR','DispAt requiere fila y contenido.');}
      }else if(/^ClrIO$/i.test(text)){op.kind='clear';warnings.push({code:'COMPAT_CLRIO',line:stmt.line,message:'ClrIO no es una instrucción TI-Nspire; se omite y se conserva el historial.'});}
      else if((match=/^If\s+(.+?)\s+Then$/i.exec(text))){op.kind='if';op.expr=parsed(match[1]);stack.push({kind:'if',start:i,branch:i,ends:[],hasElse:false});}
      else if((match=/^If\s+(.+)$/i.exec(text))){op.kind='ifSingle';op.expr=parsed(match[1]);}
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
      }else if(/^Return\s*$/i.test(text)||/^Stop$/i.test(text))op.kind='end';
      else if((match=/^(Lbl|Goto)\s+([\p{L}_][\p{L}\p{N}_]*)$/iu.exec(text))){op.kind=key(match[1]);op.name=key(match[2]);if(op.kind==='lbl'){if(labels.has(op.name))fail('SYNTAX_ERROR','Etiqueta duplicada: '+op.name);labels.set(op.name,i);}}
      else {
        const arrow=split(text,'→');const assignment=/^([\p{L}_][\p{L}\p{N}_]*)\s*:=\s*(.+)$/u.exec(text);
        if(arrow.length===2){op.kind='assign';op.name=variable(arrow[1]);op.expr=parsed(arrow[0]);}
        else if(assignment){op.kind='assign';op.name=variable(assignment[1]);op.expr=parsed(assignment[2]);}
        else fail('UNSUPPORTED_COMMAND','Instrucción no soportada: '+text.slice(0,90));
      }
      code.push(op);
    }catch(error){if(error instanceof PrgmError)error.line=stmt.line;throw error;}
  }
  if(stack.length)throw new PrgmError('SYNTAX_ERROR','Bloque sin cierre: '+stack.at(-1).kind,code[stack.at(-1).start].line);
  for(const op of code)if(op.kind==='goto'){if(!labels.has(op.name))throw new PrgmError('SYNTAX_ERROR','Etiqueta inexistente: '+op.name,op.line);op.jump=labels.get(op.name);}
  return {code,name,parameters,warnings};
}
export class PrgmPreview {
  constructor(source,options={}) {
    this.source=String(source);this.options=options;this.angleMode=options.angleMode==='DEG'?'DEG':'RAD';this.vars=Object.create(null);this.output=[];this.events=[];this.status='ready';this.pc=0;this.executed=0;this.pending=null;this.error=null;this.lastLine=0;this.branches=new Set();this.loops=new Map();
    this.maxInstructions=Math.min(1000000,Math.max(1,options.maxInstructions||50000));this.maxLines=options.maxLines||1000;
    try {this.program=compilePrgm(this.source);this.name=options.name||this.program.name||'programa';
      if(this.program.parameters.length)fail('UNSUPPORTED_PARAMETERS','Esta primera versión requiere programas sin parámetros.');
    } catch(error){this.program={code:[],warnings:[]};this.name=options.name||'programa';this.handleError(error);}
  }
  handleError(error) {this.error=error instanceof PrgmError?error:new PrgmError('RUNTIME_ERROR',String(error.message||error));if(!this.error.line)this.error.line=this.lastLine;this.status='error';this.pending=null;}
  ev(node) {return evaluate(node,this.vars,this.angleMode);}
  append(text,kind='disp') {if(this.output.length>=this.maxLines)fail('OUTPUT_LIMIT','Límite de historial alcanzado.');const row={text:String(text),kind,line:this.lastLine};this.output.push(row);this.event({type:'output',...row});}
  event(value) {this.events.push(value);if(this.events.length>2000)this.events.shift();}
  step() {
    if(['waiting','done','stopped','error'].includes(this.status))return this.snapshot();
    if(this.pc>=this.program.code.length){this.status='done';return this.snapshot();}
    const op=this.program.code[this.pc];this.lastLine=op.line;this.status='paused';
    try {
      if(++this.executed>this.maxInstructions)fail('EXECUTION_LIMIT','Se alcanzó el límite de instrucciones; posible bucle infinito.');
      let next=this.pc+1;
      if(op.kind==='local'){} // Declaring Local never defines it as zero.
      else if(op.kind==='delvar')op.names.forEach(n=>delete this.vars[n]);
      else if(op.kind==='assign')this.vars[op.name]=this.ev(op.expr);
      else if(op.kind==='disp'||op.kind==='dispat') {
        const args=op.args.map(n=>this.ev(n));
        if(op.kind==='disp')this.append(args.map(formatPrgmValue).join('\u2009'));
        else {const row=number(args.shift());if(!Number.isInteger(row)||row<1||row>8)fail('DOMAIN_ERROR','DispAt requiere una fila entre 1 y 8.');while(this.output.length<row)this.append('');this.output[row-1]={text:args.map(formatPrgmValue).join('\u2009'),kind:'disp',line:op.line};}
      }else if(op.kind==='clear'){this.event({type:'compatibility',command:'ClrIO',ignored:true,line:op.line});}
      else if(op.kind==='request'||op.kind==='requeststr') {
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
        const begin=this.program.code[op.start];if(begin.kind==='for'){const frame=this.loops.get(op.start);this.vars[begin.name]=number(this.vars[begin.name])+frame.step;}next=op.start;
      }else if(op.kind==='exit'){this.loops.delete(op.start);next=this.program.code[op.start].end+1;}
      else if(op.kind==='cycle')next=this.program.code[op.start].end;
      else if(op.kind==='goto'){this.loops.clear();this.branches.clear();next=op.jump;}
      else if(op.kind==='end')this.status='done';
      this.pc=next;
      if(this.pc>=this.program.code.length&&this.status==='paused')this.status='done';
    }catch(error){this.handleError(error);}
    return this.snapshot();
  }
  run(budget=500) {for(let i=0;i<budget&&!['waiting','done','stopped','error'].includes(this.status);i++)this.step();return this.snapshot();}
  answer(raw,{cancel=false}={}) {
    if(this.status!=='waiting')return this.snapshot();
    const pending=this.pending;
    // Invalid input is recoverable: keep the same dialog and program counter.
    if(!cancel){try{const value=pending.kind==='requeststr'?String(raw):evaluatePrgmExpression(String(raw),this.vars,{angleMode:this.angleMode});this.vars[pending.variable]=value;}catch(error){return {...this.snapshot(),success:false,inputError:{code:error.code||'INPUT_ERROR',message:error.message,line:pending.line}};}}
    try {
      if(pending.statusVariable)this.vars[pending.statusVariable]=cancel?0:1;
      if(!cancel&&pending.display)this.append(pending.prompt+' '+String(raw),'input');
      this.event({type:cancel?'cancel':'answer',line:pending.line,variable:pending.variable,input:cancel?null:String(raw)});
      this.pending=null;this.status='paused';
    }catch(error){this.handleError(error);}
    return this.snapshot();
  }
  stop() {if(!['done','error'].includes(this.status))this.status='stopped';this.pending=null;return this.snapshot();}
  snapshot() {return {success:this.status!=='error',status:this.status,name:this.name,line:this.lastLine,nextLine:this.program?.code[this.pc]?.line??null,executed:this.executed,angleMode:this.angleMode,output:this.output.map(row=>({...row})),text:this.output.map(row=>row.text).join('\n'),variables:{...this.vars},pending:this.pending?{...this.pending}:null,error:this.error?.toJSON()||null,warnings:this.program?.warnings||[]};}
}
export const createPrgmPreview=(source,options={})=>new PrgmPreview(source,options);
export function runPrgmPreview(source,inputs=[],options={}) {
  const preview=createPrgmPreview(source,options);let state=preview.run();let used=0;
  while(true) {
    if(state.status==='paused'){state=preview.run();continue;}
    if(state.status==='waiting'&&used<inputs.length){const input=inputs[used++];state=preview.answer(input?.cancel?'':input,{cancel:input?.cancel===true});if(state.inputError)return {...state,inputsUsed:used};state=preview.run();continue;}
    return {...state,inputsUsed:used};
  }
}
