/* The Var menu reference is a compact alphabetic TI name list. Exercise its
   real rendering, caret insertion and keyboard/scroll navigation offline. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'release/qa/numtheory-v37/var-browser.json');
let server,win;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="en" data-theme="dark"><meta charset="utf-8"><link rel="stylesheet" href="/web/ti-math-tools.css"><style>body{background:#101827;color:#ddd;font:14px Arial;margin:30px}#source{display:block;width:480px;height:80px;margin-bottom:18px}#anchor{padding:10px 15px}#below{margin-top:420px}</style><textarea id="source">before  after</textarea><button id="anchor">Var</button><button id="below">Other control</button><script src="/web/ti-math-tools.js"></script></html>');}
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript; charset=utf-8':'text/css');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});await win.loadURL(origin);
  const report=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.png',(await win.webContents.capturePage()).toPNG());
  win.setContentSize(300,400);await new Promise(resolve=>setTimeout(resolve,150));
  report.responsive=await win.webContents.executeJavaScript(`(()=>{const p=document.querySelector('.ti-math-variables-popup').getBoundingClientRect();if(p.right>innerWidth-11||p.bottom>innerHeight-11||p.top<11)throw Error('Variable list escapes viewport');return {width:p.width,height:p.height,viewport:[innerWidth,innerHeight]};})()`);
  fs.writeFileSync(out+'.mobile.png',(await win.webContents.capturePage()).toPNG());
  fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({ok:false,error:String(error)},null,2));console.error(error);if(win&&!win.isDestroyed()){fs.writeFileSync(out+'.failure.png',(await win.webContents.capturePage()).toPNG());win.destroy();}server?.close();app.exit(1);});

async function check(){
  const must=(value,message)=>{if(!value)throw Error(message);},pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const wait=async fn=>{const end=Date.now()+5000;while(!fn()){if(Date.now()>end)throw Error('Var timeout');await pause(15);}};
  const anchor=document.querySelector('#anchor'),source=document.querySelector('#source'),api=window.TnsMathTools;
  const entries=[{name:'a',value:12},{name:'lib_strings',value:[['yes','no']]},{name:'help',type:'Prgm',insertion:'numtheory\\help()'},{name:'primecount',type:'Func',parameters:'a,b',insertion:'numtheory\\primecount()'},{name:'lib_name',value:'numtheory'},{name:'values',value:[1,2]}];
  const open=async(items=entries)=>{const p=api.openVariables({anchor,variables:items,insert:token=>source.setRangeText(token,source.selectionStart,source.selectionEnd,'end')});await wait(()=>p.popup.querySelectorAll('[role=option]').length===items.length);return p;};
  let p=await open(),list=p.popup.querySelector('[role=listbox]');
  must(p.popup.getBoundingClientRect().width===228,'Picker is not the compact TI list');
  must(getComputedStyle(p.popup).backgroundColor==='rgb(255, 255, 255)','TI menu surface should stay white');
  must(getComputedStyle(p.popup.querySelector('header')).display==='none','Native picker should not add a second title toolbar');
  must(!p.popup.querySelector('code'),'Variable values must not be a second visible column');
  must([...list.children].map(button=>button.dataset.variableKind).join(',')==='variable,program,string,matrix,function,list','Variable type glyphs or alphabetical order wrong');
  must(getComputedStyle(list.firstElementChild).backgroundColor==='rgb(40, 122, 196)','Selected entry should be blue');
  source.focus();source.setSelectionRange(7,7);list.focus();
  list.dispatchEvent(new KeyboardEvent('keydown',{key:'p',bubbles:true,cancelable:true}));
  must(list.querySelector('[aria-selected=true]').dataset.variableName==='primecount','Typeahead did not find Func');
  list.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  must(source.value==='before numtheory\\primecount() after','Var insertion lost the caret or library qualification');
  const languages={en:['Variables','Function','Program','Matrix'],es:['Variables','Función','Programa','Matriz'],fr:['Variables','Fonction','Programme','Matrice']};
  for(const[language,labels]of Object.entries(languages)){
    document.documentElement.lang=language;p=await open();list=p.popup.querySelector('[role=listbox]');
    must(p.popup.getAttribute('aria-label')===labels[0],'Localized dialog label missing '+language);
    for(const [name,label]of [['primecount',labels[1]],['help',labels[2]],['lib_strings',labels[3]]])must(list.querySelector(`[data-variable-name="${name}"]`).getAttribute('aria-label').includes(label),'Localized symbol type missing '+language+' '+name);
    list.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));must(document.activeElement===list,'Tab should stay inside the compact picker');
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));must(!p.popup.isConnected,'Escape should close the picker');
  }
  document.documentElement.lang='en';document.documentElement.dataset.theme='light';
  p=await open(Array.from({length:100},(_,i)=>({name:'fn_'+String(i).padStart(3,'0'),type:'Func',parameters:'n'})));list=p.popup.querySelector('[role=listbox]');
  list.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));await pause(30);must(list.scrollTop>0,'End did not scroll to the final symbol');must(list.querySelector('[aria-selected=true]').dataset.variableName==='fn_099','Final symbol inaccessible');
  list.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));must(list.scrollTop===0,'Home did not scroll back');
  list.dispatchEvent(new KeyboardEvent('keydown',{key:'PageDown',bubbles:true,cancelable:true}));must(list.querySelector('[aria-selected=true]').dataset.variableName!=='fn_000','PageDown did not navigate');
  list.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
  return {ok:true,reference:'Alphabetic names, blue type glyphs, white list, blue selection; no cards or value column.',compactWidth:true,caretAndQualifiedToken:true,typedLookup:true,localizedTypes:Object.keys(languages),tabTrap:true,escape:true,lastSymbolAccessible:true,pageNavigation:true};
}
