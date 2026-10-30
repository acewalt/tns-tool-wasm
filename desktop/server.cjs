// Serves the existing web application unchanged from a local secure-context origin.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.wasm':'application/wasm',
  '.zip':'application/zip', '.whl':'application/octet-stream',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml', '.gif':'image/gif', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf',
  '.bmp':'image/bmp', '.xml':'application/xml', '.py':'text/plain; charset=utf-8',
  '.map':'application/json', '.txt':'text/plain; charset=utf-8',
};
const WEB_PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js';
const WEB_JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
function within(base, relative) {
  const target = path.resolve(base, relative);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  return target;
}
function resolveRequest(root, vendor, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes('\\') || decoded.includes('\0')) return null;
  const parts = decoded.split('/');
  if (parts.some(p => p === '..' || p.startsWith('.'))) return null;
  if (parts[1] === '__desktop') {
    const sub = parts.slice(2);
    if (!['pyodide','jszip','pdfjs','unicorn','rom'].includes(sub[0])) return null;
    return within(vendor, sub.join('/'));
  }
  return within(root, parts.slice(1).join('/') || 'index.html');
}
function originForRequest(req){return 'http://'+req.headers.host;}
function makeServer(root, vendor) {
  const appRoot = path.resolve(root), vendorRoot = path.resolve(vendor);
  return http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (!/^127\.0\.0\.1:\d+$/.test(host) || !['GET','HEAD'].includes(req.method)) {
      res.writeHead(403); res.end(); return;
    }
    let pathname;
    try { pathname = new URL(req.url, 'http://127.0.0.1').pathname; } catch {
      res.writeHead(400); res.end(); return;
    }
    const file = resolveRequest(appRoot,vendorRoot,pathname);
    if (!file) { res.writeHead(403); res.end(); return; }
    fs.stat(file,(error,stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
      const headers = {'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
      if (file === path.join(appRoot,'index.html')) {
        fs.readFile(file,'utf8',(readError,html) => {
          if (readError) { res.writeHead(500); res.end(); return; }
          const localized = html.replace(WEB_PYODIDE,'./__desktop/pyodide/pyodide.js')
            .replace(WEB_JSZIP,'./__desktop/jszip/jszip.min.js');
          res.writeHead(200,headers);
          res.end(req.method === 'HEAD' ? undefined : localized);
        });
        return;
      }
      if (file.startsWith(appRoot + path.sep) &&
          ['home-drop-import.js','media-import-controller.js'].includes(path.basename(file))) {
        fs.readFile(file,'utf8',(readError,script)=>{
          if(readError){res.writeHead(500);res.end();return;}
          // Preserve PDF import without network access in the desktop package.
          const pdfBase=originForRequest(req)+'/__desktop/pdfjs/';
          const updated=script
            .replace(/const PDFJS_URL = \`[^\`]+\`;/, 'const PDFJS_URL = "'+pdfBase+'pdf.min.js";')
            .replace(/const PDFJS_WORKER_URL = \`[^\`]+\`;/, 'const PDFJS_WORKER_URL = "'+pdfBase+'pdf.worker.min.js";');
          res.writeHead(200,headers);
          res.end(req.method==='HEAD'?undefined:updated);
        });
        return;
      }
      res.writeHead(200,{...headers,'Content-Length':stat.size});
      if(req.method === 'HEAD') { res.end(); return; }
      const stream=fs.createReadStream(file);
      stream.on('error',()=>res.destroy());
      stream.pipe(res);
    });
  });
}
async function listen(server) {
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      server.removeListener('error',reject);
      resolve('http://127.0.0.1:'+server.address().port+'/');
    });
  });
}
module.exports = { makeServer, listen, resolveRequest };
