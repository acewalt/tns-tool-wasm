// NES performance and N64 input checks against the actual browser workers.
async function check(win){
 const nes=Buffer.from(require('../tests/fixtures/nes-homebrew.cjs')()).toString('base64'),n64=Buffer.from(require('./rom-test-n64.cjs')()).toString('base64');
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const wait=async fn=>{const end=Date.now()+30000;while(!await fn()){if(Date.now()>end)throw Error('ROM improvements timeout: '+document.querySelector('[data-rom-status]')?.textContent);await new Promise(r=>setTimeout(r,25));}};
  const spacer=document.createElement('div');spacer.style.height='2000px';document.body.append(spacer);window.scrollTo(0,800);await new Promise(r=>requestAnimationFrame(r));
  window.TnsRomConverter.open();const q=s=>document.querySelector('.rom-converter '+s),overlay=document.querySelector('.rom-converter-overlay');
  const contained=()=>{const a=overlay.getBoundingClientRect(),b=q('.rom-header').getBoundingClientRect();if(a.top< -1||a.bottom>innerHeight+1||b.top<0||b.bottom>innerHeight)throw Error('ROM modal escaped viewport after scroll');};contained();
  const select=(base64,name)=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],name));q('[data-rom-file]').files=dt.files;q('[data-rom-file]').dispatchEvent(new Event('change'));};
  select(${JSON.stringify(nes)},'animated-original.nes');await wait(()=>window.TnsRomConverter.state.preview==='running');const before=Number(q('[data-rom-frames]').textContent.replaceAll(',','').replaceAll('.',''))||0,start=performance.now();await new Promise(r=>setTimeout(r,2200));const after=Number(q('[data-rom-frames]').textContent.replaceAll(',','').replaceAll('.','')),fps=(after-before)*1000/(performance.now()-start);if(fps<20)throw Error('Direct NES preview too slow: '+fps);contained();
  q('[data-live-stop]').click();q('[data-rom-autoplay]').checked=false;select(${JSON.stringify(n64)},'original-controller-test.n64');await wait(()=>window.TnsRomConverter.state.ready&&window.TnsRomConverter.state.info.id==='n64');
  const OriginalWorker=window.Worker,messages=[];window.Worker=class extends OriginalWorker{postMessage(data,...args){if(data.type==='key')messages.push({...data});return super.postMessage(data,...args);}};
  try{
   q('[data-rom-preview]').click();await wait(()=>window.TnsRomConverter.state.preview==='running'&&q('.rom-n64-controller'));
   const deck=q('.rom-n64-controller'),keys=q('.ndless-live-keys');if(deck.getBoundingClientRect().width<keys.getBoundingClientRect().width*.9||deck.scrollWidth>deck.clientWidth+1)throw Error('N64 controller does not fit its panel');
   for(const code of ['KeyI','KeyJ','KeyK','KeyL','Enter','ControlLeft','ShiftLeft','Tab','KeyX','KeyR','Digit8','Digit4','Digit2','Digit6'])if(!q('[data-preview-key="'+code+'"]'))throw Error('N64 control missing: '+code);
   const pad=q('[data-preview-key="KeyI"]');pad.onpointerdown({preventDefault(){},pointerId:1});pad.onpointerup();
   const stick=q('.rom-n64-stick'),r=stick.getBoundingClientRect();stick.onpointerdown({preventDefault(){},pointerId:2,clientX:r.right-1,clientY:r.top+r.height/2});stick.onpointerup();
   await new Promise(r=>setTimeout(r,100));for(const code of ['KeyI','ArrowRight'])if(!messages.some(m=>m.code===code&&m.down)||!messages.some(m=>m.code===code&&!m.down))throw Error('N64 control did not press and release: '+code);
   const green=getComputedStyle(q('[data-preview-key="ShiftLeft"]')).backgroundImage,blue=getComputedStyle(q('[data-preview-key="ControlLeft"]')).backgroundImage;if(green===blue)throw Error('N64 face button colors were not applied');
   contained();q('[data-rom-expand]').click();contained();q('[data-rom-expand]').click();
  }finally{window.TnsRomConverter.close();window.Worker=OriginalWorker;spacer.remove();window.scrollTo(0,0);}
  const fileMenu=document.querySelector('#xml-new-ndless-project').parentElement,openLabel=fileMenu.querySelector('label[data-ndless-project-always]'),xml=fileMenu.querySelector('[data-i18n="xmlActionsMenu"]').closest('.tool-menu'),newProject=fileMenu.querySelector('#xml-new-ndless-project');
  if(!window.TnsDesktop&&openLabel.querySelector('.ndless-project-off-badge')?.textContent!=='PC')throw Error('Open Ndless Project requires a PC badge');
  if(!(xml.compareDocumentPosition(newProject)&Node.DOCUMENT_POSITION_FOLLOWING))throw Error('XML actions must precede Ndless');
  if(typeof markNormalProjectActive==='function')markNormalProjectActive();const button=document.querySelector('#xml-rom-converter');if(button.hidden||getComputedStyle(button).display==='none')throw Error('ROM Converter hidden by a normal document');
  return{ok:true,nesFps:Math.round(fps),nesFrames:after-before,modalContained:true,n64IndependentControls:true,normalDocumentMenu:true,pcBadge:true,xmlBeforeNdless:true};
 })()`);
 return result;
}
module.exports={check};
