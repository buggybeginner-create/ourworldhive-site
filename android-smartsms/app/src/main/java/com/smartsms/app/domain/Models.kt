package com.smartsms.app.domain

/** Smart inbox categories. [ALL] is a view over every message, not a stored category. */
enum class MessageCategory(val key: String, val label: String) {
    ALL("all", "All messages"),
    PERSONAL("personal", "Personal"),
    TRANSACTIONS("transactions", "Transactions"),
    OFFERS("offers", "Offers"),
    OTP("otp", "OTP");

    companion object {
        val stored: List<MessageCategory> = listOf(PERSONAL, TRANSACTIONS, OFFERS, OTP)
        fun fromKey(key: String?): MessageCategory = entries.firstOrNull { it.key == key } ?: ALL
    }
}

/** Where a record came from. Demo rows are never presented as real SMS. */
enum class DataSource { DEMO, DEVICE }

enum class ThemeMode(val label: String) {
    SYSTEM("System default"),
    LIGHT("Light"),
    DARK("Premium dark"),
    AMOLED("AMOLED black"),
}

enum class FontSize(val label: String, val scale: Float) {
    SMALL("Small", 0.9f),
    MEDIUM("Default", 1.0f),
    LARGE("Large", 1.15f),
    EXTRA_LARGE("Extra large", 1.3f),
}

enum class BubbleStyle(val label: String) {
    ROUNDED("Rounded"),
    SOFT("Soft square"),
    MINIMAL("Minimal"),
}

enum class TransactionType { DEBIT, CREDIT }

enum class ScheduleStatus { PENDING, CANCELLED }

enum class BackupType(val label: String) { LOCAL("Local file"), CLOUD("Cloud") }

enum class BackupStatus { SUCCESS, FAILED }
