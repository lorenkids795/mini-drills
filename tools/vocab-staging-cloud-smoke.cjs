'use strict';
// Disabled unless the human supplies a reviewed manifest AND an explicit command/acknowledgement.
// No Auth login, writes, credentials, Firebase initialization or deployment in this smoke test.
const fs=require('node:fs');
function validate(c,env=process.env){
 if(c.approved!==true||env.VOCAB_STAGING_SMOKE_APPROVED!=='mini-drills-vocab-staging')throw Error('BLOCKED: explicit human staging approval required');
 if(c.projectId!=='mini-drills-vocab-staging'||c.firestoreTarget!=='projects/mini-drills-vocab-staging/databases/(default)'||c.syntheticOnly!==true||c.productionFallback!==false)throw Error('BLOCKED: staging-only target required');
 const u=new URL(c.origin);if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash||!u.hostname.startsWith('vocab-staging.')||u.hostname.endsWith('.invalid'))throw Error('BLOCKED: reviewed isolated staging origin required');
 return u.origin;
}
async function run(c,env=process.env,transport=fetch){const origin=validate(c,env),r=await transport(origin+'/staging-health',{redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Staging health unavailable');const d=await r.json();if(d.projectId!==c.projectId||d.mode!=='staging'||d.syntheticOnly!==true)throw Error('Staging identity mismatch');return {status:'PASS',scope:'health-only',projectId:c.projectId,origin};}
if(require.main===module){if(process.argv[2]!=='--run'||!process.argv[3]){console.log('NOT_TESTED: cloud smoke disabled. Requires --run <reviewed config> and VOCAB_STAGING_SMOKE_APPROVED.');process.exitCode=2;}else{const c=JSON.parse(fs.readFileSync(process.argv[3],'utf8').replace(/^\uFEFF/,''));run(c).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1})}}
module.exports={validate,run};
