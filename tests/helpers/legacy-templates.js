import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real page generator, including scripts created before Visual
// Builder metadata existed. No hand-written substitute for the form runtime.
const source=fs.readFileSync(new URL('../../web/app.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function luaString('),source.indexOf('function insertLuaTemplate('))+';globalThis.presets=LUA_TEMPLATE_PRESETS;',context);
vm.runInContext(source.slice(source.indexOf('function buildDefaultLuaScriptApp('),source.indexOf('async function addLuaScriptAppToStage('))+';globalThis.base=buildDefaultLuaScriptApp();',context);
export function legacyTemplate(id,options={}){
 const preset=context.presets.find(p=>p.id===id);
 return context.base.replace('-- [[TNS_TOOL_PAGES_END]]',preset.build({...preset.defaults,...options})+'\n-- [[TNS_TOOL_PAGES_END]]');
}
export const legacyStart=context.base;
