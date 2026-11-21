package com.ourworldhive.dindarpan;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/** Month calendar widget: English date with the tithi under it, festivals marked, ‹ › to change month. Copyright DUKEKRRISH. */
public class MonthWidget extends AppWidgetProvider {
    static final String PREV = "com.ourworldhive.dindarpan.MPREV", NEXT = "com.ourworldhive.dindarpan.MNEXT", NOW = "com.ourworldhive.dindarpan.MNOW";

    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { draw(c, m, ids); Store.midnight(c); }

    @Override public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (PREV.equals(a) || NEXT.equals(a) || NOW.equals(a)) {
            int off = Store.sp(c).getInt("moff", 0);
            off = NOW.equals(a) ? 0 : off + (NEXT.equals(a) ? 1 : -1);
            Store.sp(c).edit().putInt("moff", off).putLong("mofft", System.currentTimeMillis()).apply();
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            draw(c, m, m.getAppWidgetIds(new ComponentName(c, MonthWidget.class)));
            return;
        }
        super.onReceive(c, i);
    }

    private static PendingIntent self(Context c, String action, int code) {
        return PendingIntent.getBroadcast(c, code, new Intent(c, MonthWidget.class).setAction(action), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        JSONObject d = Store.data(c);
        boolean dark = Store.dark(d);
        /* after 10 minutes on another month, go back to this month */
        int off = Store.sp(c).getInt("moff", 0);
        if (off != 0 && System.currentTimeMillis() - Store.sp(c).getLong("mofft", 0) > 600000) { off = 0; Store.sp(c).edit().putInt("moff", 0).apply(); }
        LocalDate today = Store.today();
        YearMonth ym = YearMonth.from(today).plusMonths(off);
        int tx = Store.pc(d, "tx", "#3B1D14"), tx2 = Store.pc(d, "tx2", "#8A6A55"), acc = Store.pc(d, "acc", "#D9480F");
        int gold = Store.pc(d, "sk", "#D9480F"), kr = Store.pc(d, "kk", "#6B4C9A"), red = Store.pc(d, "red", "#B42318");
        int head = Store.pc(d, dark ? "acc" : "hd", "#7A1F1F");
        JSONArray wdn = d.optJSONArray("wd");
        /* Hindu months seen in this month, for the second header line */
        Set<String> months = new LinkedHashSet<>();
        for (int i = 1; i <= ym.lengthOfMonth(); i += 7) { JSONArray x = Store.day(d, ym.atDay(i)); if (x != null) months.add(x.optString(4, "")); }
        JSONArray last = Store.day(d, ym.atEndOfMonth()); if (last != null) months.add(last.optString(4, ""));
        String sub = String.join(" – ", months);

        for (int id : ids) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_month);
            Store.bg(v, d);
            v.setTextColor(R.id.prev, acc);
            v.setTextColor(R.id.next, acc);
            v.setTextViewText(R.id.mTitle, ym.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + ym.getYear());
            v.setTextColor(R.id.mTitle, tx);
            v.setTextViewText(R.id.mSub, sub.isEmpty() ? "Open Din Darpan once to load tithis" : sub);
            v.setTextColor(R.id.mSub, head);
            v.setOnClickPendingIntent(R.id.prev, self(c, PREV, 11));
            v.setOnClickPendingIntent(R.id.next, self(c, NEXT, 12));
            v.setOnClickPendingIntent(R.id.mhead, off == 0 ? Store.open(c, "cal", null, 600 + id) : self(c, NOW, 13));
            v.removeAllViews(R.id.wdrow);
            for (int w = 0; w < 7; w++) {
                RemoteViews t = new RemoteViews(c.getPackageName(), R.layout.m_wd);
                t.setTextViewText(R.id.wd, wdn != null && wdn.length() == 7 ? wdn.optString(w) : new String[]{"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"}[w]);
                t.setTextColor(R.id.wd, w == 0 ? red : tx2);
                v.addView(R.id.wdrow, t);
            }
            v.removeAllViews(R.id.grid);
            int first = ym.atDay(1).getDayOfWeek().getValue() % 7; /* Sunday = 0 */
            LocalDate start = ym.atDay(1).minusDays(first);
            int rows = (first + ym.lengthOfMonth() + 6) / 7;
            for (int r = 0; r < rows; r++) {
                RemoteViews row = new RemoteViews(c.getPackageName(), R.layout.m_row);
                for (int col = 0; col < 7; col++) {
                    LocalDate x = start.plusDays(r * 7L + col);
                    boolean in = x.getMonth() == ym.getMonth();
                    RemoteViews cell = new RemoteViews(c.getPackageName(), R.layout.m_cell);
                    cell.setTextViewText(R.id.cd, String.valueOf(x.getDayOfMonth()));
                    JSONArray info = Store.day(d, x);
                    String small = "";
                    boolean kr2 = false;
                    if (info != null) {
                        String em = info.optString(2, "");
                        small = em.isEmpty() ? info.optString(0, "") : em + " " + info.optString(3, "");
                        kr2 = "K".equals(info.optString(1)) && em.isEmpty();
                    }
                    cell.setTextViewText(R.id.ct, small);
                    int dc = col == 0 ? red : tx;
                    cell.setTextColor(R.id.cd, in ? dc : (dc & 0x00FFFFFF) | 0x55000000);
                    boolean fest = info != null && !info.optString(2, "").isEmpty();
                    int sc = fest ? Store.col(info.optString(6, ""), red) : (kr2 ? kr : gold);
                    cell.setTextColor(R.id.ct, in ? sc : (sc & 0x00FFFFFF) | 0x55000000);
                    if (x.equals(today)) cell.setInt(R.id.cell, "setBackgroundColor", (acc & 0x00FFFFFF) | 0x40000000);
                    cell.setOnClickPendingIntent(R.id.cell, Store.open(c, "cal", x.toString(), 1000 + (x.getYear() % 10) * 400 + x.getDayOfYear()));
                    row.addView(R.id.mrow, cell);
                }
                v.addView(R.id.grid, row);
            }
            m.updateAppWidget(id, v);
        }
    }
}
