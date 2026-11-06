import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const markup=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('Math view is the final Edit action, with a single preserved command target',()=>{
  const start=markup.indexOf('<div id="xml-edit-menu"');
  const end=markup.indexOf('<button id="xml-prgm-preview-btn"',start);
  const commands=[...markup.slice(start,end).matchAll(/<button\b[^>]*\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(commands.at(-1),'xml-math-view-btn');
  assert.equal((markup.match(/\bid="xml-math-view-btn"/g)||[]).length,1);
  assert.match(markup.slice(start,end),/id="xml-math-view-btn"[^>]*class="menu-action"[^>]*aria-pressed="false"/);
});

test('Edit Math view follows the selected Program Editor, without leaking to another app',()=>{
  let programEditor=true;
  const buttons=new Map(['xml-prgm-preview-btn','xml-math-templates-btn','xml-math-catalog-btn','xml-variables-btn','xml-math-view-btn'].map(id=>[id,{hidden:true,disabled:true}]));
  const source={disabled:false,value:'Prgm\nDisp 1\nEndPrgm'};
  const context={document:{querySelector:selector=>selector==='#xml-code'?source:buttons.get(selector.slice(1)),getElementById:id=>buttons.get(id)},isTiProgramEditorSelected:()=>programEditor,xmlDoctor:{current:{is_program_editor:true}},syncProgramEditorDeclaration(){},tiProgramTools:null,tiMathEditor:null};
  const start=app.indexOf('function syncPrgmPreviewButton()');
  const end=app.indexOf('function programEditorDeclaration(',start);
  vm.runInNewContext(app.slice(start,end)+'\nglobalThis.refresh=syncPrgmPreviewButton;',context);
  context.refresh();
  for(const [id,button] of buttons){assert.equal(button.hidden,false,id);assert.equal(button.disabled,false,id);}
  programEditor=false;context.xmlDoctor.current={is_program_editor:false};context.refresh();
  for(const [id,button] of buttons){assert.equal(button.hidden,true,id);assert.equal(button.disabled,true,id);}
});
