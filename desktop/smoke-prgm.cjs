const fs=require('node:fs/promises');
async function checkPrgm(win,report){
  // Use the same editable program selection as a decoded TNS, then click the
  // actual toolbar entry. Source stays in memory; no user document is written.
  const result=await win.webContents.executeJavaScript(`(async()=>{
    const end=Date.now()+30000;
    while(!window.TnsPrgmPreview){if(Date.now()>end)throw Error('Prgm UI not loaded');await new Promise(r=>setTimeout(r,50));}
    const source=await (await fetch('./examples/physics-prgm.tib')).text();
    xmlDoctor.candidates=[{index:0,program_name:'phy',document_type:'Prgm',code:source,file:'Problem1.xml'}];
    setXmlDoctorEnabled(true);selectXmlProgram(0);
    const button=document.getElementById('xml-prgm-preview-btn');
    if(button.hidden||button.disabled)throw Error('Prgm toolbar button unavailable');
    button.click();
    const $=s=>document.querySelector('.prgm-preview-overlay '+s);
    const state=()=>window.TnsPrgmPreview.getSnapshot();
    if(state().pending?.variable!=='opcion')throw Error('Main menu did not request input');
    const history=$('.prgm-preview-history'), originalRows=[...$('[data-output]').children];
    const initialWidth=history.clientWidth, initialLeft=originalRows[0].getBoundingClientRect().left;
    const font=getComputedStyle(history).fontSize, popup=$('[data-request]').getBoundingClientRect();
    const inputFont=getComputedStyle($('[data-input]')).fontSize, executed=state().executed;
    $('[data-input]').value='1+0';$('[data-expand]').click();
    await new Promise(r=>setTimeout(r,80));
    const enlargedPopup=$('[data-request]').getBoundingClientRect();
    if(getComputedStyle(history).fontSize!==font||getComputedStyle($('[data-input]')).fontSize!==inputFont||Math.abs(enlargedPopup.width-popup.width)>1||Math.abs(enlargedPopup.height-popup.height)>1)
      throw Error('Expanded view scaled the text or Request dialog');
    if(getComputedStyle($('.prgm-preview-screen')).transform!=='none'||getComputedStyle($('.prgm-preview-chrome')).display!=='none')throw Error('Expanded view did not use the Lua-style canvas layout');
    if($('[data-input]').value!=='1+0'||state().executed!==executed)throw Error('Expanded view discarded input or advanced the program');
    $('[data-expand]').click();await new Promise(r=>setTimeout(r,80));
    $('[data-input]').value='1';$('[data-request]').requestSubmit();
    if(state().pending?.variable!=='seleccion'||!state().text.includes('MENU PRINCIPAL')||!state().text.includes('op: 1'))throw Error('First answer discarded calculator history');
    if(originalRows.some((row,i)=>$('[data-output]').children[i]!==row)||history.clientWidth!==initialWidth||Math.abs(originalRows[0].getBoundingClientRect().left-initialLeft)>1)
      throw Error('Answer rebuilt or horizontally shifted the existing output');
    const screenBounds=$('.prgm-preview-screen').getBoundingClientRect(), promptBounds=$('[data-request]').getBoundingClientRect();
    if(Math.abs(promptBounds.y+promptBounds.height/2-screenBounds.y-screenBounds.height/2)>1)throw Error('Request dialog is not centered like the calculator');
    for(const value of [2,6,2,56,5,41]){
      $('[data-input]').value=String(value);$('[data-request]').requestSubmit();
    }
    if(state().status!=='done'||!state().text.includes('(t)=0.70966 s'))throw Error('Physics screenshot route failed');
    const screen=$('.prgm-preview-screen');
    if(screen.offsetWidth!==320||screen.offsetHeight!==240)throw Error('Wrong calculator viewport');
    const normal=$('.prgm-preview-screen-shell').getBoundingClientRect().width;
    $('[data-expand]').click();await new Promise(r=>setTimeout(r,80));
    const enlarged=$('.prgm-preview-screen-shell').getBoundingClientRect().width;
    if(enlarged<=normal)throw Error('Expanded Prgm preview did not enlarge');
    $('[data-expand]').click();$('[data-restart]').click();
    if(state().pending?.variable!=='opcion'||state().variables.opcion!==undefined)throw Error('Restart leaked old variables');
    const invalid='1/0';$('[data-input]').value=invalid;$('[data-request]').requestSubmit();
    if($('[data-error]').hidden||state().status!=='waiting')throw Error('Invalid input did not remain recoverable');
    $('[data-input]').value='1';$('[data-request]').requestSubmit();
    if(!$('[data-error]').hidden||state().pending.variable!=='seleccion')throw Error('Corrected input failed');
    $('[data-restart]').click();
    await new Promise(r=>setTimeout(r,100));
    return {ok:true,toolbar:true,viewport:{width:320,height:240},expanded:true,expandedCanvas:true,stableHistory:true,fixedPopup:true,physicsResult:0.70966,requests:7,restart:true,inputRecovery:true};
  })()`);
  await fs.writeFile(report+'.prgm.png',(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`(()=>{
    const input=document.querySelector('.prgm-preview-overlay [data-input]');input.value='1';
    input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  })()`);
  await new Promise(resolve=>setTimeout(resolve,100));
  await win.webContents.executeJavaScript(`if(window.TnsPrgmPreview.getSnapshot().pending?.variable!=='seleccion')throw Error('Enter did not submit the Request')`);
  result.keyboardEnter=true;
  await win.webContents.executeJavaScript(`document.querySelector('.prgm-preview-overlay [data-expand]').click()`);
  await new Promise(resolve=>setTimeout(resolve,100));
  await fs.writeFile(report+'.prgm-expanded.png',(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(String.raw`(()=>{
    const old=document.querySelector('#xml-code').value;
    document.querySelector('#xml-code').value='Prgm\nDisp "UNSAVED EDIT"\nEndPrgm';
    document.querySelector('.prgm-preview-overlay [data-restart]').click();
    if(window.TnsPrgmPreview.getSnapshot().text!=='UNSAVED EDIT')throw Error('Refresh ignored unsaved source');
    document.querySelector('.prgm-preview-overlay [data-close]').click();
    if(document.querySelector('.prgm-preview-overlay'))throw Error('Prgm close failed');
    document.querySelector('#xml-code').value='Func\nReturn 1\nEndFunc';
    syncPrgmPreviewButton();
    if(!document.querySelector('#xml-prgm-preview-btn').hidden)throw Error('Prgm entry shown for Func');
    document.querySelector('#xml-code').value=old;
  })()`);
  return result;
}
module.exports={checkPrgm};
