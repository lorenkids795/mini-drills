'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {scope}=require('./runtime.cjs'),{guard,connect}=require('../environment.cjs');
function server(c,runId,lesson,port=18788){
 guard();const s=scope(c,runId,lesson),api=s.api;
 const app=http.createServer(async(req,res)=>{
  const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value))};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  try{
   const host=req.headers.host;if(!['127.0.0.1:'+port,'localhost:'+port].includes(host))return send(403,{error:'Loopback host required'});
   if(req.headers.origin&&req.headers.origin!=='http://'+host)return send(403,{error:'Origin denied'});
   const url=new URL(req.url,'http://'+host);
   if(req.method==='GET'&&url.pathname==='/staging-health'){
    const r=await s.root.get();return send(r.exists&&r.data().state==='ready'?200:503,{mode:'emulator',syntheticOnly:true,projectId:c.projectId,runId,lessonId:lesson,writeLocked:r.data()?.writeLocked??true,ready:r.data()?.state==='ready'});
   }
   if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)){
    const name=url.pathname==='/'?'index.html':url.pathname.slice(1),file=path.join(__dirname,'ui',name);res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});return res.end(fs.readFileSync(file));
   }
   if(!['GET','POST'].includes(req.method))return send(405,{error:'Method denied'});
   let b;if(req.method==='POST'){
    if(!(req.headers['content-type']||'').startsWith('application/json'))return send(415,{error:'JSON required'});
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>32000)return send(413,{error:'Payload too large'})}
    try{b=JSON.parse(raw)}catch{return send(400,{error:'Invalid JSON'})}
    if(!b||typeof b!=='object'||Array.isArray(b))return send(400,{error:'Object required'});
    if(['runId','namespace','lessonId','projectId'].some(k=>k in b))return send(400,{error:'Client cannot select data scope'});
   }
   if(req.method==='POST'&&url.pathname==='/login'){
    if(typeof b.email!=='string'||!/^fx31_[a-z0-9_-]+@local\.invalid$/.test(b.email)||typeof b.password!=='string')return send(400,{error:'Phase 3.1 fixture identities only'});
    const r=await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:b.email,password:b.password,returnSecureToken:true})});
    const a=await r.json();if(!r.ok)return send(401,{error:'Sign-in failed'});await api.identity(a.idToken);return send(200,{idToken:a.idToken});
   }
   const who=await api.identity((req.headers.authorization||'').replace(/^Bearer /,''));let value;
   if(req.method==='GET'){
    if(url.pathname==='/me')value=who;
    else if(url.pathname==='/review/list')value=await api.reviewList(who);
    else if(url.pathname==='/review/item')value=await api.reviewItem(who,url.searchParams.get('id'));
    else if(url.pathname==='/student/catalog')value=await api.catalog(who);
    else if(url.pathname==='/student/sessions')value=await api.sessions(who);
    else if(url.pathname==='/student/session')value=await api.resume(who,url.searchParams.get('id'));
    else if(url.pathname==='/student/progress')value=await api.progress(who);
    else return send(404,{error:'Unknown endpoint'});
   }else{
    if(url.pathname==='/review/decision')value=await api.decide(who,b);
    else if(url.pathname==='/review/revise')value=await api.decide(who,b,true);
    else if(url.pathname==='/student/start')value=await api.start(who,b);
    else if(url.pathname==='/student/action')value=await api.act(who,b);
    else return send(404,{error:'Unknown endpoint'});
   }send(200,value);
  }catch(e){send(e.status||503,{error:e.status?e.message:'Local fixture service unavailable'})}
 });
 app.requestTimeout=15000;app.headersTimeout=10000;
 return {app,api,listen:()=>new Promise((resolve,reject)=>{app.once('error',reject);app.listen(port,'127.0.0.1',resolve)})};
}
if(require.main===module){const c=connect();server(c,process.argv[2],process.argv[3]).listen().then(()=>console.log('Synthetic emulator UI: http://127.0.0.1:18788'));}
module.exports={server};
