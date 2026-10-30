/* Shared root/static Library selector. Unpublished packs require explicit tester QA. */
(function(root){'use strict';
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function mount(host,opt){
 if(!root.MD_MISSION.eligible(opt.user,opt.demo)){host.textContent='Mission gameplay and save/sync are unavailable online.';return}
 var P=root.MD_MISSION_PLANNER,qa=false,email=opt.user.email;
 function source(){try{var v=JSON.parse(localStorage.getItem('md-vocab-lab:v1:'+encodeURIComponent(email)+':'+opt.bank.lessonId)||'null');return v&&v.state||opt.progress}catch(e){return opt.progress}}
 function formEvidence(){var out=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf('md-vocab-mission:v2:'+encodeURIComponent(email)+':')!==0)continue;try{var s=JSON.parse(localStorage.getItem(k));if(s.identity!==email||!s.engineSnapshot||s.engineSnapshot.editorialQA!==qa)continue;(s.attempts||[]).forEach(function(a){if(a.form&&a.independent)out.push({identity:email,lessonId:s.sourceLessonId,senseId:a.senseId,form:a.form,independent:true,taskId:a.taskId,contentVersion:a.contentVersion,at:a.at,evidence:[a]})})}catch(e){}}return out}
 function render(){var list=P.candidates(opt.bank,root.MD_MISSION_PACKS.packs,source(),email,{editorialQA:qa});
 host.innerHTML='<h3>Personalized Missions</h3><p>Choose a coherent case based on words you have actually classified. Verified words stay in the story without basic drills.</p><label class="vm-btn"><input type="checkbox" data-mission-qa '+(qa?'checked':'')+'> Review unpublished candidate packs · admin/tester QA</label>'+(qa?'<p class="vm-alert" role="status">TEACHER_REVIEW · Unpublished content. QA only; no mastery or curriculum approval.</p>':'<p>Only versioned packs with human approval enter normal gameplay.</p>')+(list.length?list.map(function(p){return '<section class="vm-card"><h4>'+esc(p.title)+'</h4><p>'+esc(p.theme)+' · '+p.targetSenseIds.length+' classified target(s) · '+esc(p.editorialStatus)+'</p><button type="button" class="vm-btn" data-mission-pack="'+esc(p.packId)+'">'+(qa?'Review candidate: ':'Start: ')+esc(p.title)+'</button></section>'}).join(''):'<p role="status">No mission for these words yet. Continue sorting; unpublished packs are awaiting teacher review.</p>')+'<button type="button" class="vm-btn" data-mission-sort>Continue Sorting</button>';
 host.querySelector('[data-mission-qa]').onchange=function(){qa=this.checked;render()};host.querySelector('[data-mission-sort]').onclick=opt.onContinueSorting;
 host.querySelectorAll('[data-mission-pack]').forEach(function(b){b.onclick=function(){if(opt.isCurrent&&!opt.isCurrent())return;var pack=root.MD_MISSION_PACKS.packs.filter(function(p){return p.id===b.dataset.missionPack})[0];opt.onLaunch(P.snapshot(opt.bank,pack,source(),email,{editorialQA:qa,formEvidence:formEvidence()}))}});
 }render();
}root.MD_MISSION_LIBRARY={mount:mount};
})(this);
