'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=path.join(root,'qa-artifacts/recovery-implementation'),out=path.join(root,'docs/main-baseline-recovery-implementation'),groups=['admin','reading','homework','assistant','cleanup','writing'],hash=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out,{recursive:true});
const git=(cwd,...args)=>cp.execFileSync('git',['-c','core.autocrlf=false',...args],{cwd,encoding:'utf8',maxBuffer:32e6}).trimEnd();
const manifest={main:git(root,'rev-parse','origin/main'),feature:git(root,'rev-parse','HEAD'),reference:git(root,'rev-parse','origin/main^'),order:groups,patches:[],runs:[],baselineClean:!git(path.join(base,'baseline'),'status','--porcelain')};
if(manifest.main!=='5a0c18b3fa35c6ae0f284cc2e5e7c7e5355152ed')throw Error('Baseline advanced');
for(const group of groups){const p=path.join(base,'patches',group+'.patch'),text=fs.readFileSync(p),meta=JSON.parse(fs.readFileSync(path.join(base,'snapshots',group,'after.json')));fs.copyFileSync(p,path.join(out,group+'.patch'));fs.copyFileSync(path.join(base,'snapshots',group,'changes.json'),path.join(out,group+'-changes.json'));manifest.patches.push({group,sha256:hash(text),...meta});if(!meta.noSourceChange){git(path.join(base,'replay'),'apply','--check',p);git(path.join(base,'replay'),'apply',p)}}
for(const p of ['index.html','functions/api/[[path]].js']){if(!fs.readFileSync(path.join(base,'candidate',p)).equals(fs.readFileSync(path.join(base,'replay',p))))throw Error('Replay differs: '+p)}
manifest.patchReplayExact=true;manifest.featureRuntimeUnchanged=!git(root,'diff','HEAD','--','index.html','functions','data','lm-engine.js','lm-unit0.js','lm-unit2.js','firestore.rules','md-backend.js','vocab-*.js');
const region=s=>{const a=s.indexOf('/* ---------- Library › Learning Materials'),b=s.indexOf('function renderLib(){',a);if(a<0||b<a)throw Error('Missing Writing boundary');return s.slice(a,b)};
manifest.writingRegionUnchanged=region(fs.readFileSync(path.join(base,'baseline/index.html'),'utf8'))===region(fs.readFileSync(path.join(base,'candidate/index.html'),'utf8'));
manifest.protectedAssetsUnchanged=!git(path.join(base,'candidate'),'diff','--name-only','--','data','lm-engine.js','lm-unit0.js','lm-unit2.js','firestore.rules','md-backend.js','md-config.js','tests');
for(const label of fs.readdirSync(base).filter(x=>x.endsWith('-results'))){const r=JSON.parse(fs.readFileSync(path.join(base,label,'report.json')));manifest.runs.push({label:r.label,commands:r.commands,passed:r.passedCommands,counts:r.counts});fs.copyFileSync(path.join(base,label,'report.json'),path.join(out,label+'.json'))}
for(const group of ['admin','reading','homework','assistant','cleanup','cleanup-2','writing','writing-2']){const p=path.join(base,'browser-'+group,'report.json');if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,'browser-'+group+'.json'))}
fs.copyFileSync(path.join(base,'additional-final.txt'),path.join(out,'additional-tests.txt'));
for(const label of ['round-1-focused-unit','round-1-focused-batch','round-2-focused-batch'])fs.copyFileSync(path.join(root,'qa-artifacts/main-recovery-implementation',label,'report.json'),path.join(out,'vocab-'+label+'.json'));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest,null,2));
