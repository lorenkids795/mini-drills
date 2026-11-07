'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{connect}=require('./environment.cjs'),{service}=require('./service.cjs');
function server(connection,port=18787){const api=service(connection);const app=http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");function send(status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}try{
 const host=req.headers.host;if(!['127.0.0.1:'+port,'localhost:'+port].includes(host))return send(403,{error:'Loopback host required'});if(req.headers.origin&&req.headers.origin!=='http://'+host)return send(403,{error:'Cross-origin request denied'});
 const url=new URL(req.url,'http://'+host);if(req.method==='GET'&&['/','/app.js','/style.css'].includes(url.pathname)){const name=url.pathname==='/'?'index.html':url.pathname.slice(1);res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});return res.end(fs.readFileSync(path.join(__dirname,'ui',name)))}
 let b={};if(req.method==='POST'){if(!(req.headers['content-type']||'').startsWith('application/json'))return send(415,{error:'JSON required'});let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>200000)return send(413,{error:'Payload too large'})}try{b=JSON.parse(raw)}catch{return send(400,{error:'Invalid JSON'})}}
 if(url.pathname==='/login'&&req.method==='POST'){if(typeof b.email!=='string'||!b.email.endsWith('@local.invalid')||typeof b.password!=='string')return send(400,{error:'Emulator fixture identities only'});const r=await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:b.email,password:b.password,returnSecureToken:true})});return send(r.ok?200:401,await r.json())}
 const who=await api.identity((req.headers.authorization||'').replace(/^Bearer /,''));let result;
 if(req.method==='GET'&&url.pathname==='/me')result=who;
 else if(req.method==='GET'&&url.pathname==='/review/list')result=await api.reviewList(who);
 else if(req.method==='GET'&&url.pathname==='/review/item')result=await api.reviewItem(who,url.searchParams.get('id'));
 else if(req.method==='POST'&&url.pathname==='/review/decision')result=await api.decide(who,b);
 else if(req.method==='POST'&&url.pathname==='/review/revise')result=await api.decide(who,b,true);
 else if(req.method==='GET'&&url.pathname==='/student/sessions')result=await api.sessions(who);
 else if(req.method==='GET'&&url.pathname==='/student/catalog')result=await api.catalog(who);
 else if(req.method==='POST'&&url.pathname==='/student/start')result=await api.start(who,b);
 else if(req.method==='POST'&&url.pathname==='/student/action')result=await api.act(who,b);
 else if(req.method==='GET'&&url.pathname==='/student/session')result=await api.resume(who,url.searchParams.get('id'));
 else if(req.method==='GET'&&url.pathname==='/student/progress')result=await api.progress(who);
 else return send(404,{error:'Unknown endpoint'});send(200,result);
 }catch(e){send(e.status||500,{error:e.status?e.message:'Local staging service error'});if(!e.status)console.error(e.message)}});return {app,api,listen:()=>new Promise(resolve=>app.listen(port,'127.0.0.1',resolve))};}
if(require.main===module){const c=connect(),s=server(c);s.api.seed().then(()=>s.listen()).then(()=>console.log('Emulator-only review/progress: http://127.0.0.1:18787')).catch(e=>{console.error(e);process.exitCode=1})}module.exports={server};
