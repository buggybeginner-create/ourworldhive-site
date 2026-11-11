package com.ourworldhive.expense;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.app.Dialog;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.lang.ref.WeakReference;
import java.util.HashSet;
import java.util.Set;

/**
 * Expense Tracker for Android: shows https://ourworldhive.com/expense-tracker.html and gives the page what a website cannot do:
 * reading bank SMS, payment notifications and bill reminders while the app is closed. Messages go only to the page on this phone.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://ourworldhive.com/expense-tracker.html";
    private static WeakReference<MainActivity> LIVE = new WeakReference<>(null);
    private final Handler ui = new Handler(Looper.getMainLooper());
    private WebView web;
    private Dialog popup;
    private ValueCallback<Uri[]> filePick;
    private boolean pageReady;
    private String tokReq, tokScope;

    /** Called by the SMS receiver and the notification listener: hand new messages to the page if it is open. */
    static void poke() { final MainActivity a = LIVE.get(); if (a != null) a.ui.post(new Runnable() { public void run() { a.deliver(); } }); }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        LIVE = new WeakReference<>(this);
        web = new WebView(this);
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setup(web);
        web.addJavascriptInterface(new Bridge(), "OwhNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return outside(r.getUrl()); }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap f) { pageReady = false; }
            @Override public void onPageFinished(WebView v, String url) { pageReady = url != null && url.contains("expense-tracker"); ui.postDelayed(new Runnable() { public void run() { deliver(); } }, 1500); }
        });
        web.setWebChromeClient(new Chrome());
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 3);
        if (b != null) web.restoreState(b); else web.loadUrl(HOME);
    }

    private void setup(WebView w) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);
    }

    /** Links that are not web pages (UPI, phone, mail, market) open in their own app. */
    private boolean outside(Uri u) {
        if (u == null) return false;
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        if (sc.equals("http") || sc.equals("https") || sc.equals("about") || sc.equals("blob") || sc.equals("data")) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { Toast.makeText(this, "No app on this phone can open that link.", Toast.LENGTH_SHORT).show(); }
        return true;
    }

    private class Chrome extends WebChromeClient {
        /* sign-in windows (Google account, Gmail permission) open on top of the app and close by themselves */
        @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean userGesture, Message resultMsg) {
            try {
                closePopup();
                final WebView child = new WebView(MainActivity.this);
                setup(child);
                child.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return outside(r.getUrl()); }
                });
                child.setWebChromeClient(new WebChromeClient() { @Override public void onCloseWindow(WebView w) { closePopup(); } });
                popup = new Dialog(MainActivity.this, android.R.style.Theme_Material_Light_NoActionBar);
                popup.setContentView(child, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                popup.setOnDismissListener(new android.content.DialogInterface.OnDismissListener() {
                    public void onDismiss(android.content.DialogInterface d) { try { child.destroy(); } catch (Exception ignored) { } if (popup == d) popup = null; }
                });
                popup.show();
                ((WebView.WebViewTransport) resultMsg.obj).setWebView(child);
                resultMsg.sendToTarget();
                return true;
            } catch (Exception e) { return false; }
        }
        @Override public void onCloseWindow(WebView w) { closePopup(); }
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (filePick != null) filePick.onReceiveValue(null);
            filePick = cb;
            try { Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*"); startActivityForResult(Intent.createChooser(i, "Choose a statement file"), 5); }
            catch (Exception e) { filePick = null; cb.onReceiveValue(null); }
            return true;
        }
    }

    private void closePopup() { try { if (popup != null) { Dialog d = popup; popup = null; d.dismiss(); } } catch (Exception ignored) { } }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 6) {
            String name = res == RESULT_OK && data != null ? data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME) : null;
            if (name == null) tokenDone(null, null, "No Google account was chosen."); else { rememberAcct(name); fetchToken(name, false); }
            return;
        }
        if (req == 5 && filePick != null) {
            filePick.onReceiveValue(res == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            filePick = null;
        }
    }

    /** Give the waiting messages to the page. They leave the phone's waiting list only after the page says it has saved them. */
    private void deliver() {
        if (web == null || !pageReady) return;
        try {
            String q = Store.peek(this);
            int n = new JSONArray(q).length();
            if (n == 0) return;
            String js = "(function(){try{if(!window.owhNativeReceive)return;var n=" + n + ";Promise.resolve(window.owhNativeReceive(" + JSONObject.quote(q) + ")).then(function(r){if(r&&!r.queued)OwhNative.ack(n)})}catch(e){}})()";
            web.evaluateJavascript(js, null);
        } catch (Exception ignored) { }
    }

    private void sendNow(JSONArray items) {
        if (web == null || items.length() == 0) return;
        web.evaluateJavascript("(function(){try{window.owhNativeReceive&&window.owhNativeReceive(" + JSONObject.quote(items.toString()) + ")}catch(e){}})()", null);
    }

    private boolean has(String perm) { return checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED; }

    private boolean notifOn() {
        try {
            String s = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
            return s != null && s.contains(new ComponentName(this, NotifListener.class).flattenToString());
        } catch (Exception e) { return false; }
    }

    private void refreshPage() { if (web != null) web.evaluateJavascript("try{render()}catch(e){}", null); }

    private void scan(int days) {
        if (!has(Manifest.permission.READ_SMS)) { requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, 2); Toast.makeText(this, "Allow SMS, then press Scan again.", Toast.LENGTH_LONG).show(); return; }
        final long since = System.currentTimeMillis() - Math.max(1, Math.min(days, 400)) * 86400000L;
        new Thread(new Runnable() { public void run() {
            final JSONArray all = new JSONArray();
            Cursor c = null;
            try {
                c = getContentResolver().query(Uri.parse("content://sms/inbox"), new String[]{"body", "date"}, "date > ?", new String[]{String.valueOf(since)}, "date ASC");
                while (c != null && c.moveToNext() && all.length() < 3000) {
                    String body = c.getString(0);
                    if (!Store.looksLikeMoney(body)) continue;
                    JSONObject o = new JSONObject();
                    o.put("text", body.length() > 1400 ? body.substring(0, 1400) : body); o.put("ts", c.getLong(1)); o.put("src", "sms");
                    all.put(o);
                }
            } catch (Exception ignored) { } finally { if (c != null) c.close(); }
            ui.post(new Runnable() { public void run() {
                if (all.length() == 0) { Toast.makeText(MainActivity.this, "No bank or payment SMS found in that period.", Toast.LENGTH_LONG).show(); return; }
                try { for (int i = 0; i < all.length(); i += 150) { JSONArray part = new JSONArray(); for (int k = i; k < Math.min(all.length(), i + 150); k++) part.put(all.get(k)); sendNow(part); } } catch (Exception ignored) { }
            } });
        } }).start();
    }

    /* ---- Google sign-in and Gmail permission through the phone's own Google account (no web sign-in window inside the app) ---- */
    private Set<String> knownAccts() { return new HashSet<>(Store.sp(this).getStringSet("accts", new HashSet<String>())); }
    private void rememberAcct(String email) { Set<String> s = knownAccts(); s.add(email.toLowerCase()); Store.sp(this).edit().putStringSet("accts", s).apply(); }

    private void askToken(String req, String kind, String email) {
        tokReq = req;
        tokScope = "gmail".equals(kind) ? "oauth2:https://www.googleapis.com/auth/gmail.readonly" : "oauth2:openid email profile";
        if (email != null && email.length() > 3 && knownAccts().contains(email.toLowerCase())) { fetchToken(email, true); return; }
        chooseAcct();
    }

    private void chooseAcct() {
        try { startActivityForResult(AccountManager.newChooseAccountIntent(null, null, new String[]{"com.google"}, false, null, null, null, null), 6); }
        catch (Exception e) { tokenDone(null, null, "This phone has no Google account chooser."); }
    }

    private void fetchToken(final String email, final boolean chooseOnFail) {
        try {
            AccountManager.get(this).getAuthToken(new Account(email, "com.google"), tokScope, null, this, new AccountManagerCallback<Bundle>() {
                public void run(AccountManagerFuture<Bundle> f) {
                    try {
                        String t = f.getResult().getString(AccountManager.KEY_AUTHTOKEN);
                        if (t == null || t.length() == 0) throw new Exception("Google gave no permission.");
                        tokenDone(t, email, null);
                    } catch (Exception e) {
                        if (chooseOnFail) { chooseAcct(); return; }
                        String m = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
                        tokenDone(null, email, "Google sign-in did not work (" + m + "). Check the one-time Google Cloud setup shown in More, Sources.");
                    }
                }
            }, ui);
        } catch (Exception e) { tokenDone(null, email, "Google sign-in is not available on this phone."); }
    }

    private void tokenDone(String token, String email, String err) {
        final String req = tokReq; tokReq = null;
        if (web == null || req == null) return;
        web.evaluateJavascript("(function(){try{window.owhToken&&window.owhToken(" + JSONObject.quote(req) + "," + (token == null ? "null" : JSONObject.quote(token)) + "," + JSONObject.quote(email == null ? "" : email) + "," + (err == null ? "null" : JSONObject.quote(err)) + ")}catch(e){}})()", null);
    }

    /** What the page can ask the phone to do. */
    private class Bridge {
        @JavascriptInterface public String status() {
            try { JSONObject o = new JSONObject(); o.put("notif", notifOn()); o.put("sms", has(Manifest.permission.READ_SMS)); o.put("smsAuto", Store.smsAuto(MainActivity.this) && has(Manifest.permission.RECEIVE_SMS)); o.put("app", true); return o.toString(); }
            catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void openNotificationAccess() { ui.post(new Runnable() { public void run() { try { startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); } catch (Exception e) { Toast.makeText(MainActivity.this, "Open Settings > Notification access and allow Expenses.", Toast.LENGTH_LONG).show(); } } }); }
        @JavascriptInterface public void requestSmsPermission() { ui.post(new Runnable() { public void run() { requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, 2); } }); }
        @JavascriptInterface public void setSmsAuto(final boolean on) { ui.post(new Runnable() { public void run() {
            Store.setSmsAuto(MainActivity.this, on);
            if (on && !has(Manifest.permission.RECEIVE_SMS)) requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, 2);
        } }); }
        @JavascriptInterface public void scanSms(final int days) { ui.post(new Runnable() { public void run() { scan(days); } }); }
        @JavascriptInterface public void scheduleReminders(String json) { RemindReceiver.schedule(MainActivity.this, json); }
        @JavascriptInterface public void ack(final int n) { Store.ack(MainActivity.this, n); }
        @JavascriptInterface public void openAppSettings() { ui.post(new Runnable() { public void run() { try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception e) { Toast.makeText(MainActivity.this, "Open Settings > Apps > Expenses.", Toast.LENGTH_LONG).show(); } } }); }
        @JavascriptInterface public void googleToken(final String req, final String kind, final String email) { ui.post(new Runnable() { public void run() { askToken(req, kind, email); } }); }
        @JavascriptInterface public void dropToken(final String token) { try { AccountManager.get(MainActivity.this).invalidateAuthToken("com.google", token); } catch (Exception ignored) { } }
    }

    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code != 2) return;
        boolean ok = res != null && res.length > 0;
        if (res != null) for (int r : res) if (r != PackageManager.PERMISSION_GRANTED) ok = false;
        if (!ok) Toast.makeText(this, "SMS permission was not given. In app settings tap the three dots, Allow restricted settings, then Permissions, SMS, Allow.", Toast.LENGTH_LONG).show();
        refreshPage();
    }
    @Override protected void onResume() { super.onResume(); LIVE = new WeakReference<>(this); refreshPage(); deliver(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (web != null) web.saveState(out); }
    @Override public void onBackPressed() { if (popup != null) { closePopup(); return; } if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { closePopup(); if (LIVE.get() == this) LIVE = new WeakReference<>(null); if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
