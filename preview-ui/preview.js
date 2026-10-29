(function(root){
'use strict';
var check=document.getElementById('checkHost'),mission=document.getElementById('missionHost'),view='library',libraryTab='cambridge',user,opening=0,returnToSorting=null;
function key(){return 'md-ui-preview-view:'+user.email}
function remember(){try{localStorage.setItem(key(),JSON.stringify({view:view,libraryTab:libraryTab,sample:false}))}catch(e){}}
function current(){return user&&['ui-tester-a@local.invalid','ui-tester-b@local.invalid'].indexOf(user.email)>=0}
function renderLibrary(){
 document.querySelectorAll('[data-library-tab]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.libraryTab===libraryTab))});document.getElementById('cambridgePane').hidden=libraryTab!=='cambridge';document.getElementById('materialsPane').hidden=libraryTab!=='lm';
}
function show(next){view=next;document.getElementById('libraryPane').hidden=next!=='library';document.getElementById('vocabPane').hidden=next==='library';check.hidden=next!=='check';mission.hidden=next!=='town';document.getElementById('missionChoices').hidden=next!=='missions';document.getElementById('location').textContent='Library / Learning Materials / Vocab Lab / '+({check:'Vocab Check',missions:'Personalized Missions',town:'Town on the Move'}[next]||'');renderLibrary();if(!sbWide()&&document.body.classList.contains('sb-open'))sbSet(false,true);remember()}
function runMission(next,args){
 var identity=user.email,request=++opening;show(next);
 return root.MD_MISSION.open(mission,{user:user,demo:true,missionId:'p1-town-on-the-move',bank:args&&args.bank,progress:args&&args.progress,sampleProfile:false,isCurrent:function(){return current()&&user.email===identity&&view===next},onContinueSorting:function(){if(user.email!==identity)return;show('check');if(args)args.onContinueSorting();else if(returnToSorting)returnToSorting()}}).then(function(){if(request!==opening)return});
}
function start(){
 opening++;returnToSorting=null;root.MD_MISSION.close();root.MD_VOCAB.unmount();check.innerHTML='';mission.innerHTML='';
 user={email:'ui-tester-'+document.getElementById('identity').value+'@local.invalid',name:'Fixture tester',role:'student',tester:true};
 var saved=null;try{saved=JSON.parse(localStorage.getItem(key())||'null')}catch(e){}
 libraryTab=saved&&saved.libraryTab==='lm'?'lm':'cambridge';view='library';show(saved&&['check','missions','town'].indexOf(saved.view)>=0?saved.view:'library');var identity=user.email;
 root.MD_VOCAB.mount(check,{user:user,demo:true,isCurrent:function(){return user.email===identity&&view==='check'},onFinish:function(){libraryTab='lm';show('library')},onMission:function(args){runMission('town',args)},onReady:function(args){returnToSorting=args.onContinueSorting;if(saved&&['town','missions'].indexOf(saved.view)>=0)runMission('town')}});
}
var LM_ICO={writing:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',listening:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>',
  reading:'<path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2z"/><path d="M22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z"/>',speaking:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 01-14 0M12 17v5"/>'};
function icon(id){return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+LM_ICO[id]+'</svg>'}
var chevron='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
document.getElementById('materialsPane').innerHTML=['Writing','Listening','Reading','Speaking'].map(function(name){return '<section class="lmmod lm-'+name.toLowerCase()+' dis"><button type="button" class="lmhd" disabled><span class="lmic">'+icon(name.toLowerCase())+'</span><span class="lmnm">'+name+'</span><span class="lmsoon">Coming Soon</span></button></section>'}).join('')+'<section class="lmmod lm-vocabulary"><button type="button" id="vocabToggle" class="lmhd" aria-expanded="false" aria-controls="vocabDestinations"><span class="lmic">'+icon('reading')+'</span><span class="lmnm">Vocabulary</span><span class="lmchev" aria-hidden="true">'+chevron+'</span></button><div id="vocabDestinations" class="lmtw" hidden><button type="button" class="lmu" data-open="check">Vocab Check<span class="lmarr">→</span></button><button type="button" class="lmu" data-open="missions">Personalized Missions<span class="lmarr">→</span></button></div></section>';
document.getElementById('vocabToggle').addEventListener('click',function(){var open=this.getAttribute('aria-expanded')!=='true';this.setAttribute('aria-expanded',String(open));document.getElementById('vocabDestinations').hidden=!open});
document.querySelector('[data-view="library"]').addEventListener('click',function(){opening++;show('library')});
document.querySelectorAll('[data-library-tab]').forEach(function(b){b.addEventListener('click',function(){libraryTab=b.dataset.libraryTab;show('library')})});
document.querySelectorAll('[data-open]').forEach(function(b){b.addEventListener('click',function(){var next=b.dataset.open;libraryTab='lm';if(next==='missions')runMission('town');else{opening++;show(next)}})});
document.getElementById('libraryBack').addEventListener('click',function(){libraryTab='lm';show('library')});
document.getElementById('identity').addEventListener('change',function(){try{localStorage.setItem('md-ui-preview-identity',this.value)}catch(e){}start()});
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
