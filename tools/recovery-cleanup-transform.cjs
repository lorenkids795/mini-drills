'use strict';
exports.apply=function(html){
 const a=html.indexOf("  if(path==='admin/orphans'){"),b=html.indexOf("  if(path===",a+10);if(a<0||b<0)throw Error('Demo cleanup boundary changed');
 let block=html.slice(a,b);block=block.replace(/    if\(b\.op==='purge'\).*\r?\n/,"    if(b.op&&b.op!=='preview')err('Cleanup is read-only. No data can be deleted.');\n");
 block=block.replace('var by={};',"all.forEach(function(u){if(u.role==='teacher'||u.role==='assistant'||u.tester)keep[String(u.email||'').toLowerCase()]=1});var by={};");
 html=html.slice(0,a)+block+html.slice(b);
 return html.replace('preview (dry run) first, then delete one email at a time after a confirm','read-only preview; no cleanup mutations').replace('Clean up data of deleted students','Preview leftover student data').replace('Preview deletes nothing; data is matched','This preview is read-only; data is matched').replace('run again after a clean-up','preview may be incomplete');
};
