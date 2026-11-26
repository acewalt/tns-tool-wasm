// Small expression grammar: no JS eval, property access, or implicit Lua injection.
const prec={or:1,and:2,'==':3,'~=':3,'!=':3,'<':3,'>':3,'<=':3,'>=':3,'..':4,'+':5,'-':5,'*':6,'/':6,'%':6,'^':8};
const functions=new Set(['input','value','text','sqrt','abs','sin','cos','tan','asin','acos','atan','floor','ceil','min','max','log','exp','random','round','length','item','concat','number','string','cas']);
export function parseExpression(source) {
  const input=String(source).trim();let pos=0,count=0;
  function token(){while(/\s/.test(input[pos]||'')&&pos<input.length)pos++;if(pos>=input.length)return {type:'end'};const tail=input.slice(pos);let m;
    if((m=tail.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/))){pos+=m[0].length;return{type:'number',value:Number(m[0])};}
    if(tail[0]==='"'||tail[0]==="'"){const q=tail[0];pos++;let value='',closed=false;while(pos<input.length){let c=input[pos++];if(c===q){closed=true;break;}if(c==='\\'){c=input[pos++];c=({n:'\n',t:'\t',r:'\r'})[c]??c;}value+=c;}if(!closed)throw Error('Unclosed string');return{type:'string',value};}
    if((m=tail.match(/^[A-Za-z_][A-Za-z0-9_]*/))){pos+=m[0].length;return{type:'id',value:m[0]};}
    if((m=tail.match(/^(==|~=|!=|<=|>=|\.\.|[+\-*/%^<>()!,])/))){pos+=m[0].length;return{type:'op',value:m[0]};}throw Error('Unexpected expression near '+tail.slice(0,16));
  }
  let next=token();const eat=()=>{const n=next;next=token();return n;};const need=s=>{if(next.value!==s)throw Error('Expected '+s);eat();};
  function expr(min=0){if(++count>256)throw Error('Expression too complex');let n= eat(),left;
    if(['number','string'].includes(n.type))left={kind:'literal',value:n.value};
    else if(['-','+','not','!'].includes(n.value))left={kind:'unary',op:n.value,value:expr(7)};
    else if(n.value==='('){left=expr();need(')');}
    else if(n.type==='id'){
      if(['true','false','nil'].includes(n.value))left={kind:'literal',value:n.value==='nil'?null:n.value==='true'};
      else if(next.value==='('){if(!functions.has(n.value))throw Error('Unknown function: '+n.value);eat();const args=[];if(next.value!==')')do{args.push(expr());if(next.value!==',')break;eat();}while(true);need(')');left={kind:'call',name:n.value,args};}
      else left={kind:'variable',name:n.value};
    }else throw Error('Expected a value');
    while(prec[next.value]>=min){const op=eat().value;const right=expr(prec[op]+(op==='^'||op==='..'?0:1));left={kind:'binary',op,left,right};}return left;
  }
  const ast=expr();if(next.type!=='end')throw Error('Unexpected '+next.value);return ast;
}
export function luaString(text){return '"'+String(text).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,c=>'\\'+c.charCodeAt(0).toString().padStart(3,'0'))+'"';}
export function luaValue(value){if(value==null)return'nil';if(typeof value==='string')return luaString(value);if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite number');return String(value);}if(typeof value==='boolean')return String(value);if(Array.isArray(value))return'{'+value.map(luaValue).join(',')+'}';return'{'+Object.entries(value).map(([k,v])=>'['+luaString(k)+']='+luaValue(v)).join(',')+'}';}
export function compileExpression(source,locals=[]) {
  const write=n=>{if(n.kind==='literal')return luaValue(n.value);if(n.kind==='variable')return n.name==='pi'?'math.pi':n.name==='e'?'math.exp(1)':locals.includes(n.name)?n.name:'VB.variable('+luaString(n.name)+')';
    if(n.kind==='unary')return '('+(['not','!'].includes(n.op)?'not '+write(n.value):n.op+'VB.number('+write(n.value)+')')+')';
    if(n.kind==='binary'){const op=n.op==='!='?'~=':n.op,a=write(n.left),b=write(n.right);return '('+( ['+','-','*','/','%','^'].includes(op)?'VB.number('+a+') '+op+' VB.number('+b+')':a+' '+op+' '+b)+')';}
    const args=n.args.map(write).join(',');if(['input','value','text'].includes(n.name))return 'VB.'+n.name+'('+args+')';
    if(['round','length','item','concat','number','cas'].includes(n.name))return 'VB.'+n.name+'('+args+')';if(n.name==='string')return'tostring('+args+')';return'math.'+n.name+'('+args+')';};
  return write(parseExpression(source));
}
export function evaluateExpression(source,{variables={},input=()=>0,value=input,text=String}={}) {
  const number=v=>{const n=typeof v==='number'?v:Number(v);if(!Number.isFinite(n))throw Error('Expected a finite number');return n;};
  const calls={input:id=>number(input(id)),value,text,sqrt:Math.sqrt,abs:Math.abs,sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,floor:Math.floor,ceil:Math.ceil,min:Math.min,max:Math.max,log:Math.log,exp:Math.exp,round:(v,d=0)=>Math.round(number(v)*10**d)/10**d,length:v=>v.length,item:(v,i)=>v[i-1],concat:(a,b)=>String(a)+String(b),number,string:String};
  function run(n){if(n.kind==='literal')return n.value;if(n.kind==='variable'){if(n.name==='pi')return Math.PI;if(n.name==='e')return Math.E;if(!(n.name in variables))throw Error('Undefined variable: '+n.name);return variables[n.name];}if(n.kind==='unary'){const v=run(n.value);return n.op==='-'?-number(v):n.op==='+'?number(v):!v;}if(n.kind==='call'){if(!calls[n.name])throw Error('Use Preview for '+n.name);return calls[n.name](...n.args.map(run));}
    const a=run(n.left);if(n.op==='and')return a&&run(n.right);if(n.op==='or')return a||run(n.right);const b=run(n.right);switch(n.op){case '+':return number(a)+number(b);case '-':return number(a)-number(b);case '*':return number(a)*number(b);case '/':return number(a)/number(b);case '^':return number(a)**number(b);case '%':return ((number(a)%number(b))+number(b))%number(b);case '..':return String(a)+String(b);case '==':return a===b;case '!=':case '~=':return a!==b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;}}
  const result=run(parseExpression(source));if(typeof result==='number'&&!Number.isFinite(result))throw Error('Undefined numeric result');return result;
}
