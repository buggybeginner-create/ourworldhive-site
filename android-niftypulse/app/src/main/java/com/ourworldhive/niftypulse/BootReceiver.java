package com.ourworldhive.niftypulse;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** After the phone restarts or the app updates, start the background checks again. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) { Pulse.schedule(c); Pulse.render(c); }
}
