package com.smartsms.app.sms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.db.AppDatabase
import com.smartsms.app.data.db.ReminderEntity
import com.smartsms.app.ui.components.formatMoney
import kotlinx.coroutines.launch

/** Bill and EMI alerts: 2 days before the due date and on the day, at 9:00. */
object ReminderAlarms {
    const val EXTRA_ID = "reminderId"
    const val EXTRA_KIND = "kind" // 0 = two days before, 1 = due day
    private const val DAY = 24L * 3600_000

    private fun pi(ctx: Context, id: Long, kind: Int): PendingIntent = PendingIntent.getBroadcast(
        ctx, 500_000 + (id.toInt() * 2) + kind,
        Intent(ctx, ReminderReceiver::class.java).putExtra(EXTRA_ID, id).putExtra(EXTRA_KIND, kind),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    fun schedule(ctx: Context, r: ReminderEntity) {
        if (r.isDemo || r.status != ReminderEntity.STATUS_PENDING) return
        val am = ctx.getSystemService(AlarmManager::class.java)
        val now = System.currentTimeMillis()
        listOf(0 to r.dueAt - 2 * DAY, 1 to r.dueAt).forEach { (kind, at) ->
            if (at <= now) return@forEach
            try {
                if (Perms.canExact(ctx)) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi(ctx, r.id, kind))
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi(ctx, r.id, kind))
            } catch (_: SecurityException) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi(ctx, r.id, kind))
            }
        }
    }

    fun cancel(ctx: Context, id: Long) {
        val am = ctx.getSystemService(AlarmManager::class.java)
        am.cancel(pi(ctx, id, 0)); am.cancel(pi(ctx, id, 1))
    }

    suspend fun rescheduleAll(ctx: Context, db: AppDatabase) {
        db.reminderDao().getPendingReal().forEach { schedule(ctx, it) }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val id = intent.getLongExtra(ReminderAlarms.EXTRA_ID, -1L)
        val kind = intent.getIntExtra(ReminderAlarms.EXTRA_KIND, 1)
        if (id <= 0) return
        val c = (ctx.applicationContext as SmartSmsApp).container
        val pending = goAsync()
        c.appScope.launch {
            try {
                val r = c.database.reminderDao().getById(id)
                if (r != null && r.status == ReminderEntity.STATUS_PENDING && !r.isDemo) {
                    val amt = r.amount?.let { " · " + formatMoney(it) } ?: ""
                    Notify.post(
                        ctx, 200_000 + id.toInt(),
                        (if (kind == 0) "Due in 2 days: " else "Due today: ") + r.title,
                        "Amount$amt. Open Smart SMS → Bills to mark it paid."
                    )
                }
            } finally {
                pending.finish()
            }
        }
    }
}
