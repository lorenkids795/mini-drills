'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const W={};W.window=W;const ctx=vm.createContext(W);
for(const f of ['vocab-lab-core.js','vocab-lab.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const h=W.MD_VOCAB.highlight;
test('highlight exact word, all occurrences and original case/punctuation',()=>{const r=h('The PRESS spoke. Pressure rose; the press waited.','press');assert.equal(r.matches,2);assert.ok(r.html.includes('>PRESS</mark>'));assert.ok(!r.html.includes('>Press</mark>ure'));assert.equal(r.html.replace(/<[^>]*>/g,''),'The PRESS spoke. Pressure rose; the press waited.')});
test('multiword phrase, flexible whitespace, no word fragments',()=>{const r=h('They link together teams; LINK  TOGETHER matters. Relink together is different.','link together');assert.equal(r.matches,2);assert.ok(r.html.includes('>LINK  TOGETHER</mark>'))});
test('absent/ambiguous targets and untrusted context are safe plain-text fallbacks',()=>{for(const target of ['missing','pass (a proposal)','']){const r=h('<img src=x onerror=alert(1)> & done.',target);assert.equal(r.matches,0);assert.ok(r.html.startsWith('&lt;img'));assert.ok(!r.html.includes('<img'))}assert.equal(h('Expressions <script> are literal.','<script>').html.includes('<script>'),false)});
