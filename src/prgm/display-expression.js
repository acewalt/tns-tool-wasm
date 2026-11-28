import {evaluate,formatExpressionValue,formatPrgmValue} from './math.js?v=20261128-source-reconstruction-v53';

// Disp may contain a symbolic matrix, e.g. [[x(b)-x(a)][y(b)-y(a)]].
// Resolve numeric subexpressions without treating symbolic coordinates as Lua
// or user routines. This is display-only; it never stores strings as numbers.
export function displayExpression(node, variables, angle, context) {
  if(node.type!=='matrix') {
    const value=evaluate(node,variables,angle,context);
    return {value,text:formatExpressionValue(node,value,context),kind:typeof value==='string'?'text':'math'};
  }
  const visit=(tree,depth=0)=>{
    if(depth>64)throw Error('Symbolic display depth exceeded');
    try {
      const value=evaluate(tree,variables,angle,context);
      return {value,text:formatExpressionValue(tree,value,context),known:true};
    } catch(error) {
      if(!['UNDEFINED_VARIABLE','UNSUPPORTED_FUNCTION'].includes(error.code))throw error;
      if(tree.type==='variable') {
        if(context.prgmScope?.names.has(tree.name))throw error;
        return {text:tree.name};
      }
      if(tree.type==='call') {
        if(context.functions?.[tree.name])throw error;
        return {text:tree.name+'('+tree.args.map(a=>visit(a,depth+1).text).join(',')+')'};
      }
      if(tree.type==='comparison') {
        const values=tree.operands.map(a=>visit(a,depth+1).text);
        return {text:values.map((text,i)=>(i?tree.operators[i-1]:'')+text).join('')};
      }
      if(tree.type==='binary') {
        const a=visit(tree.left,depth+1),b=visit(tree.right,depth+1),op=tree.op;
        if(['+','-'].includes(op)&&b.known&&b.value===0)return a;
        if(op==='*'&&a.known&&a.value===1)return b;
        if(['*','/'].includes(op)&&b.known&&b.value===1)return a;
        const wrap=(child,result)=>child.type==='binary'&&!result.known?'('+result.text+')':result.text;
        return {text:wrap(tree.left,a)+op+wrap(tree.right,b)};
      }
      if(tree.type==='unary')return {text:tree.op+'('+visit(tree.arg,depth+1).text+')'};
      throw error;
    }
  };
  const rows=node.rows.map(row=>row.map(cell=>visit(cell))),numeric=rows.every(row=>row.every(cell=>cell.known));
  const value=numeric?rows.map(row=>row.map(cell=>cell.value)):undefined;
  const text=numeric?formatPrgmValue(value):'['+rows.map(row=>'['+row.map(cell=>cell.text).join(',')+']').join('')+']';
  return {value:value??text,text,kind:'math'};
}
