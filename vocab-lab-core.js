/* Vocab Check domain model. ES5, no DOM/Firebase, no mastery or flashcard writes. */
(function(root){
'use strict';
function copy(x){return JSON.parse(JSON.stringify(x))}
function hash(s){var h=7,i;for(i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function allowed(user,enabled){return !!(user&&(user.adm===true||user.tester===true||(enabled===true&&user.role==='student')))}
function fresh(email,bank){return {schemaVersion:1,email:email,lessonId:bank.lessonId,revision:0,termProgress:{},attempts:[],batch:null,batchNumber:0}}
function begin(s,bank,ids){
  s.batchNumber++;
  s.batch={id:'batch-'+s.batchNumber,ids:ids||bank.lesson_term_links.filter(function(l){return !s.termProgress[l.senseId]}).slice(0,12).map(function(l){return l.senseId}),history:[],phase:'sort',checks:[],checkAt:0,results:{}};
  if(!s.batch.ids.length)s.batch.phase='results';
  return s;
}
function current(s){return s.batch.ids.filter(function(id){return !s.termProgress[id]})[0]||null}
function candidates(s,practice){return s.batch.ids.filter(function(id){return s.termProgress[id]&&s.termProgress[id].classification==='know'&&practice[id]})}
function sample(s,practice){return candidates(s,practice).sort(function(a,b){return hash(s.batch.id+a)-hash(s.batch.id+b)}).slice(0,3)}
function question(s,practice){var id=s.batch.checks[s.batch.checkAt];return id&&practice[id]||null}
function checkRecord(s){var id=s.batch.checks[s.batch.checkAt];return s.batch.results[id]||(s.batch.results[id]={tries:0,hinted:false,wrong:[],done:false})}
function settle(s,record,result,task){var id=s.batch.checks[s.batch.checkAt];record.done=true;record.status=result;s.termProgress[id].status=result;s.termProgress[id].evidence={taskId:task.id,batchId:s.batch.id,independent:result==='verified_for_current_task'};}
function apply(before,action,bank,practice){
  var s=copy(before),b=s.batch,id,p,r,q,all,failed;
  if(!b)begin(s,bank);b=s.batch;
  if(action.type==='sort'){
    if(b.phase!=='sort'||['know','unsure','new'].indexOf(action.bin)<0)throw Error('Invalid classification');
    id=current(s);if(!id)throw Error('No unsorted item');
    s.termProgress[id]={classification:action.bin,status:action.bin==='know'?'self_reported_known':action.bin==='unsure'?'unsure':'new',formEvidence:{}};
    b.history.push(id);if(!current(s))b.phase='ready';
  }else if(action.type==='undo'){
    if(['sort','ready'].indexOf(b.phase)<0||!b.history.length)throw Error('Nothing to undo');
    id=b.history.pop();delete s.termProgress[id];b.phase='sort';
  }else if(action.type==='startCheck'){
    if(b.phase!=='ready')throw Error('Finish this batch first');
    b.checks=sample(s,practice);b.phase=b.checks.length?'check':'results';
  }else if(action.type==='answer'||action.type==='hint'||action.type==='reveal'){
    if(b.phase!=='check')throw Error('No active check');
    q=question(s,practice);r=checkRecord(s);if(!q||r.done)throw Error('Check already finished');
    if(action.type==='hint'){r.hinted=true}
    else if(action.type==='reveal'){r.hinted=true;settle(s,r,'needs_practice',q)}
    else{
      if(typeof action.choice!=='number'||action.choice%1||action.choice<0||action.choice>=q.options.length||r.wrong.indexOf(action.choice)>=0)throw Error('Invalid answer');
      r.tries++;
      if(action.choice===q.answer)settle(s,r,r.tries===1&&!r.hinted?'verified_for_current_task':'needs_practice',q);
      else{r.wrong.push(action.choice);if(r.tries>=2)settle(s,r,'needs_practice',q)}
    }
    s.attempts.push({id:action.id,senseId:b.checks[b.checkAt],taskId:q.id,type:action.type,choice:action.type==='answer'?action.choice:null,independent:r.done&&r.status==='verified_for_current_task',batchId:b.id});
  }else if(action.type==='next'){
    if(b.phase!=='check'||!checkRecord(s).done)throw Error('Answer this check first');
    all=Object.keys(b.results);failed=all.filter(function(k){return b.results[k].done&&b.results[k].status==='needs_practice'}).length;
    if(all.length>=2&&failed/all.length>=0.5&&b.checks.length<5){
      candidates(s,practice).forEach(function(k){if(b.checks.length<5&&b.checks.indexOf(k)<0)b.checks.push(k)})
    }
    b.checkAt++;if(b.checkAt>=b.checks.length)b.phase='results';
  }else if(action.type==='nextBatch'){
    if(b.phase!=='results')throw Error('Finish the Reality Check first');begin(s,bank);
  }else if(action.type==='revise'){
    if(b.phase!=='results'||!s.termProgress[action.senseId])throw Error('Cannot revise this item');
    id=action.senseId;delete s.termProgress[id];begin(s,bank,[id]);
  }else throw Error('Unknown action');
  s.revision=before.revision+1;return s;
}
function summary(s){var out={self_reported_known:0,verified_for_current_task:0,needs_practice:0,unsure:0,new:0,unsampled:0};
  Object.keys(s.termProgress).forEach(function(k){var p=s.termProgress[k];out[p.status]++;if(p.classification==='know'&&!p.evidence)out.unsampled++});return out}
var api={copy:copy,allowed:allowed,fresh:fresh,begin:begin,current:current,sample:sample,question:question,apply:apply,summary:summary};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MD_VOCAB_CORE=api;
})(this);
