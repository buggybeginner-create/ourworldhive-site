/* Ourworldhive engagement: site visitors, views, likes and comments.
   Works on every page that loads firebase-config.js. Nothing here needs a server of its own.
   Firestore collections: stats/site (views, visitors), eng/{key} (views, likes, comments),
   eng/{key}/likes/{uid}, eng/{key}/comments/{id}.   Keys look like thread__ID, game__ID, app__ID. */
(function () {
  'use strict';
  var C = window.OWH_FIREBASE;
  if (!C || window.OWHEng) return;
  var ROOT = 'projects/' + C.projectId + '/databases/(default)/documents';
  var BASE = 'https://firestore.googleapis.com/v1/' + ROOT, KEY = '?key=' + encodeURIComponent(C.apiKey);
  var OWNS = /\/(forum|games)(\.html)?$/.test(location.pathname);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function num(v) { return v && ('integerValue' in v) ? +v.integerValue : 0; }
  function fmt(n) { n = +n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : n.toLocaleString('en-US'); }
  function ago(ms) { var s = Math.max(1, Math.round((Date.now() - ms) / 1000)); if (s < 60) return 'just now'; var m = Math.round(s / 60); if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' h ago'; var d = Math.round(h / 24); return d < 30 ? d + ' d ago' : new Date(ms).toLocaleDateString(); }
  function safeKey(k) { return /^[a-z]+__[A-Za-z0-9_-]{1,80}$/.test(k); }

  /* ---------- counters over plain HTTPS (no sign-in needed to add a view) ---------- */
  function bump(path, fields) {
    return fetch('https://firestore.googleapis.com/v1/projects/' + C.projectId + '/databases/(default)/documents:commit' + KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ writes: [{ update: { name: ROOT + '/' + path, fields: {} }, updateMask: { fieldPaths: [] }, updateTransforms: fields.map(function (f) { return { fieldPath: f, increment: { integerValue: '1' } }; }) }] })
    }).catch(function () {});
  }
  var cache = { t: 0, p: null, map: {} };
  function loadCounts(force) {
    if (cache.p && !force && Date.now() - cache.t < 60000) return cache.p;
    cache.t = Date.now();
    var out = {};
    function page(tok) {
      return fetch(BASE + '/eng' + KEY + '&pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : '')).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) {
        (j.documents || []).forEach(function (d) { var f = d.fields || {}; out[d.name.split('/').pop()] = { v: num(f.views), l: num(f.likes), c: num(f.comments) }; });
        if (j.nextPageToken && Object.keys(out).length < 3000) return page(j.nextPageToken);
      });
    }
    cache.p = page('').catch(function () {}).then(function () { cache.map = out; return out; });
    return cache.p;
  }
  function rec(k) { return cache.map[k] || (cache.map[k] = { v: 0, l: 0, c: 0 }); }

  /* ---------- sign-in (shared with the rest of the site) ---------- */
  var AU = null, FS = null, ME = null, readyP = null, authFns = [];
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error(src)); }; document.head.appendChild(s); }); }
  function wait(test, ms) { return new Promise(function (res) { var t0 = Date.now(); (function loop() { if (test()) return res(true); if (Date.now() - t0 > ms) return res(false); setTimeout(loop, 150); })(); }); }
  function sdk() {
    if (readyP) return readyP;
    readyP = (async function () {
      try {
        var ok = window.firebase && firebase.auth && firebase.firestore && firebase.apps && firebase.apps.length;
        if (!ok && OWNS) ok = await wait(function () { return window.firebase && firebase.auth && firebase.firestore && firebase.apps && firebase.apps.length; }, 20000);
        if (!ok) {
          var b = 'https://www.gstatic.com/firebasejs/10.12.2/';
          if (!window.firebase || !firebase.initializeApp) await loadScript(b + 'firebase-app-compat.js');
          if (!firebase.auth) await loadScript(b + 'firebase-auth-compat.js');
          if (!firebase.firestore) await loadScript(b + 'firebase-firestore-compat.js');
          if (!firebase.apps.length) firebase.initializeApp(C);
        }
        AU = firebase.auth(); FS = firebase.firestore();
        await new Promise(function (res) { var first = true; AU.onAuthStateChanged(function (u) { ME = u; authFns.forEach(function (f) { try { f(u); } catch (e) {} }); if (first) { first = false; res(); } }); });
      } catch (e) { console.warn('engage sdk', e); }
    })();
    return readyP;
  }
  function who() { return ME ? (ME.displayName || String(ME.email || 'Member').split('@')[0]).slice(0, 40) : ''; }
  var modal;
  function closeModal() { if (modal) { modal.remove(); modal = null; } }
  function signIn(msg) {
    closeModal();
    modal = document.createElement('div'); modal.className = 'owhe-back';
    modal.innerHTML = '<div class="owhe-box" role="dialog" aria-modal="true"><h3>Sign in</h3><p class="owhe-m">' + esc(msg || 'Sign in to continue.') + '</p>' +
      '<button class="owhe-b g" data-a="g" type="button">Continue with Google</button><p class="owhe-m" style="text-align:center">or with email</p>' +
      '<input type="email" id="owheE" placeholder="Email" autocomplete="email"><input type="password" id="owheP" placeholder="Password" autocomplete="current-password">' +
      '<input type="text" id="owheN" placeholder="Your name" autocomplete="name" hidden><p class="owhe-er" id="owheR"></p>' +
      '<div class="owhe-row"><button class="owhe-b" data-a="x" type="button">Cancel</button><button class="owhe-b p" data-a="go" type="button">Sign in</button></div>' +
      '<p class="owhe-m" style="text-align:center;margin-top:12px"><a href="#" data-a="reg">New here? Create an account</a></p></div>';
    document.body.appendChild(modal);
    var reg = false, er = modal.querySelector('#owheR');
    function fail(e) { var c = (e && e.code) || ''; er.textContent = /invalid-credential|wrong-password|user-not-found/.test(c) ? 'That email or password is not right.' : /email-already/.test(c) ? 'That email already has an account.' : /weak-password/.test(c) ? 'Use at least 6 characters.' : /invalid-email/.test(c) ? 'That email does not look right.' : /popup/.test(c) ? 'The sign-in window was closed.' : ((e && e.message) || 'Something went wrong.'); }
    modal.addEventListener('click', function (e) {
      if (e.target === modal) return closeModal();
      var a = e.target.closest('[data-a]'); if (!a) return; e.preventDefault();
      var k = a.dataset.a;
      if (k === 'x') closeModal();
      else if (k === 'reg') { reg = !reg; modal.querySelector('#owheN').hidden = !reg; modal.querySelector('[data-a=go]').textContent = reg ? 'Create account' : 'Sign in'; a.textContent = reg ? 'Have an account? Sign in' : 'New here? Create an account'; }
      else if (k === 'g') sdk().then(function () { return AU.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }).then(closeModal).catch(fail);
      else if (k === 'go') {
        var em = modal.querySelector('#owheE').value.trim(), pw = modal.querySelector('#owheP').value, nm = modal.querySelector('#owheN').value.trim();
        if (!em || !pw) { er.textContent = 'Enter your email and password.'; return; }
        sdk().then(function () { return reg ? AU.createUserWithEmailAndPassword(em, pw).then(function (c) { return c.user.updateProfile({ displayName: nm || em.split('@')[0] }); }) : AU.signInWithEmailAndPassword(em, pw); }).then(closeModal).catch(fail);
      }
    });
    setTimeout(function () { var i = modal && modal.querySelector('#owheE'); if (i) i.focus(); }, 50);
  }

  /* ---------- the widget: heart, comments, views ---------- */
  var W = {};          // key -> list of widget elements
  var MINE = {};       // key -> true when this person liked it
  function paint(k) {
    var r = rec(k);
    (W[k] || []).forEach(function (w) {
      var lk = w.querySelector('.lk'); lk.querySelector('b').textContent = fmt(r.l); lk.setAttribute('aria-pressed', String(!!MINE[k])); lk.querySelector('i').textContent = MINE[k] ? '♥' : '♡';
      var cm = w.querySelector('.cm'); if (cm) cm.querySelector('b').textContent = fmt(r.c);
      var vw = w.querySelector('.vw'); if (vw) vw.querySelector('b').textContent = fmt(r.v);
    });
  }
  function checkMine(k) {
    if (!ME || !FS) return;
    FS.doc('eng/' + k + '/likes/' + ME.uid).get().then(function (d) { MINE[k] = d.exists; paint(k); }).catch(function () {});
  }
  authFns.push(function () { Object.keys(W).forEach(function (k) { MINE[k] = false; paint(k); checkMine(k); }); });
  function toggleLike(k) {
    sdk().then(function () {
      if (!ME) return signIn('Sign in to like this.');
      var was = !!MINE[k], r = rec(k), inc = firebase.firestore.FieldValue.increment;
      var lref = FS.doc('eng/' + k + '/likes/' + ME.uid), eref = FS.doc('eng/' + k), b = FS.batch();
      if (was) { b.delete(lref); b.set(eref, { likes: inc(-1) }, { merge: true }); } else { b.set(lref, { t: Date.now() }); b.set(eref, { likes: inc(1) }, { merge: true }); }
      MINE[k] = !was; r.l = Math.max(0, r.l + (was ? -1 : 1)); paint(k);
      return b.commit().catch(function (e) { console.warn(e); MINE[k] = was; r.l = Math.max(0, r.l + (was ? 1 : -1)); paint(k); alert('Could not save your like. Please try again.'); });
    });
  }
  function openComments(w, k) {
    var box = w.querySelector('.ec');
    if (!box.hidden) { box.hidden = true; if (box._un) { box._un(); box._un = null; } return; }
    box.hidden = false;
    box.innerHTML = '<div class="ecl">Loading…</div><div class="ecf"></div>';
    sdk().then(function () {
      if (!FS) { box.querySelector('.ecl').textContent = 'Comments are not available right now.'; return; }
      var list = box.querySelector('.ecl'), form = box.querySelector('.ecf');
      function drawForm() {
        form.innerHTML = ME ? '<textarea maxlength="500" rows="2" placeholder="Write a comment" aria-label="Write a comment"></textarea><button class="owhe-b p" type="button">Post comment</button>' : '<button class="owhe-b p" type="button">Sign in to comment</button>';
        form.querySelector('button').onclick = function () {
          if (!ME) return signIn('Sign in to comment.');
          var ta = form.querySelector('textarea'), t = ta.value.trim();
          if (!t) return;
          if (Date.now() - (openComments.last || 0) < 4000) { alert('Please wait a few seconds before commenting again.'); return; }
          openComments.last = Date.now();
          var inc = firebase.firestore.FieldValue.increment, b = FS.batch(), cref = FS.collection('eng/' + k + '/comments').doc();
          b.set(cref, { uid: ME.uid, name: who(), text: t.slice(0, 500), t: Date.now() }); b.set(FS.doc('eng/' + k), { comments: inc(1) }, { merge: true });
          form.querySelector('button').disabled = true;
          b.commit().then(function () { ta.value = ''; rec(k).c++; paint(k); }).catch(function (e) { console.warn(e); alert('Could not post. You may need to sign in again.'); }).then(function () { var bt = form.querySelector('button'); if (bt) bt.disabled = false; });
        };
      }
      drawForm();
      authFns.push(drawForm);
      box._un = FS.collection('eng/' + k + '/comments').orderBy('t', 'desc').limit(60).onSnapshot(function (s) {
        if (!s.size) { list.innerHTML = '<p class="owhe-m">No comments yet. Be the first.</p>'; return; }
        list.innerHTML = s.docs.map(function (d) { var x = d.data(), own = ME && x.uid === ME.uid; return '<div class="eci"><b>' + esc(x.name) + '</b> <span>' + ago(x.t) + '</span>' + (own ? ' <a href="#" data-del="' + d.id + '">Delete</a>' : '') + '<p>' + esc(x.text) + '</p></div>'; }).join('');
      }, function () { list.innerHTML = '<p class="owhe-m">Comments could not be loaded.</p>'; });
      list.onclick = function (e) {
        var a = e.target.closest('[data-del]'); if (!a) return; e.preventDefault();
        var inc = firebase.firestore.FieldValue.increment, b = FS.batch();
        b.delete(FS.doc('eng/' + k + '/comments/' + a.dataset.del)); b.set(FS.doc('eng/' + k), { comments: inc(-1) }, { merge: true });
        b.commit().then(function () { var r = rec(k); r.c = Math.max(0, r.c - 1); paint(k); }).catch(function () {});
      };
    });
  }
  function mount(el) {
    if (el._owhe) return; var k = el.getAttribute('data-owh-eng'); if (!safeKey(k)) return; el._owhe = 1;
    var noC = el.hasAttribute('data-owh-nocomments'), showV = el.hasAttribute('data-owh-view') || el.hasAttribute('data-owh-showviews');
    el.classList.add('owhe');
    el.innerHTML = '<button class="eb lk" type="button" aria-pressed="false" aria-label="Like"><i>♡</i> <b>0</b></button>' + (noC ? '' : '<button class="eb cm" type="button" aria-label="Comments">💬 <b>0</b></button>') + (showV ? '<span class="vw" title="Views">👁 <b>0</b></span>' : '') + (noC ? '' : '<div class="ec" hidden></div>');
    (W[k] = W[k] || []).push(el);
    el.querySelector('.lk').onclick = function (e) { e.stopPropagation(); toggleLike(k); };
    var cb = el.querySelector('.cm'); if (cb) cb.onclick = function (e) { e.stopPropagation(); openComments(el, k); };
    loadCounts().then(function () { paint(k); });
    if (window.firebase && firebase.apps && firebase.apps.length) sdk().then(function () { checkMine(k); });
    else if (ME) checkMine(k);
  }
  function scan(root) { Array.prototype.forEach.call((root || document).querySelectorAll('[data-owh-eng]'), mount); }
  /* small read-only counts, e.g. on a list of threads or games */
  function fill(root) {
    var els = (root || document).querySelectorAll('[data-owh-c]'); if (!els.length) return;
    loadCounts().then(function () { Array.prototype.forEach.call(els, function (e) { var r = rec(e.getAttribute('data-owh-c')); var t = '👁 ' + fmt(r.v) + '  ♡ ' + fmt(r.l) + '  💬 ' + fmt(r.c); if (e.textContent !== t) e.textContent = t; }); });
  }
  function view(k) {
    if (!safeKey(k)) return;
    var sk = 'owhv_' + k; try { if (sessionStorage.getItem(sk)) return; sessionStorage.setItem(sk, '1'); } catch (e) {}
    bump('eng/' + k, ['views']); loadCounts().then(function () { rec(k).v++; paint(k); });
  }

  /* ---------- whole-site visitors and views, shown in the footer ---------- */
  function siteStats() {
    var fields = [], isNewVisit = false;
    try { if (!sessionStorage.getItem('owh_sv')) { sessionStorage.setItem('owh_sv', '1'); fields.push('views'); isNewVisit = true; } } catch (e) {}
    try { if (!localStorage.getItem('owh_vid')) { localStorage.setItem('owh_vid', Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); fields.push('visitors'); } } catch (e) {}
    var done = fields.length ? bump('stats/site', fields) : Promise.resolve();
    done.then(function () { return fetch(BASE + '/stats/site' + KEY); }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.fields) return;
      var v = num(d.fields.views), u = num(d.fields.visitors);
      var host = document.querySelector('.sx-fbar') || document.querySelector('.sx-foot');
      if (!host || document.getElementById('owhStats')) return;
      var p = document.createElement('p'); p.id = 'owhStats'; p.className = 'owh-stats'; p.innerHTML = '👁 <b>' + fmt(v) + '</b> total views · 🧑 <b>' + fmt(u) + '</b> visitors';
      host.appendChild(p);
    }).catch(function () {});
  }

  var st = document.createElement('style');
  st.textContent = '.owhe{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0;font:600 14px system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.owhe .eb{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:inherit;font:inherit;cursor:pointer}' +
    '.owhe .eb:hover{border-color:#ffc857}.owhe .eb i{font-style:normal;font-size:17px;line-height:1}' +
    '.owhe .lk[aria-pressed=true]{background:rgba(255,92,120,.2);border-color:#ff5c78;color:#ff8da1}.owhe .vw{opacity:.75;padding:0 6px}' +
    '.owhe .ec{flex:1 0 100%;margin-top:4px;padding:12px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);font-weight:400}' +
    '.owhe .eci{padding:8px 0;border-top:1px solid rgba(255,255,255,.1)}.owhe .eci:first-child{border-top:0}.owhe .eci span{opacity:.6;font-size:12.5px;margin-left:6px}.owhe .eci p{margin:3px 0 0;white-space:pre-wrap;word-break:break-word}.owhe .eci a{font-size:12.5px;margin-left:8px;color:#ffc857}' +
    '.owhe .ecf{margin-top:10px;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}.owhe .ecf textarea{flex:1 1 220px;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:inherit;font:16px system-ui,sans-serif;padding:8px 10px;resize:vertical}' +
    '.owhe .ecl{max-height:320px;overflow:auto}' +
    '.owhe-b{min-height:40px;padding:0 16px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:inherit;font:600 15px system-ui,sans-serif;cursor:pointer}.owhe-b.p{background:#ffc857;color:#1a1030;border-color:#ffc857}.owhe-b.g{width:100%;background:#fff;color:#222;border-color:#fff}' +
    '.owhe-back{position:fixed;inset:0;z-index:2000;background:rgba(2,5,15,.78);display:grid;place-items:center;padding:16px;font-family:system-ui,sans-serif}' +
    '.owhe-box{width:min(400px,100%);background:#10172e;color:#eaf1ff;border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:20px}.owhe-box h3{margin:0 0 6px;font-size:22px}.owhe-box input{display:block;width:100%;box-sizing:border-box;margin:8px 0;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.3);color:inherit;font:16px system-ui,sans-serif;padding:0 12px}' +
    '.owhe-m{margin:6px 0;color:#9fb0d8;font-size:14px}.owhe-m a{color:#ffc857}.owhe-er{min-height:18px;margin:4px 0;color:#ff8da1;font-size:14px}.owhe-row{display:flex;gap:8px;justify-content:flex-end}' +
    '.owh-stats{margin:8px 0 0;color:#9fb0d8;font-size:14px}.owh-stats b{color:#eaf1ff}.owhc{color:#93a4cc;font-size:13px;white-space:pre}';
  document.head.appendChild(st);

  window.OWHEng = { mount: scan, fill: fill, view: view, signIn: signIn, sdk: sdk, me: function () { return ME; } };
  function boot() {
    scan(document); fill(document); siteStats();
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { scan(document); fill(document); }, 80); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
