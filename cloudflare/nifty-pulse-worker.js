/* NIFTY PULSE data worker (Cloudflare Workers). Copyright DUKEKRRISH. All rights reserved.
   One fast JSON feed for the Nifty Pulse widget: all Nifty 50 stocks + NIFTY 50 + BANK NIFTY in one reply.

   DATA SOURCES (the app chooses with ?src= auto | angel | breeze | yahoo):
     1. Angel One SmartAPI  (free, real-time, all 50 stocks in ONE call, auto login with TOTP, no daily login)
     2. ICICI Breeze        (free for ICICI Direct users, ONE stock per call, 100 calls/min and 5,000/day, login by hand once a day)
     3. Yahoo Finance       (no account needed, unofficial, can be a little delayed) - backup when Angel is not set up or fails

   SECRETS (Worker > Settings > Variables and Secrets, type "Secret"):
     ANGEL_API_KEY      SmartAPI app key
     ANGEL_CLIENT       Angel One client code (e.g. A123456)
     ANGEL_PIN          Angel One 4-digit MPIN
     ANGEL_TOTP_SECRET  the TOTP secret text shown when you enabled TOTP (not the 6-digit code)
     ADMIN_KEY          any long password you choose (protects alert-rule saving)
     BREEZE_API_KEY     (optional) ICICI Breeze app API key
     BREEZE_SECRET      (optional) ICICI Breeze app secret key
     TG_BOT_TOKEN       (optional) Telegram bot token for background alerts (people connect with CONNECT TELEGRAM in the app)
     TG_CHAT_ID         (optional, old way) one fixed Telegram chat id
   KV BINDING NP: needed for ICICI Breeze (daily session), Telegram alerts and Angel token fixes. Not needed for Angel/Yahoo only.
   ICICI Breeze app Redirect URL:  https://<your-worker>.workers.dev/breeze/callback

   ROUTES:  GET /candles?s=&tf=5m|15m|1h|1d&k=   GET /history?sym=   (chart and trend notes)
            GET /quotes?src=&sym=&extra=&bcodes=&k=   (k = ADMIN_KEY; without it only Yahoo is served)
              GET /status   GET /breeze/login   GET|POST /breeze/callback
            POST /rules (X-Admin-Key)   POST /test-telegram (X-Admin-Key)
   CRON (optional, for Telegram alerts):  * 3-10 * * 1-5   (every minute, Mon-Fri, 08:30-16:29 IST)
*/

import { connect } from 'cloudflare:sockets';

const ANGEL = 'https://apiconnect.angelone.in';
const BREEZE_HOST = 'api.icicidirect.com';
const BREEZE_MAX = 20; /* Breeze = 1 call per stock, so only your chosen stocks (max 20) */
const ALLOWED = ['https://ourworldhive.com', 'https://www.ourworldhive.com', 'http://localhost', 'http://127.0.0.1', 'null'];
const CACHE_SECONDS = 3;

/* Default Nifty 50 list (after the 30-Sep-2026 change: BSE in, WIPRO out). The worker also tries the official NSE list daily. */
const DEFAULT_LIST = ['ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK','BAJAJ-AUTO','BAJFINANCE','BAJAJFINSV','BEL','BHARTIARTL',
 'BSE','CIPLA','COALINDIA','DRREDDY','EICHERMOT','ETERNAL','GRASIM','HCLTECH','HDFCBANK','HDFCLIFE','HINDALCO','HINDUNILVR','ICICIBANK',
 'INDIGO','INFY','ITC','JIOFIN','JSWSTEEL','KOTAKBANK','LT','M&M','MARUTI','MAXHEALTH','NESTLEIND','NTPC','ONGC','POWERGRID','RELIANCE',
 'SBILIFE','SBIN','SHRIRAMFIN','SUNPHARMA','TATACONSUM','TMPV','TATASTEEL','TCS','TECHM','TITAN','TRENT','ULTRACEMCO'];

/* Angel One NSE tokens. A wrong or missing token is fixed automatically by the worker (searchScrip) and saved in KV. */
const TOK = {RELIANCE:'2885',TCS:'11536',HDFCBANK:'1333',INFY:'1594',ICICIBANK:'4963',SBIN:'3045',ITC:'1660',LT:'11483',KOTAKBANK:'1922',
 AXISBANK:'5900',BHARTIARTL:'10604',HINDUNILVR:'1394',BAJFINANCE:'317',ASIANPAINT:'236',MARUTI:'10999',TITAN:'3506',SUNPHARMA:'3351',
 ULTRACEMCO:'11532',HCLTECH:'7229',NTPC:'11630',POWERGRID:'14977',ONGC:'2475','M&M':'2031',TATASTEEL:'3499',JSWSTEEL:'11723',ADANIENT:'25',
 ADANIPORTS:'15083',COALINDIA:'20374',BAJAJFINSV:'16675',NESTLEIND:'17963',TECHM:'13538',GRASIM:'1232',HINDALCO:'1363',DRREDDY:'881',
 CIPLA:'694',EICHERMOT:'910','BAJAJ-AUTO':'16669',APOLLOHOSP:'157',TATACONSUM:'3432',SBILIFE:'21808',HDFCLIFE:'467',SHRIRAMFIN:'4306',
 BEL:'383',TRENT:'1964',ETERNAL:'5097',JIOFIN:'18143',INDIGO:'11195',TMPV:'3456',WIPRO:'3787',BSE:'19585',MAXHEALTH:'22377'};
const INDEX = [{s:'NIFTY',t:'99926000',y:'^NSEI',n:'NIFTY 50'},{s:'BANKNIFTY',t:'99926009',y:'^NSEBANK',n:'BANK NIFTY'}];

/* ICICI Breeze uses its own stock codes. Fix any wrong one from the app: Settings > ICICI codes (e.g. ETERNAL=ZOMLIM). */
const ICICI = {RELIANCE:'RELIND',HDFCBANK:'HDFBAN',INFY:'INFTEC',ICICIBANK:'ICIBAN',SBIN:'STABAN',LT:'LARTOU',KOTAKBANK:'KOTMAH',
 AXISBANK:'AXIBAN',BHARTIARTL:'BHAAIR',HINDUNILVR:'HINLEV',BAJFINANCE:'BAJFI',ASIANPAINT:'ASIPAI',TITAN:'TITIND',SUNPHARMA:'SUNPHA',
 ULTRACEMCO:'ULTCEM',HCLTECH:'HCLTEC',POWERGRID:'POWGRI','M&M':'MAHMAH',TATASTEEL:'TATSTE',JSWSTEEL:'JSWSTE',ADANIENT:'ADAENT',
 ADANIPORTS:'ADAPOR',COALINDIA:'COALIN',BAJAJFINSV:'BAFINS',NESTLEIND:'NESIND',TECHM:'TECMAH',HINDALCO:'HINDAL',DRREDDY:'DRREDD',
 EICHERMOT:'EICMOT','BAJAJ-AUTO':'BAAUTO',APOLLOHOSP:'APOHOS',TATACONSUM:'TATGLO',SBILIFE:'SBILIF',HDFCLIFE:'HDFSTA',SHRIRAMFIN:'SHRTRA',
 BEL:'BHAELE',ETERNAL:'ZOMLIM',INDIGO:'INTAVI',MAXHEALTH:'MAXHEA',TMPV:'TATMOT',WIPRO:'WIPRO',NIFTY:'NIFTY',BANKNIFTY:'CNXBAN'};

let JWT = null, JWT_DAY = '', LAST_ERR = '', LAST_SRC = '';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED.some(a => origin === a || origin.startsWith(a + ':')) ? origin : 'https://ourworldhive.com',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Key', 'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, st = 200, extra = {}) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'Content-Type': 'application/json', ...extra } });
    try {
      if (url.pathname === '/quotes') {
        let want = (url.searchParams.get('src') || 'auto').toLowerCase();
        /* Angel One and ICICI Breeze are your own broker accounts: only callers with your ADMIN_KEY get them. Everyone else gets Yahoo. */
        const owner = !env.ADMIN_KEY || url.searchParams.get('k') === env.ADMIN_KEY;
        /* friends with a FRIEND CODE from the owner get Angel One too (never ICICI Breeze) */
        const fr = owner ? null : await friendOf(env, url.searchParams.get('fc') || url.searchParams.get('k'));
        if (fr && want === 'breeze') want = 'auto';
        const locked = !owner && !fr && want !== 'yahoo';
        if ((owner && env.ADMIN_KEY || fr) && env.NP) ctx.waitUntil(seen(env, url, req, fr).catch(() => {}));
        if (locked) want = 'yahoo';
        const sym = cleanList(url.searchParams.get('sym'), want === 'breeze' ? BREEZE_MAX : 100);
        const bcodes = parseCodes(url.searchParams.get('bcodes'));
        const extra = want === 'breeze' ? [] : cleanList(url.searchParams.get('extra'), 20);
        const cacheKey = new Request('https://np-cache/quotes?l=' + (locked ? 1 : 0) + '&src=' + want + '&sym=' + sym.join(',') + '&x=' + extra.join(',') + (want === 'breeze' ? '&b=' + JSON.stringify(bcodes) : ''));
        const cache = caches.default;
        let hit = await cache.match(cacheKey);
        if (hit) { const r = new Response(hit.body, hit); Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v)); r.headers.set('X-Cache', 'HIT'); return r; }
        const data = await getQuotes(env, want, sym, bcodes, extra);
        const ttl = data.ttl || CACHE_SECONDS;
        if (locked) data.locked = true;
        const res = json(data, 200, { 'Cache-Control': 'public, max-age=' + ttl });
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
        return res;
      }
      if (url.pathname === '/candles' || url.pathname === '/history') {
        const owner = !env.ADMIN_KEY || url.searchParams.get('k') === env.ADMIN_KEY;
        const isC = url.pathname === '/candles';
        const sym = isC ? cleanList(url.searchParams.get('s'), 1)[0] : null;
        const tf = ['5m', '15m', '1h', '1d'].includes(url.searchParams.get('tf')) ? url.searchParams.get('tf') : '1d';
        const list = isC ? null : cleanList(url.searchParams.get('sym'), 100);
        const fr = owner ? null : await friendOf(env, url.searchParams.get('fc') || url.searchParams.get('k'));
        const useAngel = isC && (owner || !!fr) && hasAngel(env) && url.searchParams.get('src') !== 'yahoo';
        if (isC && (owner && env.ADMIN_KEY || fr) && env.NP) ctx.waitUntil(seen(env, url, req, fr).catch(() => {}));
        const key = new Request('https://np-cache' + url.pathname + '?a=' + (useAngel ? 1 : 0) + '&s=' + (sym || '') + '&tf=' + tf + '&l=' + (list || []).join(','));
        const hit = await caches.default.match(key);
        if (hit) { const r = new Response(hit.body, hit); Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v)); return r; }
        let data;
        try {
          if (isC) {
            if (!sym) return json({ ok: false, error: 'No stock' }, 400);
            let c = null, src = 'yahoo';
            if (useAngel) { try { c = await angelCandles(env, sym, tf); src = 'angel'; } catch (e) { LAST_ERR = 'Candles: ' + e.message; } }
            if (!c || !c.length) { c = await yahooCandles(sym, tf); src = 'yahoo'; }
            data = { ok: true, s: sym, tf, src, candles: c.slice(-160) };
          } else {
            data = { ok: true, src: 'yahoo', data: await yahooHistory(list && list.length ? list : await niftyList()) };
          }
        } catch (e) { data = { ok: false, error: String(e && e.message || e) }; }
        const ttl = !data.ok ? 30 : isC ? (tf === '1d' ? 900 : 60) : 3 * 3600;
        const res = json(data, 200, { 'Cache-Control': 'public, max-age=' + ttl });
        ctx.waitUntil(caches.default.put(key, res.clone()));
        return res;
      }
      if (url.pathname === '/status') {
        const bs = env.NP ? await env.NP.get('breeze', 'json') : null;
        const frs = await friendOf(env, url.searchParams.get('fc') || url.searchParams.get('k'));
        return json({ ok: true, friend: frs ? frs.n : null, owner: !!env.ADMIN_KEY && url.searchParams.get('k') === env.ADMIN_KEY, angel: hasAngel(env), breeze: !!(env.BREEZE_API_KEY && env.BREEZE_SECRET), breezeLogin: !!(bs && bs.day === istNow().day), telegram: !!(env.TG_BOT_TOKEN && env.TG_CHAT_ID), kv: !!env.NP, lastSource: LAST_SRC, lastError: LAST_ERR, time: istNow().label });
      }
      if (url.pathname === '/breeze/login') {
        if (!env.BREEZE_API_KEY) return html('ICICI Breeze is not set up. Add BREEZE_API_KEY and BREEZE_SECRET in the worker settings.');
        return Response.redirect('https://api.icicidirect.com/apiuser/login?api_key=' + encodeURIComponent(env.BREEZE_API_KEY), 302);
      }
      if (url.pathname === '/breeze/callback') {
        let ses = '';
        for (const [k, v] of url.searchParams) if (/api_?session/i.test(k)) ses = v;
        if (!ses && req.method === 'POST') {
          const ct = req.headers.get('Content-Type') || '', txt = await req.text();
          if (/json/.test(ct)) { try { const j = JSON.parse(txt); for (const k in j) if (/api_?session/i.test(k)) ses = j[k]; } catch (e) { } }
          else for (const [k, v] of new URLSearchParams(txt)) if (/api_?session/i.test(k)) ses = v;
        }
        if (!ses) return html('No session found. Open <b>ICICI DAILY LOGIN</b> in Nifty Pulse again.');
        if (!env.NP) return html('KV binding NP is missing. ICICI Breeze needs it to keep the day\'s session.');
        try { await breezeSession(env, ses); return html('✅ ICICI Breeze login done for today. You can close this page and go back to Nifty Pulse.'); }
        catch (e) { return html('✖ ICICI login failed: ' + String(e && e.message || e).replace(/</g, '&lt;')); }
      }
      /* ---------- Telegram: each person connects their own chat from the app ---------- */
      if (url.pathname.startsWith('/tg/')) {
        if (!env.TG_BOT_TOKEN || !env.NP) return json({ ok: false, error: 'Telegram is not set up on the worker yet' });
        const op = url.pathname.slice(4);
        if (op === 'info') {
          let bot = await env.NP.get('botname');
          if (!bot) { const me = await tgApi(env, 'getMe'); bot = me.result && me.result.username; if (bot) await env.NP.put('botname', bot); }
          /* make sure Telegram sends /start messages to this worker (set once) */
          if (!(await env.NP.get('hookset'))) {
            const r = await tgApi(env, 'setWebhook', { url: url.origin + '/tg/hook', secret_token: await hookSecret(env), allowed_updates: ['message'] });
            if (r.ok) { await env.NP.put('hookset', '1'); await tgApi(env, 'setMyCommands', { commands: [{ command: 'start', description: 'Connect Nifty Pulse alerts' }, { command: 'stop', description: 'Stop all alerts' }] }); }
          }
          return json({ ok: !!bot, bot });
        }
        if (op === 'hook' && req.method === 'POST') {
          if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== await hookSecret(env)) return new Response('no', { status: 403 });
          const up = await req.json().catch(() => ({})), m = up.message || {}, chat = m.chat && m.chat.id, text = String(m.text || '').trim();
          if (!chat) return new Response('ok');
          const code = (text.match(/^\/start\s+([a-z0-9]{6,20})$/i) || [])[1];
          if (code) { await env.NP.put('lk:' + code.toLowerCase(), JSON.stringify({ chat: String(chat), name: (m.chat.first_name || m.chat.title || '').slice(0, 40), user: (m.chat.username || '').slice(0, 40) }), { expirationTtl: 900 }); await tg(env, '✅ Connected to Nifty Pulse. Go back to the app. Your alerts will come here, even when the app is closed.', chat); }
          else if (/^\/stop/i.test(text)) { const ids = ((await env.NP.get('users', 'json')) || []).filter(x => x !== String(chat)); await env.NP.put('users', JSON.stringify(ids)); await env.NP.delete('u:' + chat); await tg(env, '🔕 Alerts stopped. Tap CONNECT TELEGRAM in Nifty Pulse to start again.', chat); }
          else await tg(env, '👋 To get alerts here: open Nifty Pulse → ALERTS → CONNECT TELEGRAM.', chat);
          return new Response('ok');
        }
        if (op === 'link') {
          const code = String(url.searchParams.get('code') || '').toLowerCase();
          const v = code ? await env.NP.get('lk:' + code, 'json') : null;
          if (!v) return json({ ok: false, wait: true });
          await env.NP.delete('lk:' + code);
          const token = rid(24), old = (await env.NP.get('u:' + v.chat, 'json')) || {};
          await env.NP.put('u:' + v.chat, JSON.stringify({ ...old, chat: v.chat, name: v.name, user: v.user || old.user || '', joined: old.joined || Date.now(), token }));
          const ids = (await env.NP.get('users', 'json')) || [];
          if (!ids.includes(v.chat)) { ids.push(v.chat); await env.NP.put('users', JSON.stringify(ids)); }
          return json({ ok: true, chat: v.chat, name: v.name, token });
        }
        if (req.method === 'POST' && ['rules', 'test', 'stop'].includes(op)) {
          const b = await req.json().catch(() => ({})), u = await env.NP.get('u:' + String(b.chat || ''), 'json');
          if (!u || !b.token || u.token !== b.token) return json({ ok: false, error: 'Not connected. Tap CONNECT TELEGRAM again.', relink: true });
          if (op === 'rules') { const c = cleanRules(b); await env.NP.put('u:' + u.chat, JSON.stringify({ ...u, ...c, owner: !!(env.ADMIN_KEY && b.k === env.ADMIN_KEY), at: Date.now() })); return json({ ok: true, saved: c.rules.length }); }
          if (op === 'test') return json({ ok: await tg(env, '✅ NIFTY PULSE: your Telegram alerts are working.', u.chat) });
          if (op === 'stop') { const ids = ((await env.NP.get('users', 'json')) || []).filter(x => x !== u.chat); await env.NP.put('users', JSON.stringify(ids)); await env.NP.delete('u:' + u.chat); await tg(env, '🔕 Nifty Pulse alerts stopped.', u.chat); return json({ ok: true }); }
        }
        return json({ ok: false, error: 'unknown' }, 404);
      }
      /* ---------- SUPERADMIN panel: who uses your Angel One data ---------- */
      if (url.pathname.startsWith('/admin')) {
        const k = req.headers.get('X-Admin-Key') || url.searchParams.get('k');
        if (!env.ADMIN_KEY || k !== env.ADMIN_KEY) return json({ ok: false, error: 'Wrong owner key' }, 401);
        if (!env.NP) return json({ ok: false, error: 'KV binding NP is missing on the worker' });
        const op = url.pathname.slice(6);
        if (op === '' || op === '/') {
          const dev = (await env.NP.get('dev', 'json')) || {}, ids = (await env.NP.get('users', 'json')) || [], tg = [];
          for (const id of ids.slice(0, 60)) {
            const u = await env.NP.get('u:' + id, 'json'); if (!u) continue;
            const g = u.global || {};
            tg.push({ chat: u.chat, name: u.name || '', user: u.user || '', owner: !!u.owner, joined: u.joined || 0, at: u.at || 0, last: u.last || 0, sent: u.sent || 0,
              rules: (u.rules || []).filter(r => r.on).map(r => r.s + ' ' + (r.type === 'above' ? '>' : r.type === 'below' ? '<' : r.type === 'pctUp' ? '+%' : '-%') + r.v).slice(0, 30),
              global: [g.move > 0 ? 'moves ±' + g.move + '%' : '', g.nifty > 0 ? 'NIFTY ±' + g.nifty + '%' : '', g.hi52 ? '52W high' : '', g.lo52 ? '52W low' : ''].filter(Boolean) });
          }
          const cfg = (await env.NP.get('cfg', 'json')) || {}, fm = (await env.NP.get('friends', 'json')) || {};
          return json({ ok: true, now: Date.now(), friends: Object.entries(fm).map(([code, f]) => ({ code, ...f })).sort((a, b) => b.at - a.at), angel: hasAngel(env), breeze: !!(env.BREEZE_KEY && env.BREEZE_SECRET), telegram: !!env.TG_BOT_TOKEN, ownerChat: env.TG_CHAT_ID || '',
            legacy: !!(await env.NP.get('rules')), cfg: { tgAngel: cfg.tgAngel !== false },
            devices: Object.entries(dev).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.last - a.last), tg });
        }
        if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
        const b = await req.json().catch(() => ({}));
        if (op === '/tg-remove') {
          const chat = String(b.chat || ''); if (!chat) return json({ ok: false, error: 'No chat' });
          const ids = ((await env.NP.get('users', 'json')) || []).filter(x => x !== chat);
          await env.NP.put('users', JSON.stringify(ids)); await env.NP.delete('u:' + chat);
          if (b.tell) await tg(env, '🔕 Nifty Pulse alerts were stopped by the app owner.', chat);
          return json({ ok: true });
        }
        if (op === '/dev-forget') {
          const dev = (await env.NP.get('dev', 'json')) || {};
          if (b.id) delete dev[b.id]; else Object.keys(dev).forEach(x => delete dev[x]);
          await env.NP.put('dev', JSON.stringify(dev)); return json({ ok: true });
        }
        if (op === '/friend-add' || op === '/friend-del' || op === '/friend-on') {
          const fm = (await env.NP.get('friends', 'json')) || {};
          let code = String(b.code || '').toUpperCase();
          if (op === '/friend-add') {
            const n = String(b.n || '').trim().slice(0, 40); if (!n) return json({ ok: false, error: 'Write the friend\'s name' });
            const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; do { code = ''; for (let i = 0; i < 6; i++) code += A[Math.floor(Math.random() * A.length)]; } while (fm[code]);
            fm[code] = { n, at: Date.now(), on: true };
          } else if (!fm[code]) return json({ ok: false, error: 'No such code' });
          else if (op === '/friend-del') delete fm[code];
          else fm[code].on = !!b.on;
          await env.NP.put('friends', JSON.stringify(fm)); await caches.default.delete(new Request('https://np-cache/friends'));
          return json({ ok: true, code });
        }
        if (op === '/cfg') {
          const cfg = (await env.NP.get('cfg', 'json')) || {};
          if (typeof b.tgAngel === 'boolean') cfg.tgAngel = b.tgAngel;
          await env.NP.put('cfg', JSON.stringify(cfg)); return json({ ok: true, cfg: { tgAngel: cfg.tgAngel !== false } });
        }
        return json({ ok: false, error: 'unknown' }, 404);
      }
      if (url.pathname === '/rules' && req.method === 'POST') {
        if (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY) return json({ ok: false, error: 'Wrong admin key' }, 401);
        if (!env.NP) return json({ ok: false, error: 'KV binding NP is missing' }, 400);
        const body = await req.json();
        const rules = Array.isArray(body.rules) ? body.rules.slice(0, 200) : [];
        await env.NP.put('rules', JSON.stringify({ rules, rearm: /^\d{1,2}:\d{2}$/.test(String(body.rearm || '')) ? String(body.rearm) : '09:15', rearmMin: Math.max(0, Math.min(10080, +body.rearmMin || 0)), remind: !!body.remind, global: body.global || {}, list: Array.isArray(body.list) ? body.list.slice(0, 100) : null,
          src: ['angel', 'breeze', 'yahoo'].includes(body.src) ? body.src : 'auto', bcodes: body.bcodes || {} }));
        return json({ ok: true, saved: rules.length });
      }
      if (url.pathname === '/test-telegram' && req.method === 'POST') {
        if (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY) return json({ ok: false, error: 'Wrong admin key' }, 401);
        const ok = await tg(env, '✅ NIFTY PULSE: Telegram alerts are working.');
        return json({ ok });
      }
      return json({ ok: true, app: 'Nifty Pulse worker', routes: ['/quotes', '/status'] });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e) }, 500);
    }
  },

  /* Background alerts to Telegram (runs from the cron trigger) */
  async scheduled(evt, env, ctx) {
    if (!env.NP || !env.TG_BOT_TOKEN) return;
    const t = istNow();
    if (!t.open) return;
    /* everyone connected with CONNECT TELEGRAM in the app (each with their own alerts) + the owner's old single list */
    const ids = (await env.NP.get('users', 'json')) || [];
    const users = [];
    for (const id of ids.slice(0, 40)) { const u = await env.NP.get('u:' + id, 'json'); if (u && (u.rules || []).length || u && u.global && (u.global.move > 0 || u.global.nifty > 0 || u.global.hi52 || u.global.lo52)) users.push(u); }
    const legacy = env.TG_CHAT_ID ? await env.NP.get('rules', 'json') : null;
    if (legacy) users.push({ chat: env.TG_CHAT_ID, legacy: true, ...legacy });
    if (!users.length) return;
    /* one price fetch for everybody: Nifty 50 + every extra stock someone has an alert on (Angel One when set up) */
    const extra = new Set();
    users.forEach(u => (u.rules || []).forEach(r => { if (r.on && r.s && r.s !== 'NIFTY' && r.s !== 'BANKNIFTY') extra.add(r.s); }));
    const cfg = (await env.NP.get('cfg', 'json')) || {};
    const data = await getQuotes(env, 'auto', null, {}, [...extra].slice(0, 40));
    if (!data.ok) return;
    /* the owner can switch friends' alerts to free Yahoo prices (Superadmin tab in the app) */
    let ydata = null;
    if (cfg.tgAngel === false && users.some(u => !u.legacy && !u.owner)) { try { ydata = await getQuotes(env, 'yahoo', null, {}, [...extra].slice(0, 40)); } catch (e) { } }
    for (const u of users) {
      /* rung alerts are kept across days: each rings once, re-arms at the user's time, then only on a fresh cross */
      const fk = u.legacy ? 'fired2:' : 'fired2:' + u.chat;
      const fired = (await env.NP.get(fk, 'json')) || {};
      const useY = cfg.tgAngel === false && !u.legacy && !u.owner;
      if (useY && !(ydata && ydata.ok)) continue;
      const before = JSON.stringify(fired), msgs = evaluate(u, useY ? ydata : data, fired);
      if (!msgs.length) { if (JSON.stringify(fired) !== before) await env.NP.put(fk, JSON.stringify(fired), { expirationTtl: 60 * 60 * 24 * 30 }); continue; }
      await tg(env, '📈 NIFTY PULSE ALERT\n' + msgs.join('\n') + '\n' + t.label, u.chat);
      if (!u.legacy) { u.last = Date.now(); u.sent = (u.sent || 0) + 1; const keep = { ...u }; await env.NP.put('u:' + u.chat, JSON.stringify(keep)); }
      await env.NP.put(fk, JSON.stringify(fired), { expirationTtl: 60 * 60 * 24 * 30 });
    }
  }
};

/* ---------- alert rules (same logic as the app) ----------
   fired[key] = { t: time rung } (quiet until the re-arm time) or { w: 1 } (ready, waits for a fresh cross) */
function nextReset(rearm, t) {
  if (rearm && rearm.min > 0) return t + rearm.min * 6e4;
  if (rearm && typeof rearm === 'object') rearm = rearm.at;
  const [h, m] = String(rearm || '09:15').split(':').map(Number), IST = 5.5 * 3600e3, d = new Date(t + IST);
  let r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h || 0, m || 0) - IST;
  if (r <= t) r += 864e5;
  return r;
}
function gate(fired, rearm, key, cond) {
  let f = fired[key];
  if (f && f.t && Date.now() >= nextReset(rearm, f.t)) {
    if (cond && rearm && rearm.remind && !f.rm) { fired[key] = { t: Date.now(), rm: 1 }; return true; }   /* one reminder */
    f = fired[key] = { w: 1 };
  }
  if (!cond) { if (f && f.w) delete fired[key]; return false; }
  if (f) return false;
  fired[key] = { t: Date.now() }; return true;
}
function evaluate(saved, data, fired) {
  const out = [], by = {}, ra = { at: saved.rearm || '09:15', min: +saved.rearmMin || 0, remind: !!saved.remind };
  data.stocks.concat(data.index).forEach(q => by[q.s] = q);
  (saved.rules || []).forEach(r => {
    const q = by[r.s]; if (!q || !r.on) return;
    let hit = false, txt = '';
    if (r.type === 'above') { hit = q.ltp >= r.v; txt = `${r.s} crossed ABOVE ${r.v} → ${q.ltp}`; }
    if (r.type === 'below') { hit = q.ltp <= r.v; txt = `${r.s} fell BELOW ${r.v} → ${q.ltp}`; }
    if (r.type === 'pctUp') { hit = q.pct >= r.v; txt = `${r.s} up ${q.pct.toFixed(2)}% (≥ ${r.v}%)`; }
    if (r.type === 'pctDown') { hit = q.pct <= -Math.abs(r.v); txt = `${r.s} down ${q.pct.toFixed(2)}% (≤ -${Math.abs(r.v)}%)`; }
    if (gate(fired, ra, 'r' + r.id, hit)) out.push('• ' + txt);
  });
  const g = saved.global || {};
  const only = Array.isArray(g.only) && g.only.length ? g.only : null;
  data.stocks.forEach(q => {
    if (only && !only.includes(q.s)) return;
    if (g.move > 0 && gate(fired, ra, 'm' + q.s, Math.abs(q.pct) >= g.move)) out.push(`• ${q.s} moved ${q.pct > 0 ? '+' : ''}${q.pct.toFixed(2)}% today (${q.ltp})`);
    if (g.hi52 && q.h52 && gate(fired, ra, 'h' + q.s, q.ltp >= q.h52)) out.push(`• ${q.s} NEW 52-WEEK HIGH ${q.ltp}`);
    if (g.lo52 && q.l52 && gate(fired, ra, 'l' + q.s, q.ltp <= q.l52)) out.push(`• ${q.s} NEW 52-WEEK LOW ${q.ltp}`);
  });
  const n = by.NIFTY;
  if (n && g.nifty > 0 && gate(fired, ra, 'nifty', Math.abs(n.pct) >= g.nifty)) out.push(`• NIFTY 50 moved ${n.pct.toFixed(2)}% (${n.ltp})`);
  return out.slice(0, 25);
}

async function tg(env, text, chat) {
  chat = chat || env.TG_CHAT_ID;
  if (!env.TG_BOT_TOKEN || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text })
  });
  return r.ok;
}
async function tgApi(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  return r.json().catch(() => ({}));
}
function rid(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => (b % 36).toString(36)).join(''); }
async function hookSecret(env) { return (await sha256hex('np-hook:' + (env.ADMIN_KEY || env.TG_BOT_TOKEN))).slice(0, 40); }
function cleanRules(b) {
  return { rules: (Array.isArray(b.rules) ? b.rules : []).slice(0, 100).map(r => ({ id: String(r.id || '').slice(0, 20), s: String(r.s || '').toUpperCase().slice(0, 20), type: ['above', 'below', 'pctUp', 'pctDown'].includes(r.type) ? r.type : 'above', v: +r.v || 0, on: !!r.on })),
    rearm: /^\d{1,2}:\d{2}$/.test(String(b.rearm || '')) ? String(b.rearm) : '09:15', rearmMin: Math.max(0, Math.min(10080, +b.rearmMin || 0)), remind: !!b.remind,
    global: { move: +((b.global || {}).move) || 0, nifty: +((b.global || {}).nifty) || 0, hi52: !!(b.global || {}).hi52, lo52: !!(b.global || {}).lo52, only: Array.isArray((b.global || {}).only) ? b.global.only.slice(0, 100) : null } };
}

/* ---------- main quote function ---------- */
async function getQuotes(env, want, forcedList, bcodes, extra) {
  const t = istNow();
  if (want === 'breeze') {
    const list = (forcedList || []).slice(0, BREEZE_MAX);
    if (!list.length) return { ok: false, error: 'Choose your stocks first (Breeze gives one stock per call).' };
    try { const d = await breezeQuotes(env, list, bcodes || {}); LAST_SRC = 'breeze'; return { ok: true, src: 'breeze', ts: Date.now(), market: { open: t.open, label: t.label }, ...d }; }
    catch (e) { LAST_ERR = 'Breeze: ' + (e && e.message || e); return { ok: false, error: LAST_ERR, needLogin: /login|session/i.test(LAST_ERR) }; }
  }
  const list = (forcedList && forcedList.length ? forcedList : await niftyList()).map(s => String(s).toUpperCase());
  (extra || []).forEach(s => { if (!list.includes(s)) list.push(s); });
  if (want !== 'yahoo' && hasAngel(env)) {
    try { const d = await angelQuotes(env, list); LAST_SRC = 'angel'; LAST_ERR = ''; return { ok: true, src: 'angel', ts: Date.now(), market: { open: t.open, label: t.label }, ...d }; }
    catch (e) { LAST_ERR = 'Angel: ' + (e && e.message || e); if (want === 'angel') return { ok: false, error: LAST_ERR }; }
  }
  try { const d = await yahooQuotes(list); LAST_SRC = 'yahoo'; return { ok: true, src: 'yahoo', ts: Date.now(), market: { open: t.open, label: t.label }, note: LAST_ERR || undefined, ...d }; }
  catch (e) { LAST_ERR += ' | Yahoo: ' + (e && e.message || e); return { ok: false, error: LAST_ERR }; }
}

function hasAngel(env) { return !!(env.ANGEL_API_KEY && env.ANGEL_CLIENT && env.ANGEL_PIN && env.ANGEL_TOTP_SECRET); }

/* India time + market open check (Mon-Fri 09:15-15:30 IST; exchange holidays are not known here) */
function istNow() {
  const d = new Date(Date.now() + 330 * 60000);
  const day = d.toISOString().slice(0, 10), wd = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes();
  return { day, open: wd >= 1 && wd <= 5 && m >= 555 && m <= 930, label: d.toISOString().slice(11, 19) + ' IST' };
}

/* Official Nifty 50 list from NSE, cached for 12 hours. Falls back to DEFAULT_LIST. */
async function niftyList() {
  const key = new Request('https://np-cache/list');
  const hit = await caches.default.match(key);
  if (hit) return hit.json();
  let list = null;
  for (const u of ['https://nsearchives.nseindia.com/content/indices/ind_nifty50list.csv', 'https://www.niftyindices.com/IndexConstituent/ind_nifty50list.csv']) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/csv,*/*' }, cf: { cacheTtl: 3600 } });
      if (!r.ok) continue;
      const lines = (await r.text()).trim().split(/\r?\n/), head = lines[0].split(',').map(x => x.trim().toLowerCase());
      const ci = head.indexOf('symbol'); if (ci < 0) continue;
      const L = lines.slice(1).map(l => (l.split(',')[ci] || '').trim()).filter(Boolean);
      if (L.length >= 45 && L.length <= 55) { list = L; break; }
    } catch (e) { }
  }
  list = list || DEFAULT_LIST;
  await caches.default.put(key, new Response(JSON.stringify(list), { headers: { 'Cache-Control': 'max-age=43200' } }));
  return list;
}

/* ---------- Angel One SmartAPI ---------- */
function angelHeaders(env, jwt) {
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-UserType': 'USER', 'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1', 'X-ClientPublicIP': '127.0.0.1', 'X-MACAddress': '00:00:00:00:00:00', 'X-PrivateKey': env.ANGEL_API_KEY };
  if (jwt) h.Authorization = 'Bearer ' + jwt;
  return h;
}

async function angelLogin(env, force) {
  const day = istNow().day;
  if (!force && JWT && JWT_DAY === day) return JWT;
  if (!force && env.NP) { const s = await env.NP.get('jwt', 'json'); if (s && s.day === day) { JWT = s.jwt; JWT_DAY = day; return JWT; } }
  const totp = await makeTotp(env.ANGEL_TOTP_SECRET);
  const r = await fetch(ANGEL + '/rest/auth/angelbroking/user/v1/loginByPassword', {
    method: 'POST', headers: angelHeaders(env), body: JSON.stringify({ clientcode: env.ANGEL_CLIENT, password: env.ANGEL_PIN, totp })
  });
  const j = await r.json().catch(() => ({}));
  if (!j.status || !j.data || !j.data.jwtToken) throw new Error('Login failed: ' + (j.message || r.status) + (j.errorcode ? ' (' + j.errorcode + ')' : ''));
  JWT = j.data.jwtToken; JWT_DAY = day;
  if (env.NP) await env.NP.put('jwt', JSON.stringify({ jwt: JWT, day }), { expirationTtl: 60 * 60 * 20 });
  return JWT;
}

async function angelPost(env, path, body) {
  let jwt = await angelLogin(env);
  let r = await fetch(ANGEL + path, { method: 'POST', headers: angelHeaders(env, jwt), body: JSON.stringify(body) });
  let j = await r.json().catch(() => ({}));
  if (r.status === 401 || /AG800[0-9]|token/i.test(j.errorcode || '') || (j.message && /invalid token|token expired/i.test(j.message))) {
    jwt = await angelLogin(env, true);
    r = await fetch(ANGEL + path, { method: 'POST', headers: angelHeaders(env, jwt), body: JSON.stringify(body) });
    j = await r.json().catch(() => ({}));
  }
  if (!j.status) throw new Error((j.message || 'HTTP ' + r.status) + (j.errorcode ? ' (' + j.errorcode + ')' : ''));
  return j.data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function angelQuotes(env, list) {
  const map = {};
  let kvTok = {};
  if (env.NP) kvTok = (await env.NP.get('tokens', 'json')) || {};
  list.forEach(s => { const t = kvTok[s] || TOK[s]; if (t) map[t] = s; });
  const missing = list.filter(s => !(kvTok[s] || TOK[s]));
  const tokens = Object.keys(map);
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 50) chunks.push(tokens.slice(i, i + 50));
  const fetched = [];
  /* stocks (NSE) - max 50 per call, 1 call per second */
  for (let i = 0; i < chunks.length; i++) {
    if (i) await sleep(1050);
    const d = await angelPost(env, '/rest/secure/angelbroking/market/v1/quote/', { mode: 'FULL', exchangeTokens: { NSE: chunks[i] } });
    (d && d.fetched || []).forEach(x => fetched.push(x));
  }
  await sleep(1050);
  const di = await angelPost(env, '/rest/secure/angelbroking/market/v1/quote/', { mode: 'FULL', exchangeTokens: { NSE: INDEX.map(x => x.t) } });

  const stocks = [], bad = [];
  fetched.forEach(x => {
    const s = map[x.symbolToken];
    if (!s) return;
    if (x.tradingSymbol && x.tradingSymbol.replace(/-EQ$/, '') !== s) { bad.push(s); return; }
    stocks.push(fromAngel(s, x));
  });
  list.forEach(s => { if (!stocks.find(q => q.s === s) && !bad.includes(s) && !missing.includes(s)) bad.push(s); });
  const index = INDEX.map(ix => { const x = (di && di.fetched || []).find(f => f.symbolToken === ix.t); return x ? { ...fromAngel(ix.s, x), n: ix.n } : null; }).filter(Boolean);

  /* self-repair wrong / missing tokens (max 3 per run, saved in KV) */
  const fix = missing.concat(bad).slice(0, 3);
  if (fix.length && env.NP) {
    let changed = false;
    for (const s of fix) {
      try {
        await sleep(350);
        const res = await angelPost(env, '/rest/secure/angelbroking/order/v1/searchScrip', { exchange: 'NSE', searchscrip: s });
        const m = (res || []).find(r => r.tradingsymbol === s + '-EQ');
        if (m) { kvTok[s] = m.symboltoken; changed = true; }
      } catch (e) { }
    }
    if (changed) await env.NP.put('tokens', JSON.stringify(kvTok));
  }
  return { index, stocks, missing: missing.concat(bad) };
}

function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
function fromAngel(s, x) {
  const ltp = num(x.ltp), prev = num(x.close);
  const chg = x.netChange != null ? num(x.netChange) : ltp - prev;
  const pct = x.percentChange != null ? num(x.percentChange) : (prev ? (ltp - prev) / prev * 100 : 0);
  return { s, ltp, chg: +chg.toFixed(2), pct: +pct.toFixed(2), open: num(x.open), high: num(x.high), low: num(x.low), prev,
    vol: num(x.tradeVolume), h52: num(x['52WeekHigh']), l52: num(x['52WeekLow']), uc: num(x.upperCircuit), lc: num(x.lowerCircuit),
    t: x.exchFeedTime || '' };
}

/* TOTP (RFC 6238, SHA-1, 6 digits, 30 s) using Web Crypto */
async function makeTotp(secret) {
  const b32 = String(secret).replace(/[\s=-]/g, '').toUpperCase(), A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '', bytes = [];
  for (const c of b32) { const v = A.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const key = await crypto.subtle.importKey('raw', new Uint8Array(bytes), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const ctr = Math.floor(Date.now() / 30000), buf = new ArrayBuffer(8), dv = new DataView(buf);
  dv.setUint32(0, Math.floor(ctr / 4294967296)); dv.setUint32(4, ctr >>> 0);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf)), o = h[h.length - 1] & 15;
  const code = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1000000;
  return String(code).padStart(6, '0');
}

/* ---------- Yahoo Finance fallback (no account) ---------- */
async function yahooQuotes(list) {
  const ysym = s => s.replace(/&/g, '%26') + '.NS';
  const all = list.map(ysym).concat(INDEX.map(i => encodeURIComponent(i.y)));
  const chunks = [];
  for (let i = 0; i < all.length; i += 20) chunks.push(all.slice(i, i + 20));
  const results = {};
  await Promise.all(chunks.map(async c => {
    const u = 'https://query1.finance.yahoo.com/v7/finance/spark?symbols=' + c.join(',') + '&range=1d&interval=5m';
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (j && j.spark && j.spark.result) j.spark.result.forEach(x => { const m = x.response && x.response[0] && x.response[0].meta; if (m) results[x.symbol] = m; });
    else Object.keys(j || {}).forEach(k => { const x = j[k]; if (x && x.symbol) results[x.symbol] = { regularMarketPrice: (x.close || []).filter(v => v != null).pop(), chartPreviousClose: x.chartPreviousClose || x.previousClose }; });
  }));
  const conv = (s, m) => {
    const ltp = num(m.regularMarketPrice), prev = num(m.previousClose || m.chartPreviousClose);
    return { s, ltp, chg: +(ltp - prev).toFixed(2), pct: prev ? +((ltp - prev) / prev * 100).toFixed(2) : 0, open: num(m.regularMarketOpen), high: num(m.regularMarketDayHigh),
      low: num(m.regularMarketDayLow), prev, vol: num(m.regularMarketVolume), h52: num(m.fiftyTwoWeekHigh), l52: num(m.fiftyTwoWeekLow), uc: 0, lc: 0,
      t: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : '' };
  };
  const stocks = list.map(s => results[s + '.NS'] ? conv(s, results[s + '.NS']) : null).filter(Boolean);
  const index = INDEX.map(i => results[i.y] ? { ...conv(i.s, results[i.y]), n: i.n } : null).filter(Boolean);
  if (!stocks.length) throw new Error('no data');
  return { index, stocks, missing: list.filter(s => !results[s + '.NS']) };
}

/* ---------- small helpers ---------- */
function cleanList(v, max) { return String(v || '').toUpperCase().split(',').map(x => x.trim()).filter(x => /^[A-Z0-9&\-]{1,20}$/.test(x)).slice(0, max); }
function parseCodes(v) { const o = {}; String(v || '').toUpperCase().split(',').forEach(p => { const m = p.split(/[=:]/); if (m.length === 2 && /^[A-Z0-9&\-]{1,20}$/.test(m[0].trim()) && /^[A-Z0-9]{1,12}$/.test(m[1].trim())) o[m[0].trim()] = m[1].trim(); }); return o; }
function html(msg) { return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;background:#070b16;color:#eaf1ff;padding:24px;line-height:1.5"><h2 style="letter-spacing:.06em">NIFTY PULSE</h2><p>' + msg + '</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }

/* ---------- ICICI Breeze ----------
   Breeze needs a JSON body on GET requests. Normal fetch() cannot send that, so we talk HTTP/1.1 over a secure socket. */
async function rawRequest(method, path, headers, body) {
  const enc = new TextEncoder(), b = enc.encode(body || '');
  const sock = connect({ hostname: BREEZE_HOST, port: 443 }, { secureTransport: 'on', allowHalfOpen: false });
  let head = method + ' ' + path + ' HTTP/1.1\r\nHost: ' + BREEZE_HOST + '\r\nConnection: close\r\nAccept: application/json\r\nUser-Agent: NiftyPulse/1.0\r\nContent-Length: ' + b.length + '\r\n';
  for (const k in headers) head += k + ': ' + headers[k] + '\r\n';
  const w = sock.writable.getWriter();
  await w.write(enc.encode(head + '\r\n')); if (b.length) await w.write(b); w.releaseLock();
  const rd = sock.readable.getReader(), parts = []; let size = 0;
  const timer = setTimeout(() => { try { sock.close(); } catch (e) { } }, 10000);
  try { for (;;) { const { value, done } = await rd.read(); if (done) break; parts.push(value); size += value.length; if (size > 2e6) break; } } catch (e) { }
  clearTimeout(timer); try { await sock.close(); } catch (e) { }
  const all = new Uint8Array(size); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  let he = -1; for (let i = 0; i < all.length - 3; i++) if (all[i] === 13 && all[i + 1] === 10 && all[i + 2] === 13 && all[i + 3] === 10) { he = i; break; }
  if (he < 0) throw new Error('No reply from ICICI');
  const dec = new TextDecoder(), hdr = dec.decode(all.subarray(0, he)), status = +(hdr.split(' ')[1] || 0);
  let bodyBytes = all.subarray(he + 4);
  if (/transfer-encoding:\s*chunked/i.test(hdr)) {
    const out = []; let i = 0, tot = 0;
    while (i < bodyBytes.length) {
      let j = i; while (j < bodyBytes.length - 1 && !(bodyBytes[j] === 13 && bodyBytes[j + 1] === 10)) j++;
      const n = parseInt(dec.decode(bodyBytes.subarray(i, j)).trim(), 16); if (!n) break;
      out.push(bodyBytes.subarray(j + 2, j + 2 + n)); tot += n; i = j + 2 + n + 2;
    }
    const m = new Uint8Array(tot); let q = 0; for (const p of out) { m.set(p, q); q += p.length; } bodyBytes = m;
  }
  const text = dec.decode(bodyBytes);
  let data = null; try { data = JSON.parse(text); } catch (e) { }
  return { status, data, text };
}

async function sha256hex(s) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }

async function breezeSession(env, apiSession) {
  const body = JSON.stringify({ SessionToken: apiSession, AppKey: env.BREEZE_API_KEY });
  const r = await rawRequest('GET', '/breezeapi/api/v1/customerdetails', { 'Content-Type': 'application/json' }, body);
  const tok = r.data && r.data.Success && r.data.Success.session_token;
  if (!tok) throw new Error((r.data && r.data.Error) || ('HTTP ' + r.status));
  await env.NP.put('breeze', JSON.stringify({ tok, day: istNow().day }), { expirationTtl: 60 * 60 * 20 });
  return tok;
}

async function breezeQuotes(env, list, fix) {
  if (!env.BREEZE_API_KEY || !env.BREEZE_SECRET) throw new Error('Breeze is not set up in the worker (BREEZE_API_KEY, BREEZE_SECRET).');
  if (!env.NP) throw new Error('KV binding NP is missing (Breeze needs it for the daily session).');
  const s = await env.NP.get('breeze', 'json');
  if (!s || s.day !== istNow().day) throw new Error('Daily ICICI login needed. Tap ICICI DAILY LOGIN in the app.');
  const one = async (sym) => {
    const code = fix[sym] || ICICI[sym] || sym.replace(/[^A-Z0-9]/g, '');
    const body = JSON.stringify({ stock_code: code, exchange_code: 'NSE', expiry_date: '', product_type: 'cash', right: '', strike_price: '' });
    const ts = new Date().toISOString().slice(0, 19) + '.000Z';
    const r = await rawRequest('GET', '/breezeapi/api/v1/quotes', { 'Content-Type': 'application/json', 'X-Checksum': 'token ' + await sha256hex(ts + body + env.BREEZE_SECRET),
      'X-Timestamp': ts, 'X-AppKey': env.BREEZE_API_KEY, 'X-SessionToken': s.tok }, body);
    const d = r.data || {};
    if (r.status === 401 || /session|unauthori/i.test(String(d.Error || ''))) throw new Error('ICICI session expired. Tap ICICI DAILY LOGIN in the app.');
    const x = Array.isArray(d.Success) ? (d.Success.find(v => v.exchange_code === 'NSE') || d.Success[0]) : null;
    if (!x) return { sym, code, err: d.Error || 'not found' };
    const ltp = num(x.ltp), prev = num(x.previous_close);
    return { sym, q: { s: sym, ltp, chg: +(ltp - prev).toFixed(2), pct: x.ltp_percent_change != null ? +num(x.ltp_percent_change).toFixed(2) : (prev ? +((ltp - prev) / prev * 100).toFixed(2) : 0),
      open: num(x.open), high: num(x.high), low: num(x.low), prev, vol: num(x.total_quantity_traded), h52: 0, l52: 0, uc: num(x.upper_circuit), lc: num(x.lower_circuit), t: x.ltt || '' } };
  };
  const all = list.concat(['NIFTY', 'BANKNIFTY']), res = [];
  for (let i = 0; i < all.length; i += 5) {                     /* 5 at a time: fast, and well inside 100 calls/min */
    const part = await Promise.all(all.slice(i, i + 5).map(x => one(x).catch(e => { if (/session|login/i.test(e.message)) throw e; return { sym: x, err: e.message }; })));
    res.push(...part);
  }
  const stocks = res.filter(r => r.q && r.sym !== 'NIFTY' && r.sym !== 'BANKNIFTY').map(r => r.q);
  const index = res.filter(r => r.q && (r.sym === 'NIFTY' || r.sym === 'BANKNIFTY')).map(r => ({ ...r.q, n: r.sym === 'NIFTY' ? 'NIFTY 50' : 'BANK NIFTY' }));
  const missing = res.filter(r => !r.q && r.sym !== 'NIFTY' && r.sym !== 'BANKNIFTY').map(r => r.sym + ' (ICICI code ' + r.code + '?)');
  /* daily budget: 5,000 calls / 375 market minutes -> about 12 calls a minute */
  const ttl = Math.max(15, Math.ceil(all.length * 60 / 12));
  return { index, stocks, missing, ttl };
}

/* ---------- candles + daily history (for the chart and the trend notes) ---------- */
const TFA = { '5m': ['FIVE_MINUTE', 5], '15m': ['FIFTEEN_MINUTE', 20], '1h': ['ONE_HOUR', 60], '1d': ['ONE_DAY', 365] };
const TFY = { '5m': ['5m', '5d'], '15m': ['15m', '1mo'], '1h': ['60m', '3mo'], '1d': ['1d', '1y'] };
function istStamp(ms) { return new Date(ms + 330 * 60000).toISOString().slice(0, 16).replace('T', ' '); }

async function angelCandles(env, sym, tf) {
  const ix = INDEX.find(i => i.s === sym);
  let tok = ix ? ix.t : null;
  if (!tok) { const kv = env.NP ? (await env.NP.get('tokens', 'json')) || {} : {}; tok = kv[sym] || TOK[sym]; }
  if (!tok) throw new Error('no token for ' + sym);
  const [iv, days] = TFA[tf], now = Date.now();
  const d = await angelPost(env, '/rest/secure/angelbroking/historical/v1/getCandleData', { exchange: 'NSE', symboltoken: tok, interval: iv, fromdate: istStamp(now - days * 864e5), todate: istStamp(now) });
  return (d || []).map(r => [Date.parse(r[0]) || 0, num(r[1]), num(r[2]), num(r[3]), num(r[4]), num(r[5])]).filter(r => r[0] && r[4]);
}

/* remembers which devices use the owner key (at most one write per device every 15 min) */
async function seen(env, url, req, fr) {
  const id = (fr ? 'fr-' + fr.code + '-' : '') + (String(url.searchParams.get('d') || 'unknown').replace(/[^\w.-]/g, '').slice(0, 40) || 'unknown');
  const mark = new Request('https://np-seen/' + id);
  if (await caches.default.match(mark)) return;
  await caches.default.put(mark, new Response('1', { headers: { 'Cache-Control': 'public, max-age=900' } }));
  const all = (await env.NP.get('dev', 'json')) || {}, cf = req.cf || {}, now = Date.now(), o = all[id] || { first: now, hits: 0 };
  all[id] = { ...o, n: (fr ? 'Friend ' + fr.n + ' · ' : '') + String(url.searchParams.get('dn') || 'Unknown device').slice(0, 60), fc: fr ? fr.code : (o.fc || ''), city: cf.city || o.city || '', cc: cf.country || o.cc || '', last: now, hits: (o.hits || 0) + 1 };
  const keep = Object.entries(all).sort((a, b) => b[1].last - a[1].last).slice(0, 25);
  await env.NP.put('dev', JSON.stringify(Object.fromEntries(keep)));
}

/* friend codes made by the owner in the app's ADMIN tab (KV "friends"), cached for 60 s */
async function friendOf(env, fc) {
  fc = String(fc || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (!fc || !env.NP) return null;
  const key = new Request('https://np-cache/friends');
  let m; const hit = await caches.default.match(key);
  if (hit) m = await hit.json();
  else { m = (await env.NP.get('friends', 'json')) || {}; await caches.default.put(key, new Response(JSON.stringify(m), { headers: { 'Cache-Control': 'public, max-age=60' } })); }
  const f = m[fc]; return f && f.on !== false ? { code: fc, n: f.n } : null;
}

function ySym(s) { const ix = INDEX.find(i => i.s === s); return ix ? encodeURIComponent(ix.y) : s.replace(/&/g, '%26') + '.NS'; }

async function yahooCandles(sym, tf) {
  const [iv, rg] = TFY[tf];
  const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + ySym(sym) + '?range=' + rg + '&interval=' + iv, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('chart HTTP ' + r.status);
  const j = await r.json(), x = j && j.chart && j.chart.result && j.chart.result[0];
  if (!x || !x.timestamp) throw new Error('no chart data');
  const q = (x.indicators && x.indicators.quote && x.indicators.quote[0]) || {};
  const out = [];
  x.timestamp.forEach((t, i) => { const c = q.close && q.close[i]; if (c == null) return; out.push([t * 1000, num(q.open[i]), num(q.high[i]), num(q.low[i]), num(c), num(q.volume && q.volume[i])]); });
  return out;
}

/* daily closes for the last 6 months for many stocks at once (3 calls for 50 stocks) */
async function yahooHistory(list) {
  const all = list.map(s => [s, ySym(s)]).concat(INDEX.map(i => [i.s, encodeURIComponent(i.y)]));
  const out = {}, chunks = [];
  for (let i = 0; i < all.length; i += 20) chunks.push(all.slice(i, i + 20));
  await Promise.all(chunks.map(async c => {
    const r = await fetch('https://query1.finance.yahoo.com/v7/finance/spark?symbols=' + c.map(x => x[1]).join(',') + '&range=6mo&interval=1d', { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
    if (!r.ok) return;
    const j = await r.json(), back = {};
    c.forEach(x => back[decodeURIComponent(x[1])] = x[0]);
    const put = (ysym, ts, cl) => { const s = back[ysym]; if (!s || !ts || !cl) return; const c2 = [], d2 = []; ts.forEach((t, i) => { if (cl[i] != null) { c2.push(+(+cl[i]).toFixed(2)); d2.push(t); } }); if (c2.length) out[s] = { c: c2, d: new Date((d2[d2.length - 1] + 19800) * 1000).toISOString().slice(0, 10) }; };
    if (j && j.spark && j.spark.result) j.spark.result.forEach(x => { const rr = x.response && x.response[0]; if (rr) put(x.symbol, rr.timestamp, rr.indicators && rr.indicators.quote && rr.indicators.quote[0] && rr.indicators.quote[0].close); });
    else Object.keys(j || {}).forEach(k => { const x = j[k]; if (x && x.timestamp) put(x.symbol || k, x.timestamp, x.close); });
  }));
  return out;
}
