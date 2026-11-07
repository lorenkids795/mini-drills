'use strict';
// Read-only overlay for existing browser suites; no application files are changed.
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),dir=path.join(root,'qa-artifacts/phase29/candidate'),read=fs.readFileSync.bind(fs),files=JSON.parse(read(path.join(dir,'main-files.json'),'utf8'));files['index.html']=read(path.join(dir,'index.html'),'utf8');
if(process.env.VOCAB_INTEGRATION_CANDIDATE){const selected=path.resolve(process.env.VOCAB_INTEGRATION_CANDIDATE);if(!selected.startsWith(path.join(root,'qa-artifacts')+path.sep))throw Error('Only ignored local QA candidates allowed');for(const p of Object.keys(files))files[p]=read(path.join(selected,p),'utf8');
 // Main's chart/content and every added Vocab runtime/data asset must come from the candidate too.
 for(const p of fs.readdirSync(selected).filter(p=>/\.(js|css)$/.test(p)))files[p]=read(path.join(selected,p),'utf8');
 if(fs.existsSync(path.join(selected,'data')))for(const p of fs.readdirSync(path.join(selected,'data')).filter(p=>p.endsWith('.json')))files['data/'+p]=read(path.join(selected,'data',p),'utf8');
 // Existing tests mock unversioned config URLs. Match that same fixture when main adds a cache query.
 // Preserve the outer QA transport guard and every test callback/assertion; never rewrite candidate HTML.
 const {chromium}=require('playwright'),launch=chromium.launch.bind(chromium),seen=new WeakSet();
 const pattern=p=>typeof p==='string'&&/^\*\*\/md-(config|backend)\.js$/.test(p)?url=>url.pathname==='/'+p.slice(3):p;
 function wrap(target){if(seen.has(target))return;seen.add(target);const route=target.route.bind(target);target.route=(p,h,o)=>route(pattern(p),h,o)}
 chromium.launch=async options=>{const browser=await launch(options),create=browser.newContext.bind(browser),page=browser.newPage.bind(browser);browser.newContext=async options=>{const context=await create(options);wrap(context);context.on('page',wrap);context.pages().forEach(wrap);return context};browser.newPage=async options=>{const p=await page(options);wrap(p);return p};return browser};
}
const map=new Map(Object.entries(files).map(([p,s])=>[path.resolve(root,p).toLowerCase(),Buffer.from(s)]));fs.readFileSync=function(p,opt){const v=typeof p==='string'&&map.get(path.resolve(p).toLowerCase());if(!v)return read(p,opt);const encoding=typeof opt==='string'?opt:opt?.encoding;return encoding?v.toString(encoding):Buffer.from(v)};
