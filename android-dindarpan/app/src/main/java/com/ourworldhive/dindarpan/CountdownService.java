package com.ourworldhive.dindarpan;

import android.content.Context;
import android.content.Intent;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Rows of the countdown widget. Upcoming first (nearest on top), passed items after them, struck out. Copyright DUKEKRRISH. */
public class CountdownService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) { return new Rows(getApplicationContext()); }

    static final class Item { String n, e, d, c; long left; }

    static final class Rows implements RemoteViewsFactory {
        private final Context c;
        private final List<Item> items = new ArrayList<>();
        private boolean hi = false;
        private JSONObject d = new JSONObject();
        Rows(Context c) { this.c = c; }

        public void onCreate() { }
        public void onDestroy() { items.clear(); }

        public void onDataSetChanged() {
            items.clear();
            d = Store.data(c);
            hi = "hi".equals(d.optString("lang"));
            JSONArray cd = d.optJSONArray("cd");
            if (cd == null) return;
            for (int i = 0; i < cd.length(); i++) {
                JSONObject o = cd.optJSONObject(i);
                if (o == null) continue;
                Item it = new Item();
                it.n = o.optString("n", "");
                it.e = o.optString("e", "⭐");
                it.d = o.optString("d", "");
                it.c = o.optString("c", "");
                if (it.d.length() != 10) continue;
                it.left = Store.daysTo(it.d);
                items.add(it);
            }
            Collections.sort(items, (a, b) -> {
                boolean pa = a.left < 0, pb = b.left < 0;
                if (pa != pb) return pa ? 1 : -1;
                return pa ? Long.compare(b.left, a.left) : Long.compare(a.left, b.left);
            });
        }

        public int getCount() { return items.size(); }

        public RemoteViews getViewAt(int pos) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.cd_item);
            if (pos >= items.size()) return v;
            Item it = items.get(pos);
            boolean past = it.left < 0;
            int tx = Store.pc(d, "tx", "#3B1D14"), tx2 = Store.pc(d, "tx2", "#8A6A55");
            int gold = Store.col(it.c, Store.pc(d, "acc", "#D9480F"));
            String left;
            if (it.left == 0) left = hi ? "आज 🎉" : "Today 🎉";
            else if (it.left == 1) left = hi ? "कल" : "Tomorrow";
            else if (it.left > 1) left = hi ? it.left + " दिन में" : "in " + it.left + " days";
            else left = hi ? "बीत गया" : "Done";
            CharSequence name = it.n;
            if (past) {
                SpannableString s = new SpannableString(it.n);
                s.setSpan(new StrikethroughSpan(), 0, s.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                name = s;
                SpannableString l = new SpannableString(left);
                l.setSpan(new StrikethroughSpan(), 0, l.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                left = null;
                v.setTextViewText(R.id.left, l);
            }
            v.setTextViewText(R.id.e, it.e);
            v.setTextViewText(R.id.n, name);
            String dt;
            try { dt = Store.niceDate(LocalDate.parse(it.d)); } catch (Exception e) { dt = it.d; }
            if (past) dt = dt + (hi ? " · " + (-it.left) + " दिन पहले" : " · " + (-it.left) + (it.left == -1 ? " day ago" : " days ago"));
            v.setTextViewText(R.id.dt, dt);
            if (left != null) v.setTextViewText(R.id.left, left);
            v.setTextColor(R.id.n, past ? tx2 : gold);
            v.setTextColor(R.id.dt, tx2);
            v.setTextColor(R.id.left, past ? tx2 : gold);
            v.setOnClickFillInIntent(R.id.item, new Intent().putExtra("tab", "cd"));
            return v;
        }

        public RemoteViews getLoadingView() { return null; }
        public int getViewTypeCount() { return 1; }
        public long getItemId(int pos) { return pos; }
        public boolean hasStableIds() { return false; }
    }
}
