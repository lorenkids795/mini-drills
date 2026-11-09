'use strict';
const https=require('node:https');
const {ENDPOINTS,fail}=require('./policy.cjs');
// Exactly three possible routes: two credential exchanges and one metadata GET.
// No redirects, retries, documents, queries, writes, IAM-policy mutations or API enabling.
function transport(stage,request){
 const expectedMethod=stage==='metadata'?'GET':'POST';
 if(!Object.hasOwn(ENDPOINTS,stage)||request.url!==ENDPOINTS[stage]||request.method!==expectedMethod)fail('TRANSPORT_ROUTE_DENIED');
 if(stage==='metadata'&&request.body!==undefined)fail('TRANSPORT_BODY_DENIED');
 if(Object.keys(request.headers).some(k=>!['Authorization','Content-Type'].includes(k)))fail('TRANSPORT_HEADERS_DENIED');
 return new Promise((resolve,reject)=>{
  let req,settled=false;
  const stop=()=>{if(settled)return;settled=true;clearTimeout(timer);req?.destroy();reject(Error('Transport failed'))};
  const timer=setTimeout(stop,15000);
  try{
   req=https.request(request.url,{method:request.method,headers:request.headers,agent:false,rejectUnauthorized:true},res=>{
    res.on('error',stop);
    // Discard all non-200 payloads: Google errors may include sensitive request details.
    if(res.statusCode!==200){settled=true;clearTimeout(timer);res.destroy();resolve({status:res.statusCode});return}
    let bytes=0;const chunks=[];
    res.on('data',chunk=>{bytes+=chunk.length;if(bytes>32768)stop();else chunks.push(chunk)});
    res.on('aborted',stop);
    res.on('end',()=>{
     if(settled)return;
     try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));settled=true;clearTimeout(timer);resolve({status:200,data})}catch{stop()}
    });
   });
   req.on('error',stop);
   if(request.body!==undefined)req.write(request.body);
   req.end();
  }catch{stop()}
 });
}
module.exports={transport};
