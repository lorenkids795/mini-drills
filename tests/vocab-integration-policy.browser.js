'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'qa-artifacts/phase29-followup/candidate'),out=path.join(root,'qa-artifacts/phase29-followup/policy-browser');fs.mkdirSync(out,{recursive:true});
const users={admin:'admin@demo.vn',tester:'policy-tester@local.invalid',student:'minhanh@demo.vn'};
let html=fs.readFileSync(path.join(dir,'index.html'),'utf8').replace('var rosterDocs=[],localRoster=null;',"DEMO_ROSTER.push({email:'"+users.tester+"',name:'Policy Tester',role:'student',tester:true,cls:'Class 6.0-A'});var rosterDocs=[],localRoster=null;");
const a=html.indexOf('<script>\n(function(){'),end=html.indexOf('</script>',a),close=html.lastIndexOf('})();',end);
assert.ok(a>=0&&close>a);
const hook="window.__iq={user:function(){return U},forged:function(){U=Object.assign({},U,{tester:true})},revoke:function(){DEMO_ROSTER.forEach(function(r){if(r.email===U.email)r.tester=false})},published:function(){MD_LM.lessons.forEach(function(l){l.status='published'})},view:function(){LIBT='lm';LMV=null;showTab('library')},getLMV:function(){return LMV},setLMV:function(v){LMV=v;renderLib()},reading:function(){var r=parseReading(JSON.parse(EXAMPLE_R));renderRLesson({id:'qa-reading',skill:'reading',title:'Fixture reading',kind:'reading-ms',rl:r.data.rlesson,qs:r.data.qs},'','',null)},tab:showTab};\n";
html=html.slice(0,close)+hook+html.slice(close);
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(dir,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(dir+path.sep)){res.writeHead(403);return res.end()}try{const b=p==='/'||p==='/index.html'?html:p==='/md-config.js'?'window.MD_CONFIG={demo:true,teachers:[],api:"/blocked-api"}':p==='/md-backend.js'?'/* isolated */':fs.readFileSync(f);res.setHeader('Content-Type',/\.js$/.test(p)?'application/javascript':/\.css$/.test(p)?'text/css':/\.json$/.test(p)?'application/json':'text/html');res.end(b)}catch{res.writeHead(404);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({channel:'msedge',headless:true}),checks=[],errors=[];
try{
 for(const width of [390,768,1280])for(const theme of ['light','dark'])for(const role of ['student','tester','admin']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(({email,theme})=>{localStorage.setItem('md-email',email);localStorage.setItem('md-theme',theme)},{email:users[role],theme});
  await page.goto(base+'/#library/learning-materials/lm-writing-ac-t1-u2');await page.waitForFunction(()=>!!window.__iq?.user());await page.evaluate(()=>__iq.view());
  const open=async()=>page.evaluate(()=>{const b=document.createElement('button');b.dataset.act='lm-open';b.dataset.id='lm-writing-ac-t1-u2';document.body.appendChild(b);b.click();b.remove()});
  if(role==='student'){
   assert.equal(await page.locator('.lm-writing .lmhd').isDisabled(),true);assert.match(await page.locator('.lm-writing').innerText(),/Coming soon/i);await open();assert.equal(await page.evaluate(()=>__iq.getLMV()),null);
   await page.evaluate(()=>{__iq.forged();__iq.published();__iq.setLMV('lm-writing-ac-t1-u2')});assert.equal(await page.evaluate(()=>__iq.getLMV()),null);await open();assert.equal(await page.evaluate(()=>__iq.getLMV()),null);
   await page.reload();await page.waitForFunction(()=>!!window.__iq?.user());await page.evaluate(()=>__iq.view());assert.equal(await page.locator('.lm-writing .lmhd').isDisabled(),true);
   assert.equal(await page.locator('#tabs [data-tab="admin"]').count(),0);await page.evaluate(()=>__iq.tab('admin'));assert.equal(await page.locator('#v-admin').innerText(),'');await page.evaluate(()=>__iq.tab('library'));assert.ok(await page.locator('.hw').count()>0);
  }else{
   assert.equal(await page.locator('.lm-writing .lmhd').isDisabled(),false);await page.locator('[data-act="lm-tg"][data-k="m:ielts-academic-task1"]').click();await page.locator('[data-act="lm-open"][data-id="lm-writing-ac-t1-u2"]').click();assert.match(await page.locator('#libBody').innerText(),/Overview/);
   if(role==='tester'){await page.evaluate(()=>{__iq.revoke();__iq.setLMV('lm-writing-ac-t1-u2')});assert.equal(await page.evaluate(()=>__iq.getLMV()),null);assert.equal(await page.locator('.lm-writing .lmhd').isDisabled(),true)}
   else{await page.evaluate(()=>__iq.tab('admin'));assert.match(await page.locator('#v-admin').innerText(),/Admin/);await page.evaluate(()=>__iq.tab('asg'));assert.match(await page.locator('#v-asg').innerText(),/class/i)}
  }
  await page.evaluate(()=>{__iq.tab('library');__iq.reading()});assert.equal(await page.locator('.pane.rm').count(),1);assert.ok((await page.locator('.pane.rm').innerText()).length>100);await page.screenshot({path:path.join(out,role+'-'+width+'-'+theme+'.png'),fullPage:true});checks.push({role,width,theme,status:'PASS'});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',checks,limitations:['Browser smoke covers existing Reading renderer, Homework card and Admin/Class navigation only; advanced main features are assessed by unmodified main scripts.','Synthetic demo roster, not signed-token security.']},null,2));console.log('PASS 18 browser scenarios: Writing roles/direct actions/URL/reload/forged flag/revocation; Reading/Homework/Admin smoke; mobile/light/dark');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
