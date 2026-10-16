// Adapter: gives the app the same window.claude.use('db') API, backed by Firebase.
(function () {
  var C = window.MD_CONFIG || {};
  if (C.demo !== false) return;
  var V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
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

  function ui() {
    var card = document.querySelector('#v-login');
    if (!card || document.getElementById('gBtn')) return;
    var b = document.createElement('button');
    b.id = 'gBtn'; b.className = 'btn pri'; b.type = 'button';
    b.textContent = 'Sign in with Google';
    var m = document.createElement('div');
    m.id = 'gMsg'; m.style.cssText = 'margin-top:10px;font-size:13px';
    var host = document.querySelector('#loginForm');
    (host ? host.parentNode : card).insertBefore(b, host || null);
    b.parentNode.insertBefore(m, b.nextSibling);
    b.onclick = function () {
      ready.then(function (fb) {
        var p = new fb.auth.GoogleAuthProvider();
        return fb.auth().signInWithPopup(p).catch(function (e) {
          if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment'))
            return fb.auth().signInWithRedirect(p);
          throw e;
        });
      }).catch(function (e) { m.textContent = 'Sign-in failed: ' + (e && e.message || e); });
    };
  }

  function start() {
    ui();
    ready.then(function (fb) {
      fb.auth().onAuthStateChanged(function (u) {
        if (u && u.email) {
          try { localStorage.setItem('md-email', u.email.toLowerCase()); } catch (e) {}
          window.MD_USER = { name: u.displayName || '', email: u.email.toLowerCase() };
          resolveDb(fb.firestore());
        }
      });
      document.addEventListener('click', function (ev) {
        var t = ev.target.closest && ev.target.closest('[data-act="logout"],#btnLogout,.logout');
        if (t) {
          try { localStorage.removeItem('md-email'); } catch (e) {}
          fb.auth().signOut().then(function () { location.reload(); });
        }
      }, true);
    }).catch(function () {
      var m = document.getElementById('gMsg');
      if (m) m.textContent = 'Could not load Firebase. Check your connection and md-config.js.';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
