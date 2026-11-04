'use strict';
const crypto=require('node:crypto'),C=require('../vocab-editorial-core'),bank=require('../data/vocab-lab-p1.json');
const LESSON=bank.lessonId,copy=C.copy;
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x)}
const hash=x=>crypto.createHash('sha256').update(canonical(x)).digest('hex');
function fail(code,message){const e=Error(message);e.status=code;throw e}
function key(s){if(typeof s!=='string'||!s.match(/^[a-zA-Z0-9_-]{1,180}$/))fail(400,'Invalid identifier');return s}
function op(s){if(typeof s!=='string'||!s.match(/^[a-zA-Z0-9_-]{8,100}$/))fail(400,'Operation ID required');return s}
function note(s){if(typeof s!=='string'||!s.trim()||s.length>2000)fail(400,'Review note required');return s.trim()}
function normalized(x){return String(x).normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ')}
function newSession(uid,item,id){return {id,uid,itemId:item.id,lessonId:LESSON,senseId:item.senseId,form:null,version:item.version,hash:item.hash,phase:'context',revision:0,records:{context:{tries:0,hinted:false,revealed:false},retrieval:{tries:0,hinted:false,revealed:false}},createdAt:Date.now()}}
function question(s,v){return s.phase==='context'?v.content.investigate:v.content.final}
function advance(before,v,a){const s=copy(before);if(s.phase==='done')fail(409,'Session complete');const phase=s.phase,q=question(s,v);let evidence=null;
 if(phase==='pause'){if(a.type!=='answer'||a.value!==1)fail(400,'Complete the intervening memo');s.phase='retrieval';s.feedback='';}
 else {const r=s.records[phase];if(!['answer','hint','reveal'].includes(a.type))fail(400,'Unknown action');let correct=false;
  if(a.type==='hint'){r.hinted=true;s.feedback=q.clue;}
  else if(a.type==='reveal'){r.revealed=true;r.hinted=true;r.correct=false;s.phase=phase==='context'?'pause':'done';s.feedback='';}
  else {if(q.options){if(!Number.isInteger(a.value)||a.value<0||a.value>=q.options.length)fail(400,'Choose an option');correct=a.value===q.answer}else{if(typeof a.value!=='string'||!a.value.trim()||a.value.length>300)fail(400,'Write an answer');correct=q.answers.some(x=>normalized(x)===normalized(a.value))}r.tries++;r.correct=correct;s.feedback=correct?'':q.clue;if(correct)s.phase=phase==='context'?'pause':'done';}
  const independent=phase==='retrieval'&&correct&&r.tries===1&&!r.hinted&&!r.revealed;
  evidence={phase,taskId:s.itemId+'@'+s.version+':'+phase,type:a.type,tries:r.tries,correct,independent,assisted:r.hinted||r.revealed||r.tries>1,revealed:r.revealed,answer:a.type==='answer'?a.value:null};
 }
 s.revision++;s.updatedAt=Date.now();return {session:s,evidence};
}
function view(s,v){const out={id:s.id,itemId:s.itemId,version:s.version,hash:s.hash,revision:s.revision,phase:s.phase,feedback:s.feedback||''};
 if(s.phase==='pause')return {...out,feedback:'',prompt:'Which date is later?',options:['2 June','6 June']};
 if(s.phase==='done')return {...out,correct:!!s.records.retrieval.correct,independent:!!(s.records.retrieval.correct&&s.records.retrieval.tries===1&&!s.records.retrieval.hinted&&!s.records.retrieval.revealed),answer:v.content.final.answers.join(' / '),explanation:v.content.final.why};
 const q=question(s,v);out.prompt=q.prompt;if(q.options)out.options=q.options;if(s.phase==='context')out.context=v.content.sentence;return out;
}
function catalog(){return C.catalog(bank,require('../vocab-mission-packs').packs,require('../vocab-routes').items).map(i=>({...i,id:i.sourceId,lessonId:LESSON,hash:hash(i.content)}))}
module.exports={LESSON,bank,C,hash,key,op,note,fail,copy,newSession,advance,view,catalog};
