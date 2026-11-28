package com.smartsms.app.sms

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.smartsms.app.MainActivity
import com.smartsms.app.R

/** Notifications about messages Smart SMS sent for you. Never shows message codes. */
object Notify {
    private const val CHANNEL = "sending"
    private const val CHANNEL_IN = "incoming"
    const val EXTRA_CONVERSATION = "conversationId"

    /** New message from a person or business. OTP texts are never shown in the notification. */
    fun incoming(ctx: Context, conversationId: Long, title: String, text: String, isOtp: Boolean) {
        if (!Perms.canNotify(ctx) || !Prefs.notifyNew(ctx)) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL_IN) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL_IN, "New Messages", NotificationManager.IMPORTANCE_HIGH))
        }
        val open = PendingIntent.getActivity(
            ctx, conversationId.toInt(),
            Intent(ctx, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(EXTRA_CONVERSATION, conversationId),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val body = if (isOtp) "One-time code received · open to view" else text
        val n = NotificationCompat.Builder(ctx, CHANNEL_IN)
            .setSmallIcon(R.drawable.ic_stat_sms)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(ctx).notify(100_000 + conversationId.toInt(), n)
        } catch (_: SecurityException) {
        }
    }

    fun post(ctx: Context, id: Int, title: String, text: String) {
        if (!Perms.canNotify(ctx)) return
        val nm = ctx.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Sent And Scheduled Messages", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_sms)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try {
            NotificationManagerCompat.from(ctx).notify(id, n)
        } catch (_: SecurityException) {
            // notifications turned off for the app
        }
    }
}
