'use strict';
const D=require('./domain-core.cjs');
// Verified ID token + current Auth record + server-owned staging roster. No browser roles.
function principal(token,user,account,now=Math.floor(Date.now()/1000)){
 if(!token||!user||!account||user.disabled||account.active!==true||token.uid!==user.uid||account.uid!==user.uid||!Number.isFinite(token.exp)||token.exp<=now||!Number.isFinite(token.auth_time)||token.auth_time<(account.revokedAfter||0))D.fail(401,'Inactive or stale identity');
 const claims=user.customClaims||{},role=claims.role==='teacher'&&claims.adm===true?'admin':claims.role;
 if(!['admin','teacher','student','tester'].includes(role)||account.role!==role||token.role!==claims.role||!!token.adm!==!!claims.adm)D.fail(403,'Refresh role or roster assignment');
 if(typeof user.email!=='string'||!user.email.endsWith('@local.invalid')||account.email!==user.email)D.fail(403,'Synthetic roster identity required');
 return {uid:D.key(user.uid),role,classId:account.classId||null,tester:account.tester===true};
}
module.exports={principal};
