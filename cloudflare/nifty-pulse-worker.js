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
     TG_BOT_TOKEN       (optional) Telegram bot token for background alerts
     TG_CHAT_ID         (optional) your Telegram chat id
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
 BEL:'383',TRENT:'1964',ETERNAL:'5097',JIOFIN:'18143',INDIGO:'11195',TMPV:'3456',WIPRO:'3787'};
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
        const locked = !owner && want !== 'yahoo';
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
        const useAngel = isC && owner && hasAngel(env) && url.searchParams.get('src') !== 'yahoo';
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
        return json({ ok: true, owner: !!env.ADMIN_KEY && url.searchParams.get('k') === env.ADMIN_KEY, angel: hasAngel(env), breeze: !!(env.BREEZE_API_KEY && env.BREEZE_SECRET), breezeLogin: !!(bs && bs.day === istNow().day), telegram: !!(env.TG_BOT_TOKEN && env.TG_CHAT_ID), kv: !!env.NP, lastSource: LAST_SRC, lastError: LAST_ERR, time: istNow().label });
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
      if (url.pathname === '/rules' && req.method === 'POST') {
        if (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY) return json({ ok: false, error: 'Wrong admin key' }, 401);
        if (!env.NP) return json({ ok: false, error: 'KV binding NP is missing' }, 400);
        const body = await req.json();
        const rules = Array.isArray(body.rules) ? body.rules.slice(0, 200) : [];
        await env.NP.put('rules', JSON.stringify({ rules, global: body.global || {}, list: Array.isArray(body.list) ? body.list.slice(0, 100) : null,
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
    if (!env.NP || !env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return;
    const t = istNow();
    if (!t.open) return;
    const saved = await env.NP.get('rules', 'json');
    if (!saved) return;
    let list = saved.list;
    if (saved.src === 'breeze') { /* Breeze: only the stocks your alerts need, to stay inside the daily call limit */
      const need = new Set((saved.rules || []).filter(r => r.on && r.s !== 'NIFTY' && r.s !== 'BANKNIFTY').map(r => r.s));
      ((saved.global || {}).only || []).forEach(s => need.add(s));
      list = [...need].slice(0, BREEZE_MAX);
      if (!list.length) return;
      if (Math.floor(Date.now() / 60000) % Math.max(1, Math.ceil(list.length / 6))) return;
    }
    const data = await getQuotes(env, saved.src || 'auto', list, saved.bcodes || {});
    if (!data.ok) return;
    const firedKey = 'fired:' + t.day;
    const fired = (await env.NP.get(firedKey, 'json')) || {};
    const msgs = evaluate(saved, data, fired);
    if (!msgs.length) return;
    await tg(env, '📈 NIFTY PULSE ALERT\n' + msgs.join('\n') + '\n' + t.label);
    await env.NP.put(firedKey, JSON.stringify(fired), { expirationTtl: 60 * 60 * 30 });
  }
};

/* ---------- alert rules (same logic as the app) ---------- */
function evaluate(saved, data, fired) {
  const out = [], by = {};
  data.stocks.concat(data.index).forEach(q => by[q.s] = q);
  (saved.rules || []).forEach(r => {
    const q = by[r.s]; if (!q || !r.on) return;
    let hit = false, txt = '';
    if (r.type === 'above' && q.ltp >= r.v) { hit = true; txt = `${r.s} crossed ABOVE ${r.v} → ${q.ltp}`; }
    if (r.type === 'below' && q.ltp <= r.v) { hit = true; txt = `${r.s} fell BELOW ${r.v} → ${q.ltp}`; }
    if (r.type === 'pctUp' && q.pct >= r.v) { hit = true; txt = `${r.s} up ${q.pct.toFixed(2)}% (≥ ${r.v}%)`; }
    if (r.type === 'pctDown' && q.pct <= -Math.abs(r.v)) { hit = true; txt = `${r.s} down ${q.pct.toFixed(2)}% (≤ -${Math.abs(r.v)}%)`; }
    const k = 'r' + r.id;
    if (hit && !fired[k]) { fired[k] = 1; out.push('• ' + txt); }
  });
  const g = saved.global || {};
  const only = Array.isArray(g.only) && g.only.length ? g.only : null;
  data.stocks.forEach(q => {
    if (only && !only.includes(q.s)) return;
    if (g.move > 0 && Math.abs(q.pct) >= g.move && !fired['m' + q.s]) { fired['m' + q.s] = 1; out.push(`• ${q.s} moved ${q.pct > 0 ? '+' : ''}${q.pct.toFixed(2)}% today (${q.ltp})`); }
    if (g.hi52 && q.h52 && q.ltp >= q.h52 && !fired['h' + q.s]) { fired['h' + q.s] = 1; out.push(`• ${q.s} NEW 52-WEEK HIGH ${q.ltp}`); }
    if (g.lo52 && q.l52 && q.ltp <= q.l52 && !fired['l' + q.s]) { fired['l' + q.s] = 1; out.push(`• ${q.s} NEW 52-WEEK LOW ${q.ltp}`); }
  });
  const n = by.NIFTY;
  if (n && g.nifty > 0 && Math.abs(n.pct) >= g.nifty && !fired.nifty) { fired.nifty = 1; out.push(`• NIFTY 50 moved ${n.pct.toFixed(2)}% (${n.ltp})`); }
  return out.slice(0, 25);
}

async function tg(env, text) {
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text })
  });
  return r.ok;
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
