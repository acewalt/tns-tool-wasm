import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const appSource=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const dictionaryStart=appSource.indexOf('const I18N = ');
const dictionaryEnd=appSource.indexOf('\n};',dictionaryStart)+4;
const dictionaryContext={};
vm.runInNewContext(appSource.slice(dictionaryStart,dictionaryEnd)+'\nglobalThis.copy=I18N;',dictionaryContext);
const copy=dictionaryContext.copy;
const toolsSource=fs.readFileSync(new URL('../monaco-search-tools.js',import.meta.url),'utf8');

function fixture(initialLanguage){
  let language=initialLanguage,confirmClear=true;
  const confirmations=[],prompts=[],clipboard=[];
  class Element{
    constructor(tagName='div'){this.tagName=tagName;this.dataset={};this.children=[];this.handlers={};this.style={};this.value='';this.textContent='';this.selectionStart=0;this.selectionEnd=0;}
    append(...children){this.children.push(...children);}
    addEventListener(name,callback){(this.handlers[name]||=[]).push(callback);}
    setAttribute(){}
    setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
    closest(){return null;}
    querySelector(){return null;}
    dispatchEvent(){}
    focus(){}
    remove(){}
    getBoundingClientRect(){return{width:200,height:150};}
  }
  const panel=new Element(),raw=new Element('textarea'),log=new Element('pre'),wrap=new Element();
  raw.value='print("hello")';raw.selectionEnd=raw.value.length;
  const document={head:new Element('head'),body:new Element('body'),readyState:'complete',documentElement:{lang:language},
    createElement:tag=>new Element(tag),addEventListener(){},
    getElementById:id=>document.head.children.find(node=>node.id===id),
    querySelector:selector=>selector==='.lua-modal #lua-edit-menu-panel'?panel:selector==='.lua-modal #lua-editor'?raw:selector==='.lua-modal #lua-log'?log:selector==='.lua-modal .lua-editor-wrap'?wrap:null};
  const window={t:key=>copy[language]?.[key]||key,addEventListener(){},innerWidth:900,innerHeight:700,
    confirm:message=>{confirmations.push(message);return confirmClear;},
    prompt:message=>{prompts.push(message);return 'pasted';}};
  vm.runInNewContext(toolsSource,{window,document,navigator:{clipboard:{writeText:async text=>clipboard.push(text)}},MutationObserver:class{observe(){}},Event:class{}});
  const buttons=()=>panel.children.filter(child=>child.tagName==='button');
  return{panel,raw,log,wrap,document,confirmations,prompts,clipboard,buttons,
    button:id=>buttons().find(button=>button.id===id),
    click:async id=>{for(const handler of buttons().find(button=>button.id===id).handlers.click)await handler({preventDefault(){},stopPropagation(){}});},
    setConfirm:value=>{confirmClear=value;},
    setLanguage:next=>{language=next;document.documentElement.lang=next;for(const button of buttons())button.textContent=window.t(button.dataset.i18n);}};
}

const expected={
  es:['Seleccionar todo','Copiar selección','Cortar selección','Pegar','Limpiar documento'],
  en:['Select all','Copy selection','Cut selection','Paste','Clear document'],
  fr:['Tout sélectionner','Copier la sélection','Couper la sélection','Coller','Vider le document'],
};

for(const language of ['es','en','fr']){
  test(`Lua Edit actions and clipboard context menu use ${language}`,async()=>{
    const ui=fixture(language);
    assert.deepEqual(ui.buttons().map(button=>button.textContent),expected[language]);
    assert.ok(ui.buttons().every(button=>button.dataset.i18n),'Generated Edit labels must participate in live language updates');
    await ui.click('lua-copy-selection');
    assert.deepEqual(ui.clipboard,['print("hello")']);
    assert.match(ui.log.textContent,new RegExp(copy[language].editorSelectionCopied.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

    for(const handler of ui.wrap.handlers.contextmenu)handler({target:{closest:()=>({})},preventDefault(){},stopPropagation(){},clientX:15,clientY:20});
    const contextMenu=ui.document.body.children.at(-1);
    for(const key of ['editorCopy','editorCut','editorPaste','editorSelectAll'])assert.ok(contextMenu.innerHTML.includes(copy[language][key]));

    ui.setConfirm(false);
    await ui.click('lua-clear-document');
    assert.equal(ui.raw.value,'print("hello")','Cancelling Clear must retain the current code');
    assert.equal(ui.confirmations.at(-1),copy[language].editorConfirmClearLua);
    ui.setConfirm(true);
    await ui.click('lua-clear-document');
    assert.equal(ui.raw.value,'');
    assert.ok(ui.log.textContent.includes(copy[language].editorDocumentCleared));
    await ui.click('lua-paste-selection');
    assert.equal(ui.prompts.at(-1),copy[language].editorPastePrompt);
    assert.equal(ui.raw.value,'pasted');
  });
}

test('an existing Lua Edit menu and its action messages follow a changed active language',async()=>{
  const ui=fixture('en');
  ui.setLanguage('fr');
  assert.deepEqual(ui.buttons().map(button=>button.textContent),expected.fr);
  ui.raw.setSelectionRange(0,0);
  await ui.click('lua-copy-selection');
  assert.ok(ui.log.textContent.includes(copy.fr.editorNoSelection));
  assert.ok(!ui.log.textContent.includes(copy.en.editorNoSelection));
});
