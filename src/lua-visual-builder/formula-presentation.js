import {parseExpression} from './expressions.js?v=20261126-builder-v51';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A read-only projection of the same expression AST used by the generator.
// Never evaluate source text or use the presentation as an execution model.
export function presentFormula(source,components=[]){
 const label=id=>components.find(c=>c.id===id)?.text||id,ops={'*':'×','/':'÷','==':'=','~=':'≠','!=':'≠','<=':'≤','>=':'≥','..':'+'};
 const text=n=>n.kind==='literal'?String(n.value??'nil'):n.kind==='variable'?n.name:n.kind==='unary'?n.op+' '+text(n.value):n.kind==='binary'?'('+text(n.left)+' '+(ops[n.op]||n.op)+' '+text(n.right)+')':['input','value','text'].includes(n.name)&&n.args[0]?.kind==='literal'?label(n.args[0].value):n.name+'('+n.args.map(text).join(', ')+')';
 function markup(n){
  if(n.kind==='literal')return '<'+(typeof n.value==='number'?'mn':'mtext')+'>'+esc(n.value??'nil')+'</'+(typeof n.value==='number'?'mn':'mtext')+'>';
  if(n.kind==='variable')return '<mi>'+esc(n.name)+'</mi>';
  if(n.kind==='unary')return '<mrow><mo>'+esc(n.op)+'</mo>'+markup(n.value)+'</mrow>';
  if(n.kind==='binary'){const a=markup(n.left),b=markup(n.right);if(n.op==='/')return '<mfrac>'+a+b+'</mfrac>';if(n.op==='^')return '<msup>'+a+b+'</msup>';return '<mrow><mo>(</mo>'+a+'<mo>'+esc(ops[n.op]||n.op)+'</mo>'+b+'<mo>)</mo></mrow>';}
  if(['input','value','text'].includes(n.name)&&n.args[0]?.kind==='literal')return '<mi mathvariant="normal">'+esc(label(n.args[0].value))+'</mi>';
  if(n.name==='sqrt')return '<msqrt>'+markup(n.args[0])+'</msqrt>';
  return '<mrow><mi>'+esc(n.name)+'</mi><mo>(</mo>'+n.args.map(markup).join('<mo>,</mo>')+'<mo>)</mo></mrow>';
 }
 try{const ast=parseExpression(source);return {text:text(ast),html:'<math xmlns="http://www.w3.org/1998/Math/MathML">'+markup(ast)+'</math>'};}catch{return {text:String(source),html:'<code>'+esc(source)+'</code>'};}
}
