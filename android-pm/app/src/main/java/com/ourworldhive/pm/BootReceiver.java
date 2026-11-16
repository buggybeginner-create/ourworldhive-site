package com.ourworldhive.pm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** After the phone restarts (or the time or alarm permission changes), set the daily PM alarm again. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) { PmAlarm.schedule(c); }
}
