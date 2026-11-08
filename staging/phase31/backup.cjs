'use strict';
// Logical JSON snapshots of the synthetic subtree only. Auth credentials are excluded.
const {runRef,hash,COLLECTIONS}=require('./runtime.cjs'),{LESSONS,domain}=require('./fixtures.cjs');
function pathAllowed(path){
 const p=path.split('/');
 if(p[0]!=='lessons'||!LESSONS.includes(p[1]))return false;
 if(p.length===2)return true;
 if(!COLLECTIONS.includes(p[2])||!p[3]||!p.every(x=>/^[a-zA-Z0-9_-]+$/.test(x)))return false;
 return p.length===4||p.length===6&&p[2]==='vocab28_students'&&['sessions','events','operations','progress'].includes(p[4]);
}
function jsonValue(v){
 if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return;
 if(Array.isArray(v)){v.forEach(jsonValue);return}
 if(v&&Object.getPrototypeOf(v)===Object.prototype){for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe field');jsonValue(x)}return}
 throw Error('Unsupported snapshot type; refusing lossy serialization');
}
async function walk(ref,base,rows){
 const doc=await ref.get();if(doc.exists&&ref.path!==base){const path=ref.path.slice(base.length+1);if(!pathAllowed(path))throw Error('Unexpected fixture path: '+path);const data=doc.data();jsonValue(data);rows.push({path,data})}
 for(const collection of await ref.listCollections())for(const child of await collection.listDocuments())await walk(child,base,rows);
}
function validate(snapshot){
 if(snapshot?.format!=='phase31-logical-v1'||snapshot.synthetic!==true||!/^fx31_[a-z0-9_-]{4,60}$/.test(snapshot.sourceRun)||!Array.isArray(snapshot.documents)||snapshot.documents.length>440||snapshot.documents.length!==snapshot.count)throw Error('Invalid snapshot envelope');
 const {checksum,...payload}=snapshot;if(hash(payload)!==checksum)throw Error('Snapshot checksum mismatch');
 const docs=new Map();for(const row of snapshot.documents){if(!pathAllowed(row.path)||docs.has(row.path))throw Error('Invalid or duplicate document path');jsonValue(row.data);docs.set(row.path,row.data)}
 for(const lesson of LESSONS){
  const prefix=`lessons/${lesson}/`,d=domain(lesson);if(!docs.has(`lessons/${lesson}`))throw Error('Lesson missing');
  const versions=new Map();
  for(const [path,v]of docs)if(path.startsWith(prefix+'vocab28_versions/')){if(v.lessonId!==lesson||!d.C.validate(v).valid||d.hash(v.content)!==v.hash||path!==prefix+'vocab28_versions/'+v.id+'__'+v.version)throw Error('Version integrity failure');versions.set(v.id+'__'+v.version,v)}
  for(const item of d.catalog()){
   const i=docs.get(prefix+'vocab28_items/'+item.id),v=i&&versions.get(i.id+'__'+i.version);
   if(!v||i.hash!==v.hash||i.lessonId!==lesson||!['DRAFT','REQUEST_FIX','REJECTED','APPROVED','PUBLISHED'].includes(i.status))throw Error('Item/version mismatch');
   if(['APPROVED','PUBLISHED'].includes(i.status)&&(!i.approval||i.approval.hash!==i.hash||i.approval.version!==i.version))throw Error('Approval mismatch');
   if(i.status==='PUBLISHED'){const pub=docs.get(prefix+'vocab28_publications/'+i.id+'__'+i.version),current=docs.get(prefix+'vocab28_public/'+i.id);if(pub?.hash!==i.hash||current?.hash!==i.hash)throw Error('Publication missing')}
  }
  for(const [path,v]of docs){if(!path.startsWith(prefix))continue;const parts=path.split('/');
   if(parts[2]==='vocab28_items'&&!d.catalog().some(i=>i.id===v.id))throw Error('Foreign item');
   if(parts[2]==='vocab28_students'&&parts[4]==='sessions'){const pinned=versions.get(v.itemId+'__'+v.version);if(!pinned||pinned.hash!==v.hash||v.uid!==parts[3]||v.lessonId!==lesson)throw Error('Session reference mismatch')}
   if(parts[2]==='vocab28_students'&&['events','operations'].includes(parts[4])){const sid=v.sessionId||v.result?.id;if(!sid||!docs.has(prefix+'vocab28_students/'+parts[3]+'/sessions/'+sid))throw Error('Event/operation session missing')}
   if(parts[2]==='vocab28_students'&&parts[4]==='progress'&&!docs.has(prefix+'vocab28_students/'+parts[3]+'/sessions/'+v.lastSessionId))throw Error('Progress session missing');
  }
 }
 return snapshot;
}
async function snapshot(c,id){
 const root=runRef(c,id),before=await root.get();if(!before.exists||before.data().state!=='ready'||!before.data().writeLocked)throw Error('Lock writes before snapshot');
 const documents=[];await walk(root,root.path,documents);documents.sort((a,b)=>a.path.localeCompare(b.path));
 const after=await root.get();if(!after.data().writeLocked||!before.updateTime.isEqual(after.updateTime))throw Error('Run changed during snapshot');
 const payload={format:'phase31-logical-v1',synthetic:true,sourceRun:id,count:documents.length,documents};return validate({...payload,checksum:hash(payload)});
}
async function restore(c,target,input){
 const s=validate(input),root=runRef(c,target);if(target===s.sourceRun)throw Error('Restore requires a new run');
 if((await root.get()).exists||(await root.listCollections()).length)throw Error('Restore target is not empty');
 // Bound size permits one atomic commit: partial restore is never made ready.
 const batch=c.db.batch();batch.create(root,{synthetic:true,fixtureSetId:'phase31-v1',schemaVersion:1,runId:target,state:'ready',writeLocked:true,restoredFrom:s.sourceRun,snapshotChecksum:s.checksum});
 for(const row of s.documents)batch.create(root.collection('lessons').doc(row.path.slice('lessons/'.length)),row.data);
 await batch.commit();const result=await snapshot(c,target);if(hash(result.documents)!==hash(s.documents))throw Error('Restore verification failed');return {runId:target,count:result.count,documentsHash:hash(result.documents),writeLocked:true};
}
module.exports={snapshot,restore,validate,pathAllowed};
