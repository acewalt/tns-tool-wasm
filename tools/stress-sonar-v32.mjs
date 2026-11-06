import fs from 'node:fs';
import {createPrgmPreview} from '../src/prgm/runtime.js';
const source=fs.readFileSync(process.env.TNS_SONAR_SOURCE||new URL('../release/qa/sonar-import-v32.tib',import.meta.url),'utf8');
const results=[];
for(let seed=1;seed<=12;seed++){
 let rasterizations=0,phase=0,fired=false,moved=false;
 const p=createPrgmPreview(source,{interactive:true,randomSeed:seed,maxDrawingOperations:500,rasterizeGraphics:()=>{rasterizations++;return new Uint8ClampedArray(318*212*4);}});
 for(let i=0;i<70000&&!['error','done'].includes(p.status);i++){
  p.step(false);
  if(phase===0&&p.keyboard.polling){p.sendKey('t');phase=1;}
  if(phase===1&&p.keyboard.waiting){for(const digit of String((seed*29)%360))p.sendKey(digit);p.sendKey('enter');phase=2;}
  if(phase===2&&Array.isArray(p.vars.torpille)){fired=true;if(p.vars.torpillex!==p.vars.xcentre||p.vars.torpilley!==p.vars.ycentre)moved=true;}
  if(i>65000&&!p.keyboard.waiting&&p.keyboard.polling&&phase<3){p.sendKey('esc');phase=3;}
 }
 if(p.status==='error')throw Error('seed '+seed+': '+JSON.stringify(p.error.toJSON()));
 if(p.status!=='done'||!fired||!moved||!rasterizations)throw Error('Incomplete seed '+seed+': '+JSON.stringify({status:p.status,fired,moved,rasterizations}));
 results.push({seed,executed:p.executed,drawOperations:p.graphics.total,rasterizations,fired,moved,status:p.status});
}
const report={ok:true,seeds:results};fs.writeFileSync(new URL('../release/qa/sonar-stress-v32.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
