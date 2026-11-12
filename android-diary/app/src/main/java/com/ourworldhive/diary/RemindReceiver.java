package com.ourworldhive.diary;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import org.json.JSONArray;
import org.json.JSONObject;

/** Task reminders set in the diary ring on the phone at their time, even when the app is closed. */
public class RemindReceiver extends BroadcastReceiver {
    static final String CH = "reminders";

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("diary", Context.MODE_PRIVATE); }

    static final String CH_ALARM = "alarms2";

    private static Intent intent(Context c, String id) { return new Intent(c, RemindReceiver.class).setAction("rem." + id).putExtra("id", id); }
    private static PendingIntent pi(Context c, String id, boolean create) {
        int fl = PendingIntent.FLAG_IMMUTABLE | (create ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE);
        return PendingIntent.getBroadcast(c, id.hashCode(), intent(c, id), fl);
    }
    static JSONObject find(Context c, String id) {
        try { JSONArray l = new JSONArray(sp(c).getString("rem", "[]")); for (int k = 0; k < l.length(); k++) { JSONObject o = l.optJSONObject(k); if (o != null && id.equals(o.optString("id"))) return o; } } catch (Exception ignored) { }
        return null;
    }

    /** Replace all reminders with this list: [{id, at, text, a (1 = alarm), who, ph}] */
    static void setAll(Context c, String json) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            JSONArray old = new JSONArray(sp(c).getString("rem", "[]"));
            for (int k = 0; k < old.length(); k++) {
                JSONObject o = old.optJSONObject(k); if (o == null) continue;
                PendingIntent p = pi(c, o.optString("id"), false);
                if (p != null) { am.cancel(p); p.cancel(); }
            }
            JSONArray list = new JSONArray(json == null ? "[]" : json);
            sp(c).edit().putString("rem", list.toString()).apply();
            long now = System.currentTimeMillis();
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            for (int k = 0; k < list.length(); k++) {
                JSONObject o = list.optJSONObject(k); if (o == null) continue;
                long at = o.optLong("at", 0); if (at <= now) continue;
                PendingIntent p = pi(c, o.optString("id"), true);
                if (exact && o.optInt("a", 0) == 1) {
                    PendingIntent show = PendingIntent.getActivity(c, 11, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), p);
                } else if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            }
        } catch (Exception ignored) { }
    }

    static void restore(Context c) { setAll(c, sp(c).getString("rem", "[]")); }

    /** Opening the app stops any alarm that is still ringing. */
    static void stopRinging(Context c) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            for (String id : sp(c).getStringSet("ring", new java.util.HashSet<String>())) if (nm != null) nm.cancel(id.hashCode());
            sp(c).edit().remove("ring").apply();
        } catch (Exception ignored) { }
    }

    private static void channels(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < 26) return;
        nm.createNotificationChannel(new NotificationChannel(CH, "Task reminders", NotificationManager.IMPORTANCE_HIGH));
        NotificationChannel al = new NotificationChannel(CH_ALARM, "Task alarms", NotificationManager.IMPORTANCE_HIGH);
        al.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        al.enableVibration(true); al.setVibrationPattern(new long[]{0, 600, 400, 600, 400, 600});
        al.setBypassDnd(true);
        nm.createNotificationChannel(al);
    }

    @Override public void onReceive(Context c, Intent i) {
        try {
            String id = i.getStringExtra("id"); if (id == null) return;
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            String act = i.getStringExtra("do");
            if ("stop".equals(act)) { nm.cancel(id.hashCode()); return; }
            JSONObject o = find(c, id); if (o == null) return;
            if ("snooze".equals(act)) {
                nm.cancel(id.hashCode());
                o.put("at", System.currentTimeMillis() + 10 * 60000L);
                JSONArray l = new JSONArray(sp(c).getString("rem", "[]")), n = new JSONArray();
                for (int k = 0; k < l.length(); k++) { JSONObject x = l.optJSONObject(k); n.put(x != null && id.equals(x.optString("id")) ? o : x); }
                setAll(c, n.toString());
                return;
            }
            channels(nm);
            boolean alarm = o.optInt("a", 0) == 1;
            String text = o.optString("text", "Task"), who = o.optString("who", ""), ph = o.optString("ph", "");
            PendingIntent open = PendingIntent.getActivity(c, 9, new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, alarm ? CH_ALARM : CH) : new Notification.Builder(c);
            b.setSmallIcon(alarm ? android.R.drawable.ic_lock_idle_alarm : android.R.drawable.ic_popup_reminder)
             .setContentTitle(alarm ? "⏰ My Diary alarm" : "🔔 My Diary reminder")
             .setContentText(text + (who.isEmpty() ? "" : "  ·  👤 " + who)).setStyle(new Notification.BigTextStyle().bigText(text + (who.isEmpty() ? "" : "\n👤 " + who)))
             .setContentIntent(open).setAutoCancel(true).setColor(0xFF4B4FD8)
             .setCategory(alarm ? Notification.CATEGORY_ALARM : Notification.CATEGORY_REMINDER);
            Intent st = intent(c, id).putExtra("do", "stop").setAction("stop." + id), sn = intent(c, id).putExtra("do", "snooze").setAction("snooze." + id);
            b.addAction(new Notification.Action.Builder(null, alarm ? "Stop" : "Dismiss", PendingIntent.getBroadcast(c, ("s" + id).hashCode(), st, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());
            b.addAction(new Notification.Action.Builder(null, "Snooze 10 min", PendingIntent.getBroadcast(c, ("z" + id).hashCode(), sn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());
            if (!ph.isEmpty()) {
                Intent call = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + ph.replaceAll("[^0-9+]", "")));
                b.addAction(new Notification.Action.Builder(null, "Call " + (who.isEmpty() ? "" : who.split(" ")[0]), PendingIntent.getActivity(c, ("c" + id).hashCode(), call, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());
            }
            if (alarm) { b.setOngoing(true).setAutoCancel(false); }
            if (Build.VERSION.SDK_INT < 26) {
                b.setPriority(Notification.PRIORITY_MAX).setVibrate(new long[]{0, 600, 400, 600});
                if (alarm) b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioManager.STREAM_ALARM); else b.setDefaults(Notification.DEFAULT_ALL);
            }
            Notification n = b.build();
            if (alarm) n.flags |= Notification.FLAG_INSISTENT;   /* the alarm sound keeps ringing until Stop or the notification is opened */
            if (alarm) { java.util.Set<String> r = new java.util.HashSet<>(sp(c).getStringSet("ring", new java.util.HashSet<String>())); r.add(id); sp(c).edit().putStringSet("ring", r).apply(); }
            nm.notify(id.hashCode(), n);
        } catch (Exception ignored) { }
    }
}
