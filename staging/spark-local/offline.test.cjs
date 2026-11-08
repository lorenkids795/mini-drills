'use strict';

const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {PIN,validate,offlinePreflight,validateImpersonationMetadata}=require('./policy.cjs');
const {mockAdapter,connect}=require('./adapter.cjs');
const config={...PIN,runId:'fx31_offline',lessonId:'fx31_alpha'};
const child=(code,env=process.env)=>spawnSync(process.execPath,['-e',code],{cwd:__dirname,env,encoding:'utf8'});
test('fixed project/database/origin/namespace/identity reject overrides and omissions',()=>{
 for(const key of Object.keys(PIN)){assert.throws(()=>validate({...config,[key]:'production'},{}));const x={...config};delete x[key];assert.throws(()=>validate(x,{}))}
 for(const runId of ['real','../fx31_test','fx31_ab/cd'])assert.throws(()=>validate({...config,runId},{}));
 assert.throws(()=>validate({...config,lessonId:'real'},{}));assert.equal(offlinePreflight(config).cloudEnabled,false);
});
test('mixed emulator/cloud environment fails closed',()=>{
 for(const key of ['FIREBASE_CONFIG','FIREBASE_DATABASE_URL','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_HOST','GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','FIREBASE_PROJECT_ID'])assert.throws(()=>validate(config,{[key]:'foreign'}));
});
test('default selects emulator; missing emulator config never falls back',()=>{
 const r=child("try{require('./adapter.cjs').connect()}catch(e){console.log(e.message);process.exit(7)}",{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot});
 assert.equal(r.status,7);assert.match(r.stdout,/demo project/);
 assert.throws(()=>connect(config,{mode:'production'}),/fallback/);
 assert.throws(()=>connect(config,{mode:'spark-local'}),/LOCKED|Conflicting|Mixed/);
});
test('offline preflight does not verify billing/IAM; rejects private-key metadata',()=>{
 assert.equal(offlinePreflight(config).liveIAM,'NOT_TESTED');assert.equal(offlinePreflight(config).billing,'NOT_VERIFIED');
 const m={type:'impersonated_service_account',targetPrincipal:PIN.serviceAccount,quotaProjectId:PIN.projectId,hasPrivateKey:false};assert.equal(validateImpersonationMetadata(m),true);
 for(const x of [{...m,type:'service_account'},{...m,hasPrivateKey:true},{...m,targetPrincipal:'owner'},{...m,quotaProjectId:'prod'}])assert.throws(()=>validateImpersonationMetadata(x));
});
test('live runner locked even with approval-looking environment flags',()=>{
 const r=spawnSync(process.execPath,['live-qa.cjs'],{cwd:__dirname,encoding:'utf8',env:{...process.env,SPARK_LIVE_APPROVED:'true'}});assert.equal(r.status,2);assert.match(r.stderr,/LOCKED/);
});
test('synthetic import graph never loads real domain/catalog/seed or legacy QA',()=>{
 const code=[
 "const M=require('module'),load=M._load;",
 "M._load=function(id,...args){if(/domain\\.cjs$|vocab-lab-p1|vocab-mission-packs|vocab-routes|vocab-editorial-core|create-fixtures|phase31[\\\\/]qa/.test(id))throw Error('Forbidden import '+id);return load.call(this,id,...args)};",
 "const f=require('../phase31/fixtures.cjs');require('../phase31/runtime.cjs');require('../phase31/backup.cjs');require('./adapter.cjs');require('./live-qa.cjs');require('../identity.cjs');",
 "const items=f.LESSONS.flatMap(l=>f.domain(l).catalog());if(items.length!==8||items.some(i=>!i.id.startsWith('fx31_')))throw Error('Fixture contamination');"
 ].join('\n');const r=child(code);assert.equal(r.status,0,r.stderr);
});
test('adapter rejects foreign audience/issuer/UID before roster lookup',async()=>{
 let reads=0;const doc={collection:()=>({doc:()=>doc}),get:async()=>{reads++;return {exists:false}}},db={collection:()=>({doc:()=>doc})};
 const good={aud:PIN.projectId,iss:'https://securetoken.google.com/'+PIN.projectId,uid:'fx31_student'};
 for(const bad of [{...good,aud:'prod'},{...good,iss:'https://evil'},{...good,uid:'real-user'}]){
  const a=mockAdapter(config,{db,auth:{verifyIdToken:async()=>bad,getUser:async()=>{throw Error('Should not get user')}}});
  await assert.rejects(a.api.identity('synthetic-token'),e=>e.status===401);
 }assert.equal(reads,0);
});
test('server denies forged role, revoked roster and foreign email',()=>{
 const {principal}=require('../identity.cjs'),uid='fx31_student',token={uid,role:'student',exp:3000,auth_time:1000};
 const user={uid,email:uid+'@local.invalid',customClaims:{role:'student'}},account={uid,email:user.email,active:true,role:'student',tester:true,classId:'fx31_class_a'};
 assert.equal(principal(token,user,account,2000).role,'student');
 for(const args of [[{...token,role:'teacher'},user,account],[token,user,{...account,role:'admin'}],[token,user,{...account,revokedAfter:1001}],[token,{...user,email:'real@example.com'},account]])assert.throws(()=>principal(...args,2000));
});
test('TCP TLS fetch HTTP2 outbound blocked before socket connection',()=>{
 const r=child([
 "require('../loopback-only.cjs').install();",
 "const assert=require('assert/strict'),net=require('net'),tls=require('tls'),http2=require('http2');",
 "assert.throws(()=>net.connect(443,'203.0.113.1'),/External/);",
 "assert.throws(()=>tls.connect({host:'firestore.googleapis.com',port:443}),/External/);",
 "assert.throws(()=>http2.connect('https://firestore.googleapis.com'),/External/);",
 "fetch('https://identitytoolkit.googleapis.com').then(()=>process.exit(5),e=>{assert.match(String(e.cause),/External/);});"
 ].join('\n'));assert.equal(r.status,0,r.stderr);
});
async function fakeClient(overrides={}){
 const {createAuthClient}=await import('./auth-client.mjs');
 const auth={currentUser:null},calls=[],user={uid:'fx31_student'};let status=200;
 const sdk={initializeApp:()=>({}),getAuth:()=>auth,connectAuthEmulator:(_,url)=>calls.push(['emulator',url]),inMemoryPersistence:'memory',setPersistence:async(_,p)=>calls.push(['persistence',p]),signOut:async()=>{auth.currentUser=null},signInWithEmailAndPassword:async()=>{auth.currentUser=user},getIdToken:async(_,force)=>{calls.push(['token',force]);return 'mock-token'},deleteApp:async()=>{},...overrides};
 const client=await createAuthClient({sdk,config:{projectId:'demo-mini-drills-vocab-test',apiKey:'emulator-only',authDomain:'localhost'},fetchImpl:async(path,opts)=>{calls.push(['fetch',path,opts]);return {status,ok:status===200,json:async()=>({uid:user.uid})}}});
 return {client,calls,auth,setStatus:s=>status=s};
}
test('Web SDK login memory persistence and SDK refresh per API request',async()=>{
 const x=await fakeClient();await x.client.login('fx31_student@local.invalid','mock');await x.client.refresh();
 assert.deepEqual(x.calls[0],['emulator','http://127.0.0.1:19099']);assert.deepEqual(x.calls[1],['persistence','memory']);
 assert.ok(x.calls.some(c=>c[0]==='token'&&c[1]===true));
 assert.ok(x.calls.filter(c=>c[0]==='fetch').every(c=>c[2].headers.Authorization==='Bearer mock-token'&&c[2].redirect==='error'));
 await x.client.close();assert.equal(x.auth.currentUser,null);
});
test('401/403 clears auth without replaying writes; 409 permits explicit retry',async()=>{
 for(const status of [401,403,409]){
  const x=await fakeClient();await x.client.login('fx31_student@local.invalid','mock');x.setStatus(status);const n=x.calls.filter(c=>c[0]==='fetch').length;
  await assert.rejects(x.client.request('/student/action',{operationId:'same-operation'}));assert.equal(x.calls.filter(c=>c[0]==='fetch').length,n+1);
  assert.equal(x.auth.currentUser===null,status!==409);await x.client.close();
 }
});
test('browser rejects foreign identities, absolute URL and Spark mode before SDK',async()=>{
 const x=await fakeClient();await assert.rejects(x.client.login('real@example.com','mock'));await assert.rejects(x.client.request('https://production.example/me'));
 const {createAuthClient}=await import('./auth-client.mjs');await assert.rejects(createAuthClient({mode:'spark-local',sdk:{}}),/LOCKED/);await x.client.close();
});
test('refresh failure clears session',async()=>{
 const x=await fakeClient({getIdToken:async(_,force)=>{if(force)throw Error('Revoked');return 'mock-token'}});
 await x.client.login('fx31_student@local.invalid','mock');await assert.rejects(x.client.refresh());assert.equal(x.auth.currentUser,null);
});

test('impersonated ADC shape pins target and rejects keys, redirects and delegates',()=>{
 const {inspectADC,preflight}=require('./preflight.cjs');
 const adc={type:'impersonated_service_account',service_account_impersonation_url:'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+PIN.serviceAccount+':generateAccessToken',quota_project_id:PIN.projectId,source_credentials:{type:'authorized_user',client_id:'synthetic-placeholder',client_secret:'synthetic-placeholder',refresh_token:'synthetic-placeholder'}};
 assert.equal(inspectADC(adc).authenticated,false);
 for(const bad of [{...adc,private_key:'synthetic'},{...adc,service_account_impersonation_url:'https://evil.invalid'},{...adc,delegates:['other']},{...adc,source_credentials:{...adc.source_credentials,token_uri:'https://evil.invalid'}}])assert.throws(()=>inspectADC(bad));
 assert.equal(preflight(config,{adcShape:adc}).credentialAuthenticated,false);
});
test('pure grading extraction preserves pre-change behavior without catalog dependencies',()=>{
 const {execFileSync}=require('node:child_process'),vm=require('node:vm');
 const old=execFileSync('git',['show','0970e954f7b96e3d909d5b56ee73624196cec8fc:staging/domain.cjs'],{encoding:'utf8'});
 const source=old.slice(old.indexOf('function canonical'),old.indexOf('function catalog()'));
 const original=vm.runInNewContext("(function(){const crypto=require('node:crypto'),copy=x=>JSON.parse(JSON.stringify(x)),LESSON='fx31_alpha';"+source+";return {newSession,advance,view,hash}})()",{require,Date});
 const current=require('../domain-core.cjs'),item=require('../phase31/fixtures.cjs').domain('fx31_alpha').catalog()[0];
 let a=original.newSession('fx31_student',item,'session1'),b=current.newSession('fx31_student',item,'session1');b.createdAt=a.createdAt;
 assert.deepEqual(JSON.parse(JSON.stringify(a)),b);
 for(const action of [{type:'answer',value:0},{type:'answer',value:1},{type:'hint'},{type:'answer',value:'lantern'}]){
  const x=original.advance(a,item,action),y=current.advance(b,item,action);y.session.updatedAt=x.session.updatedAt;
  assert.deepEqual(JSON.parse(JSON.stringify(x)),y);assert.deepEqual(JSON.parse(JSON.stringify(original.view(x.session,item))),current.view(y.session,item));a=x.session;b=y.session;
 }
 assert.equal(original.hash(item.content),current.hash(item.content));
});
