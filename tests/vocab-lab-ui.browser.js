/* Phase 1.1 browser QA. Playwright supplied via NODE_PATH; fake accounts only. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const root=path.resolve(__dirname,'..'),C=require('../vocab-lab-core'),bank=require('../data/vocab-lab-p1.json'),items=require('../data/vocab-lab-practice.json'),legacy=require('../data/vocab-lab-practice-v1.json');
const P=Object.fromEntries(items.map(x=>[x.senseId,x])),L=Object.fromEntries(legacy.map(x=>[x.senseId,x]));
const output=process.env.VOCAB_UI_QA_DIR||path.join(os.tmpdir(),'vocab-phase11-qa');fs.mkdirSync(output,{recursive:true});
const key='md-vocab-lab:v1:sandbox-a%40local.invalid:cam17-t1-reading-p1';let serial=0;
function contrast(a,b){function lum(s){const v=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722}const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const action=(s,type,extra={},practice=P)=>C.apply(s,{type,id:'qa-'+(++serial),...extra},bank,practice);
function fixtures(){
 let s=C.begin(C.fresh('sandbox-a@local.invalid',bank),bank);
 for(let i=0;i<12;i++)s=action(s,'sort',{bin:'new'});s=action(s,'startCheck');s=action(s,'nextBatch');
 const sorting=C.copy(s);for(let i=0;i<12;i++)s=action(s,'sort',{bin:i<9?'know':i===9?'unsure':'new'});
 const ready=C.copy(s);s=action(s,'startCheck');s=action(s,'answer',{choice:C.question(s,P).answer});s=action(s,'next');
 const checking=C.copy(s),q=C.question(s,P),wrong=action(s,'answer',{choice:(q.answer+1)%3}),correct=action(s,'answer',{choice:q.answer});
 s=action(wrong,'answer',{choice:q.answer});s=action(s,'next');while(s.batch.phase==='check'){s=action(s,'answer',{choice:C.question(s,P).answer});s=action(s,'next')}
 return {sorting,ready,'check-before':checking,'check-wrong':wrong,'check-correct':correct,results:s};
}
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{const content=fs.readFileSync(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'text/plain','Cache-Control':'no-store'});res.end(content)}catch(e){res.writeHead(404);res.end('Not found')}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:process.env.VOCAB_BROWSER_CHANNEL||'msedge'});const logs=[],measurements=[];
 async function load(state,width=390,theme='light',motion='reduce'){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:motion}),page=await context.newPage();
  page.on('pageerror',e=>logs.push('PAGE ERROR '+e.message));
  await page.addInitScript(({key,state,theme})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({state,pending:null}));addEventListener('DOMContentLoaded',()=>document.documentElement.setAttribute('data-theme',theme));},{key,state,theme});
  await page.goto(base+'/vocab-lab-preview.html');await page.locator('#vlStep').waitFor();return {context,page};
 }
 const saved=fixtures();
 try{
  for(const width of [390,768,1280])for(const theme of ['light','dark'])for(const [screen,state] of Object.entries(saved)){
   const {page,context}=await load(state,width,theme);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const text=await page.locator('#preview').innerText();
   for(const forbidden of ['This batch','C17-T1-R1-','Device-only sandbox','Firebase','Unsampled Know It','Personalized Missions'])assert.ok(!text.includes(forbidden),forbidden);
   assert.equal(await page.locator('#preview progress').count(),1);
   const colours=await page.locator('.vl-passage,.vl-key-help,.vl-count,.vl-main .vl-btn:enabled,.vl-feedback').evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>{var p=e,bg;while(p){bg=getComputedStyle(p).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')break;p=p.parentElement}return {text:e.textContent,fg:getComputedStyle(e).color,bg:bg||'rgb(255, 255, 255)'}}));
   colours.forEach(x=>assert.ok(contrast(x.fg,x.bg)>=4.5,x.text+' text contrast '+contrast(x.fg,x.bg)));
   const boundaries=await page.locator('.vl-bins .vl-btn:enabled,.vl-options .vl-btn:enabled').evaluateAll(els=>els.map(e=>({border:getComputedStyle(e).borderColor,bg:getComputedStyle(e).backgroundColor})));
   boundaries.forEach(x=>assert.ok(contrast(x.border,x.bg)>=3,'Control boundary contrast '+contrast(x.border,x.bg)));
   const sizes=await page.locator('#preview button:visible,#preview summary:visible,#preview select:visible').evaluateAll(els=>els.map(e=>({height:e.getBoundingClientRect().height,text:e.textContent,clipped:e.scrollWidth>e.clientWidth+1})));
   sizes.forEach(x=>{assert.ok(x.height>=44,x.text+' touch target '+x.height);assert.ok(!x.clipped,x.text+' clipped')});
   if(screen==='sorting'){
    assert.ok(await page.locator('[data-vl="undo"]').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
    assert.equal(await page.locator('.vl-bins').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
   }
   if(screen==='check-before')assert.equal(await page.locator('[data-vl="reveal"]').isVisible(),false);
   if(screen==='check-wrong'){
    const q=P[state.batch.checks[state.batch.checkAt]];const feedback=await page.locator('.vl-feedback').innerText();
    assert.ok(feedback.includes(q.clue)&&!feedback.includes(q.options[q.answer])&&!feedback.includes(q.explanation));
    assert.equal(await page.locator('[data-result="wrong"]').count(),1);
    assert.equal(await page.locator('[data-vl="answer"]:enabled').count(),2);
    assert.ok(await page.locator('.vl-feedback').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));
   }
   const height=await page.evaluate(()=>document.documentElement.scrollHeight);measurements.push({screen,width,theme,height});
   await page.screenshot({path:path.join(output,`${screen}-${width}-${theme}.png`),fullPage:true,animations:'disabled'});await context.close();
  }
  logs.push('PASS 36 state/theme/viewport checks: 390/768/1280, no overflow, 44px targets, text contrast >=4.5:1, control boundaries >=3:1, sorting/undo above fold, first-error hint visible and neutral, quiet reveal');
  {
   const s=C.begin(C.fresh('sandbox-a@local.invalid',bank),bank),{page,context}=await load(s,390,'light','no-preference');
   await page.locator('[data-vl="know"]').dblclick({force:true});await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).state.revision===1,key);
   assert.equal(await page.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k)).state.termProgress).length,key),1);
   await page.reload();await page.locator('[data-vl="know"]:enabled').waitFor();
   assert.equal(await page.locator('.vl-word h4').innerText(),bank.terms.find(t=>t.id===bank.lesson_term_links[1].termId).surface);
   await page.locator('[data-vl="know"]').focus();await page.keyboard.press('u');
   assert.equal(await page.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k)).state.termProgress).length,key),0);
   await page.keyboard.press('2');await page.locator('[data-vl="know"]:enabled').waitFor();
   assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H4');
   await page.selectOption('#sandboxUser','b');await page.locator('[data-vl="know"]:enabled').waitFor();
   assert.ok((await page.locator('.vl-progress').innerText()).includes('0 / 102'));
   logs.push('PASS double click records once; reload during transition; keyboard sort/undo and retained word focus; separate accounts');await context.close();
  }
  {
   const {page,context}=await load(C.begin(C.fresh('sandbox-a@local.invalid',bank),bank));
   await page.locator('[data-vl="know"]').click();assert.equal(await page.locator('.vl-word h4').evaluate(e=>getComputedStyle(e).animationName),'none');
   logs.push('PASS prefers-reduced-motion disables card animation');await context.close();
  }
  {
   let s=C.begin(C.fresh('sandbox-a@local.invalid',bank),bank);for(let i=0;i<12;i++)s=action(s,'sort',{bin:'new'});
   const {page,context}=await load(s);assert.ok((await page.locator('.vl-support').innerText()).includes('skip'));
   await page.locator('[data-vl="startCheck"]').click();assert.equal(await page.locator('#vlStep').innerText(),'Batch complete');
   await page.locator('[data-vl="nextBatch"]').click();assert.equal(await page.locator('.vl-progress b').innerText(),'12');
   logs.push('PASS zero Known: transparent skip to results and next batch');await context.close();
  }
  {
   const target=bank.lesson_term_links.find(x=>x.sourceId==='C17-T1-R1-081').senseId;
   const ids=[target,...bank.lesson_term_links.filter(x=>x.senseId!==target).slice(0,11).map(x=>x.senseId)];
   let s=C.begin(C.fresh('sandbox-a@local.invalid',bank),bank,ids);
   for(let i=0;i<12;i++)s=action(s,'sort',{bin:i===0?'know':'new'},L);s=action(s,'startCheck',{},L);s=action(s,'answer',{choice:(L[target].answer+1)%3},L);
   const {page,context}=await load(s);assert.equal(await page.locator('.vl-context').innerText(),L[target].context);
   assert.ok((await page.locator('.vl-feedback').innerText()).includes(P[target].clue));
   assert.ok(!(await page.locator('.vl-feedback').innerText()).includes(L[target].options[L[target].answer]));
   await page.reload();await page.locator('.vl-context').waitFor();assert.equal(await page.locator('.vl-context').innerText(),L[target].context);
   await page.locator('[data-vl="answer"]').nth(L[target].answer).click();
   assert.ok((await page.locator('.vl-feedback').innerText()).includes('Needs practice'));
   assert.equal(await page.evaluate(({key,target})=>JSON.parse(localStorage.getItem(key)).state.termProgress[target].evidence.taskId,{key,target}),L[target].id);
   await page.locator('[data-vl="next"]').click();await page.locator('.vl-revise summary').click();await page.selectOption('#vlRevise',target);await page.locator('[data-vl="revise"]').click();
   await page.locator('[data-vl="know"]').click();await page.locator('[data-vl="startCheck"]').click();assert.equal(await page.locator('.vl-context').innerText(),P[target].context);
   await page.locator('[data-vl="answer"]').nth(P[target].answer).click();
   assert.equal(await page.evaluate(({key,target})=>JSON.parse(localStorage.getItem(key)).state.termProgress[target].evidence.taskId,{key,target}),P[target].id);
   logs.push('PASS legacy wrong-attempt context/options pin across reload; old evidence retained; explicit revision starts v2 and records v2 task ID');await context.close();
  }
  assert.ok(!logs.some(s=>s.startsWith('PAGE ERROR')),logs.join('\n'));
  fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(measurements,null,2));fs.writeFileSync(path.join(output,'browser-results.txt'),logs.join('\n')+'\n');console.log(logs.join('\n'));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
