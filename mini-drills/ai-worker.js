// DEPRECATED – không dùng, AI chạy qua /api/ai/correct (functions/api/[[path]].js).
// Cloudflare Worker. Holds the AI key. Students call it only after Google sign-in.
// Deploy: Workers → Create → paste this file.
// Settings → Variables:
//   XAI_API_KEY        (secret)  your xAI key
//   FIREBASE_PROJECT_ID (text)   same projectId as md-config.js
// Optional: GEMINI_KEY (secret) used only if XAI_API_KEY is empty.

const PROMPT =
  'You are an IELTS Writing tutor. Find the grammar, spelling, punctuation and word-choice mistakes in the student text below. Reply with only a JSON array (at most 15 items, most important first) of objects {"from": exact words copied from the text, "to": the corrected words, "type": "grammar" | "spelling" | "punctuation" | "word choice", "why": one short sentence in simple English}. Keep "from" as short as possible but long enough to be found exactly in the text. If there are no mistakes reply [].\n\nSTUDENT TEXT:\n';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors()),
  });
}

async function signedIn(req, env) {
  const h = req.headers.get('Authorization') || '';
  const token = h.replace(/^Bearer\s+/i, '');
  if (!token || !env.FIREBASE_PROJECT_ID) return false;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
  if (!r.ok) return false;
  const info = await r.json();
  return info.aud === env.FIREBASE_PROJECT_ID && String(info.email_verified) === 'true';
}

async function ask(text, env) {
  if (env.XAI_API_KEY) {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + env.XAI_API_KEY,
      },
      body: JSON.stringify({
        model: 'grok-4.5',
        temperature: 0.2,
        max_tokens: 1200,
        messages: [{ role: 'user', content: PROMPT + text }],
      }),
    });
    if (!r.ok) throw new Error('ai ' + r.status);
    const data = await r.json();
    return data.choices && data.choices[0] && data.choices[0].message.content || '[]';
  }
  if (env.GEMINI_KEY) {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
        encodeURIComponent(env.GEMINI_KEY),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: PROMPT + text }] }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    if (!r.ok) throw new Error('ai ' + r.status);
    const data = await r.json();
    return (
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0].text) ||
      '[]'
    );
  }
  throw new Error('no key');
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    if (!(await signedIn(req, env))) return json({ error: 'sign in required' }, 401);
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    const text = String((body && body.text) || '').trim().slice(0, 6000);
    if (text.length < 8) return json([]);
    try {
      const raw = await ask(text, env);
      const m = raw.match(/\[[\s\S]*\]/);
      const fixes = m ? JSON.parse(m[0]) : [];
      return json(Array.isArray(fixes) ? fixes.slice(0, 15) : []);
    } catch (e) {
      return json({ error: 'busy' }, 502);
    }
  },
};
