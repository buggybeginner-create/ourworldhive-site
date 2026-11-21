package com.ourworldhive.dindarpan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

/** Data the web page sends for the widgets (calendar days, countdown list), plus the daily refresh. Copyright DUKEKRRISH. */
public final class Store {
    static final String TICK = "com.ourworldhive.dindarpan.TICK";
    private Store() { }

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("dindarpan", Context.MODE_PRIVATE); }

    static JSONObject data(Context c) {
        try { return new JSONObject(sp(c).getString("w", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    static void save(Context c, String json) {
        try { new JSONObject(json); } catch (Exception e) { return; }
        sp(c).edit().putString("w", json).apply();
        refreshAll(c);
    }

    static LocalDate today() { return LocalDate.now(ZoneId.systemDefault()); }

    /** [short tithi, paksha S/K, emoji, festival, month, tithi long] for a date, or null */
    static JSONArray day(JSONObject d, LocalDate x) {
        try { JSONObject days = d.optJSONObject("days"); return days == null ? null : days.optJSONArray(x.toString()); } catch (Exception e) { return null; }
    }

    static boolean dark(JSONObject d) { return d.optInt("dark", 0) == 1; }

    /** colour from the theme the user chose in the app (bg, tx, tx2, acc, hd, sk, kk, red) */
    static int pc(JSONObject d, String key, String def) {
        try { JSONObject p = d.optJSONObject("pal"); String v = p == null ? null : p.optString(key, null); return android.graphics.Color.parseColor(v == null || v.isEmpty() ? def : v); }
        catch (Exception e) { return android.graphics.Color.parseColor(def); }
    }
    static int col(String hex, int def) { try { return hex == null || hex.isEmpty() ? def : android.graphics.Color.parseColor(hex); } catch (Exception e) { return def; } }

    /** paint the rounded widget background in the theme colour */
    static void bg(android.widget.RemoteViews v, JSONObject d) {
        v.setInt(R.id.bgimg, "setColorFilter", pc(d, "bg", "#FFFAF2"));
        v.setInt(R.id.bgimg, "setImageAlpha", 245);
    }

    static String niceDate(LocalDate x) {
        return x.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + ", " + x.getDayOfMonth() + " "
            + x.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + x.getYear();
    }

    static long daysTo(String iso) {
        try { return ChronoUnit.DAYS.between(today(), LocalDate.parse(iso)); } catch (Exception e) { return 0; }
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] a = m.getAppWidgetIds(new ComponentName(c, CountdownWidget.class));
        if (a.length > 0) { CountdownWidget.draw(c, m, a); m.notifyAppWidgetViewDataChanged(a, R.id.list); }
        int[] b = m.getAppWidgetIds(new ComponentName(c, MonthWidget.class));
        if (b.length > 0) MonthWidget.draw(c, m, b);
        midnight(c);
    }

    /** wake the widgets just after midnight so "in 9 days" becomes "in 8 days" and the calendar moves to the new day */
    static void midnight(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            long at = today().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() + 60000;
            PendingIntent pi = PendingIntent.getBroadcast(c, 41, new Intent(c, BootReceiver.class).setAction(TICK),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            am.setAndAllowWhileIdle(AlarmManager.RTC, at, pi);
        } catch (Exception ignored) { }
    }

    static PendingIntent open(Context c, String tab, String day, int code) { return open(c, tab, day, code, false); }

    /** list items need a mutable template so each row can add its own details (Android 12+) */
    static PendingIntent open(Context c, String tab, String day, int code, boolean mutable) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra("tab", tab).setAction("open." + tab + "." + (day == null ? "" : day));
        if (day != null) i.putExtra("d", day);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | (mutable ? PendingIntent.FLAG_MUTABLE : PendingIntent.FLAG_IMMUTABLE));
    }
}
