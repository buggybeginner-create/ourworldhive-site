package com.ourworldhive.pm;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.DateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Full-screen PM alarm over the lock screen: counts, the job list, WhatsApp share, open the app, snooze, slide to stop.
 *  Copyright DUKEKRRISH. All rights reserved. */
public class PmAlarmActivity extends Activity {
    static java.lang.ref.WeakReference<PmAlarmActivity> live;
    static void closeLive() { PmAlarmActivity a = live == null ? null : live.get(); if (a != null) a.finish(); }
    private int filter = -9;   /* -9 = overdue + due today (+ soon when there is nothing else) */

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFFB91C1C); getWindow().setNavigationBarColor(0xFF0B3B37);
        live = new java.lang.ref.WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> { });
        draw();
    }
    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); draw(); }
    @Override protected void onDestroy() { if (live != null && live.get() == this) live = null; super.onDestroy(); }

    private List<JSONObject> rows(int want) {
        JSONObject o = PmAlarm.cfg(this); JSONArray L = o.optJSONArray("tasks"); String td = PmAlarm.today(); int A = o.optInt("A", 7);
        List<JSONObject> out = new ArrayList<>();
        if (L == null) return out;
        for (int i = 0; i < L.length(); i++) {
            JSONObject t = L.optJSONObject(i); if (t == null) continue;
            int s = PmAlarm.state(t, td, A); if (s < 0) continue;
            if (want == -9 ? s >= 1 : want == 9 || s == want) { try { t.put("_s", s); } catch (Exception ignored) { } out.add(t); }
        }
        Collections.sort(out, (a, b2) -> { int x = b2.optInt("_s") - a.optInt("_s"); return x != 0 ? x : a.optString("e", a.optString("d")).compareTo(b2.optString("e", b2.optString("d"))); });
        return out;
    }

    private void draw() {
        JSONObject o = PmAlarm.cfg(this);
        int[] n = PmAlarm.counts(this);
        if (filter == -9 && n[2] + n[1] == 0) filter = 9;
        String td = PmAlarm.today();

        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFEEF4F3);

        /* red header */
        LinearLayout head = new LinearLayout(this); head.setOrientation(LinearLayout.VERTICAL);
        head.setPadding(dp(16), dp(30), dp(16), dp(14));
        head.setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{0xFFB91C1C, 0xFFDC2626}));
        LinearLayout top = new LinearLayout(this); top.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout tt = new LinearLayout(this); tt.setOrientation(LinearLayout.VERTICAL);
        tt.addView(tv("⏰ PM Alarm", 24, Color.WHITE, true, Gravity.START));
        tt.addView(tv(o.optString("name", "PM Tracker") + " • " + DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()), 14, 0xEEFFFFFF, false, Gravity.START));
        if (!o.optString("who").isEmpty()) tt.addView(tv(o.optString("who"), 13, 0xDDFFFFFF, false, Gravity.START));
        top.addView(tt, new LinearLayout.LayoutParams(0, -2, 1f));
        head.addView(top);
        LinearLayout cs = new LinearLayout(this); cs.setPadding(0, dp(10), 0, 0);
        cs.addView(chip(n[2], "Overdue", 0xFFDC2626, 2), new LinearLayout.LayoutParams(0, dp(66), 1f));
        LinearLayout.LayoutParams g = new LinearLayout.LayoutParams(0, dp(66), 1f); g.leftMargin = dp(6);
        cs.addView(chip(n[1], "Due Today", 0xFFD97706, 1), g);
        LinearLayout.LayoutParams g2 = new LinearLayout.LayoutParams(0, dp(66), 1f); g2.leftMargin = dp(6);
        cs.addView(chip(n[0], "Due Soon", 0xFFA16207, 0), g2);
        LinearLayout.LayoutParams g3 = new LinearLayout.LayoutParams(0, dp(66), 1f); g3.leftMargin = dp(6);
        cs.addView(chip(n[0] + n[1] + n[2], "All", 0xFF1F2937, 9), g3);
        head.addView(cs);
        root.addView(head);

        /* job list */
        ScrollView sv = new ScrollView(this);
        LinearLayout list = new LinearLayout(this); list.setOrientation(LinearLayout.VERTICAL); list.setPadding(dp(12), dp(10), dp(12), dp(10));
        List<JSONObject> L = rows(filter);
        Map<String, Integer> types = new LinkedHashMap<>();
        for (JSONObject t : L) { String k = t.optString("type", "No type"); types.put(k, types.containsKey(k) ? types.get(k) + 1 : 1); }
        if (types.size() > 1) {
            StringBuilder sb = new StringBuilder("By type: ");
            int k = 0; for (Map.Entry<String, Integer> e : types.entrySet()) { if (k++ > 0) sb.append(" • "); sb.append(e.getKey()).append(" ").append(e.getValue()); }
            TextView ty = tv(sb.toString(), 13, 0xFF475569, false, Gravity.START); ty.setPadding(dp(2), 0, dp(2), dp(8)); list.addView(ty);
        }
        if (L.isEmpty()) { TextView e = tv("✅ Nothing pending here. Well done!", 17, 0xFF0F766E, true, Gravity.CENTER); e.setPadding(0, dp(40), 0, 0); list.addView(e); }
        int shown = 0;
        for (JSONObject t : L) {
            if (shown++ >= 150) { list.addView(tv("…and " + (L.size() - 150) + " more in the app.", 14, 0xFF475569, false, Gravity.CENTER)); break; }
            int s = t.optInt("_s");
            int col = s == 2 ? 0xFFDC2626 : s == 1 ? 0xFFF59E0B : 0xFFEAB308;
            LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.HORIZONTAL);
            GradientDrawable cb = new GradientDrawable(); cb.setColor(Color.WHITE); cb.setCornerRadius(dp(12)); cb.setStroke(dp(1), 0xFFD5DFDC); card.setBackground(cb);
            View bar = new View(this); GradientDrawable bb = new GradientDrawable(); bb.setColor(col); bb.setCornerRadius(dp(3)); bar.setBackground(bb);
            card.addView(bar, new LinearLayout.LayoutParams(dp(6), -1));
            LinearLayout in = new LinearLayout(this); in.setOrientation(LinearLayout.VERTICAL); in.setPadding(dp(10), dp(8), dp(10), dp(8));
            LinearLayout r1 = new LinearLayout(this); r1.setGravity(Gravity.CENTER_VERTICAL);
            r1.addView(tv(t.optString("tag"), 16, 0xFF0F172A, true, Gravity.START), new LinearLayout.LayoutParams(0, -2, 1f));
            String lbl = s == 2 ? "Overdue " + PmAlarm.days(td, t.optString("e", t.optString("d"))) + "d" : s == 1 ? "Due today" : "Due in " + PmAlarm.days(t.optString("d"), td) + "d";
            TextView p = tv(lbl, 12, s == 2 ? 0xFFB91C1C : s == 1 ? 0xFF92400E : 0xFF854D0E, true, Gravity.CENTER);
            GradientDrawable pb = new GradientDrawable(); pb.setColor(s == 2 ? 0xFFFEE2E2 : s == 1 ? 0xFFFEF3C7 : 0xFFFEF9C3); pb.setCornerRadius(dp(10)); p.setBackground(pb); p.setPadding(dp(8), dp(3), dp(8), dp(3));
            r1.addView(p);
            in.addView(r1);
            if (!t.optString("name").isEmpty()) in.addView(tv(t.optString("name"), 14, 0xFF1F2937, false, Gravity.START));
            String meta = t.optString("type", "No type") + (t.optString("sec").isEmpty() ? "" : " • " + t.optString("sec")) + (t.optString("who").isEmpty() ? "" : " • 👤 " + t.optString("who"));
            in.addView(tv(meta, 12.5f, 0xFF64748B, false, Gravity.START));
            card.addView(in, new LinearLayout.LayoutParams(0, -2, 1f));
            final String tag = t.optString("tag");
            card.setOnClickListener(v -> openApp("#/i/" + android.net.Uri.encode(o.optString("plant")) + "/" + android.net.Uri.encode(tag)));
            LinearLayout.LayoutParams cl = new LinearLayout.LayoutParams(-1, -2); cl.bottomMargin = dp(7);
            list.addView(card, cl);
        }
        long ts = o.optLong("ts", 0);
        if (ts > 0) { TextView up = tv("List updated " + DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(new Date(ts)) + ". Open PM Tracker for the latest.", 12, 0xFF64748B, false, Gravity.CENTER); up.setPadding(0, dp(6), 0, 0); list.addView(up); }
        sv.addView(list);
        root.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));

        /* buttons */
        LinearLayout foot = new LinearLayout(this); foot.setOrientation(LinearLayout.VERTICAL); foot.setPadding(dp(12), dp(8), dp(12), dp(14));
        foot.setBackgroundColor(0xFF0F3D39);
        Button wa = btn("📲  Share On WhatsApp", 0xFF16A34A, 17);
        wa.setOnClickListener(v -> { PmAlarm.silence(this); share(true); });
        foot.addView(wa, new LinearLayout.LayoutParams(-1, dp(54)));
        LinearLayout row = new LinearLayout(this); row.setPadding(0, dp(8), 0, 0);
        Button sn = btn("💤 Snooze 10 min", 0x33FFFFFF, 15); sn.setOnClickListener(v -> act("snooze"));
        row.addView(sn, new LinearLayout.LayoutParams(0, dp(50), 1f));
        Button op = btn("📋 Open PM", 0x33FFFFFF, 15); op.setOnClickListener(v -> openApp("#alarm"));
        LinearLayout.LayoutParams ol = new LinearLayout.LayoutParams(0, dp(50), 1f); ol.leftMargin = dp(8);
        row.addView(op, ol);
        foot.addView(row);

        FrameLayout track = new FrameLayout(this);
        GradientDrawable tb = new GradientDrawable(); tb.setColor(0x33FFFFFF); tb.setCornerRadius(dp(32)); track.setBackground(tb);
        TextView hint = tv("Slide to stop  ➜", 16, 0xEEFFFFFF, true, Gravity.CENTER);
        track.addView(hint, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        SeekBar sb = new SeekBar(this); sb.setMax(100);
        GradientDrawable th = new GradientDrawable(); th.setShape(GradientDrawable.OVAL); th.setColor(Color.WHITE); th.setSize(dp(54), dp(54));
        sb.setThumb(th); sb.setThumbOffset(dp(4));
        sb.setProgressDrawable(new GradientDrawable() {{ setColor(Color.TRANSPARENT); }});
        sb.setPadding(dp(30), 0, dp(30), 0); sb.setSplitTrack(false);
        sb.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int pr, boolean u) { hint.setAlpha(1f - pr / 120f); if (u && pr >= 92) { s.setEnabled(false); act("stop"); } }
            public void onStartTrackingTouch(SeekBar s) { }
            public void onStopTrackingTouch(SeekBar s) { if (s.getProgress() < 92) { s.setProgress(0); hint.setAlpha(1f); } }
        });
        track.addView(sb, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        LinearLayout.LayoutParams tl = new LinearLayout.LayoutParams(-1, dp(62)); tl.topMargin = dp(10);
        foot.addView(track, tl);
        root.addView(foot);

        root.setOnApplyWindowInsetsListener((v, ins) -> {
            if (Build.VERSION.SDK_INT >= 30) { android.graphics.Insets s = ins.getInsets(android.view.WindowInsets.Type.systemBars()); head.setPadding(dp(16), s.top + dp(10), dp(16), dp(14)); foot.setPadding(dp(12), dp(8), dp(12), s.bottom + dp(12)); }
            return ins;
        });
        setContentView(root);
    }

    private View chip(int n, String label, int col, final int f) {
        LinearLayout c = new LinearLayout(this); c.setOrientation(LinearLayout.VERTICAL); c.setGravity(Gravity.CENTER);
        GradientDrawable bg = new GradientDrawable(); bg.setColor(0xF2FFFFFF); bg.setCornerRadius(dp(12)); if (filter == f) bg.setStroke(dp(3), 0xFFFDE047); c.setBackground(bg);
        c.addView(tv(String.valueOf(n), 22, col, true, Gravity.CENTER));
        c.addView(tv(label, 11.5f, 0xFF1F2937, true, Gravity.CENTER));
        c.setOnClickListener(v -> { filter = filter == f ? -9 : f; draw(); });
        return c;
    }

    private String text() {
        JSONObject o = PmAlarm.cfg(this); String td = PmAlarm.today();
        StringBuilder sb = new StringBuilder("⏰ *PM Alarm* – ").append(o.optString("name", "PM Tracker")).append("\n").append(DateFormat.getDateInstance(DateFormat.MEDIUM).format(new Date())).append("\n");
        String[] H = {"🟡 DUE SOON", "🟠 DUE TODAY", "🔴 OVERDUE"};
        List<JSONObject> L = rows(filter);
        int k = 0;
        for (int s = 2; s >= 0; s--) {
            List<JSONObject> g = new ArrayList<>(); for (JSONObject t : L) if (t.optInt("_s") == s) g.add(t);
            if (g.isEmpty()) continue;
            sb.append("\n*").append(H[s]).append(" (").append(g.size()).append(")*\n");
            for (JSONObject t : g) {
                if (k++ >= 60) break;
                sb.append(k).append(". ").append(t.optString("tag"));
                if (!t.optString("name").isEmpty()) sb.append(" – ").append(t.optString("name"));
                sb.append(" [").append(t.optString("type", "No type")).append("]");
                if (s == 2) sb.append(" – ").append(PmAlarm.days(td, t.optString("e", t.optString("d")))).append("d late");
                if (!t.optString("who").isEmpty()) sb.append(" – ").append(t.optString("who"));
                sb.append("\n");
            }
        }
        if (k > 60) sb.append("…and ").append(k - 60).append(" more in the app.\n");
        sb.append("\nOpen: https://ourworldhive.com/pm.html");
        return sb.toString();
    }

    private void share(boolean whatsapp) {
        Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text());
        if (whatsapp) {
            for (String pk : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
                try { startActivity(new Intent(i).setPackage(pk)); return; } catch (Exception ignored) { }
            }
        }
        try { startActivity(Intent.createChooser(i, "Share PM list")); } catch (Exception ignored) { }
    }

    private void openApp(String hash) {
        PmAlarm.silence(this);
        try { startActivity(new Intent(this, MainActivity.class).putExtra("hash", hash).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)); } catch (Exception ignored) { }
        finish();
    }

    private void act(String what) {
        sendBroadcast(new Intent(this, PmAlarm.class).setAction("pm." + what).putExtra("do", what));
        finish();
    }

    private TextView tv(String s, float sz, int c, boolean bold, int grav) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(sz); t.setTextColor(c); t.setGravity(grav);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD); return t;
    }
    private Button btn(String s, int bg, float sz) {
        Button b = new Button(this); b.setText(s); b.setAllCaps(false); b.setTextColor(Color.WHITE); b.setTextSize(sz); b.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable(); g.setColor(bg); g.setCornerRadius(dp(14)); b.setBackground(g); return b;
    }

    /** Back does not stop the alarm by accident. */
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { }

    static Intent open(Context c) {
        return new Intent(c, PmAlarmActivity.class).setAction("pm.alarm")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }
}
