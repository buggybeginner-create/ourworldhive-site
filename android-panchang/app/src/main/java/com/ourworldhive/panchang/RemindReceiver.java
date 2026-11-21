package com.ourworldhive.panchang;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;

/** Festival reminders ("Tomorrow: Diwali"), shown even when the app is closed. One alarm waits for the next reminder. Copyright DUKEKRRISH. */
public class RemindReceiver extends BroadcastReceiver {
    static final String CH = "festivals";

    /** list from the page: [{id, at (ms), t (title), b (text)}] */
    static void setAll(Context c, String json) {
        try { new JSONArray(json); } catch (Exception e) { return; }
        Store.sp(c).edit().putString("rem", json).apply();
        schedule(c);
    }

    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = PendingIntent.getBroadcast(c, 51, new Intent(c, RemindReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        long next = Long.MAX_VALUE, now = System.currentTimeMillis();
        Set<String> done = Store.sp(c).getStringSet("fired", new HashSet<String>());
        try {
            JSONArray a = new JSONArray(Store.sp(c).getString("rem", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                long at = o.optLong("at");
                if (at > now - 60000 && at < next && !done.contains(o.optString("id"))) next = at;
            }
        } catch (Exception ignored) { }
        if (next != Long.MAX_VALUE) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, Math.max(next, now + 5000), pi);
    }

    @Override public void onReceive(Context c, Intent intent) {
        long now = System.currentTimeMillis();
        Set<String> done = new HashSet<>(Store.sp(c).getStringSet("fired", new HashSet<String>()));
        Set<String> keep = new HashSet<>();
        try {
            JSONArray a = new JSONArray(Store.sp(c).getString("rem", "[]"));
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(new NotificationChannel(CH, "Festival reminders", NotificationManager.IMPORTANCE_DEFAULT));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                String id = o.optString("id");
                long at = o.optLong("at");
                if (done.contains(id)) { if (at > now - 3 * 86400000L) keep.add(id); continue; }
                if (at <= now + 60000 && at > now - 6 * 3600000L) {
                    if (nm != null) {
                        Notification n = new Notification.Builder(c, CH).setSmallIcon(R.drawable.ic_mono)
                            .setContentTitle(o.optString("t", "Panchang")).setContentText(o.optString("b", ""))
                            .setAutoCancel(true).setContentIntent(Store.open(c, "home", null, 700 + (id.hashCode() & 0xFFF))).build();
                        nm.notify(id.hashCode(), n);
                    }
                    keep.add(id);
                }
            }
        } catch (Exception ignored) { }
        Store.sp(c).edit().putStringSet("fired", keep).apply();
        schedule(c);
    }
}
