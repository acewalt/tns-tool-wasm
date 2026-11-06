import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const start=app.indexOf('function documentWidgetPreviewPages(');
const end=app.indexOf('\nfunction documentPreviewFileKey(',start);
assert.ok(start>=0&&end>start,'Document widget page mapper must be available');
const context={documentPreviewFileKey:file=>String(file).replaceAll('\\','/').split('/').pop()};
vm.runInNewContext(fs.readFileSync(new URL('../web/document-preview-navigation.js',import.meta.url),'utf8'),context);
vm.runInNewContext(app.slice(start,end)+'\nglobalThis.mapPages=documentWidgetPreviewPages;',context);
const groups=items=>context.TnsDocumentPreviewNavigation.groups(items);
const map=items=>Array.from(context.mapPages(items,groups(items)));

function widget(problem,card,name,contentLabel=''){
  return{type:'Widget',name,content_label:contentLabel,file:`/stage/Problem${problem}.xml`,path:`/prob/card[${card}]/wdgt`};
}
function script(owner,content){
  return{type:'Lua Script',content_label:'Lua',file:owner.file,path:owner.path+'/sc/script',name:'Lua Script',content};
}

test('document pages contain each actual Widget once in natural Problem/card order',()=>{
  const sheets=widget(2,2,'tabulator','Spreadsheet');
  const notes=widget(2,10,'TI.Notepad','Notepad');
  const program=widget(10,1,'TI.ProgramEditor','ProgramEditor');
  const lua=widget(2,1,'TI.ScriptApp');
  const luaSource=script(lua,'function on.paint(gc) gc:drawString("hello",0,0) end');
  const image={type:'Resource',content_label:'Image',name:'unused.bmp',file:'/stage/unused.bmp',path:'/unused.bmp'};
  const symbol={type:'Func',name:'f1',file:sheets.file,path:'/prob/sym/e',content:'sin(x)'};
  const original=[program,notes,luaSource,image,lua,symbol,sheets];
  const pages=map(original);
  assert.deepEqual(pages.map(page=>page.name),['TI.ScriptApp','tabulator','TI.Notepad','TI.ProgramEditor']);
  assert.deepEqual(pages.map(page=>page.previewKind),['lua','sheets','notes','basic']);
  assert.equal(pages.length,4,'Lua source, image resources and Func symbols are not additional widget pages');
  assert.equal(original[0],program,'Mapping must not sort the caller’s inspector items in place');
  assert.equal(pages[0].previewItem,luaSource);
  assert.equal(pages[1].previewItem,sheets);
  assert.equal(pages[3].previewItem,program);
});

test('an image ScriptApp maps its sourceName to the matching image without duplicating its page',()=>{
  const imageApp=widget(1,3,'TI.ScriptApp');
  const imageSource=script(imageApp,'local sourceName = "page0.BMP"\nlocal screen = image.new(sourceName)');
  const otherImage={type:'Resource',content_label:'Image',name:'page1.BMP',file:'/stage/page1.BMP',path:'/page1.BMP'};
  const targetImage={type:'Resource',content_label:'Image',name:'page0.BMP',file:'/stage/page0.BMP',path:'/page0.BMP'};
  const pages=map([otherImage,targetImage,imageSource,imageApp]);
  assert.equal(pages.length,1);
  assert.equal(pages[0].previewKind,'images');
  assert.equal(pages[0].previewItem,targetImage);
  assert.equal(pages[0].path,imageApp.path,'The image page retains its calculator widget position');
  assert.equal(pages[0].file,imageApp.file);
});

test('ScriptApp finds its own nested Lua source and never a similarly named path in another problem',()=>{
  const app=widget(3,2,'TI.ScriptApp');
  const foreign=script({...app,file:'/stage/Problem2.xml'},'local sourceName="foreign.bmp"');
  const similar=script({...app,path:app.path+'Extra'},'local sourceName="wrong.bmp"');
  const own=script({...app,file:'C:\\stage\\Problem3.xml'},'function on.paint(gc) gc:drawString("own",0,0) end');
  const pages=map([foreign,similar,app,own]);
  assert.equal(pages.length,1);
  assert.equal(pages[0].previewKind,'lua');
  assert.equal(pages[0].previewItem,own);
});

test('image paths with a directory match image_file and missing image resources keep the Lua preview',()=>{
  const imageApp=widget(1,1,'TI.ScriptApp');
  const imageSource=script(imageApp,"local sourceName='assets/picture.bmp'");
  const image={type:'Resource',content_label:'Image',name:'picture.bmp',file:'/stage/assets/picture.bmp',path:'/assets/picture.bmp',detail:{image_file:'C:\\stage\\assets\\picture.bmp'}};
  const pages=map([imageApp,imageSource,image]);
  assert.equal(pages[0].previewKind,'images');
  assert.equal(pages[0].previewItem,image);
  const missing=map([imageApp,imageSource]);
  assert.equal(missing[0].previewKind,'lua');
  assert.equal(missing[0].previewItem,imageSource);
});

test('unsupported widgets and empty ScriptApps remain visible pages with an explicit fallback kind',()=>{
  const unsupported=widget(1,4,'TI.Geometry');
  const emptyScript=widget(1,1,'TI.ScriptApp');
  const pages=map([unsupported,emptyScript]);
  assert.equal(pages.length,2);
  assert.deepEqual(pages.map(page=>page.previewKind),['unsupported','unsupported']);
  assert.equal(pages[0].previewItem,emptyScript);
  assert.equal(pages[1].previewItem,unsupported);
  assert.deepEqual(map([]),[]);
});
