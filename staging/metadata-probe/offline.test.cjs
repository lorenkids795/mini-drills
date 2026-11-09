'use strict';
// All credentials/tokens below are invented sentinels. Never contact cloud in this suite.
require('../loopback-only.cjs').install();
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync,execFileSync}=require('node:child_process');
const {PIN,ENDPOINTS,validateEnvironment}=require('./policy.cjs');
const {probe}=require('./core.cjs'),{parse,main,loadCredential}=require('./cli.cjs'),{transport}=require('./transport.cjs');
const target=()=>({projectId:PIN.projectId,databaseId:PIN.databaseId,resource:PIN.resource,serviceAccount:PIN.serviceAccount});
const adc=()=>({type:'impersonated_service_account',service_account_impersonation_url:ENDPOINTS.impersonation,quota_project_id:PIN.projectId,delegates:[],source_credentials:{type:'authorized_user',client_id:'synthetic-client',client_secret:'synthetic-secret',refresh_token:'synthetic-refresh'}});
const metadata=()=>({name:PIN.resource,locationId:'asia-southeast1',type:'FIRESTORE_NATIVE',databaseEdition:'STANDARD'});
const SOURCE='synthetic-source-access-token',IMPERSONATED='synthetic-impersonated-access-token';

test('HTTPS mock validates exact TLS metadata GET without following redirects',async t=>{
 const https=require('node:https'),{EventEmitter}=require('node:events'),original=https.request;let calls=0;
 t.after(()=>{https.request=original});
 https.request=(url,opts,onResponse)=>{
  calls++;assert.equal(url,ENDPOINTS.metadata);assert.equal(opts.method,'GET');assert.equal(opts.rejectUnauthorized,true);assert.equal(opts.agent,false);
  const req=new EventEmitter();req.destroy=()=>{};req.write=()=>assert.fail('GET must not write a body');req.end=()=>queueMicrotask(()=>{
   const res=new EventEmitter();res.statusCode=302;res.headers={location:'https://evil.invalid'};res.destroy=()=>{};onResponse(res);
  });return req;
 };
 const result=await transport('metadata',{url:ENDPOINTS.metadata,method:'GET',headers:{Authorization:'Bearer '+IMPERSONATED}});
 assert.deepEqual(result,{status:302});assert.equal(calls,1);
});
test('HTTPS mock success returns bounded JSON for later safe-summary filtering',async t=>{
 const https=require('node:https'),{EventEmitter}=require('node:events'),original=https.request;t.after(()=>{https.request=original});
 https.request=(_url,_opts,onResponse)=>{
  const req=new EventEmitter();req.destroy=()=>{};req.end=()=>queueMicrotask(()=>{
   const res=new EventEmitter();res.statusCode=200;res.destroy=()=>{};onResponse(res);res.emit('data',Buffer.from(JSON.stringify(metadata())));res.emit('end');
  });return req;
 };
 assert.deepEqual((await transport('metadata',{url:ENDPOINTS.metadata,method:'GET',headers:{Authorization:'Bearer '+IMPERSONATED}})).data,metadata());
});
test('HTTPS mock refuses malformed and oversized response without echoing payload',async t=>{
 const https=require('node:https'),{EventEmitter}=require('node:events'),original=https.request;t.after(()=>{https.request=original});
 for(const payload of [IMPERSONATED,IMPERSONATED.repeat(2000)]){
  https.request=(_url,_opts,onResponse)=>{
   const req=new EventEmitter();req.destroy=()=>{};req.end=()=>queueMicrotask(()=>{
    const res=new EventEmitter();res.statusCode=200;res.destroy=()=>{};onResponse(res);res.emit('data',Buffer.from(payload));res.emit('end');
   });return req;
  };
  await assert.rejects(transport('metadata',{url:ENDPOINTS.metadata,method:'GET',headers:{Authorization:'Bearer '+IMPERSONATED}}),{message:'Transport failed'});
 }
});
test('HTTPS mock network exception redacted and request destroyed',async t=>{
 const https=require('node:https'),{EventEmitter}=require('node:events'),original=https.request;t.after(()=>{https.request=original});let destroyed=false;
 https.request=()=>{
  const req=new EventEmitter();req.destroy=()=>{destroyed=true};req.end=()=>queueMicrotask(()=>req.emit('error',Error(IMPERSONATED)));return req;
 };
 await assert.rejects(transport('metadata',{url:ENDPOINTS.metadata,method:'GET',headers:{Authorization:'Bearer '+IMPERSONATED}}),{message:'Transport failed'});
 assert.equal(destroyed,true);
});
const options=()=>({target:target(),credential:adc(),environment:{}});
function mock(overrides={}){
 const calls=[];
 const run=async(stage,request)=>{
  calls.push({stage,request});
  if(overrides[stage])return overrides[stage](request);
  if(stage==='oauth')return {status:200,data:{access_token:SOURCE,token_type:'Bearer',expires_in:3600}};
  if(stage==='impersonation')return {status:200,data:{accessToken:IMPERSONATED,expireTime:new Date(Date.now()+600000).toISOString()}};
  if(stage==='metadata')return {status:200,data:metadata()};
  throw Error('Unexpected route');
 };
 return {calls,run};
}
test('success: pinned mint provenance; source user token never sent to Firestore',async()=>{
 const m=mock(),result=await probe(options(),m.run);
 assert.deepEqual(m.calls.map(c=>c.stage),['oauth','impersonation','metadata']);
 assert.equal(m.calls[0].request.url,ENDPOINTS.oauth);
 assert.equal(m.calls[0].request.headers.Authorization,undefined);
 assert.equal(m.calls[1].request.url,ENDPOINTS.impersonation);
 assert.equal(m.calls[1].request.headers.Authorization,'Bearer '+SOURCE);
 assert.deepEqual(JSON.parse(m.calls[1].request.body),{delegates:[],scope:[PIN.scope],lifetime:'600s'});
 assert.equal(m.calls[2].request.url,ENDPOINTS.metadata);
 assert.equal(m.calls[2].request.method,'GET');
 assert.equal(m.calls[2].request.body,undefined);
 assert.equal(m.calls[2].request.headers.Authorization,'Bearer '+IMPERSONATED);
 assert.equal(result.status,'PASS_METADATA_ONLY');assert.equal(result.editionVerification,'PASS');
 assert.ok(!JSON.stringify(result).includes('access-token'));
});
test('wrong project database resource or service account rejected before credential exchange',async()=>{
 for(const key of Object.keys(target())){
  const m=mock(),o=options();o.target[key]='production';
  await assert.rejects(probe(o,m.run),{code:'TARGET_DENIED'});assert.equal(m.calls.length,0);
 }
 const m=mock(),o=options();o.target.extra='override';await assert.rejects(probe(o,m.run),{code:'TARGET_DENIED'});assert.equal(m.calls.length,0);
});
test('reject direct user ADC, private key, foreign impersonation URL and delegated chain',async()=>{
 const bad=[{type:'authorized_user',...adc().source_credentials},{type:'service_account',private_key:'synthetic-key'},{...adc(),service_account_impersonation_url:'https://evil.invalid/token'},{...adc(),quota_project_id:'production'},{...adc(),delegates:['other']},{...adc(),access_token:SOURCE},{...adc(),source_credentials:{...adc().source_credentials,token_uri:'https://evil.invalid'}}];
 for(const credential of bad){const m=mock();await assert.rejects(probe({...options(),credential},m.run),{code:'CREDENTIAL_DENIED'});assert.equal(m.calls.length,0)}
});
test('missing/empty credential fields rejected without transport',async()=>{
 for(const key of ['client_id','client_secret','refresh_token']){
  const o=options(),m=mock();delete o.credential.source_credentials[key];
  await assert.rejects(probe(o,m.run),{code:'CREDENTIAL_DENIED'});assert.equal(m.calls.length,0);
 }
});
test('401 at every stage stops with redacted authentication failure and no fallback',async()=>{
 for(const [stage,n]of [['oauth',1],['impersonation',2],['metadata',3]]){
  const m=mock({[stage]:async()=>({status:401,data:{message:SOURCE+' '+IMPERSONATED}})});
  await assert.rejects(probe(options(),m.run),{code:stage.toUpperCase()+'_UNAUTHENTICATED'});assert.equal(m.calls.length,n);
 }
});
test('403 at every stage stops without adding permissions, retries or user fallback',async()=>{
 for(const [stage,n]of [['oauth',1],['impersonation',2],['metadata',3]]){
  const m=mock({[stage]:async()=>({status:403,data:{message:SOURCE}})});
  await assert.rejects(probe(options(),m.run),{code:stage.toUpperCase()+'_PERMISSION_DENIED'});assert.equal(m.calls.length,n);
 }
});
test('redirect/quota/server errors never follow or retry',async()=>{
 for(const status of [301,302,307,429,500,503]){
  const m=mock({metadata:async()=>({status,data:{access_token:IMPERSONATED}})});
  await assert.rejects(probe(options(),m.run),e=>!e.message.includes(IMPERSONATED));assert.equal(m.calls.length,3);
 }
});
test('transport exceptions containing credentials are not returned or logged',async()=>{
 for(const stage of ['oauth','impersonation','metadata']){
  const m=mock({[stage]:async()=>{throw Error(SOURCE+' '+IMPERSONATED+' synthetic-refresh')}});
  await assert.rejects(probe(options(),m.run),{code:stage.toUpperCase()+'_TRANSPORT_FAILED'});
 }
});
test('invalid/expired/overlong mint response rejected; source token never reused',async()=>{
 for(const data of [
  {accessToken:SOURCE,expireTime:new Date(Date.now()+60000).toISOString()},
  {accessToken:IMPERSONATED,expireTime:'invalid'},
  {accessToken:IMPERSONATED,expireTime:new Date(Date.now()-1).toISOString()},
  {accessToken:IMPERSONATED,expireTime:new Date(Date.now()+3600000).toISOString()},
  {accessToken:'bad\r\nheader',expireTime:new Date(Date.now()+60000).toISOString()}
 ]){
  const m=mock({impersonation:async()=>({status:200,data})});
  await assert.rejects(probe(options(),m.run),{code:'TOKEN_RESPONSE_INVALID'});assert.equal(m.calls.length,2);
 }
});
test('wrong response project database location type or edition fails closed',async()=>{
 for(const [key,value]of [['name','projects/prod/databases/(default)'],['name','projects/mini-drills-vocab-staging/databases/other'],['locationId','us-central1'],['type','DATASTORE_MODE'],['databaseEdition','ENTERPRISE']]){
  const m=mock({metadata:async()=>({status:200,data:{...metadata(),[key]:value}})});
  await assert.rejects(probe(options(),m.run),{code:'METADATA_MISMATCH'});
 }
 const m=mock({metadata:async()=>{const data=metadata();delete data.databaseEdition;return {status:200,data}}});
 assert.equal((await probe(options(),m.run)).editionVerification,'NOT_VERIFIED');
});
test('no document collection query write Auth user or IAM-policy transport route',()=>{
 for(const stage of ['documents','query','createUser','setIamPolicy','enableApi']){
  assert.throws(()=>transport(stage,{url:ENDPOINTS.metadata,method:'GET',headers:{}}),{code:'TRANSPORT_ROUTE_DENIED'});
 }
 for(const request of [{url:ENDPOINTS.metadata+'/documents',method:'GET',headers:{}},{url:ENDPOINTS.metadata,method:'POST',headers:{}},{url:ENDPOINTS.metadata,method:'GET',headers:{},body:'data'}])assert.throws(()=>transport('metadata',request));
});
test('credential overrides debug/proxy/unsafe TLS environment rejected before auth',async()=>{
 for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_OAUTH_ACCESS_TOKEN','CLOUDSDK_AUTH_ACCESS_TOKEN','FIRESTORE_EMULATOR_HOST','NODE_OPTIONS','NODE_DEBUG','NODE_TLS_REJECT_UNAUTHORIZED','NODE_EXTRA_CA_CERTS','SSLKEYLOGFILE','HTTPS_PROXY']){
  const m=mock();await assert.rejects(probe({...options(),environment:{[key]:'synthetic'}},m.run),{code:'ENVIRONMENT_DENIED'});assert.equal(m.calls.length,0);
 }
 assert.doesNotThrow(()=>validateEnvironment({PATH:'local',SystemRoot:'Windows'}));
});
test('default/plan mode does not load credentials or initialize transport',async()=>{
 assert.equal((await main([],{})).cloudRequests,0);assert.equal((await main(['--plan'],{})).live,'NOT_TESTED');
 for(const args of [['--token',IMPERSONATED],['--live-metadata-read'],['--live-metadata-read','--credential-file','relative.json','--confirm','READ_METADATA_ONLY:'+PIN.resource],['--project','production']])assert.throws(()=>parse(args),{code:args.includes('relative.json')?'CREDENTIAL_PATH_DENIED':'ARGUMENTS_DENIED'});
});
test('CLI prints no caller token even on malformed token arguments',()=>{
 const r=spawnSync(process.execPath,['cli.cjs','--token',IMPERSONATED],{cwd:__dirname,encoding:'utf8'});
 assert.equal(r.status,1);assert.ok(!(r.stdout+r.stderr).includes(IMPERSONATED));assert.deepEqual(JSON.parse(r.stderr),{status:'FAIL',code:'ARGUMENTS_DENIED'});
 const plan=spawnSync(process.execPath,['cli.cjs'],{cwd:__dirname,encoding:'utf8'});assert.equal(plan.status,0);assert.equal(JSON.parse(plan.stdout).cloudRequests,0);
});
test('credential loader rejects repository paths and never discovers global ADC',()=>{
 const path=require('node:path');assert.throws(()=>loadCredential(path.join(__dirname,'policy.cjs')),{code:'CREDENTIAL_PATH_DENIED'});
 assert.throws(()=>loadCredential(path.join(__dirname,'missing.json')),{code:'CREDENTIAL_FILE_DENIED'});
});
test('safe summary drops arbitrary response secrets instead of serializing Google payload',async()=>{
 const m=mock({metadata:async()=>({status:200,data:{...metadata(),access_token:IMPERSONATED,debug:{refresh_token:'synthetic-refresh'}}})});
 const text=JSON.stringify(await probe(options(),m.run));assert.ok(!text.includes(IMPERSONATED));assert.ok(!text.includes('synthetic-refresh'));assert.ok(!text.includes('debug'));
});
test('existing spark-local and synthetic runner locks unchanged at approved commit',()=>{
 for(const file of ['staging/spark-local/adapter.cjs','staging/spark-local/live-qa.cjs','staging/spark-local/auth-client.mjs']){
  const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
  const old=execFileSync('git',['show','5d3707c253310f006974fcdef1c5df13da1d304f:'+file],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
  assert.equal(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),old);
 }
});
test('probe import graph has no Firebase SDK, catalog, seed or application service',()=>{
 const code="const M=require('module'),old=M._load;M._load=function(id,...args){if(/firebase|domain|fixtures|service\\.cjs|google-auth-library/.test(id))throw Error('Forbidden dependency');return old.call(this,id,...args)};require('./policy.cjs');require('./core.cjs');require('./transport.cjs');require('./cli.cjs');";
 const r=spawnSync(process.execPath,['-e',code],{cwd:__dirname,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
