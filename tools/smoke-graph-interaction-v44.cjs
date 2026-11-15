/* Real offline app: blank graph, repeat drags, direct wave stretch, native save/reopen. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v44/graph-interaction.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-graph-v44-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_event,level,message)=>logs.push({level,message}));await win.loadURL(origin);
 const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsGraphPreview&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
 const item=await addGraphWidgetToStage();must(TnsGraphPreview.parseXml(item.raw_xml).curves.length===0,'new graph contains an unsolicited sample curve');
 let opened=await openGraphInLovePreview(item),view=opened.view;await pause(100);
 const entry=()=>view.root.querySelector('.ti-graph-entry'),field=()=>entry().querySelector('.ti-graph-entry-input');
 const submit=source=>{field().value=source;entry().requestSubmit();};
 must(!entry().hidden&&!field().value,'new graph does not show its blank entry');view.root.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));must(!entry().hidden,'Escape hid the empty entry before entering a function');
 const emptySave=await saveGraphWidgetToStage(item,view.getState());must(TnsGraphPreview.parseXml(emptySave.raw_xml).curves.length===0,'saving an empty graph synthesized zero');item.raw_xml=emptySave.raw_xml;
 submit('sin(x)');await pause(50);must(entry().hidden&&view.getState().curves[0].formula==='sin(x)','Enter did not submit/hide entry');
 const label=()=>view.root.querySelector('.ti-graph-curve-label');must(label()?.querySelector('math'),'curve label does not use mathematical rendering');
 const pointer=(type,x,y)=>{const r=view.canvas.getBoundingClientRect(),v=view.getState().viewport;view.canvas.dispatchEvent(new PointerEvent(type,{button:0,pointerId:1,clientX:r.left+(x-v.xmin)/(v.xmax-v.xmin)*r.width,clientY:r.top+(v.ymax-y)/(v.ymax-v.ymin)*r.height,bubbles:true,cancelable:true}));};view.canvas.setPointerCapture=()=>{};
 const gesture=(x,y,dx,dy)=>{pointer('pointermove',x,y);pointer('pointerdown',x,y);pointer('pointermove',x+dx,y+dy);pointer('pointerup',x+dx,y+dy);};
 const initialViewport=JSON.stringify(view.getState().viewport);
 for(let i=0;i<60;i++){
   const model=TnsGraphPreview.waveTransform(view.getState().curves[0].formula),period=2*Math.PI/model.frequency;let x=(.2-model.phase)/model.frequency;x+=Math.round(-x/period)*period;
   const y=model.amplitude*Math.sin(model.frequency*x+model.phase)+model.offset;gesture(x,y,.1,.01);
   must(view.getState().curves[0].formula.length<50,'repeated translation nested the formula');
 }
 await pause(50);must(JSON.stringify(view.getState().viewport)===initialViewport,'moving a curve panned the graph');must(!view.root.dataset.error,'translated curve has an evaluation error: '+view.root.dataset.error);
 view.showEntry(view.getState().curves[0]);submit('sin(x)');await pause(20);must(view.getState().curves[0].formula==='sin(x)','equation editing updated a detached snapshot');
 pointer('pointermove',Math.PI/2,1);must(view.root.dataset.curveInteraction==='reshape','crest did not offer shape manipulation');
 gesture(Math.PI/2,1,Math.PI/2,1);await pause(50);
 const shaped=view.getState().curves[0].formula;must(shaped==='2*sin(0.5*x)','direct crest drag did not change amplitude/period: '+shaped);
 must(label().querySelector('mo')&&label().textContent.includes('·'),'math label does not show multiplication in 2D');
 const saved=await saveGraphWidgetToStage(item,view.getState());item.raw_xml=saved.raw_xml;must(TnsGraphPreview.parseXml(saved.raw_xml).curves[0].formula===shaped,'native graph save lost reshaped formula');
 const savedTwice=await saveGraphWidgetToStage(item,view.getState());must(TnsGraphPreview.parseXml(savedTwice.raw_xml).curves.length===1,'repeated save duplicated the native curve');
 opened.dispose();await pause(250);const fresh=(await inspectXmlDocument()).items.find(i=>i.content_label==='Graph');opened=await openGraphInLovePreview(fresh);view=opened.view;await pause(100);view.canvas.setPointerCapture=()=>{};
 must(view.getState().curves[0].formula===shaped,'native graph reopen changed shape');gesture(.4,2*Math.sin(.2),.5,.25);await pause(30);
 must(view.getState().curves[0].formula==='2*sin(0.5*x-0.25)+0.25','translation after native reopen nested/lost coefficients');
 view.showEntry(view.getState().curves[0]);submit('0');await pause(20);must(entry().hidden&&view.getState().curves[0].formula==='0','a user-entered zero was treated as an empty graph');
 view.showEntry(view.getState().curves[0]);submit(shaped);await pause(30);
 // A grouped Graph must participate in the page Save/layout commit just as
 // its Notes or Calculator siblings do; saving the divider alone loses curves.
 opened.dispose();await pause(200);await addNotepadWidgetToStage();
 let data=await inspectXmlDocument(),cards=documentLayoutCards(data),graphCard=cards.find(c=>c.apps.some(a=>a.name==='TI.GeoGrapher')),noteCard=cards.find(c=>c.apps.some(a=>a.name==='TI.Notepad'));
 await applyDocumentPageLayout({action:'group',file:graphCard.file,path:graphCard.path,cards:[graphCard,noteCard],layout:{clay:1,w1:5000,h1:5000,w2:5000,h2:5000}});
 const currentGroups=async()=>{const data=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);return groups;};
 let groups=await currentGroups(),index=groups.widgets.findIndex(page=>page.previewItems?.some(app=>app.previewKind==='graphs'));
 let compound=await openDocumentAppPreview(groups,'widgets',index,{});await pause(80);
 let graph=compound.controllers.find(c=>c.kind==='graphs');must(graph,'grouped Graph has no document Save adapter');
 const editGraph=source=>{graph.showEntry(graph.getState().curves[0]);const form=graph.root.querySelector('.ti-graph-entry');form.querySelector('.ti-graph-entry-input').value=source;form.requestSubmit();};
 editGraph('3*cos(x)');graph.setViewport({xmin:-8,xmax:8,ymin:-4,ymax:4});
 compound.backdrop.querySelector('[data-compound-save]').click();await wait(()=>compound.backdrop.querySelector('[data-compound-status]').textContent==='Layout saved','grouped graph Save');
 must((await inspectXmlDocument()).items.find(i=>i.name==='TI.GeoGrapher').raw_xml.includes('3*cos(x)'),'page Save omitted edited curve');
 compound.dispose();closeModal(compound.backdrop);await pause(200);groups=await currentGroups();compound=await openDocumentAppPreview(groups,'widgets',index,{});await pause(80);graph=compound.controllers.find(c=>c.kind==='graphs');
 must(graph.getState().curves[0].formula==='3*cos(x)'&&graph.getState().viewport.xmin===-8,'grouped Graph save/reopen lost curve or viewport');
 documentCalculatorContext(graph.item.file).mathSession.evaluate('qa_amplitude:=4');editGraph('qa_amplitude*sin(x)');await pause(50);must(!graph.root.dataset.error,'grouped Graph lost shared maths/stored variables');
 const before=(await inspectXmlDocument()).items.find(i=>i.name==='TI.GeoGrapher');editGraph('4*sin(x)');
 const layout=await openDocumentPageLayout(groups.widgets[index]);must((await inspectXmlDocument()).items.find(i=>i.name==='TI.GeoGrapher').raw_xml.includes('4*sin(x)'),'layout snapshot omitted pending Graph edit');layout.close();
 const snapshot=pyodide.FS.readFile(before.file,{encoding:'utf8'});let rejected=false;try{await saveGraphWidgetToStage(before,{...graph.getState(),curves:[{...graph.getState().curves[0],formula:'999'}]});}catch(error){rejected=/changed/.test(error.message);}
 must(rejected&&pyodide.FS.readFile(before.file,{encoding:'utf8'})===snapshot,'stale Graph overwrote the current widget');
 compound.dispose();closeModal(compound.backdrop);await pause(150);
 pyodide.globals.set('qa_graph_file',before.file);
 const native=await pyodide.runPythonAsync(`import pathlib,tnstools
_qa_graph_file=pathlib.Path(qa_graph_file)
_qa_graph_out=pathlib.Path('/tmp/qa-graph-v44.tns')
tnstools.build_tns_from_xml(_qa_graph_file.parent,_qa_graph_out)
_qa_graph_reopen=pathlib.Path('/tmp/qa-graph-v44-reopened');_qa_graph_reopen.mkdir(exist_ok=True)
tnstools.decode_tns_file(_qa_graph_out,_qa_graph_reopen)
len(_qa_graph_out.read_bytes())`);
 const decoded=await pyodide.runPythonAsync("(_qa_graph_reopen/_qa_graph_file.name).read_text(encoding='utf-8')");await loadXmlDoctorFiles([new File([decoded],'Problem1.xml')],'file');groups=await currentGroups();const final=await openDocumentAppPreview(groups,'widgets',index,{});await pause(60);
 must(final.controllers.find(c=>c.kind==='graphs').getState().curves[0].formula==='4*sin(x)','native TNS roundtrip lost grouped Graph');
 return{ok:true,offline:true,blankEntry:true,blankNativeSave:true,repeatedGestures:60,mathematicalLabel:true,crestReshapesAmplitudePeriod:true,nativeSaveReopen:true,repeatSaveNoDuplicates:true,zeroIsValid:true,formula:shaped,groupedSaveReopen:true,groupedViewport:true,layoutCommitsGraph:true,staleGraphRejected:true,sharedMathVariables:true,nativeTnsRoundtrip:true,nativeTnsBytes:Number(native)};
}
