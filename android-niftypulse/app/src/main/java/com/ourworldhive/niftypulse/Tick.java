package com.ourworldhive.niftypulse;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarm and widget ⟳ button: get new prices in the background, then set the next check. */
public class Tick extends BroadcastReceiver {
    static final String TICK = "com.ourworldhive.niftypulse.TICK", REFRESH = "com.ourworldhive.niftypulse.REFRESH", STOP = "com.ourworldhive.niftypulse.STOP";

    @Override public void onReceive(Context c, Intent i) {
        if (STOP.equals(i.getAction())) { Pulse.stopAlarms(c); return; }
        final Context app = c.getApplicationContext();
        final PendingResult pr = goAsync();
        new Thread(new Runnable() { public void run() {
            try { Pulse.refresh(app); } catch (Exception ignored) { }
            finally { Pulse.schedule(app); pr.finish(); }
        } }).start();
    }
}
