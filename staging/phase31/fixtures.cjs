'use strict';
// Synthetic authoring only. No real catalog content or identifiers are copied.
const base=require('../domain.cjs');
const LESSONS=['fx31_alpha','fx31_beta'];
function domain(lesson){
 if(!LESSONS.includes(lesson))throw Error('Unknown fixture lesson');
 const items=Array.from({length:4},(_,n)=>{
  const term=['lantern','basket','ribbon','button'][n],id=`${lesson}_${n+1}`;
  return {id,sourceId:id,senseId:id,lessonId:lesson,term,version:1,kind:n%2?'micro-review':'contextual-challenge',content:{sentence:`In this invented workshop, a ${term} carries a blue tag.`,investigate:{prompt:'Which tag belongs to the object?',options:['blue','red'],answer:0,clue:'Read the tag colour.',why:'The invented record specifies blue.'},final:{prompt:`Recall the object labelled number ${n+1} in the workshop.`,answers:[term],clue:`It begins with ${term[0]}.`,why:'This is a synthetic recall exercise.'}}};
 });
 const validate=i=>{
  const c=i.content,q=c?.investigate,r=c?.final;
  const valid=items.some(x=>x.id===i.id)&&typeof c?.sentence==='string'&&c.sentence.length>0&&c.sentence.length<2000&&typeof q?.prompt==='string'&&Array.isArray(q.options)&&q.options.length>=2&&q.options.every(x=>typeof x==='string')&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length&&typeof r?.prompt==='string'&&Array.isArray(r.answers)&&r.answers.length>0&&r.answers.every(x=>typeof x==='string'&&x.trim())&&[q,r].every(x=>typeof x.clue==='string'&&typeof x.why==='string');
  return {valid:!!valid,errors:valid?[]:['Invalid synthetic content']};
 };
 return {...base,LESSON:lesson,bank:null,C:{validate},catalog:()=>items.map(i=>({...base.copy(i),hash:base.hash(i.content)})),newSession:(uid,item,id)=>({...base.newSession(uid,item,id),lessonId:lesson})};
}
module.exports={domain,LESSONS};
