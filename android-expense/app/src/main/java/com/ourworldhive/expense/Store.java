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

    /* No app reads OTPs. A message that gives an OTP / verification code is dropped; "never share your OTP" warnings in normal alerts do not count; any code left in a kept message is hidden. */
    static final java.util.regex.Pattern OTPW = java.util.regex.Pattern.compile("(?i)\\b(otp|one[\\s-]*time[\\s-]*pass(word|code)?|verification\\s*code|security\\s*code|login\\s*code|auth(entication)?\\s*code|passcode)\\b");
    static final java.util.regex.Pattern WARN = java.util.regex.Pattern.compile("(?i)(never|not|don.?t|do not|nobody|no one|anyone|ask(s|ed)?( you)?( for)?|share|sharing|disclose|calls?)[^.]{0,20}$");
    static final java.util.regex.Pattern CODE = java.util.regex.Pattern.compile("(?i)(\\b(otp|one[\\s-]*time[\\s-]*pass(word|code)?|verification\\s*code|security\\s*code|login\\s*code|passcode)\\b[^0-9]{0,30})\\d{4,8}\\b|\\b\\d{4,8}\\b(?=[^0-9]{0,25}\\b(otp|one[\\s-]*time[\\s-]*password|verification\\s*code)\\b)");
    static boolean hasOtp(String t) {
        if (t == null) return false;
        java.util.regex.Matcher m = OTPW.matcher(t);
        while (m.find()) { String before = t.substring(Math.max(0, m.start() - 30), m.start()); if (!WARN.matcher(before).find()) return true; }
        return false;
    }
    static String hideOtp(String t) {
        if (t == null) return null;
        java.util.regex.Matcher m = CODE.matcher(t); StringBuffer sb = new StringBuffer();
        while (m.find()) m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement((m.group(1) != null ? m.group(1) : "") + "****"));
        m.appendTail(sb); return sb.toString();
    }
    static boolean looksLikeMoney(String t) { return t != null && t.length() >= 15 && MONEY.matcher(t).find() && !hasOtp(t); }

    static synchronized void enqueue(Context c, String text, long ts, String src) { enqueue(c, text, ts, src, ""); }
    static synchronized void enqueue(Context c, String text, long ts, String src, String from) {
        try {
            JSONArray a = new JSONArray(sp(c).getString("queue", "[]"));
            JSONObject o = new JSONObject();
            text = hideOtp(text);
            o.put("text", text.length() > 1400 ? text.substring(0, 1400) : text);
            o.put("ts", ts);
            o.put("src", src);
            if (from != null && !from.isEmpty()) o.put("from", from);
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
