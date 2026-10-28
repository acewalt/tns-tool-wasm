const fs=require('node:fs/promises');
async function checkNdlessPreview(win,report){
 const animation=`#include <os.h>
#include <SDL/SDL.h>
int main(){if(SDL_Init(SDL_INIT_VIDEO)<0)return 1;
SDL_Surface*s=SDL_SetVideoMode(320,240,16,SDL_SWSURFACE);if(!s)return 2;
for(unsigned frame=1;!isKeyPressed(KEY_NSPIRE_ESC);frame++){
SDL_FillRect(s,0,SDL_MapRGB(s->format,(frame*3)%256,isKeyPressed(KEY_NSPIRE_ENTER)?255:0,31));
SDL_Flip(s);SDL_PumpEvents();}SDL_Quit();return 0;}`;
 return run(win,report,animation);
}
async function run(win,report,animation){
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const workspace=window.NdlessProjectWorkspace,api=window.NdlessProjectCore;
  const wait=async(predicate,timeout=20000)=>{const end=Date.now()+timeout;while(!predicate()){if(Date.now()>end)throw Error('ARM UI timed out: '+document.querySelector('[data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,25));}};
  const p=api.createProject({name:'live-preview-acceptance',language:'c',template:'basic',target:'zehn-modern'});
  workspace.activateProject(p);
  const canvas=()=>document.querySelector('[data-ndless-project-canvas]');
  const pixel=()=>Array.from(canvas().getContext('2d').getImageData(160,160,1,1).data).slice(0,3);
  await wait(()=>window.NdlessLivePreview.state?.stage==='running'&&pixel()[0]>150);
  const initial=pixel();
  const model=window.TnsMonacoEditor.monaco.editor.getModels().find(m=>m.getValue()===p.files[p.activeFile]);
  if(!model)throw Error('Real project editor model is missing');
  const lcd=color=>'#include <os.h>\\nstatic unsigned short pixels[320*240];\\nint main(){for(int i=0;i<320*240;i++)pixels[i]='+color+';lcd_init(SCR_320x240_565);lcd_blit(pixels,SCR_320x240_565);while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}';
  model.setValue(lcd(0xf800));model.setValue(lcd(0x07e0));model.setValue(lcd(0x001f));
  if(window.NdlessLivePreview.state.stage!=='scheduled'||pixel()[0]>30)throw Error('Editing did not immediately discard old frame');
  await wait(()=>pixel()[2]===255&&pixel()[0]===0);
  const edited=pixel();
  model.setValue('int main(){ syntax broken }');
  await wait(()=>window.NdlessLivePreview.state.stage==='compile-error');
  if(pixel()[2]===255)throw Error('Compilation error retained old executable image');
  model.setValue(${JSON.stringify(animation)});
  await wait(()=>window.NdlessLivePreview.state.stage==='running'&&pixel()[2]>0);
  const colors=new Set();for(let i=0;i<12;i++){colors.add(pixel().join(','));await new Promise(r=>setTimeout(r,40));}
  if(colors.size<3)throw Error('Compiled animation is not updating');
  // Editor typing must never become calculator input. Only the focused canvas receives keys.
  model.setValue(model.getValue()+'\\n// input event and recompilation');
  await wait(()=>window.NdlessLivePreview.state.stage==='running'&&pixel()[2]>0);
  canvas().focus();canvas().dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',bubbles:true}));
  await wait(()=>pixel()[1]===255);
  canvas().dispatchEvent(new KeyboardEvent('keyup',{code:'Enter',bubbles:true}));
  document.querySelector('[data-live-pause]').click();await new Promise(r=>setTimeout(r,100));
  const paused=pixel().join(',');await new Promise(r=>setTimeout(r,180));if(pixel().join(',')!==paused)throw Error('Paused ARM kept painting');
  document.querySelector('[data-live-pause]').click();await wait(()=>pixel().join(',')!==paused);
  model.setValue('int main(){for(;;)__asm__ volatile("nop");}');
  await wait(()=>window.NdlessLivePreview.state.stage==='running');
  const start=performance.now();await new Promise(r=>requestAnimationFrame(r));const uiResponseMs=performance.now()-start;
  if(uiResponseMs>300)throw Error('Infinite ARM program blocked the editor');
  model.setValue(lcd(0x07e0));await wait(()=>pixel()[1]===255&&pixel()[0]===0);
  model.setValue('#include <os.h>\\n#include <stdio.h>\\n#include <string.h>\\nstatic unsigned short p[76800];\\nint main(int argc,char**argv){char b[32]={0};FILE*f=argc>1?fopen(argv[1],"rb"):0;if(f){fread(b,1,31,f);fclose(f);}for(int i=0;i<76800;i++)p[i]=!strcmp(b,"RESOURCE_OK")?0x07e0:0xf800;lcd_init(0);lcd_blit(p,0);while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}');
  await wait(()=>window.NdlessLivePreview.state.stage==='running'&&pixel()[0]===255);
  const resources=document.querySelector('[data-live-resources]'),transfer=new DataTransfer();transfer.items.add(new File(['RESOURCE_OK'],'stage with space.txt'));resources.files=transfer.files;resources.dispatchEvent(new Event('change'));
  await wait(()=>pixel()[1]===255&&pixel()[0]===0);
  if(!document.querySelector('[data-live-args]').value.includes('stage with space.txt'))throw Error('Resource path argument is missing');
  document.querySelector('[data-live-clear-resources]').click();await wait(()=>pixel()[0]===255&&pixel()[1]===0);
  const sprites=api.createProject({name:'sprites-dialog-acceptance',language:'c',target:'zehn-modern'});
  sprites.files['main.c']=await(await fetch('./examples/ndless-games/sprites/main.c')).text();sprites.files['lab.h']=await(await fetch('./examples/ndless-games/lab.h')).text();workspace.activateProject(sprites);
  await wait(()=>window.NdlessLivePreview.state?.stage==='dialog');
  const dialog=document.querySelector('.ndless-live-dialog');if(dialog.hidden||!dialog.textContent.includes("Couldn't open sprite.bmp"))throw Error('Missing resource dialog was not shown');
  const choice=[...dialog.querySelectorAll('button')].find(b=>b.textContent==='Continue');if(!choice)throw Error('Native Continue choice missing');choice.click();
  await wait(()=>window.NdlessLivePreview.state.stage==='running'&&document.querySelector('[data-live-log]').textContent.includes('asset=0'));
  if(!dialog.hidden)throw Error('Answered dialog remained visible');
  workspace.closeProject();
  const binaryProject=api.createProject({name:'binary-preview-test',language:'c',target:'zehn-modern'});
  binaryProject.files['main.c']='#include <os.h>\\nvolatile char marker[]="BINARY_RED";static unsigned short p[76800];int main(){for(int i=0;i<76800;i++)p[i]=marker[7]==82?0xf800:0x001f;lcd_init(0);lcd_blit(p,0);while(!isKeyPressed(KEY_NSPIRE_ESC)){}return 0;}';
  binaryProject.settings.build={version:1,sources:['main.c']};
  const artifact=await window.NdlessLocalBridge.build(binaryProject);
  if(!artifact.logs?.some(line=>line.includes('1 translation units')))throw Error('Explicit SDK profile did not run');
  await window.TnsNdlessEditor.open(new File([artifact.bytes],'binary-preview-test.tns'));
  document.querySelector('[data-nav="preview"]').click();
  const binaryPixel=()=>Array.from(document.querySelector('[data-binary-canvas]').getContext('2d').getImageData(160,160,1,1).data).slice(0,3);
  await wait(()=>window.NdlessExecutablePreview.state?.stage==='running'&&binaryPixel()[0]===255);
  const binaryEdited=window.TnsNdlessEditor.getCurrent(),image=binaryEdited.adapter.workingBytes,marker=new TextEncoder().encode('BINARY_RED');let at=-1;
  outer:for(let i=0;i<image.length-marker.length;i++){for(let j=0;j<marker.length;j++)if(image[i+j]!==marker[j])continue outer;at=i;break;}
  if(at<0)throw Error('Nested Zehn working image unavailable');binaryEdited.adapter.patchWorking(at+7,new Uint8Array([66]));
  document.querySelector('.ndless-executable-preview [data-live-restart]').click();
  await wait(()=>window.NdlessExecutablePreview.state.stage==='running'&&binaryPixel()[2]===255&&binaryPixel()[0]===0);
  document.querySelector('[data-friendly="home"]').click();await wait(()=>window.NdlessExecutablePreview.state===null);
  document.querySelector('[data-nav="preview"]').click();await wait(()=>window.NdlessExecutablePreview.state?.stage==='running'&&binaryPixel()[2]===255);
  document.querySelector('.ndless-editor-close').click();await wait(()=>window.NdlessExecutablePreview.state===null);
  const out={ok:true,initial,edited,animationColors:colors.size,keyboard:true,pause:true,sourceError:true,immediateInvalidation:true,infiniteLoopStopped:true,uiResponseMs,resources:true,quotedArguments:true,clearResources:true,nativeDialog:true,spritesWithoutBmp:true,binaryPreview:true,binaryEdits:true,binaryClose:true,sourceProfile:true};
  workspace.closeProject();if(window.NdlessLivePreview.state!==null)throw Error('Closing workspace retained ARM execution');
  return out;
 })()`);
 if(process.env.TNS_DESKTOP_SMOKE_PROJECT){
  const bytes=await fs.readFile(process.env.TNS_DESKTOP_SMOKE_PROJECT),base64=bytes.toString('base64');
  let probing=false;const progress=setInterval(async()=>{if(probing)return;probing=true;try{const state=await win.webContents.executeJavaScript('({state:window.NdlessLivePreview?{stage:window.NdlessLivePreview.state?.stage}:null,note:document.querySelector("[data-preview-note]")?.textContent,active:window.NdlessProjectWorkspace?.getProject?.()?.activeFile,log:document.querySelector("[data-live-log]")?.textContent?.slice(-800)})');await fs.writeFile(report+'.project-progress.json',JSON.stringify(state,null,2));}catch(_){}finally{probing=false;}},5000);
  try{
  result.importedProject=await win.webContents.executeJavaScript(`(async()=>{
   const zip=Uint8Array.from(atob(${JSON.stringify(base64)}),c=>c.charCodeAt(0));
   const start=performance.now(),ws=window.NdlessProjectWorkspace;
   await ws.openProjectZip(new File([zip],'imported-source-project.zip'));
   const wait=async(fn)=>{const end=Date.now()+180000;while(!fn()){if(Date.now()>end)throw Error('Imported project preview timed out: '+document.querySelector('[data-preview-note]')?.textContent);await new Promise(r=>setTimeout(r,50));}};
   await wait(()=>window.NdlessLivePreview.state?.stage==='running');
   const p=ws.getProject();if(!p.settings?.build?.sources?.length)throw Error('Explicit build source list lost during ZIP import');
   const sources=p.settings.build.sources.length,source=p.files[p.activeFile];
   const model=window.TnsMonacoEditor.monaco.editor.getModels().find(m=>m.getValue()===source);if(!model)throw Error('Imported source editor not found');
   if(!source.includes('lcd_init(SCR_320x240_565);'))throw Error('Expected editable display initializer');
   model.setValue('#include <stdio.h>\\n'+source.replace('lcd_init(SCR_320x240_565);','puts("SOURCE_EDIT_OK");fflush(stdout);lcd_init(SCR_320x240_565);'));
   await wait(()=>document.querySelector('[data-live-log]')?.textContent.includes('SOURCE_EDIT_OK'));
   ws.closeProject();return{sources,edited:true,recompiled:true,ms:performance.now()-start};
  })()`);
  }finally{clearInterval(progress);}
 }
 await fs.writeFile(report+'.ndless-preview.json',JSON.stringify(result,null,2));return result;
}
module.exports={checkNdlessPreview,run};
