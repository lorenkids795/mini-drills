'use strict';
// Explicit local operator only. No HTTP endpoints grant provisioning/lock/restore rights.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {connect}=require('../environment.cjs'),R=require('./runtime.cjs'),B=require('./backup.cjs'),{LESSONS}=require('./fixtures.cjs');
async function main(){
 const [action,run,arg]=process.argv.slice(2);if(!['init','lock','unlock','snapshot','restore'].includes(action))throw Error('Use init|lock|unlock|snapshot|restore <fx31_run> [snapshot.json]');
 const c=connect();try{
  R.runRef(c,run);
  if(action==='init'){
   await R.createRun(c,run);const accounts=[];
   for(const role of ['admin','teacher','tester','student']){const uid=run+'_'+role,password=crypto.randomUUID()+'Aa1!';await c.auth.createUser({uid,email:uid+'@local.invalid',password});for(const lesson of LESSONS)await R.provision(c,run,uid,role,lesson);accounts.push({email:uid+'@local.invalid',password,role})}
   console.log(JSON.stringify({emulatorOnly:true,runId:run,accounts},null,2));
  }else if(action==='lock'||action==='unlock'){await R.lock(c,run,action==='lock');console.log(action+' '+run)}
  else if(action==='snapshot'){
   const snapshot=await B.snapshot(c,run),dir=path.resolve(__dirname,'../../qa-artifacts/phase31/backups');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,run+'-'+Date.now()+'.json');fs.writeFileSync(file,JSON.stringify(snapshot,null,2),{flag:'wx'});console.log(file);
  }else{if(!arg)throw Error('Snapshot file required');console.log(await B.restore(c,run,JSON.parse(fs.readFileSync(arg,'utf8'))))}
 }finally{await c.db.terminate();const deps=require('node:module').createRequire(path.resolve(process.env.VOCAB_EMULATOR_RUNTIME||path.join(__dirname,'../../tools/emulator-runtime'),'package.json'));await deps('firebase-admin/app').deleteApp(c.app)}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
