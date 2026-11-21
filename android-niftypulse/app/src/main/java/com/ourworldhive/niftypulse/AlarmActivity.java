package com.ourworldhive.niftypulse;

import android.app.Activity;
import android.app.NotificationManager;
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
import java.text.DateFormat;
import java.util.Date;

/** Full-screen price alarm: shows over the lock screen and keeps ringing until you slide to stop.
 *  Same style as the My Diary alarm. Copyright DUKEKRRISH. All rights reserved. */
public class AlarmActivity extends Activity {
    static java.lang.ref.WeakReference<AlarmActivity> live;
    private int nid;

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFF070B16); getWindow().setNavigationBarColor(0xFF070B16);
        live = new java.lang.ref.WeakReference<>(this);
        show(getIntent());
    }
    @Override protected void onDestroy() { if (live != null && live.get() == this) live = null; super.onDestroy(); }
    @Override protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); show(i); }

    private void show(Intent in) {
        nid = in.getIntExtra("nid", 0);
        String title = in.getStringExtra("title"), msg = in.getStringExtra("msg");
        boolean up = title != null && (title.contains("▲") || title.contains("BUY")), dn = title != null && (title.contains("▼") || title.contains("SELL"));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL); root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(26), dp(50), dp(26), dp(36));
        root.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            up ? new int[]{0xFF0B5A3C, 0xFF07301F, 0xFF070B16} : dn ? new int[]{0xFF6A1622, 0xFF3A0D14, 0xFF070B16} : new int[]{0xFF4A3608, 0xFF2A1E06, 0xFF070B16}));
        root.addView(tv("📈", 58, Color.WHITE, false));
        TextView time = tv(DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()), 52, Color.WHITE, true);
        time.setPadding(0, dp(4), 0, 0); root.addView(time);
        TextView lbl = tv("NIFTY PULSE ALARM", 13, 0xFFFFC857, true); lbl.setLetterSpacing(0.18f); root.addView(lbl);

        LinearLayout card = new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(18), dp(20), dp(18));
        GradientDrawable cb = new GradientDrawable(); cb.setColor(0x26FFFFFF); cb.setCornerRadius(dp(22)); card.setBackground(cb);
        TextView t = tv(title == null ? "Price alert" : title, 21, Color.WHITE, true); t.setGravity(Gravity.START); card.addView(t);
        TextView m = tv(msg == null ? "" : msg, 17, 0xFFE6EBF7, false); m.setGravity(Gravity.START); m.setPadding(0, dp(8), 0, 0); m.setLineSpacing(0, 1.15f);
        ScrollView sv = new ScrollView(this); sv.addView(m); card.addView(sv, new LinearLayout.LayoutParams(-1, -2));
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(-1, 0, 1f); clp.topMargin = dp(30); clp.bottomMargin = dp(20);
        root.addView(card, clp);

        Button open = new Button(this); open.setText("📊  Open Nifty Pulse"); open.setAllCaps(false); open.setTextColor(Color.WHITE); open.setTextSize(16);
        GradientDrawable ob = new GradientDrawable(); ob.setColor(0x33FFFFFF); ob.setCornerRadius(dp(27)); open.setBackground(ob);
        open.setOnClickListener(v -> { stop(); startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); });
        root.addView(open, new LinearLayout.LayoutParams(-1, dp(54)));

        FrameLayout track = new FrameLayout(this);
        GradientDrawable tb = new GradientDrawable(); tb.setColor(0x33FFFFFF); tb.setCornerRadius(dp(36)); track.setBackground(tb);
        TextView hint = tv("Slide to stop  ➜", 17, 0xEEFFFFFF, true);
        track.addView(hint, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        final SeekBar sb = new SeekBar(this); sb.setMax(100); sb.setProgress(0);
        GradientDrawable th = new GradientDrawable(); th.setShape(GradientDrawable.OVAL); th.setColor(Color.WHITE); th.setSize(dp(60), dp(60));
        sb.setThumb(th); sb.setThumbOffset(dp(4));
        GradientDrawable clear = new GradientDrawable(); clear.setColor(Color.TRANSPARENT); sb.setProgressDrawable(clear);
        sb.setPadding(dp(34), 0, dp(34), 0); sb.setSplitTrack(false);
        sb.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar s, int p, boolean u) { hint.setAlpha(1f - p / 120f); if (u && p >= 92) { s.setEnabled(false); stop(); } }
            public void onStartTrackingTouch(SeekBar s) { }
            public void onStopTrackingTouch(SeekBar s) { if (s.getProgress() < 92) { s.setProgress(0); hint.setAlpha(1f); } }
        });
        track.addView(sb, new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER));
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(-1, dp(72)); tlp.topMargin = dp(16);
        root.addView(track, tlp);
        setContentView(root);
    }

    private TextView tv(String s, float sz, int c, boolean bold) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(sz); t.setTextColor(c); t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD); return t;
    }

    private void stop() { Pulse.stopAlarms(this); finish(); }

    /** Back does not stop the alarm by accident: slide to stop. */
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { }

    static Intent open(Context c, int nid, String title, String msg) {
        return new Intent(c, AlarmActivity.class).putExtra("nid", nid).putExtra("title", title).putExtra("msg", msg).setAction("alarm." + nid)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    }
}
