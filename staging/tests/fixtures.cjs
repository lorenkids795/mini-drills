'use strict';
const {LESSON}=require('../domain.cjs');
async function provision(c,uid,role){
 const claims=role==='admin'?{role:'teacher',adm:true}:{role};
 await c.auth.setCustomUserClaims(uid,claims);
 await c.db.doc('vocab30_accounts/'+uid).set({uid,email:uid+'@local.invalid',role,active:true,tester:role==='student'||role==='tester',classId:'synthetic-a',revokedAfter:0});
 if(role==='teacher'&&uid!=='unassigned')await c.db.doc('vocab28_staff/'+uid).set({active:true,lessons:[LESSON],classes:['synthetic-a']});
 if(role==='student')await c.db.doc('vocab28_enrollments/'+uid).set({active:true,lessons:[LESSON],classId:'synthetic-a'});
}
module.exports={provision};
