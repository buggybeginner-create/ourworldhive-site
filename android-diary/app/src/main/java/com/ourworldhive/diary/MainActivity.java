package com.ourworldhive.diary;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
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
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.Set;

/**
 * My Diary for Android: opens https://ourworldhive.com/diary-app.html and adds what a website cannot do inside an app:
 * Google sign-in with the phone's own account, reminders that ring while the app is closed, saving backups to Downloads,
 * sharing, the Android back button, and edge-to-edge screens. Copyright DUKEKRRISH. All rights reserved.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://ourworldhive.com/diary-app.html?src=play";
    private final Handler ui = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView web;
    private ValueCallback<Uri[]> filePick;
    private String tokReq, tokScope;
    private boolean darkBars, asked;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) w.setDecorFitsSystemWindows(false);
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        darkBars = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applyBars();
        /* keep the page clear of the status bar, navigation bar and keyboard */
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                if (Build.VERSION.SDK_INT < 30) return in;   /* older Android places the page below the bars by itself */
                android.graphics.Insets s = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets k = in.getInsets(WindowInsets.Type.ime());
                v.setPadding(s.left, s.top, s.right, Math.max(s.bottom, k.bottom));
                return WindowInsets.CONSUMED;
            }
        });
        setup(web);
        WebSettings s = web.getSettings();
        s.setUserAgentString(s.getUserAgentString() + " OwhApp/diary");
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
        RemindReceiver.restore(this);
        if (b != null) web.restoreState(b); else web.loadUrl(HOME);
    }

    private void applyBars() {
        int bg = darkBars ? Color.rgb(18, 20, 29) : Color.rgb(241, 242, 250);
        root.setBackgroundColor(bg);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT < 35) { w.setStatusBarColor(bg); w.setNavigationBarColor(bg); }
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int f = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(darkBars ? 0 : f, f);
            }
        } else if (Build.VERSION.SDK_INT >= 23) {
            View d = w.getDecorView();
            int f = d.getSystemUiVisibility();
            d.setSystemUiVisibility(darkBars ? f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    private void setup(WebView w) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setTextZoom(100);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);
    }

    private static boolean ours(Uri u) {
        String h = u.getHost() == null ? "" : u.getHost().toLowerCase();
        return h.equals("ourworldhive.com") || h.endsWith(".ourworldhive.com") || h.endsWith(".firebaseapp.com") || h.endsWith("gstatic.com") || h.endsWith("googleapis.com");
    }

    /** Pages of the diary stay in the app; other websites and app links (WhatsApp, mail, phone, UPI) open in their own app. */
    private boolean outside(Uri u) {
        if (u == null) return false;
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        if (sc.equals("about") || sc.equals("blob") || sc.equals("data") || sc.equals("file")) return false;
        if ((sc.equals("http") || sc.equals("https")) && ours(u)) return false;
        openExternal(u);
        return true;
    }

    private void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (Exception e) { Toast.makeText(this, "No app on this phone can open that link.", Toast.LENGTH_SHORT).show(); }
    }

    private class Chrome extends WebChromeClient {
        /* window.open(): our own pages load in the app, everything else opens outside */
        @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean userGesture, Message resultMsg) {
            final WebView child = new WebView(MainActivity.this);
            child.setWebViewClient(new WebViewClient() {
                boolean done;
                void take(Uri u) {
                    if (done || u == null || "about".equals(u.getScheme())) return;
                    done = true;
                    String sc = u.getScheme() == null ? "" : u.getScheme();
                    if ((sc.equals("http") || sc.equals("https")) && ours(u)) web.loadUrl(u.toString()); else openExternal(u);
                    ui.post(new Runnable() { public void run() { try { child.destroy(); } catch (Exception ignored) { } } });
                }
                @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { take(r.getUrl()); return true; }
                @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap f) { if (url != null) { v.stopLoading(); take(Uri.parse(url)); } }
            });
            ((WebView.WebViewTransport) resultMsg.obj).setWebView(child);
            resultMsg.sendToTarget();
            return true;
        }
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (filePick != null) filePick.onReceiveValue(null);
            filePick = cb;
            try {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                startActivityForResult(Intent.createChooser(i, "Choose a file"), 5);
            } catch (Exception e) { filePick = null; cb.onReceiveValue(null); }
            return true;
        }
    }

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

    /* ---- Google sign-in through the phone's own Google account (Google does not allow its sign-in page inside apps) ---- */
    private Set<String> knownAccts() { return new HashSet<>(RemindReceiver.sp(this).getStringSet("accts", new HashSet<String>())); }
    private void rememberAcct(String email) { Set<String> s = knownAccts(); s.add(email.toLowerCase()); RemindReceiver.sp(this).edit().putStringSet("accts", s).apply(); }

    private void askToken(String req, String email) {
        tokReq = req;
        tokScope = "oauth2:openid email profile";
        if (email != null && email.length() > 3 && knownAccts().contains(email.toLowerCase())) { fetchToken(email, true); return; }
        chooseAcct();
    }
    private void chooseAcct() {
        try { startActivityForResult(AccountManager.newChooseAccountIntent(null, null, new String[]{"com.google"}, null, null, null, null), 6); }
        catch (Exception e) { tokenDone(null, null, "This phone has no Google account. Use email and password instead."); }
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
                        tokenDone(null, email, "Google sign-in did not work (" + m + "). You can sign in with email and password.");
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

    /* ---- save a file (backup, PDF, PNG, CSV) into Downloads ---- */
    private void save(String name, String mime, String b64) {
        try {
            byte[] data = Base64.decode(b64, Base64.DEFAULT);
            name = name == null || name.isEmpty() ? "diary-file" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime.split(";")[0]);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/My Diary");
                Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) throw new Exception("no file");
                OutputStream o = getContentResolver().openOutputStream(u);
                if (o == null) throw new Exception("no file");
                o.write(data); o.close();
                Toast.makeText(this, "Saved in Downloads › My Diary › " + name, Toast.LENGTH_LONG).show();
            } else {
                File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "");
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, name);
                FileOutputStream o = new FileOutputStream(f); o.write(data); o.close();
                Toast.makeText(this, "Saved: " + f.getAbsolutePath(), Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) { Toast.makeText(this, "Could not save the file.", Toast.LENGTH_LONG).show(); }
    }

    /** What the page can ask the phone to do. */
    private class Bridge {
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public void googleToken(final String req, final String kind, final String email) { ui.post(new Runnable() { public void run() { askToken(req, email); } }); }
        @JavascriptInterface public void dropToken(final String token) { try { AccountManager.get(MainActivity.this).invalidateAuthToken("com.google", token); } catch (Exception ignored) { } }
        @JavascriptInterface public void saveFile(final String name, final String mime, final String b64) { ui.post(new Runnable() { public void run() { save(name, mime, b64); } }); }
        @JavascriptInterface public void shareText(final String title, final String text) { ui.post(new Runnable() { public void run() {
            try { Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, text); startActivity(Intent.createChooser(i, title)); }
            catch (Exception e) { Toast.makeText(MainActivity.this, "Nothing on this phone can share text.", Toast.LENGTH_SHORT).show(); }
        } }); }
        @JavascriptInterface public void askNotify() { ui.post(new Runnable() { public void run() {
            if (Build.VERSION.SDK_INT >= 33 && !asked && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                { asked = true; requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 3); }
        } }); }
        @JavascriptInterface public void setReminders(final String json) {
            RemindReceiver.setAll(MainActivity.this, json);
            if (json != null && json.length() > 4 && Build.VERSION.SDK_INT >= 33) askNotify();
        }
        @JavascriptInterface public void setBars(final boolean dark) { ui.post(new Runnable() { public void run() { darkBars = dark; applyBars(); } }); }
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (web != null) web.saveState(out); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
