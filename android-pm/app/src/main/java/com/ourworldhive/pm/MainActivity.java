package com.ourworldhive.pm;

import android.Manifest;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerCallback;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.ClipData;
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
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import com.ourworldhive.shared.PlayBilling;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * PM Tracker for Android: opens https://ourworldhive.com/pm.html and adds what a website cannot do inside an app:
 * a daily full-screen alarm with the job list (rings while the app is closed), Google sign-in with the phone's own account,
 * Drive backup permission, camera for QR scanning and job photos, saving files to Downloads, Google Play Billing,
 * the Android back button and edge-to-edge screens. Copyright DUKEKRRISH. All rights reserved.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://ourworldhive.com/pm.html?src=play";
    private final Handler ui = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView web;
    private ValueCallback<Uri[]> filePick;
    private WebChromeClient.FileChooserParams pickParams;
    private Uri camUri;
    private PermissionRequest camReq;
    private String tokReq, tokScope;
    private PlayBilling play;
    private boolean darkBars, asked;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) w.setDecorFitsSystemWindows(false);
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        boolean sysDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        darkBars = PmAlarm.sp(this).getBoolean("dark", sysDark);
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
        setup(web);
        WebSettings s = web.getSettings();
        s.setUserAgentString(s.getUserAgentString() + " OwhApp/pm");
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
        PmAlarm.schedule(this);
        if (b != null) web.restoreState(b); else web.loadUrl(startUrl(getIntent()));
    }

    /** Where to open: a job QR link (https://ourworldhive.com/pm.html#/i/PLANT/TAG) or a hash from the alarm screen. */
    private String startUrl(Intent i) {
        String h = hashOf(i);
        return HOME + (h == null ? "" : h);
    }
    private String hashOf(Intent i) {
        if (i == null) return null;
        String h = i.getStringExtra("hash");
        if (h != null) return h;
        Uri d = i.getData();
        if (d != null && d.getFragment() != null) return "#" + d.getEncodedFragment();
        return null;
    }
    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        String h = hashOf(i);
        if (h != null && web != null) web.evaluateJavascript("try{location.hash=" + JSONObject.quote(h) + "}catch(e){}", null);
    }

    private void applyBars() {
        int bg = darkBars ? Color.rgb(15, 23, 22) : Color.rgb(15, 118, 110);
        root.setBackgroundColor(bg);
        if (web != null) web.setBackgroundColor(darkBars ? Color.rgb(15, 17, 20) : Color.rgb(238, 244, 243));
        getWindow().getDecorView().setBackgroundColor(bg);
        Window w = getWindow();
        if (Build.VERSION.SDK_INT < 35) { w.setStatusBarColor(bg); w.setNavigationBarColor(darkBars ? bg : Color.WHITE); }
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) c.setSystemBarsAppearance(darkBars ? 0 : WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
    }

    private void setup(WebView w) {
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);
    }

    private static boolean ours(Uri u) {
        String h = u.getHost() == null ? "" : u.getHost().toLowerCase();
        return h.equals("ourworldhive.com") || h.endsWith(".ourworldhive.com") || h.endsWith(".firebaseapp.com") || h.endsWith("gstatic.com") || h.endsWith("googleapis.com");
    }

    /** PM pages stay in the app; other websites and app links (WhatsApp, mail, phone, UPI) open in their own app. */
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

    private boolean camOk() { return checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED; }

    private class Chrome extends WebChromeClient {
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
        /* QR scanner: the page asks for the camera */
        @Override public void onPermissionRequest(final PermissionRequest r) {
            ui.post(new Runnable() { public void run() {
                boolean video = false;
                for (String x : r.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(x)) video = true;
                if (!video) { r.deny(); return; }
                if (camOk()) { r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}); return; }
                camReq = r; requestPermissions(new String[]{Manifest.permission.CAMERA}, 8);
            } });
        }
        /* photos and files: camera for job photos, or choose from the gallery / files */
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (filePick != null) filePick.onReceiveValue(null);
            filePick = cb; pickParams = p;
            if (wantsImage(p) && !camOk()) { requestPermissions(new String[]{Manifest.permission.CAMERA}, 9); return true; }
            openPicker();
            return true;
        }
    }

    private static boolean wantsImage(WebChromeClient.FileChooserParams p) {
        if (p == null) return false;
        for (String a : p.getAcceptTypes()) if (a != null && a.startsWith("image")) return true;
        return false;
    }

    private void openPicker() {
        WebChromeClient.FileChooserParams p = pickParams;
        boolean img = wantsImage(p), multi = p != null && p.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
        try {
            Intent get = new Intent(Intent.ACTION_GET_CONTENT); get.addCategory(Intent.CATEGORY_OPENABLE);
            String type = "*/*";
            if (p != null && p.getAcceptTypes().length > 0 && p.getAcceptTypes()[0] != null && p.getAcceptTypes()[0].contains("/")) type = p.getAcceptTypes()[0];
            if (img) type = "image/*";
            get.setType(type);
            if (multi) get.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            Intent cam = null;
            camUri = null;
            if (img && camOk()) {
                File dir = new File(getCacheDir(), "cam"); if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, "job-" + System.currentTimeMillis() + ".jpg");
                camUri = FileProvider.getUriForFile(this, "com.ourworldhive.pm.files", f);
                cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, camUri)
                    .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            Intent go;
            if (cam != null && p != null && p.isCaptureEnabled()) go = cam;   /* "Take photo" buttons open the camera straight away */
            else {
                go = Intent.createChooser(get, img ? "Add a photo" : "Choose a file");
                if (cam != null) go.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cam});
            }
            startActivityForResult(go, 5);
        } catch (Exception e) { if (filePick != null) filePick.onReceiveValue(null); filePick = null; }
    }

    @Override public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (req == 8 && camReq != null) {
            if (ok) camReq.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}); else { camReq.deny(); Toast.makeText(this, "Camera was not allowed. You can allow it in Settings › Apps › PM Tracker.", Toast.LENGTH_LONG).show(); }
            camReq = null;
        }
        if (req == 9 && filePick != null) openPicker();   /* without the camera, the gallery still works */
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 6) {
            String name = res == RESULT_OK && data != null ? data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME) : null;
            if (name == null) tokenDone(null, null, "No Google account was chosen."); else { rememberAcct(name); fetchToken(name, false); }
            return;
        }
        if (req == 5 && filePick != null) {
            List<Uri> out = new ArrayList<>();
            if (res == RESULT_OK) {
                if (data != null && data.getClipData() != null) { ClipData c = data.getClipData(); for (int i = 0; i < c.getItemCount(); i++) out.add(c.getItemAt(i).getUri()); }
                else if (data != null && data.getData() != null) out.add(data.getData());
                else if (camUri != null) out.add(camUri);   /* the camera saved the photo into our file */
            }
            filePick.onReceiveValue(out.isEmpty() ? null : out.toArray(new Uri[0]));
            filePick = null; camUri = null;
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

    /* ---- Google sign-in (and Drive backup permission) through the phone's own Google account ---- */
    private Set<String> knownAccts() { return new HashSet<>(PmAlarm.sp(this).getStringSet("accts", new HashSet<String>())); }
    private void rememberAcct(String email) { Set<String> s = knownAccts(); s.add(email.toLowerCase()); PmAlarm.sp(this).edit().putStringSet("accts", s).apply(); }

    private void askToken(String req, String kind, String email) {
        tokReq = req;
        tokScope = "drive".equals(kind) ? "oauth2:https://www.googleapis.com/auth/drive.file" : "oauth2:openid email profile";
        if (email != null && email.length() > 3 && knownAccts().contains(email.toLowerCase())) { fetchToken(email, true); return; }
        if (email != null && email.length() > 3 && "drive".equals(kind)) { rememberAcct(email); fetchToken(email, true); return; }
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

    /* ---- save a file (backup, PDF, Excel, QR labels, image) into Downloads › PM Tracker ---- */
    private void save(String name, String mime, String b64) {
        try {
            byte[] data = Base64.decode(b64, Base64.DEFAULT);
            name = name == null || name.isEmpty() ? "pm-file" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime.split(";")[0]);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/PM Tracker");
                Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) throw new Exception("no file");
                OutputStream o = getContentResolver().openOutputStream(u);
                if (o == null) throw new Exception("no file");
                o.write(data); o.close();
                Toast.makeText(this, "Saved in Downloads › PM Tracker › " + name, Toast.LENGTH_LONG).show();
            } else {
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir != null && !dir.exists()) dir.mkdirs();
                File f = new File(dir, name);
                FileOutputStream o = new FileOutputStream(f); o.write(data); o.close();
                Toast.makeText(this, "Saved: " + f.getAbsolutePath(), Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) { Toast.makeText(this, "Could not save the file.", Toast.LENGTH_LONG).show(); }
    }

    private boolean battOk() {
        if (Build.VERSION.SDK_INT < 23) return true;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        return pm == null || pm.isIgnoringBatteryOptimizations(getPackageName());
    }
    private boolean oemStrict() {
        String m = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase();
        for (String x : new String[]{"xiaomi", "redmi", "poco", "oppo", "realme", "vivo", "iqoo", "oneplus", "huawei", "honor", "infinix", "tecno", "itel"}) if (m.contains(x)) return true;
        return false;
    }
    private boolean fullOk() {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return nm == null || nm.canUseFullScreenIntent();
    }
    private boolean notifOk() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return nm == null || nm.areNotificationsEnabled();
    }

    /* ---- Google Play Billing: answers go to window.owhPlayCb(req, json) ---- */
    private PlayBilling play() { if (play == null) play = new PlayBilling(this); return play; }
    private PlayBilling.Callback playCb(final String req) {
        return new PlayBilling.Callback() { public void done(final String j) { ui.post(new Runnable() { public void run() {
            if (web != null) web.evaluateJavascript("(function(){try{window.owhPlayCb&&owhPlayCb(" + JSONObject.quote(req) + "," + JSONObject.quote(j) + ")}catch(e){}})()", null);
        } }); } };
    }

    private void settings(String action, String fallback) {
        try { startActivity(new Intent(action, Uri.parse("package:" + getPackageName()))); }
        catch (Exception e) { Toast.makeText(this, fallback, Toast.LENGTH_LONG).show(); }
    }

    /** What the page can ask the phone to do. */
    private class Bridge {
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public String pkg() { return getPackageName(); }
        @JavascriptInterface public void googleToken(final String req, final String kind, final String email) { ui.post(new Runnable() { public void run() { askToken(req, kind, email); } }); }
        @JavascriptInterface public void dropToken(final String token) { try { AccountManager.get(MainActivity.this).invalidateAuthToken("com.google", token); } catch (Exception ignored) { } }
        @JavascriptInterface public void saveFile(final String name, final String mime, final String b64) { ui.post(new Runnable() { public void run() { save(name, mime, b64); } }); }
        @JavascriptInterface public void shareText(final String title, final String text) { ui.post(new Runnable() { public void run() {
            try { Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, text); startActivity(Intent.createChooser(i, title)); }
            catch (Exception e) { Toast.makeText(MainActivity.this, "Nothing on this phone can share text.", Toast.LENGTH_SHORT).show(); }
        } }); }
        @JavascriptInterface public void openUri(final String uri) { ui.post(new Runnable() { public void run() { openExternal(Uri.parse(uri)); } }); }
        @JavascriptInterface public void setBars(final boolean dark) { ui.post(new Runnable() { public void run() { darkBars = dark; PmAlarm.sp(MainActivity.this).edit().putBoolean("dark", dark).apply(); applyBars(); } }); }

        /* ---- daily alarm ---- */
        @JavascriptInterface public void setPmAlarm(final String json) {
            PmAlarm.save(MainActivity.this, json);
            try { if (new JSONObject(json).optBoolean("on") && Build.VERSION.SDK_INT >= 33) askNotify(); } catch (Exception ignored) { }
        }
        @JavascriptInterface public void testAlarm() { ui.post(new Runnable() { public void run() { PmAlarm.ring(MainActivity.this, true); } }); }
        @JavascriptInterface public String alertStatus() {
            try { JSONObject o = new JSONObject(); o.put("notif", notifOk()); o.put("exact", PmAlarm.exactOk(MainActivity.this)); o.put("batt", battOk()); o.put("oem", oemStrict()); o.put("full", fullOk()); return o.toString(); } catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void askNotify() { ui.post(new Runnable() { public void run() {
            if (notifOk()) return;
            if (Build.VERSION.SDK_INT >= 33 && !asked && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                { asked = true; requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 3); return; }
            try { startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())); }
            catch (Exception e) { Toast.makeText(MainActivity.this, "Open Settings › Apps › PM Tracker › Notifications.", Toast.LENGTH_LONG).show(); }
        } }); }
        @JavascriptInterface public void openExactSettings() { ui.post(new Runnable() { public void run() {
            if (Build.VERSION.SDK_INT >= 31) settings(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, "Open Settings › Apps › PM Tracker › Alarms & reminders.");
        } }); }
        @JavascriptInterface public void openFullScreen() { ui.post(new Runnable() { public void run() {
            if (Build.VERSION.SDK_INT >= 34) settings(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, "Open Settings › Apps › PM Tracker › Full screen notifications.");
        } }); }
        /** Battery / Autostart: phones like Xiaomi, Redmi, Oppo, Vivo stop closed apps, so alarms can be late. */
        @JavascriptInterface public void openBattery() { ui.post(new Runnable() { public void run() {
            settings(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, "Open Settings › Apps › PM Tracker › Battery.");
            Toast.makeText(MainActivity.this, "Turn ON Autostart and set Battery saver to No restrictions.", Toast.LENGTH_LONG).show();
        } }); }

        /* ---- Google Play Billing ---- */
        @JavascriptInterface public boolean playOk() { return true; }
        @JavascriptInterface public void playProducts(final String req, final String list) { ui.post(new Runnable() { public void run() { play().products(list, playCb(req)); } }); }
        @JavascriptInterface public void playBuy(final String req, final String id, final String type, final String account) { ui.post(new Runnable() { public void run() { play().buy(id, type, account, playCb(req)); } }); }
        @JavascriptInterface public void playOwned(final String req) { ui.post(new Runnable() { public void run() { play().owned(playCb(req)); } }); }
        @JavascriptInterface public void playAck(final String token) { ui.post(new Runnable() { public void run() { play().ack(token); } }); }
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (web != null) web.saveState(out); }
    @Override protected void onResume() {
        super.onResume();
        PmAlarm.silence(this);
        PmAlarm.schedule(this);   /* after "Alarms & reminders" is allowed, set the alarm at its exact time again */
        if (web != null) web.evaluateJavascript("try{window.owhResume&&owhResume()}catch(e){}", null);
    }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
