package com.ourworldhive.dindarpan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** After a restart, an app update, a clock change or midnight: redraw the widgets and set the next reminder again. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        Store.refreshAll(c);
        RemindReceiver.schedule(c);
    }
}
