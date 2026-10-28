/* This file exists only in the independent, static UI artifact. */
(function(root){
'use strict';
root.MD_UI_ONLY_PREVIEW=true;root.MD_UI_NETWORK_VIOLATIONS=[];
var files=['data/vocab-lab-p1.json','data/vocab-lab-practice.json','data/vocab-lab-practice-v1.json'].map(function(p){return new URL(p,document.baseURI).href}),nativeFetch=root.fetch.bind(root);
function deny(name){root.MD_UI_NETWORK_VIOLATIONS.push(name);throw Error('UI-only demo blocked network capability: '+name)}
root.fetch=function(input,opt){var url;try{url=new URL(typeof input==='string'?input:input.url,document.baseURI);if(files.indexOf(url.href)<0||(opt&&opt.method&&opt.method!=='GET')||(input&&input.method&&input.method!=='GET'))return Promise.reject(Error('Only static fixture GETs are allowed.'));}catch(e){return Promise.reject(e)}return nativeFetch(url.href,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store'})};
root.XMLHttpRequest=function(){deny('XMLHttpRequest')};root.WebSocket=function(){deny('WebSocket')};root.EventSource=function(){deny('EventSource')};
if(root.navigator.sendBeacon)root.navigator.sendBeacon=function(){deny('sendBeacon')};
})(this);
