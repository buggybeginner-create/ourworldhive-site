package com.smartsms.app.domain

import java.util.Calendar
import java.util.TimeZone

data class DueInfo(val dueAt: Long, val amount: Double?, val title: String)

/**
 * Finds a bill / EMI / credit-card due date in a message, e.g.
 * "Total Amt Due Rs.4,250.00 Due Date 05-DEC-26" or "EMI of Rs 3,999 is due on 7 Dec".
 * The due time is 9:00 in the morning of that day.
 */
object DueParser {

    private val trigger = Regex(
        "\\b(due|emi|payable|pay by|last date|bill amount|bill of|amt due|amount due|statement)\\b",
        RegexOption.IGNORE_CASE
    )
    private val alreadyPaid = Regex(
        "(received (your |the )?payment|payment (of .{0,30})?(has been )?received|thank you for (your |the )?payment|" +
            "has been paid|successfully paid|payment successful|is credited)",
        RegexOption.IGNORE_CASE
    )
    private val months = listOf("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
    private const val MON = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*"

    private val numeric = Regex("\\b(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{2,4})\\b")
    private val dayMonth = Regex("\\b(\\d{1,2})(?:st|nd|rd|th)?[-\\s]?$MON[-,\\s]*(\\d{4}|\\d{2}(?!\\d))?", RegexOption.IGNORE_CASE)
    private val monthDay = Regex("\\b$MON\\.?\\s(\\d{1,2})(?:st|nd|rd|th)?,?\\s?(\\d{4})?", RegexOption.IGNORE_CASE)
    private val amountRe = Regex("(?:rs\\.?|inr|₹)\\s?([\\d,]+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)

    private data class Found(val at: Int, val millis: Long)

    fun parse(sender: String, body: String, received: Long, tz: TimeZone = TimeZone.getDefault()): DueInfo? {
        val t = trigger.find(body) ?: return null
        if (alreadyPaid.containsMatchIn(body)) return null

        val dates = ArrayList<Found>()
        numeric.findAll(body).forEach { m ->
            val (d, mo, y) = m.destructured
            build(d.toInt(), mo.toInt() - 1, y, received, tz)?.let { dates += Found(m.range.first, it) }
        }
        dayMonth.findAll(body).forEach { m ->
            val mon = monthIndex(m.groupValues[2]) ?: return@forEach
            build(m.groupValues[1].toInt(), mon, m.groupValues[3], received, tz)?.let { dates += Found(m.range.first, it) }
        }
        monthDay.findAll(body).forEach { m ->
            val mon = monthIndex(m.groupValues[1]) ?: return@forEach
            build(m.groupValues[2].toInt(), mon, m.groupValues[3], received, tz)?.let { dates += Found(m.range.first, it) }
        }
        // A due date is not in the past (1 day of slack) and not more than ~4 months away.
        val lo = received - 24L * 3600_000
        val hi = received + 125L * 24 * 3600_000
        val ok = dates.filter { it.millis in lo..hi }
        if (ok.isEmpty()) return null
        // Prefer the date written closest after the word "due"/"EMI"/...
        val pick = ok.filter { it.at >= t.range.first }.minByOrNull { it.at - t.range.first }
            ?: ok.minByOrNull { kotlin.math.abs(it.at - t.range.first) }!!

        val amount = amountRe.findAll(body)
            .map { it.range.first to it.groupValues[1].replace(",", "").toDoubleOrNull() }
            .filter { it.second != null && it.second!! > 0 }
            .minByOrNull { kotlin.math.abs(it.first - t.range.first) }?.second

        val lower = body.lowercase()
        val kind = when {
            "emi" in lower -> "EMI"
            "card" in lower -> "Credit Card Bill"
            "loan" in lower -> "Loan Payment"
            "recharge" in lower || "prepaid" in lower || "postpaid" in lower -> "Mobile Bill"
            "electric" in lower || "power" in lower -> "Electricity Bill"
            else -> "Bill"
        }
        return DueInfo(pick.millis, amount, "$kind · ${Addresses.key(sender)}")
    }

    private fun monthIndex(s: String): Int? {
        val k = s.lowercase().take(3)
        return months.indexOf(k).takeIf { it >= 0 }
    }

    /** Day, 0-based month and an optional year (2 or 4 digits); a missing year means the next such date. */
    private fun build(day: Int, month: Int, yearText: String, received: Long, tz: TimeZone): Long? {
        if (day !in 1..31 || month !in 0..11) return null
        val c = Calendar.getInstance(tz).apply { timeInMillis = received }
        val year = when {
            yearText.length == 4 -> yearText.toInt()
            yearText.length == 2 -> 2000 + yearText.toInt()
            else -> c.get(Calendar.YEAR)
        }
        val d = Calendar.getInstance(tz).apply {
            clear(); isLenient = false
            set(year, month, day, 9, 0, 0)
        }
        val millis = runCatching { d.timeInMillis }.getOrNull() ?: return null
        if (yearText.isEmpty() && millis < received - 24L * 3600_000) {
            d.add(Calendar.YEAR, 1)
            return d.timeInMillis
        }
        return millis
    }
}
