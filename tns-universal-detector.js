(() => {
  "use strict";

  const asBytes = input => input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  function isDocument(bytes){return bytes.length>=6&&bytes[0]===0x2a&&bytes[1]===0x54&&bytes[2]===0x49&&bytes[3]===0x4d&&bytes[4]===0x4c&&bytes[5]===0x50;}

  function detect(bytesInput,file=null){
    const bytes=asBytes(bytesInput);
    if(isDocument(bytes))return{valid:true,family:"document",format:"ti-nspire",formatLabel:"TI-Nspire Document",typeLabel:"TI-Nspire Document",bytes,file};
    const custom=window.TnsContainerRegistry?.detect?.(bytes,file);if(custom)return custom;
    const ndless=window.NdlessFormatDetector?.detect?.(bytes);if(ndless&&ndless.family!=="unknown")return{...ndless,bytes,file};
    return{valid:false,family:"unknown",format:"unknown",reason:"unrecognized-tns",bytes,file};
  }

  async function inspectFile(file){if(!file||!/\.tns$/i.test(file.name||""))return null;const bytes=new Uint8Array(await file.arrayBuffer());let result=detect(bytes,file);if(result?.valid&&result.format==="bflt"&&window.NdlessBflt?.enrich)result=await window.NdlessBflt.enrich(bytes,result);return{...result,file,bytes};}

  window.TnsUniversalDetector=Object.freeze({detect,inspectFile,isDocument});
})();
