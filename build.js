// Mini Drills — Cloudflare Pages build step (no packages, plain Node).
// Copies ONLY the files the site needs into dist/ (the "Build output directory"). Everything else in the repo — CLAUDE.md,
// README.md, TESTING.md, PROMPT-*.md, tests/, firestore.rules, gemini-relay.gs, ai-worker.js, build.js, and any file added later
// that is not on the list — stays in GitHub but is never published. Static files cost no Functions requests.
// functions/ (the /api server) is NOT copied: Cloudflare Pages builds it from the repo root on its own.
// dist/404.html makes an unknown address answer HTTP 404 (instead of the app page with 200).
// Cloudflare Pages settings: Build command `node build.js` · Build output directory `dist`.
// The build stops (and Cloudflare keeps the previous deployment) if a page the app loads is missing or a published
// file looks like it holds a secret.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = __dirname, OUT = path.join(ROOT, process.argv[2] || 'dist');

// root files that are published (the app page, its scripts, the manifest, the headers file Cloudflare reads)
const FILES = /^(index\.html|md-[a-z0-9-]+\.js|lm-[a-z0-9-]+\.js|site\.webmanifest|robots\.txt|favicon\.ico|_headers)$/;
// folders that are published whole (icons; pictures and sound files an exercise may point to)
const DIRS = ['assets', 'audio', 'img', 'images', 'media'];
const MEDIA = /\.(png|jpe?g|gif|webp|svg|ico|mp3|m4a|aac|wav|ogg|oga|webm|mp4|woff2?|ttf|otf)$/i;
// never published, even if a rule above would match
const NEVER = /(^|\/)(\.|node_modules\/|tests?\/|functions\/)|\.(md|map|rules|gs|py|log|env|pem|key)$/i;
const SECRET = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"private_key"\s*:/, /"client_email"\s*:\s*"[^"]+gserviceaccount\.com"/, /\bsk-[A-Za-z0-9]{20,}/, /\bghp_[A-Za-z0-9]{30,}/, /GEMINI_KEY\s*[:=]\s*['"][A-Za-z0-9_-]{20,}/];

function list() {
  const out = [];
  fs.readdirSync(ROOT).forEach((f) => { const p = path.join(ROOT, f); if (fs.statSync(p).isFile() && FILES.test(f)) out.push(f); });
  DIRS.forEach((d) => {
    const walk = (rel) => { const p = path.join(ROOT, rel); if (!fs.existsSync(p)) return; fs.readdirSync(p).forEach((f) => { const r = rel + '/' + f, q = path.join(ROOT, r); if (fs.statSync(q).isDirectory()) walk(r); else if (MEDIA.test(f)) out.push(r); }); };
    walk(d);
  });
  return out.filter((f) => !NEVER.test(f)).sort();
}
function check(files) {
  const bad = [];
  files.forEach((f) => { if (/\.(html|js|json|webmanifest|txt)$|^_headers$/.test(f)) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); SECRET.forEach((re) => { if (re.test(s)) bad.push(f + ': looks like a secret (' + re.source.slice(0, 24) + '…)'); }); } });
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  (html.match(/(?:src|href)=["'][^"'#?]+/g) || []).map((s) => s.replace(/^(src|href)=["']/, '').replace(/^\//, ''))
    .filter((s) => !/^(https?:|data:|blob:|mailto:|api\/)/.test(s)).forEach((r) => { if (files.indexOf(r) < 0) bad.push('index.html loads ' + r + ' but it would not be published'); });
  return bad;
}
function build() {
  const files = list(), bad = check(files);
  if (bad.length) { console.error('Build stopped:\n  ' + bad.join('\n  ')); process.exit(1); }
  fs.rmSync(OUT, { recursive: true, force: true });
  files.forEach((f) => { const to = path.join(OUT, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), to); });
  fs.writeFileSync(path.join(OUT, '404.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found · Mini Drills</title>' +
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#f6f7fb;color:#1b2233}@media (prefers-color-scheme:dark){body{background:#0f1420;color:#e7ecf5}a{color:#8fa8ff}}a{color:#3355cc}</style></head>' +
    '<body><main><h1 style="font-size:1.4rem">Page not found</h1><p><a href="/">Go to Mini Drills</a></p></main></body></html>\n');
  console.log('Published ' + files.length + ' files + 404.html to ' + path.relative(ROOT, OUT) + '/:\n  ' + files.join('\n  '));
  return files;
}
if (require.main === module) build();
module.exports = { list, check, build };
