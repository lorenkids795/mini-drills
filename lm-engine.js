// Mini Drills · Learning Materials engine: binds lesson text to VERIFIED chart facts and checks the content.
// Plain ES5, no DOM. Browser: window.LMX (needs md-chart.js first). Node: module.exports (tests/lm-check.js).
// Text never carries its own chart numbers: "{a.y0}" etc. are filled in from chGetVerifiedFacts at render time,
// and every item says which result it expects from each fact, so changed data or a stale fact id is caught before release.
(function(root){
'use strict';
var CH=(typeof module!=='undefined'&&module.exports)?require('./md-chart.js'):root;
var STAGES=['learn','controlled','guided','independent','review'],PRE=['learn','controlled','guided'],LABELS=['supported','contradicted','not_determinable'],LENSES=['trends','highest','highlights'];
var own=function(o,k){return Object.prototype.hasOwnProperty.call(o,k)};
function isArr(a){return Object.prototype.toString.call(a)==='[object Array]'}
function slabel(chart,id){var s=CH.chSeries(chart,id);return s?s.label:null}
// facts of every chart of a unit -> {byId:{id:fact}, list, errors}
function lmFacts(unit){
  var o={byId:{},list:[],errors:[],charts:{}};
  Object.keys(unit.charts||{}).forEach(function(k){var fx=unit.charts[k],r=CH.chGetVerifiedFacts(fx);o.charts[k]={fx:fx,res:r};
    if(!r.ok)o.errors.push('Chart '+k+' ('+(fx&&fx.id)+') is not valid: '+r.errors.join(' '));
    r.facts.forEach(function(f){f._chart=k;o.byId[f.id]=f;o.list.push(f)})});
  return o;
}
// the values a template may use from one fact
function lmFields(f,chart){
  var F={},ev=f.evidence||{};
  F.label=slabel(chart,f.series[0]);if(f.series[1])F.label2=slabel(chart,f.series[1]);
  if(f.x!=null)F.x=f.x;
  ['x0','y0','x1','y1','abs','pct','y'].forEach(function(k){if(ev[k]!=null)F[k]=ev[k]});
  if(typeof ev.abs==='number')F.absAbs=Math.abs(ev.abs);if(typeof ev.pct==='number')F.pctAbs=Math.abs(ev.pct);
  if(typeof f.result==='string'&&slabel(chart,f.result))F.resultLabel=slabel(chart,f.result);
  if(isArr(f.result)&&f.result.length){F.r1Label=slabel(chart,f.result[0]);F.rLastLabel=slabel(chart,f.result[f.result.length-1])}
  if(chart&&chart.unit)F.unit=chart.unit;
  return F;
}
function lmPlaceholders(t){var o=[],m,re=/\{([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}/g;while((m=re.exec(String(t||''))))if(o.indexOf(m[0])<0)o.push(m[0]);return o.sort()}
// fill "{key.field}"; missing -> {text:null, missing:[...]}
function lmResolve(t,item,ctx){
  var miss=[],chart=ctx.charts[item.chart]&&ctx.charts[item.chart].fx.chart;
  var txt=String(t||'').replace(/\{([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}/g,function(all,k,fl){
    var v;
    if(k==='nd'&&item.claim&&item.claim.basis==='x_not_observed')v=fl==='x'?item.claim.x:undefined;
    else{var fid=item.binds&&item.binds[k],f=fid&&ctx.byId[fid];if(f)v=lmFields(f,chart)[fl]}
    if(v==null){miss.push(all);return all}return String(v)});
  return {text:miss.length?null:txt,missing:miss};
}
// does fact f match expectation e ({status?, result?})
function lmMatch(f,e){if(!f)return false;if(e.status!=null&&f.status!==e.status)return false;
  if(own(e,'result'))return JSON.stringify(f.result)===JSON.stringify(e.result);return true}
// all items of a unit (each kind of content), with the field that holds its paired texts
function lmItems(u){
  var L=[];
  (u.copy||[]).forEach(function(x){L.push({kind:'copy',x:x,pairs:[[x.en,x.vi]]})});
  (u.claims||[]).forEach(function(x){var P=[[x.en,x.vi]];if(x.why)P.push([x.why.en,x.why.vi]);if(x.q)P.push([x.q.en,x.q.vi]);L.push({kind:'claim',x:x,pairs:P})});
  (u.controlled||[]).forEach(function(x){L.push({kind:'controlled',x:x,pairs:[[x.why&&x.why.en,x.why&&x.why.vi]]})});
  (u.keyFeatures||[]).forEach(function(x){var P=[[x.reason&&x.reason.en,x.reason&&x.reason.vi]];if(x.self)P.push([x.self.en,x.self.vi]);L.push({kind:'keyFeature',x:x,pairs:P})});
  (u.questions||[]).forEach(function(x){L.push({kind:'question',x:x,pairs:[[x.q&&x.q.en,x.q&&x.q.vi],[x.why&&x.why.en,x.why&&x.why.vi]]})});
  return L;
}
// full check -> {errors[], pending, approved, total, ctx}. release=true: any 'pending' is an error too.
function lmCheck(u,release){
  var E=[],ctx=lmFacts(u),ids={},pending=0,approved=0;
  ctx.errors.forEach(function(e){E.push(e)});
  ctx.list.forEach(function(f){if(/cross/i.test(f.type))E.push('Fact '+f.id+': crossing facts must never exist.')});
  var later=[];Object.keys(u.charts||{}).forEach(function(k){var st=u.charts[k].stages||[];if(st.some(function(s){return PRE.indexOf(s)<0}))later.push(k)});
  var laterWords=[];later.forEach(function(k){var fx=u.charts[k];if(!fx||!fx.chart)return;laterWords.push(fx.id);(fx.chart.series||[]).forEach(function(s){laterWords.push(s.label,s.id)})});
  lmItems(u).forEach(function(it){
    var x=it.x,n=it.kind+' '+(x&&x.id);
    if(!x||typeof x.id!=='string'||!x.id){E.push(it.kind+' without an id.');return}
    if(ids[x.id])E.push('Duplicate content id: '+x.id);ids[x.id]=1;
    if(STAGES.indexOf(x.stage)<0)E.push(n+': unknown stage "'+x.stage+'".');
    if(x.review==='approved')approved++;else if(x.review==='pending')pending++;else E.push(n+': review must be "pending" or "approved".');
    // paired EN / VI: both present, same placeholders
    it.pairs.forEach(function(p){
      if(typeof p[0]!=='string'||!p[0].trim()||typeof p[1]!=='string'||!p[1].trim())E.push(n+': needs both English and Vietnamese text.');
      else if(lmPlaceholders(p[0]).join()!==lmPlaceholders(p[1]).join())E.push(n+': English and Vietnamese use different placeholders ('+lmPlaceholders(p[0]).join(' ')+' / '+lmPlaceholders(p[1]).join(' ')+').')});
    var chartBound=it.kind!=='copy';
    if(chartBound){
      if(!ctx.charts[x.chart])E.push(n+': unknown chart "'+x.chart+'".');
      else{var cst=u.charts[x.chart].stages||[];if(cst.indexOf(x.stage)<0)E.push(n+': chart '+x.chart+' is not used in stage "'+x.stage+'".')}
    }
    // facts: exist (not stale), belong to the item's chart, give the expected result
    var B=x.binds||{};if(it.kind==='keyFeature')B={f:x.fact};
    Object.keys(B).forEach(function(k){var f=ctx.byId[B[k]];
      if(!f){E.push(n+': fact "'+B[k]+'" does not exist (stale id or changed chart).');return}
      if(x.chart&&f._chart!==x.chart)E.push(n+': fact '+B[k]+' belongs to chart '+f._chart+', not '+x.chart+'.');
      var e=(x.expect||{})[k];if(it.kind==='keyFeature')e=x.expect||{status:'supported'};
      if(!e)E.push(n+': no expected result for "'+k+'".');
      else if(!lmMatch(f,e))E.push(n+': fact '+B[k]+' now gives '+f.status+' / '+JSON.stringify(f.result)+', expected '+JSON.stringify(e)+'.');
      if((it.kind==='claim'||it.kind==='keyFeature')&&f.status!=='supported')E.push(n+': a model sentence / key feature can only use supported facts ('+B[k]+' is '+f.status+').')});
    // every placeholder resolves
    var texts=[];if(it.kind==='question')texts=[x.q&&x.q.en,x.q&&x.q.vi,x.why&&x.why.en,x.why&&x.why.vi].concat((x.opts||[]).map(function(o){return o&&o.en}));else if(it.kind==='claim')texts=[x.en,x.vi].concat(x.q?[x.q.en,x.q.vi]:[]);else if(it.kind==='controlled')texts=[x.statement&&x.statement.en,x.why&&x.why.en,x.why&&x.why.vi];else if(it.kind==='keyFeature')texts=[x.reason&&x.reason.en,x.reason&&x.reason.vi].concat(x.self?[x.self.en,x.self.vi]:[]);else texts=[x.en,x.vi];
    texts.forEach(function(t){if(t==null)return;if(!chartBound&&lmPlaceholders(t).length)E.push(n+': general teaching copy cannot use chart placeholders.');
      else if(chartBound){var r=lmResolve(t,x,ctx);if(r.missing.length)E.push(n+': cannot fill '+r.missing.join(' ')+'.')}});
    // Learn redesign: "why" notes are bilingual teaching copy (no chart placeholders needed, but allowed); kf links must exist on the same chart
    if(it.kind==='claim'&&x.why!=null&&(typeof x.why!=='object'))E.push(n+': "why" must be {en, vi}.');
    if(it.kind==='claim'&&x.kf!=null){if(!isArr(x.kf))E.push(n+': "kf" must be a list of key feature ids.');
      else x.kf.forEach(function(id){var k=(u.keyFeatures||[]).filter(function(y){return y.id===id})[0];if(!k)E.push(n+': key feature "'+id+'" does not exist.');else if(k.chart!==x.chart)E.push(n+': key feature "'+id+'" is on chart '+k.chart+'.')})}
    if(it.kind==='keyFeature'&&x.lens!=null&&LENSES.indexOf(x.lens)<0)E.push(n+': lens must be one of '+LENSES.join(', ')+'.');
    if(it.kind==='claim'&&x.why){[x.why.en,x.why.vi].forEach(function(t){if(t==null)return;var r=lmResolve(t,x,ctx);if(r.missing.length)E.push(n+': cannot fill '+r.missing.join(' ')+' in "why".')})}
    // "throughout" only with a verified *-throughout fact
    if(it.kind==='claim'&&/throughout/i.test(x.en||'')&&!Object.keys(B).some(function(k){var f=ctx.byId[B[k]];return f&&/-throughout$/.test(f.type)&&f.status==='supported'}))
      E.push(n+': "throughout" needs a supported highest/lowest-throughout fact.');
    // Controlled: recompute the label
    if(it.kind==='controlled'){
      if(x.type==='ovd'){if(['overview','detail'].indexOf(x.answer)<0)E.push(n+': answer must be "overview" or "detail".')}
      else if(LABELS.indexOf(x.label)<0)E.push(n+': label must be supported / contradicted / not_determinable.');
      else{var got=lmClassify(x,ctx,u);if(got.label!==x.label)E.push(n+': stored answer "'+x.label+'" but the chart gives "'+got.label+'" ('+got.why+').')}
      if(!x.statement||typeof x.statement.en!=='string')E.push(n+': needs an English statement.');
    }
    // multiple-choice question: the stored answer is recomputed from the chart JSON or a verified fact (key), unless it is a reviewed teacher key
    if(it.kind==='question'){var qe=lmQuestionCheck(x,ctx,u);qe.forEach(function(e){E.push(n+': '+e)})}
    // no answer leak: nothing before Independent may use a later chart
    if(PRE.indexOf(x.stage)>=0){
      if(chartBound&&later.indexOf(x.chart)>=0)E.push(n+': stage "'+x.stage+'" uses chart '+x.chart+', which must stay hidden until Independent.');
      Object.keys(B).forEach(function(k){var f=ctx.byId[B[k]];if(f&&later.indexOf(f._chart)>=0)E.push(n+': stage "'+x.stage+'" uses fact '+B[k]+' of a later chart.')});
      var all=JSON.stringify(x);laterWords.forEach(function(w){if(w&&all.indexOf(w)>=0)E.push(n+': stage "'+x.stage+'" mentions "'+w+'" from a later chart.')});
    }
  });
  if(release&&pending)E.push(pending+' item(s) still waiting for owner review (pending).');
  return {errors:E,pending:pending,approved:approved,total:pending+approved,ctx:ctx};
}
// question {opts:[{v,en}], answer, key}: key = {src:'unit'|'period'|'xs'|'series'|'not_series'} (read from the chart JSON),
// {fact:bindKey, field:'label'|'resultLabel'|'r1Label'|...} (the right option is exactly that verified value) or {reviewed:true} (human salience key).
// -> list of problems ([] = the stored answer is the only option the key accepts)
function lmQuestionCheck(x,ctx,u){
  var P=[],O=isArr(x.opts)?x.opts:[],fx=u.charts[x.chart],c=fx&&fx.chart,k=x.key||{};
  if(O.length<2)return ['needs at least 2 options.'];
  var vs=O.map(function(o){return o&&o.v});if(vs.some(function(v,i){return v==null||vs.indexOf(v)!==i}))P.push('options need distinct values "v".');
  if(vs.indexOf(x.answer)<0)return P.concat(['answer "'+x.answer+'" is not one of the options.']);
  if(!x.q||!x.q.en||!x.why||!x.why.en)P.push('needs a question and a "why".');
  if(!c)return P;
  var txt=function(o){var r=lmResolve(o.en,x,ctx);return r.text},S=c.series||[],xs=S[0]?CH.chXs(S[0]):[],ok;
  var labels=S.map(function(s){return s.label});
  if(k.src==='unit')ok=function(t){return !!c.unit&&t.indexOf(c.unit)>=0};
  else if(k.src==='period')ok=function(t){return xs.length>1&&t.indexOf(String(xs[0]))>=0&&t.indexOf(String(xs[xs.length-1]))>=0&&(t.match(/\d{4}/g)||[]).length===2};
  else if(k.src==='xs')ok=function(t){var y=(t.match(/\d{4}/g)||[]).map(Number);return y.length===xs.length&&xs.every(function(v){return y.indexOf(v)>=0})};
  else if(k.src==='series')ok=function(t){return labels.every(function(l){return t.indexOf(l)>=0})};
  else if(k.src==='not_series')ok=function(t){return labels.indexOf(t)<0};
  else if(k.fact){var f=ctx.byId[(x.binds||{})[k.fact]];if(!f)return P.concat(['key fact "'+k.fact+'" is missing.']);if(f.status!=='supported')return P.concat(['key fact '+f.id+' is '+f.status+'.']);
    var want=lmFields(f,c)[k.field];if(want==null)return P.concat(['key fact '+f.id+' has no "'+k.field+'".']);ok=function(t){return t===String(want)}}
  else if(k.reviewed===true)return P; // salience / overview-vs-detail: a human answer key, approved by the owner like every other item
  else return P.concat(['unknown key '+JSON.stringify(k)+'.']);
  var good=O.filter(function(o){var t=txt(o);return t!=null&&ok(t)}).map(function(o){return o.v});
  if(good.length!==1||good[0]!==x.answer)P.push('the chart accepts '+(good.length?'"'+good.join('", "')+'"':'no option')+', stored answer is "'+x.answer+'".');
  return P;
}
// Controlled statement -> {label, why}. claim = {bind, value} (supported / contradicted) or {basis:'x_not_observed', series, x} / {basis:'no_fact_type', type}
function lmClassify(x,ctx,u){
  var c=x.claim||{};
  if(c.basis==='x_not_observed'){var fx=u.charts[x.chart],s=fx&&CH.chSeries(fx.chart,c.series);if(!s)return {label:'?',why:'unknown series'};
    return CH.chXs(s).indexOf(c.x)<0?{label:'not_determinable',why:'x = '+c.x+' is not an observed point'}:{label:'?',why:'x = '+c.x+' IS observed'}}
  // gap between two lines at the first and last years shown (both endpoint facts, same years): narrowed / widened / same
  if(c.basis==='gap'){var fa=ctx.byId[(x.binds||{})[c.a]],fb=ctx.byId[(x.binds||{})[c.b]];
    if(!fa||!fb||fa.type!=='endpoint'||fb.type!=='endpoint'||fa.status!=='supported'||fb.status!=='supported')return {label:'not_determinable',why:'needs two supported endpoint facts'};
    var ea=fa.evidence,eb=fb.evidence;if(ea.x0!==eb.x0||ea.x1!==eb.x1)return {label:'not_determinable',why:'the two lines do not share their first / last year'};
    if((ea.y0-eb.y0)*(ea.y1-eb.y1)<0)return {label:'not_determinable',why:'the lines changed places, so "the gap" is not one gap'};
    var g0=Math.abs(ea.y0-eb.y0),g1=Math.abs(ea.y1-eb.y1),r=g1<g0?'narrowed':(g1>g0?'widened':'same');
    return r===c.value?{label:'supported',why:'gap '+g0+' → '+g1+' = '+r}:{label:'contradicted',why:'gap '+g0+' → '+g1+' = '+r+', not '+c.value}}
  if(c.basis==='no_fact_type')return ctx.list.some(function(f){return f._chart===x.chart&&f.type===c.type})?{label:'?',why:'a "'+c.type+'" fact exists'}:{label:'not_determinable',why:'no "'+c.type+'" fact can exist'};
  var f=ctx.byId[(x.binds||{})[c.bind]];if(!f)return {label:'?',why:'no fact'};
  if(f.status!=='supported')return {label:'not_determinable',why:f.id+' is '+f.status+(f.reason?' ('+f.reason+')':'')};
  var v=c.path==='first'?(isArr(f.result)?f.result[0]:undefined):f.result;
  return JSON.stringify(v)===JSON.stringify(c.value)?{label:'supported',why:f.id+' = '+JSON.stringify(v)}:{label:'contradicted',why:f.id+' = '+JSON.stringify(v)+', not '+JSON.stringify(c.value)};
}
var API={lmFacts:lmFacts,lmFields:lmFields,lmPlaceholders:lmPlaceholders,lmResolve:lmResolve,lmMatch:lmMatch,lmCheck:lmCheck,lmClassify:lmClassify,lmItems:lmItems,lmQuestionCheck:lmQuestionCheck,LM_STAGES:STAGES,LM_PRE:PRE,LM_LENSES:LENSES};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.LMX=API;
})(this);
