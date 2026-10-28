'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),B=require('./build-vocab-ui-preview.cjs');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
function createServer(){B.verify();return http.createServer((req,res)=>{
 res.setHeader('Content-Security-Policy',B.CSP);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 try{if(!['GET','HEAD'].includes(req.method))throw Error('Read-only preview');const url=new URL(req.url,'http://localhost'),p=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';if(url.search||!B.PATHS.includes(p))throw Error('Not an allowlisted static file');B.verify();const data=fs.readFileSync(path.join(B.DIST,p));res.writeHead(200,{'Content-Type':types[path.extname(p)]||'text/plain'});res.end(req.method==='HEAD'?undefined:data)}catch(e){res.writeHead(403,{'Content-Type':'text/plain'});res.end('Blocked: static UI bundle only.')}
})}
if(require.main===module){try{const i=process.argv.indexOf('--port'),port=i<0?8787:Number(process.argv[i+1]);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local port from 1024 to 65535');createServer().listen(port,'127.0.0.1',()=>console.log('UI-only static preview: http://127.0.0.1:'+port+'/ (no API/backend)'))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={createServer};
