'use strict';
// Teacher directions revise drafts; they never authorize an item or pack approval.
const reference='docs/CODEX-PHASE-2.7-TEACHER-DECISIONS.md';
const directions={
 '016':'Historical housing conditions; neutral and respectful toward residents.',
 '019':'Horse-drawn vehicle in this exercise only; verify passage scope before publication.',
 '026':'Legal professional in England and Wales; jurisdiction stays explicit.',
 '029':'Historical clearance and displacement; no assumed consent, benefit or rehousing.',
 '055':'Use plural emissions throughout the exercise; retain approved bank lemma and sense.'
};
function apply(packs,routes,C){
 for(const i of routes.filter(i=>directions[i.sourceId.slice(-3)])){
  i.history.push({version:i.version,content:C.copy(i.content),status:i.status,digest:C.digest(i.content),reviews:C.copy(i.reviews),blocker:C.copy(i.blocker),origin:'before-teacher-directions'});
  const n=i.sourceId.slice(-3),c=i.content;
  c.teacherDirection={reference,direction:directions[n],status:'APPLIED_TO_DRAFT_NOT_APPROVAL'};
  if(n==='016'){
   c.sentence='The historical report called the overcrowded district with very poor housing a slum. This describes housing conditions, not the worth of its residents.';
   c.final.prompt='A historical survey described an urban district of unsafe, overcrowded homes as a ___. The label described the housing conditions, not the residents.';
  }
  if(n==='019'){
   c.sentence='The museum carriage has passenger seats and two shafts attached to a horse that pulls the vehicle.';
   c.investigate.why='The passenger seats, horse and shafts identify a horse-drawn carriage in this display. This exercise does not rule out the train-compartment meaning in other contexts.';
   c.final.prompt='A horse stood between the shafts of a wheeled passenger vehicle. Once the passengers were seated, the driver guided the ___ along the lane.';
   c.final.why=c.investigate.why;
  }
  if(n==='026'){
   c.sentence='In England and Wales, a client asks a solicitor for legal advice on a property contract.';
   c.final.prompt='In England and Wales, Priya needs professional legal advice on a property contract. She makes an appointment with a ___.';
   c.investigate.why='A solicitor is a legal professional in England and Wales. This example concerns legal advice on a property contract, not a role shared by every profession or jurisdiction.';
   c.final.why=c.investigate.why;
  }
  if(n==='029'){
   c.sentence='The historical archive records a plan to clear slums by demolishing poor-quality housing. It does not say whether residents consented or where displaced households were rehoused.';
   c.final.prompt='The historical authorities planned to ___ by demolishing poor-quality housing. The record does not establish residents\' consent, successful rehousing or any benefit to them.';
  }
  c.investigate.context=c.sentence;
  i.blocker={topic:'Verify draft implementation: '+i.term,options:['Revision follows the recorded teacher direction','Request further revision'],recommendedOption:'Revision follows the recorded teacher direction',recommendation:directions[n]+' Direction is settled; inspect this exact version before any later approval.',examples:[c.sentence,c.final.prompt]};
  i.version=3;i.sourceVersion=3;i.status='TEACHER_REVIEW';i.reviews=[];
 }
 const p=packs.find(p=>p.terms.some(t=>t.sourceId==='C17-T1-R1-055'));
 p.contentHistory.push({version:p.version,terms:C.copy(p.terms),morph:C.copy(p.morph),origin:'before-teacher-directions'});
 p.version=3;const t=p.terms.find(t=>t.sourceId==='C17-T1-R1-055');
 t.teacherDirection={reference,direction:directions['055'],status:'APPLIED_TO_DRAFT_NOT_APPROVAL'};
 t.sentence='The exhibit log records exhaust emissions released by an old engine while it was running.';
 Object.assign(t.investigate,{context:t.sentence,prompt:'What does emissions refer to in this exhibit log?',options:['Substances released by the engine.','Substances supplied to the engine as fuel.','Substances retained inside the engine as lubricant.'],answer:0,clue:'Trace where the substances go during operation.',why:'The emissions leave the engine; fuel enters it, while lubricant retained inside has not been released.'});
 Object.assign(t.decode,{prompt:'Which wording describes substances released by the engine?',options:['exhaust emissions from the engine','fuel deliveries to the engine','lubricant reserves inside the engine'],answer:0,clue:'Follow the direction of movement described in the log.',why:'Exhaust emissions are substances released from the engine. Fuel deliveries go in, and lubricant reserves remain inside.'});
 Object.assign(t.final,{prompt:'The laboratory measured the engine\'s ___. These included nitrogen oxides released during operation.',answers:['emissions'],clue:'The next sentence refers back to several substances; check the number of the noun in the gap.',why:'Emissions is plural because these refers to substances released by the engine. The singular emission does not fit this plural reference.',variantPolicy:'Teacher direction: '+reference+'. Bank label: emission. This exercise requires the reviewed plural emissions. Case and extra spaces are ignored; emission, fumes, exhaust and other synonyms are not accepted.',strictVariants:true});
 return {revisedSenses:5,versionedItems:9,unchangedItems:93,policy:'Option A: exact taught expression and individually reviewed variants only',reference};
}
module.exports={apply,reference,directions};
