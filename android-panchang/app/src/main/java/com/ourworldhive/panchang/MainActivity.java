package com.ourworldhive.panchang;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.CalendarContract;
import android.provider.Settings;
import android.app.NotificationManager;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;
import java.util.TimeZone;

/**
 * Din Darpan (Panchang) for Android: opens https://ourworldhive.com/panchang.html and adds what a website cannot do:
 * home-screen widgets (festival countdown and month calendar), the phone's own calendars (Google Calendar),
 * festival reminders while the app is closed, Google sign-in with the phone's account and the back button.
 * Copyright DUKEKRRISH. All rights reserved.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://ourworldhive.com/panchang.html?src=play";
    private final Handler ui = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView web;
    private String tokReq, tokScope, calReq, geoOrigin;
    private GeolocationPermissions.Callback geoCb;
    private boolean darkBars = false, asked;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) w.setDecorFitsSystemWindows(false);
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        darkBars = Store.sp(this).getBoolean("dark", false);
        applyBars();
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                if (Build.VERSION.SDK_INT < 30) return in;
                android.graphics.Insets s = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets k = in.getInsets(WindowInsets.Type.ime());
                v.setPadding(s.left, s.top, s.right, Math.max(s.bottom, k.bottom));
                return WindowInsets.CONSUMED;
            }
        });
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " OwhApp/panchang");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.addJavascriptInterface(new Bridge(), "OwhNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return outside(r.getUrl()); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) v.loadUrl("file:///android_asset/offline.html");
            }
        });
        web.setWebChromeClient(new Chrome());
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                new android.window.OnBackInvokedCallback() { public void onBackInvoked() { goBack(); } });
        }
        if (b != null) web.restoreState(b); else web.loadUrl(startUrl(getIntent()));
        RemindReceiver.schedule(this);
        Store.midnight(this);
    }

    /** opened from a widget: go straight to that tab or day */
    private String startUrl(Intent i) {
        String u = HOME;
        if (i != null) {
            String tab = i.getStringExtra("tab"), d = i.getStringExtra("d");
            if (tab != null && tab.matches("[a-z]{2,5}")) u += "&tab=" + tab;
            if (d != null && d.matches("\\d{4}-\\d\\d-\\d\\d")) u += "&d=" + d;
        }
        return u;
    }

    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (web == null || i == null) return;
        String tab = i.getStringExtra("tab"), d = i.getStringExtra("d");
        if (tab == null) return;
        String t = tab.matches("[a-z]{2,5}") ? tab : "home", dd = d != null && d.matches("\\d{4}-\\d\\d-\\d\\d") ? d : "";
        web.evaluateJavascript("(function(){try{if(window.owhOpen){owhOpen('" + t + "','" + dd + "');return 1}}catch(e){}return 0})()", new ValueCallback<String>() {
            public void onReceiveValue(String r) { if (!"1".equals(r) && web != null) web.loadUrl(startUrl(i)); }
        });
    }

    private void applyBars() {
        int bg = darkBars ? Color.rgb(31, 13, 14) : Color.rgb(122, 31, 31);
        root.setBackgroundColor(bg);
        if (web != null) web.setBackgroundColor(bg);
        getWindow().getDecorView().setBackgroundColor(bg);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT < 35) { w.setStatusBarColor(bg); w.setNavigationBarColor(bg); }
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int f = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(darkBars ? 0 : f, f);
            }
        } else {
            View d = w.getDecorView();
            int f = d.getSystemUiVisibility();
            d.setSystemUiVisibility(darkBars ? f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    private static boolean ours(Uri u) {
        String h = u.getHost() == null ? "" : u.getHost().toLowerCase();
        return h.equals("ourworldhive.com") || h.endsWith(".ourworldhive.com") || h.endsWith(".firebaseapp.com") || h.endsWith("gstatic.com") || h.endsWith("googleapis.com");
    }

    /** only this app's page stays inside; other pages and app links (WhatsApp, mail, UPI) open in their own app */
    private boolean outside(Uri u) {
        if (u == null) return false;
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        if (sc.equals("about") || sc.equals("blob") || sc.equals("data") || sc.equals("file")) return false;
        if ((sc.equals("http") || sc.equals("https")) && ours(u)) {
            String p = u.getPath() == null ? "" : u.getPath();
            if (p.endsWith("/panchang.html") || p.startsWith("/__/") || !u.getHost().toLowerCase().contains("ourworldhive.com")) return false;
        }
        openExternal(u);
        return true;
    }

    private void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (Exception e) { Toast.makeText(this, "No app on this phone can open that link.", Toast.LENGTH_SHORT).show(); }
    }

    private class Chrome extends WebChromeClient {
        @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean userGesture, Message resultMsg) {
            final WebView child = new WebView(MainActivity.this);
            child.setWebViewClient(new WebViewClient() {
                boolean done;
                void take(Uri u) {
                    if (done || u == null || "about".equals(u.getScheme())) return;
                    done = true;
                    if (!outside(u) && web != null) web.loadUrl(u.toString());
                    ui.post(new Runnable() { public void run() { try { child.destroy(); } catch (Exception ignored) { } } });
                }
                @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { take(r.getUrl()); return true; }
                @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap f) { if (url != null) { v.stopLoading(); take(Uri.parse(url)); } }
            });
            ((WebView.WebViewTransport) resultMsg.obj).setWebView(child);
            resultMsg.sendToTarget();
            return true;
        }
        /* "Use my location": ask Android for coarse location once, then tell the page */
        @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
            if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) { cb.invoke(origin, true, false); return; }
            geoOrigin = origin; geoCb = cb;
            requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION}, 12);
        }
    }

    @Override public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        boolean ok = res.length > 0;
        for (int r : res) if (r != PackageManager.PERMISSION_GRANTED) ok = false;
        if (req == 12 && geoCb != null) { geoCb.invoke(geoOrigin, ok, false); geoCb = null; return; }
        if (req == 11) {
            String r = calReq; calReq = null;
            if (web != null && r != null) web.evaluateJavascript("(function(){try{window.owhCal&&owhCal(" + JSONObject.quote(r) + "," + ok + ")}catch(e){}})()", null);
            if (!ok && Build.VERSION.SDK_INT >= 23 && !shouldShowRequestPermissionRationale(Manifest.permission.READ_CALENDAR))
                Toast.makeText(this, "To allow it later: Settings › Apps › Din Darpan › Permissions › Calendar.", Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 6) {
            String name = res == RESULT_OK && data != null ? data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME) : null;
            if (name == null) tokenDone(null, null, "No Google account was chosen."); else { rememberAcct(name); fetchToken(name, false); }
        }
    }

    private void goBack() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(function(){try{return !!(window.owhBack&&owhBack())}catch(e){return false}})()", new ValueCallback<String>() {
            public void onReceiveValue(String r) {
                if ("true".equals(r)) return;
                if (web != null && web.canGoBack()) web.goBack(); else moveTaskToBack(true);
            }
        });
    }
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { goBack(); }

    /* ---- Google sign-in with the phone's own Google account (Google does not allow its sign-in page inside apps) ---- */
    private Set<String> knownAccts() { return new HashSet<>(Store.sp(this).getStringSet("accts", new HashSet<String>())); }
    private void rememberAcct(String email) { Set<String> s = knownAccts(); s.add(email.toLowerCase()); Store.sp(this).edit().putStringSet("accts", s).apply(); }
    private void askToken(String req, String email) {
        tokReq = req;
        tokScope = "oauth2:openid email profile";
        if (email != null && email.length() > 3 && knownAccts().contains(email.toLowerCase())) { fetchToken(email, true); return; }
        chooseAcct();
    }
    private void chooseAcct() {
        try { startActivityForResult(AccountManager.newChooseAccountIntent(null, null, new String[]{"com.google"}, null, null, null, null), 6); }
        catch (Exception e) { tokenDone(null, null, "This phone has no Google account."); }
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
                        tokenDone(null, email, "Google sign-in did not work (" + m + ").");
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

    /* ---- the phone's calendars (Google Calendar syncs into them) ---- */
    private boolean calOk() {
        return checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
            && checkSelfPermission(Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    private String calendars() {
        JSONArray out = new JSONArray();
        if (!calOk()) return out.toString();
        Cursor c = null;
        try {
            c = getContentResolver().query(CalendarContract.Calendars.CONTENT_URI,
                new String[]{CalendarContract.Calendars._ID, CalendarContract.Calendars.CALENDAR_DISPLAY_NAME, CalendarContract.Calendars.ACCOUNT_NAME, CalendarContract.Calendars.IS_PRIMARY, CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL},
                CalendarContract.Calendars.VISIBLE + "=1", null, CalendarContract.Calendars.IS_PRIMARY + " DESC");
            while (c != null && c.moveToNext()) {
                if (c.getInt(4) < CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR) continue;
                JSONObject o = new JSONObject();
                o.put("id", c.getLong(0)); o.put("name", c.getString(1) == null ? "Calendar" : c.getString(1));
                o.put("acct", c.getString(2) == null ? "" : c.getString(2)); o.put("primary", c.getInt(3) == 1);
                out.put(o);
            }
        } catch (Exception ignored) { } finally { if (c != null) c.close(); }
        return out.toString();
    }

    private String events(long from, long to) {
        JSONArray out = new JSONArray();
        if (!calOk()) return out.toString();
        Cursor c = null;
        try {
            c = CalendarContract.Instances.query(getContentResolver(),
                new String[]{CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END, CalendarContract.Instances.ALL_DAY, CalendarContract.Instances.EVENT_ID, CalendarContract.Instances.DESCRIPTION},
                from, to);
            int n = 0;
            while (c != null && c.moveToNext() && n++ < 600) {
                String desc = c.getString(5);
                if (desc != null && desc.contains("Panchang · ourworldhive.com")) continue; /* festivals we added ourselves are already shown */
                JSONObject o = new JSONObject();
                o.put("t", c.getString(0) == null ? "(No title)" : c.getString(0));
                o.put("s", c.getLong(1)); o.put("e", c.getLong(2)); o.put("all", c.getInt(3) == 1); o.put("id", c.getLong(4));
                out.put(o);
            }
        } catch (Exception ignored) { } finally { if (c != null) c.close(); }
        return out.toString();
    }

    /** add all-day festival events, skipping ones that are already there */
    private int addMany(String calId, String json) {
        if (!calOk()) return -1;
        int added = 0;
        try {
            long cal = Long.parseLong(calId);
            JSONArray a = new JSONArray(json);
            ContentResolver cr = getContentResolver();
            for (int i = 0; i < a.length() && i < 400; i++) {
                JSONObject o = a.getJSONObject(i);
                String t = o.optString("t"), d = o.optString("d");
                if (t.isEmpty() || !d.matches("\\d{4}-\\d\\d-\\d\\d")) continue;
                java.util.Calendar k = java.util.Calendar.getInstance(TimeZone.getTimeZone("UTC"));
                k.clear(); k.set(Integer.parseInt(d.substring(0, 4)), Integer.parseInt(d.substring(5, 7)) - 1, Integer.parseInt(d.substring(8, 10)));
                long start = k.getTimeInMillis(), end = start + 86400000L;
                Cursor c = cr.query(CalendarContract.Events.CONTENT_URI, new String[]{CalendarContract.Events._ID},
                    CalendarContract.Events.CALENDAR_ID + "=? AND " + CalendarContract.Events.TITLE + "=? AND " + CalendarContract.Events.DTSTART + "=? AND " + CalendarContract.Events.DELETED + "=0",
                    new String[]{String.valueOf(cal), t, String.valueOf(start)}, null);
                boolean has = c != null && c.getCount() > 0;
                if (c != null) c.close();
                if (has) continue;
                ContentValues v = new ContentValues();
                v.put(CalendarContract.Events.CALENDAR_ID, cal);
                v.put(CalendarContract.Events.TITLE, t);
                v.put(CalendarContract.Events.DESCRIPTION, "Panchang · ourworldhive.com");
                v.put(CalendarContract.Events.DTSTART, start);
                v.put(CalendarContract.Events.DTEND, end);
                v.put(CalendarContract.Events.ALL_DAY, 1);
                v.put(CalendarContract.Events.EVENT_TIMEZONE, "UTC");
                v.put(CalendarContract.Events.AVAILABILITY, CalendarContract.Events.AVAILABILITY_FREE);
                if (cr.insert(CalendarContract.Events.CONTENT_URI, v) != null) added++;
            }
        } catch (Exception e) { return added > 0 ? added : -1; }
        return added;
    }

    /** open the phone's calendar app with the event filled in (no permission needed) */
    private void insertOne(String json) {
        try {
            JSONObject o = new JSONObject(json);
            String d = o.optString("d");
            java.util.Calendar k = java.util.Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            k.clear(); k.set(Integer.parseInt(d.substring(0, 4)), Integer.parseInt(d.substring(5, 7)) - 1, Integer.parseInt(d.substring(8, 10)));
            Intent i = new Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI)
                .putExtra(CalendarContract.Events.TITLE, o.optString("t", "Event"))
                .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, true)
                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, k.getTimeInMillis())
                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, k.getTimeInMillis() + 86400000L)
                .putExtra(CalendarContract.Events.DESCRIPTION, "Panchang · ourworldhive.com");
            startActivity(i);
        } catch (Exception e) { Toast.makeText(this, "No calendar app on this phone.", Toast.LENGTH_SHORT).show(); }
    }

    private boolean notifOk() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return nm == null || nm.areNotificationsEnabled();
    }

    /** What the page can ask the phone to do. */
    private class Bridge {
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public String pkg() { return getPackageName(); }
        @JavascriptInterface public void googleToken(final String req, final String kind, final String email) { ui.post(new Runnable() { public void run() { askToken(req, email); } }); }
        @JavascriptInterface public void dropToken(final String token) { try { AccountManager.get(MainActivity.this).invalidateAuthToken("com.google", token); } catch (Exception ignored) { } }
        @JavascriptInterface public void setWidget(final String json) { Store.save(MainActivity.this, json); }
        @JavascriptInterface public void setReminders(final String json) {
            RemindReceiver.setAll(MainActivity.this, json);
            if (json != null && json.length() > 4 && Build.VERSION.SDK_INT >= 33 && !asked) askNotify();
        }
        @JavascriptInterface public void askNotify() { ui.post(new Runnable() { public void run() {
            if (notifOk()) return;
            if (Build.VERSION.SDK_INT >= 33 && !asked && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                { asked = true; requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 3); return; }
            try { startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())); }
            catch (Exception e) { Toast.makeText(MainActivity.this, "Open Settings › Apps › Din Darpan › Notifications.", Toast.LENGTH_LONG).show(); }
        } }); }
        @JavascriptInterface public String calPerm() { return calOk() ? "granted" : "denied"; }
        @JavascriptInterface public void askCal(final String req) { ui.post(new Runnable() { public void run() {
            if (calOk()) { if (web != null) web.evaluateJavascript("(function(){try{window.owhCal&&owhCal(" + JSONObject.quote(req) + ",true)}catch(e){}})()", null); return; }
            calReq = req;
            requestPermissions(new String[]{Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR}, 11);
        } }); }
        @JavascriptInterface public String calList() { return calendars(); }
        @JavascriptInterface public String calEvents(double from, double to) { return events((long) from, (long) to); }
        @JavascriptInterface public int calAddMany(String calId, String json) { return addMany(calId, json); }
        @JavascriptInterface public void calInsert(final String json) { ui.post(new Runnable() { public void run() { insertOne(json); } }); }
        @JavascriptInterface public void shareText(final String title, final String text) { ui.post(new Runnable() { public void run() {
            try { Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, text); startActivity(Intent.createChooser(i, title)); }
            catch (Exception e) { Toast.makeText(MainActivity.this, "Nothing on this phone can share text.", Toast.LENGTH_SHORT).show(); }
        } }); }
        @JavascriptInterface public void openUri(final String uri) { ui.post(new Runnable() { public void run() { openExternal(Uri.parse(uri)); } }); }
        @JavascriptInterface public void setBars(final boolean dark) { ui.post(new Runnable() { public void run() {
            darkBars = dark; Store.sp(MainActivity.this).edit().putBoolean("dark", dark).apply(); applyBars();
        } }); }
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (web != null) web.saveState(out); }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("try{window.owhResume&&owhResume()}catch(e){}", null);
    }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
