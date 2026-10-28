'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),store=require('../vocab-mission-store'),C=require('../vocab-mission-core'),D=require('../vocab-mission-content');
function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)}}
function locks(){const queues=new Map();return {request(k,fn){const p=(queues.get(k)||Promise.resolve()).then(fn);queues.set(k,p.catch(()=>{}));return p}}}
test('two tabs save the same revision: exactly one wins; stale tab receives the winning snapshot',async()=>{
 const mem=memory(),lock=locks(),a=store('mission-a',mem,lock),b=store('mission-a',mem,lock),s=C.create(D.coast(),null,'a@local.invalid');await a.save(null,s);
 const x=C.apply(s,{type:'begin',id:'a'}),y=C.apply(s,{type:'begin',id:'b'}),result=await Promise.allSettled([a.save(s,x),b.save(s,y)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);const e=result.find(r=>r.status==='rejected').reason;assert.equal(e.code,'mission-conflict');assert.deepEqual(e.remote,a.read());assert.equal(a.read().revision,1);
});
test('identity/source namespaces stay separate and legacy snapshots remain unchanged when read',async()=>{
 const mem=memory(),lock=locks(),a=store('email-a:authored',mem,lock),b=store('email-b:fixture',mem,lock),s=C.create({...D.coast(),version:1},null,'a@local.invalid');
 await a.save(null,s);assert.deepEqual(a.read(),s);assert.equal(b.read(),null);await b.save(null,{identity:'b'});assert.deepEqual(a.read(),s);
});
test('corrupted saved data is preserved; quota failure does not change the last saved revision',async()=>{
 const mem=memory(),lock=locks();mem.setItem('broken','{');const bad=store('broken',mem,lock);await assert.rejects(bad.save(null,{}));assert.equal(mem.getItem('broken'),'{');
 const a=store('valid',mem,lock);await a.save(null,{revision:1});mem.setItem=()=>{throw Error('Quota exceeded')};await assert.rejects(a.save({revision:1},{revision:2}),/Quota/);assert.deepEqual(a.read(),{revision:1});
});
test('missing Web Locks fails closed instead of promising a safe multi-tab save',async()=>{
 const mem=memory(),s=store('mission',mem,null);await assert.rejects(s.save(null,{}),/Web Locks/);assert.equal(s.read(),null);
});
