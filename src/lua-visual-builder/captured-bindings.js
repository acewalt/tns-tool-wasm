import {parse} from '../../vendor/luaparse/index.js';
import {astChildren,luaLiteral} from './semantic-ir.js?v=20261128-source-reconstruction-v53';
import {clone} from './model.js?v=20261128-source-reconstruction-v53';

// Runtime evidence supplies actual coordinates, including class/helper drawing.
// AST ranges supply reversible edits. Neither alone proves a widget's behavior.
export function bindCapturedComponents(source, pages) {
  const ast=parse(source,{luaVersion:'5.1',ranges:true,locations:true,encodingMode:'none'});
  const calls=new Map(),strings=new Map(),occurrences=new Map();
  const range=n=>({start:n.range[0],end:n.range[1],line:n.loc.start.line});
  const literal=n=>n && (n.type.endsWith('Literal') || n.type==='UnaryExpression'&&n.operator==='-'&&n.argument.type==='NumericLiteral');
  const arg=n=>n?{...range(n),literal:!!literal(n),value:literal(n)?n.type==='UnaryExpression'?-n.argument.value:luaLiteral(n):undefined}:null;
  const visit=n=>{
    if(n.type==='CallExpression')calls.set(n.range[0],n);
    if(n.type==='StringLiteral'){const v=luaLiteral(n),list=strings.get(v)||[];list.push(n);strings.set(v,list);}
    astChildren(n).forEach(visit);
  };visit(ast);
  for(const pg of pages)for(const c of pg.components){const start=c.captureBinding?.source?.start;if(start!=null)occurrences.set(start,(occurrences.get(start)||0)+1);}
  let editable=0;
  for(const pg of pages)for(const c of pg.components){
    const capture=c.captureBinding,call=calls.get(capture?.source?.start),method=capture?.source?.method||call?.base?.identifier?.name;
    if(!call || !['drawString','fillRect','drawRect'].includes(method))continue;
    const args=call.arguments.map(arg),coordinates=method==='drawString'?[1,2]:[0,1,2,3];
    // One helper may draw dozens of rows. Moving its shared source expression
    // must not silently move every row when the user selects just one of them.
    const shared=occurrences.get(call.range[0])>1;
    for(const i of coordinates)if(args[i]){
      if(shared)args[i].literal=false;
      else if(!args[i].literal)args[i].offset=true;
    }
    if(shared&&method==='drawString'&&args[0]?.literal)args[0].literal=false;
    if(method==='drawString'&&!args[0]?.literal){
      // A unique literal passed through helper/class fields can safely change
      // at its declaration. Repeated/constructed text remains read-only.
      const candidates=strings.get(c.text)||[];
      if(candidates.length===1)args[0]=arg(candidates[0]);
    }
    const editableArgs=method==='drawString'?[0,1,2]:coordinates;
    if(!editableArgs.some(i=>args[i]?.literal||args[i]?.offset))continue;
    c.locked=false;c.sourceBinding={method,args,initial:clone(c),line:call.loc.start.line};
    capture.status='Source linked';editable++;
  }
  return editable;
}
