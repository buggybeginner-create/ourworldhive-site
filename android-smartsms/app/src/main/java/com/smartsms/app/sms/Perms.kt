package com.smartsms.app.sms

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat

object Perms {
    /** Asked together on the "Show Your Real SMS" card. Contacts is optional (names only). */
    val READ_GROUP: Array<String> =
        if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_CONTACTS, Manifest.permission.POST_NOTIFICATIONS)
        else arrayOf(Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_CONTACTS)

    /** Asked the first time the user sends or schedules a message. */
    val SEND_GROUP: Array<String> =
        if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.SEND_SMS, Manifest.permission.POST_NOTIFICATIONS)
        else arrayOf(Manifest.permission.SEND_SMS)

    fun has(ctx: Context, p: String) = ContextCompat.checkSelfPermission(ctx, p) == PackageManager.PERMISSION_GRANTED
    fun canRead(ctx: Context) = has(ctx, Manifest.permission.READ_SMS)
    fun canSend(ctx: Context) = has(ctx, Manifest.permission.SEND_SMS)
    fun canContacts(ctx: Context) = has(ctx, Manifest.permission.READ_CONTACTS)
    fun canNotify(ctx: Context) = Build.VERSION.SDK_INT < 33 || has(ctx, Manifest.permission.POST_NOTIFICATIONS)

    /** Exact alarms: always on before Android 12; on 12+ the user may have to allow it. */
    fun canExact(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < 31 || ctx.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

    fun appSettings(ctx: Context): Intent =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", ctx.packageName, null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    fun exactAlarmSettings(ctx: Context): Intent =
        if (Build.VERSION.SDK_INT >= 31)
            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.fromParts("package", ctx.packageName, null))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        else appSettings(ctx)
}
