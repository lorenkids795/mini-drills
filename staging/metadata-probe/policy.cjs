'use strict';
const PIN=Object.freeze({
 projectId:'mini-drills-vocab-staging',
 databaseId:'(default)',
 resource:'projects/mini-drills-vocab-staging/databases/(default)',
 serviceAccount:'vocab-spark-runtime@mini-drills-vocab-staging.iam.gserviceaccount.com',
 locationId:'asia-southeast1',
 scope:'https://www.googleapis.com/auth/datastore'
});
const ENDPOINTS=Object.freeze({
 oauth:'https://oauth2.googleapis.com/token',
 impersonation:'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+PIN.serviceAccount+':generateAccessToken',
 metadata:'https://firestore.googleapis.com/v1/'+PIN.resource
});
class ProbeError extends Error{
 constructor(code){super(code);this.name='ProbeError';this.code=code}
}
const fail=code=>{throw new ProbeError(code)};
function validateTarget(target){
 if(!target||Object.keys(target).length!==4||target.projectId!==PIN.projectId||target.databaseId!==PIN.databaseId||target.resource!==PIN.resource||target.serviceAccount!==PIN.serviceAccount)fail('TARGET_DENIED');
}
function validateEnvironment(env){
 for(const [key,value] of Object.entries(env)){
  if(!value)continue;
  if(/^(GOOGLE_|GCLOUD_|FIREBASE_|FIRESTORE_|CLOUDSDK_)/.test(key)||['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','NODE_OPTIONS','NODE_DEBUG','NODE_DEBUG_NATIVE','NODE_TLS_REJECT_UNAUTHORIZED','NODE_EXTRA_CA_CERTS','SSLKEYLOGFILE'].includes(key))fail('ENVIRONMENT_DENIED');
 }
}
function validateCredential(adc){
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!object(adc)||adc.type!=='impersonated_service_account'||adc.service_account_impersonation_url!==ENDPOINTS.impersonation||adc.quota_project_id!==PIN.projectId)fail('CREDENTIAL_DENIED');
 if(Object.keys(adc).some(k=>!['type','service_account_impersonation_url','quota_project_id','source_credentials','delegates'].includes(k)))fail('CREDENTIAL_DENIED');
 if(adc.delegates!==undefined&&(!Array.isArray(adc.delegates)||adc.delegates.length))fail('CREDENTIAL_DENIED');
 const source=adc.source_credentials;
 if(!object(source)||source.type!=='authorized_user'||Object.keys(source).some(k=>!['type','client_id','client_secret','refresh_token'].includes(k)))fail('CREDENTIAL_DENIED');
 for(const key of ['client_id','client_secret','refresh_token'])if(typeof source[key]!=='string'||!source[key]||source[key].length>8192)fail('CREDENTIAL_DENIED');
 // Return only the exact source fields needed for the OAuth refresh exchange.
 return {clientId:source.client_id,clientSecret:source.client_secret,refreshToken:source.refresh_token};
}
function validateToken(token){
 if(typeof token!=='string'||token.length<8||token.length>16384||!/^[A-Za-z0-9._~+/-]+={0,2}$/.test(token))fail('TOKEN_RESPONSE_INVALID');
 return token;
}
function metadataResult(data){
 if(!data||data.name!==PIN.resource||data.locationId!==PIN.locationId||data.type!=='FIRESTORE_NATIVE')fail('METADATA_MISMATCH');
 if(data.databaseEdition!==undefined&&data.databaseEdition!=='STANDARD')fail('METADATA_MISMATCH');
 return {
  status:'PASS_METADATA_ONLY',resource:PIN.resource,locationId:PIN.locationId,type:'FIRESTORE_NATIVE',
  databaseEdition:data.databaseEdition??'NOT_RETURNED',editionVerification:data.databaseEdition==='STANDARD'?'PASS':'NOT_VERIFIED',
  credentialProvenance:'IAM_GENERATE_ACCESS_TOKEN_FOR_PINNED_SERVICE_ACCOUNT',
  serviceAccount:PIN.serviceAccount,dataRead:false,dataWritten:false,
  liveFirebaseAuth:'NOT_TESTED',billing:'NOT_VERIFIED',rules:'NOT_VERIFIED'
 };
}
module.exports={PIN,ENDPOINTS,ProbeError,fail,validateTarget,validateEnvironment,validateCredential,validateToken,metadataResult};
