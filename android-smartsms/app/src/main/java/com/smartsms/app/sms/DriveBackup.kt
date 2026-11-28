package com.smartsms.app.sms

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import com.smartsms.app.SmartSmsApp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

data class DriveFile(val id: String, val name: String, val createdTime: String, val size: Long)

/**
 * Backup into the user's own Google Drive (the Google / Gmail account they pick), folder
 * "Smart SMS Backup". Scope drive.file: the app sees only files it made itself, nothing else
 * in the Drive.
 */
object DriveBackup {
    private const val SCOPE = "https://www.googleapis.com/auth/drive.file"
    private const val FOLDER = "Smart SMS Backup"
    private const val KEEP = 30

    sealed interface Auth {
        data class Token(val token: String, val email: String?) : Auth
        data class NeedsConsent(val intent: PendingIntent) : Auth
    }

    private fun request() = AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(SCOPE))).build()

    /** Silent when permission was given before; otherwise returns the Google screen to show. */
    suspend fun authorize(ctx: Context): Auth = toAuth(Identity.getAuthorizationClient(ctx).authorize(request()).await())

    fun fromConsent(ctx: Context, data: Intent?): Auth = toAuth(Identity.getAuthorizationClient(ctx).getAuthorizationResultFromIntent(data))

    private fun toAuth(r: AuthorizationResult): Auth {
        if (r.hasResolution()) return Auth.NeedsConsent(r.pendingIntent!!)
        val email = runCatching { r.toGoogleSignInAccount()?.email }.getOrNull()
        return Auth.Token(r.accessToken ?: throw IOException("Google gave no access"), email)
    }

    /* ---------------- Drive REST ---------------- */

    private fun http(token: String, method: String, url: String, body: ByteArray? = null, type: String? = null): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.connectTimeout = 20_000
        c.readTimeout = 60_000
        c.setRequestProperty("Authorization", "Bearer $token")
        if (body != null) {
            c.doOutput = true
            if (type != null) c.setRequestProperty("Content-Type", type)
            c.outputStream.use { it.write(body) }
        }
        val code = c.responseCode
        val text = (if (code in 200..299) c.inputStream else c.errorStream)?.use { it.readBytes().decodeToString() } ?: ""
        c.disconnect()
        if (code !in 200..299) {
            val msg = runCatching { JSONObject(text).getJSONObject("error").getString("message") }.getOrNull() ?: "Drive error $code"
            throw IOException(msg)
        }
        return text
    }

    private fun q(s: String) = URLEncoder.encode(s, "UTF-8")

    private fun folderId(token: String): String {
        val query = "mimeType='application/vnd.google-apps.folder' and name='$FOLDER' and trashed=false"
        val found = JSONObject(http(token, "GET", "https://www.googleapis.com/drive/v3/files?q=${q(query)}&fields=files(id)&spaces=drive"))
            .getJSONArray("files")
        if (found.length() > 0) return found.getJSONObject(0).getString("id")
        val meta = JSONObject().put("name", FOLDER).put("mimeType", "application/vnd.google-apps.folder")
        return JSONObject(http(token, "POST", "https://www.googleapis.com/drive/v3/files?fields=id", meta.toString().toByteArray(), "application/json"))
            .getString("id")
    }

    fun list(token: String): List<DriveFile> {
        val folder = folderId(token)
        val query = "'$folder' in parents and trashed=false"
        val a = JSONObject(
            http(token, "GET", "https://www.googleapis.com/drive/v3/files?q=${q(query)}&orderBy=createdTime%20desc&pageSize=100&fields=files(id,name,createdTime,size)")
        ).getJSONArray("files")
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            DriveFile(o.getString("id"), o.getString("name"), o.optString("createdTime"), o.optString("size", "0").toLongOrNull() ?: 0)
        }
    }

    /** Uploads one backup file and keeps only the newest 30. Returns the file name. */
    fun upload(token: String, json: String): String {
        val folder = folderId(token)
        val name = "smart-sms-backup-" + SimpleDateFormat("yyyy-MM-dd-HHmm", Locale.US).format(Date()) + ".json"
        val boundary = "smartsms" + System.currentTimeMillis()
        val meta = JSONObject().put("name", name).put("parents", org.json.JSONArray().put(folder)).put("mimeType", "application/json")
        val body = ("--$boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$meta\r\n" +
            "--$boundary\r\nContent-Type: application/json\r\n\r\n$json\r\n--$boundary--\r\n").toByteArray()
        http(token, "POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", body, "multipart/related; boundary=$boundary")
        list(token).drop(KEEP).forEach { f -> runCatching { http(token, "DELETE", "https://www.googleapis.com/drive/v3/files/${f.id}") } }
        return name
    }

    fun download(token: String, id: String): String = http(token, "GET", "https://www.googleapis.com/drive/v3/files/$id?alt=media")

    /* ---------------- automatic backup ---------------- */

    private const val WORK = "drive-backup"

    /** days = 0 turns automatic backup off. Runs only when the phone is online. */
    fun schedule(ctx: Context, days: Int) {
        val wm = WorkManager.getInstance(ctx)
        if (days <= 0) { wm.cancelUniqueWork(WORK); return }
        val req = PeriodicWorkRequestBuilder<DriveBackupWorker>(days.toLong(), TimeUnit.DAYS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, req)
    }

    /** One backup now; used by the button and by the automatic job. */
    suspend fun backupNow(ctx: Context, token: String): Result<String> = withContext(Dispatchers.IO) {
        val c = (ctx.applicationContext as SmartSmsApp).container
        val r = runCatching {
            val (json, _) = c.backupRepository.buildJson()
            upload(token, json)
        }
        c.backupRepository.log("DRIVE", r.getOrNull() ?: "Google Drive", r.map { 1 })
        if (r.isSuccess) Prefs.setDriveLast(ctx, System.currentTimeMillis())
        r
    }
}

class DriveBackupWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        if (Prefs.driveEmail(applicationContext) == null) return Result.success()
        val auth = try {
            DriveBackup.authorize(applicationContext)
        } catch (e: Exception) {
            return Result.retry()
        }
        return when (auth) {
            is DriveBackup.Auth.NeedsConsent -> {
                Notify.post(applicationContext, 300_001, "Google Drive backup paused", "Open Smart SMS → Backup & Sync and tap Back Up Now to allow it again.")
                Result.failure()
            }
            is DriveBackup.Auth.Token ->
                if (DriveBackup.backupNow(applicationContext, auth.token).isSuccess) Result.success() else Result.retry()
        }
    }
}
