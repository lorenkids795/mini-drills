'use strict';
// Separate focused runner: no imports of phase31/qa, real catalog or legacy seed.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const {connect}=require('../environment.cjs'),R=require('../phase31/runtime.cjs'),B=require('../phase31/backup.cjs'),{server}=require('./emulator-web.cjs');
const deps=require('node:module').createRequire(path.resolve(process.env.VOCAB_EMULATOR_RUNTIME,'package.json'));
const run='fx31_spark_'+Date.now(),users={},clients={},uid=role=>run+'_'+role,op=()=>crypto.randomUUID();let c,host;
before(async()=>{
 c=connect();
 // Only synthetic roots may exist. Never seed or inspect the real catalog.
 assert.ok((await c.db.listCollections()).every(x=>['vocab31_fixture_runs','vocab31_spark_fixture_runs'].includes(x.id)),'Synthetic-only emulator required');
 await R.createRun(c,run);
 const sdk={...deps('firebase/app'),...deps('firebase/auth')};
 const {createAuthClient}=await import('./auth-client.mjs');
 host=server(c,run,'fx31_alpha',18790);await host.listen();
 for(const role of ['admin','teacher','tester','student','other']){
  const password=crypto.randomUUID()+'Aa1!',id=uid(role);
  await c.auth.createUser({uid:id,email:id+'@local.invalid',password});
  await R.provision(c,run,id,role==='other'?'student':role);
  clients[role]=await createAuthClient({sdk,config:{projectId:c.projectId,apiKey:'emulator-only',authDomain:'localhost'},fetchImpl:(url,opts)=>fetch('http://127.0.0.1:18790'+url,opts)});
  users[role]={id,password};await clients[role].login(id+'@local.invalid',password);
 }
},{timeout:60000});
after(async()=>{
 for(const client of Object.values(clients))await client.close();
 if(host)await new Promise(r=>host.app.close(r));
 if(c){
  try{assert.ok((await c.db.listCollections()).every(x=>['vocab31_fixture_runs','vocab31_spark_fixture_runs'].includes(x.id)))}
  finally{await c.db.terminate();await deps('firebase-admin/app').deleteApp(c.app)}
 }
});
const call=(role,url,body)=>clients[role].request(url,body);
async function item(){return call('teacher','/review/item?id=fx31_alpha_1')}
async function decision(role,i,action){return call(role,'/review/decision',{itemId:i.id,version:i.version,hash:i.hash,operationId:op(),note:'Synthetic offline test',action})}
let session,first;
test('synthetic-only seed: 8 items / 2 lessons; real root collections absent',async()=>{
 for(const lesson of ['fx31_alpha','fx31_beta'])assert.equal((await R.scope(c,run,lesson).db.collection('vocab28_items').get()).size,4);
 assert.ok((await c.db.listCollections()).every(x=>['vocab31_fixture_runs','vocab31_spark_fixture_runs'].includes(x.id)));
});
test('Web SDK refresh against Auth emulator and verified API identity',async()=>{
 const who=await clients.student.refresh();assert.equal(who.uid,uid('student'));assert.equal(who.role,'student');
});
test('Teacher review/approve; Admin separate publish; Student starts published fixture',async()=>{
 session=await require('./scenarios.cjs').lifecycle(clients);
});
test('conflict, same-operation retry and Independent Recall',async()=>{
 const body={sessionId:session.id,revision:session.revision,operationId:op(),type:'answer',value:0};
 first=await call('student','/student/action',body);assert.deepEqual(await call('student','/student/action',body),first);
 await assert.rejects(call('student','/student/action',{...body,operationId:op()}),e=>e.status===409);
 let s=await call('student','/student/action',{sessionId:first.id,revision:first.revision,operationId:op(),type:'answer',value:1});
 s=await call('student','/student/action',{sessionId:s.id,revision:s.revision,operationId:op(),type:'answer',value:'lantern'});
 assert.equal(s.independent,true);assert.equal((await call('student','/student/progress')).length,1);
});
test('browser Web Auth login/refresh/logout uses only localhost and no persisted auth',async()=>{
 const pw=require('node:module').createRequire(path.resolve(process.env.VOCAB_QA_RUNTIME,'package.json'))('playwright');
 const browser=await pw.chromium.launch({headless:true,channel:'msedge',args:['--disable-background-networking']});
 const context=await browser.newContext(),external=[];
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(!['http://localhost:18790','http://127.0.0.1:19099'].includes(u.origin)){external.push(u.origin);return route.abort()}
  return route.continue();
 });
 try{
  const page=await context.newPage();await page.goto('http://localhost:18790/auth-check');
  await page.locator('#email').fill(uid('student')+'@local.invalid');await page.locator('#password').fill(users.student.password);
  await page.locator('#login button').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('"role":"student"'));
  await Promise.all([page.waitForResponse(r=>r.url().endsWith('/me')&&r.status()===200),page.locator('#refresh').click()]);
  await page.locator('#progress').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('independentEvidence'));
  assert.equal(await page.locator('#password').inputValue(),'');
  await page.reload();assert.equal(await page.locator('#refresh').isDisabled(),true);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('authUser'))),false);
  await page.locator('#email').fill(uid('student')+'@local.invalid');await page.locator('#password').fill(users.student.password);
  await page.locator('#login button').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('"role":"student"'));
  await page.locator('#logout').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Signed out');
  assert.deepEqual(external,[]);
 }finally{await context.close();await browser.close()}
});
test('cross-student, cross-lesson and Tester access denied',async()=>{
 await assert.rejects(call('other','/student/session?id='+session.id),e=>e.status===404);
 const who={uid:uid('teacher'),role:'teacher',classId:'fx31_class_a'};
 await assert.rejects(R.scope(c,run,'fx31_beta').api.reviewList(who),e=>e.status===403);
 await assert.rejects(call('tester','/review/list'));await assert.rejects(clients.tester.refresh(),/Sign in/);
});
test('Auth revokeRefreshTokens and disabled account deny subsequent verified requests',async()=>{
 await new Promise(resolve=>setTimeout(resolve,1100));
 await c.auth.revokeRefreshTokens(uid('other'));await assert.rejects(clients.other.refresh());
 await clients.other.login(uid('other')+'@local.invalid',users.other.password);
 await c.auth.updateUser(uid('other'),{disabled:true});await assert.rejects(clients.other.refresh());
});
test('Firestore Rules deny direct reads/writes for every synthetic role in Spark namespace',async()=>{
 const rules=deps('@firebase/rules-unit-testing'),F=deps('firebase/firestore'),fs=require('node:fs');
 const env=await rules.initializeTestEnvironment({projectId:c.projectId,firestore:{host:'127.0.0.1',port:18080,rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 try{for(const role of ['admin','teacher','tester','student']){
  const db=env.authenticatedContext(uid(role),{role}).firestore(),ref=F.doc(db,'vocab31_spark_fixture_runs/'+run);
  await rules.assertFails(F.getDoc(ref));await rules.assertFails(F.setDoc(ref,{synthetic:true}));
 }}finally{await env.cleanup()}
});
test('roster revocation denies next request despite refreshed Auth token',async()=>{
 await R.scope(c,run,'fx31_alpha').db.collection('vocab30_accounts').doc(uid('student')).update({active:false});
 await assert.rejects(clients.student.refresh());
});
test('write lock and checksum restore preserve all synthetic subcollections',async()=>{
 await R.lock(c,run,true);await assert.rejects(decision('admin',await item(),'request_fix'),e=>e.status===423);
 const snapshot=await B.snapshot(c,run);assert.ok(snapshot.documents.some(x=>x.path.includes('/sessions/')));
 const restored=await B.restore(c,run+'_restore',snapshot);assert.equal(restored.count,snapshot.count);assert.equal(restored.writeLocked,true);
});

test('spark-local mock namespace, write lock and fixed-origin HTTP API',async()=>{
 await new Promise(r=>host.app.close(r));host=null;
 const {PIN}=require('./policy.cjs'),{mockAdapter}=require('./adapter.cjs'),{mockServer}=require('./server.cjs');
 const id='fx31_mock_teacher',mockAuth={
  verifyIdToken:async(token,revoke)=>{assert.equal(revoke,true);if(token!=='mock-identity')throw Error('Unknown mock token');return {uid:id,aud:PIN.projectId,iss:'https://securetoken.google.com/'+PIN.projectId,role:'teacher',exp:Math.floor(Date.now()/1000)+600,auth_time:1}},
  getUser:async()=>({uid:id,email:id+'@local.invalid',customClaims:{role:'teacher'}})
 };
 const config={...PIN,runId:run,lessonId:'fx31_alpha'},adapter=mockAdapter(config,{db:c.db,auth:mockAuth});
 await adapter.root.create({synthetic:true,state:'ready',writeLocked:true});
 await adapter.api.seed();
 await adapter.parent.collection('vocab30_accounts').doc(id).create({uid:id,email:id+'@local.invalid',role:'teacher',active:true,classId:'fx31_class_a'});
 await adapter.parent.collection('vocab28_staff').doc(id).create({active:true,lessons:['fx31_alpha'],classes:['fx31_class_a']});
 host=mockServer(adapter);await host.listen();
 const request=(url,extra={})=>fetch((extra.headers?.host==='production.invalid'?'http://127.0.0.1:18790':'http://localhost:18790')+url,{headers:{host:'localhost:18790',Authorization:'Bearer mock-identity','Content-Type':'application/json',...extra.headers},...Object.fromEntries(Object.entries(extra).filter(([k])=>k!=='headers'))});
 assert.equal((await request('/me')).status,200);
 assert.equal((await request('/me',{headers:{host:'production.invalid'}})).status,403);
 assert.equal((await request('/me',{headers:{origin:'https://evil.invalid'}})).status,403);
 assert.equal((await request('/me',{headers:{Authorization:''}})).status,401);
 assert.equal((await request('/student/start',{method:'POST',body:JSON.stringify({role:'admin'})})).status,400);
 assert.equal((await request('/review/item?id=fx31_beta_1')).status,404);
 const item=await adapter.api.reviewItem(await adapter.api.identity('mock-identity'),'fx31_alpha_1');
 const body={itemId:item.id,version:item.version,hash:item.hash,operationId:op(),note:'Synthetic namespace test',action:'approve'};
 assert.equal((await request('/review/decision',{method:'POST',body:JSON.stringify(body)})).status,423);
 await adapter.root.update({writeLocked:false});
 assert.equal((await request('/review/decision',{method:'POST',body:JSON.stringify(body)})).status,200);
 const other=mockAdapter({...config,runId:run+'_other'},{db:c.db,auth:mockAuth});
 await assert.rejects(other.api.identity('mock-identity'),e=>e.status===401);
 const health=await (await request('/staging-health')).json();assert.equal(health.cloudEnabled,false);assert.equal(health.liveIAM,'NOT_TESTED');
});
