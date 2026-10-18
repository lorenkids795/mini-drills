// Mini Drills – Gemini relay on Google Apps Script (free, runs on Google servers in the US).
// Why: Cloudflare may run the site's /api from a region Gemini blocks ("User location is not supported").
// The site sends the request here, this script calls Gemini and sends the answer back.
//
// Setup (README section 3e):
// 1. script.google.com → New project → paste this whole file → Save.
// 2. Project Settings (gear icon) → Script Properties → Add:
//      GEMINI_KEY    = your key from aistudio.google.com/apikey
//      RELAY_SECRET  = a long random phrase (also put it in Cloudflare as GEMINI_PROXY_SECRET)
// 3. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy → allow access.
// 4. Copy the Web app URL (ends with /exec) → Cloudflare variable GEMINI_PROXY_URL. Deploy the site again.
// After editing this script: Deploy → Manage deployments → Edit → Version: New version, or the old code keeps running.
// Nothing is stored here. Only requests with the right RELAY_SECRET are passed on.

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var secret = props.getProperty('RELAY_SECRET') || '';
    if (!secret || req.secret !== secret) return reply({ relayError: 'wrong or missing secret (RELAY_SECRET in the script must equal GEMINI_PROXY_SECRET on Cloudflare)' });
    var key = props.getProperty('GEMINI_KEY') || '';
    if (!key) return reply({ relayError: 'GEMINI_KEY is not set in Script Properties' });
    var model = String(req.model || 'gemini-2.5-flash').replace(/[^A-Za-z0-9.\-]/g, '');
    var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify(req.body || {}),
      muteHttpExceptions: true
    });
    return reply({ status: res.getResponseCode(), body: res.getContentText() });
  } catch (err) {
    return reply({ relayError: String(err && err.message || err) });
  }
}

// Open the /exec link in a browser to check that the relay is online.
function doGet() {
  return reply({ ok: true, relay: 'mini-drills gemini relay' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
