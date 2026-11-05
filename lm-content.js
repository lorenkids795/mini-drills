// Mini Drills · Library › Learning Materials: built-in lesson METADATA only (no chart, practice or answer data yet).
// Plain ES5. Loaded by index.html (window.MD_LM) and by Node for tests (module.exports).
// status: 'unpublished' = hidden from students (admin preview only) · 'published' = visible to everyone.
(function(root){
  var MD_LM={
    // skills = the top rows of the tree (in this order); a skill with no module shows "Coming soon"
    skills:[{id:'writing',title:'Writing'},{id:'listening',title:'Listening'},{id:'reading',title:'Reading'},{id:'speaking',title:'Speaking'}],
    modules:[{id:'ielts-academic-task1',skill:'writing',title:'Task 1'},{id:'ielts-task2',skill:'writing',title:'Task 2'}],
    lessons:[
      {id:'lm-writing-ac-t1-u0',title:'Unit 0: Data Reading & Selection',skill:'writing',module:'ielts-academic-task1',unit:0,languages:['en','vi'],version:1,status:'unpublished'},
      {id:'lm-writing-ac-t1-u2',title:'Unit 2: Overview (Time-series Line Charts)',skill:'writing',module:'ielts-academic-task1',unit:2,languages:['en','vi'],version:1,status:'unpublished'}
    ]
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=MD_LM;
  else root.MD_LM=MD_LM;
})(this);
