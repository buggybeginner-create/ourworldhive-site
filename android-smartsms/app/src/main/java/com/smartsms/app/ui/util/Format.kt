package com.smartsms.app.ui.util

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

object Format {
    private val inr: NumberFormat = NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply {
        maximumFractionDigits = 2
        minimumFractionDigits = 0
    }

    fun currency(amount: Double): String = inr.format(amount)

    /** "now", "12m", "3h", "Yesterday", "Mon", "12 Nov". */
    fun shortTime(timestamp: Long, now: Long = System.currentTimeMillis()): String {
        val diff = now - timestamp
        if (diff < 0) return dateTime(timestamp)
        val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
        val hours = TimeUnit.MILLISECONDS.toHours(diff)
        val days = TimeUnit.MILLISECONDS.toDays(diff)
        return when {
            minutes < 1 -> "now"
            minutes < 60 -> "${minutes}m"
            hours < 24 -> "${hours}h"
            days < 2 -> "Yesterday"
            days < 7 -> SimpleDateFormat("EEE", Locale.getDefault()).format(Date(timestamp))
            else -> SimpleDateFormat("d MMM", Locale.getDefault()).format(Date(timestamp))
        }
    }

    /** "in 45m", "in 5h", "in 2d" for a future time. */
    fun shortTimeUntil(timestamp: Long, now: Long = System.currentTimeMillis()): String {
        val diff = timestamp - now
        if (diff <= 0) return "Due now"
        val minutes = TimeUnit.MILLISECONDS.toMinutes(diff)
        val hours = TimeUnit.MILLISECONDS.toHours(diff)
        return when {
            minutes < 60 -> "in ${minutes.coerceAtLeast(1)}m"
            hours < 24 -> "in ${hours}h"
            else -> "in ${TimeUnit.MILLISECONDS.toDays(diff)}d"
        }
    }

    fun dateTime(timestamp: Long): String =
        SimpleDateFormat("d MMM yyyy, h:mm a", Locale.getDefault()).format(Date(timestamp))

    fun time(timestamp: Long): String = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(timestamp))

    fun bytes(size: Long): String = when {
        size < 1024 -> "$size B"
        size < 1024 * 1024 -> String.format(Locale.US, "%.1f KB", size / 1024.0)
        else -> String.format(Locale.US, "%.1f MB", size / (1024.0 * 1024.0))
    }

    fun greeting(now: Long = System.currentTimeMillis()): String {
        val hour = Calendar.getInstance().apply { timeInMillis = now }.get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 5..11 -> "Good morning"
            in 12..16 -> "Good afternoon"
            else -> "Good evening"
        }
    }
}
