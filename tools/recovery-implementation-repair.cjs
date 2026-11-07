'use strict';
// Symbol-scoped restoration in a detached ignored candidate, never a whole-file rollback.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {babelParse,traverse}=require('./qa-runtime/node_modules/playwright/lib/transform/babelBundle.js');
const root=path.resolve(__dirname,'..'),base=path.join(root,'qa-artifacts/recovery-implementation'),dir=path.join(base,'candidate'),api='functions/api/[[path]].js';
const git=(cwd,...a)=>cp.execFileSync('git',['-c','core.autocrlf=false',...a],{cwd,encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
function symbols(s){const ast=babelParse(s,'api.js',true),map=new Map(),refs=new Map();for(const n of ast.program.body){const d=n.declaration||n,names=['FunctionDeclaration','ClassDeclaration'].includes(d.type)?[d.id.name]:d.type==='VariableDeclaration'?d.declarations.map(x=>x.id.name):[];for(const name of names)map.set(name,n);refs.set(n,new Set())}traverse(ast,{ReferencedIdentifier(p){const b=p.scope.getBinding(p.node.name);if(!b||!b.scope.path.isProgram())return;let top=p;while(top.parentPath&&!top.parentPath.isProgram())top=top.parentPath;refs.get(top.node)?.add(p.node.name)}});return {map,refs}}
function repair(group){
 if(git(root,'branch','--show-current')!=='feature/vocab-lab'||git(dir,'branch','--show-current')||git(dir,'rev-parse','HEAD')!==git(root,'rev-parse','origin/main'))throw Error('Detached current-main candidate and feature audit branch required');
 const snapshot=path.join(base,'snapshots',group);if(fs.existsSync(path.join(snapshot,'changes.json')))throw Error('Scope already applied; preserve bounded repair history');if(fs.existsSync(snapshot)&&![api,'index.html'].every(p=>fs.readFileSync(path.join(snapshot,p)).equals(fs.readFileSync(path.join(dir,p)))))throw Error('Failed preparation changed candidate; inspect evidence');fs.mkdirSync(snapshot,{recursive:true});for(const p of [api,'index.html']){fs.mkdirSync(path.dirname(path.join(snapshot,p)),{recursive:true});fs.copyFileSync(path.join(dir,p),path.join(snapshot,p))}
 const old=fs.readFileSync(path.join(base,'reference/api-parent.js'),'utf8'),oldSymbols=symbols(old),file=path.join(dir,api);let s=fs.readFileSync(file,'utf8');const restored=[];
 function once(a,b){if(s.split(a).length!==2)throw Error('Changed source anchor '+a);s=s.replace(a,b)}
 function add(names){const cur=symbols(s).map,nodes=new Set();function visit(k){if(cur.has(k))return;const n=oldSymbols.map.get(k);if(!n)throw Error('Missing reference '+k);if(nodes.has(n))return;if(/^(purgeStudent|fsDeleteNames|adminClassDel|adminOrphans)$/.test(k))throw Error('Destructive cleanup restoration forbidden');nodes.add(n);restored.push(k);for(const dep of oldSymbols.refs.get(n))visit(dep)}names.forEach(visit);const chunks=[...nodes].sort((a,b)=>a.start-b.start).map(n=>old.slice(n.start,n.end));s=s.replace('export async function onRequest(ctx) {',chunks.join('\n\n')+'\n\nexport async function onRequest(ctx) {')}
 function replaceFunction(name){const current=symbols(s).map.get(name),ref=oldSymbols.map.get(name);if(!current||!ref)throw Error('Function missing '+name);s=s.slice(0,current.start)+old.slice(ref.start,ref.end)+s.slice(current.end);restored.push(name+' (function-only replacement)');add([...oldSymbols.refs.get(ref)])}
 if(group==='admin'){
  // Latest main already contains the exact form-routing repair; do not overwrite its new UI.
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');if(!html.includes('ad-teacher-add')||!html.includes('ad-tester-create'))throw Error('Admin UI differs; review required');
  add(['adminTester','seedTester','joinLookup','whoami','newStaffKey','staffUnlock']);
  once("if (route === 'admin/teachers') return await adminTeachers(env, body);","if (route === 'admin/teachers') return await adminTeachers(env, body);\n      if (route === 'admin/tester') return await adminTester(env, body);");
  once("if (route === 'names' && request.method === 'GET') return json(await listNames(env));","if (route === 'names' && request.method === 'GET') return json(await listNames(env));\n    if (route === 'join' && request.method === 'GET') return await joinLookup(env, request, url);");
  once("if (route === 'login') return await login(env, body);","if (route === 'whoami') return await whoami(env, request);\n    if (route === 'staff/unlock') return await staffUnlock(env, body);\n    if (route === 'login') return await login(env, body);");
  once('if (who.adm) res.adminKey = await newAdminKey(env, email);',"if (who.adm) res.adminKey = await newAdminKey(env, email);\n  if (who.role === 'teacher') res.staffKey = await newStaffKey(env, email);");
  // Replace only the obsolete self-service staff password block.
  const start=s.indexOf('  if (teachers(env).indexOf(email) >= 0) {'),end=s.indexOf("  let name = '';",start);if(start<0||end<0)throw Error('Register boundary changed');const ref=old.slice(oldSymbols.map.get('register').start,oldSymbols.map.get('register').end),a=ref.indexOf('  // Teacher accounts'),b=ref.indexOf("  let name = '';",a);s=s.slice(0,start)+ref.slice(a,b)+s.slice(end);add(['assistMap']);
 }else if(group==='reading'){
  add(['aiReading','readingPrompt3']);replaceFunction('geminiOnce');replaceFunction('askGemini');const relay=symbols(s).map.get('relayCode'),relayText=s.slice(relay.start,relay.end);s=s.slice(0,relay.start)+s.slice(relay.end);s=s.replace('async function geminiOnce(',relayText+'\n\nasync function geminiOnce(');
  once("if (route === 'ai/practice') return await aiPractice(env, body);","if (route === 'ai/practice') return await aiPractice(env, body);\n    if (route === 'ai/reading') return await aiReading(env, request, body);");
 }else if(group==='homework'){
  add(['imageUpload','imageServe']);const htmlPath=path.join(dir,'index.html');fs.writeFileSync(htmlPath,require('./recovery-homework-transform.cjs').apply(fs.readFileSync(htmlPath,'utf8')));
  once("if (request.method !== 'POST') return fail('Not found.', 404);","const im = /^image\\/([A-Za-z0-9_-]{22})$/.exec(route);\n    if (im && (request.method === 'GET' || request.method === 'HEAD')) return await imageServe(env, request, im[1]);\n    if (request.method !== 'POST') return fail('Not found.', 404);\n    if (route === 'image') return await imageUpload(env, request, url, request.headers.get('CF-Connecting-IP') || 'x');");
 }else if(group==='assistant'){
  add(['hwaData','hwaAsg','hwaNote','adminAssistants']);
  const roleNode=symbols(s).map.get('roleOf'),roleText=s.slice(roleNode.start,roleNode.end);
  s=s.slice(0,roleNode.start)+roleText.replace('  const row = await fsGet(env, \'roster\', email);',"  const as = await assistMap(env);\n  if (as[email]) return { role: 'assistant', adm: false, name: as[email].name || 'Homework Assistant' };\n  const row = await fsGet(env, 'roster', email);")+s.slice(roleNode.end);
  once("if (route === 'ai/reading') return await aiReading(env, request, body);","if (route === 'ai/reading') return await aiReading(env, request, body);\n    if (route === 'hwa/data') return await hwaData(env, request, body);\n    if (route === 'hwa/asg') return await hwaAsg(env, request, body);\n    if (route === 'hwa/note') return await hwaNote(env, request, body);");
  once("if (route === 'admin/tester') return await adminTester(env, body);","if (route === 'admin/tester') return await adminTester(env, body);\n      if (route === 'admin/assistants') return await adminAssistants(env, body);");
 }else if(group==='cleanup'){
  add(['orphanScan']);
  once('  teachers(env).forEach((e) => keep.add(e)); keep.add(adminEmail(env));',"  Object.keys(await assistMap(env)).forEach((e) => keep.add(normEmail(e)));\n  teachers(env).forEach((e) => keep.add(e)); keep.add(adminEmail(env));");
  const preview="async function adminOrphans(env, body) {\n  if (body.op && body.op !== 'preview') return fail('Cleanup is read-only in this candidate. No data was deleted.', 403);\n  const r = await orphanScan(env);\n  return json({ ok: true, readOnly: true, scanned: r.scanned, truncated: r.truncated, orphans: r.orphans.map((o) => ({ email: o.email, attempts: o.attempts, names: o.names, classes: o.classes, last: o.last })) });\n}\n\n";
  s=s.replace('export async function onRequest(ctx) {',preview+'export async function onRequest(ctx) {');
  once("if (route === 'admin/tester') return await adminTester(env, body);","if (route === 'admin/tester') return await adminTester(env, body);\n      if (route === 'admin/orphans') return await adminOrphans(env, body);");
  let html=fs.readFileSync(path.join(dir,'index.html'),'utf8');const start=html.indexOf("  if(a==='ad-orph-del')"),end=html.indexOf("  if(a===",start+8);if(start<0||end<0)throw Error('Cleanup click boundary missing');html=html.slice(0,start)+"  if(a==='ad-orph-del'){adSay('Cleanup preview is read-only. No data can be deleted.');return true}\n"+html.slice(end);html=html.replace(/<button[^>]*data-act="ad-orph-del"[\s\S]*?<\/button>/g,'<span class="saved">Preview only</span>');fs.writeFileSync(path.join(dir,'index.html'),html);
  const cleanupPath=path.join(dir,'index.html');fs.writeFileSync(cleanupPath,require('./recovery-cleanup-transform.cjs').apply(fs.readFileSync(cleanupPath,'utf8')));
 }else if(group==='writing'){
  // Latest-main policy/focused view already restored; verify, do not replay the old gate patch.
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');for(const x of ['function lmTester()','function lmSkillLocked(','class="lmfocus"'])if(!html.includes(x))throw Error('Writing acceptance missing '+x);
 }else throw Error('Unknown approved scope');
 babelParse(s,'api.js',true);fs.writeFileSync(file,s);fs.writeFileSync(path.join(snapshot,'changes.json'),JSON.stringify({group,source:git(root,'rev-parse','origin/main^'),restored,method:'Selected top-level symbols + named dependencies; current functions preserved except explicitly listed function-sized changes. No whole-file restoration.'},null,2));
}
if(require.main===module)repair(process.argv[2]);module.exports={repair};
