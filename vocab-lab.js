/* Mini Drills Vocab Lab: isolated preview UI. No changes to dictionary, XP, or LM. */
(function(root){
'use strict';
var C=root.MD_VOCAB_CORE,session=null,loaded=null;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
function highlight(text,target){
  text=String(text==null?'':text);target=String(target||'').trim();
  if(!target||/[()[\]{}|]/.test(target))return {html:esc(text),matches:0};
  var re=new RegExp(target.split(/\s+/).map(function(x){return x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}).join('\\s+'),'gi'),m,last=0,html='',count=0;
  function word(c){return /[A-Za-z0-9_\u00c0-\u024f\u1e00-\u1eff]/.test(c)}
  while((m=re.exec(text))){if(word(text.charAt(m.index-1))||word(text.charAt(m.index+m[0].length)))continue;html+=esc(text.slice(last,m.index))+'<mark class="vl-target">'+esc(m[0])+'</mark>';last=m.index+m[0].length;count++}
  return {html:html+esc(text.slice(last)),matches:count};
}
function icon(name){var paths={know:'<path d="m5 12 4 4L19 6"/>',unsure:'<path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/><circle cx="12" cy="12" r="10"/>',new:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z"/>',undo:'<path d="M9 4 4 9l5 5M4 9h9a6 6 0 0 1 0 12"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',done:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',hint:'<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 2H9z"/>'};return '<svg class="vl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[name]||paths.done)+'</svg>'}
function button(action,label,disabled,primary,extra,ico){return '<button type="button" class="btn vl-btn'+(primary?' pri':'')+'" data-vl="'+action+'"'+(disabled?' disabled':'')+(extra||'')+'>'+(ico?icon(ico):'')+'<span>'+esc(label)+'</span></button>'}
function data(){
  if(!loaded)loaded=Promise.all(['data/vocab-lab-p1.json','data/vocab-lab-practice.json','data/vocab-lab-practice-v1.json'].map(function(url){return fetch(url).then(function(r){if(!r.ok)throw Error('Cannot load vocabulary data.');return r.json()})})).catch(function(e){loaded=null;throw e});
  return loaded;
}
function mount(host,opt){
  if(!host)return;
  if(!C.allowed(opt.user,opt.enabled)){host.innerHTML='<p class="banner">Vocab Lab is coming soon.</p>';return}
  if(session&&session.email===opt.user.email&&session.demo===!!opt.demo){session.host=host;session.draw();return}
  if(session&&session.stop)session.stop();
  var s={host:host,email:opt.user.email,demo:!!opt.demo,state:null,pending:null,busy:false,ready:false,message:'Loading lesson…',stop:null,transition:false,previousWord:null},key='md-vocab-lab:v1:'+encodeURIComponent(s.email)+':cam17-t1-reading-p1';session=s;
  function local(value){try{if(value)root.localStorage.setItem(key,JSON.stringify(value));else root.localStorage.removeItem(key);return true}catch(e){s.message='Device storage is unavailable. Enable storage before sorting.';return false}}
  function cache(){return local({state:s.state,pending:s.pending})}
  // Pin already-attempted questions to their original content when resuming a batch.
  function practiceFor(state){
    var p=Object.assign({},s.currentPractice);
    state.attempts.forEach(function(a){if(a.batchId===state.batch.id&&s.legacyPractice[a.senseId]&&a.taskId===s.legacyPractice[a.senseId].id)p[a.senseId]=Object.assign({},s.legacyPractice[a.senseId],{clue:s.currentPractice[a.senseId].clue,explanation:s.currentPractice[a.senseId].explanation})});
    return p;
  }
  function draw(focus){
    if(session!==s)return;
    focus=focus||s.host.contains(document.activeElement);
    var h='<header class="vl-head"><div class="vl-title"><h2 id="vlTitle">Vocab Check</h2><span class="vl-passage">Cambridge 17 · Test 1<br>Reading Passage 1</span></div></header>';
    function utility(){return '<footer class="vl-utility"><p class="vl-sync" role="status" aria-live="polite">'+esc(s.message)+'</p>'+(s.pending&&!s.busy?button('sync','Retry sync',false,true):'')+'</footer>'}
    if(!s.state||!s.ready){s.host.innerHTML=h+utility();return}
    s.practice=practiceFor(s.state);
    var state=s.state,b=state.batch,locked=s.busy||!!s.pending,id=C.current(state),q,r,sorted=Object.keys(state.termProgress).length,bins={know:0,unsure:0,new:0},verified=0,needs=0,untested=0;
    b.ids.forEach(function(k){var p=state.termProgress[k];if(p){bins[p.classification]++;if(p.classification==='know'){if(b.results[k]&&b.results[k].done){if(b.results[k].status==='verified_for_current_task')verified++;else needs++}else untested++}}});
    function binStats(){return '<div class="vl-counts" aria-label="Batch sorting counts">'+[['know','Know It'],['unsure','Not Sure'],['new','New to Me']].map(function(x){return '<span class="vl-count vl-'+x[0]+'">'+icon(x[0])+'<span>'+x[1]+'</span><b>'+bins[x[0]]+'</b></span>'}).join('')+'</div>'}
    h+='<div class="vl-progress"><span>'+(b.phase==='sort'?'Word '+(b.history.length+1)+' of '+b.ids.length:'Batch '+state.batchNumber)+'</span><span><b>'+sorted+'</b> / 102 sorted</span><progress max="102" value="'+sorted+'" aria-label="Words classified in this lesson"></progress></div>';
    h+='<section class="vl-main vl-phase-'+b.phase+'" aria-labelledby="vlStep"><div class="vl-stepbar"><h3 id="vlStep" tabindex="-1">'+({sort:'Word sorting',ready:'Batch sorted',check:'Reality Check',results:'Batch complete'}[b.phase])+'</h3>'+(b.phase==='check'?'<span class="vl-check-progress">Check '+(b.checkAt+1)+' of '+b.checks.length+'</span>':'')+'</div>';
    if(b.phase==='sort'){
      h+='<p class="vl-instruction">How well do you know this word?</p><div class="vl-word'+(s.transition?' vl-card-transition':'')+'">'+(s.previousWord?'<div class="vl-leaving" aria-hidden="true">'+esc(s.previousWord)+'</div>':'')+'<h4>'+esc(s.terms[id].surface)+'</h4><span class="vl-card-caption">Choose before seeing the meaning</span></div>';
      h+='<div class="vl-bins" aria-label="Classify this word">'+[['know','Know It','1'],['unsure','Not Sure','2'],['new','New to Me','3']].map(function(x){return button(x[0],x[1],locked||s.transition,false,' aria-keyshortcuts="'+x[2]+'"'+(s.transition&&s.lastBin===x[0]?' data-selected="true"':''),x[0]).replace('</button>','<kbd>'+x[2]+'</kbd></button>')}).join('')+'</div>';
      h+='<div class="vl-sort-tools">'+button('undo','Undo',locked||!b.history.length,false,' aria-keyshortcuts="U"','undo')+'<span class="vl-key-help">Keys 1 / 2 / 3 · U to undo</span></div>'+binStats();
    }else if(b.phase==='ready'){
      h+='<div class="vl-complete-mark">'+icon('done')+'</div><p class="vl-lead">'+b.ids.length+' words sorted. Nice work.</p>'+binStats();
      h+='<p class="vl-support">'+(bins.know?'Let’s try a few of your Know It words in context.':'No Know It words this time. We’ll skip the check.')+'</p><div class="vl-ready-actions">'+button('startCheck',bins.know?'Start Reality Check':'View my results',locked,true,'',bins.know?'arrow':'done')+button('undo','Undo last choice',locked||!b.history.length,false,' aria-keyshortcuts="U"','undo')+'</div>';
    }else if(b.phase==='check'){
      id=b.checks[b.checkAt];q=s.practice[id];r=b.results[id]||{tries:0,hinted:false,wrong:[],done:false};
      var marked=highlight(q.context,s.terms[id].surface);
      h+='<div class="vl-context-panel"><blockquote class="vl-context" aria-label="Context sentence">'+marked.html+'</blockquote></div><p class="vl-question">'+(marked.matches?esc(q.prompt):'Which meaning of “'+esc(s.terms[id].surface)+'” fits this context?')+'</p><div class="vl-options">';
      q.options.forEach(function(option,i){var wrong=r.wrong.indexOf(i)>=0;h+=button('answer',option,locked||r.done||wrong,false,' data-choice="'+i+'"'+(wrong?' data-result="wrong"':'')).replace('<span>','<span class="vl-choice-letter" aria-hidden="true">'+String.fromCharCode(65+i)+'</span><span>').replace('</button>',(wrong?'<span class="vl-option-note">Try again</span>':'')+'</button>')});h+='</div>';
      if(r.done){var more=b.checkAt+1<b.checks.length||((verified+needs)>=2&&needs/(verified+needs)>=0.5&&b.checks.length<5&&bins.know>b.checks.length);h+='<div class="vl-feedback '+(r.status==='verified_for_current_task'?'vl-feedback-good':'')+'" role="status"><strong>'+icon(r.status==='verified_for_current_task'?'know':'hint')+(r.status==='verified_for_current_task'?'Correct in this context':'Needs practice')+'</strong><p>'+esc(q.explanation)+'</p>'+(r.status!=='verified_for_current_task'?'<small>A useful practice step. We’ll keep this word on your practice list.</small>':'')+'</div>'+button('next',more?'Next check':'See my results',locked,true,'','arrow')}
      else{
        if(r.tries||r.hinted)h+='<div class="vl-feedback" role="status"><strong>'+icon('hint')+(r.tries?'Not quite — try again':'A small clue')+'</strong><p>'+esc(q.clue)+'</p></div>';
        h+='<div class="vl-check-tools">'+button('hint','Get a clue',locked||r.hinted,false,'','hint')+'<details class="vl-reveal"><summary>Stuck?</summary><p>Seeing the explanation marks this word for practice.</p>'+button('reveal','Show explanation',locked)+'</details></div>';
      }
    }else{
      h+='<div class="vl-complete-mark">'+icon('done')+'</div><p class="vl-lead">A little clearer, one batch at a time.</p>'+binStats()+'<div class="vl-check-summary"><h4>Your context check</h4><dl class="vl-stats">';
      [['Verified here',verified],['Needs practice',needs],['Not checked yet',untested]].forEach(function(x){h+='<div><dt>'+x[0]+'</dt><dd>'+x[1]+'</dd></div>'});h+='</dl></div>';
      if(root.MD_MISSION&&root.MD_MISSION.eligible(opt.user,opt.demo))h+=button('mission','Start a local mission',locked,false,'','arrow');
      if(sorted<102)h+=button('nextBatch','Continue: Next '+Math.min(12,102-sorted)+' Words',locked,true,'','arrow');else h+='<p class="vl-support">All 102 words sorted. A great starting point for practice.</p>';
      h+='<p class="vl-quiet">Know It is your own estimate. One context check is a starting point, not mastery.</p><details class="vl-learning-note"><summary>What do these results mean?</summary><p>Verified here means correct first try, without a clue. Retries, clues and revealed answers stay on your practice list. Know It words we haven’t checked are still your own estimate. Other word forms need their own practice.</p></details>';
      h+='<details class="vl-revise"><summary>Revise a classification</summary><p>This starts a fresh check for the selected word. Earlier attempts stay in your history.</p><label for="vlRevise">Choose a sorted word</label><select id="vlRevise">';
      s.bank.lesson_term_links.forEach(function(l){if(state.termProgress[l.senseId])h+='<option value="'+esc(l.senseId)+'">'+esc(s.terms[l.senseId].surface)+'</option>'});
      h+='</select>'+button('revise','Reclassify selected word',locked||!sorted)+'</details>';
    }
    h+='</section>'+utility();
    s.host.innerHTML=h;
    if(focus){var target=s.host.querySelector('.vl-word h4')||s.host.querySelector('#vlStep');if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}}
    if(focus&&b.phase==='check'&&(r.tries||r.hinted||r.done)){var feedback=s.host.querySelector('.vl-feedback');if(feedback)feedback.scrollIntoView({block:'nearest',behavior:'auto'})}
  }

  s.draw=draw;
  function sync(){
    if(!s.pending||s.busy||!s.store)return;
    var pending=s.pending;s.busy=true;s.message='Saving…';draw();
    s.store.save(pending.before,pending.after,pending.op).then(function(remote){
      if(!s.state||s.state.revision<=remote.revision)s.state=remote;
      s.pending=null;s.message='Saved to your account.';cache();
    },function(e){
      if(e.code==='vocab-conflict'){
        s.state=e.remote||C.fresh(s.email,s.bank);if(!s.state.batch)C.begin(s.state,s.bank);
        s.pending=null;s.message=e.message;cache();
      }else{s.message='Not synced. Your draft is safe on this device. Check your connection, then retry.';cache()}
    }).then(function(){s.busy=false;draw()});
  }
  function act(type,choice){
    if(type==='sync'){sync();return}
    if(!s.ready||s.busy||s.pending)return;
    if(type==='mission'&&root.MD_MISSION&&root.MD_MISSION.eligible(opt.user,opt.demo)){
      root.MD_MISSION.open(s.host,{user:opt.user,demo:true,bank:s.bank,progress:C.copy(s.state),onContinueSorting:function(){if(s.state.batch.phase==='results'&&Object.keys(s.state.termProgress).length<s.bank.lesson_term_links.length)act('nextBatch');else draw(true)}});return;
    }
    var sorting=['know','unsure','new'].indexOf(type)>=0;
    if(sorting&&s.transition)return;
    var op={type:type,id:'op-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)},before=s.state,after;
    if(['know','unsure','new'].indexOf(type)>=0){op.type='sort';op.bin=type}
    if(type==='answer')op.choice=choice;
    if(type==='revise')op.senseId=s.host.querySelector('#vlRevise').value;
    try{after=C.apply(before,op,s.bank,s.practice)}catch(e){s.message=e.message;draw();return}
    clearTimeout(s.motionTimer);s.previousWord=null;s.transition=false;
    if(sorting&&after.batch.phase==='sort'){
      s.previousWord=s.terms[C.current(before)].surface;s.lastBin=op.bin;s.transition=true;
      s.motionTimer=setTimeout(function(){s.transition=false;s.previousWord=null;if(session===s)draw()},180);
    }
    var oldPending=s.pending;s.pending=s.demo?null:{before:before,after:after,op:op};s.state=after;
    if(!cache()){s.state=before;s.pending=oldPending;draw();return}
    s.message=s.demo?'Saved':'Saving…';draw(true);
    if(!s.demo)sync();
  }
  host.onclick=null;
  // One delegated listener per host, reading the current session only.
  if(!host._vocabEvents){
    host.addEventListener('click',function(e){var t=e.target.closest('[data-vl]');if(t&&session&&session.host===host){var action=t.getAttribute('data-vl');if(e.detail>1&&['know','unsure','new'].indexOf(action)>=0)return;session.act(action,Number(t.getAttribute('data-choice')))}});
    host.addEventListener('keydown',function(e){if(!session||session.host!==host||e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;var a={'1':'know','2':'unsure','3':'new',u:'undo',U:'undo'}[e.key];if(a&&session.state&&['sort','ready'].indexOf(session.state.batch.phase)>=0){e.preventDefault();session.act(a)}});
    host._vocabEvents=true;
  }
  s.act=act;draw();
  data().then(function(values){
    if(session!==s)return;
    s.bank=values[0];s.currentPractice={};s.legacyPractice={};s.practice={};s.links={};s.terms={};var byTerm={};
    s.bank.terms.forEach(function(t){byTerm[t.id]=t});
    s.bank.lesson_term_links.forEach(function(l){s.links[l.senseId]=l;s.terms[l.senseId]=byTerm[l.termId]});
    values[1].forEach(function(p){s.currentPractice[p.senseId]=p});
    values[2].forEach(function(p){s.legacyPractice[p.senseId]=p});
    var saved=null;try{saved=JSON.parse(root.localStorage.getItem(key)||'null')}catch(e){}
    if(saved&&saved.state&&saved.state.schemaVersion===1&&saved.state.email===s.email&&saved.state.lessonId===s.bank.lessonId){s.state=saved.state;s.pending=saved.pending||null}
    else s.state=C.begin(C.fresh(s.email,s.bank),s.bank);
    if(s.demo){s.pending=null;s.ready=true;s.message='Saved';draw();return}
    return Promise.resolve(opt.db||(root.claude&&root.claude.use('db'))).then(function(db){
      if(session!==s)return;
      if(!db)throw Error('Sign in again to load your account progress.');
      var authUser=root.firebase&&root.firebase.auth().currentUser;
      if(!authUser)throw Error('Your session ended. Please sign in again.');
      s.store=root.MD_VOCAB_STORE(db,s.email,s.bank.lessonId,authUser.uid);
      s.stop=s.store.watch(function(remote){
        if(session!==s)return;
        if(s.pending){
          if(remote&&remote.lastOperation===s.pending.op.id){s.state=remote;s.pending=null;s.message='Saved to your account.'}
          else if((remote?remote.revision:0)!==s.pending.before.revision){s.state=remote||C.begin(C.fresh(s.email,s.bank),s.bank);s.pending=null;s.message='Another session updated this lesson. Latest progress loaded; retry your last action.'}
          else{s.message='Unsynced draft restored. Retry sync to continue.'}
        }else{s.state=remote||C.begin(C.fresh(s.email,s.bank),s.bank);s.message=remote?'Saved to your account.':'Account connected. Your choices save automatically.'}
        s.ready=true;cache();draw();
      },function(){s.ready=false;s.message='Could not load your progress. Check your connection, then reload or ask your teacher for help.';draw()});
    });
  }).catch(function(e){s.message=e.message;draw()});
}
root.MD_VOCAB={allowed:C.allowed,mount:mount,highlight:highlight};
})(this);
