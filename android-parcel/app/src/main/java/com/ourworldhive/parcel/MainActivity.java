package com.ourworldhive.parcel;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.database.Cursor;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.lang.ref.WeakReference;

/**
 * Parcel Ledger for Android: opens https://ourworldhive.com/parcel-ledger.html and adds what a website cannot do:
 * delivery reminders and alarms that ring while the app is closed. Copyright DUKEKRRISH. All rights reserved.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://ourworldhive.com/parcel-ledger.html?src=app";
    private WebView web;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private String tokReq;
    private ValueCallback<Uri[]> pick;
    static WeakReference<MainActivity> LIVE = new WeakReference<>(null);
    /** a new order message arrived: let the page read it */
    static void poke() { final MainActivity a = LIVE.get(); if (a != null) a.ui.post(() -> { if (a.web != null) a.web.evaluateJavascript("window.plInbox&&plInbox()", null); }); }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        LIVE = new WeakReference<>(this);
        web = new WebView(this);
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setBackgroundColor(0xFF0B3D34);
        web.addJavascriptInterface(new Bridge(), "PLNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return outside(r.getUrl()); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) v.loadUrl("file:///android_asset/offline.html");
            }
        });
        /* photo picker for the product photo, and normal page dialogs */
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pick != null) pick.onReceiveValue(null);
                pick = cb;
                try { startActivityForResult(Intent.createChooser(new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*"), "Product photo"), 7); }
                catch (Exception e) { pick = null; return false; }
                return true;
            }
        });
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 3);
        if (b != null) web.restoreState(b); else web.loadUrl(HOME);
        RemindReceiver.stopRinging(this);
    }

    /** Only ourworldhive.com pages stay inside the app. Store tracking pages, mail and the rest open outside. */
    private boolean outside(Uri u) {
        if (u == null) return false;
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase(), host = u.getHost() == null ? "" : u.getHost().toLowerCase();
        if ((sc.equals("https") || sc.equals("http")) && (host.equals("ourworldhive.com") || host.endsWith(".ourworldhive.com"))) return false;
        if (sc.equals("about") || sc.equals("blob") || sc.equals("data") || sc.equals("file")) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { Toast.makeText(this, "No app on this phone can open that link.", Toast.LENGTH_SHORT).show(); }
        return true;
    }

    @Override protected void onResume() { super.onResume(); RemindReceiver.stopRinging(this); if (web != null) web.evaluateJavascript("window.plResume&&plResume()", null); }
    @Override public void onRequestPermissionsResult(int req, String[] p, int[] r) { super.onRequestPermissionsResult(req, p, r); if (web != null) web.evaluateJavascript("try{render()}catch(e){}", null); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    private boolean has(String perm) { return checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED; }
    /** the phone build (APK) can read SMS; the Play Store build cannot */
    private boolean smsBuild() {
        try { String[] r = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_PERMISSIONS).requestedPermissions; if (r != null) for (String x : r) if (Manifest.permission.READ_SMS.equals(x)) return true; } catch (Exception ignored) { }
        return false;
    }
    private boolean notifOn() {
        try { String s = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners"); return s != null && s.contains(new ComponentName(this, NotifListener.class).flattenToString()); }
        catch (Exception e) { return false; }
    }
    private void scan(int days) {
        if (!smsBuild()) { Toast.makeText(this, "This version cannot read SMS. Use notification access instead.", Toast.LENGTH_LONG).show(); return; }
        if (!has(Manifest.permission.READ_SMS)) { requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, 2); Toast.makeText(this, "Allow SMS, then press Scan again.", Toast.LENGTH_LONG).show(); return; }
        final long since = System.currentTimeMillis() - Math.max(1, Math.min(days, 400)) * 86400000L;
        new Thread(() -> {
            final JSONArray all = new JSONArray();
            Cursor c = null;
            try {
                c = getContentResolver().query(Uri.parse("content://sms/inbox"), new String[]{"body", "date", "address"}, "date > ?", new String[]{String.valueOf(since)}, "date ASC");
                while (c != null && c.moveToNext() && all.length() < 2000) {
                    String body = c.getString(0), from = "";
                    try { from = c.getString(2); } catch (Exception ignored) { }
                    if (!Inbox.looksLikeOrder(body + " " + from)) continue;
                    all.put(new JSONObject().put("text", body.length() > 1400 ? body.substring(0, 1400) : body).put("ts", c.getLong(1)).put("src", "sms").put("from", from == null ? "" : from));
                }
            } catch (Exception ignored) { } finally { if (c != null) c.close(); }
            ui.post(() -> {
                if (web == null) return;
                if (all.length() == 0) { web.evaluateJavascript("window.plReceive&&plReceive('[]',1)", null); return; }
                try { for (int i = 0; i < all.length(); i += 150) { JSONArray part = new JSONArray(); for (int k = i; k < Math.min(all.length(), i + 150); k++) part.put(all.get(k)); web.evaluateJavascript("window.plReceive&&plReceive(" + JSONObject.quote(part.toString()) + "," + (i + 150 >= all.length() ? 1 : 0) + ")", null); } } catch (Exception ignored) { }
            });
        }).start();
    }

    boolean canExact() {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }
    boolean canFullScreen() {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return nm == null || nm.canUseFullScreenIntent();
    }
    private void openSetting(String action) {
        try { startActivity(new Intent(action, Uri.parse("package:" + getPackageName()))); }
        catch (Exception e) { try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) { } }
    }

    /* ---- Google sign-in through the phone's own Google account (Google does not allow its sign-in page inside apps) ---- */
    private void askToken(String req) {
        tokReq = req;
        try { startActivityForResult(AccountManager.newChooseAccountIntent(null, null, new String[]{"com.google"}, null, null, null, null), 6); }
        catch (Exception e) { tokenDone(null, "This phone has no Google account."); }
    }
    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 7) { if (pick != null) { pick.onReceiveValue(res == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null); pick = null; } return; }
        if (req != 6) return;
        String name = res == RESULT_OK && data != null ? data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME) : null;
        if (name == null) { tokenDone(null, "No Google account was chosen."); return; }
        try {
            AccountManager.get(this).getAuthToken(new Account(name, "com.google"), "oauth2:openid email profile", null, this, new AccountManagerCallback<Bundle>() {
                public void run(AccountManagerFuture<Bundle> f) {
                    try {
                        String t = f.getResult().getString(AccountManager.KEY_AUTHTOKEN);
                        if (t == null || t.length() == 0) throw new Exception("Google gave no permission.");
                        tokenDone(t, null);
                    } catch (Exception e) { tokenDone(null, "Google sign-in did not work (" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()) + ")."); }
                }
            }, ui);
        } catch (Exception e) { tokenDone(null, "Google sign-in is not available on this phone."); }
    }
    /** Gmail (read only) for one account on this phone: only the order mails are read, on the phone */
    private void gmailTok(String req, String email) {
        tokReq = req;
        try {
            AccountManager.get(this).getAuthToken(new Account(email, "com.google"), "oauth2:https://www.googleapis.com/auth/gmail.readonly", null, this, new AccountManagerCallback<Bundle>() {
                public void run(AccountManagerFuture<Bundle> f) {
                    try { String t = f.getResult().getString(AccountManager.KEY_AUTHTOKEN); if (t == null || t.length() == 0) throw new Exception("Google gave no permission."); tokenDone(t, null); }
                    catch (Exception e) { tokenDone(null, "Gmail could not be opened for " + email + ". Add this Gmail to the phone (Settings, Accounts) and try again."); }
                }
            }, ui);
        } catch (Exception e) { tokenDone(null, "Gmail is not available on this phone."); }
    }
    private void tokenDone(String token, String err) {
        final String req = tokReq; tokReq = null;
        if (web == null || req == null) return;
        web.evaluateJavascript("(function(){try{window.plToken&&window.plToken(" + JSONObject.quote(req) + "," + (token == null ? "null" : JSONObject.quote(token)) + "," + (err == null ? "null" : JSONObject.quote(err)) + ")}catch(e){}})()", null);
    }

    /** What the page can ask the phone to do. */
    private class Bridge {
        /** all reminders: [{id, at (ms), text, a (1 = alarm)}] */
        @JavascriptInterface public void setReminders(String json) { RemindReceiver.setAll(MainActivity.this, json); }
        @JavascriptInterface public String takeEvents() { return RemindReceiver.takeEvents(MainActivity.this); }
        @JavascriptInterface public boolean exactOk() { return canExact(); }
        @JavascriptInterface public void openExact() { if (Build.VERSION.SDK_INT >= 31) runOnUiThread(() -> openSetting(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)); }
        @JavascriptInterface public boolean fullScreenOk() { return canFullScreen(); }
        @JavascriptInterface public void openFullScreen() { if (Build.VERSION.SDK_INT >= 34) runOnUiThread(() -> openSetting(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)); }
        @JavascriptInterface public void testAlarm() {
            long at = System.currentTimeMillis() + 5000;
            RemindReceiver.setAll(MainActivity.this, mergeTest(at));
        }
        @JavascriptInterface public String readStatus() {
            try { return new JSONObject().put("smsBuild", smsBuild()).put("sms", has(Manifest.permission.READ_SMS)).put("auto", Inbox.auto(MainActivity.this) && has(Manifest.permission.RECEIVE_SMS)).put("notif", notifOn()).put("waiting", Inbox.count(MainActivity.this)).toString(); }
            catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public String takeInbox() { return Inbox.take(MainActivity.this); }
        @JavascriptInterface public void scanSms(final int days) { ui.post(() -> scan(days)); }
        @JavascriptInterface public void requestSms() { ui.post(() -> { if (smsBuild()) requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, 2); }); }
        @JavascriptInterface public void setAuto(final boolean on) { Inbox.setAuto(MainActivity.this, on); if (on && smsBuild() && !has(Manifest.permission.RECEIVE_SMS)) ui.post(() -> requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, 2)); }
        @JavascriptInterface public void openNotifAccess() { ui.post(() -> { try { startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); } catch (Exception e) { Toast.makeText(MainActivity.this, "Open Settings, Notification access, and allow Parcel Ledger.", Toast.LENGTH_LONG).show(); } }); }
        @JavascriptInterface public void gmailToken(final String req, final String email) { ui.post(() -> gmailTok(req, email)); }
        @JavascriptInterface public void googleToken(final String req) { ui.post(() -> askToken(req)); }
        @JavascriptInterface public String version() { try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; } }
    }
    private String mergeTest(long at) {
        try {
            org.json.JSONArray l = new org.json.JSONArray(RemindReceiver.sp(this).getString("rem", "[]")), n = new org.json.JSONArray();
            for (int k = 0; k < l.length(); k++) { JSONObject o = l.optJSONObject(k); if (o != null && !"test".equals(o.optString("id"))) n.put(o); }
            n.put(new JSONObject().put("id", "test").put("at", at).put("text", "Test alarm: this is how a delivery alarm looks and sounds.").put("a", 1));
            return n.toString();
        } catch (Exception e) { return "[]"; }
    }
}
