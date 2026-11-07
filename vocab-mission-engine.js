/* Immutable curated construction. Storage and delivery remain separate. */
(function(root){'use strict';
var node=typeof module!=='undefined'&&module.exports,P=node?require('./vocab-mission-planner'):root.MD_MISSION_PLANNER,C=node?require('./vocab-mission-core'):root.MD_MISSION_CORE;
function create(plan,identity,runId){
 if(!plan||plan.identity!==identity||plan.planVersion!==P.VERSION||plan.contentVersion!==plan.contentSnapshot.version)throw Error('Invalid mission plan');
 var m=P.copy(plan.contentSnapshot),source={email:identity,lessonId:plan.sourceLesson,revision:plan.sourceRevision,termProgress:P.copy(plan.eligibilityEvidence)};
 m.provenance='approved_p1';var s=C.create(m,source,identity,plan.formEvidence,runId);
 s.engineSnapshot=P.copy(plan);s.planVersion=plan.planVersion;s.selectedSenseIds=P.copy(plan.selectedSenseIds);
 s.plan.story=(m.context||[]).map(function(t){return t.sentence}).concat(m.terms.map(function(t){return t.sentence}));
 // Every selected target gets independent recall, including the third to seventh target.
 s.plan.tasks.final=plan.selectedSenseIds.map(function(id){var t=m.terms.filter(function(x){return x.senseId===id})[0],q=P.copy(t.final);q.id=m.id+'@'+m.version+':final:'+id;q.senseId=id;q.term=t.term;q.phase='final';return q});
 return s;
}
function key(plan){return 'md-vocab-mission:v2:'+encodeURIComponent(plan.identity)+':'+plan.packId+':'+(plan.editorialQA?'qa':'published')}
function resume(s,plan){return C.resume(s,plan.identity,plan.packId)&&s.engineSnapshot&&s.engineSnapshot.identity===plan.identity&&s.engineSnapshot.editorialQA===plan.editorialQA&&s.planVersion===P.VERSION}
var api={create:create,key:key,resume:resume};if(node)module.exports=api;else root.MD_MISSION_ENGINE=api;
})(this);
