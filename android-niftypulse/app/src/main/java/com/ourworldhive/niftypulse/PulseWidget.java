package com.ourworldhive.niftypulse;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/** The Nifty Pulse home-screen widget: Nifty 50, Bank Nifty, market breadth and five of your stocks. */
public class PulseWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        Pulse.render(c);
        c.sendBroadcast(new Intent(c, Tick.class).setAction(Tick.REFRESH));
    }
    @Override public void onEnabled(Context c) { Pulse.schedule(c); }
    @Override public void onDisabled(Context c) { Pulse.schedule(c); }
}
