(function(root){
'use strict';
var check=document.getElementById('checkHost'),mission=document.getElementById('missionHost'),view='check',user,opening=0,returnToSorting=null;
function key(){return 'md-ui-preview-view:'+user.email}
function remember(){try{localStorage.setItem(key(),JSON.stringify({view:view,sample:document.getElementById('sample').checked}))}catch(e){}}
function current(){return user&&['ui-tester-a@local.invalid','ui-tester-b@local.invalid'].indexOf(user.email)>=0}
function show(next){view=next;check.hidden=next!=='check';mission.hidden=next==='check';document.getElementById('location').textContent='Vocab Lab / '+({check:'Vocab Check',coast:'Save the Coast',town:'Town on the Move'}[next]);document.querySelectorAll('[data-view]').forEach(function(b){if(b.dataset.view===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});document.body.classList.remove('menu-open');document.getElementById('menu').setAttribute('aria-expanded','false');remember()}
function runMission(next,args){
 var identity=user.email,request=++opening;show(next);
 return root.MD_MISSION.open(mission,{user:user,demo:true,missionId:next==='coast'?'authored-save-the-coast':'p1-town-on-the-move',bank:args&&args.bank,progress:args&&args.progress,sampleProfile:next==='town'&&!args&&document.getElementById('sample').checked,isCurrent:function(){return current()&&user.email===identity&&view!=='check'},onContinueSorting:function(){if(user.email!==identity)return;show('check');if(args)args.onContinueSorting();else if(returnToSorting)returnToSorting()}}).then(function(){if(request!==opening)return});
}
function start(){
 opening++;returnToSorting=null;root.MD_MISSION.close();root.MD_VOCAB.unmount();check.innerHTML='';mission.innerHTML='';
 user={email:'ui-tester-'+document.getElementById('identity').value+'@local.invalid',name:'Fixture tester',role:'student',tester:true};
 var saved=null;try{saved=JSON.parse(localStorage.getItem(key())||'null')}catch(e){}
 view='check';document.getElementById('sample').checked=!!(saved&&saved.sample);show('check');var identity=user.email;
 root.MD_VOCAB.mount(check,{user:user,demo:true,isCurrent:function(){return user.email===identity&&view==='check'},onMission:function(args){runMission('town',args)},onReady:function(args){returnToSorting=args.onContinueSorting;if(saved&&saved.view!=='check')runMission(saved.view==='coast'?'coast':'town')}});
}
document.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){if(b.dataset.view==='check'){opening++;show('check')}else runMission(b.dataset.view)})});
document.getElementById('identity').addEventListener('change',function(){try{localStorage.setItem('md-ui-preview-identity',this.value)}catch(e){}start()});
document.getElementById('sample').addEventListener('change',function(){remember();if(view==='town')runMission('town')});
document.getElementById('theme').addEventListener('click',function(){setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')});
document.getElementById('menu').addEventListener('click',function(){var open=document.body.classList.toggle('menu-open');this.setAttribute('aria-expanded',String(open))});
function setTheme(theme){document.documentElement.dataset.theme=theme;document.getElementById('theme').textContent=theme==='dark'?'Light mode':'Dark mode';try{localStorage.setItem('md-ui-preview-theme',theme)}catch(e){}}
var theme='light';try{if(localStorage.getItem('md-ui-preview-identity')==='b')document.getElementById('identity').value='b';theme=localStorage.getItem('md-ui-preview-theme')||'light'}catch(e){}setTheme(theme==='dark'?'dark':'light');start();
})(this);
