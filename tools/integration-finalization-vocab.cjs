'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),L=require('./vocab-qa-lib.cjs'),{execute}=require('./vocab-qa-runner.cjs');
const root=path.resolve(__dirname,'..'),base=path.join(root,'qa-artifacts/integration-finalization'),build=JSON.parse(fs.readFileSync(path.join(base,'build.json'))),round=process.argv[2]||'1';
if(!/^[1-3]$/.test(round))throw Error('Maximum three rounds');const dir=path.join(base,'vocab-browser-round-'+round);if(fs.existsSync(dir))throw Error('Immutable run exists');fs.mkdirSync(path.join(dir,'logs'),{recursive:true});
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(build.candidateDir,'index.html'))).digest('hex');
(async()=>{const before=hash(),env={...process.env,NODE_PATH:path.join(root,'tools/qa-runtime/node_modules'),VOCAB_QA_BROWSER:'msedge',VOCAB_INTEGRATION_CANDIDATE:build.candidateDir,VOCAB_QA_NETWORK_DIR:path.join(dir,'network')};
for(const [key,name] of Object.entries({VOCAB_BATCH_QA_DIR:'batch',VOCAB_REALITY_QA_DIR:'reality',VOCAB_MISSION_QA_DIR:'mission',VOCAB_SHELL_QA_DIR:'shell',VOCAB_ENGINE_QA_DIR:'engine',VOCAB_EDITORIAL_QA_DIR:'editorial'}))env[key]=path.join(dir,'browser',name);
const selected=['batch','reality','mission','shell','engine','editorial'],results=[];
for(const step of L.suitePlan(root,{mode:'full'}).filter(s=>selected.includes(s.id))){const r=await execute({...step,args:['--require',path.join(__dirname,'vocab-integration-preload.cjs'),...step.args]},env,dir);results.push(r);console.log(r.id+': '+r.status)}
const network=fs.existsSync(env.VOCAB_QA_NETWORK_DIR)?fs.readdirSync(env.VOCAB_QA_NETWORK_DIR).filter(p=>p.endsWith('.json')).map(p=>JSON.parse(fs.readFileSync(path.join(env.VOCAB_QA_NETWORK_DIR,p)))):[];
const unchanged=before===hash(),pass=unchanged&&results.every(r=>r.status==='PASS')&&selected.every(id=>network.filter(n=>n.suite===id).length===1)&&network.every(n=>n.violations.length===0);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({main:build.main,candidateSha256:before,candidateUnchanged:unchanged,status:pass?'PASS':'FAIL',results,network},null,2));process.exitCode=pass?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
