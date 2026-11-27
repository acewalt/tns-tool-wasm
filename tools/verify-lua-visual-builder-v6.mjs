import fs from 'node:fs/promises';
import path from 'node:path';
import {createTnsDocument,addLuaScriptApp,getLuaScriptApps} from '../src/api/index.js';
import {legacyTemplate} from '../tests/helpers/legacy-templates.js';
import {analyzeLuaImport,projectFromImport} from '../src/lua-visual-builder/importer.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {createLuaPreview} from '../src/lua/preview.js';
const dir=path.resolve(process.argv[2]||'release/qa/v6/export');await fs.mkdir(dir,{recursive:true});process.env.TEMP=dir;process.env.TMP=dir;
const original=legacyTemplate('form',{title:'Hooke',inputCount:2,fieldLabels:['k','x'],fieldBindings:['k','x'],showDetailsButton:false,buttonActions:[{type:'calc',target:'F',expression:'k*x'}]});
const p=projectFromImport(analyzeLuaImport(original));Object.values(p.graphs).find(g=>g.nodes.some(n=>n.type==='multiply')).nodes.find(n=>n.type==='multiply').type='divide';const lua=generateLua(p);
for(const result of [await createTnsDocument(path.join(dir,'base.tns')),await addLuaScriptApp(path.join(dir,'base.tns'),lua,path.join(dir,'edited-form.tns'))])if(!result.success)throw Error(JSON.stringify(result));const scripts=await getLuaScriptApps(path.join(dir,'edited-form.tns'));const script=scripts.find(s=>(s.source||'').includes('@tns-visual-builder'));
if(!script||script.source!==lua)throw Error('Exported Lua was not preserved');
const runtime=await createLuaPreview(script.source);try{runtime.event('enterKey');runtime.event('mouseDown',[90,50]);runtime.event('charIn',['12']);runtime.event('mouseDown',[90,80]);runtime.event('charIn',['3']);runtime.event('mouseDown',[130,200]);if(!runtime.paint().texts.includes('F=4'))throw Error('Exported formula did not execute');}finally{runtime.close();}
await fs.writeFile(path.join(dir,'result.json'),JSON.stringify({ok:true,sourcePreserved:true,editedFormulaResult:4,tns:'edited-form.tns'}));console.log('TNS round trip: edited native formula F=4; Lua source preserved.');
