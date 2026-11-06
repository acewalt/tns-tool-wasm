import { IDENT, key, split, expressionTree, evaluate, evaluatePrgmExpression, createMathContext, formatPrgmValue, normalizeTiMath, supportedMathFunctions, PrgmError } from './math.js?v=20261105-sonar-math-v32';
import { TI_CATALOG_COMMAND_NAMES } from './catalog-functions.js';

const copy = value => Array.isArray(value) ? value.map(copy) : value;
let nextSessionId=0;
const CAS_ALIASES=new Set([...supportedMathFunctions,'d','diff','derivative','integral','integrate','lim','limit','sumseq','prodseq','surd','sqrt','system','solve','factor','expand','simplify','normal','laplace','ilaplace','desolve']);
export function createMathSession(options = {}) {
  const variables = Object.create(null), context = createMathContext(options);
  const functions=new Map(),symbolic=new Map(),deleted=new Set(),namespace=`tnscalcs${++nextSessionId}q`;
  const casNames=new Map(),casDisplay=new Map();let nextSymbol=0;
  const casName=name=>{name=key(name);if(!casNames.has(name)){const value=namespace+'v'+(++nextSymbol);casNames.set(name,value);casDisplay.set(value,name);}return casNames.get(name);};
  for (const [name, value] of Object.entries(options.variables || {})) variables[key(name)] = copy(value);
  const complete = () => ({ es: 'Hecho', en: 'Done', fr: 'Terminé' })[String(options.language || 'en').slice(0, 2)] || 'Done';
  const target = name => { name = key(name.trim()); if (!IDENT.test(name)) throw new PrgmError('INVALID_NAME', 'Nombre de variable no válido: ' + name); if (context.locks.has(name)) throw new PrgmError('LOCKED_VARIABLE', 'La variable «' + name + '» está bloqueada.'); return name; };
  function calculate(source) {
    context.steps = 0;
    const text = String(source || '').trim(); let match, result;
    if (!text) throw new PrgmError('SYNTAX_ERROR', 'La expresión está vacía.');
    if ((match = /^Define\s+(?:(?:LibPub|LibPriv)\s+)?([\p{L}_][\p{L}\p{N}_]*)\(([^)]*)\)\s*=\s*([\s\S]+)$/iu.exec(text))) {
      const name = target(match[1]), parameters = match[2].trim() ? split(match[2], ',').map(target) : [];
      if (new Set(parameters).size !== parameters.length) throw new PrgmError('DUPLICATE_PARAMETER', 'Un parámetro está repetido.');
      context.functions[name] = { parameters, body: expressionTree(match[3]) };
      functions.set(name,{parameters,source:match[3]});symbolic.delete(name);
      return { value: undefined, display: complete(), kind: 'definition', stored: name };
    }
    if ((match = /^Define\s+([\p{L}_][\p{L}\p{N}_]*)\s*=\s*([\s\S]+)$/iu.exec(text)) || (match = /^([\p{L}_][\p{L}\p{N}_]*)\s*:=\s*([\s\S]+)$/u.exec(text))) {
      const name = target(match[1]), value = evaluate(expressionTree(match[2]), variables, options.angleMode || 'RAD', context); variables[name] = copy(value);
      result = { value, display: /^Define\b/i.test(text) ? complete() : formatPrgmValue(value), kind: 'assignment', stored: name };
    } else if (/^(DelVar|Lock|Unlock)\s+/i.test(text)) {
      const [, command, rest] = /^(DelVar|Lock|Unlock)\s+(.+)$/i.exec(text);
      for (const item of split(rest, ',')) { const name = key(item.trim()); if (!IDENT.test(name)) throw new PrgmError('INVALID_NAME', 'Nombre no válido.'); if (key(command) === 'unlock') context.locks.delete(name); else if (key(command) === 'lock') context.locks.add(name); else { target(name); delete variables[name]; delete context.functions[name];functions.delete(name);symbolic.delete(name);deleted.add(name); } }
      return { value: undefined, display: complete(), kind: 'command' };
    } else {
      const arrow = split(text, '→');
      const name = arrow.length === 2 ? target(arrow[1]) : null;
      if (arrow.length > 2) throw new PrgmError('SYNTAX_ERROR', 'Una asignación requiere un solo destino.');
      const value = evaluate(expressionTree(name ? arrow[0] : text), variables, options.angleMode || 'RAD', context);
      if (name) variables[name] = copy(value);
      result = { value, display: value === undefined ? complete() : formatPrgmValue(value), kind: name ? 'assignment' : 'expression', ...(name ? { stored: name } : {}) };
    }
    if(result.stored)symbolic.delete(result.stored);
    if (result.value !== undefined) variables.ans = copy(result.value);
    return result;
  }
  async function calculateAsync(source) {
    try{return calculate(source);}catch(error){
      if(!['UNDEFINED_VARIABLE','UNSUPPORTED_FUNCTION','TYPE_ERROR','SYNTAX_ERROR'].includes(error.code))throw error;
      const text=normalizeTiMath(String(source||'')).trim();
      if(text.length>8192||/[;`]/.test(text)||/\b(?:javascript|python|load|readfile|writefile|exec|shell)\s*\(/i.test(text))throw error;
      let bridge=options.cas||globalThis.window?.TnsCasBridge;
      if(!bridge&&globalThis.window){const deadline=Date.now()+10000;while(!bridge&&Date.now()<deadline){await new Promise(r=>setTimeout(r,40));bridge=globalThis.window.TnsCasBridge;}}
      if(!bridge||!await bridge.ensureReady())throw new PrgmError('CAS_UNAVAILABLE',bridge?.getStatus?.().error||'El motor CAS no está disponible.');
      const names=new Set([...Object.keys(variables),...symbolic.keys(),...functions.keys()]);
      const constants=new Set(['pi','π','e','ℯ','i','true','false','infinity','undef','and','or','not','xor']);
      const rewrite=(value,formals={})=>String(value).split(/("(?:[^"\\]|\\.)*")/g).map((part,i)=>i%2?part:part.replace(/(?<![\p{L}\p{N}_.])([\p{L}_][\p{L}\p{N}_]*)/gu,(name,_token,offset)=>{
        const lower=key(name);if(formals[lower])return formals[lower];
        if(names.has(lower))return casName(lower);
        if(/^\s*\(/.test(part.slice(offset+name.length))||constants.has(lower)||name.startsWith('_'))return name;
        return casName(lower);
      })).join('');
      const cas=value=>{const result=bridge.evaluate(value,{mode:'evalStr'});if(!result.handled||result.error||/\b(?:error|undef)\b/i.test(result.raw||result.value||''))throw new PrgmError('CAS_ERROR',String(result.error||result.raw||'CAS error'));return String(result.value);};
      for(const name of deleted)cas(`purge(${casName(name)})`);deleted.clear();
      // Namespace each Scratchpad independently, including numeric variables and functions.
      const literal=value=>typeof value==='string'?JSON.stringify(value):Array.isArray(value)?'['+value.map(literal).join(',')+']':formatPrgmValue(value);
      for(const [name,value]of Object.entries(variables))cas(`${casName(name)}:=(${literal(value)})`);
      for(const [name,value]of symbolic)cas(`${casName(name)}:=(${rewrite(value)})`);
      const normalized=text.replace(/^Define\s+(?:(?:LibPub|LibPriv)\s+)?([\p{L}_][\p{L}\p{N}_]*(?:\([^)]*\))?)\s*=\s*/iu,'$1:=');
      const assign=/^([\p{L}_][\p{L}\p{N}_]*)\s*:=\s*([\s\S]+)$/u.exec(normalized),arrow=/^([\s\S]+)→\s*([\p{L}_][\p{L}\p{N}_]*)$/u.exec(normalized);
      const stored=assign?target(assign[1]):arrow?target(arrow[2]):null,expression=assign?assign[2]:arrow?arrow[1]:normalized;
      const callNames=value=>[...String(value).replace(/"(?:[^"\\]|\\.)*"/g,'').matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*\(/gu)].map(match=>key(match[1]));
      const visited=new Set(),visiting=new Set(),ordered=[];
      const visit=name=>{if(visited.has(name))return;if(visiting.has(name)||visiting.size>64)throw new PrgmError('RESOURCE_LIMIT','La definición recursiva supera el límite del preview.');if(!functions.has(name)){if((!TI_CATALOG_COMMAND_NAMES.has(name)&&!CAS_ALIASES.has(name))||(bridge.supportsFunction&&!bridge.supportsFunction(name)))throw new PrgmError('UNSUPPORTED_FUNCTION','El CAS no admite esta función: '+name);return;}visiting.add(name);for(const child of callNames(functions.get(name).source))visit(child);visiting.delete(name);visited.add(name);ordered.push(name);};
      for(const name of callNames(expression))visit(name);
      for(const name of ordered){const definition=functions.get(name),formals=Object.fromEntries(definition.parameters.map(parameter=>[parameter,namespace+'p'+(++nextSymbol)]));for(const [parameter,formal]of Object.entries(formals))casDisplay.set(formal,parameter);const body=cas(rewrite(definition.source,formals));cas(`${casName(name)}(${Object.values(formals).join(',')}):=(${body})`);}
      const rewritten=rewrite(expression);
      const calls=[...rewritten.replace(/"(?:[^"\\]|\\.)*"/g,'').matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*\(/gu)].map(match=>match[1]);
      if(bridge.supportsFunction)for(const name of calls){if(!bridge.supportsFunction(name)&&!functions.has(casDisplay.get(name)))throw new PrgmError('UNSUPPORTED_FUNCTION','El CAS no admite esta función: '+(casDisplay.get(name)||name));}
      const output=cas(rewritten).replace(/[\p{L}_][\p{L}\p{N}_]*/gu,name=>casDisplay.get(name)||name);
      if(!bridge.supportsFunction&&output.replace(/\s/g,'')===expression.replace(/\s/g,'')&&/^[\p{L}_][\p{L}\p{N}_]*\s*\(/u.test(expression)&&!functions.has(key(expression.split('(')[0].trim())))throw new PrgmError('UNSUPPORTED_FUNCTION','El CAS no admite esta función: '+expression.split('(')[0]);
      if(stored){symbolic.set(stored,output);delete variables[stored];}
      symbolic.set('ans',output);delete variables.ans;
      return {value:output,display:/^Define\b/i.test(text)?complete():output,kind:stored?'assignment':'expression',...(stored?{stored}:{}),backend:bridge.getStatus?.().backend||'CAS'};
    }
  }
  return Object.freeze({ evaluate: calculate,evaluateAsync:calculateAsync, variables, context,getDefinitions:()=>[...functions].map(([name,fn])=>({name,parameters:[...fn.parameters],type:'Func',insertion:name+'()'})),setAngleMode:value=>{options.angleMode=String(value).toUpperCase();context.modes[2]=options.angleMode==='DEG'?2:options.angleMode==='GRAD'?3:1;}, expression: source => evaluate(expressionTree(source), variables, options.angleMode || 'RAD', context), snapshot: () => ({ variables: Object.fromEntries([...Object.entries(variables).map(([name, value]) => [name, copy(value)]),...symbolic]), modes: { ...context.modes } }) });
}

export const api = Object.freeze({
  evaluate: evaluatePrgmExpression,
  format: formatPrgmValue,
  normalize: normalizeTiMath,
  parse: expressionTree,
  createSession: createMathSession,
  supportedFunctions: supportedMathFunctions,
});
if (typeof window !== 'undefined') window.TnsTiBasicMath = api;
export default api;
