package com.smartsms.app.sms

import android.content.Context

/** Small switches kept outside the database. */
object Prefs {
    private fun sp(ctx: Context) = ctx.getSharedPreferences("smartsms", Context.MODE_PRIVATE)
    fun notifyNew(ctx: Context) = sp(ctx).getBoolean("notifyNew", true)
    fun setNotifyNew(ctx: Context, on: Boolean) = sp(ctx).edit().putBoolean("notifyNew", on).apply()

    fun appLock(ctx: Context) = sp(ctx).getBoolean("appLock", false)
    fun setAppLock(ctx: Context, on: Boolean) = sp(ctx).edit().putBoolean("appLock", on).apply()
    fun otpLock(ctx: Context) = sp(ctx).getBoolean("otpLock", false)
    fun setOtpLock(ctx: Context, on: Boolean) = sp(ctx).edit().putBoolean("otpLock", on).apply()

    fun driveEmail(ctx: Context): String? = sp(ctx).getString("driveEmail", null)
    fun setDriveEmail(ctx: Context, email: String?) = sp(ctx).edit().putString("driveEmail", email).apply()
    fun driveLast(ctx: Context) = sp(ctx).getLong("driveLast", 0L)
    fun setDriveLast(ctx: Context, t: Long) = sp(ctx).edit().putLong("driveLast", t).apply()
    fun driveAuto(ctx: Context) = sp(ctx).getInt("driveAuto", 0)
    fun setDriveAuto(ctx: Context, days: Int) = sp(ctx).edit().putInt("driveAuto", days).apply()
    fun updateCheckedAt(ctx: Context) = sp(ctx).getLong("updateCheckedAt", 0L)
    fun setUpdateCheckedAt(ctx: Context, t: Long) = sp(ctx).edit().putLong("updateCheckedAt", t).apply()

    fun remoteVersion(ctx: Context) = sp(ctx).getInt("remoteVersion", 0)
    fun setRemoteVersion(ctx: Context, v: Int) = sp(ctx).edit().putInt("remoteVersion", v).apply()

    private val DEFAULT_REPLIES = listOf("Call you later", "On the way", "I'm in a meeting", "OK, thanks!", "Will call you back")

    fun quickReplies(ctx: Context): List<String> {
        val raw = sp(ctx).getString("quickReplies", null) ?: return DEFAULT_REPLIES
        return runCatching {
            val a = org.json.JSONArray(raw)
            (0 until a.length()).map { a.getString(it) }
        }.getOrDefault(DEFAULT_REPLIES)
    }

    fun setQuickReplies(ctx: Context, list: List<String>) =
        sp(ctx).edit().putString("quickReplies", org.json.JSONArray(list).toString()).apply()
}
