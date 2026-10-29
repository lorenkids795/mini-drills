/* Library-only host adapter. UI gating does not replace authenticated storage rules. */
(function(root){
'use strict';
var active=null;
function allowed(u){return !!(u&&(u.adm===true||u.tester===true))}
function uid(){var auth=root.firebase&&root.firebase.auth();return auth&&auth.currentUser?auth.currentUser.uid:''}
function close(){if(root.MD_VOCAB&&root.MD_VOCAB.unmount)root.MD_VOCAB.unmount();if(root.MD_MISSION&&root.MD_MISSION.close)root.MD_MISSION.close();if(active)active.host.textContent='';active=null}
function guard(user){if(active&&(!allowed(user)||user.email!==active.email||(!active.demo&&active.uid!==uid())))close()}
function mount(host,opt){
 guard(opt.user);if(!allowed(opt.user)){host.textContent='Vocab Lab is coming soon.';return false}
 if(active&&active.host===host&&active.email===opt.user.email&&active.demo===!!opt.demo&&active.uid===(opt.demo?'demo':uid())){active.opt=opt;active.show();return true}
 close();var s={host:host,email:opt.user.email,uid:opt.demo?'demo':uid(),demo:!!opt.demo,opt:opt,view:'check'},localMission=root.MD_MISSION.eligible(opt.user,opt.demo);active=s;host.className='vocab-shell';
 host.innerHTML='<button type="button" class="linkish vocab-library-back" data-vocab-library-back>Back to Learning Materials</button><p class="vocab-location" aria-live="polite"></p><div data-vocab-check class="vl"></div><div data-vocab-mission class="vm" hidden></div><section data-vocab-choices hidden><h3>Personalized Missions</h3>'+(localMission?'<p>This prototype covers five approved P1 senses already classified in Vocab Check. No mission is available for other words yet. Continue sorting to build your vocabulary.</p>':'<p>Mission gameplay and save/sync are unavailable online.</p>')+'</section><details class="vocab-preview-bar"><summary>'+(s.demo?'Preview · this browser only':'Preview · account progress for Vocab Check')+'</summary><p>'+(s.demo?'Practice data · saved in this browser only. No account sync.':'Vocab Check uses your account. Mission gameplay and save/sync are unavailable online.')+'</p><p>Town on the Move is a fixed prototype scenario linked to five approved P1 senses, not a mission engine covering all 102 terms. Content and all Morph/Final screens await final teacher review.</p></details>';
 var check=host.querySelector('[data-vocab-check]'),mission=host.querySelector('[data-vocab-mission]'),choices=host.querySelector('[data-vocab-choices]'),location=host.querySelector('.vocab-location'),viewKey='md-vocab-shell:'+s.email,wantMission=false;
 try{var saved=root.sessionStorage.getItem(viewKey);wantMission=localMission&&saved==='mission';if(saved==='missions')s.view='missions'}catch(e){}
 function remember(){try{root.sessionStorage.setItem(viewKey,s.view)}catch(e){}}
 function current(){var u=s.opt.getUser?s.opt.getUser():s.opt.user;return active===s&&allowed(u)&&u.email===s.email&&(s.demo||s.uid===uid())&&(!s.opt.isCurrent||s.opt.isCurrent())}
 s.show=function(){check.hidden=s.view!=='check';mission.hidden=s.view!=='mission';choices.hidden=s.view!=='missions';location.textContent='Library / Learning Materials / Vocab Lab / '+(s.view==='check'?'Vocab Check':s.view==='missions'?'Personalized Missions':'Town on the Move');if(s.opt.onView)s.opt.onView(s.view)};
 s.navigate=function(view){if(!current()||['check','missions'].indexOf(view)<0)return;wantMission=false;s.view=view;remember();s.show();if(view==='missions'&&localMission)openMission()};
 function openMission(args){
  if(!current()||!localMission)return;s.view='mission';remember();s.show();
  root.MD_MISSION.open(mission,{user:s.opt.user,demo:s.demo,missionId:'p1-town-on-the-move',bank:args&&args.bank||s.latestArgs&&s.latestArgs.bank,progress:args&&args.progress,isCurrent:function(){return current()&&s.view==='mission'},onContinueSorting:function(){if(!current())return;s.navigate('check');var a=args||s.latestArgs;if(a)a.onContinueSorting()}});
 }
 host.querySelector('[data-vocab-library-back]').addEventListener('click',function(){if(current()&&s.opt.onLibraryBack)s.opt.onLibraryBack()});

 root.MD_VOCAB.mount(check,{user:opt.user,db:opt.db,demo:opt.demo,isCurrent:function(){return current()&&s.view==='check'},onMission:function(args){openMission(args)},onReady:function(args){s.latestArgs=args;if(wantMission||s.view==='missions'&&localMission){wantMission=false;openMission()}}});
 s.show();return true;
}
root.MD_VOCAB_SHELL={allowed:allowed,mount:mount,guard:guard,close:close,navigate:function(view){if(active)active.navigate(view)}};
})(this);
