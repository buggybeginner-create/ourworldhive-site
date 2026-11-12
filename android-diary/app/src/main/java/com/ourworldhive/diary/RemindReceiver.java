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
import org.json.JSONArray;
import org.json.JSONObject;

/** Task reminders set in the diary ring on the phone at their time, even when the app is closed. */
public class RemindReceiver extends BroadcastReceiver {
    static final String CH = "reminders";

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("diary", Context.MODE_PRIVATE); }

    private static PendingIntent pi(Context c, String id, String text, boolean create) {
        Intent i = new Intent(c, RemindReceiver.class).setAction("rem." + id).putExtra("id", id).putExtra("text", text == null ? "" : text);
        int fl = PendingIntent.FLAG_IMMUTABLE | (create ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, fl);
    }

    /** Replace all reminders with this list: [{id, at, text}] */
    static void setAll(Context c, String json) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            JSONArray old = new JSONArray(sp(c).getString("rem", "[]"));
            for (int k = 0; k < old.length(); k++) {
                JSONObject o = old.optJSONObject(k); if (o == null) continue;
                PendingIntent p = pi(c, o.optString("id"), null, false);
                if (p != null) { am.cancel(p); p.cancel(); }
            }
            JSONArray list = new JSONArray(json == null ? "[]" : json);
            sp(c).edit().putString("rem", list.toString()).apply();
            long now = System.currentTimeMillis();
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            for (int k = 0; k < list.length(); k++) {
                JSONObject o = list.optJSONObject(k); if (o == null) continue;
                long at = o.optLong("at", 0); if (at <= now) continue;
                PendingIntent p = pi(c, o.optString("id"), o.optString("text"), true);
                if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            }
        } catch (Exception ignored) { }
    }

    static void restore(Context c) { setAll(c, sp(c).getString("rem", "[]")); }

    @Override public void onReceive(Context c, Intent i) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Task reminders", NotificationManager.IMPORTANCE_HIGH));
            String text = i.getStringExtra("text"), id = i.getStringExtra("id");
            PendingIntent open = PendingIntent.getActivity(c, 9, new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            b.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle("🔔 My Diary reminder")
             .setContentText(text == null || text.isEmpty() ? "Task" : text).setStyle(new Notification.BigTextStyle().bigText(text))
             .setContentIntent(open).setAutoCancel(true).setColor(0xFF4B4FD8);
            if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL);
            nm.notify(id == null ? 1 : id.hashCode(), b.build());
        } catch (Exception ignored) { }
    }
}
