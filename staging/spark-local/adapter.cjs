'use strict';
const {PIN,validate}=require('./policy.cjs');
const {service}=require('../service.cjs');
const {domain}=require('../phase31/fixtures.cjs');
const {COLLECTIONS}=require('../phase31/schema.cjs');
function mockAdapter(config,{db,auth},env={}){
 const checked=validate(config,env);
 // This is an offline contract adapter. No ADC, Admin SDK or cloud factory is loaded.
 require('../loopback-only.cjs').install();
 const root=db.collection(PIN.namespace).doc(checked.runId);
 const parent=root.collection('lessons').doc(checked.lessonId);
 const scoped={
  collection(name){if(!COLLECTIONS.includes(name))throw Error('Collection denied');return parent.collection(name)},
  getAll:(...refs)=>db.getAll(...refs),batch:()=>db.batch(),
  runTransaction:fn=>db.runTransaction(async tx=>{
   const r=await tx.get(root);
   if(!r.exists||r.data().synthetic!==true||r.data().state!=='ready'||r.data().writeLocked!==false)throw Object.assign(Error('Fixture writes locked'),{status:423});
   return fn(tx);
  })
 };
 const checkedAuth={
  async verifyIdToken(token,revoked){
   const decoded=await auth.verifyIdToken(token,revoked);
   if(decoded.aud!==PIN.projectId||decoded.iss!=='https://securetoken.google.com/'+PIN.projectId||!/^fx31_[a-z0-9_-]+$/.test(decoded.uid||''))throw Error('Foreign identity');
   return decoded;
  },
  getUser:uid=>auth.getUser(uid)
 };
 return {config:checked,root,parent,api:service({db:scoped,auth:checkedAuth},domain(checked.lessonId))};
}
function connect(config,{mode='emulator'}={}){
 if(mode==='emulator')return require('../environment.cjs').connect();
 if(mode!=='spark-local')throw Error('Unknown mode; fallback forbidden');
 validate(config);
 // A flag or manifest cannot activate live access in this offline release.
 throw Error('SPARK_LIVE_LOCKED: project/IAM approval and reviewed live transport required');
}
module.exports={mockAdapter,connect};
