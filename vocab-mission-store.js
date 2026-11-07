/* Local-only CAS under a browser Web Lock. No cloud/Firestore/network writes. */
(function(root){
'use strict';
function create(key,storage,locks){
 function read(){var raw=storage.getItem(key);return raw===null?null:JSON.parse(raw)}
 function save(before,after){
  if(!locks||!locks.request)return Promise.reject(new Error('Safe mission saving requires a browser with Web Locks. Use a current browser on localhost.'));
  return locks.request('md-vocab-write:'+key,function(){
   var remote=read();
   if(JSON.stringify(remote)!==JSON.stringify(before)){var e=new Error('Another tab updated this mission. Latest progress loaded; please retry your action.');e.code='mission-conflict';e.remote=remote;throw e}
   storage.setItem(key,JSON.stringify(after));return after;
  });
 }
 return {read:read,save:save};
}
if(typeof module!=='undefined'&&module.exports)module.exports=create;else root.MD_MISSION_STORE=create;
})(this);
