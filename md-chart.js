// Mini Drills · line-chart analysis (pure functions, no DOM). ONE analysis layer for Cambridge Writing charts (Create, player,
// marking) and Library › Learning Materials. Plain ES5. Browser: globals with these names (loaded before the app script).
// Node: module.exports (tests/chart-facts.test.js, tests/lm-check.js). Drawing (chartHTML / chLineHTML) stays in index.html.
(function(root){
'use strict';
var isArr=Array.isArray||function(a){return Object.prototype.toString.call(a)==='[object Array]'};
/* ---------- Writing Task 1: line charts (deterministic analysis, no DOM) ----------
   chart = {type:'line', hasTime:bool, unit?, title?, series:[{id, label, points:[{x, y|null}]}]} (max 4 series). Only type 'line' for now;
   another chart type would get its own validator / renderer / analysis next to these (chart.type picks them). y:null = a deliberate gap.
   None of these functions touch the Writing submission, marking or AI code. */
var CH_MAX_SERIES=4;
var chIsObj=function(o){return o!==null&&typeof o==='object'&&!isArr(o)};
var chFin=function(n){return typeof n==='number'&&isFinite(n)};
function chSeries(c,id){if(!chIsObj(c)||!isArr(c.series))return null;for(var i=0;i<c.series.length;i++){var s=c.series[i];if(chIsObj(s)&&s.id===id)return s}return null}
// y of a series at x: a number, null (gap) or undefined (no such point / bad data)
function chY(s,x){if(!chIsObj(s)||!isArr(s.points))return undefined;for(var i=0;i<s.points.length;i++){var p=s.points[i];if(chIsObj(p)&&p.x===x)return chFin(p.y)?p.y:(p.y===null?null:undefined)}return undefined}
// the x values of a series, sorted (numbers only)
function chXs(s){var o=[];if(chIsObj(s)&&isArr(s.points))s.points.forEach(function(p){if(chIsObj(p)&&chFin(p.x))o.push(p.x)});return o.sort(function(a,b){return a-b})}
function chSameXs(a,b){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
// do all series have exactly the same x values? (compared as numbers, not as joined strings)
function chSameX(c){if(!chIsObj(c)||!isArr(c.series)||!c.series.length)return false;var x0=chXs(c.series[0]);for(var i=1;i<c.series.length;i++)if(!chSameXs(x0,chXs(c.series[i])))return false;return true}
// -> {fatal:[], warnings:[], ok}. Never throws on malformed input. Fatal = cannot be saved or drawn.
function chValidate(c){
  var F=[],W=[],ids=[];
  var out=function(){return {fatal:F,warnings:W,ok:!F.length}};
  if(!chIsObj(c)){F.push('"chart" must be an object.');return out()}
  if(c.type!=='line')F.push('"chart.type" must be "line" (other chart types are not supported yet).');
  if(typeof c.hasTime!=='boolean')F.push('"chart.hasTime" must be true or false.');
  if(c.unit!=null&&typeof c.unit!=='string')F.push('"chart.unit" must be text.');
  if(c.title!=null&&typeof c.title!=='string')F.push('"chart.title" must be text.');
  if(!isArr(c.series)||!c.series.length){F.push('"chart.series" must be a list with at least one line.');return out()}
  if(c.series.length>CH_MAX_SERIES)F.push('A line chart can have at most '+CH_MAX_SERIES+' lines (this one has '+c.series.length+').');
  c.series.forEach(function(s,i){
    var n='Line '+(i+1);
    if(!chIsObj(s)){F.push(n+' must be an object {id, label, points}.');return}
    if(typeof s.id!=='string'||!s.id.trim())F.push(n+': "id" must be non-empty text.');
    else if(ids.indexOf(s.id)>=0)F.push(n+': the id "'+s.id+'" is used by another line.'); // array, not a plain object: "__proto__" etc. are safe
    else ids.push(s.id);
    if(typeof s.label!=='string'||!s.label.trim())F.push(n+': "label" must be non-empty text.');
    if(!isArr(s.points)||!s.points.length){F.push(n+': "points" must be a non-empty list.');return}
    var xs=[],last=null;
    s.points.forEach(function(p,k){
      var m=n+', point '+(k+1);
      if(!chIsObj(p)){F.push(m+' must be an object {x, y}.');return}
      if(!chFin(p.x))F.push(m+': "x" must be a number.');
      else{
        if(xs.indexOf(p.x)>=0)F.push(m+': x = '+p.x+' appears twice in this line.');
        else if(c.hasTime===true&&last!==null&&p.x<=last)F.push(m+': x values must increase from point to point (time order).');
        xs.push(p.x);last=p.x;
      }
      if(!(p.y===null||chFin(p.y)))F.push(m+': "y" must be a number, or null for a gap.');
    });
  });
  if(!F.length&&c.series.length>1&&!chSameX(c))W.push('The lines do not all have the same x values, so comparisons between lines (highest line, ranking) are not shown.');
  return out();
}
// 'up' | 'down' | 'flat' | 'mixed' | 'insufficient'. One point = 'flat' (no change can be seen). A gap (y null) = 'insufficient': no trend across a missing value.
function chTrend(points){
  if(!isArr(points)||!points.length)return 'insufficient';
  var ys=[];
  for(var i=0;i<points.length;i++){var p=points[i];if(!chIsObj(p)||!chFin(p.x)||!chFin(p.y))return 'insufficient';ys.push(p.y)}
  var up=0,dn=0;for(var k=1;k<ys.length;k++){if(ys[k]>ys[k-1])up++;else if(ys[k]<ys[k-1])dn++}
  if(up&&dn)return 'mixed';if(up)return 'up';if(dn)return 'down';return 'flat';
}
// ranking at x -> {order:[ids, highest first], tiedGroups:[[ids with the same y]…] (only real ties, highest first)}; null if any line has no value at x
function chRankAt(c,x){
  if(!chIsObj(c)||!isArr(c.series)||!c.series.length||!chFin(x))return null;
  var L=[];for(var i=0;i<c.series.length;i++){var s=c.series[i],y=chY(s,x);if(!chIsObj(s)||typeof s.id!=='string'||!chFin(y))return null;L.push({id:s.id,y:y,i:i})}
  L.sort(function(a,b){return b.y-a.y||a.i-b.i});
  var G=[];L.forEach(function(r){var g=G[G.length-1];if(g&&g.y===r.y)g.ids.push(r.id);else G.push({y:r.y,ids:[r.id]})});
  return {order:L.map(function(r){return r.id}),tiedGroups:G.filter(function(g){return g.ids.length>1}).map(function(g){return g.ids})};
}
// {result: seriesId|null, reason}: one line strictly highest at EVERY observed x, or why not
function chHighestThroughout(c){
  if(!chIsObj(c)||!isArr(c.series)||!c.series.length)return {result:null,reason:'insufficient_data'};
  if(!chSameX(c))return {result:null,reason:'mismatched_x_sets'};
  var xs=chXs(c.series[0]),R=[];if(!xs.length)return {result:null,reason:'insufficient_data'};
  for(var i=0;i<xs.length;i++){var r=chRankAt(c,xs[i]);if(!r)return {result:null,reason:'insufficient_data'};R.push(r)}
  for(i=0;i<R.length;i++){var g=R[i].tiedGroups[0];if(g&&g.indexOf(R[i].order[0])>=0)return {result:null,reason:'tied_leader'}}
  var lead=R[0].order[0];for(i=1;i<R.length;i++)if(R[i].order[0]!==lead)return {result:null,reason:'no_consistent_leader'};
  return {result:lead,reason:'observed_at_all_points'};
}
// true / false when both lines have a value at x; null when a line is unknown or a value is missing
function chEqualAt(c,a,b,x){var A=chSeries(c,a),B=chSeries(c,b);if(!A||!B||!chFin(x))return null;var ya=chY(A,x),yb=chY(B,x);if(!chFin(ya)||!chFin(yb))return null;return ya===yb}
// endpoint rank change of A vs B between xFrom and xTo. Says only whether the order at the two ends differs; never which year the lines crossed.
function chRankChange(c,a,b,xFrom,xTo){
  if(typeof a!=='string'||typeof b!=='string')return {status:'invalid_input',why:'Both line ids must be text.'};
  if(a===b)return {status:'invalid_input',why:'Choose two different lines.'};
  var A=chSeries(c,a),B=chSeries(c,b);
  if(!A||!B)return {status:'invalid_input',why:'Unknown line id: '+(!A?a:b)+'.'};
  if(!chFin(xFrom)||!chFin(xTo))return {status:'invalid_input',why:'Both x values must be numbers.'};
  if(c.hasTime===true&&xFrom>=xTo)return {status:'invalid_input',why:'The start must come before the end.'};
  if(!chSameXs(chXs(A),chXs(B)))return {status:'insufficient'};
  var a0=chY(A,xFrom),b0=chY(B,xFrom),a1=chY(A,xTo),b1=chY(B,xTo);
  if(!chFin(a0)||!chFin(b0)||!chFin(a1)||!chFin(b1))return {status:'insufficient'};
  if(a0===b0)return {status:'equal_at_endpoint',at:xFrom};
  if(a1===b1)return {status:'equal_at_endpoint',at:xTo};
  return {status:(a0>b0)!==(a1>b1)?'detected':'not_detected'};
}
// verified facts + safe sample Overview sentences (plain text; escape when shown). Never a guessed claim.
function t1OverviewSamples(c){
  var v=chValidate(c),facts=[],samples=[];
  if(!v.ok)return {facts:facts,samples:samples,note:'There is not enough verified data to suggest a sample. Look at the chart and decide for yourself.'};
  var S=c.series,TV={up:'rose',down:'fell',flat:'stayed the same',mixed:'went up and down'},tr=S.map(function(s){return chTrend(s.points)}),allOk=tr.every(function(t){return t!=='insufficient'});
  S.forEach(function(s,i){var ys=s.points.map(function(p){return p.y});
    facts.push(s.label+': '+(tr[i]==='insufficient'?'no overall trend (a value is missing)':TV[tr[i]]+(ys.length>1?' ('+ys[0]+' → '+ys[ys.length-1]+')':'')))});
  var hi=S.length>1?chHighestThroughout(c):{result:null,reason:'single_series'};
  if(hi.reason==='observed_at_all_points')facts.push(chSeries(c,hi.result).label+' was the highest at every point shown.');
  else if(hi.reason==='tied_leader')facts.push('At least once, two lines share the highest value, so no single line is highest throughout.');
  else if(hi.reason==='no_consistent_leader')facts.push('The highest line changes during the period.');
  else if(hi.reason==='mismatched_x_sets')facts.push('The lines do not share the same points, so they are not compared.');
  if(c.hasTime===true&&allOk){
    var join=function(L){return L.length<2?L[0]:L.slice(0,-1).join(', ')+' and '+L[L.length-1]},by={};
    S.forEach(function(s,i){(by[tr[i]]=by[tr[i]]||[]).push(s.label)});
    var parts=['up','down','flat','mixed'].filter(function(k){return by[k]}).map(function(k){return join(by[k])+' '+TV[k]});
    var xs=chSameX(c)?chXs(S[0]):null,span=xs&&xs.length>1?' between '+xs[0]+' and '+xs[xs.length-1]:' over the period';
    samples.push('Overall, '+(parts.length===1?parts[0]:parts.slice(0,-1).join(', ')+', while '+parts[parts.length-1])+span+'.');
  }
  if(hi.reason==='observed_at_all_points')samples.push(chSeries(c,hi.result).label+' had the highest figures throughout the period.');
  return {facts:facts,samples:samples,note:samples.length?'':'There is not enough verified data to suggest a sample. Look at the chart and decide for yourself.'};
}

/* ---- verified facts (Learning Materials, also usable anywhere a line chart exists) ----
   Rules (spec A5.2): y:null = missing, never 0, never filled in. Facts only about OBSERVED x values; nothing about what
   happened between two points (so there is no "crossing" fact type at all). Every fact: {id, type, series[], x?, period?,
   evidence{}, result, status:'supported'|'unsupported', reason?}. id = '<chartId>@<version>:<type>:<series>[@x]'. */
// valid points of a series, sorted by x: [{x,y}] with finite y only
function chValid(s){var o=[];if(chIsObj(s)&&isArr(s.points))s.points.forEach(function(p){if(chIsObj(p)&&chFin(p.x)&&chFin(p.y))o.push({x:p.x,y:p.y})});return o.sort(function(a,b){return a.x-b.x})}
// endpoint direction from the first and last VALID observed points -> {result:'increase'|'decrease'|'no_change'|'insufficient', x0,y0,x1,y1}
function chEndpoint(s){var v=chValid(s);if(v.length<2)return {result:'insufficient'};var a=v[0],b=v[v.length-1];
  return {result:b.y>a.y?'increase':b.y<a.y?'decrease':'no_change',x0:a.x,y0:a.y,x1:b.x,y1:b.y}}
// shape across ALL declared points: a gap (null) or fewer than 2 points = 'insufficient' (the shape inside a gap is unknown)
function chShape(s){
  if(!chIsObj(s)||!isArr(s.points)||s.points.length<2)return {result:'insufficient'};
  var P=s.points.slice().sort(function(a,b){return a.x-b.x}),up=0,dn=0;
  for(var i=0;i<P.length;i++)if(!chIsObj(P[i])||!chFin(P[i].y))return {result:'insufficient',reason:'missing_value'};
  for(i=1;i<P.length;i++){if(P[i].y>P[i-1].y)up++;else if(P[i].y<P[i-1].y)dn++}
  return {result:up&&dn?'fluctuating':up?'monotonic_increase':dn?'monotonic_decrease':'flat',ups:up,downs:dn}}
// change between the valid endpoints: absolute always; percent only from a non-zero baseline (rounded to 1 decimal)
function chChange(s){var e=chEndpoint(s);if(e.result==='insufficient')return {result:'insufficient'};
  var abs=Math.round((e.y1-e.y0)*1e6)/1e6,o={result:abs,x0:e.x0,y0:e.y0,x1:e.x1,y1:e.y1,abs:abs};
  if(e.y0===0){o.pct=null;o.pctStatus='zero_baseline'}else{o.pct=Math.round((e.y1-e.y0)/Math.abs(e.y0)*1000)/10;o.pctStatus='ok'}
  return o}
// highest / lowest value of one series among its valid points -> {y, xs[] (every x where it occurs)}
function chExtreme(s,hi){var v=chValid(s);if(!v.length)return null;var y=v[0].y;v.forEach(function(p){if(hi?p.y>y:p.y<y)y=p.y});
  return {y:y,xs:v.filter(function(p){return p.y===y}).map(function(p){return p.x})}}
// x values where ALL listed series have a finite y; 'mismatched_x_sets' when the declared x sets differ (no alignment in the MVP)
function chComparable(c,ids){
  var S=ids.map(function(id){return chSeries(c,id)});if(!S.length||S.some(function(s){return !s}))return {status:'invalid_input',xs:[]};
  var x0=chXs(S[0]);for(var i=1;i<S.length;i++)if(!chSameXs(x0,chXs(S[i])))return {status:'mismatched_x_sets',xs:[]};
  return {status:'ok',xs:x0.filter(function(x){return S.every(function(s){return chFin(chY(s,x))})}),declared:x0};
}
// lowest throughout = same rules as chHighestThroughout, from the bottom
function chLowestThroughout(c){
  if(!chIsObj(c)||!isArr(c.series)||!c.series.length)return {result:null,reason:'insufficient_data'};
  if(!chSameX(c))return {result:null,reason:'mismatched_x_sets'};
  var xs=chXs(c.series[0]),R=[];if(!xs.length)return {result:null,reason:'insufficient_data'};
  for(var i=0;i<xs.length;i++){var r=chRankAt(c,xs[i]);if(!r)return {result:null,reason:'insufficient_data'};R.push(r)}
  for(i=0;i<R.length;i++){var last=R[i].order[R[i].order.length-1],g=R[i].tiedGroups[R[i].tiedGroups.length-1];if(g&&g.indexOf(last)>=0)return {result:null,reason:'tied_lowest'}}
  var lo=R[0].order[R[0].order.length-1];for(i=1;i<R.length;i++)if(R[i].order[R[i].order.length-1]!==lo)return {result:null,reason:'no_consistent_lowest'};
  return {result:lo,reason:'observed_at_all_points'};
}
// fx = {id, version, chart}. Returns {ok, errors[], facts[]}; invalid charts give NO facts (never credible-looking output from bad data).
function chGetVerifiedFacts(fx){
  var out={ok:false,errors:[],facts:[]};
  if(!chIsObj(fx)||typeof fx.id!=='string'||!fx.id||!chFin(fx.version)){out.errors.push('A chart needs {id, version, chart}.');return out}
  var c=fx.chart,v=chValidate(c);if(!v.ok){out.errors=v.fatal.slice();return out}
  var P=fx.id+'@'+fx.version+':',F=out.facts,add=function(type,ser,x,o){var f={id:P+type+':'+ser.join('+')+(x!=null?'@'+x:''),type:type,series:ser};if(x!=null)f.x=x;
    for(var k in o)if(Object.prototype.hasOwnProperty.call(o,k))f[k]=o[k];if(!f.status)f.status='supported';F.push(f)};
  c.series.forEach(function(s){
    var e=chEndpoint(s),sh=chShape(s),ch=chChange(s),mx=chExtreme(s,true),mn=chExtreme(s,false);
    add('endpoint',[s.id],null,e.result==='insufficient'?{result:'insufficient',status:'unsupported',reason:'fewer_than_2_valid_points',evidence:{}}:{result:e.result,period:[e.x0,e.x1],evidence:{x0:e.x0,y0:e.y0,x1:e.x1,y1:e.y1}});
    add('shape',[s.id],null,sh.result==='insufficient'?{result:'insufficient',status:'unsupported',reason:sh.reason||'fewer_than_2_points',evidence:{}}:{result:sh.result,evidence:{ups:sh.ups,downs:sh.downs}});
    add('change',[s.id],null,ch.result==='insufficient'?{result:'insufficient',status:'unsupported',reason:'fewer_than_2_valid_points',evidence:{}}:{result:ch.abs,period:[ch.x0,ch.x1],evidence:{x0:ch.x0,y0:ch.y0,x1:ch.x1,y1:ch.y1,abs:ch.abs,pct:ch.pct,pctStatus:ch.pctStatus}});
    if(mx)add('max',[s.id],null,{result:mx.y,evidence:{y:mx.y,xs:mx.xs}});
    if(mn)add('min',[s.id],null,{result:mn.y,evidence:{y:mn.y,xs:mn.xs}});
  });
  if(c.series.length>1){
    var ids=c.series.map(function(s){return s.id}),cmp=chComparable(c,ids);
    var hi=chHighestThroughout(c),lo=chLowestThroughout(c);
    add('highest-throughout',ids,null,hi.reason==='observed_at_all_points'?{result:hi.result,evidence:{xs:chXs(c.series[0])}}:{result:null,status:'unsupported',reason:hi.reason,evidence:{}});
    add('lowest-throughout',ids,null,lo.reason==='observed_at_all_points'?{result:lo.result,evidence:{xs:chXs(c.series[0])}}:{result:null,status:'unsupported',reason:lo.reason,evidence:{}});
    if(cmp.status==='ok'){
      cmp.xs.forEach(function(x){var r=chRankAt(c,x);add('rank',ids,x,{result:r.order,evidence:{values:ids.map(function(id){return chY(chSeries(c,id),x)}),ties:r.tiedGroups}});
        r.tiedGroups.forEach(function(g){add('tie',g,x,{result:true,evidence:{y:chY(chSeries(c,g[0]),x)}})})});
      var xa=cmp.xs[0],xb=cmp.xs[cmp.xs.length-1];
      for(var i=0;i<ids.length;i++)for(var j=i+1;j<ids.length;j++){
        if(cmp.xs.length<2){add('rank-change',[ids[i],ids[j]],null,{result:null,status:'unsupported',reason:'fewer_than_2_comparable_points',evidence:{}});continue}
        var rc=chRankChange(c,ids[i],ids[j],xa,xb);
        add('rank-change',[ids[i],ids[j]],null,rc.status==='detected'||rc.status==='not_detected'?{result:rc.status,period:[xa,xb],evidence:{from:[chY(chSeries(c,ids[i]),xa),chY(chSeries(c,ids[j]),xa)],to:[chY(chSeries(c,ids[i]),xb),chY(chSeries(c,ids[j]),xb)]}}:
          {result:rc.status,status:'unsupported',reason:rc.status,period:[xa,xb],evidence:{at:rc.at}});
      }
    }else add('comparison',ids,null,{result:null,status:'unsupported',reason:cmp.status,evidence:{}});
  }
  out.ok=true;return out;
}

var API={CH_MAX_SERIES:CH_MAX_SERIES,chIsObj:chIsObj,chFin:chFin,chSeries:chSeries,chY:chY,chXs:chXs,chSameXs:chSameXs,chSameX:chSameX,chValidate:chValidate,chTrend:chTrend,chRankAt:chRankAt,chHighestThroughout:chHighestThroughout,chEqualAt:chEqualAt,chRankChange:chRankChange,t1OverviewSamples:t1OverviewSamples,chValid:chValid,chEndpoint:chEndpoint,chShape:chShape,chChange:chChange,chExtreme:chExtreme,chComparable:chComparable,chLowestThroughout:chLowestThroughout,chGetVerifiedFacts:chGetVerifiedFacts};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
else for(var k in API)if(Object.prototype.hasOwnProperty.call(API,k))root[k]=API[k];
})(this);
