package com.ourworldhive.pm;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Locale;

/**
 * PM Tracker daily alarm. The page sends the person's alarm time and a list of their open jobs
 * (only their own jobs, or their department / plant for a manager). Every day at that time the phone
 * rings with a full-screen list of overdue and due-today jobs, even when the app is closed.
 * Copyright DUKEKRRISH. All rights reserved.
 */
public class PmAlarm extends BroadcastReceiver {
    static final String CH = "pm_alarm1";
    static final int NID = 4242;

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("pm", Context.MODE_PRIVATE); }
    static JSONObject cfg(Context c) { try { return new JSONObject(sp(c).getString("cfg", "{}")); } catch (Exception e) { return new JSONObject(); } }

    private static PendingIntent pi(Context c, String what) {
        Intent i = new Intent(c, PmAlarm.class).setAction("pm." + what).putExtra("do", what);
        return PendingIntent.getBroadcast(c, what.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** The page calls this with {on, time:"HH:MM", plant, name, ts, A, tasks:[{tag,name,type,sec,who,d,e}]}. */
    static void save(Context c, String json) {
        try { JSONObject o = new JSONObject(json == null ? "{}" : json); sp(c).edit().putString("cfg", o.toString()).apply(); } catch (Exception ignored) { }
        schedule(c);
    }

    static boolean exactOk(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    /** Set the next daily alarm (today if the time is still ahead, otherwise tomorrow). A snooze, if any, comes first. */
    static void schedule(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            PendingIntent p = pi(c, "ring");
            am.cancel(p);
            JSONObject o = cfg(c);
            if (!o.optBoolean("on", false)) return;
            long at = nextAt(o.optString("time", "08:00"), System.currentTimeMillis());
            long snz = sp(c).getLong("snz", 0);
            if (snz > System.currentTimeMillis() && snz < at) at = snz;
            if (exactOk(c)) {
                PendingIntent show = PendingIntent.getActivity(c, 12, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), p);
            } else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
        } catch (Exception ignored) { }
    }

    static long nextAt(String hm, long now) {
        int h = 8, m = 0;
        try { String[] a = hm.split(":"); h = Integer.parseInt(a[0]); m = Integer.parseInt(a[1]); } catch (Exception ignored) { }
        Calendar k = Calendar.getInstance(); k.setTimeInMillis(now);
        k.set(Calendar.HOUR_OF_DAY, h); k.set(Calendar.MINUTE, m); k.set(Calendar.SECOND, 0); k.set(Calendar.MILLISECOND, 0);
        if (k.getTimeInMillis() <= now + 1000) k.add(Calendar.DAY_OF_MONTH, 1);
        return k.getTimeInMillis();
    }

    static String today() { Calendar k = Calendar.getInstance(); return String.format(Locale.US, "%04d-%02d-%02d", k.get(Calendar.YEAR), k.get(Calendar.MONTH) + 1, k.get(Calendar.DAY_OF_MONTH)); }
    static int days(String a, String b) {   /* a - b in days, both yyyy-mm-dd */
        try {
            Calendar x = Calendar.getInstance(), y = Calendar.getInstance();
            x.clear(); y.clear();
            String[] p = a.split("-"), q = b.split("-");
            x.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
            y.set(Integer.parseInt(q[0]), Integer.parseInt(q[1]) - 1, Integer.parseInt(q[2]));
            return (int) Math.round((x.getTimeInMillis() - y.getTimeInMillis()) / 86400000.0);
        } catch (Exception e) { return 0; }
    }

    /** Status of a job today: 2 = overdue, 1 = due today, 0 = due soon, -1 = not yet. d = due (or window start), e = window end. */
    static int state(JSONObject t, String td, int alertDays) {
        String d = t.optString("d", ""), e = t.optString("e", d);
        if (d.isEmpty()) return -1;
        if (e.compareTo(td) < 0) return 2;
        if (d.compareTo(td) <= 0) return 1;
        return days(d, td) <= alertDays ? 0 : -1;
    }
    static int[] counts(Context c) {
        JSONObject o = cfg(c); JSONArray L = o.optJSONArray("tasks"); int[] n = new int[3]; String td = today(); int A = o.optInt("A", 7);
        if (L != null) for (int i = 0; i < L.length(); i++) { JSONObject t = L.optJSONObject(i); if (t == null) continue; int s = state(t, td, A); if (s >= 0) n[s]++; }
        return n;
    }

    private static void channel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel al = new NotificationChannel(CH, "PM alarm", NotificationManager.IMPORTANCE_HIGH);
        al.setDescription("Daily full-screen list of overdue and due-today jobs");
        al.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        al.enableVibration(true); al.setVibrationPattern(new long[]{0, 600, 400, 600, 400, 600});
        al.setBypassDnd(true);
        nm.createNotificationChannel(al);
    }

    static void silence(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NID);
    }

    /** Ring now (also used by "Try Now" in the app). */
    static void ring(Context c, boolean always) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        int[] n = counts(c);
        if (!always && n[2] + n[1] == 0) return;   /* nothing overdue or due today: no alarm */
        channel(nm);
        JSONObject o = cfg(c);
        String title = "⏰ PM Alarm" + (o.optString("name").isEmpty() ? "" : " · " + o.optString("name"));
        String text = n[2] + " overdue · " + n[1] + " due today" + (n[0] > 0 ? " · " + n[0] + " due soon" : "");
        PendingIntent full = PendingIntent.getActivity(c, 21, PmAlarmActivity.open(c), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(title).setContentText(text)
         .setStyle(new Notification.BigTextStyle().bigText(text)).setColor(0xFF0F766E)
         .setCategory(Notification.CATEGORY_ALARM).setOngoing(true).setAutoCancel(false)
         .setFullScreenIntent(full, true).setContentIntent(full);
        b.addAction(new Notification.Action.Builder(null, "Stop", pi(c, "stop")).build());
        b.addAction(new Notification.Action.Builder(null, "Snooze 10 min", pi(c, "snooze")).build());
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_MAX).setVibrate(new long[]{0, 600, 400, 600}).setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioManager.STREAM_ALARM);
        Notification nt = b.build();
        nt.flags |= Notification.FLAG_INSISTENT;   /* keeps ringing until Stop, Snooze or the list is opened */
        nm.notify(NID, nt);
        try { c.startActivity(PmAlarmActivity.open(c)); } catch (Exception ignored) { }   /* works while PM Tracker is open; otherwise the full-screen intent opens it */
    }

    @Override public void onReceive(Context c, Intent i) {
        String what = i.getStringExtra("do");
        if ("stop".equals(what)) { silence(c); PmAlarmActivity.closeLive(); return; }
        if ("snooze".equals(what)) { silence(c); PmAlarmActivity.closeLive(); sp(c).edit().putLong("snz", System.currentTimeMillis() + 10 * 60000L).apply(); schedule(c); return; }
        if ("ring".equals(what)) {
            sp(c).edit().remove("snz").apply();
            try { ring(c, false); } catch (Exception ignored) { }
            schedule(c);   /* tomorrow */
            return;
        }
        /* phone restarted, time changed, or "Alarms & reminders" allowed: set it again */
        schedule(c);
    }
}
