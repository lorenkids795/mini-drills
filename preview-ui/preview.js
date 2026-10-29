(function(root){
'use strict';
var check=document.getElementById('checkHost'),mission=document.getElementById('missionHost'),view='check',user,opening=0,returnToSorting=null;
function key(){return 'md-ui-preview-view:'+user.email}
function remember(){try{localStorage.setItem(key(),JSON.stringify({view:view,sample:document.getElementById('sample').checked}))}catch(e){}}
function current(){return user&&['ui-tester-a@local.invalid','ui-tester-b@local.invalid'].indexOf(user.email)>=0}
function show(next){view=next;check.hidden=next!=='check';mission.hidden=next==='check';document.getElementById('location').textContent='Vocab Lab / '+({check:'Vocab Check',coast:'Save the Coast',town:'Town on the Move'}[next]);document.querySelectorAll('[data-view]').forEach(function(b){var selected=b.dataset.view===next;b.setAttribute('aria-selected',String(selected));if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});if(!sbWide()&&document.body.classList.contains('sb-open'))sbSet(false,true);remember()}
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
document.getElementById('themeBtn').addEventListener('click',function(){setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')});
function sbWide(){return matchMedia('(min-width:1024px)').matches}
function sbSet(open,focus,save){
 var wide=sbWide(),lock=open&&!wide,b=document.body;b.classList.toggle('sb-wide',wide);b.classList.toggle('sb-open',open);b.classList.toggle('sb-lock',lock);document.documentElement.classList.toggle('sb-lock',lock);document.getElementById('sbBg').hidden=!lock;document.getElementById('sbBtn').setAttribute('aria-expanded',String(open));document.getElementById('mainContent').inert=lock;
 var side=document.getElementById('sideNav');side.inert=!open;if(lock){side.setAttribute('role','dialog');side.setAttribute('aria-modal','true')}else{side.removeAttribute('role');side.removeAttribute('aria-modal')}
 if(save&&wide){try{localStorage.setItem('md-ui-preview-sidebar',open?'1':'0')}catch(e){}}
 if(focus)(lock?document.querySelector('#tabs button'):document.getElementById('sbBtn')).focus({preventScroll:true});
}
function sbInit(){var open=true;try{open=localStorage.getItem('md-ui-preview-sidebar')!=='0'}catch(e){}sbSet(sbWide()&&open,false)}
document.getElementById('sbBtn').addEventListener('click',function(){sbSet(!document.body.classList.contains('sb-open'),true,true)});
['sbClose','sbBg'].forEach(function(id){document.getElementById(id).addEventListener('click',function(){sbSet(false,true,true)})});
document.addEventListener('keydown',function(e){if(!sbWide()&&document.body.classList.contains('sb-open')){if(e.key==='Escape'){e.preventDefault();sbSet(false,true)}else if(e.key==='Tab'){var items=Array.from(document.querySelectorAll('#sideNav button')),first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}});
matchMedia('(min-width:1024px)').addEventListener('change',sbInit);
function setTheme(theme){document.documentElement.dataset.theme=theme;document.getElementById('themeBtn').innerHTML='<span class="lt">'+(theme==='dark'?'Light mode':'Dark mode')+'</span><span class="ic" aria-hidden="true">'+(theme==='dark'?'☀':'☾')+'</span>';try{localStorage.setItem('md-ui-preview-theme',theme)}catch(e){}}

var theme='light';try{if(localStorage.getItem('md-ui-preview-identity')==='b')document.getElementById('identity').value='b';theme=localStorage.getItem('md-ui-preview-theme')||'light'}catch(e){}setTheme(theme==='dark'?'dark':'light');sbInit();start();
})(this);
