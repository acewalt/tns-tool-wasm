(() => {
  "use strict";
  const hex=(n,w=8)=>`0x${(Number(n)>>>0).toString(16).toUpperCase().padStart(w,"0")}`;
  const internal=(addr,min,max)=>Number.isInteger(addr)&&addr>=min&&addr<max&&((addr-min)&3)===0;
  const fnName=(address,entry)=>address===entry?"entry":`sub_${(address>>>0).toString(16).toUpperCase().padStart(8,"0")}`;

  function detectFunctions(instructions, entry){
    if(!instructions.length)return[];const min=instructions[0].address,max=instructions[instructions.length-1].address+4,starts=new Set();
    if(internal(entry,min,max))starts.add(entry>>>0);
    for(const ins of instructions){if(ins.call&&internal(ins.target,min,max))starts.add(ins.target>>>0);if(ins.prologue)starts.add(ins.address>>>0);}
    const sorted=[...starts].sort((a,b)=>a-b);if(!sorted.length)sorted.push(min);
    return sorted.map((start,i)=>({address:start,name:fnName(start,entry),end:sorted[i+1]??max,source:"heuristic"}));
  }

  function instructionsForFunction(instructions,fn){return instructions.filter(i=>i.address>=fn.address&&i.address<fn.end);}

  function buildCfg(instructions,fn){
    const rows=instructionsForFunction(instructions,fn);if(!rows.length)return{blocks:[],edges:[]};const leaders=new Set([fn.address]);const byAddr=new Map(rows.map(i=>[i.address,i]));
    for(const ins of rows){const next=ins.address+4;if((ins.flow==="branch"||ins.flow==="conditional-branch")&&byAddr.has(ins.target))leaders.add(ins.target);if((ins.flow==="conditional-branch"||ins.flow==="call")&&byAddr.has(next))leaders.add(next);if((ins.flow==="branch"||ins.return)&&byAddr.has(next))leaders.add(next);}
    const starts=[...leaders].sort((a,b)=>a-b),blocks=[];for(let i=0;i<starts.length;i++){const start=starts[i],end=starts[i+1]??fn.end,insns=rows.filter(x=>x.address>=start&&x.address<end);if(insns.length)blocks.push({id:`block_${hex(start)}`,start,end:insns[insns.length-1].address+4,instructions:insns});}
    const edges=[];const blockStarts=new Set(blocks.map(b=>b.start));for(const block of blocks){const last=block.instructions.at(-1),next=last.address+4;if(last.call){if(last.target!=null)edges.push({from:block.start,to:last.target,type:"call"});if(blockStarts.has(next))edges.push({from:block.start,to:next,type:"fallthrough"});continue;}if(last.return){edges.push({from:block.start,to:null,type:"return"});continue;}if(last.flow==="branch"){edges.push({from:block.start,to:last.target,type:"unconditional"});continue;}if(last.flow==="conditional-branch"){edges.push({from:block.start,to:last.target,type:"true",condition:last.condition});if(blockStarts.has(next))edges.push({from:block.start,to:next,type:"false"});continue;}if(blockStarts.has(next))edges.push({from:block.start,to:next,type:"fallthrough"});}
    return{blocks,edges};
  }

  function buildCallGraph(instructions,functions,entry){const known=new Set(functions.map(f=>f.address)),edges=[];for(const fn of functions){for(const ins of instructionsForFunction(instructions,fn)){if(ins.call&&known.has(ins.target))edges.push({from:fn.address,to:ins.target,fromName:fn.name,toName:fnName(ins.target,entry),at:ins.address});}}return{nodes:functions.map(f=>({address:f.address,name:f.name})),edges};}

  function opText(op){if(!op)return"?";return op.text?.replace(/#0x([0-9A-F]+)/i,"0x$1")||"?";}
  function pseudocodeForFunction(instructions,fn,entry){const lines=[`${fn.name}() {`];for(const ins of instructionsForFunction(instructions,fn)){let s="";const m=ins.mnemonic.replace(/(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le)$/i,"").toLowerCase();if(m==="mov")s=`${window.NdlessArmDecoder.REGS[ins.rd]} = ${opText(ins.operand2)};`;else if(["add","sub","and","orr","eor"].includes(m)){const sym={add:"+",sub:"-",and:"&",orr:"|",eor:"^"}[m];s=`${window.NdlessArmDecoder.REGS[ins.rd]} = ${window.NdlessArmDecoder.REGS[ins.rn]} ${sym} ${opText(ins.operand2)};`;}else if(["cmp","cmn","tst"].includes(m))s=`/* ${ins.text} */`;else if(ins.call&&ins.target!=null)s=`${fnName(ins.target,entry)}();`;else if(ins.return)s="return;";else if(ins.flow==="conditional-branch")s=`if (${ins.condition}) goto label_${hex(ins.target).slice(2)};`;else if(ins.flow==="branch")s=`goto label_${hex(ins.target).slice(2)};`;else if(m.startsWith("ldr"))s=`${window.NdlessArmDecoder.REGS[ins.rd]} = mem_${ins.literalAddress!=null?hex(ins.literalAddress).slice(2):"..."};`;else if(m.startsWith("str"))s=`mem_... = ${window.NdlessArmDecoder.REGS[ins.rd]};`;if(s)lines.push(`  ${s}`);}lines.push("}");return lines.join("\n");}

  function scanStrings(bytes,start,end,minLen=4){const out=[],seen=new Set(),fatal=new TextDecoder("utf-8",{fatal:true});start=Math.max(0,start);end=Math.min(bytes.length,end);let i=start;while(i<end){const s=i;while(i<end&&bytes[i]!==0&&i-s<512)i++;if(i<end&&bytes[i]===0&&i-s>=minLen){try{const value=fatal.decode(bytes.subarray(s,i));if(value.length>=minLen&&![...value].some(ch=>ch.charCodeAt(0)<32&&ch!=="\t")){const ascii=[...bytes.subarray(s,i)].every(b=>b>=32&&b<=126);out.push({kind:"Detected string",encoding:ascii?"ASCII":"UTF-8",offset:s,length:i-s,value,nullTerminated:true});seen.add(s);}}catch(_){}}i=Math.max(i+1,s+1);if(out.length>=1200)break;}i=start;while(i<end&&out.length<1500){const s=i;while(i<end&&bytes[i]>=32&&bytes[i]<=126)i++;if(i-s>=minLen&&!seen.has(s))out.push({kind:"Detected string",encoding:"ASCII",offset:s,length:i-s,value:String.fromCharCode(...bytes.subarray(s,i)),nullTerminated:i<end&&bytes[i]===0});i=Math.max(i+1,s+1);}return out;}

  function scanNumericCandidates(bytes,start,end,limit=500){const out=[];start=Math.max(0,start+(start%4?4-start%4:0));end=Math.min(bytes.length,end);const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);for(let off=start;off+4<=end&&out.length<limit;off+=4){const u=v.getUint32(off,true),s=v.getInt32(off,true),f=v.getFloat32(off,true);if(u!==0&&Math.abs(s)<=1000000000)out.push({kind:"Integer candidate",offset:off,value:s,raw:u});if(Number.isFinite(f)&&Math.abs(f)>=1e-12&&Math.abs(f)<=1e12&&!Number.isInteger(f)&&out.length<limit)out.push({kind:"Float32 candidate",offset:off,value:f,raw:u});}return out;}

  function analyze(model){const instructions=window.NdlessArmDecoder.disassemble(model.image,{start:model.codeStart,end:model.codeEnd,runtimeBase:model.runtimeBase,fileOffsetBase:model.fileOffsetBase,containerOffsetBase:model.containerOffsetBase});const annotated=window.NdlessArmDecoder.annotatePcRelative(instructions,model.image,model);const functions=detectFunctions(annotated,model.entry);const cfg=new Map(functions.map(fn=>[fn.address,buildCfg(annotated,fn)]));const callGraph=buildCallGraph(annotated,functions,model.entry);return{instructions:annotated,functions,cfg,callGraph,pseudocode:new Map(functions.map(fn=>[fn.address,pseudocodeForFunction(annotated,fn,model.entry)]))};}

  window.NdlessAnalysis=Object.freeze({detectFunctions,buildCfg,buildCallGraph,pseudocodeForFunction,scanStrings,scanNumericCandidates,analyze,fnName,hex});
})();
