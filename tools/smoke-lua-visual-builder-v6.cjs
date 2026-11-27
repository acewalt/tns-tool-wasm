const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const {makeServer,listen}=require(path.join(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'),'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/builder-v6/browser.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-builder-v6-')));
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
 await v6Checks();
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
  must(await js(`!q('.wire-hit[marker-end],.wire-hit[marker-start]')`),'wire hit areas do not duplicate direction markers at '+zoom);
  must(await js(`vp().dataset.interaction==='IDLE'&&!q('.pending-wire')&&!q('.lvb-node-menu')&&!!q('.lvb-node.is-selected')`),'cleanup and selected new node at '+zoom);
  must(await js(`(()=>{const a=rect(q('.lvb-node.is-selected')),v=rect(vp());return a.x>=v.x-1&&a.y>=v.y-1&&a.x+a.w<=v.x+v.w+1&&a.y+a.h<=v.y+v.h+1})()`),'created node remains visible after collision placement at '+zoom);
  await js(`q('[data-command=undo]').click()`);await pause(100);
  must(await js(`b.getProject().graphs[key].nodes.length===${stable.count}&&b.getProject().graphs[key].edges.length===0`),'atomic undo node plus connection at '+zoom);
  await js(`q('[data-command=redo]').click()`);await pause(80);
  must(await js(`b.getProject().graphs[key].nodes.length===${stable.count+1}&&b.getProject().graphs[key].edges.length===1`),'atomic redo at '+zoom);
 }
 // Drag to the extreme viewport corner; chooser must stay fully inside.
 await js('fixture(1)');await pause(80);const r=await js('rect(vp())');await drag(await js('socket()'),{x:r.x+r.w-2,y:r.y+r.h-2});
 must(await js(`(()=>{const a=rect(q('.lvb-node-menu')),b=rect(vp());return a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w+1&&a.y+a.h<=b.y+b.h+1})()`),'edge chooser clamped');
 win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await pause(80);
 must(await js(`!q('.pending-wire')&&!q('.lvb-placement-preview')&&vp().dataset.interaction==='IDLE'`),'Escape cancels provisional wire');
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
 fs.writeFileSync(report+'.wire.png',(await win.webContents.capturePage()).toPNG());
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

async function v6Checks(){
 await js(`(async()=>{window.b=await build.openLuaVisualBuilder({language:'en',source:''});const p=model.template('menu');window.key=p.startPage+':go0:click';b.setProject(p);q('[data-widget-tree] [data-id=go0] [data-graph]').click();})()`);
 must(await js(`q('[data-logic-mode=advanced]').getAttribute('aria-pressed')==='true'`),'Advanced default without changing a preference');
 for(const zoom of [.55,1,1.65]){
  await js(`(async()=>{await fixture(${zoom});const p=b.getProject(),g=p.graphs[key];g.nodes.push({id:'math',type:'multiply',x:240,y:120});b.setProject(p);q('[data-widget-tree] [data-id=go0] [data-graph]').click();})()`);await pause(100);
  const input=await js(`socket('[data-node="math"] .lvb-port[data-direction=input][data-port=a]')`);await drag(input,await js('emptyPoint()'));
  must(await js(`vp().dataset.interaction==='CHOOSING_NODE'`),'unconnected input chooser at '+zoom);
  must(await js(`!!q('.lvb-placement-preview')`),'placement preview before confirmation at '+zoom);
  const pathBefore=await js(`q('.pending-wire').getAttribute('d')`),item=await js(`rect(q('[data-add=input]'))`);await move(item.x+8,item.y+8);
  must(await js(`q('.pending-wire').getAttribute('d')===${JSON.stringify(pathBefore)}`),'input endpoint remains frozen at '+zoom);
  await click(item.x+item.w/2,item.y+item.h/2);
  must(await js(`b.getProject().graphs[key].edges.some(e=>e.to==='math'&&e.input==='a')`),'input chooser creates a producer and connects it at '+zoom);
  must(await js(`!q('.pending-wire')&&vp().dataset.interaction==='IDLE'`),'input chooser cleanup at '+zoom);
 }
 await js(`(async()=>{await explorerFixture();q('[data-mode=navigation]').click()})()`);await pause(100);
 const out=await js(`rect(q('[data-link-port] i'))`),empty=await js(`rect(q('.lvb-nav-viewport'))`);
 await drag({x:out.x+out.w/2,y:out.y+out.h/2},{x:empty.x+empty.w*.8,y:empty.y+empty.h*.78});
 must(await js(`q('.lvb-nav-viewport').dataset.interaction==='CHOOSING_NODE'&&!!q('[data-page-chooser]')`),'Navigation blank drop opens fixed destination picker');
 must(await js(`b.modal.querySelectorAll('[data-destination]').length===b.getProject().pages.length`),'Navigation chooser includes all pages');
 const old=await js(`JSON.stringify(sem.navigationLinks(b.getProject()))`);await move(empty.x+20,empty.y+20);
 must(await js(`JSON.stringify(sem.navigationLinks(b.getProject()))===${JSON.stringify(old)}`),'reconnecting preserves old destination until confirmed');
 win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await pause(60);
 must(await js(`!q('[data-page-chooser]')&&JSON.stringify(sem.navigationLinks(b.getProject()))===${JSON.stringify(old)}`),'Navigation Escape cancels without losing existing edge');
 const sockets=await js(`Array.from(b.modal.querySelectorAll('.lvb-nav-input i,[data-link-port] i')).map(e=>{const r=rect(e);return[r.w,r.h]})`);
 must(sockets.length>0&&sockets.every(([w,h])=>Math.abs(w-h)<.05),'Navigation sockets remain circles');
 for(const lang of ['en','es','fr']){
  await js(`(async()=>{b.close();window.b=await build.openLuaVisualBuilder({language:${JSON.stringify(lang)},source:''});b.setProject(model.template('menu'));q('[data-mode=navigation]').click()})()`);await pause(80);
  const target=await js(`b.getProject().pages.at(-1).id`);
  await js(`(()=>{const p=b.getProject();p.navigation.positions[${JSON.stringify(target)}].x=7000;p.navigation.positions[${JSON.stringify(target)}].manual=true;b.setProject(p);q('[data-mode=navigation]').click()})()`);await pause(80);
  const a=await js(`rect(q('[data-link-port] i'))`),v=await js(`rect(q('.lvb-nav-viewport'))`);
  await drag({x:a.x+a.w/2,y:a.y+a.h/2},{x:v.x+v.w*.7,y:v.y+v.h*.8});
  must(await js(`!!q('[data-destination="'+${JSON.stringify(target)}+'"]')`),'off-screen destination available in '+lang);
  await js(`q('[data-page-chooser] input').value=b.getProject().pages.at(-1).name;q('[data-page-chooser] input').dispatchEvent(new Event('input'));q('[data-page-chooser] input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));`);await pause(80);
  must(await js(`!q('[data-page-chooser]')&&sem.navigationLinks(b.getProject())[0].to===${JSON.stringify(target)}`),'keyboard destination confirmation in '+lang);
 }
 // Creating a destination and its transition is one undoable model mutation.
 await js(`(()=>{const p=model.template('menu');b.setProject(p);q('[data-mode=navigation]').click()})()`);await pause(100);
 const na=await js(`rect(q('[data-link-port] i'))`),nv=await js(`rect(q('.lvb-nav-viewport'))`),prior=await js(`({pages:b.getProject().pages.length,to:sem.navigationLinks(b.getProject())[0].to})`);
 await drag({x:na.x+na.w/2,y:na.y+na.h/2},{x:nv.x+nv.w*.8,y:nv.y+nv.h*.78});
 await js(`q('[data-page-chooser] [data-create]').click()`);await pause(50);
 await js(`document.querySelector('.lvb-form input').value='Created destination';document.querySelector('.lvb-form').requestSubmit()`);await pause(100);
 must(await js(`b.getProject().pages.length===${prior.pages+1}&&b.getProject().pages.find(p=>p.id===sem.navigationLinks(b.getProject())[0].to)?.name==='Created destination'`),'Navigation creates a page and connects the chosen event');
 await js(`q('[data-command=undo]').click()`);await pause(80);
 must(await js(`b.getProject().pages.length===${prior.pages}&&sem.navigationLinks(b.getProject())[0].to===${JSON.stringify(prior.to)}`),'Navigation page creation and edge undo together');
 for(const count of [4,10,25,50]){
  await js(`(()=>{const p=model.template('menu');while(p.pages.length<${count})p.pages.push(model.page('Page '+(p.pages.length+1)));b.setProject(p);q('[data-mode=navigation]').click()})()`);await pause(120);
  const overlap=await js(`(()=>{const nodes=[...b.modal.querySelectorAll('[data-nav-page]')].map(rect);return nodes.some((a,i)=>nodes.some((c,j)=>i!==j&&a.x<c.x+c.w-1&&a.x+a.w>c.x+1&&a.y<c.y+c.h-1&&a.y+a.h>c.y+1))})()`);
  must(!overlap,'Navigation measured nodes do not overlap at '+count+' pages');
 }
 await js(`(()=>{b.setProject(model.template('menu'));q('[data-mode=navigation]').click()})()`);await pause(140);
 fs.writeFileSync(report+'.navigation.png',(await win.webContents.capturePage()).toPNG());
 // Real DOM geometry, nested coordinates and editor metric checks at graph and browser zoom.
 for(const z of [.8,1.25]){
  win.webContents.setZoomFactor(z);
  await js(`(async()=>{b.close();window.inlineModule=await import('./web/lua-visual-designer.js');window.inlineHost=document.createElement('div');Object.assign(inlineHost.style,{position:'fixed',left:'120px',top:'100px',transform:'translate(18px,11px)',zIndex:999999});document.body.append(inlineHost);const p=model.createProject(),pg=p.pages[0];pg.components=[Object.assign(model.component('Panel',40,30),{id:'panel',w:200,h:130}),Object.assign(model.component('Button',12,20),{id:'text',parent:'panel',text:'Nested button',w:130,h:28})];const canvas=document.createElement('canvas');inlineHost.append(canvas);inlineModule.mountDesigner(canvas,{project:p,page:pg,zoom:1.5,selected:()=>['text'],onSelect:()=>{},onMove:()=>{},onDrop:()=>{}});window.inlineCanvas=canvas;})()`);
  // mountDesigner uses callbacks rather than a DOM application fixture.
  await js(`{const r=rect(inlineCanvas);inlineCanvas.dispatchEvent(new MouseEvent('dblclick',{clientX:r.x+(40+12+65)*r.w/320,clientY:r.y+(30+20+14)*r.h/212,bubbles:true}));}`);
  const geometry=await js(`(()=>{const e=document.querySelector('.lvb-inline-editor'),c=rect(inlineCanvas),r=rect(e);return{r,expected:{x:c.x+52*c.w/320,y:c.y+50*c.h/212,w:130*c.w/320,h:28*c.h/212}}})()`);
  must(['x','y','w','h'].every(k=>Math.abs(geometry.r[k]-geometry.expected[k])<1),'nested inline text overlay aligns with actual canvas at browser zoom '+z);
  await js(`document.querySelector('.lvb-inline-editor').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));inlineHost.remove()`);
 }
 win.webContents.setZoomFactor(1);await js('fixture(1)');
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


