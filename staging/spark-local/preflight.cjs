'use strict';
const {PIN,offlinePreflight}=require('./policy.cjs');
// Accept parsed synthetic test input only in Step 2. No file discovery, ADC or token call.
function inspectADC(adc){
 const forbidden=new Set(['private_key','private_key_id','client_email']);
 function scan(value){if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){if(forbidden.has(k))throw Error('Service account keys forbidden');scan(v)}}
 scan(adc);
 const target='https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+PIN.serviceAccount+':generateAccessToken';
 if(adc?.type!=='impersonated_service_account'||adc.service_account_impersonation_url!==target||adc.quota_project_id!==PIN.projectId||adc.source_credentials?.type!=='authorized_user')throw Error('Pinned impersonated ADC shape required');
 if(!['client_id','client_secret','refresh_token'].every(k=>typeof adc.source_credentials[k]==='string'&&adc.source_credentials[k].length>0))throw Error('Source credential fields required');
 const allowed=['type','service_account_impersonation_url','quota_project_id','source_credentials','delegates'];
 if(Object.keys(adc).some(k=>!allowed.includes(k))||adc.delegates?.length||Object.keys(adc.source_credentials).some(k=>!['type','client_id','client_secret','refresh_token'].includes(k)))throw Error('Unexpected ADC overrides or delegates');
 return {shape:'PASS',targetPrincipal:PIN.serviceAccount,authenticated:false};
}
function preflight(config,{adcShape,environment={}}={}){
 const result=offlinePreflight(config,environment);
 return {...result,credentialShape:adcShape?inspectADC(adcShape).shape:'NOT_PROVIDED',liveTransport:'LOCKED',rules:'NOT_VERIFIED',location:'NOT_VERIFIED',credentialAuthenticated:false};
}
module.exports={inspectADC,preflight};
