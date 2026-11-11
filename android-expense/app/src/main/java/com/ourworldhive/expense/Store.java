package com.ourworldhive.expense;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.regex.Pattern;

/** Small on-phone store: messages waiting to be handed to the page, and the app's own switches. Nothing is uploaded from here. */
final class Store {
    private static final String P = "owh_expense";
    private static final Pattern MONEY = Pattern.compile(
        "debited|credited|\\bdebit\\b|\\bcredit\\b|spent|withdrawn|\\bupi\\b|\\bneft\\b|\\bimps\\b|txn|transaction|payment|paid|received|due date|amount due|premium|\\bemi\\b|a/c|\\bacct\\b|\\binr\\b|rs\\.?\\s?\\d|₹",
        Pattern.CASE_INSENSITIVE);

    static SharedPreferences sp(Context c) { return c.getApplicationContext().getSharedPreferences(P, Context.MODE_PRIVATE); }

    static boolean looksLikeMoney(String t) { return t != null && t.length() >= 15 && MONEY.matcher(t).find(); }

    static synchronized void enqueue(Context c, String text, long ts, String src) {
        try {
            JSONArray a = new JSONArray(sp(c).getString("queue", "[]"));
            JSONObject o = new JSONObject();
            o.put("text", text.length() > 1400 ? text.substring(0, 1400) : text);
            o.put("ts", ts);
            o.put("src", src);
            a.put(o);
            while (a.length() > 400) a.remove(0);
            sp(c).edit().putString("queue", a.toString()).apply();
        } catch (Exception ignored) { }
    }

    static synchronized String peek(Context c) { return sp(c).getString("queue", "[]"); }

    /** Drop the first n waiting messages, after the page has confirmed it saved them. */
    static synchronized void ack(Context c, int n) {
        try {
            JSONArray a = new JSONArray(sp(c).getString("queue", "[]")), b = new JSONArray();
            for (int i = Math.max(0, n); i < a.length(); i++) b.put(a.get(i));
            sp(c).edit().putString("queue", b.toString()).apply();
        } catch (Exception ignored) { }
    }

    static boolean smsAuto(Context c) { return sp(c).getBoolean("smsAuto", false); }
    static void setSmsAuto(Context c, boolean on) { sp(c).edit().putBoolean("smsAuto", on).apply(); }
}
