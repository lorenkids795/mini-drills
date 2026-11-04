'use strict';
// Pure reference contract for a future signed-token adapter; no network or endpoint.
function principal(token,account,assignment,now=Math.floor(Date.now()/1000)){
 if(!token||!account||account.disabled||!token.uid||token.uid!==account.uid||!token.em||token.em.toLowerCase()!==account.email?.toLowerCase()||!Number.isFinite(token.exp)||token.exp<=now||!Number.isFinite(token.auth_time)||token.auth_time<(account.revokedAfter||0))throw Error('Invalid or stale identity');
 if(!['student','teacher'].includes(account.role)||token.role!==account.role||!!token.adm!==!!account.admin||account.admin&&account.role!=='teacher')throw Error('Refresh stale role claims');
 const admin=account.role==='teacher'&&account.admin===true,assigned=assignment?.active===true&&assignment.lessons?.includes('cam17-t1-reading-p1');
 return {uid:account.uid,email:account.email.toLowerCase(),role:admin?'admin':account.role,labPreview:admin||account.tester===true,canReview:admin||account.role==='teacher'&&assigned,canPublish:admin,canPractice:account.role==='student'&&assigned&&account.tester===true};
}
module.exports={principal};
