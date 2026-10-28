/* Real app-shell adapter. Preview UI gating is not a substitute for Firebase rules. */
(function(root){
'use strict';
var active=null;
function allowed(u){return !!(u&&(u.adm===true||u.tester===true))}
function uid(){var auth=root.firebase&&root.firebase.auth();return auth&&auth.currentUser?auth.currentUser.uid:''}
function close(){if(root.MD_VOCAB&&root.MD_VOCAB.unmount)root.MD_VOCAB.unmount();if(root.MD_MISSION&&root.MD_MISSION.close)root.MD_MISSION.close();if(active)active.host.textContent='';active=null}
function guard(user){if(active&&(!allowed(user)||user.email!==active.email||(!active.demo&&active.uid!==uid())))close()}
function mount(host,opt){
 guard(opt.user);
 if(!allowed(opt.user)){host.textContent='Vocab Lab is coming soon.';return false}
 if(active&&active.host===host&&active.email===opt.user.email&&active.demo===!!opt.demo&&active.uid===(opt.demo?'demo':uid())){active.opt=opt;active.show();return true}
 close();
 var s={host:host,email:opt.user.email,uid:opt.demo?'demo':uid(),demo:!!opt.demo,opt:opt,view:'check'},localMission=root.MD_MISSION.eligible(opt.user,opt.demo);active=s;
 host.className='vocab-shell';
 host.innerHTML='<header class="vocab-preview-bar"><div><strong>Vocab Lab</strong> <span>Admin/tester preview</span></div><p>'+(s.demo?'Practice data · saved in this browser only. No account sync.':'Vocab Check uses your account. Mission gameplay and save/sync are unavailable online.')+'</p><details><summary>About this preview</summary><p>Town on the Move is an original fictional story using approved P1 senses. Local mission progress is separate from your Check, XP and Writing. Save the Coast remains a separate authored QA demo. Content and all Morph/Final screens await final teacher review.</p></details></header><p class="vocab-location" aria-live="polite">Vocab Check</p><div data-vocab-check class="vl"></div><div data-vocab-mission class="vm" hidden></div>';
 var check=host.querySelector('[data-vocab-check]'),mission=host.querySelector('[data-vocab-mission]'),location=host.querySelector('.vocab-location');
 var viewKey='md-vocab-shell:'+s.email,wantMission=false;try{wantMission=localMission&&root.sessionStorage.getItem(viewKey)==='mission'}catch(e){}
 function remember(view){try{root.sessionStorage.setItem(viewKey,view)}catch(e){}}
 function current(){var u=s.opt.getUser?s.opt.getUser():s.opt.user;return active===s&&allowed(u)&&u.email===s.email&&(s.demo||s.uid===uid())&&(!s.opt.isCurrent||s.opt.isCurrent())}
 s.show=function(){check.hidden=s.view!=='check';mission.hidden=s.view!=='mission';location.textContent=s.view==='mission'?'Vocab Lab / Town on the Move':'Vocab Lab / Vocab Check'};
 function openMission(args){
  if(!current()||!localMission)return;
  s.view='mission';remember('mission');s.show();
  root.MD_MISSION.open(mission,{user:s.opt.user,demo:s.demo,bank:args.bank,progress:args.progress,isCurrent:current,onContinueSorting:function(){if(!current())return;s.view='check';remember('check');s.show();args.onContinueSorting()}});
 }
 root.MD_VOCAB.mount(check,{user:opt.user,db:opt.db,demo:opt.demo,isCurrent:current,onMission:openMission,onReady:function(args){if(wantMission){wantMission=false;openMission(args)}}});
 s.show();return true;
}
root.MD_VOCAB_SHELL={allowed:allowed,mount:mount,guard:guard,close:close};
})(this);
