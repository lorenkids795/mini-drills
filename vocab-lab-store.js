/* Isolated persistence: optimistic revision lease, atomic progress + evidence writes. */
(function(root){
'use strict';
function store(db,email,lesson,uid){
  var id=uid+'__'+lesson,ref=db.doc('student_lesson_sort_progress/'+id);
  return {
    watch:function(ok,no){return ref.onSnapshot(function(doc){ok(doc.exists?doc.data():null)},no)},
    save:function(before,after,op){
      return db.runTransaction(function(tx){return tx.get(ref).then(function(doc){
        var remote=doc.exists?doc.data():null,rev=remote?remote.revision:0;
        if(remote&&remote.lastOperation===op.id)return remote;
        if(rev!==before.revision){var e=Error('Progress changed in another session. Latest progress loaded; retry your action.');e.code='vocab-conflict';e.remote=remote;throw e}
        after.lastOperation=op.id;tx.set(ref,after);
        Object.keys(after.termProgress).forEach(function(k){
          if(JSON.stringify(before.termProgress[k])===JSON.stringify(after.termProgress[k]))return;
          tx.set(db.doc('student_term_progress/'+uid+'__'+k),{email:email,senseId:k,lessonId:lesson,progress:after.termProgress[k],revision:after.revision});
        });
        Object.keys(before.termProgress).forEach(function(k){if(!after.termProgress[k])tx.delete(db.doc('student_term_progress/'+uid+'__'+k))});
        after.attempts.slice(before.attempts.length).forEach(function(a){
          tx.set(db.doc('student_attempts/'+uid+'__'+a.id),{email:email,lessonId:lesson,attempt:a});
        });
        return after;
      })});
    }
  };
}
if(typeof module!=='undefined'&&module.exports)module.exports=store;else root.MD_VOCAB_STORE=store;
})(this);
