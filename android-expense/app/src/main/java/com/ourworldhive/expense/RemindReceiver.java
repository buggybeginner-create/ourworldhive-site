package com.ourworldhive.expense;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Once a day, at the time chosen in the app, shows one notification listing the bills that are due soon. */
public class RemindReceiver extends BroadcastReceiver {
    static final String CH = "bills";

    static void schedule(Context c, String json) {
        try {
            Store.sp(c).edit().putString("remind", json == null ? "{}" : json).apply();
            JSONObject o = new JSONObject(json == null ? "{}" : json);
            String[] hm = o.optString("time", "09:00").split(":");
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(hm[0])); cal.set(Calendar.MINUTE, Integer.parseInt(hm[1])); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
            if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            PendingIntent pi = PendingIntent.getBroadcast(c, 7, new Intent(c, RemindReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (am != null) am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
        } catch (Exception ignored) { }
    }

    @Override public void onReceive(Context c, Intent i) {
        try {
            JSONObject o = new JSONObject(Store.sp(c).getString("remind", "{}"));
            int days = o.optInt("days", 3);
            JSONArray items = o.optJSONArray("items");
            if (items == null || items.length() == 0) return;
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Calendar t0 = Calendar.getInstance(); t0.set(Calendar.HOUR_OF_DAY, 0); t0.set(Calendar.MINUTE, 0); t0.set(Calendar.SECOND, 0); t0.set(Calendar.MILLISECOND, 0);
            StringBuilder sb = new StringBuilder(); int n = 0;
            for (int k = 0; k < items.length(); k++) {
                JSONObject d = items.optJSONObject(k); if (d == null) continue;
                Date due = f.parse(d.optString("due", "")); if (due == null) continue;
                long left = Math.round((due.getTime() - t0.getTimeInMillis()) / 86400000.0);
                if (left > days) continue;
                n++;
                if (n <= 6) {
                    double amt = d.optDouble("amount", 0);
                    sb.append(d.optString("title", "Bill")).append(amt > 0 ? "  ₹" + Math.round(amt) : "")
                      .append(left < 0 ? "  (overdue " + (-left) + "d)" : left == 0 ? "  (due today)" : "  (in " + left + "d)").append('\n');
                }
            }
            if (n == 0) return;
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CH, "Bill reminders", NotificationManager.IMPORTANCE_DEFAULT));
            PendingIntent open = PendingIntent.getActivity(c, 8, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
            b.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(n + (n == 1 ? " bill is due soon" : " bills are due soon"))
             .setContentText(sb.toString().trim().split("\n")[0]).setStyle(new Notification.BigTextStyle().bigText(sb.toString().trim()))
             .setContentIntent(open).setAutoCancel(true);
            nm.notify(71, b.build());
        } catch (Exception ignored) { }
    }
}
