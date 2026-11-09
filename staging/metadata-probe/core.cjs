'use strict';
const {PIN,ENDPOINTS,ProbeError,fail,validateTarget,validateEnvironment,validateCredential,validateToken,metadataResult}=require('./policy.cjs');
// Test seam: trusted transport supplied by CLI, replaced with a closed mock in tests.
// No caller-supplied access token, endpoint, HTTP method or auth-provider fallback.
async function probe({target,credential,environment},transport){
 validateTarget(target);validateEnvironment(environment);
 const source=validateCredential(credential);
 let sourceToken,targetToken;
 async function call(stage,request){
  let result;
  try{result=await transport(stage,request)}catch{fail(stage.toUpperCase()+'_TRANSPORT_FAILED')}
  if(result?.status!==200){
   const status=result?.status;
   if(status===401)fail(stage.toUpperCase()+'_UNAUTHENTICATED');
   if(status===403)fail(stage.toUpperCase()+'_PERMISSION_DENIED');
   if(status===429)fail(stage.toUpperCase()+'_QUOTA_EXCEEDED');
   if(status>=300&&status<400)fail(stage.toUpperCase()+'_REDIRECT_DENIED');
   fail(stage.toUpperCase()+'_HTTP_FAILED');
  }
  return result.data;
 }
 try{
  const oauth=await call('oauth',{url:ENDPOINTS.oauth,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:source.clientId,client_secret:source.clientSecret,refresh_token:source.refreshToken}).toString()});
  sourceToken=validateToken(oauth?.access_token);
  if(oauth.token_type?.toLowerCase()!=='bearer'||!Number.isFinite(oauth.expires_in)||oauth.expires_in<=0)fail('TOKEN_RESPONSE_INVALID');
  const minted=await call('impersonation',{url:ENDPOINTS.impersonation,method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sourceToken},body:JSON.stringify({delegates:[],scope:[PIN.scope],lifetime:'600s'})});
  targetToken=validateToken(minted?.accessToken);
  const expires=Date.parse(minted?.expireTime);
  if(!Number.isFinite(expires)||expires<=Date.now()||expires>Date.now()+660000||targetToken===sourceToken)fail('TOKEN_RESPONSE_INVALID');
  // The human/source token is used only at IAMCredentials, never at Firestore.
  sourceToken=undefined;
  const metadata=await call('metadata',{url:ENDPOINTS.metadata,method:'GET',headers:{Authorization:'Bearer '+targetToken}});
  return metadataResult(metadata);
 }catch(e){
  if(e instanceof ProbeError)throw e;
  fail('PROBE_FAILED');
 }finally{
  sourceToken=undefined;targetToken=undefined;
  source.clientSecret=undefined;source.refreshToken=undefined;
  // JS strings cannot be guaranteed zeroized. No token/credential is written to disk.
 }
}
module.exports={probe};
