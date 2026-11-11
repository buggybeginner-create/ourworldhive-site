package com.ourworldhive.expense;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/** Payment notifications (GPay, PhonePe, Paytm, bank apps): only texts that look like a money message are kept, on the phone. */
public class NotifListener extends NotificationListenerService {
    private String last = "";
    @Override public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            Bundle e = n.extras;
            CharSequence title = e.getCharSequence(Notification.EXTRA_TITLE), text = e.getCharSequence(Notification.EXTRA_TEXT), big = e.getCharSequence(Notification.EXTRA_BIG_TEXT);
            String body = (big != null && big.length() > 0 ? big : text == null ? "" : text).toString();
            String t = ((title == null ? "" : title.toString()) + ". " + body).trim();
            if (!Store.looksLikeMoney(t) || t.equals(last)) return;
            last = t;
            Store.enqueue(this, t, sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis(), "notif");
            MainActivity.poke();
        } catch (Exception ignored) { }
    }
}
