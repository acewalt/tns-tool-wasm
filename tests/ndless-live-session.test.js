import test from 'node:test';
import assert from 'node:assert/strict';
await import('../ndless-live-session.js');
const {create,snapshot}=globalThis.NdlessLiveSession;
const project=(source='old')=>({name:'test',language:'c',target:'zehn-modern',files:{'main.c':source,'colors.h':'#define COLOR 1'}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setTimeout(resolve,10));

test('rapid edits compile only the latest snapshot, and never paint a stale Hello World',async()=>{
  const builds=[],runs=[],updates=[],first=deferred();let active=0,max=0;
  const session=create({debounceMs:0,onUpdate:i=>updates.push(i),build:async p=>{max=Math.max(max,++active);builds.push(p);try{return await(first.promise);}finally{active--;}},run:(a,send,p)=>{runs.push({p,send});return{stop(){},pause(){},key(){}};}});
  const p=project('Hello World');session.update(p);await flush();
  for(let i=0;i<100;i++){p.files['main.c']='complex '+i;session.update(p);}
  p.files['main.c']='mutation without notification';await flush();
  first.resolve({bytes:new Uint8Array([1])});await flush();await flush();
  assert.equal(max,1);assert.equal(builds.length,2);assert.equal(builds[1].files['main.c'],'complex 99');
  assert.equal(runs.length,1);assert.equal(runs[0].p.files['main.c'],'complex 99');
  assert.equal(updates.filter(i=>i.stage==='starting').length,1);
  const count=updates.length;session.stop();runs[0].send({stage:'running',frame:[1]});
  assert.equal(updates.length,count+1,'Messages from stopped workers must be discarded');
});

test('header, assembly, settings and file deletion invalidate; active editor tabs do not',()=>{
  const events=[],timers=[];
  const session=create({build:async()=>{},run(){},onUpdate:e=>events.push(e),setTimer:fn=>{timers.push(fn);return 1;},clearTimer(){}});
  const p=project();session.update(p);p.activeFile='colors.h';session.update(p);assert.equal(events.length,1);
  p.files['colors.h']+='.changed';session.update(p);
  p.files['effect.S']='mov r0,#1';session.update(p);delete p.files['effect.S'];session.update(p);
  p.settings={optimization:'O2'};session.update(p);
  assert.equal(events.length,5);assert.ok(events.every(e=>e.clear));session.stop();
  assert.notEqual(snapshot(project()).key,snapshot(project('new')).key);
});

test('closing or switching a project suppresses pending builds, errors and worker frames',async()=>{
  const pending=deferred(),events=[];let runs=0;
  const session=create({debounceMs:0,build:()=>pending.promise,run(){runs++;},onUpdate:e=>events.push(e)});
  session.update(project());await flush();session.stop();pending.reject(new Error('late compiler error'));await flush();
  assert.equal(runs,0);assert.equal(events.at(-1).stage,'stopped');
});

test('compiler failure clears the frame and editing recovers; pause, keyboard and stop reach worker',async()=>{
  const events=[],keys=[];let fail=true,stops=0,paused=false,send;
  const session=create({debounceMs:0,onUpdate:e=>events.push(e),build:async()=>{if(fail)throw Error('main.c: syntax error');return{bytes:new Uint8Array([2])};},run:(_a,callback)=>{send=callback;return{stop(){stops++;},pause:v=>paused=v,key:(...a)=>keys.push(a)};}});
  session.update(project());await flush();assert.equal(events.at(-1).stage,'compile-error');assert.equal(events.at(-1).clear,true);
  fail=false;session.update(project('fixed'));await flush();send({stage:'running'});
  session.pause();assert.equal(paused,true);session.pause();assert.equal(paused,false);
  session.key('Enter',true);session.key('Enter',false);assert.deepEqual(keys,[['Enter',true],['Enter',false]]);
  send({stage:'error',error:'Unsupported SWI',code:'NDLESS_SWI_UNSUPPORTED'});assert.equal(stops,1);assert.equal(events.at(-1).clear,true);session.stop();
});
