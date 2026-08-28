(() => {
  "use strict";

  const REGS = ["arg0","arg1","arg2","arg3","local_r4","local_r5","local_r6","local_r7","local_r8","local_r9","local_r10","local_r11","local_r12","sp","lr","pc"];
  const hex = (n,w=8) => `0x${(Number(n)>>>0).toString(16).toUpperCase().padStart(w,"0")}`;
  const ror32 = (v,n) => n ? ((v>>>n)|(v<<(32-n)))>>>0 : v>>>0;
  const rol32 = (v,n) => n ? ((v<<n)|(v>>>(32-n)))>>>0 : v>>>0;

  function baseMnemonic(ins) {
    let m=String(ins?.mnemonic||"").toLowerCase();
    const c=String(ins?.condition||"AL").toLowerCase();
    if(c!=="al"&&m.endsWith(c))m=m.slice(0,-c.length);
    return m;
  }

  function encodeArmImmediate(value) {
    value=Number(value)>>>0;
    for(let rot=0;rot<16;rot+=1){
      const candidate=rol32(value,rot*2);
      if((candidate&~0xff)===0&&ror32(candidate,rot*2)===value)return {imm:candidate&0xff,rot,bits:((rot&15)<<8)|(candidate&0xff)};
    }
    return null;
  }

  function patchDataProcessingImmediate(word,value) {
    word=Number(word)>>>0;
    if(!(word&(1<<25)))throw new Error("This ARM instruction does not use an immediate operand.");
    const encoded=encodeArmImmediate(value);
    if(!encoded)throw new Error("This value cannot be represented by the ARM rotated 8-bit immediate used by this instruction.");
    return ((word&~0xfff)|encoded.bits)>>>0;
  }

  function wordBytesLE(word){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,Number(word)>>>0,true);return b;}

  function operandExpression(ins) {
    const op=ins?.operand2;
    if(!op)return "value";
    if(op.immediate!=null)return String(op.immediate>>>0);
    if(op.rm!=null){
      let out=REGS[op.rm]||`r${op.rm}`;
      if(op.shift){
        if(op.shift==="rrx")out=`rrx(${out})`;
        else if(op.shiftRegister!=null)out=`${op.shift}(${out}, ${REGS[op.shiftRegister]||`r${op.shiftRegister}`})`;
        else if(op.amount!=null)out=`${op.shift}(${out}, ${op.amount})`;
      }
      return out;
    }
    return op.text||"value";
  }

  function conditionExpression(condition,lastCompare) {
    if(!lastCompare)return `condition_${String(condition||"AL").toLowerCase()}`;
    const [a,b]=lastCompare;
    const ops={EQ:"==",NE:"!=",CS:">=",CC:"<",HI:">",LS:"<=",GE:">=",LT:"<",GT:">",LE:"<=",MI:"< 0 /* signed */",PL:">= 0 /* signed */"};
    const op=ops[condition];
    if(!op)return `condition_${String(condition||"AL").toLowerCase()}`;
    if(condition==="MI"||condition==="PL")return `${a} ${op}`;
    return `${a} ${op} ${b}`;
  }

  function readableCode(instructions,fn,entry=0) {
    const rows=Array.isArray(instructions)?instructions:[];
    const branchTargets=new Set(rows.filter(i=>i?.target!=null&&!i.call).map(i=>i.target>>>0));
    const lines=[];
    const source=[];
    const emit=(text,address=null,kind="code")=>{lines.push(text);source.push({line:lines.length,address,kind});};
    const name=fn?.name||`sub_${(Number(fn?.address||0)>>>0).toString(16).toUpperCase().padStart(8,"0")}`;
    emit("// Reconstructed C-like view. Names and types are inferred.",null,"comment");
    emit("// Open Assembly for the exact machine instructions.",null,"comment");
    emit(`function ${name}(arg0, arg1, arg2, arg3) {`,fn?.address,"function");
    let lastCompare=null;
    for(const ins of rows){
      if(branchTargets.has(ins.address))emit(`label_${hex(ins.address).slice(2)}:`,ins.address,"label");
      const m=baseMnemonic(ins),rd=REGS[ins.rd]||`r${ins.rd}`,rn=REGS[ins.rn]||`r${ins.rn}`,op=operandExpression(ins);
      if(m==="push"||m==="pop"||m==="stmia"||m==="stmdb"||m==="ldmia"||m==="ldmdb"){
        if(ins.return)emit("  return arg0;",ins.address,"return");
        continue;
      }
      if(m==="mov"||m==="mvn"){
        emit(`  ${rd} = ${m==="mvn"?`~(${op})`:op};`,ins.address,"assign");
        continue;
      }
      if(["add","sub","and","orr","eor"].includes(m)){
        const sym={add:"+",sub:"-",and:"&",orr:"|",eor:"^"}[m];
        emit(`  ${rd} = ${rn} ${sym} ${op};`,ins.address,"assign");
        continue;
      }
      if(["cmp","cmn","tst"].includes(m)){
        lastCompare=[rn,op];
        emit(`  // compare ${rn} with ${op}`,ins.address,"compare");
        continue;
      }
      if(ins.call){
        const target=ins.target==null?"indirect_call":(ins.target===entry?"entry":`sub_${(ins.target>>>0).toString(16).toUpperCase().padStart(8,"0")}`);
        emit(`  arg0 = ${target}(arg0, arg1, arg2, arg3);`,ins.address,"call");
        continue;
      }
      if(ins.return){emit("  return arg0;",ins.address,"return");continue;}
      if(ins.flow==="conditional-branch"){
        emit(`  if (${conditionExpression(ins.condition,lastCompare)}) goto label_${hex(ins.target).slice(2)};`,ins.address,"branch");
        continue;
      }
      if(ins.flow==="branch"){
        emit(`  goto label_${hex(ins.target).slice(2)};`,ins.address,"branch");
        continue;
      }
      if(m.startsWith("ldr")){
        if(ins.comment)emit(`  ${rd} = ${ins.comment};`,ins.address,"load");
        else if(ins.resolvedLiteral!=null)emit(`  ${rd} = *(uint32_t*)${hex(ins.resolvedLiteral)};`,ins.address,"load");
        else emit(`  ${rd} = /* memory load: ${String(ins.operands||"")} */ 0;`,ins.address,"load");
        continue;
      }
      if(m.startsWith("str")){
        emit(`  /* store ${rd} -> ${String(ins.operands||"memory")} */`,ins.address,"store");
        continue;
      }
      if(!ins.recognized)emit(`  /* ${String(ins.text||"unknown instruction")} */`,ins.address,"unknown");
    }
    if(!rows.some(i=>i?.return))emit("  // return path not recovered in this block",null,"comment");
    emit("}",fn?.end,"function-end");
    return {code:lines.join("\n"),lines:source};
  }

  function immediateCandidates(instructions) {
    const allowed=new Set(["mov","mvn","add","sub","cmp","cmn","tst","and","orr","eor"]);
    return (instructions||[]).filter(ins=>allowed.has(baseMnemonic(ins))&&ins?.operand2?.immediate!=null).map(ins=>({
      address:ins.address>>>0,
      imageOffset:ins.imageOffset,
      fileOffset:ins.fileOffset,
      word:ins.word>>>0,
      value:ins.operand2.immediate>>>0,
      mnemonic:baseMnemonic(ins),
      label:["cmp","cmn","tst"].includes(baseMnemonic(ins))?"Comparison value":["add","sub"].includes(baseMnemonic(ins))?"Arithmetic value":"Assigned constant",
      instruction:ins.text,
    }));
  }

  window.NdlessFriendlyCore=Object.freeze({encodeArmImmediate,patchDataProcessingImmediate,wordBytesLE,readableCode,immediateCandidates,baseMnemonic,hex});
})();
