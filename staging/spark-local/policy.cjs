'use strict';
// Constants cannot be overridden by environment variables or HTTP input.
const PIN=Object.freeze({projectId:'mini-drills-vocab-staging',databaseId:'(default)',origin:'http://localhost:18790',namespace:'vocab31_spark_fixture_runs',serviceAccount:'vocab-spark-runtime@mini-drills-vocab-staging.iam.gserviceaccount.com'});
function validate(config,env=process.env){
 if(!config||Object.keys(PIN).some(k=>config[k]!==PIN[k]))throw Error('Pinned staging configuration required');
 if(!/^fx31_[a-z0-9_-]{4,60}$/.test(config.runId)||!['fx31_alpha','fx31_beta'].includes(config.lessonId))throw Error('Synthetic scope required');
 for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','FIREBASE_PROJECT_ID'])if(env[key]&&env[key]!==PIN.projectId)throw Error('Conflicting project environment');
 for(const key of ['FIREBASE_CONFIG','FIREBASE_DATABASE_URL','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_HOST'])if(env[key])throw Error('Mixed environment forbidden');
 return Object.freeze({...PIN,runId:config.runId,lessonId:config.lessonId});
}
function offlinePreflight(config,env={}){
 const checked=validate(config,env);
 return {configuration:'PASS',projectId:checked.projectId,databaseId:checked.databaseId,cloudEnabled:false,writesEnabled:false,liveAuth:'NOT_TESTED',liveIAM:'NOT_TESTED',billing:'NOT_VERIFIED'};
}
// Shape validation only; never reads credentials or obtains an access token.
function validateImpersonationMetadata(meta){
 if(!meta||meta.type!=='impersonated_service_account'||meta.targetPrincipal!==PIN.serviceAccount||meta.quotaProjectId!==PIN.projectId||meta.hasPrivateKey!==false)throw Error('Pinned keyless impersonation required');
 return true;
}
module.exports={PIN,validate,offlinePreflight,validateImpersonationMetadata};
