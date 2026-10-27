// Text/background pairs inside the same CSS rule (tokens resolved for light and dark). Run: node tests/contrast-rules.js
const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const css=h.slice(0,h.indexOf('<script>\n(function(){'));
const T={light:{},dark:{}};const take=(th,b)=>b.replace(/--([\w-]+)\s*:\s*([^;}]+)/g,(m,k,v)=>{T[th][k]=v.trim()});
css.replace(/(^|\n|\})\s*:root\{([^}]*)\}/g,(m,a,b)=>take('light',b));css.replace(/:root\[data-theme="dark"\]\{([^}]*)\}/g,(m,b)=>take('dark',b));
const val=(th,k,d)=>{d=d||0;let v=T[th][k]!=null?T[th][k]:T.light[k];if(v==null)return null;const r=/^var\(--([\w-]+)\)$/.exec(v);return r&&d<5?val(th,r[1],d+1):v};
const rgb=x=>{let m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(x||'').trim());if(!m)return null;let s=m[1];if(s.length==3)s=s.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16))};
const L=c=>{const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
const r=(a,b)=>{a=L(a);b=L(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
const res=(th,x)=>{x=x.trim();const m=/^var\(--([\w-]+)\)$/.exec(x);return m?val(th,m[1]):x};
css.replace(/([^{}]+)\{([^{}]*)\}/g,(m,sel,b)=>{const c=/(?:^|;)\s*color:\s*([^;]+)/i.exec(b),g=/background(?:-color)?:\s*([^;]+)/i.exec(b);if(!c||!g)return;
 ['light','dark'].forEach(th=>{const a=rgb(res(th,c[1])),bb=rgb(res(th,g[1]));if(a&&bb){const v=r(a,bb);if(v<4.5)console.log(th,v.toFixed(2),sel.trim().slice(-60),'|',c[1].trim(),'on',g[1].trim())}})});
