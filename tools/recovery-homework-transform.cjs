'use strict';
// Candidate-only explicit submission policy; legacy persisted screenshots remain submitted.
function apply(html){
 function once(a,b){if(html.split(a).length!==2)throw Error('Homework boundary changed: '+a);html=html.replace(a,b)}
 once("up=HWUP[k]||{},r=t.s", "up=HWUP[k]&&HWUP[k].owner===U.email?HWUP[k]:{},r=t.s");
 once("open=!!(HWX[k]||up.busy||up.err)","open=!!(HWX[k]||up.busy||up.err||up.shot)");
 once("  if(r&&img)h+=", "  if(up.shot)h+='<p class=\"saved\" role=\"status\">Screenshot ready. Press Submit to turn it in.</p><button class=\"btn pri\" type=\"button\" data-act=\"hw-submit-shot\" data-asg=\"'+esc(a.id)+'\" data-x=\"'+esc(t.x.id)+'\"'+(up.busy?' disabled':'')+'>Submit screenshot</button>';\n  if(r&&img)h+=");
 const start=html.indexOf("document.addEventListener('change',function(e){var f=e.target,aid="),end=html.indexOf('var PASS=',start);if(start<0||end<0)throw Error('Upload handler missing');
 const block=`function hwSubmitShot(aid,xid){
  var key=aid+'|'+xid,p=HWUP[key],em=U&&U.email;
  if(!p||!p.shot||p.owner!==em||p.busy)return Promise.resolve(false);
  var asg=allAsgs().filter(function(x){return x.id===aid})[0];
  if(!asg||U.role!=='student'||asg.cls!==U.cls)return Promise.resolve(false);
  var now=Date.now(),old=hwRec(em,aid),did=slug(em)+'_'+aid,was=asgState(asg,em).turned,shots=hwShots(old);
  shots[xid]={id:p.shot.id,url:p.shot.url,ts:now};
  var rec={email:em,asgId:aid,ts:old&&old.ts||now,status:'submitted',shots:shots,updatedAt:now};
  if(shots.x1)rec.shot=shots.x1;
  if(old&&(old.done===true||(!old.shot&&!old.shots)))rec.done=true;
  p.busy=true;p.err='';renderLib();
  var save=dbh?dbh.doc('hwdone/'+did).set(rec):DEMO?Promise.resolve():Promise.reject(new Error('Your account is not connected. Sign in and retry.'));
  return Promise.resolve(save).then(function(){
    if(!U||U.email!==em)return false;
    localHwdone=localHwdone.filter(function(x){return x.id!==did});localHwdone.push(Object.assign({id:did},rec));HWUP[key]={};
    var turned=asgState(asg,em).turned;if(!was&&turned)onHwDone(aid);renderLib();toast('Screenshot submitted.');return true;
  },function(er){if(U&&U.email===em){p.busy=false;p.err=er&&er.message||'Submission failed. Try again.';renderLib()}return false});
}
document.addEventListener('change',function(e){var f=e.target,aid=f&&f.getAttribute&&f.getAttribute('data-hwshot');if(!aid||!f.files||!f.files[0]||!U)return;var file=f.files[0],xid=f.getAttribute('data-x')||'x1',key=aid+'|'+xid,em=U.email;
  if(!/^image\\//.test(file.type)){HWUP[key]={owner:em,err:'Choose a picture (PNG, JPG, WebP or GIF).'};return renderLib()}
  if(file.size>15*1024*1024){HWUP[key]={owner:em,err:'This picture is too big. Take a smaller screenshot.'};return renderLib()}
  HWUP[key]={owner:em,busy:true,pct:0};renderLib();
  hwShrink(file).then(function(b){if(b.size>5*1024*1024)throw new Error('The picture is too big (5 MB at most).');return hwShotUpload(b,function(p){if(HWUP[key]&&HWUP[key].owner===em)HWUP[key].pct=p})})
    .then(function(d){if(!U||U.email!==em)return;HWUP[key]={owner:em,shot:{id:d.id,url:d.url}};renderLib()})
    .catch(function(er){if(U&&U.email===em){HWUP[key]={owner:em,err:er&&er.message||'Upload failed. Try again.'};renderLib()}})});
`;
 html=html.slice(0,start)+block+html.slice(end);
 once("  if(a==='hw-shot'){", "  if(a==='hw-submit-shot'){hwSubmitShot(t.dataset.asg,t.dataset.x||'x1');return true}\n  if(a==='hw-shot'){");
 return html;
}
module.exports={apply};
