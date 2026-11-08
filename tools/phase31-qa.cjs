'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
require('../staging/environment.cjs').guard();
if(process.env.GCLOUD_PROJECT!=='demo-mini-drills-vocab-test')throw Error('Dedicated emulator test project required');
const root=path.resolve(__dirname,'..'),name=process.argv[2];if(!/^[a-z0-9-]+$/.test(name||''))throw Error('Unique evidence run name required');
const git=(...a)=>cp.execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
if(git('branch','--show-current')!=='integration/vocab-lab-candidate-2026-11-07')throw Error('Integration branch required');
const out=path.join(root,'qa-artifacts/phase31',name);if(fs.existsSync(out))throw Error('Evidence must not be overwritten');fs.mkdirSync(out,{recursive:true});
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const files=git('ls-files','--cached','--others','--exclude-standard').split('\n').filter(f=>/^(staging\/|tools\/phase31-qa.cjs$)/.test(f));
const hashes=()=>Object.fromEntries(files.map(f=>[f,digest(f)])),before=hashes(),steps=[];
for(const [id,file,count]of [['phase31','staging/phase31/qa.cjs',15],['contracts','staging/tests/contracts.cjs',3]]){
 const r=cp.spawnSync(process.execPath,['--test','--test-timeout=180000',file],{cwd:root,env:{...process.env,PHASE31_QA_OUTPUT:out},encoding:'utf8',timeout:240000,maxBuffer:4e6,windowsHide:true});
 const log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,id+'.txt'),log);const tests=Number(log.match(/tests (\d+)/)?.[1]||0);steps.push({id,tests,exitCode:r.status,status:r.status===0&&tests===count?'PASS':'FAIL',error:r.error?.message||null});console.log(steps.at(-1));if(steps.at(-1).status!=='PASS')break;
}
const unchanged=JSON.stringify(before)===JSON.stringify(hashes());
const report={branch:git('branch','--show-current'),baseCommit:git('rev-parse','HEAD'),at:new Date().toISOString(),projectId:process.env.GCLOUD_PROJECT,steps,sourceHashes:before,sourceUnchangedDuringQA:unchanged,status:steps.length===2&&steps.every(s=>s.status==='PASS')&&unchanged?'PASS':'FAIL'};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));process.exitCode=report.status==='PASS'?0:1;
