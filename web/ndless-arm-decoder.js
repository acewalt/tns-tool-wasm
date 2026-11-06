(() => {
  "use strict";

  const CONDS = ["EQ","NE","CS","CC","MI","PL","VS","VC","HI","LS","GE","LT","GT","LE","AL","NV"];
  const REGS = ["r0","r1","r2","r3","r4","r5","r6","r7","r8","r9","r10","r11","r12","sp","lr","pc"];
  const SHIFT = ["lsl","lsr","asr","ror"];
  const DATA_OPS = ["and","eor","sub",null,"add",null,null,null,"tst",null,"cmp","cmn","orr","mov",null,"mvn"];
  const asBytes = (x) => x instanceof Uint8Array ? x : new Uint8Array(x || 0);
  const hex = (n,w=8) => `0x${(Number(n)>>>0).toString(16).toUpperCase().padStart(w,"0")}`;
  const reg = n => REGS[n & 15];
  const ror32 = (v,n) => n ? ((v>>>n)|(v<<(32-n)))>>>0 : v>>>0;
  const sign24 = n => (n & 0x800000) ? n | 0xff000000 : n;
  const condSuffix = c => c === 14 ? "" : CONDS[c].toLowerCase();

  function immediate(word){ const imm=word&0xff, rot=((word>>>8)&15)*2; return ror32(imm,rot); }
  function operand2(word){
    if (word & (1<<25)) return { text:`#${hex(immediate(word))}`, immediate:immediate(word) };
    const rm=word&15, byReg=Boolean(word&(1<<4)), type=(word>>>5)&3;
    if (byReg) return { text:`${reg(rm)}, ${SHIFT[type]} ${reg((word>>>8)&15)}`, rm, shift:SHIFT[type], shiftRegister:(word>>>8)&15 };
    let amount=(word>>>7)&31;
    if (!amount && type===0) return { text:reg(rm), rm };
    if (!amount && (type===1||type===2)) amount=32;
    if (!amount && type===3) return { text:`${reg(rm)}, rrx`, rm, shift:"rrx", amount:1 };
    return { text:`${reg(rm)}, ${SHIFT[type]} #${amount}`, rm, shift:SHIFT[type], amount };
  }
  function regList(mask){ const out=[]; for(let i=0;i<16;i++) if(mask&(1<<i)) out.push(reg(i)); return `{${out.join(", ")}}`; }
  function addressText(word){
    const rn=(word>>>16)&15, pre=Boolean(word&(1<<24)), up=Boolean(word&(1<<23)), wb=Boolean(word&(1<<21));
    let off;
    if (word&(1<<25)) { const op=operand2(word & ~(1<<25)); off=op.text; }
    else { const imm=word&0xfff; off=imm ? `#${up?"":"-"}${hex(imm,1)}` : ""; }
    if (word&(1<<25) && !up && off) off=`-${off}`;
    if (pre) return `[${reg(rn)}${off?`, ${off}`:""}]${wb?"!":""}`;
    return `[${reg(rn)}]${off?`, ${off}`:""}`;
  }

  function decodeWord(word, address=0){
    word >>>= 0; address >>>= 0;
    const cond=(word>>>28)&15, condition=CONDS[cond], suffix=condSuffix(cond);
    const base={ word, address, condition, recognized:true, mnemonic:"", operands:"", text:"", flow:"fallthrough" };

    if (cond===15 && ((word>>>25)&7)===5) {
      const h=(word>>>24)&1, imm=sign24(word&0xffffff)<<2, target=(address+8+imm+(h<<1))>>>0;
      return {...base,mnemonic:"blx",operands:hex(target),text:`blx ${hex(target)}`,target,flow:"call",call:true};
    }
    if ((word&0x0ffffff0)===0x012fff10 || (word&0x0ffffff0)===0x012fff30) {
      const call=(word&0x20)!==0, m=(call?"blx":"bx")+suffix, rm=word&15;
      return {...base,mnemonic:m,operands:reg(rm),text:`${m} ${reg(rm)}`,flow:call?"call":(rm===14?"return":"branch-register"),call,return:!call&&rm===14};
    }
    if (((word>>>25)&7)===5 && cond!==15) {
      const link=Boolean(word&(1<<24)), disp=(sign24(word&0xffffff)<<2), target=(address+8+disp)>>>0, m=(link?"bl":"b")+suffix;
      return {...base,mnemonic:m,operands:hex(target),text:`${m} ${hex(target)}`,target,flow:link?"call":(cond===14?"branch":"conditional-branch"),call:link,conditional:cond!==14};
    }
    if (((word>>>25)&7)===4) {
      const p=Boolean(word&(1<<24)),u=Boolean(word&(1<<23)),w=Boolean(word&(1<<21)),l=Boolean(word&(1<<20)),rn=(word>>>16)&15,list=word&0xffff;
      if (!l && rn===13 && p && !u && w) { const m=`push${suffix}`; return {...base,mnemonic:m,operands:regList(list),text:`${m} ${regList(list)}`,prologue:Boolean(list&(1<<14))}; }
      if (l && rn===13 && !p && u && w) { const m=`pop${suffix}`,ret=Boolean(list&(1<<15)); return {...base,mnemonic:m,operands:regList(list),text:`${m} ${regList(list)}`,flow:ret?"return":"fallthrough",return:ret}; }
      const mode=(!p&&u)?"ia":(p&&u)?"ib":(!p&&!u)?"da":"db",m=`${l?"ldm":"stm"}${mode}${suffix}`,ops=`${reg(rn)}${w?"!":""}, ${regList(list)}`;
      return {...base,mnemonic:m,operands:ops,text:`${m} ${ops}`,flow:l&&Boolean(list&(1<<15))?"return":"fallthrough",return:l&&Boolean(list&(1<<15))};
    }
    if (((word>>>26)&3)===1 && cond!==15) {
      const load=Boolean(word&(1<<20)),byte=Boolean(word&(1<<22)),rn=(word>>>16)&15,rd=(word>>>12)&15,m=`${load?"ldr":"str"}${byte?"b":""}${suffix}`,addr=addressText(word),ops=`${reg(rd)}, ${addr}`;
      const out={...base,mnemonic:m,operands:ops,text:`${m} ${ops}`,load,store:!load,byte,rn,rd};
      if (load && rn===15 && !(word&(1<<25)) && (word&(1<<24))) { const imm=word&0xfff,up=Boolean(word&(1<<23)); out.literalAddress=((address+8)+(up?imm:-imm))>>>0; }
      if (load && rd===15) out.flow="branch-register";
      return out;
    }
    if (((word>>>26)&3)===0 && cond!==15) {
      if ((word&0x0fc000f0)===0x00000090 || (word&0x0fb00ff0)===0x01000090) return unknown(word,address,condition);
      const opcode=(word>>>21)&15, name=DATA_OPS[opcode];
      if (name) {
        const rn=(word>>>16)&15,rd=(word>>>12)&15,op2=operand2(word),test=opcode===8||opcode===10||opcode===11,m=`${name}${suffix}`;
        let ops;
        if (opcode===13||opcode===15) ops=`${reg(rd)}, ${op2.text}`;
        else if (test) ops=`${reg(rn)}, ${op2.text}`;
        else ops=`${reg(rd)}, ${reg(rn)}, ${op2.text}`;
        const ret=(opcode===13 && rd===15 && op2.rm===14 && !op2.shift);
        return {...base,mnemonic:m,operands:ops,text:`${m} ${ops}`,opcode,rn,rd,operand2:op2,setsFlags:Boolean(word&(1<<20))||test,flow:ret?"return":"fallthrough",return:ret};
      }
    }
    return unknown(word,address,condition);
  }

  function unknown(word,address,condition){ return {word:word>>>0,address:address>>>0,condition,recognized:false,mnemonic:".word",operands:hex(word),text:`.word ${hex(word)}`,flow:"fallthrough"}; }

  function disassemble(bytesInput, options={}){
    const bytes=asBytes(bytesInput),start=Math.max(0,options.start||0),end=Math.min(bytes.length,options.end??bytes.length),runtimeBase=(options.runtimeBase||0)>>>0,fileOffsetBase=options.fileOffsetBase===null?null:(options.fileOffsetBase??0),containerOffsetBase=options.containerOffsetBase===null?null:(options.containerOffsetBase??0);
    const out=[]; const aligned=start+(start%4?4-start%4:0); const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    for(let off=aligned;off+4<=end;off+=4){const address=(runtimeBase+(off-start))>>>0,word=view.getUint32(off,true),ins=decodeWord(word,address);out.push({...ins,imageOffset:off,fileOffset:fileOffsetBase==null?null:fileOffsetBase+(off-start),containerOffset:containerOffsetBase==null?null:containerOffsetBase+(off-start),bytes:Array.from(bytes.subarray(off,off+4))});}
    return out;
  }

  function readCStringAtAddress(bytesInput,address,model,maxLen=160){
    const bytes=asBytes(bytesInput); const off=model?.runtimeToImage?model.runtimeToImage(address):null; if(off==null||off<0||off>=bytes.length)return null;
    let end=off; while(end<bytes.length&&end-off<maxLen&&bytes[end]!==0){const b=bytes[end]; if(b<32||b>126)return null; end++;}
    if(end===off||end>=bytes.length||bytes[end]!==0)return null; return String.fromCharCode(...bytes.subarray(off,end));
  }

  function annotatePcRelative(instructions, bytes, model){
    return instructions.map(ins=>{if(ins.literalAddress==null)return ins;const literalOff=model?.runtimeToImage?.(ins.literalAddress);if(literalOff==null||literalOff<0||literalOff+4>bytes.length)return ins;const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(literalOff,true);const str=readCStringAtAddress(bytes,v,model);return str?{...ins,comment:`\"${str}\"`,resolvedLiteral:v}:{...ins,resolvedLiteral:v};});
  }

  window.NdlessArmDecoder=Object.freeze({CONDS,REGS,decodeWord,disassemble,annotatePcRelative,hex});
})();
