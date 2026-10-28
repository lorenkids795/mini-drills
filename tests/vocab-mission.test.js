'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../vocab-mission-core'),D=require('../vocab-mission-content'),bank=require('../data/vocab-lab-p1.json');
const linked=D.linked(bank),demo=D.coast();let serial=0;
test('opening/replaying/switching accounts never mutates shared authored content',()=>{
 const expected=JSON.stringify(D.coast());for(let i=0;i<4;i++)assert.equal(JSON.stringify(D.coast()),expected);
 assert.equal(JSON.stringify(D.linked(bank)),JSON.stringify(linked));
 for(const m of [D.coast(),D.linked(bank)])m.terms.forEach(t=>assert.ok(t.investigate.prompt&&t.investigate.context));
});
const act=(s,type,x={})=>C.apply(s,{type,id:'test-'+(++serial),...x});
function profile(m=linked,statuses=['new','unsure','verified_for_current_task','self_reported_known','needs_practice']){return {email:'qa@local.invalid',lessonId:bank.lessonId,revision:12,termProgress:Object.fromEntries(m.terms.map((t,i)=>[t.senseId,{status:statuses[i%statuses.length]}]))}}
function start(m=demo,p=null){let s=C.create(m,p,'qa@local.invalid');s=act(s,'begin');s=act(s,'fullReport');return act(s,'revealSentence')}
function solve(s){const q=C.current(s);if(q.kind==='reconstruct'){for(const word of q.answers[0].split(' ')){const used=(s.records[q.id]||{}).draft||[],index=q.tokens.findIndex((t,i)=>t===word&&!used.includes(i));s=act(s,'draft',{index})}}return act(s,'answer',{value:q.options?q.answer:q.answers&&q.answers[0]})}
test('authored demo stays separate; linked terms resolve only approved P1 source/sense IDs',()=>{
 assert.equal(demo.provenance,'authored_demo');assert.equal(demo.lessonId,null);assert.equal(demo.terms.length,5);
 demo.terms.forEach(t=>assert.ok(!bank.terms.some(b=>b.canonical===t.term)));
 linked.terms.forEach(t=>assert.ok(bank.lesson_term_links.some(l=>l.senseId===t.senseId&&l.status==='approved'&&l.lessonId===linked.lessonId)));
 assert.equal(new Set(linked.terms.map(t=>t.senseId)).size,5);
});
test('classified status selects Discover/Strengthen/light check and silently bypasses verified basics',()=>{
 const p=C.plan(linked,profile()),ids=linked.terms.map(t=>t.senseId);
 assert.equal(p.routes[ids[0]],'discover');assert.equal(p.routes[ids[1]],'strengthen');assert.equal(p.routes[ids[2]],'bypass');assert.equal(p.routes[ids[3]],'light_check');assert.equal(p.routes[ids[4]],'strengthen');
 for(const list of Object.values(p.tasks))assert.ok(!list.some(q=>q.senseId===ids[2]));
 assert.equal(p.story.length,5);
});
test('zero/fewer classified terms produce no filler; wrong account/lesson cannot supply linked progress',()=>{
 assert.equal(C.plan(linked,null).eligible.length,0);const p=profile();delete p.termProgress[linked.terms[0].senseId];assert.equal(C.plan(linked,p).eligible.length,4);
 assert.equal(C.plan(linked,{...p,lessonId:'cam17-t1-reading-p2'}).eligible.length,0);
 assert.equal(C.create(linked,p,'other@local.invalid').plan.eligible.length,0);
 const s=C.create(linked,null,'qa@local.invalid');assert.throws(()=>act(s,'begin'));
});
test('Case File reveals exactly one sentence per action and supports full report without a finish-reading step',()=>{
 let s=act(C.create(demo,null,'qa@local.invalid'),'begin');for(let i=1;i<=5;i++){s=act(s,'revealSentence');assert.equal(s.revealed,i);assert.equal(s.phase,'case')}
 assert.deepEqual(s.plan.story,demo.terms.map(t=>t.sentence));s=act(s,'revealSentence');assert.equal(s.phase,'investigate');
 let full=act(C.create(demo,null,'qa@local.invalid'),'begin');full=act(full,'fullReport');assert.equal(full.revealed,5);
});
test('first wrong stays open; retry, hint, reveal and supported discovery are never independent',()=>{
 for(const mode of ['retry','hint','reveal']){
  let s=start();const q=C.current(s);if(mode==='retry'){s=act(s,'answer',{value:(q.answer+1)%3});assert.equal(s.records[q.id].done,false)}
  if(mode==='hint')s=act(s,'hint');s=mode==='reveal'?act(s,'reveal'):act(s,'answer',{value:q.answer});assert.equal(s.records[q.id].independent,false);
 }
 let s=start(linked,profile(linked,['unsure'])),q=C.current(s);s=act(s,'answer',{value:q.answer});assert.equal(s.records[q.id].independent,true);
});
test('Decode uses collocation, reconstruction and paraphrase; Final Report uses at most two new-context free recalls',()=>{
 const p=C.plan(demo,null);assert.deepEqual(new Set(p.tasks.decode.map(q=>q.kind)),new Set(['collocation','reconstruct','paraphrase']));
 assert.equal(p.tasks.final.length,2);p.tasks.final.forEach(q=>{assert.equal(q.kind,'recall');assert.ok(!q.options&&!q.tokens&&!q.teaching);assert.ok(!q.prompt.includes(q.answers[0]))});
});
test('Word Morph has nine tasks in three rounds; evidence is per form, independent only in recall',()=>{
 let s=C.create(demo,null,'qa@local.invalid');assert.equal(s.plan.tasks.morph.length,9);s.phase='morph';s.index=0;
 const first=C.current(s),key=first.senseId+'::'+first.form;s=solve(s);assert.equal(s.forms[key].independent,false);
 s.phase='morph';s.index=s.plan.tasks.morph.findIndex(q=>q.form===first.form&&q.round==='recall');s=solve(s);assert.equal(s.forms[key].independent,true);
 assert.ok(!s.forms[first.senseId+'::reluctance']);assert.ok(!JSON.stringify(s.forms).includes('mastered'));
});
test('known forms skip drills; weak forms get at most one adaptive item each and at most three total',()=>{
 const k=demo.morph[0].senseId+'::'+demo.morph[0].form,p=C.plan(demo,null,{[k]:{independent:true}});assert.equal(p.tasks.morph.length,6);
 let s=C.create(demo,null,'qa@local.invalid');for(const f of demo.morph){s.phase='morph';s.index=s.plan.tasks.morph.findIndex(q=>q.form===f.form&&q.round==='transform');s=act(s,'reveal')}
 assert.equal(s.plan.tasks.morph.filter(q=>q.round==='adaptive').length,3);assert.equal(Object.keys(s.adaptive).length,3);
});
test('complete both coherent missions; preserve source and capture recall/reconstruction attempts',()=>{
 for(const m of [demo,linked]){const p=m===linked?profile():null,snapshot=JSON.stringify(p);let s=start(m,p),guard=0;while(s.phase!=='debrief'&&guard++<100){s=solve(s);s=act(s,'next')}assert.equal(s.phase,'debrief');assert.equal(JSON.stringify(p),snapshot);assert.ok(s.attempts.some(a=>typeof a.answer==='string'));assert.ok(C.summary(s).every(r=>['ready_for_review','needs_practice'].includes(r.status)))}
});
test('session snapshot pins version on resume and is bound to identity and mission; actions are idempotent',()=>{
 let s=C.create(demo,null,'qa@local.invalid'),a={type:'begin',id:'once'};s=C.apply(s,a);assert.deepEqual(C.apply(s,a),s);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(C.resume(saved,'qa@local.invalid',demo.id),true);assert.equal(C.resume(saved,'other',demo.id),false);
 const changed={...demo,version:demo.version+1};assert.equal(saved.snapshot.version,demo.version);assert.equal(changed.version,demo.version+1);assert.equal(C.resume({...saved,contentVersion:changed.version},'qa@local.invalid',demo.id),false);
});

test('contextual inference earns independent evidence; teaching support is opt-in after an attempt',()=>{
 for(const m of [demo,linked]){
  let s=start(m,m===linked?profile():null),q=C.current(s);
  assert.equal(q.mode,'discover');assert.equal(q.guided,false);assert.ok(q.context&&q.teaching);
  assert.ok(!q.prompt.includes(q.teaching));assert.throws(()=>act(s,'support'));
  const independent=solve(s);assert.equal(independent.records[q.id].independent,true);
  s=act(s,'answer',{value:(q.answer+1)%3});assert.equal(s.records[q.id].done,false);
  assert.ok(!q.clue.includes(q.options[q.answer]));s=act(s,'hint');assert.equal(s.records[q.id].hintLevel,2);
  s=act(s,'support');assert.equal(s.records[q.id].supported,true);s=solve(s);
  assert.equal(s.records[q.id].correct,true);assert.equal(s.records[q.id].independent,false);
  assert.equal(s.attempts.at(-1).assisted,true);
 }
});

test('both missions have contextual artifacts, fixed unique answer lists and specific memo feedback',()=>{
 for(const m of [demo,linked]){
  const p=C.plan(m,m===linked?profile(linked,['new']):null);
  for(const list of Object.values(p.tasks))for(const q of list){
   assert.ok(q.artifact&&q.purpose);assert.ok(q.clue&&q.why);
   assert.ok(!/normal English word order|make possible to avoid/.test(q.why+' '+q.clue));
   if(q.options){assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.options[q.answer]);assert.ok(!(' '+C.normal(q.clue)+' ').includes(' '+C.normal(q.options[q.answer])+' '));if(q.phase==='investigate')assert.ok(q.context);}
   if(q.answers)assert.equal(new Set(q.answers.map(C.normal)).size,q.answers.length);
  }
 }
 const memo=demo.terms[1].decode;assert.match(memo.artifact,/memo/);assert.match(memo.why,/verb–noun collocation/);assert.match(memo.why,/time clause/);
 assert.match(demo.terms[4].investigate.clue,/leak continues unchecked/);
 assert.equal(C.normal('  CONDUCT research! '),'conduct research');
});

test('legacy version 1 snapshots keep their questions, conservative guided evidence and stored outcomes',()=>{
 const legacy={...C.copy(demo),version:1};let s=C.create(legacy,null,'qa@local.invalid');
 s.plan.tasks.investigate[0].guided=true;s.plan.tasks.investigate[0].prompt='Original saved prompt';
 const saved=JSON.stringify(s);assert.ok(C.resume(s,'qa@local.invalid',demo.id));
 s=act(act(act(s,'begin'),'fullReport'),'revealSentence');assert.equal(C.current(s).prompt,'Original saved prompt');s=solve(s);
 assert.equal(s.records[C.current(s).id].independent,false);assert.equal(s.contentVersion,1);
 assert.equal(JSON.parse(saved).snapshot.version,1);assert.equal(demo.version,2);
});
test('form evidence alone never upgrades sense meaning; fully verified source avoids all basic task repetition',()=>{
 let s=C.create(demo,null,'qa@local.invalid');s.phase='morph';s.index=6;s=solve(s);assert.equal(C.summary(s).find(r=>r.senseId===demo.morph[0].senseId).status,'needs_practice');
 let all=C.create(linked,profile(linked,['verified_for_current_task']),'qa@local.invalid');all=act(all,'begin');all=act(all,'fullReport');all=act(all,'revealSentence');assert.equal(all.phase,'debrief');assert.equal(all.attempts.length,0);
});
test('Final Report retry evidence is assisted; partial reconstruction and text drafts resume without attempts',()=>{
 let s=C.create(demo,null,'qa@local.invalid');s.phase='final';const q=C.current(s);s=act(s,'answer',{value:'wrong'});assert.equal(s.records[q.id].done,false);s=act(s,'answer',{value:q.answers[0]});assert.equal(s.attempts.at(-1).assisted,true);assert.equal(s.attempts.at(-1).independent,false);
 let d=C.create(demo,null,'qa@local.invalid');d.phase='decode';d.index=1;d=act(d,'draft',{index:3});d=JSON.parse(JSON.stringify(d));assert.deepEqual(d.records[C.current(d).id].draft,[3]);assert.equal(d.attempts.length,0);
 d.phase='final';d.index=0;d=act(d,'textDraft',{value:'partial answer'});assert.equal(JSON.parse(JSON.stringify(d)).records[C.current(d).id].text,'partial answer');assert.equal(d.attempts.length,0);
});
