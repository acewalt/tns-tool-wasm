const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const {makeServer,listen}=require(path.join(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'),'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/builder-v51/browser.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-builder-v51-')));
let win,server;const logs=[],checks=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const js=source=>win.webContents.executeJavaScript(source);
const must=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
async function move(x,y){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x),y:Math.round(y)});await pause(40);}
async function click(x,y){await move(x,y);win.webContents.sendInputEvent({type:'mouseDown',button:'left',x:Math.round(x),y:Math.round(y),clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',button:'left',x:Math.round(x),y:Math.round(y),clickCount:1});await pause(60);}
async function drag(from,to){await move(from.x,from.y);win.webContents.sendInputEvent({type:'mouseDown',button:'left',x:Math.round(from.x),y:Math.round(from.y),clickCount:1});await move((from.x+to.x)/2,(from.y+to.y)/2);await move(to.x,to.y);win.webContents.sendInputEvent({type:'mouseUp',button:'left',x:Math.round(to.x),y:Math.round(to.y),clickCount:1});await pause(80);}
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(root,'../portable-0.1.27/desktop/vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(r,done)=>done({cancel:!r.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1650,height:1080,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));await win.loadURL(origin);
 await js(`(${setup.toString()})()`);
 for(const zoom of [.55,1,1.65]){
  await js(`fixture(${zoom})`);await pause(100);
  const a=await js('socket()'),end=await js('emptyPoint()');await drag(a,end);
  must(await js(`vp().dataset.interaction==='CHOOSING_NODE'`),'wire release enters chooser at '+zoom);
  const stable=await js(`({path:q('.pending-wire').getAttribute('d'),rect:rect(q('.lvb-node-menu')),count:b.getProject().graphs[key].nodes.length})`);
  await move(stable.rect.x+70,stable.rect.y+40);await pause(50);
  must(await js(`q('.pending-wire').getAttribute('d')===${JSON.stringify(stable.path)}`),'frozen endpoint while using chooser at '+zoom);
  must(await js(`Math.abs(q('.lvb-node-menu').getBoundingClientRect().x-${stable.rect.x})<1`),'chooser fixed at '+zoom);
  await js(`q('.lvb-node-menu input').value='navigate';q('.lvb-node-menu input').dispatchEvent(new Event('input'));`);
  const item=await js(`rect(q('[data-add=navigate]'))`);await click(item.x+item.w/2,item.y+item.h/2);await pause(80);
  must(await js(`b.getProject().graphs[key].nodes.length===${stable.count+1}&&b.getProject().graphs[key].edges.length===1`),'create once and connect at '+zoom);
  must(await js(`vp().dataset.interaction==='IDLE'&&!q('.pending-wire')&&!q('.lvb-node-menu')&&!!q('.lvb-node.is-selected')`),'cleanup and selected new node at '+zoom);
  await js(`q('[data-command=undo]').click()`);await pause(100);
  must(await js(`b.getProject().graphs[key].nodes.length===${stable.count}&&b.getProject().graphs[key].edges.length===0`),'atomic undo node plus connection at '+zoom);
  await js(`q('[data-command=redo]').click()`);await pause(80);
  must(await js(`b.getProject().graphs[key].nodes.length===${stable.count+1}&&b.getProject().graphs[key].edges.length===1`),'atomic redo at '+zoom);
 }
 // Drag to the extreme viewport corner; chooser must stay fully inside.
 await js('fixture(1)');await pause(80);const r=await js('rect(vp())');await drag(await js('socket()'),{x:r.x+r.w-2,y:r.y+r.h-2});
 must(await js(`(()=>{const a=rect(q('.lvb-node-menu')),b=rect(vp());return a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w+1&&a.y+a.h<=b.y+b.h+1})()`),'edge chooser clamped');
 win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await pause(80);
 must(await js(`!q('.pending-wire')&&vp().dataset.interaction==='IDLE'`),'Escape cancels provisional wire');
 await drag(await js('socket()'),await js('emptyPoint()'));await js(`window.dispatchEvent(new Event('blur'))`);
 must(await js(`!q('.pending-wire')&&!q('.lvb-node-menu')&&vp().dataset.interaction==='IDLE'`),'focus loss cleans chooser');
 // Exercise cancellation events; offscreen Electron input may not expose native capture.
 for(const cause of ['pointercancel','lostpointercapture']){
  await js(`(async()=>{await fixture(1);vp().addEventListener('pointerdown',e=>window.testPointerId=e.pointerId,{capture:true,once:true})})()`);await pause(80);
  const start=await js('socket()'),end=await js('emptyPoint()');await move(start.x,start.y);
  win.webContents.sendInputEvent({type:'mouseDown',button:'left',x:Math.round(start.x),y:Math.round(start.y),clickCount:1});await move(end.x,end.y);
  must(await js(`vp().dataset.interaction==='DRAGGING_WIRE'`),'wire drag active before '+cause);
  if(cause==='pointercancel')await js(`vp().dispatchEvent(new PointerEvent('pointercancel',{pointerId:window.testPointerId,bubbles:true}))`);
  else await js(`vp().hasPointerCapture(window.testPointerId)?vp().releasePointerCapture(window.testPointerId):vp().dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:window.testPointerId,bubbles:true}))`);
  await move(end.x+2,end.y+2);await pause(80);
  must(await js(`vp().dataset.interaction==='IDLE'&&!q('.pending-wire')&&!q('.lvb-node-menu')&&!vp().hasPointerCapture(window.testPointerId)`),cause+' cleans wire and capture');
  win.webContents.sendInputEvent({type:'mouseUp',button:'left',x:Math.round(end.x),y:Math.round(end.y),clickCount:1});await pause(50);
  must(await js(`!q('.lvb-node-menu')&&b.getProject().graphs[key].edges.length===0`),'release after '+cause+' does not reopen chooser');
 }
 await js('fixture(1)');await pause(80);await drag(await js('socket()'),await js('emptyPoint()'));
 const outside=await js('rect(vp())');await click(outside.x+4,outside.y+4);
 must(await js(`!q('.pending-wire')&&!q('.lvb-node-menu')&&vp().dataset.interaction==='IDLE'`),'outside click cancels chooser');
 await js(`fixture(1)`);await pause(80);await drag(await js('socket()'),await js('emptyPoint()'));
 await js(`q('.lvb-node-menu input').value='navigate';q('.lvb-node-menu input').dispatchEvent(new Event('input'));q('.lvb-node-menu input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))`);await pause(80);
 must(await js(`b.getProject().graphs[key].edges.length===1&&!q('.lvb-node-menu')`),'keyboard node creation');
 // Reconnect an existing input; cancel must retain the original wire.
 await drag(await js(`socket('.lvb-port[data-direction=input][data-port=in]')`),await js('emptyPoint()'));
 await js(`q('.lvb-node-menu input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
 must(await js(`b.getProject().graphs[key].edges.length===1`),'cancel reconnection preserves original edge');
 await drag(await js(`socket('.lvb-port[data-direction=input][data-port=in]')`),await js('emptyPoint()'));
 await js(`q('.lvb-node-menu input').value='setText';q('.lvb-node-menu input').dispatchEvent(new Event('input'));q('.lvb-node-menu input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);await pause(100);
 must(await js(`b.getProject().graphs[key].edges.length===1&&b.getProject().graphs[key].nodes.find(n=>n.id===b.getProject().graphs[key].edges[0].to).type==='setText'`),'reconnection replaces exact edge');
 must(await js(`noOverlap()`),'contextual placement avoids actual node bounds');
 await js(`explorerFixture()`);await pause(100);
 must(await js(`!q('[data-branch="'+key.split(':')[0]+'"] [data-branch="'+key.split(':')[0]+':'+key.split(':')[0]+'"]')`),'no redundant page owner');
 must(await js(`q('[data-event-tree] [data-event-key="'+b.getProject().pages[1].id+':show"]')?.closest('details')?.dataset.branch===b.getProject().pages[1].id`),'page event directly under page');
 const layouts=[];for(const [w,h]of [[1280,720],[1366,768],[1600,900],[1920,1080],[2560,1440]]){win.setSize(w,h);await pause(120);layouts.push(await js(`({size:[${w},${h}],overflow:b.modal.scrollWidth>b.modal.clientWidth+2,explorer:rect(q('.lvb-event-explorer'))})`));fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report+'.'+w+'.png',(await win.webContents.capturePage()).toPNG());}
 must(layouts.every(r=>!r.overflow),'bounded explorer across five resolutions');
 const extra=await js(`(${extendedChecks.toString()})()`);
 for(const [w,h]of [[900,650],[1280,720],[1920,1080]]){win.setSize(w,h);await pause(80);for(const n of [4,10,25,50]){const r=await js(`overviewStress(${n})`);must(!r.overflow&&!r.overlap,'Overview bounded and non-overlapping '+n+' pages at '+w);extra.overview.push({size:[w,h],count:n,...r});}fs.writeFileSync(report+'.overview-'+w+'.png',(await win.webContents.capturePage()).toPNG());}
 fs.writeFileSync(report,JSON.stringify({ok:true,checks,layouts,extra,logs},null,2));console.log(JSON.stringify({ok:true,checks:checks.length,report}));
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack,checks,logs},null,2));if(win)fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);process.exitCode=1;}).finally(()=>{win?.destroy();server?.close();app.quit();});
async function setup(){
 const wait=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<600&&typeof showLuaEditor!=='function';i++)await wait(50);
 window.build=await import('./web/lua-visual-builder.js');window.model=await import('./src/lua-visual-builder/model.js');window.sem=await import('./src/lua-visual-builder/semantics.js');
 window.q=s=>b.modal.querySelector(s);window.rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};window.vp=()=>q('.lvb-graph-viewport');
 window.fixture=async z=>{window.b?.close();window.b=await build.openLuaVisualBuilder({language:'en',source:''});const p=model.template('menu');window.key=p.startPage+':go0:click';sem.setEventActions(p,key,[]);p.graphs[key].view={x:45,y:35,z};p.graphs[key].nodes[0].x=20;p.graphs[key].nodes[0].y=20;b.setProject(p);q('[data-widget-tree] [data-id=go0] [data-graph]').click();q('[data-logic-mode=advanced]').click();};
 window.socket=(selector='.lvb-port[data-direction=out]')=>{const r=rect(q(selector+' i'));return{x:r.x+r.w/2,y:r.y+r.h/2}};
 window.emptyPoint=()=>{const r=rect(vp());return{x:r.x+r.w*.77,y:r.y+r.h*.70}};
 window.noOverlap=()=>{const nodes=[...b.modal.querySelectorAll('[data-node]')].map(rect);return nodes.every((a,i)=>nodes.every((c,j)=>i===j||a.x+a.w<=c.x||c.x+c.w<=a.x||a.y+a.h<=c.y||c.y+c.h<=a.y));};
 window.explorerFixture=async()=>{b?.close();window.b=await build.openLuaVisualBuilder({language:'en',source:''});const p=model.template('menu');window.key=p.startPage+':go0:click';b.setProject(p);q('[data-widget-tree] [data-id=go0] [data-graph]').click();q('[data-expand-all]').click();};
}

async function extendedChecks(){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);};
 await explorerFixture();let p=b.getProject();
 const ev=p.startPage+':go0:click',row=()=>q('[data-tree-event="'+ev+'"]');
 must(row().classList.contains('is-configured'),'configured state');row().querySelector('[data-event-star]').click();
 q('[data-event-favorites]').checked=true;q('[data-event-favorites]').dispatchEvent(new Event('change'));must(q('[data-tree-event]'),'favorites filter');
 q('[data-event-favorites]').checked=false;q('[data-event-favorites]').dispatchEvent(new Event('change'));
 const page=p.pages[1];q('[data-owner-add="'+page.id+'"]').click();must(q('[data-add-event=show]')&&!q('[data-add-event=click]'),'page-compatible events');
 q('[data-add-event=show]').click();must(q('.lvb-breadcrumb').textContent.includes(page.name),'context exact page');
 q('[data-event-search]').value='Exercises';q('[data-event-search]').dispatchEvent(new Event('input'));must([...b.modal.querySelectorAll('[data-event-key]')].every(el=>!el.dataset.eventKey.includes(':go0:')&&!el.dataset.eventKey.includes(':go1:')),'hierarchical search');
 q('[data-event-search]').value='';q('[data-event-search]').dispatchEvent(new Event('input'));q('[data-collapse-explorer]').click();must(q('.lvb-explorer-collapsed'),'collapse');q('[data-mode=design]').click();q('[data-mode=logic]').click();must(q('.lvb-explorer-collapsed'),'collapsed preference across tabs');
 // Restore preference, and ensure a context menu does not survive an outside click.
 q('[data-collapse-explorer]').click();q('[data-expand-all]').click();const target=q('[data-event-key="'+ev+'"]');target.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:40,clientY:300}));must(q('[data-explorer-action=delete]'),'context actions');document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));must(!q('.lvb-explorer-menu'),'outside cancels outliner menu');
 const {openLuaVisualBuilder}=build;
 window.overviewStress=async count=>{b.close();window.b=await openLuaVisualBuilder({language:'en',source:''});const p=model.template('menu');while(p.pages.length<count){const pg=model.page('Page '+(p.pages.length+1));pg.components=[{...model.component('Button'),id:'go',text:'Back'}];p.pages.push(pg);sem.setEventActions(p,pg.id+':go:click',[{type:'back'}]);}b.setProject(p);const before=JSON.stringify(b.getProject());q('[data-mode=overview]').click();await pause(70);q('[data-overview-fit]').click();const nodes=[...b.modal.querySelectorAll('[data-relation-node]')].map(rect),overlap=nodes.some((a,i)=>nodes.some((c,j)=>i!==j&&a.x<c.x+c.w-.5&&a.x+a.w>c.x+.5&&a.y<c.y+c.h-.5&&a.y+a.h>c.y+.5));q('[data-overview-mode=dependencies]').click();q('[data-overview-mode=list]').click();must(q('.lvb-overview-list table'),'list mode');q('[data-overview-mode=structure]').click();must(JSON.stringify(b.getProject())===before,'overview read only');return {overflow:b.modal.scrollWidth>b.modal.clientWidth+2,overlap,nodes:nodes.length};};
 const original='local page=1\nfunction on.paint(gc) gc:setColorRGB(20,40,60) gc:drawString(page==1 and "Hello Lua" or "Second page",10,20,"top") gc:fillRect(10,50,100,25) end\nfunction on.enterKey() page=page==1 and 2 or 1 end';
 b.close();window.b=await openLuaVisualBuilder({language:'es',source:original,filename:'capture-test.lua'});q('[data-analyze-current]').click();q('[data-start-visual-capture]').click();q('[data-capture-start]').click();for(let i=0;i<400&&q('[data-capture-screen]').disabled;i++)await pause(50);must(!q('[data-capture-screen]').disabled,'capture running');q('[data-capture-screen]').click();const canvas=q('iframe').contentDocument.querySelector('canvas');canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await pause(100);q('[data-capture-screen]').click();must(b.modal.querySelectorAll('.lvb-captured-screens article').length===2,'two actual captured screens');
 q('[data-capture-cancel]').click();q('[data-start-visual-capture]').click();
 must(b.modal.querySelectorAll('.lvb-captured-screens article').length===2,'session retained across workspaces');q('[data-native-screen]').click();must(q('[data-review-screens] details'),'component review');q('[data-convert-capture]').click();must(b.getProject().reconstruction.original===original&&b.getProject().pages.length===2,'all screens converted with original backup');must(b.getProject().pages.every(pg=>pg.components.every(c=>!c.locked)),'native reconstruction editable');q('[data-mode=compare]').click();must(q('.lvb-import-comparison')||q('[data-run-original]')||b.modal.textContent.includes('Hello Lua'),'comparison available');
 return{outliner:true,capture:true,overview:[]};
}
