import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function helpers(){
 const context={window:{},document:{documentElement:{lang:'en'}}};
 vm.runInNewContext(fs.readFileSync(new URL('../web/document-preview-navigation.js',import.meta.url),'utf8'),context);
 context.window.TnsDocumentPreviewNavigation=context.TnsDocumentPreviewNavigation;
 vm.runInNewContext(fs.readFileSync(new URL('../web/document-page-layout.js',import.meta.url),'utf8'),context);
 return context.window.TnsDocumentPageLayout;
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('page layout offers exactly the native designs compatible with the selected application count',()=>{
 const api=helpers();
 for(const [count,expected] of [[0,[]],[1,[0]],[2,[1,2]],[3,[3,4,5,6]],[4,[7]],[5,[]]])assert.deepEqual(plain(api.validLayouts(count).map(value=>value.clay)),expected);
});
test('symbolic preview preserves asymmetric native divider ratios, slot order and full page coverage',()=>{
 const api=helpers(),ratios={w1:4000,h1:3000,w2:1234,h2:6500};
 assert.deepEqual(plain(api.previewCells(5,ratios)),[[0,0,.4,.3],[.4,0,.6,1],[0,.3,.4,.7]]);
 assert.deepEqual(plain(api.previewCells(6,ratios)),[[0,0,.4,1],[.4,0,.6,.65],[.4,.65,.6,.35]]);
 for(let clay=0;clay<8;clay++){
  const cells=api.previewCells(clay,ratios);
  assert.ok(Math.abs(cells.reduce((area,cell)=>area+cell[2]*cell[3],0)-1)<1e-10,'Preview must fill the page: '+clay);
  cells.forEach(([x,y,w,h],i)=>{assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1);cells.slice(i+1).forEach(([a,b,c,d])=>assert.ok(Math.min(x+w,a+c)<=Math.max(x,a)||Math.min(y+h,b+d)<=Math.max(y,b),'Preview slots overlap: '+clay));});
 }
 assert.deepEqual(plain(api.previewCells(99)),[]);
});
test('symbolic applications keep native identifiers and the same app colors as document navigation',()=>{
 const api=helpers();
 for(const [label,type,accent] of [['Notepad','TI.Notepad','#ffad32'],['Graph','TI.GeoGrapher','#299bbe'],['Scratchpad','TI.Scratchpad','#89869d'],['Spreadsheet','tabulator','#59b9a8'],['Python','TI.PythonEditor','#3c7faf']])assert.deepEqual(plain(api.applicationAppearance({content_label:label})),{type,accent});
 assert.deepEqual(plain(api.applicationAppearance({name:'TI.ProgramEditor',detail:{name:'do not replace app type'}})),{type:'TI.ProgramEditor',accent:'#f5656b'});
});
test('page organization guidance and selection controls are available in every website language',()=>{
 for(const language of ['en','es','fr']){
  const context={window:{},document:{documentElement:{lang:language}}};
  vm.runInNewContext(fs.readFileSync(new URL('../web/document-page-layout.js',import.meta.url),'utf8'),context);
  const words=context.window.TnsDocumentPageLayout.words();
  for(const key of ['pages','organize','multiple','clear','selected','total','arrange','keyboard','tooMany'])assert.ok(words[key],language+': '+key);
 }
});
