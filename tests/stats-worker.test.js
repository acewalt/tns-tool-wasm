import test from 'node:test';
import assert from 'node:assert/strict';
let DatabaseSync;try{({DatabaseSync}=await import('node:sqlite'));}catch{}
import fs from 'node:fs';
import worker from '../cloudflare/tns-tool-stats-worker.js';

function database(){
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(new URL('../cloudflare/stats-schema.sql',import.meta.url),'utf8'));
 return {sql,prepare(query){let args=[];return {bind(...values){args=values;return this;},async first(){return sql.prepare(query).get(...args);},async run(){return sql.prepare(query).run(...args);}};}};
}
async function request(db,path,visitorId){const response=await worker.fetch(new Request('https://stats.test'+path,visitorId?{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://acewalt.github.io'},body:JSON.stringify({visitorId})}:{}),{DB:db});assert.equal(response.status,200);return response.json();}
test('lifetime visitors count one stable ID across days and duplicate requests',{skip:!DatabaseSync},async()=>{
 const db=database(),id='same-visitor-1234567890';
 db.sql.prepare('INSERT INTO daily_visitors(visit_date,visitor_id) VALUES (?,?)').run('2020-01-01',id);
 for(let i=0;i<20;i++)await request(db,'/api/visit',id);
 let stats=await request(db,'/api/stats');assert.equal(stats.visitorsToday,1);assert.equal(stats.totalVisitors,1);
 await request(db,'/api/visit','another-visitor-1234567890');stats=await request(db,'/api/stats');assert.equal(stats.totalVisitors,2);assert.equal(stats.visitorsToday,2);db.sql.close();
});
test('explicit reset zeroes all counters and a returning ID is counted once afterwards',{skip:!DatabaseSync},async()=>{
 const db=database();db.sql.prepare("UPDATE stats SET value=821 WHERE name='documents_generated'").run();await request(db,'/api/visit','same-visitor-1234567890');
 db.sql.exec(fs.readFileSync(new URL('../cloudflare/reset-stats.sql',import.meta.url),'utf8'));
 assert.deepEqual(await request(db,'/api/stats'),{documentsGenerated:0,visitorsToday:0,totalVisitors:0});
 await request(db,'/api/visit','same-visitor-1234567890');await request(db,'/api/visit','same-visitor-1234567890');assert.equal((await request(db,'/api/stats')).totalVisitors,1);db.sql.close();
});
