'use strict';
const C=require('../vocab-editorial-core'),bank=require('../data/vocab-lab-p1.json');
const core=require('./domain-core.cjs'),{hash}=core,LESSON=bank.lessonId;
function catalog(){return C.catalog(bank,require('../vocab-mission-packs').packs,require('../vocab-routes').items).map(i=>({...i,id:i.sourceId,lessonId:LESSON,hash:hash(i.content)}))}
module.exports={...core,LESSON,bank,C,catalog,newSession:(uid,item,id)=>core.newSession(uid,{...item,lessonId:LESSON},id)};
