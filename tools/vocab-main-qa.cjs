'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),base=path.join(root,'qa-artifacts/phase29-followup'),build=JSON.parse(fs.readFileSync(path.join(base,'build.json')));
const round=process.argv[2]||'1';if(!/^[1-3]$/.test(round))throw Error('Maximum three rounds');
const out=path.join(base,'main-qa-round-'+round);if(fs.existsSync(out))throw Error('Immutable run already exists');fs.mkdirSync(out,{recursive:true});
const commands=[...build.mainTests.map(p=>[p]),['tests/contrast.js'],['tests/contrast-rules.js'],['tests/lm-check.js','--release']];
const results=[];
for(const [kind,cwd] of [['main',build.mainDir],['candidate',build.candidateDir]]){
  for(const args of commands){const id=path.basename(args[0]),r=cp.spawnSync(process.execPath,['--require',path.join(root,'staging/loopback-only.cjs'),...args],{cwd,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});const log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,kind+'-'+id+'.txt'),log);const m=[...log.matchAll(/(\d+)\/(\d+) passed/g)].pop();results.push({kind,command:args.join(' '),status:r.status===0?'PASS':'FAIL',exitCode:r.status,counts:m?{passed:+m[1],total:+m[2]}:null,error:r.error?.message||null,log:path.relative(root,path.join(out,kind+'-'+id+'.txt')).replaceAll('\\','/')});console.log(kind+' '+id+': '+(r.status===0?'PASS':'FAIL'))}
}
const report={main:build.main,featureBase:build.feature,sourceIsolation:'All main files exported byte-for-byte; only disposable candidate index policy/Vocab hooks and added Vocab assets differ. Tests unmodified.',results};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
