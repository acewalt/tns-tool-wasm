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
  const out={ok:true,initial,edited,animationColors:colors.size,keyboard:true,pause:true,sourceError:true,immediateInvalidation:true,infiniteLoopStopped:true,uiResponseMs};
  workspace.closeProject();if(window.NdlessLivePreview.state!==null)throw Error('Closing workspace retained ARM execution');
  return out;
 })()`);
 await fs.writeFile(report+'.ndless-preview.json',JSON.stringify(result,null,2));return result;
}
module.exports={checkNdlessPreview,run};
