/* Local-only mission controller. No Firebase SDK/API, no mutation of Vocab Check. */
(function(root){
'use strict';
var C=root.MD_MISSION_CORE,active=null,opening=0;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
function local(){return ['localhost','127.0.0.1','[::1]'].indexOf(location.hostname)>=0}
function town(){return '<svg class="vm-scene" viewBox="0 0 720 150" role="img" aria-label="An original illustration of a town bus connecting homes and a station"><path class="vm-sky" d="M0 0h720v150H0z"/><circle class="vm-sun" cx="602" cy="32" r="17"/><path class="vm-land" d="M0 95h720v55H0z"/><path class="vm-building" d="M60 95V48l32-22 32 22v47zm90 0V57l30-19 30 19v38zm375 0V43h115v52z"/><path class="vm-lines" d="M0 125h720M0 113h720M250 40v60m-9-60h18"/><rect class="vm-boat" x="285" y="60" width="167" height="49" rx="9"/><path class="vm-lines" d="M301 74h28m14 0h28m14 0h28m14 0h12M326 110h2m87 0h2"/><circle class="vm-building" cx="326" cy="110" r="10"/><circle class="vm-building" cx="417" cy="110" r="10"/></svg>'}
function eligible(user,demo){return !!(local()&&demo===true&&user&&(user.adm===true||user.tester===true))}
function button(action,text,extra,disabled){return '<button type="button" class="vm-btn" data-vm="'+action+'"'+(extra||'')+(disabled?' disabled':'')+'>'+esc(text)+'</button>'}
function curatedScene(m){var shapes=m.visual==='community'?'<path d="M70 115V55l65-35 65 35v60zm250 0V40h130v75zm230 0V60l60-30 60 30v55z"/>':m.visual==='energy'?'<path d="M70 110h130V60H70zm250 0V35h90v75zm230 0V65h100v45M200 85h120m90 0h140"/>':'<path d="M70 75h140l100-40h130l100 40h110M210 75l100 40h130l100-40"/>';return '<svg class="vm-scene" viewBox="0 0 720 150" role="img" aria-label="'+esc(m.title)+' schematic"><path class="vm-sky" d="M0 0h720v150H0z"/><g class="vm-lines" fill="none" stroke-width="5">'+shapes+'</g></svg>'}
function scene(){return '<svg class="vm-scene" viewBox="0 0 720 150" role="img" aria-label="An illustrated coast with a factory, trees and a research boat"><path class="vm-sky" d="M0 0h720v150H0z"/><circle cx="588" cy="35" r="17" class="vm-sun"/><path class="vm-hill" d="M0 85 90 50l80 40 100-32 120 38 70-22 90 24 170-20v72H0z"/><path class="vm-building" d="M69 95V59l34 13V57l34 15V95Zm-18 0V38h12v57M149 95V25h13v70"/><path class="vm-land" d="M0 106q90-20 180 0t180-4 180 5 180-9v52H0z"/><path class="vm-water" d="M0 122q100-14 190 0t180 0 180 0 170-2v30H0z"/><path class="vm-boat" d="m443 114 16 17h48l17-17zM478 114V81l26 27h-26"/><path class="vm-lines" d="M28 136h40m175 2h46m308-5h40M202 95V67m-14 15 14-21 15 21m-10 16V77"/></svg>'}
function open(host,opt){
 if(!eligible(opt.user,opt.demo)){host.textContent='Mission preview is available to local admin/tester demo accounts only.';return Promise.resolve(false)}
 var request=++opening;host.classList.add('vm');host.innerHTML='<p role="status">Opening your mission…</p>';
 var start=opt.bank?Promise.resolve(opt.bank):fetch('data/vocab-lab-p1.json').then(function(r){if(!r.ok)throw Error('Cannot load the approved bank');return r.json()});
 return start.then(function(bank){
  if(request!==opening)return false;
  var enginePlan=opt.planSnapshot;if(enginePlan&&(enginePlan.identity!==String(opt.user.email)||(!enginePlan.editorialQA&&!root.MD_MISSION_PLANNER.published(enginePlan.contentSnapshot))))throw Error('Unapproved or wrong-identity mission');
  var mission=enginePlan?enginePlan.contentSnapshot:opt.missionId==='authored-save-the-coast'?root.MD_MISSION_CONTENT.coast():root.MD_MISSION_CONTENT.linked(bank),identity=String(opt.user.email),key='md-vocab-mission:v1:'+encodeURIComponent(identity)+':'+mission.id+':'+(mission.provenance==='authored_demo'?'authored':opt.sampleProfile?'fixture':'check');
  if(enginePlan)key=root.MD_MISSION_ENGINE.key(enginePlan);
  var s={host:host,opt:opt,bank:bank,mission:mission,identity:identity,key:key,state:null,message:'Saved in this browser',busy:false};active=s;
  var source=opt.progress||null;
  if(mission.provenance==='approved_p1'&&!source){try{var raw=JSON.parse(localStorage.getItem('md-vocab-lab:v1:'+encodeURIComponent(identity)+':'+bank.lessonId)||'null');if(raw&&raw.state&&raw.state.email===identity&&raw.state.lessonId===bank.lessonId)source=raw.state}catch(e){}}
  // Preview profiles are labelled, in-memory fixtures. Never write them into Vocab Check.
  if(opt.sampleProfile&&mission.provenance==='approved_p1'){source={lessonId:bank.lessonId,email:identity,revision:0,termProgress:{}};mission.terms.forEach(function(t,i){source.termProgress[t.senseId]={status:['new','unsure','verified_for_current_task','self_reported_known','needs_practice'][i]}})}
  if(source&&(source.email!==identity||source.lessonId!==bank.lessonId))source=null;
  s.source=source;
  var store=root.MD_MISSION_STORE(key,root.localStorage,root.navigator&&root.navigator.locks),saved;try{saved=store.read()}catch(e){host.textContent='This mission could not be read. Saved data has not been overwritten.';return false}
  if(saved&&!(enginePlan?root.MD_MISSION_ENGINE.resume(saved,enginePlan):C.resume(saved,identity,mission.id))){host.textContent='This saved mission could not be opened. It has not been overwritten.';return false}
  function freshRun(){return enginePlan?root.MD_MISSION_ENGINE.create(enginePlan,identity,Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)):C.create(mission,source,identity,null,Date.now().toString(36))}
  s.state=saved||freshRun();if(enginePlan&&saved){enginePlan=saved.engineSnapshot;s.mission=saved.snapshot;s.source={email:identity,lessonId:enginePlan.sourceLesson,revision:enginePlan.sourceRevision,termProgress:enginePlan.eligibilityEvidence}}
  function save(before){s.conflictLoaded=false;return store.save(before,s.state).then(function(){s.message='Saved in this browser';return true},function(e){if(e.code==='mission-conflict'&&C.resume(e.remote,identity,mission.id)){s.state=e.remote;s.conflictLoaded=true;s.message=e.message}else s.message=e.code==='mission-conflict'?'Another tab replaced or removed this mission. Reload before continuing.':'Could not save. '+(e.message||'Free browser storage before continuing.');return false})}
  function render(focus){
   if(active!==s)return;
   var state=s.state,m=state.snapshot,q=C.current(state),r=q&&(state.records[q.id]||{tries:0,hinted:false,done:false,wrong:[],draft:[]}),chapters={briefing:'Mission briefing',case:'Case File',investigate:'Investigate',decode:'Decode Evidence',morph:'Decode Evidence · Word Morph',final:'Final Report',debrief:'Debrief'};
   var h='<header class="vm-head"><h2>'+esc(m.title)+'</h2></header><section class="vm-card"><div class="vm-step"><h3 id="vmStep" tabindex="-1">'+chapters[state.phase]+'</h3>'+(q?'<span>'+((state.index||0)+1)+' / '+state.plan.tasks[state.phase].length+'</span>':'')+'</div>';
   if(state.engineSnapshot&&state.engineSnapshot.editorialQA)h+='<p class="vm-alert" role="status">TEACHER_REVIEW · Unpublished candidate · admin/tester QA only</p>';
   if(!state.plan.eligible.length){h+='<p>Not enough classified words for this mission yet. Sort a few words first; you do not need to finish all 102.</p>'+button('sorting','Continue Sorting')}
   else if(state.phase==='briefing'){h+=(m.visual?curatedScene(m):m.provenance==='authored_demo'?scene():town())+'<p class="vm-alert">'+esc(m.alert||'Evidence review')+'</p><p class="vm-story">'+esc(m.briefing)+'</p>'+button('begin','Open the case file')}
   else if(state.phase==='case'){
    h+='<div class="vm-report" role="button" tabindex="0" data-vm="sentence" aria-label="'+(state.revealed<state.plan.story.length?'Reveal the next report sentence':'Open the investigation')+'"><p class="vm-report-paragraph" aria-live="polite" aria-atomic="false">'+esc(state.plan.story.slice(0,state.revealed).join(' '))+'</p><span class="vm-report-action">'+(state.revealed<state.plan.story.length?'Reveal next sentence · '+state.revealed+'/'+state.plan.story.length:'Open the investigation →')+'</span></div>';
    if(state.revealed<state.plan.story.length)h+=button('full','Show full report',' class="vm-secondary"');
   }else if(q){
    if(state.phase==='morph')h+='<span class="vm-round">'+esc({discover:'Discover a form',transform:'Transform the sentence',recall:'Independent recall',adaptive:'One more context'}[q.round])+'</span>';
    if(state.phase==='investigate')h+='<span class="vm-round">'+esc({discover:'Read the evidence and infer the meaning',strengthen:'Revisit the meaning using this evidence',light_check:'Check the meaning in a fresh context'}[q.mode])+'</span>';
    if(q.artifact)h+='<div class="vm-artifact"><strong>'+esc(q.artifact)+'</strong><p>'+esc(q.purpose)+'</p>'+(q.context?'<blockquote>'+esc(q.context)+'</blockquote>':'')+'</div>';
    if(q.family)h+='<p class="vm-quiet">Use a form from the '+esc(q.family)+' word family.</p>';
    if(q.teaching&&(r.supported||r.done))h+='<p class="vm-teaching">'+esc(q.teaching)+'</p>';
    h+='<p class="vm-prompt">'+esc(q.prompt)+'</p>';
    if(q.options){h+='<div class="vm-options">';q.options.forEach(function(option,i){h+=button('answer',option,' data-choice="'+i+'"'+(r.wrong.indexOf(i)>=0?' data-wrong="true"':''),r.done||r.wrong.indexOf(i)>=0)});h+='</div>'}
    else if(q.kind==='reconstruct'){
     h+='<div class="vm-built" aria-live="polite">'+esc(r.draft.map(function(i){return q.tokens[i]}).join(' ')||'Build the sentence from the words below.')+'</div><div class="vm-tokens">';q.tokens.forEach(function(t,i){h+=button('token',t,' data-index="'+i+'"',r.done||r.draft.indexOf(i)>=0)});h+='</div><div class="vm-tools vm-edit-tools">'+button('undoToken','Undo','',r.done||!r.draft.length)+button('clearTokens','Clear','',r.done||!r.draft.length)+'</div>'+button('answer','Check sentence','',r.done||!r.draft.length);
    }else{h+='<form data-vm-form><label for="vmAnswer">Your answer</label><input id="vmAnswer" name="answer" maxlength="300" value="'+esc(r.text||'')+'" autocomplete="off" spellcheck="false" autocapitalize="off"'+(r.done?' disabled':'')+'><button type="submit" class="vm-btn" data-vm="answer"'+(r.done?' disabled':'')+'>Check answer</button></form><p class="vm-quiet vm-answer-policy">Practise the mission wording. Answers use a fixed list, ignoring capitals and extra spaces; other valid wording may need review. No automatic meaning grading.</p>'}
    if(r.done){var answer=q.options?q.options[q.answer]:q.answers[0];h+='<div class="vm-feedback" role="status"><strong>'+(r.independent?'Ready for review · independent in this task':r.correct?'Completed with support · keep practising':'Let’s review this together')+'</strong><p>'+esc(r.correct?q.why:answer+'. '+q.why)+'</p></div>'+button('next','Continue')}
    else{
     if(r.tries||r.hinted)h+='<div class="vm-feedback" role="status"><strong>'+(r.tries?'Not quite — try again':'A small clue')+'</strong><p>'+esc((r.hintLevel||0)>1&&q.clue2?q.clue2:q.clue)+'</p></div>';
     h+='<div class="vm-tools">'+button('hint',r.hintLevel||r.tries?'Another clue':'Get a clue','',(r.hintLevel||0)>=(q.clue2?2:1))+(q.teaching&&r.tries&&!r.supported?button('support','Show teaching support'):'')+'<details><summary>Stuck?</summary><p>Use the explanation to learn, then revisit this language in a fresh context. Help is welcome; supported work is recorded separately.</p>'+button('reveal','Show explanation')+'</details></div>';
    }
   }else if(state.phase==='debrief'){
    h+='<p class="vm-story">'+esc(m.debrief||'The team can now turn its evidence into a careful recommendation. Keep reviewing the language in fresh contexts; a successful mission is a starting point, not mastery.')+'</p><h4>Meaning in context</h4><ul class="vm-evidence">';
    C.summary(state).forEach(function(row){var term=m.terms.filter(function(t){return t.senseId===row.senseId})[0];h+='<li><span>'+esc(term.term)+'</span><b>'+esc(row.status==='ready_for_review'?'Ready for Review':'Needs Practice')+'</b>'+(row.sourceOnly?'<small>Carried from your Vocab Check context; no new basic drill.</small>':'')+'</li>'});h+='</ul>';
    var forms=Object.keys(state.forms).filter(function(k){return state.plan.eligible.indexOf(state.forms[k].senseId)>=0});
    if(forms.length){h+='<h4>Word forms · separate evidence</h4><ul class="vm-evidence">';forms.forEach(function(k){var f=state.forms[k];h+='<li><span>'+esc(f.form)+'</span><b>'+(f.independent?'Ready for Review':'Needs Practice')+'</b></li>'});h+='</ul>'}
    h+='<p class="vm-quiet">Ready for Review calls for a short follow-up; Needs Practice calls for guided practice.</p><div class="vm-tools">'+button('sorting','Continue Sorting')+button('replay',state.engineSnapshot?'Replay this version':'Replay Demo')+'</div>';
   }
   h+='</section><footer class="vm-save"><span role="status" aria-live="polite">'+esc(s.message==='Saved in this browser'?'':s.message)+'</span>'+(state.plan.eligible.length&&state.phase!=='debrief'?button('sorting','Continue Sorting',' title="Your mission stays saved here"'):'')+'</footer>';host.innerHTML=h;
   if(focus){var target=host.querySelector('#vmStep');if(target)target.focus({preventScroll:true});var feedback=host.querySelector('.vm-feedback');if(feedback)feedback.scrollIntoView({block:'nearest'})}
  }
  s.render=render;
  function act(type,target){
   var info=target?{value:target.value,attributes:{'data-index':target.getAttribute('data-index'),'data-choice':target.getAttribute('data-choice')},getAttribute:function(k){return this.attributes[k]}}:null;
   s.queue=(s.queue||Promise.resolve()).then(function(){return perform(type,info)});return s.queue;
  }
  async function perform(type,target){
   if(active!==s||(opt.isCurrent&&!opt.isCurrent()))return;s.busy=true;
   try{
    if(type==='sorting'){host.classList.remove('vm');if(opt.onContinueSorting)opt.onContinueSorting();else location.href='vocab-lab-preview.html';return}
    if(type==='replay'){var previous=s.state;s.state=freshRun();if(!await save(previous)&&!s.conflictLoaded)s.state=previous;render(true);return}
    var a={id:'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),at:Date.now()},q=C.current(s.state);
    var map={begin:'begin',sentence:'revealSentence',full:'fullReport',next:'next',hint:'hint',support:'support',reveal:'reveal'};
    if(type==='token'||type==='clearTokens'||type==='undoToken'){a.type='draft';a.index=Number(target&&target.getAttribute('data-index'));a.clear=type==='clearTokens';a.undo=type==='undoToken'}
    else if(type==='answer'){a.type='answer';a.value=q&&q.options?Number(target.getAttribute('data-choice')):(host.querySelector('#vmAnswer')||{}).value}
    else if(type==='text'){a.type='textDraft';a.value=target.value}
    else a.type=map[type];
    var old=s.state;s.state=C.apply(old,a);if(!await save(old)){if(!s.conflictLoaded)s.state=old;render(false);return}
    if(active!==s||(opt.isCurrent&&!opt.isCurrent()))return;
    if(type==='text'){var status=host.querySelector('.vm-save [role="status"]');if(status)status.textContent=s.message==='Saved in this browser'?'':s.message;return}
    if((type==='sentence'||type==='full')&&s.state.phase==='case'){
      var para=host.querySelector('.vm-report-paragraph'),report=host.querySelector('.vm-report');
      for(var i=old.revealed;i<s.state.revealed;i++){var span=document.createElement('span');span.textContent=(i?' ':'')+s.state.plan.story[i];para.appendChild(span)}
      report.setAttribute('aria-label',s.state.revealed<s.state.plan.story.length?'Reveal the next report sentence':'Open the investigation');
      host.querySelector('.vm-report-action').textContent=s.state.revealed<s.state.plan.story.length?'Reveal next sentence · '+s.state.revealed+'/'+s.state.plan.story.length:'Open the investigation →';
      var full=host.querySelector('[data-vm="full"]');if(full)full.hidden=s.state.revealed===s.state.plan.story.length;report.focus({preventScroll:true});return;
    }
    render(type!=='token'&&type!=='clearTokens'&&type!=='undoToken');
    if(type==='token'||type==='clearTokens'||type==='undoToken'){var nextToken=host.querySelector('.vm-tokens .vm-btn:not(:disabled)')||host.querySelector('[data-vm="answer"]');if(nextToken)nextToken.focus({preventScroll:true})}
   }catch(e){s.message=e.message;render(false)}finally{s.busy=false}
  }
  s.act=act;
  if(!host._missionEvents){
   host.addEventListener('click',function(e){var t=e.target.closest('[data-vm]');if(t&&active&&active.host===host){e.preventDefault();if(e.detail>1)return;active.act(t.getAttribute('data-vm'),t)}});
   host.addEventListener('keydown',function(e){var t=e.target.closest('.vm-report');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!e.repeat&&active)active.act('sentence',t)}});
   host.addEventListener('submit',function(e){if(e.target.hasAttribute('data-vm-form')){e.preventDefault();if(active)active.act('answer',null)}});
   host.addEventListener('input',function(e){if(e.target.id==='vmAnswer'&&active&&active.host===host)active.act('text',e.target)});
   host._missionEvents=true;
  }
  if(saved){render(false);return true}return save(null).then(function(){render(false);return true});
 }).catch(function(e){host.textContent=e.message;return false});
}
root.MD_MISSION={open:open,eligible:eligible,close:function(){active=null;opening++}};
})(this);
