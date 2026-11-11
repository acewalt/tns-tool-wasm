/* Saved TI.Scratchpad output is an escaped r2dtotree, never executable HTML.
   Parsing history is intentionally independent of executing any stored call. */
(() => {
  'use strict';
  const namespace = 'urn:TI.Scratchpad';
  function parse(source) {
    try { const xml = new DOMParser().parseFromString(String(source || ''), 'application/xml'); return xml.querySelector('parsererror') ? null : xml; }
    catch (_) { return null; }
  }
  const hidden = node => node.nodeType === 1 && (node.getAttribute('hide') === '1' || ['cursor','formatManager','formatEntry'].includes(node.getAttribute('name')) || node.localName === 'cursor');
  function sourceText(node) {
    if (hidden(node)) return '';
    if (node.nodeType === 3 || node.nodeType === 4) return node.nodeValue || '';
    return [...node.childNodes].map(sourceText).join('');
  }
  function richSegments(node) {
    const segments = [];
    const append = (kind, text) => { if (!text) return; const previous = segments.at(-1); if (previous?.kind === kind) previous.text += text; else segments.push({kind,text}); };
    const visit = value => {
      if (hidden(value)) return;
      if (value.nodeType === 3 || value.nodeType === 4) { append('text', value.nodeValue || ''); return; }
      if (value.nodeType !== 1) return;
      if (value.getAttribute('name') === '0el') { append('math', sourceText(value)); return; }
      for (const child of value.childNodes) visit(child);
    };
    visit(node); return segments;
  }
  function parseRichOutput(source = '') {
    const xml = parse(source); if (!xml) return [];
    const lines = [...xml.getElementsByTagName('node')].filter(node => node.getAttribute('name') === '1rtline');
    return (lines.length ? lines : [xml.documentElement]).map(node => {
      const segments = richSegments(node); return {kind:'disp',text:segments.map(item => item.text).join(''),segments};
    });
  }
  function parseRows(source = '') {
    const xml = parse(source); if (!xml) return [];
    return [...xml.getElementsByTagNameNS(namespace,'erow')].map(element => {
      const field = name => element.getElementsByTagNameNS(namespace,name)[0]?.textContent || '';
      const intr = field('intr'), context = element.getElementsByTagNameNS(namespace,'ctxt')[0];
      const row = {entry:field('entr'),exact:field('exct'),display:field('disp'),full:field('full'),intr,kind:'calculation',rawXml:new XMLSerializer().serializeToString(element),context:context ? Object.fromEntries([...context.attributes].map(attr => [attr.name,attr.value])) : {}};
      if (intr) row.output = parseRichOutput(intr);
      return row;
    });
  }
  function appendOutputLine(parent, row = {}) {
    const line = document.createElement('div'); line.className = 'prgm-calculator-transcript-line';
    const segments = Array.isArray(row.segments) && row.segments.length ? row.segments : [{kind:row.math ? 'math' : 'text',text:String(row.text ?? '')}];
    for (const segment of segments) {
      const span = document.createElement('span');
      if (segment.kind === 'math' && window.TnsMathTypeset) {
        span.innerHTML = window.TnsMathTypeset.render(String(segment.text ?? ''));
        for (const operator of span.querySelectorAll('mo')) if (operator.textContent === '*') operator.textContent = '·';
      }
      else span.textContent = String(segment.text ?? '');
      line.append(span);
    }
    if (!line.textContent) line.append(document.createTextNode('\u00a0'));
    parent.append(line); return line;
  }
  function renderSource(parent, source = '') {
    source = String(source ?? '');
    if (!window.TnsMathTypeset) { parent.textContent = source; return; }
    parent.innerHTML = window.TnsMathTypeset.render(source);
    // Calculator history shows literal string quotes in both its input and
    // return value. Disp is separate and deliberately renders plain text.
    const literals = source.match(/"(?:(?:"")|\\.|[^"\\])*"/g) || [];
    for (const text of parent.querySelectorAll('mtext')) {
      const literal = literals.find(value => value.slice(1,-1) === text.textContent || value.slice(1,-1).replace(/""/g,'"') === text.textContent);
      if (literal) text.textContent = literal;
    }
  }
  window.TnsCalculatorHistory = Object.freeze({parseRows,parseRichOutput,appendOutputLine,renderSource});
})();
