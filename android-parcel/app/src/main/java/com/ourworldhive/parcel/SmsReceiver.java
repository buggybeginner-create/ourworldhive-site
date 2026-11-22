package com.ourworldhive.parcel;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/** New SMS (only in the phone build, not the Play Store build): order and delivery messages are kept until the app reads them. */
public class SmsReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        try {
            if (!Inbox.auto(c) || i == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(i.getAction())) return;
            SmsMessage[] ms = Telephony.Sms.Intents.getMessagesFromIntent(i);
            if (ms == null || ms.length == 0) return;
            StringBuilder sb = new StringBuilder(); long ts = System.currentTimeMillis(); String from = "";
            for (SmsMessage m : ms) { if (m == null) continue; sb.append(m.getMessageBody()); if (m.getTimestampMillis() > 0) ts = m.getTimestampMillis(); if (from.isEmpty() && m.getOriginatingAddress() != null) from = m.getOriginatingAddress(); }
            String t = sb.toString();
            if (!Inbox.looksLikeOrder(t + " " + from)) return;
            Inbox.add(c, t, ts, "sms", from);
            MainActivity.poke();
        } catch (Exception ignored) { }
    }
}
