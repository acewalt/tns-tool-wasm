/* TI text stays authoritative. This module only creates an escaped MathML view. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // U+F042 is TI's arbitrary-integer prefix. It is rendered as n, while the
  // original source (and the following digits identifying the constant) stays intact.
  const normalize = value => String(value ?? '').replace(/\uF03F/g,'e').replace(/\uF008/g,'d').replace(/\uF042/g,'n').replace(/[−–]/g,'-').replace(/\r\n?/g,'\n');
  const row = (...parts) => `<mrow>${parts.join('')}</mrow>`;
  const fence = (body, open='(', close=')') => row(`<mo stretchy="true">${esc(open)}</mo>`,body,`<mo stretchy="true">${esc(close)}</mo>`);
  const atom = s => /^\d+(?:\.\d*)?(?:[eE][+-]?\d+)?$/.test(s) ? `<mn>${esc(s)}</mn>` : `<mi>${esc(s)}</mi>`;
  function split(source, separators, last=false) {
    let depth=0, quoted=false, out=[],start=0;
    for(let i=0;i<source.length;i++) {
      const c=source[i]; if(c==='"') quoted=!quoted;
      if(quoted) continue;
      if('([{'.includes(c)) depth++; else if(')]}'.includes(c)) depth--;
      if(depth || !separators.includes(c)) continue;
      if('+-'.includes(c) && (!source.slice(0,i).trim() || /[+\-*/^=,(]$/.test(source.slice(0,i).trim()))) continue;
      out.push({text:source.slice(start,i),op:c,index:i});start=i+1;
    }
    out.push({text:source.slice(start),op:'',index:source.length});
    return last && out.length>1 ? [source.slice(0,out.at(-2).index),out.at(-2).op,source.slice(out.at(-2).index+1)] : out;
  }
  function balanced(s) {
    const stack=[];let quoted=false;
    for(const c of s) {if(c==='"'){quoted=!quoted;continue;}if(quoted)continue;if('([{'.includes(c))stack.push(c);else if(')]}'.includes(c)&&stack.pop()!==({')':'(',']':'[','}':'{'})[c])return false;}
    return !quoted&&!stack.length;
  }
  function outer(s, a='(',b=')') {if(s[0]!==a||s.at(-1)!==b)return false;let d=0;for(let i=0;i<s.length;i++){if(s[i]===a)d++;else if(s[i]===b)d--;if(!d&&i<s.length-1)return false;}return true;}
  function ungroup(s){s=s.trim();while(outer(s))s=s.slice(1,-1).trim();return s;}
  function table(rows) {return `<mtable columnalign="center" rowspacing=".35em">${rows.map(r=>`<mtr>${r.map(c=>`<mtd>${expression(c)}</mtd>`).join('')}</mtr>`).join('')}</mtable>`;}
  function expression(value, depth=0) {
    const s=normalize(value).trim(); if(!s)return '<mi class="ti-math-placeholder">□</mi>';
    if(depth>28||s.length>8192)return `<mtext>${esc(s)}</mtext>`;
    const expr=t=>expression(t,depth+1);
    if(/^"[\s\S]*"$/.test(s))return `<mtext>${esc(s.slice(1,-1))}</mtext>`;
    if(outer(s)){const inner=s.slice(1,-1),fraction=split(inner,'/',true);return fraction.length===3&&typeof fraction[0]==='string'?expr(inner):fence(expr(inner));}
    if(/^\[\[[\s\S]*\]\]$/.test(s)){
      const contents=s.slice(1,-1),rows=[];let start=0,d=0;
      for(let i=0;i<contents.length;i++){if(contents[i]==='['){if(!d)start=i+1;d++;}else if(contents[i]===']'&&!--d)rows.push(split(contents.slice(start,i),',').map(p=>p.text));}
      if(rows.length)return fence(table(rows),'[',']');
    }
    if(outer(s,'[',']'))return fence(table([split(s.slice(1,-1),',').map(p=>p.text)]),'[',']');
    if(outer(s,'{','}'))return fence(row(...split(s.slice(1,-1),',').flatMap((p,i)=>[i?'<mo>,</mo>':'',expr(p.text)])),'{','}');
    for(const ops of ['=<>≤≥≠','+-','*×·']) {const parts=split(s,ops);if(parts.length>1)return row(...parts.flatMap(p=>[expr(p.text),p.op?`<mo>${esc(p.op==='*'?'·':p.op)}</mo>`:'']));}
    const quotient=split(s,'/',true);if(quotient.length===3&&typeof quotient[0]==='string')return `<mfrac>${expr(ungroup(quotient[0]))}${expr(ungroup(quotient[2]))}</mfrac>`;
    const powers=split(s,'^');if(powers.length>1){const cut=powers[0].index;return `<msup>${expr(s.slice(0,cut))}${expr(ungroup(s.slice(cut+1)))}</msup>`;}
    let m=s.match(/^(.+?)([₀₁₂₃₄₅₆₇₈₉]+)$/);if(m)return `<msub>${expr(m[1])}<mn>${m[2].replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c))}</mn></msub>`;
    if((m=s.match(/^(.+?)°(.+?)[′'](.+?)(?:″|''|")$/)))return row(expr(m[1]),'<mo>°</mo>',expr(m[2]),'<mo>′</mo>',expr(m[3]),'<mo>″</mo>');
    if((m=s.match(/^([\p{L}_][\p{L}\p{N}_]*(?:\\[\p{L}_][\p{L}\p{N}_]*)*|[√∫∑∏ΣΠ])\s*\(([\s\S]*)\)$/u))&&balanced(m[2])){
      const name=m[1].toLowerCase(),args=split(m[2],',').map(p=>p.text),a=i=>expr(args[i]||'');
      if(['sqrt','√'].includes(name))return `<msqrt>${a(0)}</msqrt>`;
      if(name==='root')return `<mroot>${a(0)}${a(1)}</mroot>`;
      if(name==='abs')return fence(a(0),'|','|');
      if(name==='log'&&args.length>1)return row(`<msub><mi mathvariant="normal">log</mi>${a(1)}</msub>`,fence(a(0)));
      if(['piecewise','system'].includes(name)){
        const rows=name==='system'?args.map(x=>[x]):Array.from({length:Math.ceil(args.length/2)},(_,i)=>[args[i*2]||'',args[i*2+1]||'']);
        return row('<mo stretchy="true">{</mo>',table(rows));
      }
      if(['∑','σ','sumseq','∏','π','prodseq'].includes(name)&&args.length>=4)return row(`<munderover><mo>${['∏','π','prodseq'].includes(name)?'∏':'∑'}</mo>${row(a(1),'<mo>=</mo>',a(2))}${a(3)}</munderover>`,fence(a(0)));
      if(['d','derivative'].includes(name)&&args.length>=2){const order=args[2]||'1',numerator=order==='1'?atom('d'):`<msup>${atom('d')}${expr(order)}</msup>`,denominator=order==='1'?row(atom('d'),a(1)):row(atom('d'),`<msup>${a(1)}${expr(order)}</msup>`);return row(`<mfrac>${numerator}${denominator}</mfrac>`,fence(a(0)));}
      if(['∫','integral'].includes(name)&&args.length>=2)return row(args.length>=4?`<msubsup><mo>∫</mo>${a(2)}${a(3)}</msubsup>`:'<mo>∫</mo>',a(0),'<mspace width=".3em"/>',atom('d'),a(1));
      if(['lim','limit'].includes(name)&&args.length>=3)return row(`<munder><mi mathvariant="normal">lim</mi>${row(a(1),'<mo>→</mo>',a(2),args[3]?`<msup><mrow/>${a(3)}</msup>`:'')}</munder>`,fence(a(0)));
      return row(`<mi mathvariant="${m[1].includes('\\')?'italic':'normal'}">${esc(m[1])}</mi>`,fence(row(...args.flatMap((x,i)=>[i?'<mo>,</mo>':'',expr(x)]))));
    }
    if(/^[+-]/.test(s))return row(`<mo>${s[0]}</mo>`,expr(s.slice(1)));
    return atom(s);
  }
  function parse(source) {
    const normalized=normalize(source),valid=Boolean(normalized.trim())&&balanced(normalized);
    return {source:String(source??''),normalized,valid,markup:valid?`<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline">${expression(normalized)}</math>`:`<code>${esc(source)}</code>`};
  }
  function render(source){return parse(source).markup;}
  function renderLine(line) {
    const s=String(line??''),m=s.match(/^(\s*)(?:(DispAt\s+\d+,|Disp\s+|Return\s+|If\s+)([\s\S]*?)(\s+Then)?|([\s\S]*))$/i);
    if(!m||/^\s*(?:Prgm|End\w*|Func|Local|For|While|Loop|Else|Goto|Lbl|Define|Try|Stop|Request|Send|Get|Set|Wait|UseBuffer|PaintBuffer)\b/i.test(s)||s.trim().startsWith('©'))return `<code>${esc(s)||' '}</code>`;
    const prefix=m[2]||'',body=m[3]??m[5]??'',suffix=m[4]||'';
    return `${esc(m[1])}<code>${esc(prefix)}</code>${render(body)}<code>${esc(suffix)}</code>`;
  }
  window.TnsMathTypeset=Object.freeze({normalize,parse,render,renderLine,splitArgs:s=>split(s,',').map(p=>p.text)});
})();
