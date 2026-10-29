'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os');
const C=require('../vocab-mission-core'),D=require('../vocab-mission-content'),V=require('../vocab-lab-core'),bank=require('../data/vocab-lab-p1.json');
const root=path.resolve(__dirname,'..'),out=process.env.VOCAB_SHELL_QA_DIR||path.join(os.tmpdir(),'vocab-shell-qa');fs.mkdirSync(out,{recursive:true});
const users={admin:'admin@demo.vn',tester:'integration-tester@local.invalid',student:'minhanh@demo.vn'};
const checkKey=email=>'md-vocab-lab:v1:'+encodeURIComponent(email)+':'+bank.lessonId;
const missionKey=email=>'md-vocab-mission:v1:'+encodeURIComponent(email)+':p1-town-on-the-move:check';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon'};
function app(){return fs.readFileSync(path.join(root,'index.html'),'utf8').replace('var rosterDocs=[],localRoster=null;',"DEMO_ROSTER.push({email:'"+users.tester+"',name:'Integration Tester',role:'student',tester:true,course:'Foundation',cls:'Class 6.0-A'});var rosterDocs=[],localRoster=null;").replace('<div class="demo-ids">','<div class="demo-ids"><button data-act="demo" data-email="'+users.tester+'">Tester</button>')}
const server=http.createServer((req,res)=>{let pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/')pathname='/index.html';const f=path.resolve(root,'.'+decodeURIComponent(pathname));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{let body=pathname==='/index.html'?app():fs.readFileSync(f);if(pathname==='/md-config.js')body='window.MD_CONFIG={demo:true,teachers:[],api:"/blocked-api"}';if(pathname==='/md-backend.js')body='/* no live services in local test */';res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'text/plain','Cache-Control':'no-store'});res.end(body)}catch(e){res.writeHead(404);res.end('Not found')}});
function checkState(email){let s=V.begin(V.fresh(email,bank),bank,null,12);for(let i=0;i<12;i++)s=V.apply(s,{type:'sort',bin:'new',id:'fixture-'+i},bank,{});return V.apply(s,{type:'startCheck',id:'fixture-check'},bank,{})}
function missionState(email,phase){const m=D.linked(bank),p={email,lessonId:bank.lessonId,revision:12,termProgress:Object.fromEntries(m.terms.map(t=>[t.senseId,{status:'new'}]))},s=C.create(m,p,email);s.phase=phase;s.index=phase==='decode'?1:0;return s}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:'msedge'}),logs=[],errors=[],network=[],shots=[];
 async function session(role='tester',width=1280,theme='light',state=null){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(base+'/')){network.push(url);return route.abort()}if(url.includes('/api/'))throw Error('Unexpected API '+url);return route.continue()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({email,theme,state,key,check})=>{localStorage.setItem('md-theme',theme);if(!localStorage.getItem('md-email'))localStorage.setItem('md-email',email);if(check&&!localStorage.getItem(check.key))localStorage.setItem(check.key,JSON.stringify(check.value));if(state&&!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('md-vocab-shell:'+email,'mission')}},{email:users[role],theme,state,key:missionKey(users[role]),check:state?{key:checkKey(users[role]),value:{state:checkState(users[role]),pending:null}}:null});
  await page.goto(base+'/index.html'+(state?'#vocab':''));return {page,context};
 }
 async function nav(page,tab){if(page.viewportSize().width<1024&&await page.locator('#sbBtn').getAttribute('aria-expanded')!=='true')await page.locator('#sbBtn').click();await page.locator('#tabs [data-tab="'+(tab==='vocab'?'library':tab)+'"]').click();if(tab==='vocab'){await page.locator('[data-act="lib-tab"][data-v="lm"]').click();await page.locator('[data-act="vocab-toggle"]').click();await page.locator('[data-act="vocab-open"][data-view="check"]').click()}}
 async function shot(page,name){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,name+'.png'),fullPage:true,animations:'disabled'});shots.push(name)}
 try{
  for(const width of [390,768,1280])for(const theme of ['light','dark']){
   const {page,context}=await session('tester',width,theme);await nav(page,'library');await page.locator('[data-act="lib-tab"][data-v="lm"]').click();assert.equal(await page.locator('#tabs [data-tab="vocab"]').count(),0);await shot(page,'library-'+width+'-'+theme);await page.locator('[data-act="vocab-toggle"]').click();await shot(page,'library-expanded-'+width+'-'+theme);await page.locator('[data-act="vocab-open"][data-view="check"]').click();await page.locator('[data-vl="know"]').waitFor();assert.match(await page.locator('.vocab-location').innerText(),/Library \/ Learning Materials \/ Vocab Lab \/ Vocab Check/);
   assert.match(await page.locator('.vocab-preview-bar').innerText(),/browser only/);assert.match(await page.locator('.vl').evaluate(e=>getComputedStyle(e).fontFamily),/Be Vietnam Pro/);
   await shot(page,'sorting-'+width+'-'+theme);
   for(let i=0;i<20;i++)await page.locator('[data-vl="new"]:enabled').click();await page.locator('[data-vl="startCheck"]').click();await page.locator('[data-vl="mission"]').click();await page.locator('[data-vm="begin"]').waitFor();
   await shot(page,'briefing-'+width+'-'+theme);await page.locator('[data-vm="begin"]').click();await page.locator('.vm-report').waitFor();
   await page.locator('[data-vocab-library-back]').click();await page.locator('[data-act="vocab-open"][data-view="missions"]').click();await shot(page,'mission-chooser-'+width+'-'+theme);assert.equal(await page.locator('#vmStep').innerText(),'Case File');
   await page.reload();await page.locator('.vm-report').waitFor();assert.equal(await page.locator('#vmStep').innerText(),'Case File');
   await page.locator('.vm-report').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.vm-report-paragraph').textContent.length>0);
   await page.locator('[data-vm="sorting"]').click();await page.locator('[data-vl="know"]:visible').waitFor();assert.match(await page.locator('.vl-lesson-progress').textContent(),/20\s*\/\s*102/);
   await context.close();
  }
  logs.push('PASS actual app shell: tester sorting→mission→sorting, navigation away/back, hash reload/resume; 390/768/1280 light/dark and reduced motion');
  for(const phase of ['investigate','decode','morph','final','debrief'])for(const width of [390,768,1280])for(const theme of ['light','dark']){
   const {page,context}=await session('tester',width,theme,missionState(users.tester,phase));await page.locator('#vmStep').waitFor();
   const sizes=await page.locator('#v-vocab button:visible,#v-vocab summary:visible').evaluateAll(es=>es.map(e=>({h:e.getBoundingClientRect().height,text:e.textContent})));sizes.forEach(x=>assert.ok(x.h>=44,x.text));
   await shot(page,phase+'-'+width+'-'+theme);await context.close();
  }
  logs.push('PASS '+shots.length+' real-shell screenshots; no horizontal overflow, local controls >=44px, inherited app fonts/theme/navigation');
  for(const role of ['admin','student']){
   const {page,context}=await session(role);await page.locator('#tabs').waitFor();
   if(role==='admin'){await nav(page,'vocab');await page.locator('[data-vl="know"]').waitFor();assert.match(await page.locator('.vocab-preview-bar').innerText(),/Preview/)}
   else{assert.equal(await page.locator('#tabs [data-tab="vocab"]').count(),0);await page.evaluate(()=>{const b=document.createElement('button');b.dataset.act='tab';b.dataset.tab='vocab';document.body.appendChild(b);b.click();b.remove()});assert.equal(await page.locator('#v-vocab').isVisible(),false);assert.equal(await page.evaluate(()=>MD_VOCAB_SHELL.mount(document.createElement('div'),{user:{role:'student',email:'s@local.invalid'},demo:true,enabled:true})),false);await page.goto(base+'/index.html#library/vocab');await page.locator('[data-act="lib-tab"][data-v="lm"]').click();assert.equal(await page.locator('.lm-vocabulary .lmhd').isDisabled(),true);assert.equal(await page.locator('[data-act="vocab-open"]').count(),0);assert.equal(await page.locator('#v-vocab').isVisible(),false);await shot(page,'student-vocabulary-coming-soon')}
   await context.close();
  }
  logs.push('PASS admin/tester allowed; ordinary student hidden and blocked by direct route and direct shell mount even with enabled=true');
  {
   const {page,context}=await session('tester',1280,'light',missionState(users.tester,'final'));await page.locator('#vmAnswer').waitFor();await page.locator('#vmAnswer').fill('partial draft');
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).records[JSON.parse(localStorage.getItem(k)).plan.tasks.final[0].id]?.text==='partial draft',missionKey(users.tester));
   await page.reload();await page.locator('#vmAnswer').waitFor();assert.equal(await page.locator('#vmAnswer').inputValue(),'partial draft');
   const before=await page.evaluate(k=>localStorage.getItem(k),checkKey(users.tester));await page.locator('[data-vm="hint"]').click();await page.locator('.vm-feedback').waitFor();assert.equal(await page.evaluate(k=>localStorage.getItem(k),checkKey(users.tester)),before);
   await page.locator('#logoutBtn').click();assert.equal(await page.locator('#v-vocab').innerText(),'');await page.locator('[data-act="demo"][data-email="'+users.admin+'"]').click();await nav(page,'vocab');await page.locator('[data-vl="know"]').waitFor();assert.equal(await page.locator('#vmAnswer').count(),0);await context.close();
  }
  {
   const {page,context}=await session('tester');await nav(page,'vocab');await page.locator('[data-vl="new"]').click();const key=checkKey(users.tester),saved=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('[data-vocab-library-back]').click();await page.locator('[data-act="vocab-open"][data-view="missions"]').click();await page.locator('#vmStep').waitFor();assert.equal(await page.locator('[data-vocab-mission-id="coast"]').count(),0);await shot(page,'library-linked-mission');await page.locator('[data-vocab-library-back]').click();await page.locator('[data-act="vocab-open"][data-view="check"]').click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),saved);await page.locator('[data-act="lib-tab"][data-v="cam"]').click();await page.reload();assert.equal(await page.locator('[data-act="lib-tab"][data-v="cam"]').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#v-vocab').isVisible(),false);await context.close();
  }
  logs.push('PASS typed draft reload, read-only Check input, logout clears old DOM/controllers and a second account starts separately');
  {
   const {page,context}=await session('tester');await page.goto(base+'/vocab-mission-preview.html?mission=authored-save-the-coast');await page.locator('[data-vm="begin"]').click();await page.locator('.vm-report').waitFor();
   await page.evaluate(()=>{const request=navigator.locks.request.bind(navigator.locks);let pause=true;navigator.locks.request=(name,fn)=>{if(pause&&name.includes('sandbox-a%40')){pause=false;return new Promise(resolve=>{window.releaseOldMission=()=>resolve(request(name,fn))})}return request(name,fn)}});
   await page.locator('[data-vm="full"]').click();await page.waitForFunction(()=>typeof window.releaseOldMission==='function');
   await page.selectOption('#identity','b');await page.locator('[data-vm="begin"]').click();await page.locator('.vm-report').waitFor();
   await page.evaluate(()=>window.releaseOldMission());await page.waitForFunction(()=>{const key='md-vocab-mission:v1:sandbox-a%40local.invalid:authored-save-the-coast:authored';return JSON.parse(localStorage.getItem(key)).revealed===5});assert.equal(await page.locator('.vm-report-paragraph').innerText(),'');
   await context.close();
  }
  logs.push('PASS in-flight save/account switch race: old account cannot append its report into the new account screen');
  {
   const {page:a,context}=await session('tester',1280,'light',missionState(users.tester,'investigate'));await a.locator('#vmStep').waitFor();const b=await context.newPage();await b.goto(base+'/index.html#vocab');await b.locator('[data-vl="mission"]').click();await b.locator('#vmStep').waitFor();
   await a.locator('[data-vm="hint"]').click();await a.locator('.vm-feedback').waitFor();const latest=await a.evaluate(k=>localStorage.getItem(k),missionKey(users.tester));
   await b.locator('[data-vm="hint"]').click();await b.waitForFunction(()=>document.querySelector('.vm-save [role="status"]').textContent.includes('Another tab'));assert.equal(await b.evaluate(k=>localStorage.getItem(k),missionKey(users.tester)),latest);await context.close();
  }
  logs.push('PASS two real tabs: stale mission save loads latest snapshot and does not overwrite the winner');
  {
   const {page,context}=await session('tester');await nav(page,'vocab');await page.locator('[data-vl="know"]').waitFor();
   await page.evaluate(()=>{
    const docs={},listeners=[],snapshot=p=>({exists:!!docs[p],data:()=>JSON.parse(JSON.stringify(docs[p]))});window.integrationWrites=[];
    window.firebase={auth:()=>({currentUser:{uid:'isolated-mock-uid'}})};
    const db={doc:p=>({path:p,onSnapshot(ok){listeners.push(()=>ok(snapshot(p)));setTimeout(()=>ok(snapshot(p)),0);return ()=>{}}}),runTransaction:async fn=>{const writes=[];const result=await fn({get:async ref=>snapshot(ref.path),set:(ref,d)=>writes.push([ref.path,JSON.parse(JSON.stringify(d))]),delete:ref=>writes.push([ref.path,null])});writes.forEach(([p,d])=>{integrationWrites.push(p);if(d)docs[p]=d;else delete docs[p]});listeners.forEach(fn=>fn());return result}};
    MD_VOCAB_SHELL.mount(document.getElementById('v-vocab'),{user:{email:'cloud-shell@local.invalid',role:'student',tester:true},demo:false,db});
   });
   await page.locator('[data-vl="know"]').waitFor();await page.locator('.vocab-preview-bar summary').click();assert.match(await page.locator('.vocab-preview-bar').innerText(),/save\/sync are unavailable online/);
   await page.locator('[data-vl="new"]').click();await page.getByText('Saved to your account.',{exact:true}).waitFor();
   const writes=await page.evaluate(()=>integrationWrites);assert.ok(writes.length>0&&writes.every(p=>p.startsWith('student_')&&p.includes('isolated-mock-uid__')));assert.ok(!writes.some(p=>/mission|writing|cards|errors/.test(p)));assert.equal(await page.locator('[data-vl="mission"]').count(),0);
   await shot(page,'account-check-online-mode');await page.evaluate(()=>{firebase.auth=()=>({currentUser:{uid:'replacement-uid'}});MD_VOCAB_SHELL.guard({email:'cloud-shell@local.invalid',role:'student',tester:true})});assert.equal(await page.locator('#v-vocab').innerText(),'');await context.close();
  }
  logs.push('PASS non-demo shell with Firestore double: Check uses authenticated UID paths, Mission unavailable notice, no Mission/XP/Writing writes');
  for(const role of ['student','tester']){
   const {page,context}=await session(role);await nav(page,'library');await page.locator('[data-act="lib-tab"][data-v="lm"]').click();
   if(role==='student'){
    assert.equal(await page.locator('.lm-writing .lmhd').isDisabled(),true);assert.match(await page.locator('.lm-writing').innerText(),/Coming soon/);
    await page.evaluate(()=>{const b=document.createElement('button');b.dataset.act='lm-open';b.dataset.id='lm-writing-ac-t1-u2';document.body.appendChild(b);b.click();b.remove()});assert.equal(await page.locator('.lm-writing .lmhd').isDisabled(),true);
   }else{await page.locator('[data-act="lm-tg"][data-k="m:ielts-academic-task1"]').click();await page.locator('[data-act="lm-open"][data-id="lm-writing-ac-t1-u2"]').click();assert.match(await page.locator('#libBody').innerText(),/Overview/)}
   await shot(page,'writing-access-'+role);await context.close();
  }
  logs.push('PASS unchanged Writing: ordinary student Coming Soon/direct unit blocked; tester opens existing unpublished Unit 2');
  {
   const {page,context}=await session('student');await page.locator('#tabs').waitFor();
   assert.equal(await page.evaluate(()=>MD_MISSION.eligible({adm:true},false)),false);
   assert.equal(await page.evaluate(()=>MD_MISSION.eligible(null,true)),false);
   // Force a non-local URL through the same test server; this is an offline browser origin simulation.
   await page.route('http://preview.example.invalid/**',async route=>{const p=new URL(route.request().url()).pathname;return route.fulfill({status:200,contentType:p.endsWith('.js')?'application/javascript':'text/html',body:p==='/vocab-mission-preview.html'?fs.readFileSync(path.join(root,p),'utf8'):fs.readFileSync(path.join(root,p),'utf8')})});
   await page.goto('http://preview.example.invalid/vocab-mission-preview.html');await page.locator('#missionHost').waitFor();assert.match(await page.locator('#missionHost').innerText(),/local admin\/tester/);await context.close();
  }
  logs.push('PASS real mode and remote-origin Mission remain blocked; no experimental cloud saves enabled');
  assert.deepEqual(errors,[]);assert.ok(!network.some(u=>/firestore|identitytoolkit|firebaseio/.test(u)));fs.writeFileSync(path.join(out,'browser-results.txt'),logs.join('\n')+'\n');fs.writeFileSync(path.join(out,'screenshots.json'),JSON.stringify(shots,null,2));console.log(logs.join('\n'));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
