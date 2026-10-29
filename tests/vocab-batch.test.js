'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../vocab-lab-core'),M=require('../vocab-mission-core'),D=require('../vocab-mission-content'),bank=require('../data/vocab-lab-p1.json'),P=Object.fromEntries(require('../data/vocab-lab-practice.json').map(q=>[q.senseId,q]));
let op=0;const act=(s,type,extra={})=>C.apply(s,{type,id:'batch-test-'+(++op),...extra},bank,P),fresh=size=>C.begin(C.fresh('batch@local.invalid',bank),bank,null,size);
function sort(s,known=0){let n=0;while(s.batch.phase==='sort')s=act(s,'sort',{bin:n++<known?'know':'new'});return s}
function finish(s,fail=false){s=act(s,'startCheck');while(s.batch.phase==='check'){s=fail?act(s,'reveal'):act(s,'answer',{choice:C.question(s,P).answer});s=act(s,'next')}return s}
test('Standard defaults to 20; Quick is exactly 12; 6 and other unsupported modes are rejected',()=>{
 assert.equal(fresh().batch.ids.length,20);assert.equal(fresh(12).batch.ids.length,12);
 for(const size of [6,0,13,'12',NaN])assert.throws(()=>fresh(size));
 assert.throws(()=>act(fresh(),'configureBatch',{batchSize:6}));
});
test('initial choice precedes sorting; a started batch stays fixed even after Undo to zero',()=>{
 let s=act(fresh(),'configureBatch',{batchSize:12});assert.equal(s.batchNumber,1);assert.equal(s.batch.size,12);assert.equal(Object.keys(s.termProgress).length,0);
 s=act(s,'sort',{bin:'unsure'});s=act(s,'undo');assert.equal(s.batch.ids.length,12);assert.throws(()=>act(s,'configureBatch',{batchSize:20}));
});
for(const sizes of [[20],[12],[12,20],[20,12,20,12]])test('102 terms, exact bank order, partial tail, no gaps/duplicates with sizes '+sizes,()=>{
 let s=fresh(sizes[0]),ids=[],lengths=[],i=0;
 while(true){ids.push(...s.batch.ids);lengths.push(s.batch.ids.length);s=finish(sort(s));if(Object.keys(s.termProgress).length===102)break;s=act(s,'nextBatch',{batchSize:sizes[++i%sizes.length]})}
 assert.deepEqual(ids,bank.lesson_term_links.map(l=>l.senseId));assert.equal(new Set(ids).size,102);
 if(sizes.length===1)assert.deepEqual(lengths,sizes[0]===20?[20,20,20,20,20,2]:[12,12,12,12,12,12,12,12,6]);
 const before=C.copy(s),id=s.batch.ids[0];s=act(s,'revise',{senseId:id});assert.deepEqual(s.batch.ids,[id]);assert.deepEqual(s.attempts,before.attempts);
});
test('legacy v1 12-word batch resumes unchanged; IDs/history/results/attempt snapshots survive preference and Undo',()=>{
 let legacy=fresh(12);delete legacy.batch.size;delete legacy.batch.configurable;
 legacy=act(legacy,'sort',{bin:'know'});legacy=act(legacy,'sort',{bin:'new'});delete legacy.batch.configurable;
 const raw=JSON.stringify(legacy),resumed=JSON.parse(raw),ids=resumed.batch.ids.slice();assert.equal(JSON.stringify(resumed),raw);
 assert.throws(()=>act(resumed,'configureBatch',{batchSize:20}));assert.equal(JSON.stringify(resumed),raw);
 let s=act(resumed,'undo');assert.deepEqual(s.batch.ids,ids);assert.equal(C.current(s),ids[1]);s=finish(sort(s));const attempts=C.copy(s.attempts);s=act(s,'nextBatch',{batchSize:20});assert.equal(s.batch.ids.length,20);assert.deepEqual(s.attempts,attempts);assert.ok(s.batch.ids.every(id=>!ids.includes(id)));
});
for(const size of [12,20])test(size+' words: Known sampling capped at 3–5; no fabricated samples, evidence and linked Mission stay real',()=>{
 for(const known of [0,1,2,3,size])for(const fail of [false,true]){
  const source=sort(fresh(size),known),s=finish(source,fail);assert.equal(s.batch.checks.length,Math.min(known,fail?5:3));
  for(const id of s.batch.checks)assert.equal(s.termProgress[id].status,fail?'needs_practice':'verified_for_current_task');
  const mission=D.linked(bank),plan=M.plan(mission,s);assert.ok(plan.eligible.every(id=>s.termProgress[id]));assert.deepEqual(plan.eligible,mission.terms.filter(t=>s.termProgress[t.senseId]).map(t=>t.senseId));
 }
 const empty=M.plan(D.linked(bank),C.fresh('batch@local.invalid',bank));assert.deepEqual(empty.eligible,[]);
});
