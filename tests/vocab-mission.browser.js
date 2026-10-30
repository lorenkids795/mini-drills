'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const C=require('../vocab-mission-core'),D=require('../vocab-mission-content'),bank=require('../data/vocab-lab-p1.json');
const root=path.resolve(__dirname,'..'),out=process.env.VOCAB_MISSION_QA_DIR||path.join(os.tmpdir(),'vocab-mission-qa');fs.mkdirSync(out,{recursive:true});
const identity='sandbox-a@local.invalid',missions=[D.coast(),D.linked(bank)];let op=0;
function contrast(a,b){function lum(s){const v=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722}const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const act=(s,type,x={})=>C.apply(s,{type,id:'fixture-'+(++op),...x});
function profile(m){return {email:identity,lessonId:bank.lessonId,revision:12,termProgress:Object.fromEntries(m.terms.map((t,i)=>[t.senseId,{status:['new','unsure','verified_for_current_task','self_reported_known','needs_practice'][i]}]))}}
function solve(s){const q=C.current(s);if(q.kind==='reconstruct'){for(const word of q.answers[0].split(' ')){const used=(s.records[q.id]||{}).draft||[],index=q.tokens.findIndex((t,i)=>t===word&&!used.includes(i));s=act(s,'draft',{index})}}return act(s,'answer',{value:q.options?q.answer:q.answers&&q.answers[0]})}
function fixtures(m){let s=C.create(m,m.provenance==='approved_p1'?profile(m):null,identity),states={briefing:C.copy(s)};s=act(s,'begin');s=act(s,'revealSentence');s=act(s,'revealSentence');states.case=C.copy(s);s=act(s,'fullReport');s=act(s,'revealSentence');let guard=0;while(s.phase!=='debrief'&&guard++<100){if(!states[s.phase])states[s.phase]=C.copy(s);if(s.phase==='investigate'&&!states['discover-wrong']){const q=C.current(s);states['discover-wrong']=act(s,'answer',{value:(q.answer+1)%3});states['discover-correct']=solve(s)}if(C.current(s).kind==='reconstruct'&&!states['decode-reconstruct'])states['decode-reconstruct']=C.copy(s);s=solve(s);s=act(s,'next')}states.debrief=s;return states}
function key(m,account='a',fixture=true){return 'md-vocab-mission:v1:'+encodeURIComponent('sandbox-'+account+'@local.invalid')+':'+m.id+':'+(m.provenance==='authored_demo'?'authored':fixture?'fixture':'check')}
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{const data=fs.readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'text/plain','Cache-Control':'no-store'});res.end(data)}catch(e){res.writeHead(404);res.end('Not found')}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:'msedge'}),logs=[],errors=[],metrics=[];
 async function load(m,state,width=390,theme='light'){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,state})=>{if(state&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:key(m),state});
  await page.goto(base+'/vocab-mission-preview.html?mission='+m.id+'&profile=qa&theme='+theme);await page.locator('#vmStep').waitFor();return {page,context};
 }
 async function current(page,m){return C.current(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key(m)))}
 async function answer(page,q){await page.waitForFunction(prompt=>document.querySelector('.vm-prompt')?.textContent===prompt,q.prompt);if(q.options)await page.locator('[data-vm="answer"][data-choice]').nth(q.answer).click();else if(q.kind==='reconstruct'){let used=[];for(const word of q.answers[0].split(' ')){const index=q.tokens.findIndex((t,i)=>t===word&&!used.includes(i));used.push(index);await page.locator('[data-vm="token"][data-index="'+index+'"]').click();await page.waitForFunction(({id,index})=>{const runs=Object.keys(localStorage).filter(k=>k.startsWith('md-vocab-mission:')).map(k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}});return runs.some(s=>s?.records?.[id]?.draft.includes(index))},{id:q.id,index})}await page.locator('[data-vm="answer"]').click()}else{await page.locator('#vmAnswer').fill(q.answers[0]);await page.locator('#vmAnswer').press('Enter')}const m=missions.find(m=>q.id.startsWith(m.id+'@'));await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).records[id]?.done,{key:key(m),id:q.id})}
 async function next(page,m){const q=await current(page,m);await page.locator('[data-vm="next"]').click();await page.waitForFunction(({key,id})=>{const s=JSON.parse(localStorage.getItem(key));const q=s.plan.tasks[s.phase]?.[s.index];return q?.id!==id&&(s.phase==='debrief'?document.querySelector('#vmStep')?.textContent==='Debrief':document.querySelector('.vm-prompt')?.textContent===q?.prompt)},{key:key(m),id:q.id})}
 try{
  for(const m of missions)for(const [chapter,state] of Object.entries(fixtures(m)))for(const width of [390,1280])for(const theme of ['light','dark']){
   const {page,context}=await load(m,state,width,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const sizes=await page.locator('button:visible,select:visible,summary:visible,[role="button"]:visible,input[type="text"]:visible').evaluateAll(els=>els.map(e=>({height:e.getBoundingClientRect().height,text:e.textContent})));sizes.forEach(e=>assert.ok(e.height>=44,e.text+' '+e.height));
   const colours=await page.locator('.vm-tag,.vm-profile,.vm-prompt,.vm-quiet,.vm-report-action,.vm-save,.vm-evidence b,.vm .vm-btn:enabled').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>{var p=e,bg;while(p){bg=getComputedStyle(p).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')break;p=p.parentElement}return {fg:getComputedStyle(e).color,bg:bg||'rgb(255, 255, 255)',text:e.textContent}}));colours.forEach(x=>assert.ok(contrast(x.fg,x.bg)>=4.5,x.text+' contrast '+contrast(x.fg,x.bg)));
   assert.ok(await page.getByRole('status').count()>=1);
   if(chapter==='case'){assert.equal(await page.locator('.vm-report p').count(),1);assert.equal(await page.locator('.vm-report h3').count(),0)}
   if(chapter==='final'){const q=C.current(state);assert.equal(await page.locator('.vm-tokens,.vm-teaching').count(),0);assert.ok(!(await page.locator('.vm-card').innerText()).includes(q.answers[0]))}
   if(chapter==='investigate'||chapter==='discover-wrong'){
    const q=C.current(state);assert.equal(await page.locator('.vm-teaching').count(),0);assert.ok(!(await page.locator('.vm-card').innerText()).includes(q.teaching));
    assert.ok(await page.locator('.vm-artifact blockquote').innerText());
    assert.equal(await page.locator('[data-vm="support"]').count(),chapter==='discover-wrong'?1:0);
   }
   if(chapter==='discover-correct'){assert.equal(await page.locator('.vm-teaching').innerText(),C.current(state).teaching);assert.match(await page.locator('.vm-feedback').innerText(),/independent/)}
   if(chapter==='decode-reconstruct'){
    assert.match(await page.locator('.vm-artifact').innerText(),/memo/);
    await page.locator('[data-vm="token"]').first().focus();assert.ok(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle!=='none'));
    const q=C.current(state),i=q.tokens.indexOf(q.answers[0].split(' ')[0]);await page.locator('[data-index="'+i+'"]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-vm="answer"]').disabled);assert.equal(await page.locator('[data-vm="answer"]').isEnabled(),true);
    const primary=await page.locator('[data-vm="answer"]').evaluate(e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}));assert.ok(contrast(primary.fg,primary.bg)>=4.5);
   }
   assert.equal(await page.locator('.vm-head .vm-tag,.vm-profile').count(),0);
   assert.equal(await page.evaluate(()=>typeof window.firebase),'undefined');
   await page.screenshot({path:path.join(out,m.id+'-'+chapter+'-'+width+'-'+theme+'.png'),fullPage:true,animations:'disabled'});metrics.push({mission:m.id,chapter,width,theme,height:await page.evaluate(()=>document.documentElement.scrollHeight)});await context.close();
  }
  logs.push('PASS '+metrics.length+' chapter/scenario/viewport/theme screenshots; no overflow, 44px controls, text contrast >=4.5:1, reduced motion/focus, live status, evidence-first discovery, contextual artifacts, one report paragraph, Final Report no word bank/answers, no Firebase SDK');
  {
   const m=missions[0],{page,context}=await load(m,null);await page.locator('[data-vm="begin"]').click();
   for(let i=1;i<=5;i++){await page.locator('.vm-report').focus();await page.keyboard.press('Enter');const expected=m.terms.slice(0,i).map(t=>t.sentence).join(' ');await page.waitForFunction(text=>document.querySelector('.vm-report-paragraph').textContent===text,expected);assert.equal(await page.locator('.vm-report-paragraph').innerText(),expected);assert.equal(await page.evaluate(()=>document.activeElement.className),'vm-report')}
   assert.equal(await page.locator('[data-vm="full"]').isVisible(),false);await page.reload();await page.locator('.vm-report').waitFor();assert.equal(await page.locator('.vm-report-paragraph').innerText(),m.terms.map(t=>t.sentence).join(' '));
   await page.locator('.vm-report').click();await page.locator('[data-vm="answer"]').first().waitFor();let guard=0;while(await page.locator('[data-vm="next"]').count()||await page.locator('[data-vm="answer"]').count()){
    if(guard++>70)throw Error('Mission did not finish');const q=await current(page,m);await answer(page,q);await next(page,m);
   }
   assert.equal(await page.locator('#vmStep').innerText(),'Debrief');assert.ok((await page.locator('.vm-evidence').first().innerText()).includes('Ready for Review'));
   await page.selectOption('#identity','b');await page.locator('[data-vm="begin"]').waitFor();assert.equal(await page.locator('#vmStep').innerText(),'Mission briefing');
   await page.selectOption('#identity','a');await page.locator('#vmStep').waitFor();assert.equal(await page.locator('#vmStep').innerText(),'Debrief');
   await page.locator('[data-vm="replay"]').click();await page.locator('[data-vm="begin"]').waitFor();assert.equal(await page.locator('#vmStep').innerText(),'Mission briefing');
   logs.push('PASS complete authored game, five one-at-a-time sentences with keyboard/focus, reload, account isolation, replay');await context.close();
  }
  {
   const m=missions[1],{page,context}=await load(m,fixtures(m).investigate);let q=await current(page,m);await answer(page,q);await next(page,m);q=await current(page,m);
   await page.locator('[data-vm="answer"][data-choice]').nth((q.answer+1)%3).click();assert.equal(await page.locator('[data-vm="next"]').count(),0);assert.ok(!(await page.locator('.vm-feedback').innerText()).includes(q.options[q.answer]));
   await page.reload();await page.locator('.vm-feedback').waitFor();await answer(page,q);assert.ok((await page.locator('.vm-feedback').innerText()).includes('Completed with support'));
   let s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key(m));assert.equal(s.records[q.id].independent,false);
   logs.push('PASS linked first-error neutral hint, reload/retry stays assisted, no verified-word interstitial');await context.close();
  }
  {
   for(const m of missions){const {page,context}=await load(m,fixtures(m).investigate);const q=await current(page,m);
    await page.locator('[data-vm="hint"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.vm-teaching').count(),0);
    assert.equal(await page.locator('.vm-feedback p').innerText(),q.clue);await page.locator('[data-vm="hint"]').click();await page.waitForFunction(text=>document.querySelector('.vm-feedback p').textContent===text,q.clue2);assert.equal(await page.locator('.vm-feedback p').innerText(),q.clue2);
    await page.locator('[data-vm="answer"][data-choice]').nth((q.answer+1)%3).click();await page.locator('[data-vm="support"]').click();assert.equal(await page.locator('.vm-teaching').innerText(),q.teaching);
    await page.reload();await page.locator('.vm-teaching').waitFor();await answer(page,q);assert.match(await page.locator('.vm-feedback').innerText(),/Completed with support/);
    const s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key(m));assert.equal(s.records[q.id].independent,false);await context.close();
   }
   logs.push('PASS both missions: keyboard clue, progressive clue, explicit teaching only after attempt, assisted evidence and support resume');
  }
  {
   const m=missions[0],{page,context}=await load(m,null);
   await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('md-vocab-mission:'))throw Error('Quota test');return original.call(this,k,v)}});
   await page.locator('[data-vm="begin"]').click();await page.waitForFunction(()=>document.querySelector('.vm-save [role="status"]').textContent.includes('Could not save'));assert.match(await page.locator('.vm-save [role="status"]').innerText(),/Could not save/);
   assert.equal(await page.locator('#vmStep').innerText(),'Mission briefing');await page.reload();await page.locator('[data-vm="begin"]').waitFor();
   logs.push('PASS visible save-failure feedback and rollback without advancing unsaved mission');await context.close();
  }
  {
   const m=missions[0],{page,context}=await load(m,fixtures(m).final);await page.locator('#vmAnswer').fill('unfinished draft');await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s.records[s.plan.tasks.final[0].id]?.text==='unfinished draft'},key(m));await page.reload();await page.locator('#vmAnswer').waitFor();assert.equal(await page.locator('#vmAnswer').inputValue(),'unfinished draft');
   const before=await page.evaluate(()=>localStorage.getItem('untouched-check'));await page.locator('[data-vm="sorting"]').click();await page.locator('[data-vl="know"]').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('untouched-check')),before);
   logs.push('PASS typed-answer draft resume and Continue Sorting navigation');await context.close();
  }
  {
   const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const live=[];page.on('request',r=>{if(/firestore|identitytoolkit|firebaseio/.test(r.url()))live.push(r.url())});
   await page.route('**/md-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.MD_CONFIG={demo:true,teachers:[],api:"/api"}'}));
   await page.goto(base+'/index.html');await page.locator('[data-act="demo"][data-email="admin@demo.vn"]').click();await page.locator('[data-tab="library"]').click();await page.locator('[data-act="lib-tab"][data-v="lm"]').click();await page.locator('[data-act="vocab-toggle"]').click();await page.locator('[data-act="vocab-open"][data-view="check"]').click();
   for(let i=0;i<20;i++)await page.locator('[data-vl="new"]:enabled').click();await page.locator('[data-vl="startCheck"]').click();
   const checkKey='md-vocab-lab:v1:admin%40demo.vn:cam17-t1-reading-p1',before=await page.evaluate(k=>localStorage.getItem(k),checkKey);
   await page.locator('[data-vl="mission"]').click();await page.locator('[data-mission-qa]').check();await page.locator('[data-mission-pack="p1-station-access"]').click();await page.locator('[data-vm="begin"]').waitFor();assert.equal(await page.locator('.vm-head h2').innerText(),'Station Access Audit');
   await page.locator('[data-vm="begin"]').click();await page.locator('.vm-report').click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),checkKey),before);
   await page.locator('[data-vm="sorting"]').click();await page.locator('[data-vl="know"]:enabled').waitFor();assert.ok((await page.locator('.vl-lesson-progress').textContent()).includes('20 / 102'));
   assert.equal(await page.evaluate(()=>MD_MISSION.eligible({adm:true},false)),false);assert.equal(await page.evaluate(()=>MD_MISSION.eligible(null,true)),false);assert.deepEqual(live,[]);
   logs.push('PASS real root-app demo integration from a completed 20-word batch, read-only Check input, Continue Sorting, no real APIs; real-mode/anonymous mission gating');await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));fs.writeFileSync(path.join(out,'browser-results.txt'),logs.join('\n')+'\n');console.log(logs.join('\n'));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
