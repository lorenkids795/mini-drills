'use strict';
const fs=require('node:fs'),path=require('node:path');
const {PIN,ProbeError,fail,validateEnvironment}=require('./policy.cjs');
const CONFIRM='READ_METADATA_ONLY:'+PIN.resource;
function parse(args){
 if(args.length===0||args.length===1&&args[0]==='--plan')return {mode:'plan'};
 if(args.length!==5||args[0]!=='--live-metadata-read'||args[1]!=='--credential-file'||args[3]!=='--confirm'||args[4]!==CONFIRM)fail('ARGUMENTS_DENIED');
 if(!path.isAbsolute(args[2]))fail('CREDENTIAL_PATH_DENIED');
 return {mode:'live',credentialFile:args[2]};
}
function loadCredential(filename){
 try{
  const actual=fs.realpathSync(filename),root=fs.realpathSync(path.resolve(__dirname,'../..'));
  const relative=path.relative(root,actual);
  if(!relative||!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))fail('CREDENTIAL_PATH_DENIED');
  const stat=fs.statSync(actual);
  if(!stat.isFile()||stat.size>16384)fail('CREDENTIAL_FILE_DENIED');
  return JSON.parse(fs.readFileSync(actual,'utf8'));
 }catch(e){if(e instanceof ProbeError)throw e;fail('CREDENTIAL_FILE_DENIED')}
}
async function main(args=process.argv.slice(2),env=process.env){
 const options=parse(args);
 if(options.mode==='plan')return {status:'OFFLINE_PLAN',resource:PIN.resource,serviceAccount:PIN.serviceAccount,cloudRequests:0,live:'NOT_TESTED',requiredApproval:'Explicit manual credential preparation, token minting and one metadata GET'};
 validateEnvironment(env); // Before credential reads, auth exchange or network initialization.
 const credential=loadCredential(options.credentialFile);
 const {probe}=require('./core.cjs'),{transport}=require('./transport.cjs');
 return probe({target:{projectId:PIN.projectId,databaseId:PIN.databaseId,resource:PIN.resource,serviceAccount:PIN.serviceAccount},credential,environment:env},transport);
}
if(require.main===module)main().then(result=>process.stdout.write(JSON.stringify(result)+'\n')).catch(error=>{
 // Never print raw errors, stacks, paths, response bodies, tokens or ADC.
 const code=error instanceof ProbeError?error.code:'PROBE_FAILED';
 process.stderr.write(JSON.stringify({status:'FAIL',code})+'\n');process.exitCode=1;
});
module.exports={parse,loadCredential,main};
