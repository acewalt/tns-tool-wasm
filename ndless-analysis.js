(() => {
  "use strict";

  const DEFAULT_MAX_FUNCTIONS = 4000;
  const DEFAULT_MAX_CALL_EDGES = 12000;
  const DEFAULT_MAX_PSEUDOCODE_INSTRUCTIONS = 320;
  const hex = (n,w=8)=>n==null?"N/A":`0x${(Number(n)>>>0).toString(16).toUpperCase().padStart(w,"0")}`;
  const fnName=(address,entry)=>address===entry?"entry":`sub_${(address>>>0).toString(16).toUpperCase().padStart(8,"0")}`;
  const internal=(addr,min,max)=>Number.isInteger(addr)&&addr>=min&&addr<max&&((addr-min)&3)===0;

  function lowerBound(rows,address){let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid].address<address)lo=mid+1;else hi=mid;}return lo;}
  function instructionsForFunction(instructions,fn,limit=Infinity){if(!fn)return[];const s=Number.isInteger(fn.startInstructionIndex)?fn.startInstructionIndex:lowerBound(instructions,fn.address);const e=Number.isInteger(fn.endInstructionIndex)?fn.endInstructionIndex:lowerBound(instructions,fn.end);return instructions.slice(s,Math.min(e,s+limit));}
  function attachRanges(instructions,functions){for(const fn of functions){fn.startInstructionIndex=lowerBound(instructions,fn.address);fn.endInstructionIndex=lowerBound(instructions,fn.end);}return functions;}

  function detectFunctions(instructions,entry,options={}){
    if(!instructions.length)return[];
    const maxFunctions=options.maxFunctions??DEFAULT_MAX_FUNCTIONS,min=instructions[0].address,max=instructions.at(-1).address+4,starts=new Set();
    const add=address=>{if(internal(address,min,max)&&starts.size<maxFunctions)starts.add(address>>>0);};
    add(entry);
    for(const ins of instructions){if(ins.call)add(ins.target);if(ins.prologue)add(ins.address);}
    const sorted=[...starts].sort((a,b)=>a-b);if(!sorted.length)sorted.push(min);
    return attachRanges(instructions,sorted.map((start,i)=>({address:start,name:fnName(start,entry),end:sorted[i+1]??max,source:start===entry?"entry":"heuristic",isa:"arm"})));
  }

  function buildCfg(instructions,fn){
    const rows=instructionsForFunction(instructions,fn);if(!rows.length)return{blocks:[],edges:[]};
    const leaders=new Set([rows[0].address]),byAddr=new Map(rows.map(i=>[i.address,i]));
    for(const ins of rows){const next=ins.address+4;if((ins.flow==="branch"||ins.flow==="conditional-branch")&&byAddr.has(ins.target))leaders.add(ins.target);if((ins.flow==="conditional-branch"||ins.call)&&byAddr.has(next))leaders.add(next);if((ins.flow==="branch"||ins.return)&&byAddr.has(next))leaders.add(next);}
    const starts=[...leaders].sort((a,b)=>a-b),blocks=[];
    for(let i=0;i<starts.length;i++){const start=starts[i],end=starts[i+1]??fn.end,s=lowerBound(rows,start),e=lowerBound(rows,end),insns=rows.slice(s,e);if(insns.length)blocks.push({id:`block_${hex(start)}`,start,end:insns.at(-1).address+4,instructions:insns});}
    const edges=[],blockStarts=new Set(blocks.map(b=>b.start));
    for(const block of blocks){const last=block.instructions.at(-1),next=last.address+4;if(last.call){if(last.target!=null)edges.push({from:block.start,to:last.target,type:"call"});if(blockStarts.has(next))edges.push({from:block.start,to:next,type:"fallthrough"});continue;}if(last.return){edges.push({from:block.start,to:null,type:"return"});continue;}if(last.flow==="branch"){edges.push({from:block.start,to:last.target,type:"unconditional"});continue;}if(last.flow==="conditional-branch"){edges.push({from:block.start,to:last.target,type:"true",condition:last.condition});if(blockStarts.has(next))edges.push({from:block.start,to:next,type:"false"});continue;}if(blockStarts.has(next))edges.push({from:block.start,to:next,type:"fallthrough"});}
    return{blocks,edges};
  }

  function opText(op){return op?.text?.replace(/#0x([0-9A-F]+)/i,"0x$1")||"?";}
  function pseudocodeForFunction(instructions,fn,entry,options={}){const limit=options.maxInstructions??DEFAULT_MAX_PSEUDOCODE_INSTRUCTIONS,rows=instructionsForFunction(instructions,fn,limit),lines=[`${fn.name}() {`];for(const ins of rows){let s="";const m=ins.mnemonic.replace(/(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)$/i,"").toLowerCase();if(m==="mov")s=`${window.NdlessArmDecoder.REGS[ins.rd]} = ${opText(ins.operand2)};`;else if(["add","sub","and","orr","eor"].includes(m)){const sym={add:"+",sub:"-",and:"&",orr:"|",eor:"^"}[m];s=`${window.NdlessArmDecoder.REGS[ins.rd]} = ${window.NdlessArmDecoder.REGS[ins.rn]} ${sym} ${opText(ins.operand2)};`;}else if(["cmp","cmn","tst"].includes(m))s=`/* ${ins.text} */`;else if(ins.call&&ins.target!=null)s=`${fnName(ins.target,entry)}();`;else if(ins.return)s="return;";else if(ins.flow==="conditional-branch")s=`if (${ins.condition}) goto label_${hex(ins.target).slice(2)};`;else if(ins.flow==="branch")s=`goto label_${hex(ins.target).slice(2)};`;else if(m.startsWith("ldr"))s=`${window.NdlessArmDecoder.REGS[ins.rd]} = mem_${ins.literalAddress!=null?hex(ins.literalAddress).slice(2):"..."};`;else if(m.startsWith("str"))s=`mem_... = ${window.NdlessArmDecoder.REGS[ins.rd]};`;if(s)lines.push(`  ${s}`);}if(rows.length>=limit)lines.push("  /* truncated */");lines.push("}");return lines.join("\n");}

  function buildCallGraph(instructions,functions,entry,options={}){const maxEdges=options.maxCallEdges??DEFAULT_MAX_CALL_EDGES,known=new Set(functions.map(f=>f.address)),edges=[];for(const fn of functions){for(const ins of instructionsForFunction(instructions,fn)){if(ins.call&&known.has(ins.target)){if(edges.length>=maxEdges)return{nodes:functions,edges,truncated:true};edges.push({from:fn.address,to:ins.target,fromName:fn.name,toName:fnName(ins.target,entry),at:ins.address});}}}return{nodes:functions,edges,truncated:false};}

  function reachableDisassemble(model,options={}){
    const maxInstructions=options.maxInstructions??250000,maxFunctions=options.maxFunctions??DEFAULT_MAX_FUNCTIONS,image=model.image,min=model.codeStart??0,max=Math.min(model.codeEnd??image.length,image.length),entry=model.entry??model.runtimeBase??min;
    const queue=[entry>>>0],queued=new Set(queue),decoded=new Map(),functions=new Set([entry>>>0]),warnings=[];let steps=0;
    const runtimeBase=model.runtimeBase??entry;
    const toImage=address=>model.runtimeToImage?model.runtimeToImage(address):min+(address-runtimeBase);
    const addTarget=(address,isFunction=false)=>{if(!internal(address,runtimeBase,runtimeBase+(max-min)))return;if(isFunction&&functions.size<maxFunctions)functions.add(address>>>0);if(!decoded.has(address)&&!queued.has(address)){queued.add(address);queue.push(address>>>0);}};
    while(queue.length&&steps<maxInstructions){let address=queue.shift();queued.delete(address);while(steps<maxInstructions){if(decoded.has(address))break;const off=toImage(address);if(off==null||off<min||off+4>max)break;const word=new DataView(image.buffer,image.byteOffset,image.byteLength).getUint32(off,true),ins=window.NdlessArmDecoder.decodeWord(word,address);const row={...ins,imageOffset:off,fileOffset:model.fileOffsetBase==null?null:model.fileOffsetBase+(off-min),containerOffset:model.containerOffsetBase==null?null:model.containerOffsetBase+(off-min),bytes:Array.from(image.subarray(off,off+4))};decoded.set(address,row);steps++;
        const next=(address+4)>>>0;
        if(ins.call){if(ins.target!=null)addTarget(ins.target,true);address=next;continue;}
        if(ins.flow==="conditional-branch"){if(ins.target!=null)addTarget(ins.target,false);address=next;continue;}
        if(ins.flow==="branch"){if(ins.target!=null)addTarget(ins.target,false);break;}
        if(ins.return||ins.flow==="branch-register")break;
        address=next;
      }}
    if(queue.length)warnings.push(`Reachable analysis stopped after ${steps} instructions; more code remains queued.`);
    const instructions=[...decoded.values()].sort((a,b)=>a.address-b.address);
    const annotated=window.NdlessArmDecoder.annotatePcRelative(instructions,image,model);
    const starts=[...functions].filter(a=>decoded.has(a)).sort((a,b)=>a-b);if(!starts.length&&annotated.length)starts.push(annotated[0].address);
    const fnRows=attachRanges(annotated,starts.map((start,i)=>({address:start,name:fnName(start,entry),end:starts[i+1]??(annotated.at(-1)?.address+4??start+4),source:start===entry?"entry":"call-target",isa:"arm"})));
    return{instructions:annotated,functions:fnRows,warnings,decodedInstructionCount:annotated.length,analysisMode:"reachable",truncated:queue.length>0};
  }

  function finalize(base,model,options={}){const {instructions,functions,warnings=[],truncated=false}=base,callGraph=buildCallGraph(instructions,functions,model.entry,options),cfgCache=new Map(),pseudoCache=new Map();const getFunction=x=>typeof x==="object"?x:functions.find(f=>f.address===Number(x))||functions[0]||null;const cfgForFunction=x=>{const fn=getFunction(x);if(!fn)return null;if(!cfgCache.has(fn.address))cfgCache.set(fn.address,buildCfg(instructions,fn));return cfgCache.get(fn.address);};const pseudoFor=x=>{const fn=getFunction(x);if(!fn)return"";if(!pseudoCache.has(fn.address))pseudoCache.set(fn.address,pseudocodeForFunction(instructions,fn,model.entry,options));return pseudoCache.get(fn.address);};if(functions[0]){cfgForFunction(functions[0]);pseudoFor(functions[0]);}return{...base,cfg:cfgCache,pseudocode:pseudoCache,callGraph,cfgForFunction,pseudocodeForFunction:pseudoFor,instructionsForFunction:(x,limit=Infinity)=>instructionsForFunction(instructions,getFunction(x),limit),warnings:[...warnings,...(callGraph.truncated?[`Call graph limited to ${callGraph.edges.length} edges.`]:[])],truncated};}
  function analyze(model,options={}){const mode=options.mode||"reachable";if(mode==="reachable")return finalize(reachableDisassemble(model,options),model,options);const instructions=window.NdlessArmDecoder.annotatePcRelative(window.NdlessArmDecoder.disassemble(model.image,{start:model.codeStart,end:model.codeEnd,runtimeBase:model.runtimeBase,fileOffsetBase:model.fileOffsetBase,containerOffsetBase:model.containerOffsetBase}),model.image,model),functions=detectFunctions(instructions,model.entry,options);return finalize({instructions,functions,warnings:[],decodedInstructionCount:instructions.length,analysisMode:"full",truncated:false},model,options);}

  function scanStrings(bytes,start,end,minLen=4){const out=[],seen=new Set(),fatal=new TextDecoder("utf-8",{fatal:true});start=Math.max(0,start);end=Math.min(bytes.length,end);let i=start;while(i<end){const s=i;while(i<end&&bytes[i]!==0&&i-s<512)i++;if(i<end&&bytes[i]===0&&i-s>=minLen){try{const value=fatal.decode(bytes.subarray(s,i));if(value.length>=minLen&&![...value].some(ch=>ch.charCodeAt(0)<32&&ch!=="\t")){const ascii=[...bytes.subarray(s,i)].every(b=>b>=32&&b<=126);out.push({kind:"Detected string",encoding:ascii?"ASCII":"UTF-8",offset:s,length:i-s,value,nullTerminated:true});seen.add(s);}}catch(_){}}i=Math.max(i+1,s+1);if(out.length>=1200)break;}i=start;while(i<end&&out.length<1500){const s=i;while(i<end&&bytes[i]>=32&&bytes[i]<=126)i++;if(i-s>=minLen&&!seen.has(s))out.push({kind:"Detected string",encoding:"ASCII",offset:s,length:i-s,value:String.fromCharCode(...bytes.subarray(s,i)),nullTerminated:i<end&&bytes[i]===0});i=Math.max(i+1,s+1);}return out;}
  function scanNumericCandidates(bytes,start,end,limit=500){const out=[];start=Math.max(0,start+(start%4?4-start%4:0));end=Math.min(bytes.length,end);const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let off=start;off+4<=end&&out.length<limit;off+=4){const u=v.getUint32(off,true),s=v.getInt32(off,true),f=v.getFloat32(off,true);if(u!==0&&Math.abs(s)<=1e9)out.push({kind:"Integer candidate",offset:off,value:s,raw:u});if(Number.isFinite(f)&&Math.abs(f)>=1e-12&&Math.abs(f)<=1e12&&!Number.isInteger(f)&&out.length<limit)out.push({kind:"Float32 candidate",offset:off,value:f,raw:u});}return out;}

  window.NdlessAnalysis=Object.freeze({detectFunctions,buildCfg,buildCallGraph,pseudocodeForFunction,scanStrings,scanNumericCandidates,analyze,reachableDisassemble,fnName,hex,DEFAULT_MAX_FUNCTIONS});
})();