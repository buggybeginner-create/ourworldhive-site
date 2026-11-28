package com.smartsms.app.sms

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.db.ScheduledMessageEntity
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private fun Context.container() = (applicationContext as SmartSmsApp).container

/** Runs [block] off the main thread and keeps the receiver alive until it ends. */
private fun BroadcastReceiver.work(ctx: Context, block: suspend () -> Unit) {
    val pending = goAsync()
    ctx.container().appScope.launch {
        try { block() } finally { pending.finish() }
    }
}

/** A new SMS arrived: your normal SMS app saves it; we read it a moment later. */
class SmsReceivedReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        work(ctx) {
            delay(2500)
            ctx.container().smsImporter.import()
        }
    }
}

/** Fires at the scheduled time and sends the message. */
class ScheduledSendReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val id = intent.getLongExtra(ScheduleAlarms.EXTRA_ID, -1L)
        if (id <= 0) return
        work(ctx) {
            val dao = ctx.container().database.scheduledMessageDao()
            val item = dao.getById(id) ?: return@work
            if (item.isDemo || item.status != ScheduledMessageEntity.STATUS_PENDING) return@work
            if (!Perms.canSend(ctx)) {
                dao.update(item.copy(status = ScheduledMessageEntity.STATUS_FAILED, error = "Sending SMS is not allowed for Smart SMS"))
                Notify.post(ctx, id.toInt(), "Scheduled message not sent", "To ${item.recipient}: allow Smart SMS to send SMS, then schedule it again.")
                return@work
            }
            dao.update(item.copy(status = ScheduledMessageEntity.STATUS_SENDING))
            try {
                SmsSender.send(ctx, item.recipient, item.body, item.id)
            } catch (e: Exception) {
                dao.update(item.copy(status = ScheduledMessageEntity.STATUS_FAILED, error = e.message ?: "Could not send"))
                Notify.post(ctx, id.toInt(), "Scheduled message not sent", "To ${item.recipient}: ${e.message ?: "could not send"}")
            }
        }
    }
}

/** Android reports whether a message left the phone. */
class SentReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val ok = resultCode == Activity.RESULT_OK
        val why = reason(resultCode)
        val id = intent.getLongExtra(SmsSender.EXTRA_SCHEDULED_ID, -1L)
        val to = intent.getStringExtra(SmsSender.EXTRA_TO).orEmpty()
        work(ctx) {
            if (id > 0) {
                val dao = ctx.container().database.scheduledMessageDao()
                val item = dao.getById(id)
                if (item != null && item.status != ScheduledMessageEntity.STATUS_FAILED) {
                    if (ok) {
                        if (item.status != ScheduledMessageEntity.STATUS_SENT) {
                            dao.update(item.copy(status = ScheduledMessageEntity.STATUS_SENT, sentAt = System.currentTimeMillis(), error = null))
                            Notify.post(ctx, id.toInt(), "Scheduled message sent", "To ${item.recipient}")
                        }
                    } else {
                        dao.update(item.copy(status = ScheduledMessageEntity.STATUS_FAILED, error = why))
                        Notify.post(ctx, id.toInt(), "Scheduled message not sent", "To ${item.recipient}: $why")
                    }
                }
            } else if (!ok) {
                Notify.post(ctx, to.hashCode(), "Message not sent", "To $to: $why")
            }
            ctx.container().smsImporter.importSoon()
        }
    }

    private fun reason(code: Int): String = when (code) {
        Activity.RESULT_OK -> ""
        SmsManager.RESULT_ERROR_NO_SERVICE -> "No mobile signal"
        SmsManager.RESULT_ERROR_RADIO_OFF -> "Airplane mode is on or the SIM is off"
        SmsManager.RESULT_ERROR_NULL_PDU, SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "The network did not accept the message"
        else -> "Sending failed (code $code)"
    }
}

/** Puts scheduled messages back after a restart or an app update. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val a = intent.action
        if (a != Intent.ACTION_BOOT_COMPLETED && a != Intent.ACTION_MY_PACKAGE_REPLACED) return
        work(ctx) { ScheduleAlarms.rescheduleAll(ctx, ctx.container().database) }
    }
}
