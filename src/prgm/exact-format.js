// Exact display for rational multiples of pi and notable trigonometric angles.
// This follows the expression tree, never guesses a radical from a float.
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
function rational(n,d=1,p=0){if(!d||!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||Math.abs(n)>1e9||Math.abs(d)>1e9)return null;const g=gcd(n,d),sign=d<0?-1:1;return{n:n/g*sign,d:d/g*sign,p};}
function resolve(node,bindings,variables,seen=new Set(),depth=0){
  if(!node||depth>24)return node;
  if(node.type==='variable'&&bindings?.[node.name]&&!seen.has(node.name)){
    const bound=bindings[node.name];
    if(!variables||Object.is(variables[node.name],bound.value))return resolve(bound.expr,bindings,variables,new Set([...seen,node.name]),depth+1);
  }
  return node;
}
export function captureExactTree(node,bindings={},variables={},depth=0){
  if(!node||depth>24)return null;
  const current=resolve(node,bindings,variables,new Set(),depth);
  if(current!==node)return captureExactTree(current,bindings,variables,depth+1);
  if(node.type==='literal'||node.type==='variable')return{...node};
  if(node.type==='unary')return{...node,arg:captureExactTree(node.arg,bindings,variables,depth+1)};
  if(node.type==='binary')return{...node,left:captureExactTree(node.left,bindings,variables,depth+1),right:captureExactTree(node.right,bindings,variables,depth+1)};
  if(node.type==='call')return{...node,args:node.args.map(arg=>captureExactTree(arg,bindings,variables,depth+1))};
  return null;
}
function coefficient(node,bindings,variables,depth=0){
  if(!node||depth>24)return null;node=resolve(node,bindings,variables);
  if(node.type==='literal')return Number.isInteger(node.value)&&!node.angle?rational(node.value):null;
  if(node.type==='variable')return['pi','π'].includes(node.name)&&!Object.hasOwn(variables||{},node.name)?rational(1,1,1):null;
  if(node.type==='unary'&&['+','-'].includes(node.op)){const a=coefficient(node.arg,bindings,variables,depth+1);return a?rational(node.op==='-'?-a.n:a.n,a.d,a.p):null;}
  if(node.type!=='binary')return null;
  const a=coefficient(node.left,bindings,variables,depth+1),b=coefficient(node.right,bindings,variables,depth+1);if(!a||!b)return null;
  if(['+','-'].includes(node.op)&&a.p===b.p)return rational(a.n*b.d+(node.op==='+'?1:-1)*b.n*a.d,a.d*b.d,a.p);
  if(node.op==='*')return rational(a.n*b.n,a.d*b.d,a.p+b.p);
  if(node.op==='/')return rational(a.n*b.d,a.d*b.n,a.p-b.p);
  return null;
}
function printCoefficient(value){
  if(!value)return null;const{n,d,p}=value;if(!n)return'0';if(p<0||p>1)return null;
  const sign=n<0?'-':'',abs=Math.abs(n),top=p?(abs===1?'π':abs+'*π'):String(abs);return sign+top+(d===1?'':'/'+d);
}
export function exactExpressionText(node,{bindings={},variables,angleMode='RAD'}={}){
  node=resolve(node,bindings,variables);if(!node)return null;
  const q=coefficient(node,bindings,variables);
  if(q&&(q.p!==0||node.type==='binary'&&node.op==='/'))return printCoefficient(q);
  if(node.type==='unary'&&node.op==='-'){const text=exactExpressionText(node.arg,{bindings,variables,angleMode});return text?'−('+text+')':null;}
  if(node.type!=='call'||!['sin','cos','tan'].includes(node.name)||node.args.length!==1)return null;
  const theta=coefficient(node.args[0],bindings,variables);if(!theta)return null;
  let units;
  if(angleMode==='RAD')units=theta.p===1?theta.n*12/theta.d:theta.p===0&&theta.n===0?0:null;
  else if(theta.p===0)units=theta.n*12/(theta.d*(angleMode==='DEG'?180:200));
  if(!Number.isInteger(units))return null;
  units=((units%24)+24)%24;
  const sine=['0','(√(6)-√(2))/4','1/2','√(2)/2','√(3)/2','(√(6)+√(2))/4','1','(√(6)+√(2))/4','√(3)/2','√(2)/2','1/2','(√(6)-√(2))/4','0','-(√(6)-√(2))/4','-1/2','-√(2)/2','-√(3)/2','-(√(6)+√(2))/4','-1','-(√(6)+√(2))/4','-√(3)/2','-√(2)/2','-1/2','-(√(6)-√(2))/4'];
  const tangent=['0','2-√(3)','√(3)/3','1','√(3)','2+√(3)',null,'-2-√(3)','-√(3)','-1','-√(3)/3','-2+√(3)'];
  return node.name==='sin'?sine[units]:node.name==='cos'?sine[(units+6)%24]:tangent[units%12];
}
