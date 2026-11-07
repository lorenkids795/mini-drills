'use strict';
// QA candidate transform only. Start with current main; never replace its Learning Materials region.
function apply(main,feature){let s=main;
 function once(a,b){if(s.split(a).length!==2)throw Error('Integration anchor drift: '+a);s=s.replace(a,b)}
 function between(a,b){if(feature.split(a).length!==2||feature.split(b).length!==2)throw Error('Feature anchor drift');const start=feature.indexOf(a),end=feature.indexOf(b,start);if(end<start)throw Error('Feature boundary order');return feature.slice(start,end)}
 if(s.includes('function vocabMaterialsHTML'))throw Error('Main already has Vocab hooks; explicit reconciliation required');
 const links=[...feature.matchAll(/<link rel="stylesheet" href="vocab-[^"\n]+">/g)].map(m=>m[0]);if(links.length!==3)throw Error('Vocab stylesheet inventory drift');
 once('</head>',links.join('\n')+'\n</head>');
 once('  <section id="v-cards" hidden></section>','  <section id="v-vocab" class="vocab-shell" hidden></section>\n  <section id="v-cards" hidden></section>');
 const config=[...s.matchAll(/<script src="md-config\.js(?:\?[^"<>]*)?"><\/script>/g)];if(config.length!==1)throw Error('Config script anchor drift');
 once(config[0][0],between('<script src="vocab-lab-core.js">','<script src="md-config.js">')+config[0][0]);
 once('function showTab(t){',between('var VOCAB_VIEW=false,VOCAB_LIST_OPEN=false;','function tabsFor()')+'function showTab(t){\n'+
 "  if(t==='vocab'){VOCAB_VIEW=vocabAllowed();if(VOCAB_VIEW){LIBT='lm';LMV=null;NAV={book:null,test:null,skill:null,ex:null}}t='library'}\n  if(t!=='library')VOCAB_VIEW=false;\n  if(window.MD_VOCAB_SHELL)window.MD_VOCAB_SHELL.guard(U);\n  $('#v-vocab').hidden=true;");
 once("function renderLib(){\n", "function renderLib(){\n  $('#v-vocab').hidden=true;\n  if(VOCAB_VIEW&&vocabAllowed()&&LIBT==='lm'){\n    $('#crumbs').innerHTML='';$('#libBody').innerHTML='<div class=\"sechead\"><div><h2>Library</h2><span class=\"meta\">Learning Materials</span></div></div>'+libTabsHTML();$('#v-vocab').hidden=false;vocabRender();return;\n  }\n  VOCAB_VIEW=false;\n");
 once("if(LIBT==='lm'){h+=lmHTML();", "if(LIBT==='lm'){h+=vocabMaterialsHTML();");
 once("  $('#tabs').hidden=tabsFor().length<2;", "  if(!VOCAB_VIEW&&(window.location.hash==='#vocab'||window.location.hash.indexOf('#library/vocab')===0)&&window.history)window.history.replaceState(null,'',window.location.pathname+window.location.search);\n  $('#tabs').hidden=tabsFor().length<2;");
 once('showTab(tabsFor()[0][0]);joinCheck();return true;', 'showTab(vocabInitialTab());joinCheck();return true;');
 once('function refreshLive(){\n  if(!U)return;updMarq();',"function refreshLive(){\n  if(!U)return;updMarq();\n  if(TAB==='library'&&VOCAB_VIEW){U=findUser(U.email)||U;showTab('library');return}");
 once("if(a==='tab'){if(SB.open", "if(a==='tab'){VOCAB_VIEW=false;if(SB.open");
 once("  if(a==='lib-tab'){LIBT=t.dataset.v==='lm'?'lm':'cam';LMV=null;try{lsSet('md-libt',LIBT)}catch(e){}renderLib();return true}",between("  if(a==='vocab-toggle'){","  if(a==='lm-open')").trimEnd());
 return s;
}
module.exports={apply};
