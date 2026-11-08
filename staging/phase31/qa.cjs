'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {connect,guard}=require('../environment.cjs'),R=require('./runtime.cjs'),B=require('./backup.cjs'),{domain,LESSONS}=require('./fixtures.cjs'),{server}=require('./server.cjs');
const deps=require('node:module').createRequire(path.resolve(process.env.VOCAB_EMULATOR_RUNTIME,'package.json'));
const rules=deps('@firebase/rules-unit-testing'),F=deps('firebase/firestore');
const run='fx31_'+Date.now(),password=crypto.randomUUID()+'Aa1!',users={},tokens={},BASE='http://127.0.0.1:18788';
const output=process.env.PHASE31_QA_OUTPUT;if(!output)throw Error('Evidence output required');fs.mkdirSync(output,{recursive:true});
let c,host,root,env,baseline,snap,restored,secondary;const report={runId:run,projectId:process.env.GCLOUD_PROJECT,at:new Date().toISOString(),physicalDevices:'NOT_TESTED',spark:'NOT_TESTED',cloud:'NOT_TESTED'};
const op=()=>crypto.randomUUID(),id='fx31_alpha_1';
async function call(role,url,body,status=200,port=18788){const r=await fetch('http://127.0.0.1:'+port+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+tokens[role]}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,url+': '+JSON.stringify(data));return data}
async function item(key=id){return call('teacher','/review/item?id='+key)}
async function decision(i,action,role='teacher',extra={},status=200){return call(role,'/review/decision',{itemId:i.id,version:i.version,hash:i.hash,operationId:op(),note:'Synthetic fixture only',action,...extra},status)}
async function publish(key=id){let i=await item(key);i=await decision(i,'approve');return decision(i,'publish','admin')}
async function start(role='student',key=id){return call(role,'/student/start',{itemId:key,operationId:op()})}
async function act(s,type,value,extra={},status=200,role='student'){return call(role,'/student/action',{sessionId:s.id,revision:s.revision,operationId:op(),type,...(value===undefined?{}:{value}),...extra},status)}
async function legacyState(){const out={};for(const name of ['vocab28_items','vocab28_versions','vocab28_decisions','vocab28_publications','vocab28_public']){const rows=await c.db.collection(name).get();out[name]=rows.docs.map(d=>({id:d.id,data:d.data()})).sort((a,b)=>a.id.localeCompare(b.id))}return out}
before(async()=>{
 assert.equal(process.env.GCLOUD_PROJECT,'demo-mini-drills-vocab-test');c=connect();
 // Only initialize absent local DRAFT copies; never reset a database or publish this catalog.
 const existing=await c.db.collection('vocab28_items').get();if(existing.empty)await require('../service.cjs').service(c).seed();
 baseline=await legacyState();assert.equal(baseline.vocab28_items.length,102);assert.ok(baseline.vocab28_items.every(x=>x.data.status==='DRAFT'));assert.equal(baseline.vocab28_decisions.length,0);assert.equal(baseline.vocab28_publications.length,0);
 root=await R.createRun(c,run);
 for(const role of ['admin','teacher','tester','student','other','unassigned','ordinary','revoked','disabled']){
  const uid=run+'_'+role;users[role]=uid;const actual=['other','ordinary','revoked','disabled'].includes(role)?'student':role==='unassigned'?'teacher':role;
  await c.auth.createUser({uid,email:uid+'@local.invalid',password});await R.provision(c,run,uid,actual,'fx31_alpha','fx31_class_a',{tester:role!=='ordinary',classes:role==='unassigned'?['fx31_class_b']:undefined});
 }
 host=server(c,run,'fx31_alpha');await host.listen();secondary=server(c,run,'fx31_beta',18789);await secondary.listen();
 for(const role of Object.keys(users)){const r=await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:users[role]+'@local.invalid',password,returnSecureToken:true})});assert.equal(r.status,200);tokens[role]=(await r.json()).idToken}
 env=await rules.initializeTestEnvironment({projectId:c.projectId,firestore:{host:'127.0.0.1',port:18080,rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
},{timeout:120000});
after(async()=>{
 if(c){try{const now=await legacyState();assert.deepEqual(now,baseline);report.catalog={pending:102,approved:0,published:0,unchanged:true};report.catalogHash=R.hash(now);report.fixtureSnapshot=snap?{count:snap.count,checksum:snap.checksum}:null;report.restore=restored;fs.writeFileSync(path.join(output,'state.json'),JSON.stringify(report,null,2))}finally{if(env)await env.cleanup();for(const h of [host,secondary])if(h)await new Promise(r=>h.app.close(r));await c.db.terminate();await deps('firebase-admin/app').deleteApp(c.app)}}
},{timeout:30000});
test('01 guards reject cloud config, scope traversal and outbound transports',async()=>{
 const good={GCLOUD_PROJECT:'demo-mini-drills-vocab-test',FIRESTORE_EMULATOR_HOST:'127.0.0.1:18080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:19099'};
 for(const patch of [{GCLOUD_PROJECT:'mini-drills-vocab-staging'},{GOOGLE_APPLICATION_CREDENTIALS:'x'},{FIREBASE_CONFIG:'{}'},{FIRESTORE_EMULATOR_HOST:''},{FIREBASE_AUTH_EMULATOR_HOST:'remote:19099'}])assert.throws(()=>guard({...good,...patch}));
 for(const target of ['real','../fx31_escape','fx31_foo/bar'])assert.throws(()=>R.runRef(c,target));assert.throws(()=>R.scope(c,run,'real-lesson'));
 for(const url of ['https://firestore.googleapis.com/','https://identitytoolkit.googleapis.com/','http://169.254.169.254/'])await assert.rejects(fetch(url));
});
test('02 health, static allowlist, host/origin and no client namespace selection',async()=>{
 const h=await call(null,'/staging-health');assert.equal(h.mode,'emulator');assert.equal(h.syntheticOnly,true);assert.equal(h.writeLocked,false);
 for(const route of ['/../service.cjs','/data/vocab-lab-p1.json','/fixtures.cjs'])await call('admin',route,undefined,404);
 assert.equal((await fetch(BASE+'/staging-health',{headers:{Origin:'https://production.invalid'}})).status,403);
 // fetch normalizes Host; use a raw local HTTP request to actually exercise the hostile header.
 const hostileHost=await new Promise((resolve,reject)=>{const r=require('node:http').get(BASE+'/staging-health',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode)});r.on('error',reject)});assert.equal(hostileHost,403);
 await call('admin','/review/decision',{namespace:'vocab28_items'},400);await call(null,'/review/list',undefined,401);
});
test('03 eight fixtures / two lessons are disjoint from actual catalog; role gates',async()=>{
 assert.equal((await call('teacher','/review/list')).length,4);assert.equal((await call('admin','/review/list')).length,4);
 for(const role of ['tester','student','unassigned'])await call(role,'/review/list',undefined,403);
 for(const role of ['tester','ordinary'])await call(role,'/student/catalog',undefined,403);
 await call('teacher','/review/list',undefined,401,18789);
 await call('teacher','/review/item?id=C17-T1-R1-040',undefined,404);await call('teacher','/review/item?id=fx31_beta_1',undefined,404);
 assert.deepEqual(await call('student','/student/catalog'),[]);await call('student','/student/start',{itemId:id,operationId:op()},403);
 for(const lesson of LESSONS)assert.equal((await R.scope(c,run,lesson).db.collection('vocab28_items').get()).size,4);
});
test('04 direct Firestore reads/writes denied for all application roles',async()=>{
 for(const role of ['admin','teacher','tester','student']){const db=env.authenticatedContext(users[role],{role,exp:Math.floor(Date.now()/1000)+3600}).firestore();const target=`vocab31_fixture_runs/${run}/lessons/fx31_alpha/vocab28_items/${id}`;await rules.assertFails(F.getDoc(F.doc(db,target)));await rules.assertFails(F.setDoc(F.doc(db,target),{status:'PUBLISHED'}))}
});
test('05 fixture lifecycle, exact hash, separate publish, audit and idempotent review',async()=>{
 let i=await item();await decision(i,'approve','student',{},403);await decision(i,'approve','tester',{},403);await decision(i,'approve','teacher',{hash:'wrong'},409);
 i=await decision(i,'request_fix');i=await decision(i,'reject');const operationId=op();i=await decision(i,'approve','teacher',{operationId});assert.equal(i.status,'APPROVED');
 await decision(i,'publish','teacher',{},403);i=await decision(i,'publish','admin');assert.equal(i.status,'PUBLISHED');
 assert.deepEqual((await item()).history.map(x=>x.action),['request_fix','reject','approve','publish']);
 const j=await item('fx31_alpha_2'),body={itemId:j.id,version:j.version,hash:j.hash,action:'approve',note:'Fixture idempotency',operationId:op()};const a=await call('teacher','/review/decision',body);assert.deepEqual(await call('teacher','/review/decision',body),a);await call('teacher','/review/decision',{...body,note:'different'},409);
});
test('06 two sessions conflict; duplicate retry yields one evidence event',async()=>{
 const s=await start(),body={sessionId:s.id,revision:0,operationId:op(),type:'answer',value:0},other={...body,operationId:op()};
 const responses=await Promise.all([body,other].map(b=>fetch(BASE+'/student/action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens.student},body:JSON.stringify(b)})));assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);
 const winner=responses[0].status===200?body:other;assert.equal((await call('student','/student/action',winner)).revision,1);await call('student','/student/action',{...winner,value:1},409);
 const events=await R.scope(c,run,'fx31_alpha').db.collection('vocab28_students').doc(users.student).collection('events').where('sessionId','==',s.id).get();assert.equal(events.size,1);
 await call('other','/student/session?id='+s.id,undefined,404);
});
test('07 independent recall, hints, retries and reveals preserve honest evidence',async()=>{
 for(const mode of ['independent','hint','retry','reveal']){let s=await start();s=await act(s,'answer',0);s=await act(s,'answer',1);assert.ok(!JSON.stringify(s).includes('lantern'));if(mode==='hint')s=await act(s,'hint');if(mode==='retry')s=await act(s,'answer','wrong');s=await act(s,mode==='reveal'?'reveal':'answer',mode==='reveal'?undefined:' LANTERN ');assert.equal(s.independent,mode==='independent');assert.deepEqual(await call('student','/student/session?id='+s.id),s)}
 const p=await call('student','/student/progress');assert.ok(p.some(x=>x.independentEvidence));assert.ok(p.every(x=>!('mastered' in x)));
});
test('08 roster/claims/assignment/class changes and Auth revocation fail closed',async()=>{
 const db=R.scope(c,run,'fx31_alpha').db,a=db.collection('vocab30_accounts').doc(users.student),original=(await a.get()).data();const saved=await start();
 for(const patch of [{active:false},{revokedAfter:Math.floor(Date.now()/1000)+60}]){await a.update(patch);await call('student','/student/catalog',undefined,401);await a.set(original)}
 await a.update({tester:false});await call('student','/student/catalog',undefined,403);await a.set(original);
 const enrol=db.collection('vocab28_enrollments').doc(users.student);await a.update({classId:'fx31_class_b'});await enrol.update({classId:'fx31_class_b'});await call('student','/student/session?id='+saved.id,undefined,403);assert.deepEqual(await call('student','/student/sessions'),[]);assert.deepEqual(await call('student','/student/progress'),[]);await a.set(original);await enrol.update({classId:'fx31_class_a'});
 const assignment=db.collection('vocab28_staff').doc(users.teacher);await assignment.update({active:false});await call('teacher','/review/list',undefined,403);await assignment.update({active:true});
 await c.auth.setCustomUserClaims(users.teacher,{role:'student'});await call('teacher','/review/list',undefined,403);await c.auth.setCustomUserClaims(users.teacher,{role:'teacher'});
 await c.auth.updateUser(users.disabled,{disabled:true});await call('disabled','/student/catalog',undefined,401);await new Promise(r=>setTimeout(r,1100));await c.auth.revokeRefreshTokens(users.revoked);await call('revoked','/student/catalog',undefined,401);
});
test('09 revision invalidates publication; pinned sessions retain prior version',async()=>{
 const s=await start(),i=await item(),content=structuredClone(i.content);content.final.prompt+=' Remember the workshop.';
 const r=await call('teacher','/review/revise',{itemId:id,version:i.version,hash:i.hash,operationId:op(),note:'Synthetic revision',content});assert.equal(r.status,'DRAFT');assert.equal(r.version,2);await call('student','/student/start',{itemId:id,operationId:op()},403);await decision(i,'approve','teacher',{},409);
 let next=await act(s,'answer',0);next=await act(next,'answer',1);assert.equal(next.prompt,i.content.final.prompt);await act(next,'answer','lantern');await publish();
});
test('10 write lock rejects mutations while reads and health remain available',async()=>{
 await R.lock(c,run,true);assert.equal((await call(null,'/staging-health')).writeLocked,true);const i=await item('fx31_alpha_3');await decision(i,'approve','teacher',{},423);await call('student','/student/start',{itemId:id,operationId:op()},423);await assert.rejects(R.provision(c,run,users.other,'student'),/locked/);await R.lock(c,run,false);
});
test('11 browser review/publish and two isolated contexts save/reload fixture progress',async()=>{
 const playwright=require('node:module').createRequire(path.resolve(process.env.VOCAB_QA_RUNTIME,'package.json'))('playwright');const browser=await playwright.chromium.launch({channel:'msedge',headless:true});const violations=[],errors=[];
 async function context(role){const ctx=await browser.newContext();await ctx.route('**/*',route=>{if(!route.request().url().startsWith(BASE+'/')){violations.push(route.request().url());return route.abort()}return route.continue()});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(BASE);await page.locator('#email').fill(users[role]+'@local.invalid');await page.locator('#password').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#signout').waitFor({state:'visible'});return {ctx,page}}
 try{
  const a=await context('admin'),p=a.page;await p.locator('#items').selectOption('fx31_alpha_3');await p.locator('#open').click();await p.locator('#note').fill('Synthetic browser approval');await p.locator('[data-review="approve"]').click();await p.locator('[data-review="publish"]:enabled').waitFor();await p.locator('#note').fill('Synthetic browser publication');await p.locator('[data-review="publish"]').click();await p.waitForFunction(()=>document.querySelector('#review')?.textContent.includes('PUBLISHED'));
  const one=await context('student'),two=await context('student');await one.page.locator('[data-start="fx31_alpha_3"]').click();await one.page.locator('[data-choice="0"]').click();await one.page.waitForFunction(()=>document.querySelector('#prompt')?.textContent==='Which date is later?');const sid=new URL(one.page.url()).hash;
  await two.page.goto(BASE+'/'+sid);await two.page.reload();await two.page.locator('#email').fill(users.student+'@local.invalid');await two.page.locator('#password').fill(password);await two.page.getByRole('button',{name:'Sign in',exact:true}).click();await two.page.locator('#reload').waitFor();await two.page.locator('[data-choice="1"]').click();await two.page.locator('#answer').fill('ribbon');await two.page.locator('#check').click();await two.page.waitForFunction(()=>document.querySelector('#workspace')?.textContent.includes('independent first-attempt recall'));
  await one.page.locator('#reload').click();await one.page.waitForFunction(()=>document.querySelector('#workspace')?.textContent.includes('independent first-attempt recall'));await one.page.screenshot({path:path.join(output,'browser-progress.png'),fullPage:true});
  await one.page.setViewportSize({width:390,height:844});await one.page.screenshot({path:path.join(output,'browser-mobile.png'),fullPage:true});assert.ok(await one.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await one.page.locator('#signout').click();assert.equal(await one.page.locator('#workspace').textContent(),'');assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);report.browser={contexts:3,twoStudentSessions:true,externalRequests:violations,pageErrors:errors};
 }finally{await browser.close()}
},{timeout:60000});
test('10b both lessons and all eight synthetic routes recover through fresh services',async()=>{
 await R.provision(c,run,users.teacher,'teacher','fx31_beta');await R.provision(c,run,users.admin,'admin','fx31_beta');await R.provision(c,run,users.other,'student','fx31_beta');
 for(const lesson of LESSONS){const api=R.scope(c,run,lesson).api,teacher=await api.identity(tokens.teacher),admin=await api.identity(tokens.admin),student=await api.identity(tokens.other);
  for(let i of await api.reviewList(teacher)){if(i.status!=='PUBLISHED'){if(i.status!=='APPROVED')i=await api.decide(teacher,{itemId:i.id,version:i.version,hash:i.hash,operationId:op(),note:'Synthetic route coverage',action:'approve'});await api.decide(admin,{itemId:i.id,version:i.version,hash:i.hash,operationId:op(),note:'Synthetic route coverage',action:'publish'})}
   let s=await api.start(student,{itemId:i.id,operationId:op()});const content=(await api.reviewItem(teacher,i.id)).content;for(const value of [content.investigate.answer,1,content.final.answers[0]])s=await api.act(student,{sessionId:s.id,revision:s.revision,operationId:op(),type:'answer',value});assert.equal(s.independent,true);
   const fresh=R.scope(c,run,lesson).api;assert.deepEqual(await fresh.resume(await fresh.identity(tokens.other),s.id),s);
  }
 }
});
test('12 recursive logical snapshot and atomic restore to a fresh locked run',async()=>{
 await assert.rejects(B.snapshot(c,run),/Lock writes/);await R.lock(c,run,true);snap=await B.snapshot(c,run);assert.ok(snap.documents.some(x=>x.path.includes('/sessions/')));assert.ok(snap.documents.some(x=>x.path.includes('/events/')));assert.ok(snap.documents.some(x=>x.path.includes('/operations/')));assert.ok(snap.documents.some(x=>x.path.includes('/progress/')));
 fs.writeFileSync(path.join(output,'snapshot.json'),JSON.stringify(snap,null,2));restored=await B.restore(c,run+'_restored',snap);assert.equal(restored.documentsHash,R.hash(snap.documents));await assert.rejects(B.restore(c,run,snap),/new run/);await assert.rejects(B.restore(c,run+'_restored',snap),/not empty/);
 const bad=structuredClone(snap);bad.documents[0].data.tampered=true;assert.throws(()=>B.validate(bad),/checksum/);
 const missing=structuredClone(snap);missing.documents=missing.documents.filter(x=>!x.path.includes('/vocab28_versions/'));missing.count=missing.documents.length;delete missing.checksum;missing.checksum=R.hash(missing);assert.throws(()=>B.validate(missing),/mismatch|missing/);
 const escaped=structuredClone(snap);escaped.documents[0].path='vocab28_items/C17-T1-R1-040';delete escaped.checksum;escaped.checksum=R.hash(escaped);assert.throws(()=>B.validate(escaped),/path/);
 const fresh=R.scope(c,run+'_restored','fx31_alpha').api,who=await fresh.identity(tokens.student),sessions=await fresh.sessions(who);assert.ok(sessions.length>0);for(const s of sessions)assert.equal((await fresh.resume(who,s.id)).id,s.id);
 await assert.rejects(fresh.start(who,{itemId:id,operationId:op()}),e=>e.status===423);
});
test('13 the 102 retained catalog items and all prior content bytes are unchanged',async()=>{assert.deepEqual(await legacyState(),baseline)});
test('14 explicit operator CLI init/lock/snapshot/restore works without exposing credentials in evidence',()=>{
 const cp=require('node:child_process'),cli=path.join(__dirname,'operator.cjs'),id=run+'_cli';
 const exec=(...args)=>cp.execFileSync(process.execPath,[cli,...args],{encoding:'utf8',env:process.env,timeout:30000,windowsHide:true});
 const accounts=JSON.parse(exec('init',id));assert.equal(accounts.accounts.length,4);assert.ok(accounts.accounts.every(a=>a.email.endsWith('@local.invalid')));
 exec('lock',id);const file=exec('snapshot',id).trim();assert.equal(B.validate(JSON.parse(fs.readFileSync(file))).sourceRun,id);
 assert.match(exec('restore',id+'_copy',file),/writeLocked: true/);
 exec('unlock',id+'_copy');exec('lock',id+'_copy');
});
