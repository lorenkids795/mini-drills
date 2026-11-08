'use strict';
const http=require('node:http');
const {PIN}=require('./policy.cjs');
// API-only offline contract server. It cannot construct a cloud connection.
function mockServer(adapter){
 require('../loopback-only.cjs').install();
 const api=adapter.api;
 const app=http.createServer(async(req,res)=>{
  const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end(JSON.stringify(value))};
  try{
   if(req.headers.host!=='localhost:18790'||req.headers.origin&&req.headers.origin!==PIN.origin)return send(403,{error:'Pinned origin required'});
   const url=new URL(req.url,PIN.origin);
   if(req.method==='GET'&&url.pathname==='/staging-health'){
    const state=await adapter.root.get();
    return send(200,{mode:'spark-local-mock',cloudEnabled:false,liveAuth:'NOT_TESTED',liveIAM:'NOT_TESTED',syntheticOnly:true,writeLocked:state.data()?.writeLocked!==false});
   }
   if(!['GET','POST'].includes(req.method))return send(405,{error:'Method denied'});
   let body;
   if(req.method==='POST'){
    if(req.headers['content-type']!=='application/json')return send(415,{error:'JSON required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>32000)return send(413,{error:'Payload too large'})}
    try{body=JSON.parse(raw)}catch{return send(400,{error:'Invalid JSON'})}
    if(!body||typeof body!=='object'||Array.isArray(body)||['runId','lessonId','namespace','projectId','databaseId','role','uid'].some(k=>Object.hasOwn(body,k)))return send(400,{error:'Server-owned identity/scope'});
   }
   const match=/^Bearer (\S+)$/.exec(req.headers.authorization||'');
   const who=await api.identity(match?.[1]);let value;
   if(req.method==='GET'){
    if(url.pathname==='/me')value=who;
    else if(url.pathname==='/review/list')value=await api.reviewList(who);
    else if(url.pathname==='/review/item')value=await api.reviewItem(who,url.searchParams.get('id'));
    else if(url.pathname==='/student/catalog')value=await api.catalog(who);
    else if(url.pathname==='/student/progress')value=await api.progress(who);
    else if(url.pathname==='/student/sessions')value=await api.sessions(who);
    else if(url.pathname==='/student/session')value=await api.resume(who,url.searchParams.get('id'));
    else return send(404,{error:'Unknown endpoint'});
   }else{
    if(url.pathname==='/review/decision')value=await api.decide(who,body);
    else if(url.pathname==='/review/revise')value=await api.decide(who,body,true);
    else if(url.pathname==='/student/start')value=await api.start(who,body);
    else if(url.pathname==='/student/action')value=await api.act(who,body);
    else return send(404,{error:'Unknown endpoint'});
   }
   send(200,value);
  }catch(e){send(e.status||503,{error:e.status?e.message:'Offline fixture API unavailable'})}
 });
 app.requestTimeout=15000;app.headersTimeout=10000;
 return {app,listen:()=>new Promise((resolve,reject)=>{app.once('error',reject);app.listen(18790,'127.0.0.1',resolve)})};
}
// Default executable always uses emulator. Spark mode has no executable transport in Step 2.
if(require.main===module){
 const c=require('./adapter.cjs').connect();
 require('../phase31/server.cjs').server(c,process.argv[2],process.argv[3],18790).listen().then(()=>console.log('Synthetic emulator API on localhost:18790'));
}
module.exports={mockServer};
