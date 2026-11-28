package com.smartsms.app.sms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.smartsms.app.data.db.AppDatabase
import com.smartsms.app.data.db.ScheduledMessageEntity

/** Wakes the phone at the chosen time to send a scheduled message. Demo rows are never scheduled. */
object ScheduleAlarms {
    const val ACTION_FIRE = "com.smartsms.app.SCHEDULED_SEND"
    const val EXTRA_ID = "id"
    private const val LATE_LIMIT = 24L * 60 * 60 * 1000

    private fun pi(ctx: Context, id: Long): PendingIntent = PendingIntent.getBroadcast(
        ctx, id.toInt(),
        Intent(ctx, ScheduledSendReceiver::class.java).setAction(ACTION_FIRE).putExtra(EXTRA_ID, id),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    fun schedule(ctx: Context, item: ScheduledMessageEntity) {
        if (item.isDemo || item.status != ScheduledMessageEntity.STATUS_PENDING) return
        val am = ctx.getSystemService(AlarmManager::class.java)
        val p = pi(ctx, item.id)
        try {
            if (Perms.canExact(ctx)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.sendAt, p)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.sendAt, p)
        } catch (_: SecurityException) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.sendAt, p)
        }
    }

    fun cancel(ctx: Context, id: Long) {
        ctx.getSystemService(AlarmManager::class.java).cancel(pi(ctx, id))
    }

    /** After a restart or app update. Messages missed by more than a day are not sent late. */
    suspend fun rescheduleAll(ctx: Context, db: AppDatabase) {
        val now = System.currentTimeMillis()
        for (item in db.scheduledMessageDao().getPendingReal()) {
            if (item.sendAt < now - LATE_LIMIT) {
                db.scheduledMessageDao().update(
                    item.copy(status = ScheduledMessageEntity.STATUS_FAILED, error = "Missed: the phone was off or the app was stopped at that time")
                )
            } else {
                schedule(ctx, item) // a time already passed fires straight away
            }
        }
    }
}
