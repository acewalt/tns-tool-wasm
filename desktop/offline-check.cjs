// Runs against the real preload/native compiler with every external request
// refused before it reaches the network. No OS connection settings are changed.
const fs=require('node:fs/promises');
function blockExternalRequests(ses){
  const blocked=[];
  ses.webRequest.onBeforeRequest({urls:['*://*/*']},(details,callback)=>{
    const host=new URL(details.url).hostname;
    const cancel=!['127.0.0.1','localhost','[::1]'].includes(host);
    if(cancel)blocked.push({url:details.url,type:details.resourceType});
    callback({cancel});
  });
  return blocked;
}
function pdfFixture(){
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 80 60] /Resources << >> /Contents 4 0 R >>'];
  const content='0 0 1 rg 0 0 80 60 re f';objects.push('<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');
  let data='%PDF-1.4\n',offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(data));data+=(index+1)+' 0 obj\n'+object+'\nendobj\n';});
  const xref=Buffer.byteLength(data);data+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return Buffer.from(data).toString('base64');
}
async function check(win,reportPath,blocked){
  const report={ok:false,offline:true};
  try{
    report.local=await win.webContents.executeJavaScript(`(async()=>{
      const wait=async(fn,label)=>{const end=Date.now()+45000;while(!fn()){if(Date.now()>end)throw Error('Offline timeout: '+label);await new Promise(resolve=>setTimeout(resolve,30));}};
      const must=(value,message)=>{if(!value)throw Error(message);};
      await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsMonacoEditor&&!document.querySelector('#startup-loader')&&!document.querySelector('#xml-toggle-btn').disabled,'startup');
      await window.NdlessRuntimeReady;
      must(!!window.TnsDesktop,'Real native preload missing');
      const loadedFonts=await document.fonts.load('12px "Fira Code"');must(loadedFonts.some(font=>font.status==='loaded'),'Bundled terminal font did not load');
      const python=await pyodide.runPythonAsync('sum(range(100))');must(python===4950,'Local Python execution failed');
      if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();
      await createEmptyXmlProjectForPageCreation();
      const creation=addProgramEditorToStage();await wait(()=>document.querySelector('#xpe-apply'),'Program settings');document.querySelector('#xpe-apply').click();await creation;
      const field=document.querySelector('#xml-code'),source='Prgm\\nLocal x\\nx:=-15\\nDisp abs(x)\\nEndPrgm';
      codeEditorAdapters.get('#xml-code').replaceRange(source,0,field.value.length);
      const syntax=await runXmlSyntax();must(syntax.errors===0,'Offline syntax analysis failed');await embedXmlCode();
      const canvas=document.createElement('canvas');canvas.width=318;canvas.height=212;
      const log={textContent:'',scrollTop:0,scrollHeight:0},runtime=await createLuaJsPreviewRuntime('platform.apilevel="2.3"\\nfunction on.paint(gc) gc:setColorRGB(255,0,0) gc:fillRect(0,0,318,212) gc:drawString("Offline",5,5,"top") end',canvas.getContext('2d'),canvas,log);
      runtime.boot();runtime.close();must(canvas.getContext('2d').getImageData(100,100,1,1).data[0]===255,'Offline Lua paint failed');
      await wait(()=>window.TnsCasBridge&&window.TnsTiBasicMath,'CAS bridge');
      must(await window.TnsCasBridge.ensureReady(),'Local CAS did not load');
      const math=window.TnsTiBasicMath.createSession({language:'en',angleMode:'RAD'}),answer=await math.evaluateAsync('diff(x^3,x)');
      must(!answer.error&&/3.*x/.test(answer.display),'Offline symbolic CAS failed: '+answer.display);
      const imageBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));await addImageWidgetToStage(new File([imageBlob],'offline.png',{type:'image/png'}));
      let downloaded=null;const oldDownload=downloadBytes;downloadBytes=(name,bytes)=>{downloaded={name,length:bytes.length};};
      try{await createTnsFromXmlDoctor();}finally{downloadBytes=oldDownload;}
      must(downloaded?.length>1000,'Offline TNS build failed');
      const pdfScript=document.createElement('script');pdfScript.src='/__desktop/pdfjs/pdf.min.js';await new Promise((resolve,reject)=>{pdfScript.onload=resolve;pdfScript.onerror=reject;document.head.append(pdfScript);});
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='/__desktop/pdfjs/pdf.worker.min.js';
      const pdf=await window.pdfjsLib.getDocument({data:Uint8Array.from(atob(${JSON.stringify(pdfFixture())}),c=>c.charCodeAt(0))}).promise,page=await pdf.getPage(1),pdfCanvas=document.createElement('canvas'),viewport=page.getViewport({scale:1});pdfCanvas.width=viewport.width;pdfCanvas.height=viewport.height;
      await page.render({canvasContext:pdfCanvas.getContext('2d'),viewport}).promise;const pixel=pdfCanvas.getContext('2d').getImageData(40,30,1,1).data;must(pixel[2]===255&&pixel[0]===0,'Offline PDF worker/render failed');await pdf.destroy();
      const status=await window.TnsDesktop.compilerStatus();must(status.toolchainReady&&status.selfContained,'Bundled Ndless SDK unavailable');
      const builds=[];for(const language of ['c','cpp']){const project=window.NdlessProjectCore.createProject({language,template:'basic',target:'zehn-modern'}),zip=new window.JSZip();for(const [name,content]of Object.entries(window.NdlessProjectCore.exportEntries(project)))zip.file(name,content);const result=await window.TnsDesktop.buildNdless({name:'offline-'+language,zip:await zip.generateAsync({type:'uint8array'})});must(result.ok&&result.bytes.length>1000,'Offline '+language+' Ndless build failed');builds.push({language,bytes:result.bytes.length,format:result.format});}
      return{startup:true,terminalFontLocal:true,python:true,syntax:true,tnsBuild:downloaded,luaPaint:true,cas:{backend:window.TnsCasBridge.getStatus().backend,derivative:answer.display},imageImport:true,pdfWorkerRender:true,ndlessBuilds:builds};
    })()`);
    // Normal documents and Ndless workspaces intentionally live in separate
    // sessions. Start the source-project checks in a fresh local app session.
    await new Promise(resolve=>{win.webContents.once('did-finish-load',resolve);win.reload();});
    await win.webContents.executeJavaScript(`(async()=>{const end=Date.now()+45000;while(typeof pyodide==='undefined'||!pyodide||!window.NdlessProjectWorkspace||document.querySelector('#startup-loader')||document.querySelector('#xml-toggle-btn').disabled){if(Date.now()>end)throw Error('Offline reload timed out');await new Promise(r=>setTimeout(r,30));}await window.NdlessRuntimeReady;if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();})()`);
    report.armPreview=await require('./smoke-ndless-preview.cjs').checkNdlessPreview(win,reportPath);
    report.nes=await require('./smoke-rom.cjs').checkRom(win,reportPath);
    report.gb=await require('./smoke-rom.cjs').checkGb(win,reportPath);
    report.romCores=await require('./smoke-rom-cores.cjs').check(win,reportPath);
    report.blockedRequests=[...new Map(blocked.map(item=>[item.url,item])).values()];
    report.runtimeExternalRequests=report.blockedRequests.filter(item=>!item.url.startsWith('https://tns-tool-stats.guard-mauricio-save.workers.dev/'));
    if(report.runtimeExternalRequests.length)throw Error('Runtime attempted external dependency: '+report.runtimeExternalRequests.map(item=>item.url).join(', '));
    report.ok=true;
  }catch(error){report.error=error.stack||String(error);report.blockedRequests=blocked;throw error;}
  finally{await fs.writeFile(reportPath,JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report));return report;
}
module.exports={blockExternalRequests,pdfFixture,check};
