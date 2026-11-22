package com.ourworldhive.niftypulse;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Nifty Pulse engine for the home-screen widget and the alerts that ring while the app is closed.
 * Settings come from the app page (feed link, source, watchlist, alerts). Prices come from your Cloudflare worker.
 * Copyright DUKEKRRISH. All rights reserved.
 */
final class Pulse {
    static final String CH = "np_alerts";
    static final TimeZone IST = TimeZone.getTimeZone("Asia/Kolkata");
    static volatile boolean FOREGROUND = false;   /* the app page rings its own alerts while it is open */

    static SharedPreferences sp(Context c) { return c.getApplicationContext().getSharedPreferences("nifty_pulse", Context.MODE_PRIVATE); }

    static JSONObject cfg(Context c) { try { return new JSONObject(sp(c).getString("cfg", "{}")); } catch (Exception e) { return new JSONObject(); } }

    static void saveCfg(Context c, String json) {
        try { new JSONObject(json); sp(c).edit().putString("cfg", json).apply(); } catch (Exception ignored) { }
        schedule(c);
    }

    static String today() { SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US); f.setTimeZone(IST); return f.format(new Date()); }

    static boolean marketOpen() {
        Calendar k = Calendar.getInstance(IST);
        int wd = k.get(Calendar.DAY_OF_WEEK), m = k.get(Calendar.HOUR_OF_DAY) * 60 + k.get(Calendar.MINUTE);
        return wd != Calendar.SATURDAY && wd != Calendar.SUNDAY && m >= 9 * 60 + 10 && m <= 15 * 60 + 35;
    }

    /* ---------- alert keys already rung today (shared with the app page) ---------- */
    static synchronized boolean markFired(Context c, String key) {
        try {
            JSONObject f = new JSONObject(sp(c).getString("fired", "{}"));
            if (!today().equals(f.optString("day"))) f = new JSONObject().put("day", today());
            if (f.has(key)) return false;
            f.put(key, 1);
            sp(c).edit().putString("fired", f.toString()).apply();
            return true;
        } catch (Exception e) { return true; }
    }
    static synchronized void unfire(Context c, String key) {
        try { JSONObject f = new JSONObject(sp(c).getString("fired", "{}")); f.remove(key); sp(c).edit().putString("fired", f.toString()).apply(); } catch (Exception ignored) { }
    }

    static final String CH_ALARM = "np_alarm";

    /** Is a full-screen alarm switched on for this kind of alert? key: r… = my price alerts, g… = BUY/SELL signals, others = scan alerts */
    static boolean alarmFor(Context c, String key) {
        JSONObject a = cfg(c).optJSONObject("alarm"); if (a == null || key == null) return false;
        return key.startsWith("r") ? a.optBoolean("r") : key.startsWith("g") || key.startsWith("sig") ? a.optBoolean("g") : a.optBoolean("s");
    }

    /** Stop every alarm that is still ringing (slide to stop, Stop button, or opening the app). */
    static void stopAlarms(Context c) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            for (String id : sp(c).getStringSet("ring", new java.util.HashSet<String>())) if (nm != null) nm.cancel(Integer.parseInt(id));
            sp(c).edit().remove("ring").apply();
            AlarmActivity a = AlarmActivity.live == null ? null : AlarmActivity.live.get();
            if (a != null) a.finish();
        } catch (Exception ignored) { }
    }

    static void notify(Context c, String title, String msg, String key) { notify(c, title, msg, key, alarmFor(c, key)); }

    static void notify(Context c, String title, String msg, String key, boolean alarm) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel(CH, "Price alerts", NotificationManager.IMPORTANCE_HIGH);
                ch.enableVibration(true); ch.setVibrationPattern(new long[]{0, 180, 80, 180});
                nm.createNotificationChannel(ch);
            }
            if (alarm && Build.VERSION.SDK_INT >= 26) {
                NotificationChannel al = new NotificationChannel(CH_ALARM, "Full-screen price alarms", NotificationManager.IMPORTANCE_HIGH);
                al.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                al.enableVibration(true); al.setVibrationPattern(new long[]{0, 600, 400, 600, 400, 600}); al.setBypassDnd(true);
                nm.createNotificationChannel(al);
            }
            int nid = key == null ? (int) (System.currentTimeMillis() % 100000) : 1000 + (key.hashCode() & 0xffff);
            Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 11, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, alarm ? CH_ALARM : CH) : new Notification.Builder(c);
            b.setSmallIcon(alarm ? android.R.drawable.ic_lock_idle_alarm : android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(msg)
             .setStyle(new Notification.BigTextStyle().bigText(msg)).setContentIntent(pi).setAutoCancel(true);
            if (alarm) {
                /* full screen over the lock screen; while the phone is in use it shows as a banner, a tap opens the full screen */
                PendingIntent full = PendingIntent.getActivity(c, nid, AlarmActivity.open(c, nid, title, msg), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                Intent st = new Intent(c, Tick.class).setAction(Tick.STOP);
                b.setOngoing(true).setAutoCancel(false).setFullScreenIntent(full, true).setContentIntent(full).setCategory(Notification.CATEGORY_ALARM)
                 .addAction(new Notification.Action.Builder(null, "Stop", PendingIntent.getBroadcast(c, 41, st, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());
            }
            if (Build.VERSION.SDK_INT < 26) {
                b.setPriority(alarm ? Notification.PRIORITY_MAX : Notification.PRIORITY_HIGH);
                if (alarm) { b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioManager.STREAM_ALARM); b.setVibrate(new long[]{0, 600, 400, 600}); }
                else b.setDefaults(Notification.DEFAULT_ALL);
            }
            Notification n = b.build();
            if (alarm) {
                n.flags |= Notification.FLAG_INSISTENT;   /* keeps ringing until Stop */
                java.util.Set<String> r = new java.util.HashSet<>(sp(c).getStringSet("ring", new java.util.HashSet<String>())); r.add(String.valueOf(nid)); sp(c).edit().putStringSet("ring", r).apply();
            }
            nm.notify(nid, n);
            if (alarm) { try { c.startActivity(AlarmActivity.open(c, nid, title, msg)); } catch (Exception ignored) { } }   /* works when the app is open; otherwise the full-screen intent above does it */
        } catch (Exception ignored) { }
    }

    /* ---------- fetch prices from the worker ---------- */
    static String enc(String s) { try { return URLEncoder.encode(s == null ? "" : s, "UTF-8"); } catch (Exception e) { return ""; } }
    static String join(JSONArray a) { StringBuilder b = new StringBuilder(); if (a != null) for (int i = 0; i < a.length(); i++) { if (b.length() > 0) b.append(','); b.append(a.optString(i)); } return b.toString(); }

    static JSONObject fetch(Context c) throws Exception {
        JSONObject k = cfg(c);
        String feed = k.optString("feed", "").replaceAll("/+$", "");
        if (feed.isEmpty()) throw new Exception("Open the app and add your worker link in Settings");
        String src = k.optString("src", "auto");
        String sym = join(k.optJSONArray("sym")), extra = join(k.optJSONArray("extra"));
        String u = feed + "/quotes?src=" + enc(src) + (sym.isEmpty() ? "" : "&sym=" + enc(sym)) + (extra.isEmpty() || "breeze".equals(src) ? "" : "&extra=" + enc(extra))
            + ("breeze".equals(src) && !k.optString("bcodes", "").isEmpty() ? "&bcodes=" + enc(k.optString("bcodes").replaceAll("\\s+", "")) : "")
            + (k.optString("key", "").isEmpty() ? "" : "&k=" + enc(k.optString("key")) + "&d=" + enc("bg-" + Build.MODEL.replaceAll("[^A-Za-z0-9]", "")) + "&dn=" + enc("App in background · " + Build.MANUFACTURER + " " + Build.MODEL));
        HttpURLConnection h = (HttpURLConnection) new URL(u).openConnection();
        h.setConnectTimeout(10000); h.setReadTimeout(15000); h.setRequestProperty("Accept", "application/json");
        try {
            InputStream in = h.getResponseCode() < 400 ? h.getInputStream() : h.getErrorStream();
            ByteArrayOutputStream bo = new ByteArrayOutputStream(); byte[] buf = new byte[8192]; int n;
            while (in != null && (n = in.read(buf)) > 0) bo.write(buf, 0, n);
            JSONObject d = new JSONObject(bo.toString("UTF-8"));
            if (!d.optBoolean("ok")) throw new Exception(d.optBoolean("needLogin") ? "ICICI login needed today" : d.optString("error", "No data"));
            return d;
        } finally { h.disconnect(); }
    }

    /** Get prices, save them, update the widget and ring alerts. Runs on a background thread. */
    static void refresh(Context c) {
        try {
            JSONObject d = fetch(c);
            sp(c).edit().putString("last", d.toString()).putString("err", "").apply();
            if (!FOREGROUND) { checkAlerts(c, d); checkSignals(c, d); }
        } catch (Exception e) {
            sp(c).edit().putString("err", String.valueOf(e.getMessage())).apply();
        }
        render(c);
    }

    /* ---------- alerts (same rules as the app page) ---------- */
    static String f2(double v) { NumberFormat nf = NumberFormat.getNumberInstance(new Locale("en", "IN")); nf.setMinimumFractionDigits(2); nf.setMaximumFractionDigits(2); return nf.format(v); }
    static String sg(double v) { return (v > 0 ? "+" : "") + f2(v); }

    static void checkAlerts(Context c, JSONObject d) {
        JSONObject k = cfg(c);
        Map<String, JSONObject> by = new HashMap<>();
        JSONArray st = d.optJSONArray("stocks"), ix = d.optJSONArray("index");
        if (st != null) for (int i = 0; i < st.length(); i++) { JSONObject q = st.optJSONObject(i); if (q != null) by.put(q.optString("s"), q); }
        if (ix != null) for (int i = 0; i < ix.length(); i++) { JSONObject q = ix.optJSONObject(i); if (q != null) by.put(q.optString("s"), q); }
        StringBuilder all = new StringBuilder(); int n = 0; boolean alarmNow = false, scanAl = alarmFor(c, "m");
        JSONArray rules = k.optJSONArray("rules");
        if (rules != null) for (int i = 0; i < rules.length(); i++) {
            JSONObject r = rules.optJSONObject(i); if (r == null || !r.optBoolean("on", true)) continue;
            JSONObject q = by.get(r.optString("s")); if (q == null) continue;
            double ltp = q.optDouble("ltp", 0), pct = q.optDouble("pct", 0), v = r.optDouble("v", 0);
            String t = r.optString("type"), s = r.optString("s"), msg = null;
            if ("above".equals(t) && ltp >= v) msg = s + " crossed ABOVE ₹" + f2(v) + " → ₹" + f2(ltp);
            else if ("below".equals(t) && ltp <= v) msg = s + " fell BELOW ₹" + f2(v) + " → ₹" + f2(ltp);
            else if ("pctUp".equals(t) && pct >= v) msg = s + " is UP " + sg(pct) + "% today (₹" + f2(ltp) + ")";
            else if ("pctDown".equals(t) && pct <= -Math.abs(v)) msg = s + " is DOWN " + f2(pct) + "% today (₹" + f2(ltp) + ")";
            if (msg != null && markFired(c, "r" + r.optString("id"))) { n++; all.append(msg).append('\n'); if (alarmFor(c, "r")) alarmNow = true; }
        }
        JSONObject g = k.optJSONObject("global"); if (g == null) g = new JSONObject();
        double gm = g.optDouble("move", 0), gn = g.optDouble("nifty", 0);
        boolean hi = g.optBoolean("hi52"), lo = g.optBoolean("lo52");
        JSONArray only = g.optJSONArray("only");
        if (st != null) for (int i = 0; i < st.length(); i++) {
            JSONObject q = st.optJSONObject(i); if (q == null) continue;
            String s = q.optString("s");
            if (only != null && only.length() > 0 && !only.toString().contains("\"" + s + "\"")) continue;
            double ltp = q.optDouble("ltp", 0), pct = q.optDouble("pct", 0), h52 = q.optDouble("h52", 0), l52 = q.optDouble("l52", 0);
            if (gm > 0 && Math.abs(pct) >= gm && markFired(c, "m" + s)) { n++; alarmNow |= scanAl; all.append(s).append(" moved ").append(sg(pct)).append("% today (₹").append(f2(ltp)).append(")\n"); }
            if (hi && h52 > 0 && ltp >= h52 && markFired(c, "h" + s)) { n++; alarmNow |= scanAl; all.append(s).append(" made a NEW 52-WEEK HIGH ₹").append(f2(ltp)).append('\n'); }
            if (lo && l52 > 0 && ltp <= l52 && markFired(c, "l" + s)) { n++; alarmNow |= scanAl; all.append(s).append(" made a NEW 52-WEEK LOW ₹").append(f2(ltp)).append('\n'); }
        }
        JSONObject nf = by.get("NIFTY");
        if (nf != null && gn > 0 && Math.abs(nf.optDouble("pct", 0)) >= gn && markFired(c, "nifty")) { n++; alarmNow |= scanAl; all.append("NIFTY 50 moved ").append(sg(nf.optDouble("pct", 0))).append("% (").append(f2(nf.optDouble("ltp", 0))).append(")\n"); }
        if (n == 0) return;
        String txt = all.toString().trim();
        notify(c, n == 1 ? "🔔 Nifty Pulse alert" : "🔔 " + n + " Nifty Pulse alerts", txt, n == 1 ? txt : null, alarmNow);
    }

    /* ---------- BUY / SELL signal alerts with the app closed ----------
       Same rules as the app page: 20 & 50-day averages, MACD (12,26,9) and RSI (14) on daily closes.
       Daily closes come from the worker once every 3 hours (small, about 40 KB), live price from the normal check. */
    static double[] ema(double[] a, int n) { double k = 2.0 / (n + 1), e = a[0]; double[] o = new double[a.length]; for (int i = 0; i < a.length; i++) { e = i == 0 ? a[0] : a[i] * k + e * (1 - k); o[i] = e; } return o; }
    static double rsi(double[] a, int n) {
        if (a.length < n + 1) return -1; double g = 0, l = 0;
        for (int i = 1; i <= n; i++) { double d = a[i] - a[i - 1]; if (d > 0) g += d; else l -= d; }
        g /= n; l /= n;
        for (int i = n + 1; i < a.length; i++) { double d = a[i] - a[i - 1]; g = (g * (n - 1) + (d > 0 ? d : 0)) / n; l = (l * (n - 1) + (d < 0 ? -d : 0)) / n; }
        return l == 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    /** returns {signal, word}: signal is BUY, SELL or WAIT */
    static String[] signal(double[] c) {
        int n = c.length; if (n < 35) return null;
        double P = c[n - 1]; double[] e20 = ema(c, 20), e50 = ema(c, 50), m12 = ema(c, 12), m26 = ema(c, 26), md = new double[n];
        for (int i = 0; i < n; i++) md[i] = m12[i] - m26[i];
        double[] sl = ema(md, 9), h = new double[n]; for (int i = 0; i < n; i++) h[i] = md[i] - sl[i];
        double H = h[n - 1], R = rsi(c, 14); int sc = 0;
        sc += P > e20[n - 1] ? 1 : -1; sc += P > e50[n - 1] ? 1 : -1; sc += e20[n - 1] > e50[n - 1] ? 1 : -1; sc += H > 0 ? 1 : -1; sc += H > h[n - 2] ? 1 : -1;
        if (R >= 0 && R < 70 && R > 30) { if (R > 55) sc++; else if (R < 45) sc--; }
        boolean up = false, dn = false;
        for (int i = n - 3; i < n; i++) { if (i < 1) continue; if (h[i - 1] <= 0 && h[i] > 0) up = true; if (h[i - 1] >= 0 && h[i] < 0) dn = true; if (c[i - 1] < e20[i - 1] && c[i] >= e20[i]) up = true; if (c[i - 1] > e20[i - 1] && c[i] <= e20[i]) dn = true; }
        int dir = sc >= 3 ? 1 : sc <= -3 ? -1 : 0;
        String word = sc >= 5 ? "strong bullish" : sc >= 3 ? "bullish" : sc <= -5 ? "strong bearish" : sc <= -3 ? "bearish" : "sideways";
        String sig = "WAIT";
        if (dir > 0 && (R < 0 || R < 70) && (up || sc >= 5)) sig = "BUY";
        else if (dir < 0 && (R < 0 || R > 30) && (dn || sc <= -5)) sig = "SELL";
        return new String[]{sig, word};
    }

    static JSONObject history(Context c) {
        try {
            long at = sp(c).getLong("histAt", 0);
            if (System.currentTimeMillis() - at < 3 * 3600000L) return new JSONObject(sp(c).getString("hist", "{}"));
            JSONObject k = cfg(c);
            String feed = k.optString("feed", "").replaceAll("/+$", "");
            if (feed.isEmpty()) return null;
            String sym = join(k.optJSONArray("sym")), extra = join(k.optJSONArray("extra")), all = sym.isEmpty() ? "" : sym + (extra.isEmpty() ? "" : "," + extra);
            HttpURLConnection hc = (HttpURLConnection) new URL(feed + "/history" + (all.isEmpty() ? "" : "?sym=" + enc(all))).openConnection();
            hc.setConnectTimeout(10000); hc.setReadTimeout(20000);
            try {
                InputStream in = hc.getInputStream(); ByteArrayOutputStream bo = new ByteArrayOutputStream(); byte[] buf = new byte[8192]; int r;
                while ((r = in.read(buf)) > 0) bo.write(buf, 0, r);
                JSONObject j = new JSONObject(bo.toString("UTF-8"));
                JSONObject data = j.optJSONObject("data");
                if (!j.optBoolean("ok") || data == null) return new JSONObject(sp(c).getString("hist", "{}"));
                sp(c).edit().putString("hist", data.toString()).putLong("histAt", System.currentTimeMillis()).apply();
                return data;
            } finally { hc.disconnect(); }
        } catch (Exception e) { try { return new JSONObject(sp(c).getString("hist", "{}")); } catch (Exception x) { return null; } }
    }

    static void checkSignals(Context c, JSONObject d) {
        JSONObject g = cfg(c).optJSONObject("global");
        if (g == null || !g.optBoolean("sig") || !marketOpen()) return;
        JSONArray st = d.optJSONArray("stocks"), only = g.optJSONArray("only");
        if (st == null) return;
        JSONObject hist = history(c);
        if (hist == null) return;
        StringBuilder buy = new StringBuilder(), sell = new StringBuilder(); int nb = 0, ns = 0;
        for (int i = 0; i < st.length(); i++) {
            JSONObject q = st.optJSONObject(i); if (q == null) continue;
            String s = q.optString("s");
            if (only != null && only.length() > 0 && !only.toString().contains("\"" + s + "\"")) continue;
            JSONObject h = hist.optJSONObject(s); if (h == null) continue;
            JSONArray ca = h.optJSONArray("c"); if (ca == null || ca.length() < 35) continue;
            double ltp = q.optDouble("ltp", 0); if (ltp <= 0) continue;
            boolean todayIn = today().equals(h.optString("d"));
            double[] cl = new double[ca.length() + (todayIn ? 0 : 1)];
            for (int x = 0; x < ca.length(); x++) cl[x] = ca.optDouble(x, 0);
            cl[cl.length - 1] = ltp;
            String[] r = signal(cl); if (r == null || "WAIT".equals(r[0])) continue;
            if (!markFired(c, "g" + r[0] + s)) continue;
            String line = s + " ₹" + f2(ltp) + " (" + sg(q.optDouble("pct", 0)) + "%) · " + r[1] + "\n";
            if ("BUY".equals(r[0])) { nb++; buy.append("▲ ").append(line); } else { ns++; sell.append("▼ ").append(line); }
        }
        boolean al = alarmFor(c, "g");
        if (nb > 0) notify(c, "▲ " + nb + " new BUY signal" + (nb > 1 ? "s" : ""), buy.toString().trim() + "\nNot advice. Check before you trade.", "sigbuy" + today() + nb, al);
        if (ns > 0) notify(c, "▼ " + ns + " new SELL signal" + (ns > 1 ? "s" : ""), sell.toString().trim() + "\nNot advice. Check before you trade.", "sigsell" + today() + ns, al);
    }

    /* ---------- home-screen widget ---------- */
    static final int[][] ROW = {
        {R.id.r1, R.id.s1, R.id.v1, R.id.p1}, {R.id.r2, R.id.s2, R.id.v2, R.id.p2}, {R.id.r3, R.id.s3, R.id.v3, R.id.p3},
        {R.id.r4, R.id.s4, R.id.v4, R.id.p4}, {R.id.r5, R.id.s5, R.id.v5, R.id.p5}, {R.id.r6, R.id.s6, R.id.v6, R.id.p6},
        {R.id.r7, R.id.s7, R.id.v7, R.id.p7}, {R.id.r8, R.id.s8, R.id.v8, R.id.p8}, {R.id.r9, R.id.s9, R.id.v9, R.id.p9},
        {R.id.r10, R.id.s10, R.id.v10, R.id.p10}};
    static int col(double p) { return p > 0.004 ? 0xFF16C784 : p < -0.004 ? 0xFFFF4D5E : 0xFFB8C4E0; }

    /** Every widget size: small (indices only), medium (5 stocks), large (10 stocks). */
    static void render(Context c) {
        AppWidgetManager am = AppWidgetManager.getInstance(c);
        render(c, am, am.getAppWidgetIds(new ComponentName(c, PulseSmall.class)), R.layout.widget_small, 0);
        render(c, am, am.getAppWidgetIds(new ComponentName(c, PulseWidget.class)), R.layout.widget_pulse, 5);
        render(c, am, am.getAppWidgetIds(new ComponentName(c, PulseLarge.class)), R.layout.widget_large, 10);
    }

    static void render(Context c, AppWidgetManager am, int[] ids, int layout, int nRows) {
        if (ids == null || ids.length == 0) return;
        RemoteViews v = new RemoteViews(c.getPackageName(), layout);
        try {
            JSONObject d = new JSONObject(sp(c).getString("last", "{}"));
            JSONArray ix = d.optJSONArray("index"), st = d.optJSONArray("stocks");
            if (ix != null) for (int i = 0; i < ix.length(); i++) {
                JSONObject q = ix.optJSONObject(i); if (q == null) continue;
                boolean nif = "NIFTY".equals(q.optString("s"));
                double p = q.optDouble("pct", 0);
                v.setTextViewText(nif ? R.id.nv : R.id.bv, f2(q.optDouble("ltp", 0)));
                v.setTextViewText(nif ? R.id.np : R.id.bp, sg(q.optDouble("chg", 0)) + " (" + sg(p) + "%)");
                v.setTextColor(nif ? R.id.np : R.id.bp, col(p));
            }
            Map<String, JSONObject> by = new HashMap<>();
            int up = 0, dn = 0;
            if (st != null) for (int i = 0; i < st.length(); i++) {
                JSONObject q = st.optJSONObject(i); if (q == null) continue;
                by.put(q.optString("s"), q);
                double p = q.optDouble("pct", 0); if (p > 0) up++; else if (p < 0) dn++;
            }
            if (nRows > 0) v.setTextViewText(R.id.breadth, st == null ? "" : "▲ " + up + " UP    ▼ " + dn + " DOWN" + ("breeze".equals(d.optString("src")) ? "   · ICICI" : "angel".equals(d.optString("src")) ? "   · ANGEL" : "yahoo".equals(d.optString("src")) ? "   · YAHOO" : ""));
            /* rows: your watchlist first, else the biggest movers */
            if (nRows == 0) throw new RuntimeException("small");   /* small widget: indices only, skip rows and time */
            java.util.ArrayList<JSONObject> rows = new java.util.ArrayList<>();
            JSONArray w = cfg(c).optJSONArray("watch");
            if (w != null) for (int i = 0; i < w.length() && rows.size() < nRows; i++) { JSONObject q = by.get(w.optString(i)); if (q != null) rows.add(q); }
            if (rows.isEmpty() && st != null) {
                java.util.ArrayList<JSONObject> L = new java.util.ArrayList<>(by.values());
                java.util.Collections.sort(L, (a, b) -> Double.compare(Math.abs(b.optDouble("pct", 0)), Math.abs(a.optDouble("pct", 0))));
                for (int i = 0; i < L.size() && rows.size() < nRows; i++) rows.add(L.get(i));
            }
            for (int i = 0; i < nRows; i++) {
                if (i < rows.size()) {
                    JSONObject q = rows.get(i); double p = q.optDouble("pct", 0);
                    v.setViewVisibility(ROW[i][0], android.view.View.VISIBLE);
                    v.setTextViewText(ROW[i][1], q.optString("s"));
                    v.setTextViewText(ROW[i][2], f2(q.optDouble("ltp", 0)));
                    v.setTextViewText(ROW[i][3], sg(p) + "%");
                    v.setTextColor(ROW[i][3], col(p));
                } else v.setViewVisibility(ROW[i][0], android.view.View.GONE);
            }
            String err = sp(c).getString("err", "");
            long ts = d.optLong("ts", 0);
            SimpleDateFormat tf = new SimpleDateFormat("h:mm a", Locale.US); tf.setTimeZone(IST);
            String time = ts > 0 ? tf.format(new Date(ts)) : "";
            if (!err.isEmpty()) time = (time.isEmpty() ? "" : time + " · ") + (err.length() > 34 ? err.substring(0, 34) + "…" : err);
            else if (!marketOpen() && ts > 0) time = time + " · closed";
            v.setTextViewText(R.id.time, time.isEmpty() ? "Open the app to set up" : time);
        } catch (Exception ignored) { }
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(R.id.root, PendingIntent.getActivity(c, 21, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        Intent rf = new Intent(c, Tick.class).setAction(Tick.REFRESH);
        if (nRows > 0) v.setOnClickPendingIntent(R.id.refresh, PendingIntent.getBroadcast(c, 22, rf, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        am.updateAppWidget(ids, v);
    }

    static boolean needed(Context c) {
        AppWidgetManager am = AppWidgetManager.getInstance(c);
        int n = 0;
        for (Class<?> w : new Class<?>[]{PulseSmall.class, PulseWidget.class, PulseLarge.class}) { int[] a = am.getAppWidgetIds(new ComponentName(c, w)); if (a != null) n += a.length; }
        JSONObject k = cfg(c), g = k.optJSONObject("global");
        JSONArray r = k.optJSONArray("rules");
        boolean alerts = (r != null && r.length() > 0) || (g != null && (g.optDouble("move", 0) > 0 || g.optDouble("nifty", 0) > 0 || g.optBoolean("hi52") || g.optBoolean("lo52") || g.optBoolean("sig")));
        return n > 0 || alerts;
    }

    /** Next check: every 5 minutes in market hours, else once an hour. Android may delay it a little to save battery. */
    static void schedule(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pi = PendingIntent.getBroadcast(c, 31, new Intent(c, Tick.class).setAction(Tick.TICK), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (am == null) return;
            if (!needed(c)) { am.cancel(pi); return; }
            long next = System.currentTimeMillis() + (marketOpen() ? 5 : 60) * 60000L;
            if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi); else am.set(AlarmManager.RTC_WAKEUP, next, pi);
        } catch (Exception ignored) { }
    }

    private Pulse() { }
}
