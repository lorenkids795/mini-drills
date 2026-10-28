'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../vocab-lab-core'),store=require('../vocab-lab-store'),{boot}=require('./app-harness');
const bank=require('../data/vocab-lab-p1.json'),items=require('../data/vocab-lab-practice.json'),pending=require('../editorial/vocab-lab-p2.pending.json');
const practice=Object.fromEntries(items.map(q=>[q.senseId,q]));
let serial=0;
const fresh=()=>C.begin(C.fresh('a@example.com',bank),bank);
const act=(s,type,extra={})=>C.apply(s,{type,id:'op-test-'+(++serial),...extra},bank,practice);
const sorted=(bin='know',n=12)=>{let s=fresh();for(let i=0;i<n;i++)s=act(s,'sort',{bin});return s};
test('succeed current key matches editorial builder source; immutable v1 retains its original key',()=>{
 const q=items.find(q=>q.context==='With careful preparation, the team hoped to succeed.');
 assert.equal(q.options[q.answer],'The team hoped to achieve its goal.');
 const source=fs.readFileSync(path.join(__dirname,'../editorial/vocab-lab-contexts.tsv'),'utf8');
 assert.ok(source.split(/\r?\n/).some(row=>row.startsWith('024|')&&row.split('|')[2]===q.options[q.answer]));
 const old=require('../data/vocab-lab-practice-v1.json').find(x=>x.senseId===q.senseId);
 assert.equal(old.options[old.answer],'It hoped to achieve its goal.');assert.notEqual(old.id,q.id);
});
test('approved bank: 102 P1, pending P2 isolated, no Royal Commission, slum supporting',()=>{
  assert.equal(bank.lesson_term_links.length,102);assert.equal(pending.entries.length,100);
  assert.ok(pending.entries.every(e=>e.link.status==='pending_review'));
  assert.ok(bank.lesson_term_links.every(l=>l.status==='approved'&&l.lessonId==='cam17-t1-reading-p1'));
  assert.ok(!bank.terms.some(t=>t.canonical==='royal commission'));
  assert.deepEqual(bank.lesson_term_links.reduce((out,l)=>{out[l.priority]=(out[l.priority]||0)+1;return out},{}),{core:69,supporting:20,advanced:13});
  const slum=bank.terms.find(t=>t.canonical==='slum');assert.equal(bank.lesson_term_links.find(l=>l.termId===slum.id).priority,'supporting');
  assert.equal(new Set(bank.terms.map(t=>t.id)).size,102);assert.equal(new Set(bank.senses.map(t=>t.id)).size,102);
});
test('all questions have a unique sense, source, fresh context, clue and contextual key',()=>{
  assert.equal(items.length,102);items.forEach(q=>{
    assert.equal(bank.lesson_term_links.find(l=>l.senseId===q.senseId).sourceId,q.sourceId);
    assert.ok(!q.options.includes(q.explanation));assert.equal(new Set(q.options).size,3);
    assert.equal(q.editorialStatus,'reviewed_pending_teacher');assert.equal(q.editorialRevision,2);
    assert.ok(q.reviewNote&&q.teacherFlag&&q.explanation.split(/\s+/).length>=10);
    assert.ok(q.context&&!q.context.includes(q.explanation)&&q.clue&&q.validation==='source-sense-aligned-v1');
  });
});
test('partial batch classify, undo, JSON reload and resume without repeats',()=>{
  let s=sorted('new',4);assert.equal(Object.keys(s.termProgress).length,4);
  s=act(s,'undo');assert.equal(Object.keys(s.termProgress).length,3);
  const id=C.current(s);s=JSON.parse(JSON.stringify(s));assert.equal(C.current(s),id);
  while(s.batch.phase==='sort')s=act(s,'sort',{bin:'new'});
  assert.equal(s.batch.phase,'ready');s=act(s,'startCheck');assert.equal(s.batch.phase,'results');
  const old=s.batch.ids;s=act(s,'nextBatch');assert.equal(s.batch.ids.length,12);assert.ok(s.batch.ids.every(id=>!old.includes(id)));
});
test('Reality Check handles zero, fewer than 3, and many Know It items',()=>{
  assert.equal(C.sample(sorted('new'),practice).length,0);
  let s=sorted('new',10);s=act(s,'sort',{bin:'know'});s=act(s,'sort',{bin:'know'});assert.equal(C.sample(s,practice).length,2);
  assert.equal(C.sample(sorted(),practice).length,3);
});
test('first try independently verified; wrong retry, hint and reveal need practice',()=>{
  ['first','retry','hint','reveal'].forEach(mode=>{
    let s=act(sorted(),'startCheck'),id=s.batch.checks[0],q=practice[id];
    if(mode==='retry')s=act(s,'answer',{choice:(q.answer+1)%3});
    if(mode==='hint')s=act(s,'hint');
    s=mode==='reveal'?act(s,'reveal'):act(s,'answer',{choice:q.answer});
    assert.equal(s.termProgress[id].status,mode==='first'?'verified_for_current_task':'needs_practice');
    assert.equal(s.termProgress[id].evidence.independent,mode==='first');
    assert.equal(s.termProgress[id].evidence.taskId,q.id);
    assert.deepEqual(s.termProgress[id].formEvidence,{});
    assert.ok(!JSON.stringify(s).includes('mastered'));
  });
});
test('first mistake has no completion/reveal; second mistake settles for relearning',()=>{
  let s=act(sorted(),'startCheck'),id=s.batch.checks[0],q=practice[id],wrong=[0,1,2].filter(i=>i!==q.answer);
  s=act(s,'answer',{choice:wrong[0]});assert.equal(s.batch.results[id].done,false);assert.equal(s.termProgress[id].status,'self_reported_known');
  assert.throws(()=>act(s,'next'));s=act(s,'answer',{choice:wrong[1]});assert.equal(s.termProgress[id].status,'needs_practice');
});
test('evidence uses the actual versioned question instead of a hardcoded v1 ID',()=>{
  let s=act(sorted(),'startCheck'),id=s.batch.checks[0];s=act(s,'answer',{choice:practice[id].answer});
  assert.equal(s.termProgress[id].evidence.taskId,practice[id].id);assert.ok(practice[id].id.endsWith(':context-v2'));
  const old=Object.fromEntries(require('../data/vocab-lab-practice-v1.json').map(q=>[q.senseId,q]));
  let b=act(sorted(),'startCheck');b=C.apply(b,{type:'answer',id:'legacy',choice:old[id].answer},bank,old);
  assert.equal(b.termProgress[id].evidence.taskId,old[id].id);
});
test('high error rate adapts to 5 checks, low error rate stays 3; unsampled stays self-reported',()=>{
  [false,true].forEach(fail=>{
    let s=act(sorted(),'startCheck');
    while(s.batch.phase==='check'){
      const q=C.question(s,practice);s=fail?act(s,'reveal'):act(s,'answer',{choice:q.answer});s=act(s,'next');
    }
    assert.equal(s.batch.checks.length,fail?5:3);
    const out=C.summary(s);assert.equal(out.unsampled,fail?7:9);assert.equal(out.self_reported_known,out.unsampled);
    const chosen=s.batch.ids[0],attempts=s.attempts.length;s=act(s,'revise',{senseId:chosen});
    assert.equal(C.current(s),chosen);assert.equal(s.attempts.length,attempts);assert.equal(s.termProgress[chosen],undefined);
  });
});
test('all 102 terms can be completed across nine batches with final short batch',()=>{
  let s=fresh(),lengths=[];
  do{
    lengths.push(s.batch.ids.length);while(s.batch.phase==='sort')s=act(s,'sort',{bin:'unsure'});
    s=act(s,'startCheck');if(Object.keys(s.termProgress).length<102)s=act(s,'nextBatch');else break;
  }while(true);
  assert.deepEqual(lengths,[12,12,12,12,12,12,12,12,6]);assert.equal(C.summary(s).unsure,102);
});
test('preview gate: anonymous/ordinary student/teacher hidden; tester/admin allowed; explicit enable only',()=>{
  assert.equal(C.allowed(null,false),false);
  assert.equal(C.allowed({role:'student'},false),false);assert.equal(C.allowed({role:'teacher'},false),false);
  assert.equal(C.allowed({role:'student',tester:true},false),true);assert.equal(C.allowed({role:'teacher',adm:true},false),true);
  assert.equal(C.allowed({role:'student'},true),true);assert.equal(C.allowed({role:'student'},'true'),false);
});
test('app integration preserves role tabs and LM student Coming soon / tester lesson access',()=>{
  const a=boot({hooks:'tabsFor:tabsFor,lmHTML:lmHTML,lmVisible:lmVisible'});
  a.W.MD_VOCAB={allowed:C.allowed,mount(){}};
  a.T.setU({email:'s@x.com',role:'student'});assert.ok(!a.T.tabsFor().some(t=>t[0]==='vocab'));
  const html=a.T.lmHTML();assert.ok(html.includes('Coming soon')&&!html.includes('data-act="lm-open"'));
  a.T.setU({email:'t@x.com',role:'student',tester:true});assert.ok(a.T.tabsFor().some(t=>t[0]==='vocab'));
  assert.equal(a.T.lmVisible({status:'unpublished'}),true);
  a.T.setU({email:'a@x.com',role:'teacher',adm:true});assert.ok(a.T.tabsFor().some(t=>t[0]==='admin'));assert.ok(a.T.tabsFor().some(t=>t[0]==='vocab'));
});
function fakeDb(){
  const docs=new Map(),written=[];let queue=Promise.resolve();
  return {docs,written,doc:path=>({path}),runTransaction:fn=>{const next=queue.then(async()=>{
    const changes=[];const val=await fn({get:async ref=>({exists:docs.has(ref.path),data:()=>C.copy(docs.get(ref.path))}),set:(r,d)=>changes.push([r.path,C.copy(d)]),delete:r=>changes.push([r.path,null])});
    changes.forEach(([p,d])=>{written.push(p);if(d)docs.set(p,d);else docs.delete(p)});return val;
  });queue=next.catch(()=>{});return next}};
}
test('two sessions race: one revision wins and the other receives latest state without overwrite',async()=>{
  const db=fakeDb(),a=store(db,'a@example.com',bank.lessonId,'uid-a'),b=store(db,'a@example.com',bank.lessonId,'uid-a'),s=fresh();
  const results=await Promise.allSettled([a.save(s,act(s,'sort',{bin:'know'}),{id:'race-a'}),b.save(s,act(s,'sort',{bin:'new'}),{id:'race-b'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const error=results.find(r=>r.status==='rejected').reason;assert.equal(error.code,'vocab-conflict');assert.equal(error.remote.revision,1);
});
test('atomic adapter writes lesson + changed sense only, isolates UID, supports idempotency and conflicts',async()=>{
  const db=fakeDb(),adapter=store(db,'a@example.com',bank.lessonId,'uid-a');
  const before=fresh(),after=act(before,'sort',{bin:'know'}),op={id:'op-one'};
  await adapter.save(before,after,op);assert.equal(db.written.length,2);
  await adapter.save(before,after,op);assert.equal(db.written.length,2);
  assert.ok(db.written.every(p=>p.includes('uid-a__')&&!p.startsWith('cards/')&&!p.startsWith('errors/')));
  await assert.rejects(adapter.save(before,act(before,'sort',{bin:'new'}),{id:'op-two'}),e=>e.code==='vocab-conflict');
  assert.equal(db.docs.get('student_lesson_sort_progress/uid-a__'+bank.lessonId).termProgress[before.batch.ids[0]].classification,'know');
  const other=store(db,'b@example.com',bank.lessonId,'uid-b'),b=C.begin(C.fresh('b@example.com',bank),bank);
  await other.save(b,act(b,'sort',{bin:'new'}),{id:'op-three'});assert.ok(db.docs.has('student_lesson_sort_progress/uid-b__'+bank.lessonId));
});
test('practice attempts are persisted atomically and undo deletes only the owned sense record',async()=>{
  const db=fakeDb(),adapter=store(db,'a@example.com',bank.lessonId,'uid-a');let s=fresh();
  for(let i=0;i<12;i++){let next=act(s,'sort',{bin:'know'});await adapter.save(s,next,{id:'sort-'+i});s=next}
  let next=act(s,'startCheck');await adapter.save(s,next,{id:'check'});s=next;
  next=act(s,'hint');await adapter.save(s,next,{id:'hint'});assert.ok(db.written.some(p=>p.startsWith('student_attempts/uid-a__')));
  const db2=fakeDb(),adapter2=store(db2,'a@example.com',bank.lessonId,'uid-a'),b=fresh(),n=act(b,'sort',{bin:'new'});await adapter2.save(b,n,{id:'one'});await adapter2.save(n,act(n,'undo'),{id:'undo'});
  assert.equal([...db2.docs.keys()].filter(p=>p.startsWith('student_term_progress/')).length,0);
});
test('rules static contract protects new collections; emulator execution is a separate required check',()=>{
  const rules=fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8');
  ['student_lesson_sort_progress','student_term_progress','student_attempts'].forEach(c=>assert.ok(rules.includes('match /'+c+'/{id}')));
  assert.ok(rules.includes('request.auth.uid +'));assert.ok(rules.includes('resource.data.revision + 1'));
  assert.ok(rules.includes("data.get('tester', false) == true"));assert.ok(rules.includes('ownsOld() && ownsNew()'));
  assert.ok(rules.includes('allow update, delete: if false;'));
});
