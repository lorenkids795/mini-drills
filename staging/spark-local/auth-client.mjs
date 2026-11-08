// Inject the locally bundled Firebase Web SDK. No CDN, Firestore client or global auth.
export async function createAuthClient({sdk,config,fetchImpl=globalThis.fetch,mode='emulator'}){
 if(mode!=='emulator')throw Error('SPARK_LIVE_LOCKED');
 if(config?.projectId!=='demo-mini-drills-vocab-test'||config.apiKey!=='emulator-only'||config.authDomain!=='localhost')throw Error('Emulator Web Auth configuration required');
 const app=sdk.initializeApp(config,'vocab-synthetic-'+globalThis.crypto.randomUUID());
 const auth=sdk.getAuth(app);
 sdk.connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});
 await sdk.setPersistence(auth,sdk.inMemoryPersistence);
 let generation=0;
 async function logout(){generation++;await sdk.signOut(auth)}
 async function login(email,password){
  if(!/^fx31_[a-z0-9_-]+@local\.invalid$/.test(email))throw Error('Synthetic account required');
  await logout();
  try{await sdk.signInWithEmailAndPassword(auth,email,password);return await request('/me')}catch(e){await logout();throw e}
 }
 async function request(path,body){
  if(!/^\/(me|review\/(list|item|decision|revise)|student\/(catalog|sessions|session|progress|start|action))(\?[^#]*)?$/.test(path))throw Error('API path denied');
  const user=auth.currentUser,epoch=generation;
  if(!user)throw Error('Sign in required');
  let token;
  try{token=await sdk.getIdToken(user,false)}catch(e){await logout();throw e}
  if(epoch!==generation||user!==auth.currentUser)throw Error('Session changed');
  const response=await fetchImpl(path,{method:body===undefined?'GET':'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})});
  // Never replay a mutation automatically. A refreshed identity cannot bypass revocation.
  if(response.status===401||response.status===403){await logout();throw Error('Session expired or permission denied')}
  if(!response.ok)throw Object.assign(Error('API request failed'),{status:response.status});
  const data=await response.json();
  if(epoch!==generation||user!==auth.currentUser)throw Error('Session changed');
  return data;
 }
 async function refresh(){
  if(!auth.currentUser)throw Error('Sign in required');
  try{await sdk.getIdToken(auth.currentUser,true);return await request('/me')}catch(e){await logout();throw e}
 }
 return {login,logout,request,refresh,close:async()=>{await logout();await sdk.deleteApp(app)}};
}
