(() => {
  "use strict";
  const asBytes=x=>x instanceof Uint8Array?x:new Uint8Array(x||0);
  const clone=x=>new Uint8Array(asBytes(x));
  const clamp24=n=>Math.max(0,Math.min(0xffffff,Number(n)||0));
  const encoder=new TextEncoder();

  function writePackedData(bytes,offset,type,data){const d=clamp24(data);bytes[offset]=type&0xff;bytes[offset+1]=d&0xff;bytes[offset+2]=(d>>>8)&0xff;bytes[offset+3]=(d>>>16)&0xff;}
  function cStringCapacity(bytes,start,end){let i=start;while(i<end&&bytes[i]!==0)i++;return Math.max(0,i-start);}
  function patchCString(bytes,start,end,value){const enc=encoder.encode(String(value??"")),cap=cStringCapacity(bytes,start,end);if(enc.length>cap)throw new Error(`Text uses ${enc.length} bytes; reserved capacity is ${cap}.`);bytes.fill(0,start,Math.min(end,start+cap+1));bytes.set(enc,start);}
  function patchRange(bytes,offset,values){const v=asBytes(values);if(!Number.isInteger(offset)||offset<0||offset+v.length>bytes.length)throw new Error("Patch range is outside the working image.");bytes.set(v,offset);}

  async function createZehn(result){
    const container=clone(result.bytes),working=await window.NdlessZehn.inflateExecutable(container,result),h=result.header,l=result.layout;
    const adapter={format:"zehn",formatLabel:result.formatLabel,typeLabel:result.typeLabel,architecture:"ARM",result,containerBytes:container,workingBytes:working,originalSize:container.length,
      entry:h.entryOffset,entryLabel:"Entry point",compression:result.compression,relocations:result.relocs,metadata:result.metadata,
      stringsRanges:[{start:0,end:working.length,label:"exec_data"}],dataRanges:[{start:0,end:working.length,label:"exec_data (heuristic data candidates)"}],
      memoryMap:()=>window.NdlessZehn.memoryMap(result,working.length),
      model:{image:working,codeStart:0,codeEnd:working.length,runtimeBase:0,entry:h.entryOffset,fileOffsetBase:result.compressed?null:l.execStart,containerOffsetBase:l.metaSize,runtimeToImage:a=>a>=0&&a<working.length?a:null},
      patchWorking:(off,vals)=>patchRange(working,off,vals),
      patchContainer:(off,vals)=>{const v=asBytes(vals);patchRange(container,off,v);if(!result.compressed&&off>=l.execStart&&off+v.length<=l.containerEnd)patchRange(working,off-l.execStart,v);},
      patchMetaString(type,value){const f=result.flags.find(x=>x.type===type);if(!f)throw new Error("Metadata field is not present; adding new Zehn flags is not enabled.");patchCString(container,l.extraStart+f.data,l.extraEnd,value);},
      patchMetaValue(type,value){const f=result.flags.find(x=>x.type===type);if(!f)throw new Error("Zehn flag is not present.");writePackedData(container,l.flagStart+f.index*4,type,value);},
      async validate(){const reparsed=window.NdlessZehn.findZehn(container);if(!reparsed?.valid)throw new Error("Zehn metadata/container validation failed.");const rebuilt=await window.NdlessZehn.rebuild(container,reparsed,working);return rebuilt;},
      async build(){return this.validate();},
    };return adapter;
  }

  async function createBflt(result){
    const container=clone(result.bytes),working=result.logicalBytes?clone(result.logicalBytes):await window.NdlessBflt.logicalImage(container,result),h=result.header;
    const physicalCode=(result.compressed&&(h.flags&window.NdlessBflt.FLAGS.GZIP))?null:h.entry;
    return {format:"bflt",formatLabel:result.formatLabel,typeLabel:result.typeLabel,architecture:"ARM",result,containerBytes:container,workingBytes:working,originalSize:container.length,
      entry:h.entry,entryLabel:"Entry point",compression:result.compression,relocations:result.relocs||[],metadata:null,
      stringsRanges:[{start:h.dataStart,end:h.dataEnd,label:".data"}],dataRanges:[{start:h.dataStart,end:h.dataEnd,label:".data"}],memoryMap:()=>window.NdlessBflt.memoryMap(result),
      model:{image:working,codeStart:h.entry,codeEnd:h.dataStart,runtimeBase:h.entry,entry:h.entry,fileOffsetBase:physicalCode,containerOffsetBase:h.entry,runtimeToImage:a=>a>=0&&a<working.length?a:null},
      patchWorking:(off,vals)=>patchRange(working,off,vals),patchContainer:(off,vals)=>{if(result.compressed)throw new Error("Physical raw patches are blocked for compressed bFLT; patch the logical image and rebuild instead.");patchRange(working,off,vals);patchRange(container,off,vals);},
      async validate(){const built=await window.NdlessBflt.rebuild(container,result,working);return built;},async build(){return this.validate();},
    };
  }

  async function createPrg(result){
    const working=clone(result.bytes);return {format:"prg",formatLabel:"PRG",typeLabel:"Ndless Legacy",architecture:"ARM",result,containerBytes:working,workingBytes:working,originalSize:working.length,
      entry:4,entryLabel:"Analysis start (legacy crt0)",compression:"none",relocations:[],metadata:null,
      stringsRanges:[{start:4,end:working.length,label:"known PRG payload"}],dataRanges:[{start:4,end:working.length,label:"known PRG payload (heuristic candidates)"}],memoryMap:()=>window.NdlessPrg.memoryMap(result,working.length),
      model:{image:working,codeStart:4,codeEnd:working.length,runtimeBase:4,entry:4,fileOffsetBase:4,containerOffsetBase:4,runtimeToImage:a=>a>=4&&a<working.length?a:null},
      patchWorking:(off,vals)=>patchRange(working,off,vals),patchContainer:(off,vals)=>patchRange(working,off,vals),
      async validate(){const p=window.NdlessPrg.parse(working);if(!p?.valid)throw new Error("PRG signature/startup validation failed.");return{bytes:clone(working),parsed:{...p,bytes:clone(working)}};},async build(){return this.validate();},
    };
  }

  async function createAdapter(result){if(!result?.valid||result.family!=="ndless")throw new Error("A valid Ndless result is required.");if(result.format==="zehn")return createZehn(result);if(result.format==="bflt")return createBflt(result);if(result.format==="prg")return createPrg(result);throw new Error(`Unsupported Ndless format: ${result.format}`);}

  window.NdlessRebuilder=Object.freeze({createAdapter,patchRange,patchCString});
})();
