'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa-artifacts/phase29-followup');
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function build(){
  const audit=require('./vocab-integration-candidate.cjs').build();
  const mainDir=path.join(out,'main'),candidateDir=path.join(out,'candidate');
  const paths=git('ls-tree','-r','--name-only',audit.main).toString().trim().split('\n').filter(p=>!p.startsWith('mini-drills/'));
  for(const p of paths){
    if(p.startsWith('mini-drills/')||p.includes('..')||path.isAbsolute(p))throw Error('Unexpected export path');
    const b=git('show',audit.main+':'+p);
    for(const dir of [mainDir,candidateDir]){fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),b)}
  }
  const before=fs.readFileSync(path.join(root,audit.candidateDirectory,'index.html'),'utf8');
  const after=require('../integration/writing-policy.cjs').apply(before);
  fs.writeFileSync(path.join(candidateDir,'index.html'),after);
  // Add only Vocab runtime assets; current-main files and tests always win.
  const vocab=git('ls-files').toString().trim().split('\n').filter(p=>/^vocab-[^/]+\.(js|css)$/.test(p)||/^data\/vocab-.*\.json$/.test(p));
  for(const p of vocab){if(paths.includes(p))throw Error('Vocab asset now exists on main; review required: '+p);fs.mkdirSync(path.dirname(path.join(candidateDir,p)),{recursive:true});fs.copyFileSync(path.join(root,p),path.join(candidateDir,p))}
  const proposalBefore=path.join(out,'main-index.html'),proposalAfter=path.join(out,'proposed-index.html');
  const mainHtml=git('show',audit.main+':index.html').toString();fs.writeFileSync(proposalBefore,mainHtml);fs.writeFileSync(proposalAfter,require('../integration/writing-policy.cjs').apply(mainHtml));
  const diff=cp.spawnSync('git',['diff','--no-index','--',proposalBefore,proposalAfter],{encoding:'utf8'});if(![0,1].includes(diff.status))throw Error(diff.stderr);fs.writeFileSync(path.join(out,'writing-policy-TEACHER_REVIEW.patch'),diff.stdout);
  const unchanged=paths.filter(p=>p!=='index.html').every(p=>fs.readFileSync(path.join(mainDir,p)).equals(fs.readFileSync(path.join(candidateDir,p))));if(!unchanged)throw Error('Main asset drift');
  const report={main:audit.main,feature:audit.feature,candidateDir,mainDir,mainFilesUnmodifiedExceptIndex:unchanged,mainFileCount:paths.length,policyChanges:2,proposalStatus:'TEACHER_REVIEW before actual integration',candidateSha256:hash(after),mainSha256:hash(mainHtml),addedVocabAssets:vocab,mainTests:paths.filter(p=>/^tests\/.*\.test\.js$/.test(p))};
  fs.writeFileSync(path.join(out,'build.json'),JSON.stringify(report,null,2));return report;
}
if(require.main===module)console.log(build());module.exports={build};
