'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
function server(c,runId,lesson){
 const host=require('../phase31/server.cjs').server(c,runId,lesson,18790);
 const original=host.app.listeners('request')[0];host.app.removeAllListeners('request');
 const deps=createRequire(path.resolve(process.env.VOCAB_EMULATOR_RUNTIME||path.join(__dirname,'../../tools/emulator-runtime'),'package.json'));
 const firebaseRoot=path.dirname(deps.resolve('firebase/package.json'));
 const assets={
  '/auth-check':['auth-check.html','text/html'],
  '/auth-check.mjs':['auth-check.mjs','text/javascript'],
  '/auth-client.mjs':['auth-client.mjs','text/javascript'],
  '/sdk-app.js':[path.join(firebaseRoot,'firebase-app-compat.js'),'text/javascript'],
  '/sdk-auth.js':[path.join(firebaseRoot,'firebase-auth-compat.js'),'text/javascript']
 };
 host.app.on('request',(req,res)=>{
  const asset=assets[req.url];
  if(req.method!=='GET'||!asset)return original(req,res);
  if(!['localhost:18790','127.0.0.1:18790'].includes(req.headers.host)){res.writeHead(403);return res.end()}
  res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self' http://127.0.0.1:19099; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});
  res.end(fs.readFileSync(path.isAbsolute(asset[0])?asset[0]:path.join(__dirname,asset[0])));
 });
 return host;
}
if(require.main===module){
 const c=require('./adapter.cjs').connect();
 server(c,process.argv[2],process.argv[3]).listen().then(()=>console.log('Emulator Web Auth check: http://localhost:18790/auth-check'));
}
module.exports={server};
