package com.ourworldhive.niftypulse;

import android.Manifest;
import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Nifty Pulse for Android: opens https://ourworldhive.com/nifty-pulse.html and adds what a website cannot do:
 * a home-screen widget and price alerts that ring while the app is closed. Copyright DUKEKRRISH. All rights reserved.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://ourworldhive.com/nifty-pulse.html?src=play";
    private WebView web;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setBackgroundColor(0xFF070B16);
        web.addJavascriptInterface(new Bridge(), "NPNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return outside(r.getUrl()); }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) v.loadUrl("file:///android_asset/offline.html");
            }
        });
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 3);
        if (b != null) web.restoreState(b); else web.loadUrl(HOME);
        Pulse.schedule(this);
    }

    /** Only ourworldhive.com pages stay inside the app. Everything else (charts, NSE, ICICI login, mail) opens outside. */
    private boolean outside(Uri u) {
        if (u == null) return false;
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase(), host = u.getHost() == null ? "" : u.getHost().toLowerCase();
        if ((sc.equals("https") || sc.equals("http")) && (host.equals("ourworldhive.com") || host.endsWith(".ourworldhive.com"))) return false;
        if (sc.equals("about") || sc.equals("blob") || sc.equals("data") || sc.equals("file")) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { Toast.makeText(this, "No app on this phone can open that link.", Toast.LENGTH_SHORT).show(); }
        return true;
    }

    @Override protected void onResume() { super.onResume(); Pulse.FOREGROUND = true; }
    @Override protected void onPause() { super.onPause(); Pulse.FOREGROUND = false; Pulse.schedule(this); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    /** What the page can ask the phone to do. */
    private class Bridge {
        @JavascriptInterface public void save(String json) {
            Pulse.saveCfg(MainActivity.this, json);
            new Thread(new Runnable() { public void run() { Pulse.render(getApplicationContext()); } }).start();
        }
        @JavascriptInterface public void notify(String title, String msg, String key) {
            if (key == null || Pulse.markFired(MainActivity.this, key)) Pulse.notify(MainActivity.this, title, msg, key);
        }
        @JavascriptInterface public void rearm(String key) { Pulse.unfire(MainActivity.this, key); }
        @JavascriptInterface public void pinWidget() {
            runOnUiThread(new Runnable() { public void run() {
                AppWidgetManager m = AppWidgetManager.getInstance(MainActivity.this);
                if (Build.VERSION.SDK_INT >= 26 && m.isRequestPinAppWidgetSupported())
                    m.requestPinAppWidget(new ComponentName(MainActivity.this, PulseWidget.class), null, null);
                else Toast.makeText(MainActivity.this, "Long-press your home screen → Widgets → Nifty Pulse", Toast.LENGTH_LONG).show();
            } });
        }
        /** size: "s", "m" or "l" (small, medium, large widget) */
        @JavascriptInterface public void pinSize(final String size) {
            runOnUiThread(new Runnable() { public void run() {
                AppWidgetManager m = AppWidgetManager.getInstance(MainActivity.this);
                Class<?> k = "s".equals(size) ? PulseSmall.class : "l".equals(size) ? PulseLarge.class : PulseWidget.class;
                if (Build.VERSION.SDK_INT >= 26 && m.isRequestPinAppWidgetSupported())
                    m.requestPinAppWidget(new ComponentName(MainActivity.this, k), null, null);
                else Toast.makeText(MainActivity.this, "Long-press your home screen → Widgets → Nifty Pulse", Toast.LENGTH_LONG).show();
            } });
        }
        @JavascriptInterface public void openAlertSettings() {
            runOnUiThread(new Runnable() { public void run() {
                try {
                    Intent i = Build.VERSION.SDK_INT >= 26 ? new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())
                        : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                    startActivity(i);
                } catch (Exception ignored) { }
            } });
        }
        @JavascriptInterface public String version() { try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; } }
    }
}
