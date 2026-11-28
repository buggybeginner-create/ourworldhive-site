package com.smartsms.app.sms

import android.content.Context
import com.smartsms.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Reads "versionCode: N" from the Smart SMS release on GitHub, at most every 6 hours. */
object UpdateCheck {
    const val APK_URL = "https://github.com/buggybeginner-create/ourworldhive-site/releases/download/smartsms-apk/Smart-SMS.apk"
    private const val API = "https://api.github.com/repos/buggybeginner-create/ourworldhive-site/releases/tags/smartsms-apk"

    suspend fun newerAvailable(ctx: Context, force: Boolean = false): Boolean = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        if (!force && now - Prefs.updateCheckedAt(ctx) < 6 * 3600_000L) return@withContext Prefs.remoteVersion(ctx) > BuildConfig.VERSION_CODE
        runCatching {
            val c = URL(API).openConnection() as HttpURLConnection
            c.connectTimeout = 10_000; c.readTimeout = 10_000
            c.setRequestProperty("Accept", "application/vnd.github+json")
            val body = c.inputStream.use { it.readBytes().decodeToString() }
            c.disconnect()
            Prefs.setUpdateCheckedAt(ctx, now)
            val text = JSONObject(body).optString("body")
            val remote = Regex("versionCode:\\s*(\\d+)").find(text)?.groupValues?.get(1)?.toInt() ?: 0
            Prefs.setRemoteVersion(ctx, remote)
            remote > BuildConfig.VERSION_CODE
        }.getOrDefault(Prefs.remoteVersion(ctx) > BuildConfig.VERSION_CODE)
    }
}
