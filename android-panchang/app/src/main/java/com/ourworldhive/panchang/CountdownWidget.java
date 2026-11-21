package com.ourworldhive.panchang;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;

/** 4x6 home-screen widget: "Diwali in 9 days". Past dates are struck out until deleted in the app. Copyright DUKEKRRISH. */
public class CountdownWidget extends AppWidgetProvider {

    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        draw(c, m, ids);
        m.notifyAppWidgetViewDataChanged(ids, R.id.list);
        Store.midnight(c);
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        JSONObject d = Store.data(c);
        boolean dark = Store.dark(d);
        LocalDate t = Store.today();
        JSONArray day = Store.day(d, t);
        boolean hi = "hi".equals(d.optString("lang"));
        for (int id : ids) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_countdown);
            Store.bg(v, d);
            int tx = Store.pc(d, "tx", "#3B1D14"), tx2 = Store.pc(d, "tx2", "#8A6A55");
            int gold = Store.pc(d, dark ? "acc" : "hd", "#7A1F1F");
            v.setTextColor(R.id.title, tx2);
            v.setTextColor(R.id.empty, tx2);
            v.setTextColor(R.id.add, Store.pc(d, "acc", "#D9480F"));
            v.setTextColor(R.id.hDate, gold);
            v.setTextColor(R.id.hTithi, tx);
            v.setTextViewText(R.id.hDate, Store.niceDate(t));
            if (day != null) {
                String fest = day.optString(3, "");
                v.setTextViewText(R.id.hTithi, day.optString(5, "") + " · " + day.optString(4, "") + (fest.isEmpty() ? "" : "\n" + day.optString(2, "") + " " + fest));
            } else {
                v.setTextViewText(R.id.hTithi, "Open Panchang once to load the calendar.");
            }
            v.setTextViewText(R.id.title, hi ? "उलटी गिनती" : "COUNTDOWN");
            v.setTextViewText(R.id.empty, hi ? "+ दबाकर त्योहार चुनें" : "Tap + to choose festivals and events to count down.");
            Intent svc = new Intent(c, CountdownService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
            v.setRemoteAdapter(R.id.list, svc);
            v.setEmptyView(R.id.list, R.id.empty);
            v.setPendingIntentTemplate(R.id.list, Store.open(c, "cd", null, 200 + id, true));
            v.setOnClickPendingIntent(R.id.add, Store.open(c, "cd", null, 300 + id));
            v.setOnClickPendingIntent(R.id.head, Store.open(c, "home", null, 400 + id));
            v.setOnClickPendingIntent(R.id.empty, Store.open(c, "cd", null, 500 + id));
            m.updateAppWidget(id, v);
        }
    }
}
