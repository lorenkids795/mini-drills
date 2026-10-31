/* Pure ES5 mission state. Local prototype only; no Vocab Check/XP/Firestore mutation. */
(function(root){
'use strict';
var phases=['briefing','case','investigate','decode','morph','final','debrief'];
function copy(x){return JSON.parse(JSON.stringify(x))}
function normal(x){return String(x||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?;:]/g,'').replace(/\s+/g,' ').trim()}
function normalStrict(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim()}
function route(p){if(!p)return null;if(p.status==='verified_for_current_task')return 'bypass';if(p.status==='needs_practice'||p.status==='unsure')return 'strengthen';if(p.status==='new')return 'discover';return 'light_check'}
function formKey(q){return q.senseId+'::'+q.form}
function task(m,t,phase,q,round){var o=copy(q);o.id=m.id+'@'+m.version+':'+phase+':'+t.senseId+(round?':'+round:'');o.senseId=t.senseId;o.term=t.term;o.phase=phase;return o}
function plan(mission,source,knownForms){
 var eligible=mission.terms.filter(function(t){return mission.provenance==='authored_demo'||!!(source&&source.lessonId===mission.lessonId&&source.termProgress&&source.termProgress[t.senseId])}),out={investigate:[],decode:[],morph:[],final:[]},included={},routes={};
 eligible.forEach(function(t,i){var p=source&&source.termProgress&&source.termProgress[t.senseId],r=route(p)||(i%3===0?'discover':i%3===1?'strengthen':'light_check');included[t.senseId]=true;routes[t.senseId]=r;if(r==='bypass')return;
  var q=task(mission,t,'investigate',t.investigate);q.mode=r;q.guided=false;if(r==='discover')q.teaching=t.definition;out.investigate.push(q);
  out.decode.push(task(mission,t,'decode',t.decode));if(out.final.length<2)out.final.push(task(mission,t,'final',t.final));
 });
 ['discover','transform','recall'].forEach(function(round){mission.morph.forEach(function(f){if(!included[f.senseId]||routes[f.senseId]==='bypass'||(knownForms&&knownForms[f.senseId+'::'+f.form]&&knownForms[f.senseId+'::'+f.form].independent))return;var t=eligible.filter(function(x){return x.senseId===f.senseId})[0],q=task(mission,t,'morph',f[round],round+':'+f.form);q.round=round;q.form=f.form;q.guided=round==='discover';if(q.guided)q.teaching=f.form+' — '+f.definition;q.extra=copy(f.extra);out.morph.push(q)})});
 return {tasks:out,eligible:eligible.map(function(t){return t.senseId}),routes:routes,story:eligible.map(function(t){return t.sentence})};
}
function create(mission,source,identity,knownForms,runId){if(source&&source.email&&source.email!==identity)source=null;var p=plan(mission,source,knownForms);return {schemaVersion:1,identity:identity,missionId:mission.id,contentVersion:mission.version,snapshot:copy(mission),sourceLessonId:mission.lessonId,sourceRevision:source?source.revision:null,plan:p,phase:'briefing',index:0,revealed:0,records:{},attempts:[],forms:copy(knownForms||{}),adaptive:{},runId:runId||'local-run',revision:0}}
function current(s){return (s.plan.tasks[s.phase]||[])[s.index]||null}
function move(s){var n=phases.indexOf(s.phase)+1;s.phase=phases[n]||'debrief';s.index=0;while(['investigate','decode','morph','final'].indexOf(s.phase)>=0&&!s.plan.tasks[s.phase].length){s.phase=phases[phases.indexOf(s.phase)+1];s.index=0}}
function advance(s){s.index++;var q=current(s);while(q&&q.round==='adaptive'&&s.forms[formKey(q)]&&s.forms[formKey(q)].independent){s.index++;q=current(s)}if(!q)move(s)}
function record(s,q){return s.records[q.id]||(s.records[q.id]={tries:0,hinted:false,done:false,wrong:[],draft:[],outcome:null})}
function settle(s,q,r,correct){r.done=true;r.correct=correct;r.independent=!!(correct&&r.tries===1&&!r.hinted&&!q.guided&&(!q.form||q.round==='recall'||q.round==='adaptive'));r.outcome=r.independent?'ready_for_review':'needs_practice';
 if(q.form){var k=formKey(q),f=s.forms[k]||(s.forms[k]={senseId:q.senseId,form:q.form,independent:false,evidence:[]});f.evidence.push({taskId:q.id,round:q.round,independent:r.independent,correct:correct,assisted:r.hinted||q.guided||r.tries>1});if(r.independent)f.independent=true;
  if(!q.guided&&(!correct||r.hinted||r.tries>1)&&!s.adaptive[k]&&Object.keys(s.adaptive).length<3){var extra=copy(q.extra);extra.id=q.id+':adaptive';extra.senseId=q.senseId;extra.term=q.term;extra.phase='morph';extra.form=q.form;extra.round='adaptive';s.plan.tasks.morph.push(extra);s.adaptive[k]=true}
 }
}
function apply(before,a){var s=copy(before),q=current(s),r;if(a.id&&s.lastOperation===a.id)return s;
 if(a.type==='begin'){if(s.phase!=='briefing'||!s.plan.eligible.length)throw Error('Classify some linked words first.');s.phase='case'}
 else if(a.type==='revealSentence'){if(s.phase!=='case')throw Error('Not in the case file');if(s.revealed<s.plan.story.length)s.revealed++;else move(s)}
 else if(a.type==='fullReport'){if(s.phase!=='case')throw Error('Not in the case file');s.revealed=s.plan.story.length}
 else if(a.type==='textDraft'){if(!q||q.options||q.kind==='reconstruct')throw Error('No text answer');r=record(s,q);if(r.done)throw Error('Task completed');r.text=String(a.value||'').slice(0,300)}
 else if(a.type==='draft'){if(!q||q.kind!=='reconstruct')throw Error('No reconstruction');r=record(s,q);if(r.done)throw Error('Task completed');if(a.clear)r.draft=[];else if(a.undo)r.draft.pop();else{if(typeof a.index!=='number'||a.index%1||a.index<0||a.index>=q.tokens.length||r.draft.indexOf(a.index)>=0)throw Error('Invalid token');r.draft.push(a.index)}}
 else if(a.type==='next'){if(!q||!record(s,q).done)throw Error('Complete the current task');advance(s)}
 else if(a.type==='answer'||a.type==='hint'||a.type==='support'||a.type==='reveal'){
  if(!q)throw Error('No active task');r=record(s,q);if(r.done)throw Error('Task completed');
  if(a.type==='hint'){r.hinted=true;r.hintLevel=Math.min(2,(r.hintLevel||(r.tries?1:0))+1)}
  else if(a.type==='support'){if(!q.teaching||!r.tries)throw Error('Try the context first.');r.hinted=true;r.supported=true;}
  else if(a.type==='reveal'){r.hinted=true;settle(s,q,r,false)}
  else{
   var given=a.value,correct;if(q.options){if(typeof given!=='number'||given%1||given<0||given>=q.options.length||r.wrong.indexOf(given)>=0)throw Error('Choose an available option');correct=given===q.answer}
   else{if(q.kind==='reconstruct')given=r.draft.map(function(i){return q.tokens[i]}).join(' ');if(!normal(given))throw Error('Write an answer first.');correct=q.answers.some(function(x){var norm=q.strictVariants?normalStrict:normal;return norm(x)===norm(given)})}
   r.tries++;if(correct)settle(s,q,r,true);else{r.wrong.push(given);if(r.tries>=2)settle(s,q,r,false)}
  }
  s.attempts.push({id:s.runId+':'+(s.attempts.length+1),taskId:q.id,contentVersion:s.contentVersion,senseId:q.senseId,form:q.form||null,round:q.round||null,action:a.type,answer:a.type==='answer'?(q.kind==='reconstruct'?r.draft.map(function(i){return q.tokens[i]}).join(' '):a.value):null,tries:r.tries,independent:!!r.independent,assisted:r.hinted||!!q.guided||r.tries>1,at:a.at||0});
 }else throw Error('Unknown mission action');
 s.revision=before.revision+1;s.lastOperation=a.id||null;return s;
}
function summary(s){return s.plan.eligible.map(function(id){var rec=Object.keys(s.records).filter(function(k){return k.indexOf(':'+id)>=0&&k.indexOf(':morph:')<0}).map(function(k){return s.records[k]});var independent=rec.some(function(r){return r.independent}),initial=s.plan.routes[id]==='bypass';return {senseId:id,status:independent||initial?'ready_for_review':'needs_practice',sourceOnly:initial&&!rec.length,nextReviewSignal:independent||initial?'short_review':'guided_practice'}})}
function resume(saved,identity,missionId){return !!(saved&&saved.schemaVersion===1&&saved.identity===identity&&saved.missionId===missionId&&saved.snapshot&&saved.snapshot.id===missionId&&saved.contentVersion===saved.snapshot.version&&saved.plan&&saved.records&&saved.forms)}
var api={copy:copy,normal:normal,route:route,plan:plan,create:create,current:current,apply:apply,summary:summary,resume:resume};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MD_MISSION_CORE=api;
})(this);
