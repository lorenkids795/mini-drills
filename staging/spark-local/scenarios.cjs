'use strict';
// Driver-neutral synthetic steps shared by offline QA and the future locked live runner.
const {randomUUID}=require('node:crypto');
async function lifecycle({teacher,admin,student}){
 let item=await teacher.request('/review/item?id=fx31_alpha_1');
 if(item.id!=='fx31_alpha_1'||item.status!=='DRAFT')throw Error('Fresh synthetic fixture required');
 const decide=(client,action)=>client.request('/review/decision',{itemId:item.id,version:item.version,hash:item.hash,operationId:randomUUID(),note:'Synthetic scenario',action});
 item=await decide(teacher,'approve');if(item.status!=='APPROVED')throw Error('Approval failed');
 item=await decide(admin,'publish');if(item.status!=='PUBLISHED')throw Error('Publication failed');
 return student.request('/student/start',{itemId:item.id,operationId:randomUUID()});
}
module.exports={lifecycle};
