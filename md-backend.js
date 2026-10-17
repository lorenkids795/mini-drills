// Adapter: gives the app the same window.claude.use('db') API, backed by Firebase.
// Login is NOT Google. Students use class + name + email + password; teachers use an
// emailed 6-digit code. Both go through /api, which returns a Firebase custom token.
(function () {
  var C = window.MD_CONFIG || {};
  if (C.demo !== false) return;
  var V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var API = C.api || '/api';
  function load(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = base + src; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  var ready = load('firebase-app-compat.js')
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
    return h('input', { id: id, type: type, placeholder: ph || '', autocomplete: ac || 'off', required: 'required' });
  }

  function ui() {
    var card = document.querySelector('#v-login .login');
    if (!card || document.getElementById('mdAuth')) return;
    var root = h('div', { id: 'mdAuth', style: 'display:flex;flex-direction:column;gap:14px' });
    var msg = h('p', { 'class': 'msg', id: 'authMsg', 'aria-live': 'polite' });
    var say = function (t, ok) { msg.textContent = t || ''; msg.style.color = ok ? 'var(--ok, #12896f)' : ''; };

    var tabS = h('button', { type: 'button', 'class': 'btn sm', text: 'Student' });
    var tabT = h('button', { type: 'button', 'class': 'btn sm', text: 'Teacher' });
    var tabs = h('div', { style: 'display:flex;gap:8px' }, [tabS, tabT]);

    /* student: sign in */
    var sEmail = inp('sEmail', 'email', 'you@example.com', 'email');
    var sPass = inp('sPass', 'password', '', 'current-password');
    var sBtn = h('button', { type: 'submit', 'class': 'btn pri', text: 'Sign in' });
    var formIn = h('form', {}, [field('Email', sEmail), field('Password', sPass), sBtn]);
    var toReg = h('button', { type: 'button', 'class': 'btn sm', text: 'First time here? Create your password' });

    /* student: first time */
    var rClass = h('select', { id: 'rClass', required: 'required' });
    var rName = h('select', { id: 'rName', required: 'required' });
    var rEmail = inp('rEmail', 'email', 'you@example.com', 'email');
    var rPass = inp('rPass', 'password', 'At least 6 characters', 'new-password');
    var rBtn = h('button', { type: 'submit', 'class': 'btn pri', text: 'Create my password' });
    var formReg = h('form', { hidden: 'hidden' }, [
      field('Class', rClass), field('Your name', rName), field('Your email', rEmail), field('Choose a password', rPass), rBtn]);
    var toIn = h('button', { type: 'button', 'class': 'btn sm', hidden: 'hidden', text: 'I already have a password' });

    /* teacher: sign in */
    var tEmail = inp('tEmail', 'email', 'teacher@example.com', 'email');
    var tPass = inp('tPass', 'password', '', 'current-password');
    var tBtn = h('button', { type: 'submit', 'class': 'btn pri', text: 'Sign in' });
    var formT = h('form', { hidden: 'hidden' }, [field('Teacher email', tEmail), field('Password', tPass), tBtn]);
    var toTReg = h('button', { type: 'button', 'class': 'btn sm', hidden: 'hidden', text: 'First time? Create your teacher password' });

    /* teacher: first time (needs the setup key from the Cloudflare settings) */
    var trEmail = inp('trEmail', 'email', 'teacher@example.com', 'email');
    var trPass = inp('trPass', 'password', 'At least 6 characters', 'new-password');
    var trKey = inp('trKey', 'password', 'Setup key', 'off');
    var trBtn = h('button', { type: 'submit', 'class': 'btn pri', text: 'Create teacher password' });
    var formTR = h('form', { hidden: 'hidden' }, [field('Teacher email', trEmail), field('Choose a password', trPass), field('Setup key', trKey), trBtn]);
    var toTIn = h('button', { type: 'button', 'class': 'btn sm', hidden: 'hidden', text: 'I already have a password' });

    root.appendChild(tabs);
    var demoLink = h('a', { href: '?demo=1', text: 'Demo mode (sample data, nothing is saved)', style: 'font-size:.85rem;color:var(--muted)' });
    [formIn, formReg, formT, formTR, toReg, toIn, toTReg, toTIn, msg, demoLink].forEach(function (x) { root.appendChild(x); });
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
      if (c === '__email') { rName.appendChild(h('option', { value: '', text: '(not needed)' })); rName.removeAttribute('required'); return; }
      rName.setAttribute('required', 'required');
      rName.appendChild(h('option', { value: '', text: c ? 'Choose your name' : 'Choose a class first' }));
      (namesAll || []).filter(function (n) { return n.cls === c; }).forEach(function (n) {
        rName.appendChild(h('option', { value: n.id, text: n.name }));
      });
    }
    rClass.addEventListener('change', fillNames);

    function show(which) {
      formIn.hidden = which !== 'student'; toReg.hidden = which !== 'student';
      formReg.hidden = which !== 'reg'; toIn.hidden = which !== 'reg';
      formT.hidden = which !== 'teacher'; toTReg.hidden = which !== 'teacher';
      formTR.hidden = which !== 'treg'; toTIn.hidden = which !== 'treg';
      tabS.className = 'btn sm' + ((which === 'student' || which === 'reg') ? ' pri' : '');
      tabT.className = 'btn sm' + ((which === 'teacher' || which === 'treg') ? ' pri' : '');
      say('');
      if (which === 'reg') loadNames();
    }
    tabS.onclick = function () { show('student'); };
    tabT.onclick = function () { show('teacher'); };
    toReg.onclick = function () { show('reg'); };
    toIn.onclick = function () { show('student'); };
    toTReg.onclick = function () { show('treg'); };
    toTIn.onclick = function () { show('teacher'); };
    show('student');

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
    formTR.onsubmit = function (ev) {
      ev.preventDefault();
      run(trBtn, function () { return post('register', { email: trEmail.value, password: trPass.value, setupKey: trKey.value }).then(enter); });
    };
  }

  /* ---------- teacher: reset a student's password (inside the Students tab) ---------- */
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
  function start() {
    ui();
    resetUi();
    ready.then(function (fb) {
      var first = true;
      fb.auth().onAuthStateChanged(function (u) {
        if (u) {
          u.getIdTokenResult().then(function (t) {
            var em = String(t.claims.em || '').toLowerCase();
            if (!em) { fb.auth().signOut(); return; }
            try { localStorage.setItem('md-email', em); } catch (e) {}
            window.MD_USER = { name: t.claims.nm || '', email: em };
            resolveDb(fb.firestore());
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
          try { localStorage.removeItem('md-email'); } catch (e) {}
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
