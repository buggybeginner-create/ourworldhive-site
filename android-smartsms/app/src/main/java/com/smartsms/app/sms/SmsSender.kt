package com.smartsms.app.sms

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager

/**
 * Sends a text through the phone's default SIM for SMS. Android itself saves the sent
 * message in the phone's SMS store, and the importer then shows it in the chat.
 */
object SmsSender {
    const val ACTION_SENT = "com.smartsms.app.SMS_SENT"
    const val EXTRA_SCHEDULED_ID = "scheduledId"
    const val EXTRA_TO = "to"

    private fun manager(ctx: Context): SmsManager =
        if (Build.VERSION.SDK_INT >= 31) ctx.getSystemService(SmsManager::class.java)
        else @Suppress("DEPRECATION") SmsManager.getDefault()

    /** Number of SMS parts the text needs (shown under the reply box). */
    fun parts(ctx: Context, text: String): Int =
        if (text.isEmpty()) 0 else runCatching { manager(ctx).divideMessage(text).size }.getOrDefault(1)

    @Throws(SecurityException::class, IllegalArgumentException::class)
    fun send(ctx: Context, to: String, text: String, scheduledId: Long = -1L) {
        require(to.isNotBlank()) { "No phone number" }
        require(text.isNotBlank()) { "Empty message" }
        val m = manager(ctx)
        val intent = Intent(ctx, SentReceiver::class.java)
            .setAction(ACTION_SENT)
            .putExtra(EXTRA_SCHEDULED_ID, scheduledId)
            .putExtra(EXTRA_TO, to)
        val code = (System.currentTimeMillis() and 0x7fffffff).toInt()
        val pi = PendingIntent.getBroadcast(ctx, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val parts = m.divideMessage(text)
        if (parts.size <= 1) {
            m.sendTextMessage(to, null, text, pi, null)
        } else {
            val sent = ArrayList<PendingIntent>(parts.size)
            repeat(parts.size) { sent.add(pi) }
            m.sendMultipartTextMessage(to, null, parts, sent, null)
        }
    }
}
