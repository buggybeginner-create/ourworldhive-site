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
    static boolean looksLikeOrder(String t) { return t != null && t.length() > 20 && WORDS.matcher(t).find() && WHO.matcher(t).find() && !NOT.matcher(t).find() && !(hasOtp(t) && !Pattern.compile("(?i)deliver|out for delivery|shipped|parcel|package|courier|agent").matcher(t).find()); }

    static boolean auto(Context c) { return sp(c).getBoolean("auto", false); }
    static void setAuto(Context c, boolean on) { sp(c).edit().putBoolean("auto", on).apply(); }

    static synchronized void add(Context c, String text, long ts, String src, String from) {
        try {
            JSONArray q = new JSONArray(sp(c).getString("q", "[]"));
            for (int k = Math.max(0, q.length() - 40); k < q.length(); k++) { JSONObject o = q.optJSONObject(k); if (o != null && text.equals(o.optString("text"))) return; }
            text = hideOtp(text);
            q.put(new JSONObject().put("text", text).put("ts", ts).put("src", src).put("from", from == null ? "" : from));
            while (q.length() > 300) q.remove(0);
            sp(c).edit().putString("q", q.toString()).apply();
        } catch (Exception ignored) { }
    }
    static synchronized String take(Context c) { String s = sp(c).getString("q", "[]"); sp(c).edit().putString("q", "[]").apply(); return s; }
    static int count(Context c) { try { return new JSONArray(sp(c).getString("q", "[]")).length(); } catch (Exception e) { return 0; } }
}
