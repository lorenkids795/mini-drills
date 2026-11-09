// Mini Drills — only the files the app needs are served from the site.
// Everything else in the repo (CLAUDE.md, TESTING.md, PROMPT-*.md, tests/, firestore.rules, gemini-relay.gs,
// ai-worker.js, and any internal file added later) answers 404. The files stay in the GitHub repo.
// /api/* goes straight to functions/api/[[path]].js.

const ALLOW = new Set([
  '/', '/index', '/index.html',
  '/md-config.js', '/md-backend.js', '/md-chart.js', '/md-hw.js',
  '/lm-content.js', '/lm-engine.js', '/lm-unit2.js', '/lm-unit0.js',
  '/site.webmanifest', '/favicon.ico', '/robots.txt',
]);
// pictures and sound files (icons in assets/, and the old "audio/<file>.mp3" way of adding audio to an exercise)
const MEDIA = /\.(png|jpe?g|gif|webp|svg|ico|mp3|m4a|aac|wav|ogg|oga|webm|mp4)$/i;
const BLOCKED_DIRS = /^\/(tests|functions|node_modules|\.git)(\/|$)/i;

export function allowed(pathname) {
  let p = pathname;
  try { p = decodeURIComponent(pathname); } catch (e) { return false; }
  if (p.indexOf('/api/') === 0 || p === '/api') return true;
  if (p.indexOf('\\') >= 0 || p.indexOf('/../') >= 0) return false;
  if (BLOCKED_DIRS.test(p)) return false;
  if (ALLOW.has(p)) return true;
  if (p.indexOf('/.well-known/') === 0) return true;
  return MEDIA.test(p);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (allowed(url.pathname)) return context.next();
  return new Response('Not found.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
  });
}
