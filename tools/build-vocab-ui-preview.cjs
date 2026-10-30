/* No package install/network/deployment. Build exactly the static UI allowlist. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),DIST=path.join(ROOT,'preview-ui-dist');
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'; worker-src 'none'";
const COPY=['vocab-editorial-core.js','vocab-editorial.js','vocab-editorial.css','vocab-mission-planner.js','vocab-mission-packs.js','vocab-mission-engine.js','vocab-mission-library.js','vocab-lab-core.js','vocab-lab.css','vocab-mission-content.js','vocab-mission-core.js','vocab-mission-store.js','vocab-mission.css','data/vocab-lab-p1.json','data/vocab-lab-practice.json','data/vocab-lab-practice-v1.json'];
const ENTRY=['index.html','preview.css','preview.js','network-guard.js'];
const PATHS=[...COPY,...ENTRY,'vocab-lab.js','vocab-mission.js','_headers','manifest.json'].sort();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function replace(s,a,b){if(!s.includes(a))throw Error('Component changed: preview transform requires review: '+a.slice(0,65));return s.replace(a,b)}
function compile(){
 const files={};COPY.forEach(p=>{files[p]=fs.readFileSync(path.join(ROOT,p))});ENTRY.forEach(p=>{files[p]=fs.readFileSync(path.join(ROOT,'preview-ui',p))});
 let lab=fs.readFileSync(path.join(ROOT,'vocab-lab.js'),'utf8');
 const cloudStart=lab.indexOf('    return Promise.resolve(opt.db'),cloudEnd=lab.indexOf('\n  }).catch(function(e){s.message=e.message;draw()});');
 if(cloudStart<0||cloudEnd<=cloudStart)throw Error('Cloud adapter boundary changed');lab=lab.slice(0,cloudStart)+lab.slice(cloudEnd);
 const syncStart=lab.indexOf('  function sync(){'),syncEnd=lab.indexOf('  function act(type,choice){');if(syncStart<0||syncEnd<=syncStart)throw Error('Sync boundary changed');lab=lab.slice(0,syncStart)+"  function sync(){s.message='Account sync is unavailable in this demo.';draw()}\n"+lab.slice(syncEnd);
 lab=replace(lab,'  if(!host)return;',"  if(!host)return;\n  if(opt.demo!==true||!root.MD_UI_ONLY_PREVIEW||!opt.user||['ui-tester-a@local.invalid','ui-tester-b@local.invalid'].indexOf(opt.user.email)<0){host.textContent='Fixture demo identities only.';return}");
 lab=replace(lab,'Start a local mission','Start demo mission');files['vocab-lab.js']=Buffer.from(lab);
 let mission=fs.readFileSync(path.join(ROOT,'vocab-mission.js'),'utf8');
 mission=replace(mission,"function eligible(user,demo){return !!(local()&&demo===true&&user&&(user.adm===true||user.tester===true))}","function eligible(user,demo){return !!(root.MD_UI_ONLY_PREVIEW===true&&demo===true&&user&&user.tester===true&&['ui-tester-a@local.invalid','ui-tester-b@local.invalid'].indexOf(user.email)>=0)}");
 mission=replace(mission,"location.href='vocab-lab-preview.html'","location.href='index.html'");files['vocab-mission.js']=Buffer.from(mission);
 files._headers=Buffer.from('/*\n  Content-Security-Policy: '+CSP+'\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n');
 const forbidden=/(?:https?:\/\/|firebaseapp\.com|googleapis\.com|gstatic\.com|firebaseio\.com|MD_VOCAB_STORE|root\.firebase|window\.firebase|claude\.use|BEGIN [A-Z ]*PRIVATE KEY|AIza[A-Za-z0-9_-]{30,}|github_pat_|ghp_)/i;
 for(const [name,bytes] of Object.entries(files)){if(forbidden.test(bytes.toString('utf8')))throw Error('Forbidden runtime/dependency material: '+name)}
 const manifest={formatVersion:1,purpose:'Independent UI-only static demo; no account backend',files:Object.keys(files).sort().map(p=>({path:p,bytes:files[p].length,sha256:hash(files[p])}))};
 files['manifest.json']=Buffer.from(JSON.stringify(manifest,null,2)+'\n');return files;
}
function list(dir,prefix=''){if(!fs.existsSync(dir))return [];if(fs.lstatSync(dir).isSymbolicLink())throw Error('Output symlinks forbidden');let out=[];for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),rel=prefix+name,st=fs.lstatSync(p);if(st.isSymbolicLink())throw Error('Output symlinks forbidden: '+rel);if(st.isDirectory()){if(rel!=='data')throw Error('Unexpected output directory: '+rel);out.push(...list(p,rel+'/'))}else if(st.isFile())out.push(rel);else throw Error('Unexpected output entry: '+rel)}return out.sort()}
function verify(dir=DIST){const expected=compile(),actual=list(dir);if(JSON.stringify(actual)!==JSON.stringify(PATHS))throw Error('Output allowlist mismatch: '+actual.join(', '));for(const p of PATHS)if(!fs.readFileSync(path.join(dir,p)).equals(expected[p]))throw Error('Output content/hash mismatch: '+p);return JSON.parse(expected['manifest.json'])}
function build(dir=DIST){const existing=list(dir);if(existing.some(p=>!PATHS.includes(p)))throw Error('Unexpected output file; refusing to package: '+existing.filter(p=>!PATHS.includes(p)));const files=compile();fs.mkdirSync(dir,{recursive:true});for(const [p,bytes] of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),bytes)}verify(dir);return {directory:dir,files:PATHS}}
if(require.main===module){try{const result=process.argv.includes('--verify')?verify():build();console.log(JSON.stringify(result,null,2))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={build,verify,compile,PATHS,CSP,DIST,ROOT};
