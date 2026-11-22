package com.ourworldhive.parcel;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/** Shopping and courier notifications (Amazon, Flipkart, Myntra, Ekart, Delhivery, SMS app...): only order and delivery texts are kept, on the phone. */
public class NotifListener extends NotificationListenerService {
    private String last = "";
    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            Bundle e = n.extras;
            CharSequence title = e.getCharSequence(Notification.EXTRA_TITLE), text = e.getCharSequence(Notification.EXTRA_TEXT), big = e.getCharSequence(Notification.EXTRA_BIG_TEXT);
            String body = (big != null && big.length() > 0 ? big : text == null ? "" : text).toString();
            String pk = sbn.getPackageName(), app = pk.contains("amazon") ? "Amazon" : pk.contains("flipkart") ? "Flipkart" : pk.contains("myntra") ? "Myntra" : pk.contains("meesho") ? "Meesho" : pk.contains("ajio") ? "AJIO" : pk.contains("nykaa") ? "Nykaa" : pk.contains("firstcry") ? "FirstCry" : "";
            String t = ((app.isEmpty() ? "" : app + ": ") + (title == null ? "" : title.toString()) + ". " + body).trim();
            if (!Inbox.looksLikeOrder(t) || t.equals(last)) return;
            last = t;
            Inbox.add(this, t, sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis(), "notif", app);
            MainActivity.poke();
        } catch (Exception ignored) { }
    }
}
