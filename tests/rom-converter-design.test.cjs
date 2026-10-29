const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),window={};vm.runInNewContext(fs.readFileSync(path.join(root,'rom-converter-view.js'),'utf8'),{window});
test('console thumbnails follow detected hardware including GB versus GBC',()=>{
 const {consoleId}=window.TnsRomConverterView;
 for(const id of ['nes','snes','gba','nds','n64'])assert.equal(consoleId({id,system:id.toUpperCase()}),id);
 assert.equal(consoleId({id:'gb',system:'GB'}),'gb');assert.equal(consoleId({id:'gb',system:'GBC'}),'gbc');assert.equal(consoleId({id:'sm64-eu'}),'n64');
 for(const info of [null,{}, {system:'ZIP'}, {system:'Unknown',title:'misleading.gbc'}, {system:'../../other'}])assert.equal(consoleId(info),'unknown');
});
test('all supplied SVG console variants are local self-contained images',()=>{for(const name of ['gb','gbc','gba','nds','nes','snes','n64','unknown']){const svg=fs.readFileSync(path.join(root,'assets/rom-console-icons',name+'.svg'),'utf8');assert.match(svg,/<svg[^>]+viewBox=/);assert.doesNotMatch(svg,/<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|data:|javascript:)/i);}});
