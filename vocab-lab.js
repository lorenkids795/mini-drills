/* Mini Drills Vocab Lab: isolated preview UI. No changes to dictionary, XP, or LM. */
(function(root){
'use strict';
var C=root.MD_VOCAB_CORE,session=null,loaded=null;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
function button(action,label,disabled,primary,extra){return '<button type="button" class="btn'+(primary?' pri':'')+'" data-vl="'+action+'"'+(disabled?' disabled':'')+(extra||'')+'>'+esc(label)+'</button>'}
function data(){
  if(!loaded)loaded=Promise.all(['data/vocab-lab-p1.json','data/vocab-lab-practice.json'].map(function(url){return fetch(url).then(function(r){if(!r.ok)throw Error('Cannot load vocabulary data.');return r.json()})})).catch(function(e){loaded=null;throw e});
  return loaded;
}
function mount(host,opt){
  if(!host)return;
  if(!C.allowed(opt.user,opt.enabled)){host.innerHTML='<p class="banner">Vocab Lab is coming soon.</p>';return}
  if(session&&session.email===opt.user.email&&session.demo===!!opt.demo){session.host=host;session.draw();return}
  if(session&&session.stop)session.stop();
  var s={host:host,email:opt.user.email,demo:!!opt.demo,state:null,pending:null,busy:false,ready:false,message:'Loading lesson…',stop:null},key='md-vocab-lab:v1:'+encodeURIComponent(s.email)+':cam17-t1-reading-p1';session=s;
  function local(value){try{if(value)root.localStorage.setItem(key,JSON.stringify(value));else root.localStorage.removeItem(key);return true}catch(e){s.message='Device storage is unavailable. Enable storage before sorting.';return false}}
  function cache(){return local({state:s.state,pending:s.pending})}
  function draw(focus){
    if(session!==s)return;
    focus=focus||s.host.contains(document.activeElement);
    var h='<header class="vl-head"><div><span class="pill">Vocab Lab · Preview</span><h2 id="vlTitle">Vocab Check</h2><p>Cambridge 17 / Test 1 / Reading Passage 1</p></div></header>';
    h+='<p class="vl-sync" role="status" aria-live="polite">'+esc(s.message)+'</p>';
    if(s.pending&&!s.busy)h+=button('sync','Retry sync',false,true);
    if(!s.state||!s.ready){s.host.innerHTML=h;return}
    var state=s.state,b=state.batch,locked=s.busy||!!s.pending,id=C.current(state),p,q,r,counts=C.summary(state),sorted=Object.keys(state.termProgress).length;
    h+='<p class="meta">'+sorted+' / 102 sorted · Batch '+state.batchNumber+' · '+(s.demo?'Device-only sandbox':'Private account progress')+'</p>';
    h+='<progress max="102" value="'+sorted+'" aria-label="Words classified in this lesson"></progress>';
    h+='<div class="vl-layout"><section class="vl-main" aria-labelledby="vlStep"><h3 id="vlStep" tabindex="-1">'+({sort:'Sort the words',ready:'Batch sorted',check:'Reality Check',results:'Your vocabulary profile'}[b.phase])+'</h3>';
    if(b.phase==='sort'){
      h+='<p class="meta">'+(b.history.length+1)+' / '+b.ids.length+' in this batch · Choose your current understanding</p><div class="vl-word"><h4>'+esc(s.terms[id].surface)+'</h4><p class="meta">'+esc(s.links[id].priority)+' · '+esc(s.links[id].sourceId)+'</p></div>';
      h+='<div class="vl-bins">'+button('know','1 · Know It',locked)+button('unsure','2 · Not Sure',locked)+button('new','3 · New to Me',locked)+'</div>';
      h+='<p class="meta">Meaning stays hidden while you sort. Use 1 / 2 / 3 or the buttons; U undoes your last choice.</p>'+button('undo','Undo',locked||!b.history.length);
    }else if(b.phase==='ready'){
      h+='<p>Take a short contextual check on a sample of your Know It words. You can stop here and resume later.</p>'+button('startCheck','Start Reality Check',locked,true)+button('undo','Undo last classification',locked||!b.history.length);
    }else if(b.phase==='check'){
      id=b.checks[b.checkAt];q=s.practice[id];r=b.results[id]||{tries:0,hinted:false,wrong:[],done:false};
      h+='<p class="meta">'+(b.checkAt+1)+' / '+b.checks.length+' checks · '+esc(s.terms[id].surface)+'</p><blockquote class="vl-context">'+esc(q.context)+'</blockquote><p>'+esc(q.prompt)+'</p><div class="vl-options">';
      q.options.forEach(function(option,i){h+=button('answer',option,locked||r.done||r.wrong.indexOf(i)>=0,false,' data-choice="'+i+'"')});h+='</div>';
      if(r.done){h+='<div class="vl-feedback" role="status">'+(r.status==='verified_for_current_task'?'Correct on the first try without hints — verified for this task only.':'Needs practice — retries, hints and revealed answers are learning, not independent evidence.')+'<p>'+esc(q.explanation)+'</p></div>'+button('next','Next check',locked,true)}
      else{
        if(r.tries||r.hinted)h+='<p class="vl-feedback" role="status">'+(r.tries?'Not quite. ':'')+(r.hinted||r.tries?esc(q.clue):'')+' Try a different interpretation.</p>';
        h+=button('hint','Get a clue',locked||r.hinted)+button('reveal','Show explanation · needs practice',locked);
      }
    }else{
      h+='<p>Know It is self-reported. A first-try answer verifies only this context; word-family forms have no independent evidence yet.</p><dl class="vl-stats">';
      [['Self-reported known','self_reported_known'],['Verified for this task','verified_for_current_task'],['Needs practice','needs_practice'],['Not sure','unsure'],['New to me','new'],['Unsampled Know It (subset)','unsampled']].forEach(function(x){h+='<div><dt>'+x[0]+'</dt><dd>'+counts[x[1]]+'</dd></div>'});h+='</dl>';
      if(sorted<102)h+=button('nextBatch','Start next batch · up to 12 words',locked,true);else h+='<p>All 102 words are sorted. You can revisit a classification below.</p>';
      h+='<details><summary>Revise a classification</summary><p>Revising clears that word’s current check evidence; previous attempts remain in your history.</p><label for="vlRevise">Choose a sorted word</label><select id="vlRevise">';
      s.bank.lesson_term_links.forEach(function(l){if(state.termProgress[l.senseId])h+='<option value="'+esc(l.senseId)+'">'+esc(s.terms[l.senseId].surface)+'</option>'});
      h+='</select>'+button('revise','Reclassify selected word',locked||!sorted)+'</details><p class="meta">Personalized Missions and puzzles are planned for a later phase.</p>';
    }
    h+='</section><aside class="vl-aside"><h3>This batch</h3><dl class="vl-stats">';
    [['Know It','know'],['Not Sure','unsure'],['New to Me','new']].forEach(function(x){var n=b.ids.filter(function(k){return state.termProgress[k]&&state.termProgress[k].classification===x[1]}).length;h+='<div><dt>'+x[0]+'</dt><dd>'+n+'</dd></div>'});
    h+='</dl><p>Sort a little, check a little. You do not need to sort all 102 words at once.</p><p>Reality Check starts with up to 3 Know It items and expands to up to 5 when more practice is needed.</p></aside></div>';
    s.host.innerHTML=h;
    if(focus){var target=s.host.querySelector('#vlStep');if(target)target.focus()}
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
      }else{s.message='Not synced. Your draft is saved on this device. Check connection and Firestore rules, then retry.';cache()}
    }).then(function(){s.busy=false;draw()});
  }
  function act(type,choice){
    if(type==='sync'){sync();return}
    if(!s.ready||s.busy||s.pending)return;
    var op={type:type,id:'op-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12)},before=s.state,after;
    if(['know','unsure','new'].indexOf(type)>=0){op.type='sort';op.bin=type}
    if(type==='answer')op.choice=choice;
    if(type==='revise')op.senseId=s.host.querySelector('#vlRevise').value;
    try{after=C.apply(before,op,s.bank,s.practice)}catch(e){s.message=e.message;draw();return}
    var oldPending=s.pending;s.pending=s.demo?null:{before:before,after:after,op:op};s.state=after;
    if(!cache()){s.state=before;s.pending=oldPending;draw();return}
    s.message=s.demo?'Saved on this device only. Sandbox — no Firebase writes.':'Saving…';draw(true);
    if(!s.demo)sync();
  }
  host.onclick=null;
  // One delegated listener per host, reading the current session only.
  if(!host._vocabEvents){
    host.addEventListener('click',function(e){var t=e.target.closest('[data-vl]');if(t&&session&&session.host===host)session.act(t.getAttribute('data-vl'),Number(t.getAttribute('data-choice')))});
    host.addEventListener('keydown',function(e){if(!session||session.host!==host||e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;var a={'1':'know','2':'unsure','3':'new',u:'undo',U:'undo'}[e.key];if(a&&session.state&&['sort','ready'].indexOf(session.state.batch.phase)>=0){e.preventDefault();session.act(a)}});
    host._vocabEvents=true;
  }
  s.act=act;draw();
  data().then(function(values){
    if(session!==s)return;
    s.bank=values[0];s.practice={};s.links={};s.terms={};var byTerm={};
    s.bank.terms.forEach(function(t){byTerm[t.id]=t});
    s.bank.lesson_term_links.forEach(function(l){s.links[l.senseId]=l;s.terms[l.senseId]=byTerm[l.termId]});
    values[1].forEach(function(p){s.practice[p.senseId]=p});
    var saved=null;try{saved=JSON.parse(root.localStorage.getItem(key)||'null')}catch(e){}
    if(saved&&saved.state&&saved.state.schemaVersion===1&&saved.state.email===s.email&&saved.state.lessonId===s.bank.lessonId){s.state=saved.state;s.pending=saved.pending||null}
    else s.state=C.begin(C.fresh(s.email,s.bank),s.bank);
    if(s.demo){s.pending=null;s.ready=true;s.message='Saved on this device only. Sandbox — no Firebase writes.';draw();return}
    return Promise.resolve(opt.db||(root.claude&&root.claude.use('db'))).then(function(db){
      if(session!==s)return;
      if(!db)throw Error('Sign in and connect to Firebase before starting Vocab Lab.');
      var authUser=root.firebase&&root.firebase.auth().currentUser;
      if(!authUser)throw Error('A Firebase session is required. Sign in again.');
      s.store=root.MD_VOCAB_STORE(db,s.email,s.bank.lessonId,authUser.uid);
      s.stop=s.store.watch(function(remote){
        if(session!==s)return;
        if(s.pending){
          if(remote&&remote.lastOperation===s.pending.op.id){s.state=remote;s.pending=null;s.message='Saved to your account.'}
          else if((remote?remote.revision:0)!==s.pending.before.revision){s.state=remote||C.begin(C.fresh(s.email,s.bank),s.bank);s.pending=null;s.message='Another session updated this lesson. Latest progress loaded; retry your last action.'}
          else{s.message='Unsynced draft restored. Retry sync to continue.'}
        }else{s.state=remote||C.begin(C.fresh(s.email,s.bank),s.bank);s.message=remote?'Saved to your account.':'Account connected. Your choices save automatically.'}
        s.ready=true;cache();draw();
      },function(){s.ready=false;s.message='Cannot read account progress. Check connection and publish the Vocab Lab Firestore rules in a test project first.';draw()});
    });
  }).catch(function(e){s.message=e.message;draw()});
}
root.MD_VOCAB={allowed:C.allowed,mount:mount};
})(this);
