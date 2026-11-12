/* Google Play Billing for every Ourworldhive app. Copyright DUKEKRRISH. All rights reserved.
   Works only inside an Ourworldhive Android app from the Play Store (it has window.OwhNative.playBuy).
   On the website the normal UPI / Razorpay / PayPal payment stays as it is.

   Product IDs in Play Console follow one rule:  <tool>_<plan>
     one-time ("In-app products"):  diary_perm, calc_perm, sf_perm ...
     subscriptions:                 pm_m1, pm_m3, pm_m12, pp_m1 ... (type 'subs')
   Use in an app:
     OWHPLAY.ok()                                     true inside the Play app
     OWHPLAY.price('diary_perm').then(p => ...)       the price Google shows in the buyer's money, e.g. "₹1,999.00"
     OWHPLAY.buy({tool:'diary', plan:'perm'})         opens Google Play's payment sheet, then the server switches the plan on
     OWHPLAY.restore('diary')                         after a reinstall: anything already bought is switched on again
   For plant / project apps also pass {target:'PLANTCODE'} (PM, E-Permit, Safety) or {target:'PROJECTID'} (Project Planner). */
(function () {
  var W = window, API = 'https://owh-pay.er-krushnananda.workers.dev/play', SUBS = { m1: 1, m3: 1, m12: 1 }, REQ = {}, n = 0;
  var NV = function () { return W.OwhNative && W.OwhNative.playBuy ? W.OwhNative : null; };
  W.owhPlayCb = function (req, json) { var f = REQ[req]; if (!f) return; delete REQ[req]; var o = {}; try { o = JSON.parse(json); } catch (e) {} f(o); };
  function call(fn, args) {
    return new Promise(function (res) { var id = 'p' + (++n) + Date.now(); REQ[id] = res; NV()[fn].apply(NV(), [id].concat(args || [])); setTimeout(function () { if (REQ[id]) { delete REQ[id]; res({ ok: false, err: 'Google Play did not answer.' }); } }, 300000); });
  }
  function idToken() { try { var u = W.firebase && firebase.auth && firebase.auth().currentUser; return u ? u.getIdToken() : Promise.resolve(''); } catch (e) { return Promise.resolve(''); } }
  function uid() { try { var u = W.firebase && firebase.auth && firebase.auth().currentUser; return u ? u.uid : ''; } catch (e) { return ''; } }
  var cache = {};
  /* tell the server: it checks the purchase with Google and switches the plan on in your account */
  function verify(o, p) {
    return idToken().then(function (tk) {
      return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool: o.tool, plan: o.plan, productId: o.tool + '_' + o.plan, type: SUBS[o.plan] ? 'subs' : 'inapp', token: p.token, pkg: NV().pkg(), idToken: tk, target: o.target || '' }) });
    }).then(function (r) { return r.json().catch(function () { return { ok: false, err: 'Server error ' + r.status }; }); })
      .then(function (j) { if (j && j.ok) { try { NV().playAck(p.token); } catch (e) {} } return j || { ok: false }; });
  }
  W.OWHPLAY = {
    ok: function () { return !!NV(); },
    price: function (id) {
      if (!NV()) return Promise.resolve('');
      if (cache[id] !== undefined) return Promise.resolve(cache[id]);
      var plan = id.split('_').pop();
      return call('playProducts', [JSON.stringify([{ id: id, type: SUBS[plan] ? 'subs' : 'inapp' }])]).then(function (r) {
        var it = r && r.items && r.items[0]; cache[id] = it ? it.price : ''; return cache[id];
      });
    },
    buy: function (o) {
      if (!NV()) return Promise.reject(new Error('Google Play payment works only in the app from the Play Store.'));
      o = o || {}; var acct = o.target || uid();
      if (!acct) return Promise.reject(new Error('Please sign in first.'));
      return call('playBuy', [o.tool + '_' + o.plan, SUBS[o.plan] ? 'subs' : 'inapp', acct]).then(function (p) {
        if (p.cancel) return { ok: false, cancel: true };
        if (p.owned) return W.OWHPLAY.restore(o.tool, o.target).then(function (r) { return r.done ? { ok: true, restored: true } : { ok: false, err: 'You already own this. Tap Restore purchase.' }; });
        if (!p.ok) throw new Error(p.err || 'Payment did not finish.');
        if (p.pending) return { ok: false, pending: true, err: 'Payment is pending. The full version switches on when Google confirms it.' };
        return verify(o, p).then(function (j) { if (!j.ok) throw new Error(j.err || 'Could not confirm the payment. Tap Restore purchase in a minute.'); return { ok: true }; });
      });
    },
    restore: function (tool, target) {
      if (!NV()) return Promise.resolve({ done: 0 });
      return call('playOwned', []).then(function (r) {
        var list = (r && r.items) || [], jobs = [];
        list.forEach(function (p) { (p.products || []).forEach(function (id) {
          var k = id.lastIndexOf('_'), t = id.slice(0, k), plan = id.slice(k + 1);
          if (t === tool) jobs.push(verify({ tool: t, plan: plan, target: target }, p));
        }); });
        return Promise.all(jobs).then(function (a) { return { done: a.filter(function (j) { return j && j.ok; }).length }; });
      });
    }
  };
})();
