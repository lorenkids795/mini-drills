// Adapter: gives the app the same window.claude.use('db') API, backed by Firebase.
// Login is NOT Google. Everyone uses email + password through /api, which returns a Firebase custom token.
// window.MD_USER = { name, email, role, adm } comes from the token claims (the app takes the role from here).
// The admin also gets an adminKey at login, kept in sessionStorage 'md-akey' for /api/admin/* (see adminApi in index.html).
// Every 10 minutes (and at start) it asks /api/status whether the account was paused or its email changed.
(function () {
  var C = window.MD_CONFIG || {};
  if (C.demo !== false) return;
  var V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var API = C.api || '/api';
  /* ---------- environment guard (11/2026) ----------
     A STAGING site (a Cloudflare Preview build, C.env = 'staging', written by build.js) never uses production: without its own
     Firebase settings it does not load Firebase at all, and it signs nobody in unless the server (GET /api/env) says it is a
     correctly set up staging deployment on the SAME Firebase project. A production site refuses a server that says staging.
     ENVB = the reason sign-in is refused (shown on the sign-in page). */
  var ENVB = '', STG = C.env === 'staging';
  if (STG && (!C.firebase || C.envError)) ENVB = 'This is the STAGING site and it is not set up yet (' + (C.envError || 'no staging Firebase project') + '). Nothing runs here until the staging setup is finished.';
  var envOk = fetch(API + '/env', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    window.MD_ENV = d;
    if (ENVB) return;
    if (STG && (d.env !== 'staging' || !d.ok || d.serverProject !== C.firebase.projectId)) ENVB = 'This is the STAGING site, but the server is not a safe staging server' + (d.problems && d.problems.length ? ': ' + d.problems.join('; ') : ' (environment ' + d.env + ', project ' + (d.serverProject || 'none') + ')') + '. Sign-in is off.';
    if (!STG && d.env === 'staging') ENVB = 'This site is set up for production but the server is a staging server. Sign-in is off.';
  }, function () { if (STG && !ENVB) ENVB = 'This is the STAGING site and its server could not be checked. Sign-in is off.'; })
    .then(function () { envShow(); });
  function envShow() {
    if (STG && document.body && !document.getElementById('mdStg')) {
      var b = document.createElement('div');
      b.id = 'mdStg'; b.setAttribute('role', 'status');
      b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:90;background:#8a5512;color:#fff;font:600 11px/1.4 system-ui,sans-serif;padding:4px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;max-width:calc(100vw - 16px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      document.body.style.paddingBottom = '40px'; // room under the page so the badge never covers a button or text
      b.textContent = 'STAGING · ' + ((C.firebase && C.firebase.projectId) || 'not set up') + ' · made-up test data only';
      document.body.appendChild(b);
    }
    var m = document.getElementById('authMsg');
    if (ENVB && m) { m.textContent = ENVB; m.setAttribute('role', 'alert'); }
  }
  function load(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = base + src; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  // a staging site without its own Firebase settings never loads Firebase (it waits for ever: nothing signs in, nothing is read)
  var ready = (STG && ENVB) ? new Promise(function () {}) : load('firebase-app-compat.js')
    .then(function () { return Promise.all([load('firebase-auth-compat.js'), load('firebase-firestore-compat.js')]); })
    .then(function () { firebase.initializeApp(C.firebase); return firebase; });

  var resolveDb, dbPromise = new Promise(function (r) { resolveDb = r; });
  window.claude = {
    use: function (name) {
      if (name === 'db') return dbPromise;
      return Promise.reject({ code: 'not_granted' });
    }
  };

  function post(path, body) {
    return envOk.then(function () { if (ENVB) throw new Error(ENVB); return postNow(path, body); });
  }
  function postNow(path, body) {
    return fetch(API + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.');
        return d;
      });
    }, function () { throw new Error('No connection. Check your internet and try again.'); });
  }
  function enter(res) {
    try { if (res.adminKey) sessionStorage.setItem('md-akey', res.adminKey); else sessionStorage.removeItem('md-akey'); } catch (e) {}
    // teachers and admin: staffKey for /api/audio (feedback, lesson) and the staff AI tools (see staffApi in index.html)
    try { if (res.staffKey) sessionStorage.setItem('md-skey', res.staffKey); else sessionStorage.removeItem('md-skey'); } catch (e) {}
    return ready.then(function (fb) { return fb.auth().signInWithCustomToken(res.token); });
  }

  /* ---------- login UI ---------- */
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function field(label, input) { return h('label', { 'class': 'field' }, [document.createTextNode(label), input]); }
  function inp(id, type, ph, ac) {
    return h('input', { id: id, name: id, type: type, placeholder: ph || '', autocomplete: ac || 'off', required: 'required' });
  }

  function ui() {
    var card = document.querySelector('#v-login .login');
    if (!card || document.getElementById('mdAuth')) return;
    // Sign-in v2: no Student / Teacher tabs; the role is switched by the text links (see the sign-in spec)
    var root = h('div', { id: 'mdAuth' });
    var msg = h('p', { 'class': 'msg', id: 'authMsg', 'aria-live': 'polite' });
    var say = function (t, ok) { msg.textContent = t || ''; msg.style.color = ok ? 'var(--ok, #12896f)' : ''; };

    /* student: sign in */
    var sEmail = inp('sEmail', 'email', 'you@example.com', 'email');
    var sPass = inp('sPass', 'password', '', 'current-password');
    var sBtn = h('button', { type: 'submit', 'class': 'lgbtn', text: 'Sign in' });
    var formIn = h('form', {}, [field('Email', sEmail), field('Password', sPass), sBtn]);
    var toReg = h('button', { type: 'button', 'class': 'lgalt', text: 'First time here? Create your password' });
    var toTeach = h('button', { type: 'button', 'class': 'lglink', text: 'Teacher sign in' });

    /* student: first time */
    var rClass = h('select', { id: 'rClass', name: 'rClass', required: 'required' });
    var rName = h('select', { id: 'rName', name: 'rName', required: 'required' });
    var rEmail = inp('rEmail', 'email', 'you@example.com', 'email');
    var rPass = inp('rPass', 'password', 'At least 6 characters', 'new-password');
    var rBtn = h('button', { type: 'submit', 'class': 'lgbtn', text: 'Create my password' });
    var formReg = h('form', { hidden: 'hidden' }, [
      field('Class', rClass), field('Your name', rName), field('Your email', rEmail), field('Choose a password', rPass), rBtn]);
    var toIn = h('button', { type: 'button', 'class': 'lgalt', hidden: 'hidden', text: 'I already have a password' });

    /* teacher: sign in */
    var tEmail = inp('tEmail', 'email', 'you@example.com', 'email');
    var tPass = inp('tPass', 'password', '', 'current-password');
    var tBtn = h('button', { type: 'submit', 'class': 'lgbtn', text: 'Sign in' });
    var formT = h('form', { hidden: 'hidden' }, [field('Email', tEmail), field('Password', tPass), tBtn]);
    var toStu = h('button', { type: 'button', 'class': 'lglink', hidden: 'hidden', text: 'Sign in as student' });
    // no teacher first-time form: teacher passwords are set by the admin (Admin › Teachers / Users), the server refuses teacher sign-ups

    [formIn, formReg, formT, msg, toReg, toIn, toTeach, toStu].forEach(function (x) { root.appendChild(x); });
    var host = document.querySelector('#loginForm');
    card.insertBefore(root, host || null);

    var namesAll = null;
    function loadNames() {
      if (namesAll) return Promise.resolve();
      say('Loading class list...', true);
      return fetch(API + '/names').then(function (r) { return r.json(); }).then(function (list) {
        namesAll = Array.isArray(list) ? list : [];
        var seen = {}, classes = [];
        namesAll.forEach(function (n) { if (!seen[n.cls]) { seen[n.cls] = 1; classes.push(n.cls); } });
        rClass.innerHTML = '';
        rClass.appendChild(h('option', { value: '', text: classes.length ? 'Choose your class' : 'No class list yet' }));
        classes.forEach(function (c) { rClass.appendChild(h('option', { value: c, text: c })); });
        rClass.appendChild(h('option', { value: '__email', text: 'My teacher already added my email' }));
        fillNames(); say('');
      }, function () { say('Could not load the class list. Check your internet.'); });
    }
    function fillNames() {
      rName.innerHTML = '';
      var c = rClass.value;
      if (c === '__email') { rName.appendChild(h('option', { value: '', text: '(not needed)' })); rName.removeAttribute('required'); rName.disabled = true; return; }
      rName.setAttribute('required', 'required'); rName.disabled = !c; // "Choose a class first" until a class is chosen
      rName.appendChild(h('option', { value: '', text: c ? 'Choose your name' : 'Choose a class first' }));
      (namesAll || []).filter(function (n) { return n.cls === c; }).forEach(function (n) {
        rName.appendChild(h('option', { value: n.id, text: n.name }));
      });
    }
    rClass.addEventListener('change', fillNames);

    function show(which) {
      formIn.hidden = which !== 'student'; toReg.hidden = which !== 'student'; toTeach.hidden = which !== 'student';
      formReg.hidden = which !== 'reg'; toIn.hidden = which !== 'reg';
      formT.hidden = which !== 'teacher'; toStu.hidden = which !== 'teacher';
      say('');
      if (which === 'reg') loadNames();
    }
    toTeach.onclick = function () { show('teacher'); };
    toStu.onclick = function () { show('student'); };
    toReg.onclick = function () { show('reg'); };
    toIn.onclick = function () { show('student'); };
    show('student');
    // class join link (?join=CODE): keep the code for after sign-in, then open "First time here?" with the class chosen
    // (the student still picks their own name from the class list; an existing account just signs in)
    var jm = /[?&]join=([A-Za-z0-9]{6,12})/.exec(location.search || '');
    if (jm) {
      var jcode = jm[1].toUpperCase();
      try { sessionStorage.setItem('md-join', jcode); } catch (e) {}
      fetch(API + '/join?code=' + encodeURIComponent(jcode)).then(function (r) { return r.json().then(function (d) { d._ok = r.ok; return d; }); }).then(function (d) {
        if (!d._ok) { say(d.error || 'This join link is not valid.'); try { sessionStorage.removeItem('md-join'); } catch (e) {} return; }
        show('reg');
        loadNames().then(function () {
          var has = (namesAll || []).some(function (n) { return n.cls === d.cls; });
          if (!has) { show('student'); say('Everyone in ' + d.title + ' already has an account. Sign in, or ask your teacher.'); return; }
          rClass.value = d.cls; fillNames();
          say('Joining ' + d.title + ': choose your name, then create your password. Already have an account? Press "I already have a password".', true);
        });
      }, function () { say('Could not check the join link. Check your internet.'); });
    }
    // signed out by the status check: say why
    var ended = '';
    try { ended = sessionStorage.getItem('md-ended') || ''; sessionStorage.removeItem('md-ended'); } catch (e) {}
    if (ended === 'moved') say('Your email was changed by the admin. Sign in with your new email.');
    else if (ended === 'off') say('Your account is paused. Ask your teacher.');
    else if (ended === 'kicked') say('Your account was removed. To come back, choose "First time here? Create your password".');
    else if (ended === 'role') say('Your account type was changed by the admin. Sign in again to open the right workspace.');
    else if (ended === 'norole') say('This account is not set up yet. Ask the admin.');

    function run(btn, fn) {
      btn.disabled = true; say('');
      fn().then(function () {}, function (e) { say(e && e.message || 'Something went wrong.'); })
        .then(function () { btn.disabled = false; });
    }
    formIn.onsubmit = function (ev) {
      ev.preventDefault();
      run(sBtn, function () { return post('login', { email: sEmail.value, password: sPass.value }).then(enter); });
    };
    formReg.onsubmit = function (ev) {
      ev.preventDefault();
      run(rBtn, function () {
        return post('register', { nameId: rClass.value === '__email' ? '' : rName.value, email: rEmail.value, password: rPass.value }).then(enter);
      });
    };
    formT.onsubmit = function (ev) {
      ev.preventDefault();
      run(tBtn, function () { return post('login', { email: tEmail.value, password: tPass.value }).then(enter); });
    };
  }

  /* ---------- teacher: reset a student's password (inside the Students tab; the admin uses the Admin tab) ---------- */
  function resetUi() {
    var pad = document.querySelector('#v-roster .pad');
    if (!pad || document.getElementById('mdReset')) return;
    var tg = inp('rsTarget', 'email', 'student@example.com', 'off');
    var np = inp('rsNew', 'password', 'At least 6 characters', 'new-password');
    var ap = inp('rsMine', 'password', 'Your own password', 'current-password');
    var btn = h('button', { type: 'submit', 'class': 'btn pri', text: 'Set new password' });
    var m = h('p', { 'class': 'saved', 'aria-live': 'polite' });
    var f = h('form', { id: 'mdReset', style: 'display:flex;flex-direction:column;gap:12px;max-width:420px;margin-top:22px' }, [
      h('h3', { text: 'Reset a student password' }),
      h('p', { 'class': 'h', text: 'A student forgot the password? Type their email and a new password, then give it to them. They can sign in with it right away.' }),
      field('Student email', tg), field('New password for the student', np), field('Your own password (to confirm it is you)', ap), btn, m]);
    pad.appendChild(f);
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var me = (window.MD_USER && window.MD_USER.email) || '';
      btn.disabled = true; m.textContent = ''; m.style.color = '';
      post('reset', { email: me, password: ap.value, target: tg.value, newPassword: np.value }).then(function () {
        m.textContent = 'Done. ' + tg.value.trim().toLowerCase() + ' can sign in with the new password.';
        tg.value = ''; np.value = ''; ap.value = '';
      }, function (e) { m.textContent = e && e.message || 'Something went wrong.'; m.style.color = 'var(--bad, #b42323)'; })
        .then(function () { btn.disabled = false; });
    };
  }

  /* ---------- session ---------- */
  // Paused or moved (email changed by the admin): sign out and show why on the sign-in page.
  function checkStatus(fb, em) {
    fetch(API + '/status?em=' + encodeURIComponent(em)).then(function (r) { return r.json(); }).then(function (d) {
      var why = d && d.moved ? 'moved' : d && d.off ? 'off' : d && d.kicked ? 'kicked' : '';
      if (!why) return;
      try { sessionStorage.setItem('md-ended', why); sessionStorage.removeItem('md-akey'); sessionStorage.removeItem('md-skey'); localStorage.removeItem('md-email'); } catch (e) {}
      fb.auth().signOut().then(function () { location.reload(); });
    }, function () { /* offline: try again next time */ });
  }
  function start() {
    ui();
    resetUi();
    envShow();
    // a saved session is only used once the environment check passed (staging: same project, safe server)
    Promise.all([ready, envOk]).then(function (r) { var fb = r[0];
      if (ENVB) { try { fb.auth().signOut(); } catch (e) {} envShow(); return; }
      var first = true, timer = null;
      fb.auth().onAuthStateChanged(function (u) {
        if (u) {
          u.getIdTokenResult().then(function (t) {
            var em = String(t.claims.em || '').toLowerCase();
            if (!em) { fb.auth().signOut(); return; }
            try { localStorage.setItem('md-email', em); } catch (e) {}
            // the role comes from the token, checked against the server (whoami): an old session (claims from before the admin changed
            // the account) or an unknown role never starts the app as a student; it signs out and says why
            var cr = String(t.claims.role || ''), KNOWN = { teacher: 1, assistant: 1, student: 1 };
            var end = function (why) {
              try { sessionStorage.setItem('md-ended', why); sessionStorage.removeItem('md-akey'); sessionStorage.removeItem('md-skey'); localStorage.removeItem('md-email'); } catch (e) {}
              fb.auth().signOut().then(function () { location.reload(); });
            };
            var go = function () {
              window.MD_USER = { name: t.claims.nm || '', email: em, role: cr, adm: t.claims.adm === true };
              var rf = document.getElementById('mdReset');
              if (rf && window.MD_USER.adm) rf.hidden = true;
              resolveDb(fb.firestore());
              checkStatus(fb, em);
              if (!timer) timer = setInterval(function () { checkStatus(fb, em); }, 600000);
            };
            fetch(API + '/whoami', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t.token }, body: '{}' })
              .then(function (r) { return r.json().then(function (d) { d._ok = r.ok; return d; }); })
              .then(function (d) {
                if (!d._ok) { if (KNOWN[cr]) go(); else end('norole'); return; } // server busy / old server: the token's role, if known
                if (!d.role) { end('norole'); return; }
                if (d.role !== cr || !!d.adm !== (t.claims.adm === true)) { end('role'); return; }
                go();
              }, function () { if (KNOWN[cr]) go(); else end('norole'); }); // offline: the token's role, if known
          });
        } else if (first) {
          // no saved session: forget a stale local email once, then show the login page
          var had = '';
          try { had = localStorage.getItem('md-email') || ''; localStorage.removeItem('md-email'); } catch (e) {}
          if (had) location.reload();
        }
        first = false;
      });
      document.addEventListener('click', function (ev) {
        var t = ev.target.closest && ev.target.closest('[data-act="logout"],#btnLogout,.logout');
        if (t) {
          try { localStorage.removeItem('md-email'); sessionStorage.removeItem('md-akey'); sessionStorage.removeItem('md-skey'); } catch (e) {}
          fb.auth().signOut().then(function () { location.reload(); });
        }
      }, true);
    }).catch(function () {
      var m = document.getElementById('authMsg');
      if (m) m.textContent = 'Could not load Firebase. Check your connection and md-config.js.';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
