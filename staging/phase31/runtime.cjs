'use strict';
const {guard}=require('../environment.cjs'),{service}=require('../service.cjs'),{domain,LESSONS}=require('./fixtures.cjs');
const {hash}=require('../domain-core.cjs');
const {COLLECTIONS}=require('./schema.cjs');
function runRef(c,id){
 guard();
 require('../loopback-only.cjs').install();
 if(c.projectId!==process.env.GCLOUD_PROJECT||!/^fx31_[a-z0-9_-]{4,60}$/.test(id))throw Error('Emulator fixture run required');
 return c.db.collection('vocab31_fixture_runs').doc(id);
}
function scope(c,id,lesson){
 const root=runRef(c,id);domain(lesson);
 const parent=root.collection('lessons').doc(lesson);
 const db={collection:name=>{if(!COLLECTIONS.includes(name))throw Error('Collection denied');return parent.collection(name)},getAll:(...a)=>c.db.getAll(...a),batch:()=>c.db.batch(),runTransaction:fn=>c.db.runTransaction(async tx=>{const state=await tx.get(root);if(!state.exists||state.data().state!=='ready'||state.data().writeLocked)throw Object.assign(Error('Fixture writes locked'),{status:423});return fn(tx)})};
 return {root,parent,db,api:service({db,auth:c.auth},domain(lesson))};
}
async function createRun(c,id){
 const root=runRef(c,id);await root.create({synthetic:true,fixtureSetId:'phase31-v1',schemaVersion:1,runId:id,state:'initializing',writeLocked:true});
 for(const lesson of LESSONS){const s=scope(c,id,lesson);await s.parent.create({synthetic:true,lessonId:lesson});await s.api.seed()}
 await root.update({state:'ready',writeLocked:false});return root;
}
async function provision(c,id,uid,role,lesson='fx31_alpha',classId='fx31_class_a',options={}){
 if(!/^fx31_[a-z0-9_-]+$/.test(uid)||!['admin','teacher','tester','student'].includes(role))throw Error('Synthetic identity required');
 const s=scope(c,id,lesson),user=await c.auth.getUser(uid);
 if(user.email!==uid+'@local.invalid')throw Error('Synthetic email required');
 const state=await s.root.get();if(!state.exists||state.data().state!=='ready'||state.data().writeLocked)throw Error('Fixture writes locked');
 const claims=role==='admin'?{role:'teacher',adm:true}:{role};await c.auth.setCustomUserClaims(uid,claims);
 // Provisioning is an explicit operator operation, never an HTTP capability.
 await c.db.runTransaction(async tx=>{const r=await tx.get(s.root);if(!r.exists||r.data().writeLocked)throw Error('Fixture writes locked');tx.set(s.db.collection('vocab30_accounts').doc(uid),{uid,email:user.email,role,active:true,tester:options.tester??role==='student',classId,revokedAfter:0});if(role==='teacher')tx.set(s.db.collection('vocab28_staff').doc(uid),{active:true,lessons:[lesson],classes:options.classes||[classId]});if(role==='student')tx.set(s.db.collection('vocab28_enrollments').doc(uid),{active:true,lessons:[lesson],classId})});
}
async function lock(c,id,value){const ref=runRef(c,id);await c.db.runTransaction(async tx=>{const r=await tx.get(ref);if(!r.exists||r.data().state!=='ready')throw Error('Run not ready');tx.update(ref,{writeLocked:!!value})})}
module.exports={scope,runRef,createRun,provision,lock,COLLECTIONS,hash};
