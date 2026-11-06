import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../web/ti-python-editor-preview.js', import.meta.url), 'utf8'), context);
const python = context.window.TnsPythonPreview;
const app = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const slice = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));

test('Python highlighting preserves source exactly, including multiline strings and escaped delimiters', () => {
  const source = 'from math import *\nx = 3\nprint("<script>\\\"#string")\ns = r"""line one\n#still a string\nline three"""\n#actual comment\ny = x+1';
  const markup = python.highlightSource(source);
  assert.match(markup, /ti-py-string/);
  assert.match(markup, /ti-py-operator">=<\/span>/);
  assert.match(markup, /ti-py-comment">#actual comment/);
  assert.doesNotMatch(markup, /<script>|ti-py-comment">#still/);
  const decoded = markup.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|#39);/g, value => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[value]));
  assert.equal(decoded, source);
  assert.match(python.highlightSource('if x == 2:\n    print(x)'), /ti-py-plain">if/);
});

test('Python editor counter uses every source line and clamps the caret', () => {
  assert.equal(python.lineCounter('a\nb\nc', 3).current, 2);
  assert.equal(python.lineCounter('a\nb\n', 99).current, 3);
  assert.equal(python.lineCounter('', -2).total, 1);
  assert.equal(python.scriptName({ name: '/folder/game.py' }), 'game.py');
});

test('Python Shell command/output rendering never displays a paused input exception', () => {
  assert.equal(python.shellText({name:'demo.py'}, {stdout:'Name? ',waitingForInput:true,error:{type:'PreviewInputExhausted',traceback:'private traceback'}}), '>>>#Running demo.py\n>>>from demo import *\nName? ');
  assert.equal(python.shellText({name:'demo.py'}, {stdout:'Hello\n',success:true}), '>>>#Running demo.py\n>>>from demo import *\nHello\n');
  assert.match(python.shellText({name:'demo.py'}, {stdout:'',error:{type:'ValueError',message:'bad'}}), /ValueError: bad\n$/);
  assert.equal(python.inputText(['']), '\n', 'A deliberately blank input must reach Python input()');
  assert.equal(python.inputText(['one','']), 'one\n\n');
});

test('Python drafts persist to their exact staged resource without marking an unfinished BASIC program saved', () => {
  const files = new Map([['/stage/folder/a.py', 'print("old")']]);
  const item = {content_label:'Python',content:'stale',detail:{name:'a.py',python_file:'/source/folder/a.py'}};
  const scanned = {...item,detail:{...item.detail}};
  const other = {content_label:'Python',content:'other',detail:{name:'a.py',python_file:'/stage/other/a.py'}};
  const context = {xmlDoctor:{stagePath:'/stage',sourcePath:'/source',previewItems:[item,scanned,other],embedded:false},documentXmlFileIdentity:file=>file.replace(/^\/(?:source|stage)\//,''),pyodide:{FS:{readFile:path=>{if(!files.has(path))throw Error('missing');return files.get(path);},analyzePath:path=>({exists:files.has(path)}),mkdirTree(){},writeFile:(path,text)=>files.set(path,text)}}};
  vm.runInNewContext(slice('function documentPythonPreviewFile(', 'async function openDocumentAppPreview(')+'\nglobalThis.read=documentPythonPreviewSource;globalThis.write=setDocumentPythonPreviewSource;',context);
  assert.equal(context.read(item).source, 'print("old")', 'The staged source wins over a stale Inspector item');
  context.write(item, 'unfinished =');
  assert.equal(context.xmlDoctor.embedded, false);
  assert.equal(context.xmlDoctor.stagePrepared, true);
  assert.equal(files.get('/stage/folder/a.py'), 'unfinished =');
  assert.equal(item.content, 'unfinished =');assert.equal(scanned.content, 'unfinished =');assert.equal(other.content, 'other');
  assert.throws(()=>context.write({detail:{python_file:'../escape.py'}},'no'),/Invalid Python/);
  assert.throws(()=>context.write({detail:{python_file:'/unrelated/escape.py'}},'no'),/Invalid Python/);
});

test('Python Widgets opens its editor; explicit Run and Preview PY route to a separate shell', async () => {
  const item={content_label:'Python',detail:{name:'demo.py'},content:'x=7'},data={name:'demo.py',source:'x=7'},calls=[];
  const context={Map,documentPreviewDocumentName:()=> 'document',ensureXmlStageCopy:async()=>{},documentPythonPreviewSource:()=>data,documentPythonPreviewFile:()=>'/stage/demo.py',createPythonPreviewExecutionSession:()=>({execute(){},dispose(){}}),setDocumentPythonPreviewSource:(_item,text)=>{data.source=text;},analyzePythonPreviewSource:async()=>({errors:0}),xmlLog(){},t:x=>x,openPyPreviewModal:async(source,options)=>calls.push({kind:'shell',source,options}),window:{TnsPythonPreview:{openEditor:(source,options)=>calls.push({kind:'editor',source,options})}}};
  vm.runInNewContext(slice('async function openDocumentAppPreview(', 'function programEditorVisibilityWords(')+'\nglobalThis.openPreview=openDocumentAppPreview;',context);
  const groups={python:[item],widgets:[{previewKind:'python',previewItem:item}]},session={};
  await context.openPreview(groups,'widgets',0,session);assert.equal(calls.at(-1).kind,'editor');
  await calls.at(-1).options.onSyntax('x=8');assert.equal(data.source,'x=8');
  await calls.at(-1).options.onRun({source:'x=9'},{expanded:true});assert.equal(calls.at(-1).kind,'shell');assert.equal(calls.at(-1).source,'x=9');assert.equal(calls.at(-1).options.autoRun,true);
  await calls.at(-1).options.onEdit({expanded:true});assert.equal(calls.at(-1).kind,'editor');assert.equal(calls.at(-1).source.source,'x=9');
  await context.openPreview(groups,'python',0,{pythonRun:true});assert.equal(calls.at(-1).kind,'shell');assert.equal(calls.at(-1).options.autoRun,false,'Opening a shell from Inspector must not execute the script');
});
