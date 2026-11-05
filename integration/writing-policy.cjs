'use strict';
// Proposed source transformation for disposable QA only. Never loaded by the app.
function apply(html) {
  const edits = [
    ["function lmVisible(l){return !!(l&&(l.status==='published'||(U&&U.adm)))}",
      "function lmTester(){return !!(U&&U.role==='student'&&typeof allRoster==='function'&&allRoster().some(function(r){return r.role==='student'&&String(r.email||'').toLowerCase()===String(U.email||'').toLowerCase()&&r.tester===true}))}\n" +
      "function lmSkillLocked(sk){return sk==='writing'&&(!U||(U.role==='student'&&!U.adm&&!lmTester()))}\n" +
      "function lmVisible(l){return !!(l&&!lmSkillLocked(l.skill)&&(l.status==='published'||(U&&U.adm)||(l.skill==='writing'&&lmTester())))}"],
    ["var G=D.modules.filter(function(m){return m.skill===sk.id}),k='s:'+sk.id",
      "var G=lmSkillLocked(sk.id)?[]:D.modules.filter(function(m){return m.skill===sk.id}),k='s:'+sk.id"]
  ];
  for (const [before, after] of edits) {
    if (html.split(before).length !== 2) throw Error('Latest-main policy boundary changed; review required: ' + before);
    html = html.replace(before, after);
  }
  return html;
}
module.exports = {apply};
