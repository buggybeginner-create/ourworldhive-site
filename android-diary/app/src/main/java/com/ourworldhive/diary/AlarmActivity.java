package com.ourworldhive.diary;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import org.json.JSONObject;
import java.text.DateFormat;
import java.util.Date;

/** Full-screen alarm: shows over the lock screen and keeps ringing until the user slides to stop (or snoozes).
 *  Copyright DUKEKRRISH. All rights reserved. */
public class AlarmActivity extends Activity {
    private String id;
    static java.lang.ref.WeakReference<AlarmActivity> live;
    String shownId() { return id; }
    @Override protected void onDestroy() { if (live != null && live.get() == this) live = null; super.onDestroy(); }

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFF1E1F5C); getWindow().setNavigationBarColor(0xFF15163F);
        live = new java.lang.ref.WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, () -> { });
        show(getIntent());
    }

    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); show(i); }

    private void show(Intent in) {
        id = in.getStringExtra("id");
        JSONObject o = id == null ? null : RemindReceiver.find(this, id);
        String text = o == null ? "Task" : o.optString("text", "Task"), who = o == null ? "" : o.optString("who", ""), ph = o == null ? "" : o.optString("ph", "");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL); root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(28), dp(56), dp(28), dp(40));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF2B2E8F, 0xFF1E1F5C, 0xFF15163F});
        root.setBackground(bg);

        TextView ic = tv("⏰", 64, Color.WHITE, false); root.addView(ic);
        TextView time = tv(DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()), 56, Color.WHITE, true);
        time.setPadding(0, dp(8), 0, 0); root.addView(time);
        TextView lbl = tv("MY DIARY ALARM", 13, 0xFFB9BCFF, true); lbl.setLetterSpacing(0.18f); root.addView(lbl);

        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(18), dp(20), dp(18));
        GradientDrawable cb = new GradientDrawable(); cb.setColor(0x26FFFFFF); cb.setCornerRadius(dp(22)); card.setBackground(cb);
        TextView t = tv(text, 22, Color.WHITE, true); t.setGravity(Gravity.START); card.addView(t);
        if (!who.isEmpty()) { TextView w = tv("👤 " + who, 16, 0xFFDADCFF, false); w.setGravity(Gravity.START); w.setPadding(0, dp(6), 0, 0); card.addView(w); }
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(-1, -2); clp.topMargin = dp(36);
        root.addView(card, clp);

        View sp = new View(this); root.addView(sp, new LinearLayout.LayoutParams(1, 0, 1f));

        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL);
        Button sn = btn("💤 Snooze 10 min"); sn.setOnClickListener(v -> act("snooze"));
        row.addView(sn, new LinearLayout.LayoutParams(0, dp(54), 1f));
        if (!ph.isEmpty()) {
            final String num = ph.replaceAll("[^0-9+]", "");
            Button call = btn("📞 Call " + (who.isEmpty() ? "" : who.split(" ")[0]));
            call.setOnClickListener(v -> { act("stop"); try { startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + num)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) { } });
            LinearLayout.LayoutParams l = new LinearLayout.LayoutParams(0, dp(54), 1f); l.leftMargin = dp(12);
            row.addView(call, l);
        }
        root.addView(row, new LinearLayout.LayoutParams(-1, -2));

        /* slide to stop */
        FrameLayout track = new FrameLayout(this);
        GradientDrawable tb = new GradientDrawable(); tb.setColor(0x33FFFFFF); tb.setCornerRadius(dp(36)); track.setBackground(tb);
        TextView hint = tv("Slide to stop  ➜", 17, 0xEEFFFFFF, true); hint.setLetterSpacing(0.05f);
        track.addView(hint, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        final SeekBar sb = new SeekBar(this);
        sb.setMax(100); sb.setProgress(0);
        GradientDrawable th = new GradientDrawable(); th.setShape(GradientDrawable.OVAL); th.setColor(Color.WHITE); th.setSize(dp(60), dp(60));
        sb.setThumb(th); sb.setThumbOffset(dp(4));
        sb.setProgressDrawable(new GradientDrawable() {{ setColor(Color.TRANSPARENT); }});
        sb.setPadding(dp(34), 0, dp(34), 0); sb.setSplitTrack(false);
        sb.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int p, boolean u) { hint.setAlpha(1f - p / 120f); if (u && p >= 92) { s.setEnabled(false); act("stop"); } }
            public void onStartTrackingTouch(SeekBar s) { }
            public void onStopTrackingTouch(SeekBar s) { if (s.getProgress() < 92) { s.setProgress(0); hint.setAlpha(1f); } }
        });
        track.addView(sb, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(-1, dp(72)); tlp.topMargin = dp(18);
        root.addView(track, tlp);

        setContentView(root);
    }

    private TextView tv(String s, float sz, int c, boolean bold) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(sz); t.setTextColor(c); t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD); return t;
    }
    private Button btn(String s) {
        Button b = new Button(this); b.setText(s); b.setAllCaps(false); b.setTextColor(Color.WHITE); b.setTextSize(15);
        GradientDrawable g = new GradientDrawable(); g.setColor(0x33FFFFFF); g.setCornerRadius(dp(27)); b.setBackground(g); return b;
    }

    /** stop or snooze: the receiver silences the notification and saves what happened for the diary page */
    private void act(String what) {
        if (id != null) sendBroadcast(new Intent(this, RemindReceiver.class).setAction(what + "." + id).putExtra("id", id).putExtra("do", what));
        finish();
    }

    /** Back does not stop the alarm by accident: the user must slide or snooze. */
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { }

    static Intent open(Context c, String id) {
        return new Intent(c, AlarmActivity.class).putExtra("id", id).setAction("alarm." + id)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }
}
