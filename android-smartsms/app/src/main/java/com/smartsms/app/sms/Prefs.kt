package com.smartsms.app.sms

import android.content.Context

/** Small switches kept outside the database. */
object Prefs {
    private fun sp(ctx: Context) = ctx.getSharedPreferences("smartsms", Context.MODE_PRIVATE)
    fun notifyNew(ctx: Context) = sp(ctx).getBoolean("notifyNew", true)
    fun setNotifyNew(ctx: Context, on: Boolean) = sp(ctx).edit().putBoolean("notifyNew", on).apply()
}
