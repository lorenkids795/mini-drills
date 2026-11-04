'use strict';
// This process is exclusively an emulator service: reject any outbound TCP target
// outside loopback, including accidental SDK fallback to metadata/cloud endpoints.
let installed=false;
function install(){if(installed)return;installed=true;const net=require('node:net'),original=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){let a=args[0];if(Array.isArray(a))a=a[0];const host=a&&typeof a==='object'?(a.host||'localhost'):typeof args[1]==='string'?args[1]:'localhost';if(!['127.0.0.1','localhost','::1'].includes(host))throw Error('External transport forbidden in emulator service: '+host);return original.apply(this,args)};}
module.exports={install};
