package com.ourworldhive.diary;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** After the phone restarts, set the saved reminders again. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) { if (Intent.ACTION_BOOT_COMPLETED.equals(i.getAction())) RemindReceiver.restore(c); }
}
