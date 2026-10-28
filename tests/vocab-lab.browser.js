/* Run with Playwright available via NODE_PATH; no package manager or app dependencies. */
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os');
const root=path.resolve(__dirname,'..'),out=process.env.VOCAB_QA_DIR||path.join(os.tmpdir(),'mini-drills-vocab-qa');
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  try{const data=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});res.end(data)}catch(e){res.writeHead(404);res.end('Not found')}
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:process.env.VOCAB_BROWSER_CHANNEL||'msedge'});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/vocab-lab-preview.html');await page.locator('[data-vl="know"]').waitFor();
    const first=await page.locator('.vl-word h4').innerText();
    assert.ok(!(await page.locator('.vl-main').innerText()).includes('a surprisingly fast rate'));
    await page.locator('[data-vl="know"]').focus();await page.keyboard.press('1');
    const second=await page.locator('.vl-word h4').innerText();assert.notEqual(first,second);
    await page.keyboard.press('u');assert.equal(await page.locator('.vl-word h4').innerText(),first);
    await page.locator('[data-vl="know"]').click();await page.reload();await page.locator('[data-vl="know"]').waitFor();
    assert.equal(await page.locator('.vl-word h4').innerText(),second);
    await page.screenshot({path:path.join(out,'desktop-light.png'),fullPage:true});
    await page.locator('#theme').click();await page.screenshot({path:path.join(out,'desktop-dark.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.ok(await page.locator('[data-vl="know"]').evaluate(el=>el.getBoundingClientRect().height>=44));
    await page.screenshot({path:path.join(out,'mobile-dark.png'),fullPage:true});
    await page.locator('#theme').click();await page.screenshot({path:path.join(out,'mobile-light.png'),fullPage:true});
    for(let i=1;i<12;i++)await page.locator('[data-vl="know"]').click();
    await page.locator('[data-vl="startCheck"]').click();
    const firstQ=await page.locator('.vl-context').innerText();
    const bank=require('../data/vocab-lab-practice.json'),q=bank.find(q=>q.context===firstQ),wrong=(q.answer+1)%3;
    await page.locator('[data-vl="answer"]').nth(wrong).click();
    assert.equal(await page.locator('[data-vl="next"]').count(),0);assert.ok(!(await page.locator('.vl-feedback').innerText()).includes(q.explanation));
    await page.reload();await page.locator('.vl-context').waitFor();assert.equal(await page.locator('.vl-context').innerText(),firstQ);
    await page.locator('[data-vl="answer"]').nth(q.answer).click();assert.ok((await page.locator('.vl-feedback').innerText()).includes('Needs practice'));
    await page.locator('[data-vl="next"]').click();
    while(await page.locator('[data-vl="answer"]').count()){
      const context=await page.locator('.vl-context').innerText(),item=bank.find(q=>q.context===context);
      await page.locator('[data-vl="answer"]').nth(item.answer).click();await page.locator('[data-vl="next"]').click();
    }
    assert.ok((await page.locator('.vl-stats').first().innerText()).includes('Needs practice'));
    await page.screenshot({path:path.join(out,'mobile-results.png'),fullPage:true});
    await page.locator('[data-vl="nextBatch"]').click();assert.ok(!(await page.locator('.vl-word h4').innerText()).includes(first));
    await page.selectOption('#sandboxUser','b');await page.locator('[data-vl="know"]').waitFor();assert.equal(await page.locator('.vl-word h4').innerText(),first);
    // Root application: demo config is substituted only in this browser, never saved to md-config.js.
    await page.route('**/md-config.js',r=>r.fulfill({contentType:'application/javascript',body:'window.MD_CONFIG={demo:true,teachers:[],api:"/api"};'}));
    await page.goto(base+'/index.html');await page.locator('[data-act="demo"][data-email="admin@demo.vn"]').click();
    await page.locator('#sbBtn').click();await page.locator('[data-tab="vocab"]').click();await page.locator('#v-vocab [data-vl="know"]').waitFor();
    assert.ok(await page.locator('#v-vocab').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,'app-mobile-light.png'),fullPage:true,animations:'disabled'});
    await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await page.screenshot({path:path.join(out,'app-mobile-dark.png'),fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(out,'app-desktop-dark.png'),fullPage:true});
    await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));await page.screenshot({path:path.join(out,'app-desktop-light.png'),fullPage:true});
    // Exercise the real UI + adapter with a local Firestore double. No Firebase network calls.
    async function cloud(){await page.evaluate(()=>{
      const docs=JSON.parse(localStorage.getItem('vl-mock-db')||'{}'),listeners=[];
      const snap=p=>({exists:!!docs[p],data:()=>JSON.parse(JSON.stringify(docs[p]))});
      window.firebase={auth:()=>({currentUser:{uid:'mock-uid'}})};
      const db=window.vocabTestDb={offline:false,doc:p=>({path:p,onSnapshot(ok){listeners.push(()=>ok(snap(p)));setTimeout(()=>ok(snap(p)),0);return ()=>{}}}),runTransaction:async fn=>{
        if(db.offline)throw Error('offline');
        const writes=[];const result=await fn({get:async ref=>snap(ref.path),set:(ref,d)=>writes.push([ref.path,JSON.parse(JSON.stringify(d))]),delete:ref=>writes.push([ref.path,null])});
        writes.forEach(([p,d])=>{if(d)docs[p]=d;else delete docs[p]});localStorage.setItem('vl-mock-db',JSON.stringify(docs));listeners.forEach(fn=>fn());return result;
      }};
      MD_VOCAB.mount(document.getElementById('preview'),{user:{email:'cloud-tester@local.invalid',role:'student',tester:true},db,enabled:false,demo:false});
    });await page.locator('[data-vl="know"]').waitFor()}
    await page.goto(base+'/vocab-lab-preview.html');await page.locator('[data-vl="know"]').waitFor();await cloud();
    await page.locator('[data-vl="know"]').click();await page.getByText('Saved to your account.',{exact:true}).waitFor();
    await page.evaluate(()=>{vocabTestDb.offline=true});await page.locator('[data-vl="new"]').click();
    await page.locator('[data-vl="sync"]').waitFor();assert.equal(await page.locator('[data-vl="know"]').isDisabled(),true);
    const draftWord=await page.locator('.vl-word h4').innerText();
    await page.reload();await page.locator('[data-vl="know"]').waitFor();await cloud();
    await page.locator('[data-vl="sync"]').waitFor();assert.equal(await page.locator('.vl-word h4').innerText(),draftWord);
    await page.locator('[data-vl="sync"]').click();await page.getByText('Saved to your account.',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-vl="know"]').isDisabled(),false);
    assert.deepEqual(errors,[]);console.log('PASS browser: keyboard sort/undo, reload sorting and check retry, account isolation, 390px/1280px light/dark, root-app integration, offline draft/reload/retry via Firestore double, no page errors');
    console.log('Screenshots: '+out);
  }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
