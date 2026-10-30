async function check(win){
 return win.webContents.executeJavaScript(`(async()=>{
  const xml=document.querySelector('[data-i18n="xmlActionsMenu"]').closest('.tool-menu');
  if(!xml.previousElementSibling?.classList.contains('ti-file-action-separator'))throw Error('Missing separator above XML actions');
  const visible=el=>el&&!el.hidden&&getComputedStyle(el).display!=='none';
  const sidebar=[...document.querySelectorAll('.tools-sidebar > .panel')].filter(visible),transfer=document.querySelector('#xml-transfer-calculator-btn');
  if(sidebar.length!==2||!transfer?.closest('.tools-sidebar')||transfer.closest('.menu-panel'))throw Error('Sidebar transfer or hidden module navigation failed');
  transfer.click();const manager=document.querySelector('.ti-manager-overlay');
  if(!manager||manager.hidden)throw Error('Sidebar calculator manager did not open');
  manager.querySelector('[data-ti-close]').click();
  const layer=document.querySelector('.click-burst-layer');if(!layer||getComputedStyle(layer).display==='none')throw Error('Click feedback is hidden');
  document.querySelector('.doctor-toolbar h2').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:500,clientY:200}));
  const ring=layer.querySelector('.click-burst-ring'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!ring||getComputedStyle(ring).animationName!==(reduced?'clickBurstRingReduced':'clickBurstRing'))throw Error('Click ring did not animate');
  if(reduced&&layer.querySelector('.click-burst-dot'))throw Error('Reduced motion still emitted particles');
  await new Promise(r=>setTimeout(r,750));if(layer.children.length)throw Error('Click feedback elements were not cleaned up');
  return {ok:true,xmlSeparator:true,clickFeedback:true,reducedMotion:reduced,sidebarTransfer:true};
 })()`);
}
module.exports={check};
