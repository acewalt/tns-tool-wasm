// Equivalent of the port's textconv string encoding, used at package build time.
const escapes = {a:'\x07',b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\v','\\':'\\',"'":"'",'"':'"'};
function unescape(text) {
  return text.replace(/\\([\s\S])/g, (_, c) => {
    if (!(c in escapes)) throw Error('Unsupported text escape: '+c);
    return escapes[c];
  });
}
function convert(source, charmapSource) {
  const map = new Map();
  for (const line of charmapSource.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*'((?:\\.|[^'\\])*)'\s*=\s*(.+)$/);
    if (!m) throw Error('Invalid text charmap');
    map.set(unescape(m[1]), m[2].split(',').map(s => Number(s.trim())));
  }
  const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|(?<!\w)_{1,2}\(/g;
  let out = '', end = 0, match;
  while ((match = tokens.exec(source))) {
    if (!/^_{1,2}\($/.test(match[0])) continue;
    out += source.slice(end, match.index);
    let at = tokens.lastIndex, literals = 0, data = [];
    for (;;) {
      while (/\s/.test(source[at]||'') && at < source.length) at++;
      if (source[at] === ')') { if (!literals) throw Error('Expected text literal'); at++; break; }
      const literal = source.slice(at).match(/^"((?:\\[\s\S]|[^"\\])*)"/);
      if (!literal) throw Error('Expected text literal near '+at);
      at += literal[0].length; literals++;
      const chars = Array.from(unescape(literal[1]));
      for (let i=0;i<chars.length;) {
        let found = false;
        for (let n=Math.min(match[0][1]==='_'?1:3,chars.length-i);n>0;n--) {
          const bytes=map.get(chars.slice(i,i+n).join(''));
          if (bytes) { data.push(...bytes);i+=n;found=true;break; }
        }
        if (!found) throw Error('Unknown text character '+chars[i]);
      }
    }
    data.push(255);out += data.map(n=>'0x'+n.toString(16).toUpperCase().padStart(2,'0')).join(',');
    end=at;tokens.lastIndex=at;
  }
  return out+source.slice(end);
}
module.exports={convert};
