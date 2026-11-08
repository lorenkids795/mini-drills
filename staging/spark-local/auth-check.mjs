import {createAuthClient} from './auth-client.mjs';
// Local pinned compat bundle implements the modular interface; no CDN or Firestore client.
const sdk={
 initializeApp:(c,n)=>firebase.initializeApp(c,n),getAuth:app=>app.auth(),
 connectAuthEmulator:(auth,url,opts)=>auth.useEmulator(url,opts),
 inMemoryPersistence:firebase.auth.Auth.Persistence.NONE,
 setPersistence:(auth,p)=>auth.setPersistence(p),
 signInWithEmailAndPassword:(auth,email,password)=>auth.signInWithEmailAndPassword(email,password),
 getIdToken:(user,force)=>user.getIdToken(force),signOut:auth=>auth.signOut(),deleteApp:app=>app.delete()
};
const client=await createAuthClient({sdk,config:{projectId:'demo-mini-drills-vocab-test',apiKey:'emulator-only',authDomain:'localhost'}});
const $=id=>document.getElementById(id);
let busy=false;
function enabled(value){for(const id of ['refresh','progress','logout'])$(id).disabled=!value}
async function run(fn){if(busy)return;busy=true;try{$('status').textContent=JSON.stringify(await fn());enabled(true)}catch(e){$('status').textContent=e.message;enabled(false)}finally{busy=false;$('password').value=''}}
$('login').onsubmit=e=>{e.preventDefault();run(()=>client.login($('email').value,$('password').value))};
$('refresh').onclick=()=>run(()=>client.refresh());
$('progress').onclick=()=>run(()=>client.request('/student/progress'));
$('logout').onclick=async()=>{await client.logout();enabled(false);$('status').textContent='Signed out'};
