package com.ourworldhive.parcel;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.regex.Pattern;

/** Order and delivery messages (SMS and shopping-app notifications) wait here, on the phone, until the page reads them. */
public class Inbox {
    static SharedPreferences sp(Context c) { return c.getSharedPreferences("parcel_inbox", Context.MODE_PRIVATE); }
    static final Pattern WORDS = Pattern.compile("(?i)\\b(order|ordered|shipped|dispatched|out for delivery|delivered|delivery|deliver|parcel|package|shipment|courier|awb|tracking|arriving|arrive|return|refund|pickup|picked up)\\b");
    static final Pattern WHO = Pattern.compile("(?i)(amazon|flipkart|myntra|meesho|firstcry|ajio|nykaa|tata ?cliq|jiomart|snapdeal|croma|lenskart|ekart|delhivery|blue ?dart|xpressbees|shadowfax|ecom ?express|dtdc|india ?post|speed ?post|valmo|amzn|\\bOD\\d{10,}|\\d{3}-\\d{7}-\\d{7})");
    static final Pattern NOT = Pattern.compile("(?i)(otp (is|for) (login|sign)|log ?in otp|do not share.*(login|password)|cashback offer|sale is live|use code|coupon|% off|wishlist|price drop)");

    static boolean looksLikeOrder(String t) { return t != null && t.length() > 20 && WORDS.matcher(t).find() && WHO.matcher(t).find() && !NOT.matcher(t).find(); }

    static boolean auto(Context c) { return sp(c).getBoolean("auto", false); }
    static void setAuto(Context c, boolean on) { sp(c).edit().putBoolean("auto", on).apply(); }

    static synchronized void add(Context c, String text, long ts, String src, String from) {
        try {
            JSONArray q = new JSONArray(sp(c).getString("q", "[]"));
            for (int k = Math.max(0, q.length() - 40); k < q.length(); k++) { JSONObject o = q.optJSONObject(k); if (o != null && text.equals(o.optString("text"))) return; }
            q.put(new JSONObject().put("text", text).put("ts", ts).put("src", src).put("from", from == null ? "" : from));
            while (q.length() > 300) q.remove(0);
            sp(c).edit().putString("q", q.toString()).apply();
        } catch (Exception ignored) { }
    }
    static synchronized String take(Context c) { String s = sp(c).getString("q", "[]"); sp(c).edit().putString("q", "[]").apply(); return s; }
    static int count(Context c) { try { return new JSONArray(sp(c).getString("q", "[]")).length(); } catch (Exception e) { return 0; } }
}
