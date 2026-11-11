package com.ourworldhive.expense;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/** New SMS: when "Read new SMS automatically" is on, bank and payment messages are kept on the phone until the app shows them to the page. */
public class SmsReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        try {
            if (!Store.smsAuto(c) || i == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(i.getAction())) return;
            SmsMessage[] ms = Telephony.Sms.Intents.getMessagesFromIntent(i);
            if (ms == null || ms.length == 0) return;
            StringBuilder sb = new StringBuilder();
            long ts = System.currentTimeMillis();
            for (SmsMessage m : ms) { if (m == null) continue; sb.append(m.getMessageBody()); if (m.getTimestampMillis() > 0) ts = m.getTimestampMillis(); }
            String t = sb.toString();
            if (!Store.looksLikeMoney(t)) return;
            Store.enqueue(c, t, ts, "sms");
            MainActivity.poke();
        } catch (Exception ignored) { }
    }
}
