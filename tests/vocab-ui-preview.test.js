'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),B=require('../tools/build-vocab-ui-preview.cjs');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'md-ui-preview-test-'));
test('reproducible allowlist build; every output byte matches the manifest and audited inputs',()=>{
 const a=temp(),b=temp();B.build(a);B.build(b);assert.equal(B.PATHS.length,21);for(const p of B.PATHS)assert.ok(fs.readFileSync(path.join(a,p)).equals(fs.readFileSync(path.join(b,p))));assert.equal(B.verify(a).files.length,20);
});
test('unknown backend/config/Functions files or directories fail both verification and rebuild',()=>{
 for(const file of ['md-config.js','md-backend.js','functions/api.js','unexpected.txt']){const a=temp();B.build(a);fs.mkdirSync(path.dirname(path.join(a,file)),{recursive:true});fs.writeFileSync(path.join(a,file),'unsafe');assert.throws(()=>B.verify(a),/Unexpected|allowlist/);assert.throws(()=>B.build(a),/Unexpected/)}
});
test('tampered bytes, manifest or missing assets fail verification',()=>{
 for(const p of ['preview.js','manifest.json','data/vocab-lab-p1.json']){const a=temp();B.build(a);fs.writeFileSync(path.join(a,p),'tampered');assert.throws(()=>B.verify(a),/hash mismatch/)}
 const a=temp();B.build(a);fs.unlinkSync(path.join(a,'preview.css'));assert.throws(()=>B.verify(a),/allowlist/);
});
test('compiled Check has no cloud adapter; production mission retains its localhost guard',()=>{
 const out=B.compile();assert.ok(!/MD_VOCAB_STORE|root\.firebase|claude\.use|opt\.db/.test(out['vocab-lab.js'].toString()));assert.ok(out['vocab-mission.js'].toString().includes('MD_UI_ONLY_PREVIEW===true'));
 assert.ok(fs.readFileSync(path.join(B.ROOT,'vocab-mission.js'),'utf8').includes('local()&&demo===true'));assert.ok(!B.PATHS.some(p=>/backend|config|functions|rules|roster/.test(p)));
});
test('component transform fails closed when a cloud boundary drifts',()=>{
 const sandbox={module:{exports:{}},__dirname:path.join(B.ROOT,'tools'),process:{argv:[]},require:n=>n==='node:fs'?{...fs,readFileSync(p,...args){const value=fs.readFileSync(p,...args);return String(p).endsWith('vocab-lab.js')?value.toString().replace('return Promise.resolve(opt.db','return changedCloud(opt.db'):value}}:require(n)};
 vm.runInNewContext(fs.readFileSync(path.join(B.ROOT,'tools/build-vocab-ui-preview.cjs'),'utf8'),sandbox);assert.throws(()=>sandbox.module.exports.compile(),/Cloud adapter boundary changed/);
});
test('local review server serves only dist and denies backend/API paths and writes',async()=>{
 B.build();const server=require('../tools/serve-vocab-ui-preview.cjs').createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/default-src 'none'/);assert.match(await page.text(),/UI-only Vocab demo/);for(const p of ['/md-config.js','/md-backend.js','/api/status','/functions/api.js','/index.html?redirect=1'])assert.equal((await fetch(base+p)).status,403);assert.equal((await fetch(base+'/',{method:'POST',body:'no writes'})).status,403)}finally{await new Promise(r=>server.close(r))}
});
