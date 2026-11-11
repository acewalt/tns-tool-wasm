/* Render saved Calculator output without executing stored programs. Optional
   TNS_HISTORY_FIXTURE points at a decoded Problem XML for a private QA run. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.TNS_HISTORY_REPORT||path.join(root,'release/qa/calculator-history-v37.json'));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rich='<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word">2 is a divisor of 10</leaf></node></node><node name="1para"><node name="1rtline"><node name="0el"><node name="0matrix" data="2">[[<node name="0el"><leaf name="0text">10</leaf></node>,<node name="0el"><leaf name="0text">2</leaf></node>][<node name="0el"><leaf name="0text">5</leaf></node>,<node name="0el"><leaf name="0text">5</leaf></node>]]</node></node></node></node></node></r2dtotree>';
const fixture=process.env.TNS_HISTORY_FIXTURE?fs.readFileSync(process.env.TNS_HISTORY_FIXTURE,'utf8'):`<wdgt xmlns:sp="urn:TI.Scratchpad"><sp:erow><sp:entr>library\\factorstep(10)</sp:entr><sp:exct>library\\factorstep(10)</sp:exct><sp:intr>${escape(rich)}</sp:intr><sp:rslt><sp:warn2>{}</sp:warn2><sp:disp>10</sp:disp><sp:full>10</sp:full></sp:rslt><sp:ctxt ang="1" cplx="1" comp="1" /></sp:erow></wdgt>`;
let server,win;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="/web/prgm-preview.css"><link rel="stylesheet" href="/web/preview-window.css"><link rel="stylesheet" href="/web/document-preview-navigation.css"><script defer src="/web/document-preview-navigation.js"></script><script defer src="/web/preview-window.js"></script><script defer src="/web/ti-math-typeset.js"></script><script defer src="/web/calculator-history.js"></script><script type="module" src="/web/prgm-preview.js"></script></html>');}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});win.webContents.on('console-message',(_event,details)=>console.error(details));await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(fixture)})`);
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));fs.writeFileSync(out+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(error=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({ok:false,error:String(error)},null,2));console.error(error);win?.destroy();server?.close();app.exit(1);});

async function check(fixture){
 const must=(value,message)=>{if(!value)throw Error(message);},pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const end=Date.now()+10000;while(!window.TnsPrgmPreview||!window.TnsCalculatorHistory){if(Date.now()>end)throw Error('Preview failed to load');await pause(15);}
 const rows=window.TnsCalculatorHistory.parseRows(fixture),expected=rows.reduce((n,row)=>n+(row.output?.length||0),0);
 must(rows.length>0&&expected>0,'Fixture must contain saved transcript rows');
 let saved;window.TnsPrgmPreview.open({name:'',source:'',documentName:'numtheory'},{calculatorMode:true,initialRows:rows,onSave:async value=>{saved=value;}});
 await pause(100);
 must(window.TnsPrgmPreview.getSnapshot().status==='ready','Opening saved history executed code');
 const actual=[...document.querySelectorAll('.prgm-calculator-transcript-line')];must(actual.length===expected,'Saved Disp lines are missing');
 must(document.querySelectorAll('.prgm-calculator-transcript mtable').length>0,'Saved matrix is not typeset');
 must(![...document.querySelectorAll('.prgm-calculator-row-transcript .prgm-calculator-answer')].some(node=>node.textContent==='Done'),'A Func return was replaced by Done');
 const row=document.querySelector('.prgm-calculator-row-transcript'),expr=row.querySelector('.prgm-calculator-expression'),answer=row.querySelector('.prgm-calculator-answer');
 must(getComputedStyle(expr).borderBottomStyle==='solid'&&getComputedStyle(answer).borderTopStyle==='solid','Transcript separators missing');
 must(getComputedStyle(row.querySelector('.prgm-calculator-transcript')).textAlign==='right','Transcript should align with Calculator results');
 document.querySelector('[data-save-calculator]').click();await pause(40);
 must(saved?.length===rows.length&&saved.every((item,index)=>item.intr===rows[index].intr&&item.rawXml===rows[index].rawXml),'Save discarded original TI row XML');
 const dangerous='<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word">&lt;img src=x onerror=alert(1)&gt;</leaf></node></node></node></r2dtotree>';
 const holder=document.createElement('div');window.TnsCalculatorHistory.appendOutputLine(holder,window.TnsCalculatorHistory.parseRichOutput(dangerous)[0]);must(!holder.querySelector('img')&&holder.textContent.includes('<img'),'Rich TI text was interpreted as HTML');
 const source=document.createElement('div');window.TnsCalculatorHistory.renderSource(source,'lib_name:="numtheory"');must(source.textContent.includes('"numtheory"'),'Calculator input lost its literal string quotes');window.TnsCalculatorHistory.renderSource(source,'"numtheory"');must(source.textContent==='"numtheory"','Calculator string result lost its quotes');
 return {ok:true,savedRows:rows.length,richRows:rows.filter(row=>row.intr).length,outputLines:actual.length,matrices:document.querySelectorAll('.prgm-calculator-transcript mtable').length,openingDoesNotExecute:true,nativeRowsRetainedOnSave:true,rightAlignedOutput:true,separators:true,htmlEscaped:true,literalStringQuotes:true,texts:actual.map(node=>node.textContent)};
}
