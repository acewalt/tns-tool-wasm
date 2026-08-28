(() => {
  "use strict";

  const TEXT = {
    es: {
      title:"Inspector Ndless", detected:"Programa Ndless detectado", intro:"Este .tns contiene un programa nativo Ndless, no un documento normal de TI‑Nspire.",
      hint:"Puedes abrirlo en Edit Ndless para explorar código, buscar textos, hacer cambios controlados y exportar una copia. Los datos técnicos quedan ocultos hasta que los necesites.",
      file:"Archivo", format:"Formato", architecture:"Arquitectura", physicalSize:"Tamaño", entry:"Inicio", compression:"Compresión", relocations:"Relocations",
      technical:"Detalles técnicos", memoryMap:"Mapa de memoria", stored:"Archivo", runtime:"Memoria", hex:"Vista hexadecimal", flags:"Flags", value:"Valor", offset:"Offset", target:"Destino", region:"Región",
      app:"Aplicación", author:"Autor", version:"Versión", notice:"Aviso", compatibility:"Compatibilidad", unknown:"No especificado", malformed:"Se detectó un contenedor Ndless, pero su estructura no supera la validación.",
    },
    en: {
      title:"Ndless Inspector", detected:"Ndless program detected", intro:"This .tns contains a native Ndless program, not a regular TI‑Nspire document.",
      hint:"Open it in Edit Ndless to explore code, find text, make controlled changes and export a copy. Technical details stay hidden until you need them.",
      file:"File", format:"Format", architecture:"Architecture", physicalSize:"Size", entry:"Entry", compression:"Compression", relocations:"Relocations",
      technical:"Technical details", memoryMap:"Memory map", stored:"File", runtime:"Memory", hex:"Hex preview", flags:"Flags", value:"Value", offset:"Offset", target:"Target", region:"Region",
      app:"Application", author:"Author", version:"Version", notice:"Notice", compatibility:"Compatibility", unknown:"Not specified", malformed:"An Ndless container was detected, but its structure did not pass validation.",
    },
    fr: {
      title:"Inspecteur Ndless", detected:"Programme Ndless détecté", intro:"Ce .tns contient un programme Ndless natif, pas un document TI‑Nspire normal.",
      hint:"Ouvrez-le dans Edit Ndless pour explorer le code, rechercher du texte, effectuer des modifications contrôlées et exporter une copie. Les détails techniques restent masqués jusqu’à ce qu’ils soient nécessaires.",
      file:"Fichier", format:"Format", architecture:"Architecture", physicalSize:"Taille", entry:"Entrée", compression:"Compression", relocations:"Relocations",
      technical:"Détails techniques", memoryMap:"Carte mémoire", stored:"Fichier", runtime:"Mémoire", hex:"Aperçu hexadécimal", flags:"Flags", value:"Valeur", offset:"Offset", target:"Cible", region:"Région",
      app:"Application", author:"Auteur", version:"Version", notice:"Notice", compatibility:"Compatibilité", unknown:"Non spécifié", malformed:"Un conteneur Ndless a été détecté, mais sa structure n'a pas passé la validation.",
    },
  };
  function language(){const active=document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;const html=String(document.documentElement.lang||"es").slice(0,2).toLowerCase();return TEXT[active]?active:(TEXT[html]?html:"es");}
  const tr=k=>TEXT[language()]?.[k]||TEXT.es[k]||k;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const hex=(n,w=8)=>n==null?"—":`0x${(Number(n)>>>0).toString(16).toUpperCase().padStart(w,"0")}`;
  const formatBytes=value=>{const n=Number(value)||0;return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;};
  const row=(label,value)=>`<div class="ndless-field"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;

  function hexPreview(bytes,limit=192){const lines=[];for(let off=0;off<Math.min(bytes.length,limit);off+=16){const chunk=bytes.subarray(off,Math.min(off+16,bytes.length));const hs=Array.from(chunk,b=>b.toString(16).padStart(2,"0")).join(" ");const ascii=Array.from(chunk,b=>b>=32&&b<=126?String.fromCharCode(b):".").join("");lines.push(`${off.toString(16).padStart(8,"0")}  ${hs.padEnd(47," ")}  ${ascii}`);}return lines.join("\n");}
  function table(rows,columns){if(!rows?.length)return"";return `<div class="ndless-table-wrap"><table class="ndless-table"><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td><code>${esc(c.value(r))}</code></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}
  function mapValue(item){if(item.domain==="stored")return item.fileStart==null?"—":`${hex(item.fileStart)}${item.fileEnd==null?" → EOF":` – ${hex(item.fileEnd)}`}`;if(item.size!=null)return `${item.size} B`;return `${hex(item.runtimeStart)} – ${hex(item.runtimeEnd)}`;}
  function memoryMap(result){const items=result.format==="zehn"?window.NdlessZehn?.memoryMap?.(result):result.format==="bflt"?window.NdlessBflt?.memoryMap?.(result):window.NdlessPrg?.memoryMap?.(result,result.bytes.length);return items?.length?`<section class="ndless-section"><h3>${esc(tr("memoryMap"))}</h3>${table(items,[{label:"Region",value:r=>r.name},{label:"Domain",value:r=>r.domain},{label:"Range",value:mapValue}])}</section>`:"";}

  function entryValue(result){if(result.format==="zehn")return hex(result.header.entryOffset);if(result.format==="bflt")return hex(result.header.entry);return result.startupOffset!=null?hex(result.startupOffset):tr("unknown");}
  function summary(result){return `<div class="ndless-summary-grid">${row(tr("file"),result.file?.name||"program.tns")}${row(tr("format"),result.formatLabel||result.format)}${row(tr("architecture"),result.architecture||"ARM")}${row(tr("physicalSize"),formatBytes(result.bytes?.length||0))}${row(tr("compression"),result.compression||"none")}${row(tr("entry"),entryValue(result))}</div>`;}

  function zehnTechnical(result){const h=result.header,m=result.metadata||{};const compat=[m.ndlessMin!=null?`Ndless >= ${m.ndlessMin}`:null,m.ndlessMax!=null?`<= ${m.ndlessMax}`:null].filter(Boolean).join(" · ")||tr("unknown");return `<section class="ndless-section"><h3>Zehn</h3><div class="ndless-grid">${row("Header",hex(h.offset))}${row("File size",`${h.fileSize} B`)}${row("alloc_size",`${h.allocSize} B`)}${row("entry_offset",hex(h.entryOffset))}${row(tr("relocations"),h.relocCount)}${row(tr("flags"),h.flagCount)}</div></section><section class="ndless-section"><h3>${esc(tr("app"))}</h3><div class="ndless-grid">${row(tr("app"),m.name??tr("unknown"))}${row(tr("author"),m.author??tr("unknown"))}${row(tr("version"),m.version??tr("unknown"))}${row(tr("notice"),m.notice??tr("unknown"))}${row(tr("compatibility"),compat)}</div></section>${result.relocs?.length?`<section class="ndless-section"><h3>${esc(tr("relocations"))}</h3>${table(result.relocs.slice(0,500),[{label:"#",value:r=>r.index},{label:"Type",value:r=>r.name},{label:tr("offset"),value:r=>hex(r.data,6)},{label:"Raw",value:r=>hex(r.raw)}])}</section>`:""}`;}
  function bfltTechnical(result){const h=result.header,flags=window.NdlessBflt?.flagNames?.(h.flags)||[];return `<section class="ndless-section"><h3>bFLT v${h.rev}</h3><div class="ndless-grid">${row("Header","64 B")}${row(".text",`${hex(64)} – ${hex(h.dataStart)}`)}${row(".data",`${hex(h.dataStart)} – ${hex(h.dataEnd)}`)}${row(".bss",`${hex(h.dataEnd)} – ${hex(h.bssEnd)}`)}${row("Stack",`${h.stackSize} B`)}${row("reloc_start",hex(h.relocStart))}${row(tr("flags"),`${hex(h.flags)}${flags.length?` · ${flags.join(", ")}`:""}`)}</div></section>${result.relocs?.length?`<section class="ndless-section"><h3>${esc(tr("relocations"))}</h3>${table(result.relocs.slice(0,1000),[{label:"#",value:r=>r.index},{label:"Raw",value:r=>hex(r.raw??r.relocationOffset)},{label:tr("target"),value:r=>hex(r.targetAddress??r.address)},{label:tr("region"),value:r=>r.region}])}</section>`:""}`;}
  function prgTechnical(result){return `<section class="ndless-section"><h3>PRG legacy</h3><div class="ndless-grid">${row("Signature","PRG\\0")}${row("Startup",result.startup||"legacy crt0")}${row("Code start",hex(result.startupOffset))}${row(tr("physicalSize"),`${result.bytes.length} B`)}</div></section>`;}
  function technical(result){const specific=result.format==="zehn"?zehnTechnical(result):result.format==="bflt"?bfltTechnical(result):prgTechnical(result);return `${specific}${memoryMap(result)}<section class="ndless-section"><h3>${esc(tr("hex"))}</h3><pre class="ndless-hex">${esc(hexPreview(result.bytes))}</pre></section>`;}

  function showInspector(result){
    document.getElementById("ndless-inspector-overlay")?.remove();
    const overlay=document.createElement("div");overlay.id="ndless-inspector-overlay";overlay.className="ndless-overlay";
    if(!result?.valid||result.family!=="ndless"){
      overlay.innerHTML=`<div class="ndless-modal ndless-modal-compact"><div class="ndless-head"><div><span class="ndless-kicker">Ndless</span><h2>${esc(tr("title"))}</h2></div><button class="ndless-close" type="button">×</button></div><div class="ndless-body"><div class="ndless-warning">${esc(tr("malformed"))}${result?.reason?` · ${esc(result.reason)}`:""}</div></div></div>`;
    }else{
      overlay.innerHTML=`<div class="ndless-modal ndless-modal-compact"><div class="ndless-head"><div><span class="ndless-kicker">NDLESS · ${esc(result.formatLabel)}</span><h2>${esc(tr("detected"))}</h2></div><button class="ndless-close" type="button">×</button></div><div class="ndless-body"><div class="ndless-simple-intro"><p>${esc(tr("intro"))}</p><small>${esc(tr("hint"))}</small></div>${summary(result)}<details class="ndless-tech-details"><summary>${esc(tr("technical"))}</summary><div class="ndless-tech-content">${technical(result)}</div></details></div></div>`;
    }
    const close=()=>overlay.remove();overlay.querySelector(".ndless-close")?.addEventListener("click",close);overlay.addEventListener("click",e=>{if(e.target===overlay)close();});document.body.appendChild(overlay);
  }

  async function inspectFile(file){const result=await window.NdlessFormatDetector?.inspectFile?.(file);if(!result||result.family==="document"||result.family==="unknown")return null;return result;}
  function redispatchChange(input){input.dataset.ndlessInspectorBypass="1";input.dispatchEvent(new Event("change",{bubbles:true}));}
  function installOpenTnsGuard(){window.addEventListener("change",event=>{const input=event.target;if(!(input instanceof HTMLInputElement)||input.id!=="xml-tns-file")return;if(input.dataset.ndlessInspectorBypass==="1"){delete input.dataset.ndlessInspectorBypass;return;}const file=input.files?.[0];if(!file||!/\.tns$/i.test(file.name||""))return;event.preventDefault();event.stopImmediatePropagation();inspectFile(file).then(result=>result?showInspector(result):redispatchChange(input)).catch(error=>{console.warn("Ndless detection failed; falling back to normal TNS decoder.",error);redispatchChange(input);});},true);}
  function installNormalDecoderGuard(){window.addEventListener("click",event=>{const button=event.target instanceof Element?event.target.closest("#decode-btn"):null;if(!button)return;if(button.dataset.ndlessInspectorBypass==="1"){delete button.dataset.ndlessInspectorBypass;return;}const file=document.querySelector("#decode-file")?.files?.[0];if(!file||!/\.tns$/i.test(file.name||""))return;event.preventDefault();event.stopImmediatePropagation();inspectFile(file).then(result=>{if(result)showInspector(result);else{button.dataset.ndlessInspectorBypass="1";button.click();}}).catch(error=>{console.warn("Ndless detection failed; using normal TNS decoder.",error);button.dataset.ndlessInspectorBypass="1";button.click();});},true);}

  window.TnsNdlessInspector=Object.freeze({inspectFile,findZehn:bytes=>window.NdlessZehn?.findZehn?.(bytes)||null,detect:bytes=>window.NdlessFormatDetector?.detect?.(bytes)||null,showInspector,open:async file=>{const result=await inspectFile(file);if(!result)return false;showInspector(result);return true;}});
  installOpenTnsGuard();installNormalDecoderGuard();
})();