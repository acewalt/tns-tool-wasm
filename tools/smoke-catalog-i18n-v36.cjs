const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'release/qa/catalog-i18n-v36-browser.json');
let server,win;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="/web/ti-math-tools.css"><button id="anchor" style="position:fixed;left:30px;top:30px">Tools</button><script src="/web/ti-math-typeset.js"></script><script src="/web/ti-math-tools.js"></script></html>');}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});await win.loadURL(origin);
  const report=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));fs.writeFileSync(out+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(error=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({ok:false,error:String(error)},null,2));console.error(error);win?.destroy();server?.close();app.exit(1);});

async function check(){
  const must=(v,m)=>{if(!v)throw Error(m);},pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const wait=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Timed out loading catalog');await pause(15);}};
  const anchor=document.querySelector('#anchor'),cases=[];
  const languages={
    en:{title:'Catalog',matrix:'Matrix',create:'Create',rows:'Rows',columns:'Columns',abs:'Absolute value or complex modulus',conversion:'Conversion assistant',length:'Length',millimeter:'Millimeter',fraction:'Fraction',stats:'One-variable statistics',count:'Count',list:'List 1'},
    es:{title:'Catálogo',matrix:'Matriz',create:'Crear',rows:'Filas',columns:'Columnas',abs:'Valor absoluto o módulo complejo',conversion:'Asistente de conversión',length:'Longitud',millimeter:'Milímetro',fraction:'Fracción',stats:'Estadísticas de una variable',count:'Cantidad',list:'Lista 1'},
    fr:{title:'Catalogue',matrix:'Matrice',create:'Créer',rows:'Lignes',columns:'Colonnes',abs:'Valeur absolue ou module complexe',conversion:'Assistant de conversion',length:'Longueur',millimeter:'Millimètre',fraction:'Fraction',stats:'Statistiques à une variable',count:'Nombre',list:'Liste 1'},
  };
  for(const[language,expected]of Object.entries(languages)){
    document.documentElement.lang=language;let inserted,popup;
    const open=async()=>{window.TnsMathTools.close();window.TnsMathTools.openCatalog({anchor,insert:source=>{inserted=source;}});await wait(()=>document.querySelector('.ti-math-catalog-tabs'));popup=document.querySelector('.ti-math-tool-popup');};
    const node=label=>{const button=[...popup.querySelectorAll('.ti-math-catalog-entry')].find(button=>button.title===label);must(button,language+': missing '+label);button.click();};
    const tab=n=>popup.querySelector('[data-catalog-tab="'+n+'"]').click();
    const insert=()=>popup.querySelector('[data-catalog-insert]').click();
    const field=(name,value)=>{const input=popup.querySelector('[name="'+name+'"]');must(input,language+': missing '+name);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));return input;};
    const submit=()=>popup.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    await open();must(popup.querySelector('header strong').textContent===expected.title,language+': wrong title');node('abs');must(popup.querySelector('.ti-math-catalog-detail p').textContent===expected.abs,language+': abs description');must(popup.querySelector('.ti-math-catalog-detail code').textContent==='abs(Expr)',language+': insertion syntax changed');
    tab(2);node(expected.matrix);node(expected.create);node(expected.matrix);insert();must(popup.querySelector('[name="rows"]').closest('label').textContent===expected.rows,language+': rows label');must(popup.querySelector('[name="columns"]').closest('label').textContent===expected.columns,language+': columns label');field('rows','2');field('columns','3');submit();must(inserted==='[[1,1,1][1,1,1]]',language+': matrix token');
    await open();tab(3);node(expected.length);node(expected.millimeter);insert();must(inserted==='_mm',language+': unit token');
    await open();tab(3);node(expected.conversion);insert();field('value','12*_ft');field('unit','_m');submit();must(inserted==='12*_ft►_m',language+': conversion token');
    await open();const search=popup.querySelector('.ti-math-catalog-search');search.value=expected.stats;search.dispatchEvent(new Event('input',{bubbles:true}));node(expected.stats);insert();must(popup.querySelector('[name="count"]').closest('label').textContent===expected.count,language+': count label');must(popup.querySelector('[name="list0"]').closest('label').textContent===expected.list,language+': statistical list label');window.TnsMathTools.close();
    window.TnsMathTools.openTemplates({anchor});await wait(()=>document.querySelector('.ti-math-template-grid'));must(document.querySelector('[data-template-id="fraction"]').title===expected.fraction,language+': template tooltip');window.TnsMathTools.close();cases.push({language,ok:true,descriptions:true,hierarchy:true,units:true,assistants:true,templates:true,canonicalTokens:true});
  }
  return{ok:true,network:'local assets only',cases};
}
