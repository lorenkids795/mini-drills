'use strict';
const crypto=require('node:crypto');
// Offline contract for a future staging gateway; never fetches keys or contacts Firebase.
// Caller must supply trusted keys from the isolated project's reviewed verifier, not JWT input.
function verify(token,{projectId,keys,now=Math.floor(Date.now()/1000)}){
 if(projectId!=='mini-drills-vocab-staging')throw Error('Unapproved staging target');
 const parts=String(token).split('.');if(parts.length!==3)throw Error('Invalid token');
 const h=JSON.parse(Buffer.from(parts[0],'base64url')),p=JSON.parse(Buffer.from(parts[1],'base64url'));
 if(h.alg!=='RS256'||!h.kid||!Object.hasOwn(keys,h.kid))throw Error('Untrusted signing key');
 if(!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),keys[h.kid],Buffer.from(parts[2],'base64url')))throw Error('Invalid signature');
 if(p.aud!==projectId||p.iss!=='https://securetoken.google.com/'+projectId||typeof p.sub!=='string'||!p.sub||p.sub.length>128||!Number.isFinite(p.exp)||p.exp<=now||!Number.isFinite(p.iat)||p.iat>now||!Number.isFinite(p.auth_time)||p.auth_time>now)throw Error('Invalid token claims');
 return {...p,uid:p.sub};
}
module.exports={verify};
