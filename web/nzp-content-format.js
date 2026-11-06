(() => {
  "use strict";

  const MAGIC = [0x4e, 0x5a, 0x50, 0x4b];
  const HEADER_SIZE = 22;
  const IMAGE_HEAD_SIZE = 28;
  const GLYPH_HEAD_SIZE = 10;
  const EVENT_SIZE = 24;
  const UI_TEXT_COUNT = 21;
  const UI_FOOTER_SIZE = 4 + 4 + 4 + UI_TEXT_COUNT * 8;
  const utf8 = new TextDecoder("utf-8", { fatal: false });
  const encoder = new TextEncoder();

  const OP_NAMES = Object.freeze({
    1:"scene", 2:"show", 3:"hide", 4:"say", 5:"end", 6:"title", 7:"pause",
    8:"window", 9:"overlay", 10:"nvl", 11:"transform", 12:"persistent",
  });

  const asBytes = input => input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const addChecked = (a,b,label) => { const n = Number(a) + Number(b); if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Invalid ${label}.`); return n; };
  const mulChecked = (a,b,label) => { const n = Number(a) * Number(b); if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Invalid ${label}.`); return n; };
  const inRange = (offset,size,length) => offset >= 0 && size >= 0 && offset + size <= length;

  function hasMagic(bytes) {
    return bytes.length >= 4 && MAGIC.every((value, index) => bytes[index] === value);
  }

  function textAt(strings, ref) {
    if (!ref || !inRange(ref.offset, ref.size, strings.length)) return "";
    return utf8.decode(strings.subarray(ref.offset, ref.offset + ref.size));
  }

  function readRef(view, offset, fieldOffsetBase, capacity = null) {
    return {
      offset: view.getUint32(offset, true),
      size: view.getUint32(offset + 4, true),
      fieldOffset: fieldOffsetBase,
      capacity,
    };
  }

  function parse(bytesInput) {
    const bytes = asBytes(bytesInput);
    if (!hasMagic(bytes)) return null;
    if (bytes.length < HEADER_SIZE) throw new Error("Truncated NZP header.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const header = {
      magic: "NZPK",
      flags: view.getUint16(4, true),
      imageCount: view.getUint32(6, true),
      glyphCount: view.getUint32(10, true),
      eventCount: view.getUint32(14, true),
      stringPoolBytes: view.getUint32(18, true),
    };
    if (header.imageCount > 200000 || header.glyphCount > 2000000 || header.eventCount > 5000000) throw new Error("NZP table counts are not credible.");

    const imageTableStart = HEADER_SIZE;
    const glyphTableStart = addChecked(imageTableStart, mulChecked(header.imageCount, IMAGE_HEAD_SIZE, "image table size"), "glyph table offset");
    const eventTableStart = addChecked(glyphTableStart, mulChecked(header.glyphCount, GLYPH_HEAD_SIZE, "glyph table size"), "event table offset");
    const stringPoolStart = addChecked(eventTableStart, mulChecked(header.eventCount, EVENT_SIZE, "event table size"), "string pool offset");
    const stringPoolEnd = addChecked(stringPoolStart, header.stringPoolBytes, "string pool end");
    if (stringPoolEnd > bytes.length) throw new Error("Truncated NZP tables or string pool.");

    const images = [];
    for (let i = 0; i < header.imageCount; i += 1) {
      const o = imageTableStart + i * IMAGE_HEAD_SIZE;
      const flags = view.getUint8(o + 8);
      images.push({
        index:i, tableOffset:o,
        id:view.getUint16(o, true), width:view.getUint16(o+2,true), height:view.getUint16(o+4,true),
        paletteCountRaw:view.getUint16(o+6,true), paletteEntries:view.getUint16(o+6,true) || 256,
        flags, reserved:view.getUint8(o+9), pixelBytes:view.getUint32(o+10,true),
        animationNext:view.getUint16(o+14,true), animationMs:view.getUint16(o+16,true),
        compositeBase:view.getUint16(o+18,true), patchX:view.getInt16(o+20,true), patchY:view.getInt16(o+22,true),
        patchWidth:view.getUint16(o+24,true), patchHeight:view.getUint16(o+26,true),
        alpha:Boolean(flags&2), particle:Boolean(flags&4), background:Boolean(flags&8), baseLayer:Boolean(flags&16),
        screenLayer:Boolean(flags&32), fullScreen:Boolean(flags&64), alias:Boolean(flags&128), dataOffset:null, payloadBytes:0,
      });
    }

    const glyphs = [];
    for (let i = 0; i < header.glyphCount; i += 1) {
      const o = glyphTableStart + i * GLYPH_HEAD_SIZE;
      glyphs.push({ index:i, tableOffset:o, key:view.getUint32(o,true), width:view.getUint8(o+4), height:view.getUint8(o+5), advance:view.getUint8(o+6), reserved:view.getUint8(o+7), bitmapBytes:view.getUint16(o+8,true), dataOffset:null });
    }

    const strings = bytes.subarray(stringPoolStart, stringPoolEnd);
    const events = [];
    for (let i = 0; i < header.eventCount; i += 1) {
      const o = eventTableStart + i * EVENT_SIZE;
      const speaker = readRef(view, o+8, o+12);
      const text = readRef(view, o+16, o+20);
      if (!inRange(speaker.offset, speaker.size, strings.length) || !inRange(text.offset, text.size, strings.length)) throw new Error(`Invalid NZP text reference in event ${i}.`);
      speaker.capacity = speaker.size;
      text.capacity = text.size;
      events.push({
        index:i, tableOffset:o, op:view.getUint8(o), opName:OP_NAMES[view.getUint8(o)] || `op_${view.getUint8(o)}`,
        flags:view.getUint8(o+1), resource:view.getUint16(o+2,true), x:view.getInt16(o+4,true), y:view.getInt16(o+6,true),
        speaker, text, speakerText:textAt(strings,speaker), textValue:textAt(strings,text),
      });
    }

    let payloadOffset = stringPoolEnd;
    for (const image of images) {
      image.dataOffset = payloadOffset;
      if (image.alias) continue;
      const paletteBytes = image.paletteEntries * 2;
      const rasterBytes = image.pixelBytes * (image.alpha ? 2 : 1);
      image.payloadBytes = paletteBytes + rasterBytes;
      payloadOffset = addChecked(payloadOffset, image.payloadBytes, `image ${image.id} payload`);
      if (payloadOffset > bytes.length) throw new Error(`Truncated NZP image payload ${image.id}.`);
    }
    for (const glyph of glyphs) {
      glyph.dataOffset = payloadOffset;
      payloadOffset = addChecked(payloadOffset, glyph.bitmapBytes, `glyph ${glyph.index} payload`);
      if (payloadOffset > bytes.length) throw new Error(`Truncated NZP glyph payload ${glyph.index}.`);
    }

    let ui = null;
    if (header.flags & 4) {
      if (payloadOffset + UI_FOOTER_SIZE > bytes.length) throw new Error("Truncated NZP UI footer.");
      if (String.fromCharCode(...bytes.subarray(payloadOffset,payloadOffset+4)) !== "NZUI") throw new Error("Invalid NZP UI footer magic.");
      const credits = { offset:view.getUint32(payloadOffset+4,true), size:view.getUint32(payloadOffset+8,true) };
      if (!inRange(credits.offset,credits.size,strings.length)) throw new Error("Invalid NZP credits reference.");
      const texts=[];
      for(let i=0;i<UI_TEXT_COUNT;i+=1){const ro=payloadOffset+12+i*8;const ref={offset:view.getUint32(ro,true),size:view.getUint32(ro+4,true)};if(!inRange(ref.offset,ref.size,strings.length))throw new Error(`Invalid NZP UI text reference ${i}.`);texts.push({...ref,value:textAt(strings,ref)});}
      ui={offset:payloadOffset,credits:{...credits,value:textAt(strings,credits)},texts};
      payloadOffset += UI_FOOTER_SIZE;
    }

    const imageById = new Map(images.map(image => [image.id,image]));
    const scenes=[];
    let active=null;
    for(const event of events){
      if(event.op===1 || !active){active={index:scenes.length,startEvent:event.index,endEvent:event.index,sceneEvent:event.op===1?event:null,events:[]};scenes.push(active);}
      active.events.push(event);active.endEvent=event.index;
    }

    return {
      valid:true, family:"custom-container", kind:"content-pack", format:"nzp", formatLabel:"NZP Content Pack", typeLabel:"Content Pack",
      bytes, header, offsets:{imageTableStart,glyphTableStart,eventTableStart,stringPoolStart,stringPoolEnd,payloadEnd:payloadOffset},
      images,glyphs,events,scenes,strings,ui,imageById,
      language:(header.flags&1)?"zh":"en", looseTranslation:Boolean(header.flags&2), hasUiFooter:Boolean(header.flags&4),
      trailingBytes:Math.max(0,bytes.length-payloadOffset),
    };
  }

  function rgb565(value) {
    const r = (value >> 11) & 0x1f, g = (value >> 5) & 0x3f, b = value & 0x1f;
    return [Math.round(r*255/31), Math.round(g*255/63), Math.round(b*255/31)];
  }

  function decodeImage(parsed, imageId, sourceBytes = parsed.bytes, stack = new Set()) {
    const image = parsed.imageById.get(Number(imageId));
    if (!image) throw new Error(`Image resource ${imageId} does not exist.`);
    if (stack.has(image.id)) throw new Error("Composite image cycle detected.");
    if (image.alias) return { image, unsupported:"Alias image preview is not resolved by this adapter yet." };
    stack.add(image.id);
    const bytes = asBytes(sourceBytes), view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const palette=[];let at=image.dataOffset;
    for(let i=0;i<image.paletteEntries;i+=1){if(at+2>bytes.length)throw new Error("Truncated image palette.");palette.push(rgb565(view.getUint16(at,true)));at+=2;}
    const count=image.pixelBytes;if(at+count>bytes.length)throw new Error("Truncated image indices.");const indices=bytes.subarray(at,at+count);at+=count;
    const coverage=image.alpha?(at+count<=bytes.length?bytes.subarray(at,at+count):null):null;if(image.alpha&&!coverage)throw new Error("Truncated image alpha coverage.");

    let width=image.width,height=image.height,rgba=new Uint8ClampedArray(width*height*4);
    if(image.compositeBase){
      const base=decodeImage(parsed,image.compositeBase,bytes,stack);if(!base.rgba) return {image,unsupported:"Composite base cannot be previewed."};
      rgba.set(base.rgba.subarray(0,rgba.length));
      const pw=image.patchWidth||image.width,ph=image.patchHeight||image.height;
      for(let y=0;y<ph;y+=1)for(let x=0;x<pw;x+=1){const src=y*pw+x,tx=image.patchX+x,ty=image.patchY+y;if(src>=indices.length||tx<0||ty<0||tx>=width||ty>=height)continue;const color=palette[indices[src]]||[0,0,0],dst=(ty*width+tx)*4;rgba[dst]=color[0];rgba[dst+1]=color[1];rgba[dst+2]=color[2];rgba[dst+3]=coverage?coverage[src]:255;}
    }else{
      const pixels=Math.min(indices.length,width*height);for(let i=0;i<pixels;i+=1){const color=palette[indices[i]]||[0,0,0],dst=i*4;rgba[dst]=color[0];rgba[dst+1]=color[1];rgba[dst+2]=color[2];rgba[dst+3]=coverage?coverage[i]:255;}
    }
    stack.delete(image.id);
    return {image,width,height,rgba};
  }

  function createSession(result) {
    const original = new Uint8Array(result.bytes);
    const working = new Uint8Array(result.bytes);
    let parsed = parse(working);
    const changes=[];
    let nextId=0;
    const initialCaps = new Map();
    for(const event of result.events){initialCaps.set(`speaker:${event.index}`,event.speaker.size);initialCaps.set(`text:${event.index}`,event.text.size);}

    function refresh(){parsed=parse(working);return parsed;}
    function patchBytes(offset,newBytes,label,kind="edit"){
      newBytes=asBytes(newBytes);if(!inRange(offset,newBytes.length,working.length))throw new Error("Patch is outside the content pack.");
      const before=new Uint8Array(working.subarray(offset,offset+newBytes.length));working.set(newBytes,offset);changes.push({id:++nextId,offset,before,after:new Uint8Array(newBytes),label,kind});refresh();return changes.at(-1);
    }
    function patchEvent(index,updates){const event=parsed.events[index];if(!event)throw new Error("Event not found.");const patches=[];
      if(updates.resource!=null){const n=Number(updates.resource);if(!Number.isInteger(n)||n<0||n>65535)throw new Error("Resource must be 0..65535.");const b=new Uint8Array(2);new DataView(b.buffer).setUint16(0,n,true);patches.push([event.tableOffset+2,b,"Change event resource"]);}
      if(updates.x!=null){const n=Number(updates.x);if(!Number.isInteger(n)||n<-32768||n>32767)throw new Error("x must fit int16.");const b=new Uint8Array(2);new DataView(b.buffer).setInt16(0,n,true);patches.push([event.tableOffset+4,b,"Change event X"]);}
      if(updates.y!=null){const n=Number(updates.y);if(!Number.isInteger(n)||n<-32768||n>32767)throw new Error("y must fit int16.");const b=new Uint8Array(2);new DataView(b.buffer).setInt16(0,n,true);patches.push([event.tableOffset+6,b,"Change event Y"]);}
      for(const p of patches)patchBytes(...p,"event");return parsed.events[index];
    }
    function patchText(index,field,value){if(field!=="speaker"&&field!=="text")throw new Error("Unknown text field.");const event=parsed.events[index];if(!event)throw new Error("Event not found.");const ref=event[field];const cap=initialCaps.get(`${field}:${index}`)??ref.size;const data=encoder.encode(String(value));if(data.length>cap)throw new Error(`Maximum ${cap} UTF-8 bytes for this field without resizing the pack.`);
      const poolOffset=parsed.offsets.stringPoolStart+ref.offset;const padded=new Uint8Array(cap);padded.set(data);patchBytes(poolOffset,padded,`Edit ${field} in event ${index}`,"text");
      const refs=[];for(const ev of parsed.events)for(const key of ["speaker","text"]){const r=ev[key],rcap=initialCaps.get(`${key}:${ev.index}`)??r.size;if(r.offset===ref.offset&&rcap===cap)refs.push(r.fieldOffset);}
      for(const sizeField of refs){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,data.length,true);patchBytes(sizeField,b,`Update shared text length`,"text-meta");}
      return refresh();
    }
    function revertAll(){working.set(original);changes.splice(0);refresh();}
    function validate(){const again=parse(working);if(!again?.valid)throw new Error("Content pack validation failed.");return again;}
    function exportBytes(){validate();return new Uint8Array(working);}
    return {
      format:"nzp",formatLabel:"NZP Content Pack",originalBytes:original,workingBytes:working,get parsed(){return parsed;},changes,
      patchEvent,patchText,revertAll,validate,exportBytes,decodeImage:id=>decodeImage(parsed,id,working),opNames:OP_NAMES,
    };
  }

  const api = Object.freeze({ parse, detect:hasMagic, decodeImage, createSession, OP_NAMES, constants:Object.freeze({HEADER_SIZE,IMAGE_HEAD_SIZE,GLYPH_HEAD_SIZE,EVENT_SIZE}) });
  window.TnsNzpFormat = api;
  window.TnsContainerRegistry?.register?.({
    id:"nzp", label:"NZP Content Pack", typeLabel:"Content Pack", kind:"content-pack", priority:1000,
    extensions:[".tns"], detect:hasMagic, parse, createSession,
  });
})();
