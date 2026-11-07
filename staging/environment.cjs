'use strict';
// No deployed mode. Fail closed before loading any Firebase SDK.
function guard(env=process.env){
 if(!['demo-mini-drills-vocab','demo-mini-drills-vocab-test'].includes(env.GCLOUD_PROJECT))throw Error('A dedicated demo project is required');
 if(env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:18080'||env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:19099')throw Error('Exact loopback emulators required');
 if(env.GOOGLE_APPLICATION_CREDENTIALS||env.FIREBASE_CONFIG||env.FIREBASE_DATABASE_URL||env.FIREBASE_PROJECT_ID&&env.FIREBASE_PROJECT_ID!==env.GCLOUD_PROJECT||env.GOOGLE_CLOUD_PROJECT&&env.GOOGLE_CLOUD_PROJECT!==env.GCLOUD_PROJECT)throw Error('Cloud credentials/config are forbidden');
 return env.GCLOUD_PROJECT;
}
function connect(){const projectId=guard();require('./loopback-only.cjs').install();const deps=require('node:module').createRequire(require('node:path').resolve(process.env.VOCAB_EMULATOR_RUNTIME||require('node:path').join(__dirname,'../tools/emulator-runtime'),'package.json'));const {initializeApp}=deps('firebase-admin/app'),{getAuth}=deps('firebase-admin/auth'),{getFirestore}=deps('firebase-admin/firestore');const app=initializeApp({projectId},projectId);return {app,auth:getAuth(app),db:getFirestore(app),projectId};}
module.exports={guard,connect};
