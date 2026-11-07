/* Library-only host adapter. UI gating does not replace authenticated storage rules. */
(function(root){
'use strict';
var active=null;
function allowed(u){return !!(u&&(u.adm===true||u.tester===true))}
function reviewer(u){return !!(root.MD_EDITORIAL&&root.MD_EDITORIAL.role(u))}
function uid(){var auth=root.firebase&&root.firebase.auth();return auth&&auth.currentUser?auth.currentUser.uid:''}
function close(){if(root.MD_VOCAB&&root.MD_VOCAB.unmount)root.MD_VOCAB.unmount();if(root.MD_MISSION&&root.MD_MISSION.close)root.MD_MISSION.close();if(root.MD_EDITORIAL)root.MD_EDITORIAL.close();if(active)active.host.textContent='';active=null}
function guard(user){if(active&&(!(allowed(user)||reviewer(user))||user.email!==active.email||(!active.demo&&active.uid!==uid())))close()}
function mount(host,opt){
 guard(opt.user);if(!(allowed(opt.user)||reviewer(opt.user))){host.textContent='Vocab Lab is coming soon.';return false}
 if(active&&active.host===host&&active.email===opt.user.email&&active.demo===!!opt.demo&&active.uid===(opt.demo?'demo':uid())){active.opt=opt;active.show();return true}
 close();var s={host:host,email:opt.user.email,uid:opt.demo?'demo':uid(),demo:!!opt.demo,opt:opt,view:allowed(opt.user)?'check':'review'},localMission=root.MD_MISSION.eligible(opt.user,opt.demo);active=s;host.className='vocab-shell';
 host.innerHTML='<button type="button" class="linkish vocab-library-back" data-vocab-library-back>Back to Learning Materials</button><p class="vocab-location" aria-live="polite"></p><div data-vocab-check class="vl"></div><div data-vocab-mission class="vm" hidden></div><section data-vocab-review hidden></section><section data-vocab-choices hidden><h3>Personalized Missions</h3>'+(localMission?'<p>Curated mission packs use your classified P1 senses; unpublished content is restricted to explicit admin/tester QA.</p>':'<p>Mission gameplay and save/sync are unavailable online.</p>')+'</section><details class="vocab-preview-bar"><summary>'+(s.demo?'Preview · this browser only':'Preview · account progress for Vocab Check')+'</summary><p>'+(s.demo?'Practice data · saved in this browser only. No account sync.':'Vocab Check uses your account. Mission gameplay and save/sync are unavailable online.')+'</p><p>Three candidate packs cover 15 target senses and await teacher review. Full 102-sense mission coverage is incomplete.</p></details>';
 var check=host.querySelector('[data-vocab-check]'),mission=host.querySelector('[data-vocab-mission]'),choices=host.querySelector('[data-vocab-choices]'),review=host.querySelector('[data-vocab-review]'),location=host.querySelector('.vocab-location'),viewKey='md-vocab-shell:'+s.email,wantMission=false;
 try{var saved=root.sessionStorage.getItem(viewKey);if(saved&&saved.charAt(0)==='{'){s.savedPlan=JSON.parse(saved).plan;wantMission=localMission&&!!s.savedPlan}else if(saved==='review'&&reviewer(opt.user))s.view='review';else if(allowed(opt.user)&&(saved==='missions'||saved==='mission'))s.view='missions'}catch(e){}
 function remember(){try{root.sessionStorage.setItem(viewKey,s.view==='mission'?JSON.stringify({view:s.view,plan:s.plan}):s.view)}catch(e){}}
 function current(){var u=s.opt.getUser?s.opt.getUser():s.opt.user;return active===s&&(allowed(u)||reviewer(u))&&u.email===s.email&&(s.demo||s.uid===uid())&&(!s.opt.isCurrent||s.opt.isCurrent())}
 s.show=function(){review.hidden=s.view!=='review';check.hidden=s.view!=='check';mission.hidden=s.view!=='mission';choices.hidden=s.view!=='missions';location.textContent='Library / Learning Materials / Vocab Lab / '+(s.view==='check'?'Vocab Check':s.view==='missions'?'Personalized Missions':s.view==='review'?'Teacher Review':'Mission review');if(s.opt.onView)s.opt.onView(s.view)};
 s.navigate=function(view){if(!current()||['check','missions','review'].indexOf(view)<0||(view==='review'?!reviewer(s.opt.user):!allowed(s.opt.user)))return;wantMission=false;s.view=view;remember();s.show();if(view==='missions'&&localMission)choose();if(view==='review')openReview()};
 function openReview(){if(!current()||!reviewer(s.opt.user))return;root.MD_EDITORIAL.mount(review,{user:s.opt.user,demo:s.demo,isCurrent:function(){return current()&&s.view==='review'}})}
 function choose(args){if(!current()||!localMission)return;s.latestArgs=args||s.latestArgs;if(!s.latestArgs)return;s.view='missions';remember();s.show();root.MD_MISSION_LIBRARY.mount(choices,{user:s.opt.user,demo:s.demo,bank:s.latestArgs.bank,progress:s.latestArgs.progress,isCurrent:current,onLaunch:openMission,onContinueSorting:function(){s.navigate('check');s.latestArgs.onContinueSorting()}})}
 function openMission(plan){if(!current()||!localMission)return;s.plan=plan;s.view='mission';remember();s.show();root.MD_MISSION.open(mission,{user:s.opt.user,demo:s.demo,planSnapshot:plan,bank:s.latestArgs.bank,isCurrent:function(){return current()&&s.view==='mission'},onContinueSorting:function(){s.navigate('check');s.latestArgs.onContinueSorting()}})}
 host.querySelector('[data-vocab-library-back]').addEventListener('click',function(){if(current()&&s.opt.onLibraryBack)s.opt.onLibraryBack()});

 if(allowed(opt.user))root.MD_VOCAB.mount(check,{user:opt.user,db:opt.db,demo:opt.demo,isCurrent:function(){return current()&&s.view==='check'},onFinish:function(){if(current()&&s.opt.onLibraryBack)s.opt.onLibraryBack()},onMission:function(args){choose(args)},onReady:function(args){s.latestArgs=args;if(wantMission){wantMission=false;openMission(s.savedPlan)}else if(s.view==='missions'&&localMission)choose()}});
 s.show();if(s.view==='review')openReview();return true;
}
root.MD_VOCAB_SHELL={allowed:allowed,reviewer:reviewer,mount:mount,guard:guard,close:close,navigate:function(view){if(active)active.navigate(view)}};
})(this);
