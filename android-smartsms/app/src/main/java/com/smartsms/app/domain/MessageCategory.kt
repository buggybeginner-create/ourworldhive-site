package com.smartsms.app.domain

/** The four message folders. [key] is what is stored in the database. */
enum class MessageCategory(val key: String, val label: String, val description: String) {
    PERSONAL("personal", "Personal", "People you talk to"),
    TRANSACTIONS("transactions", "Transactions", "Bank, UPI and card alerts"),
    OFFERS("offers", "Offers", "Promotions and deals"),
    OTP("otp", "OTP", "One-time codes (hidden until you tap)"),
    SPAM("spam", "Spam", "Scams and suspicious messages · no alerts");

    companion object {
        fun fromKey(key: String?): MessageCategory? = entries.firstOrNull { it.key == key }
    }
}

enum class ThemeMode(val key: String, val label: String) {
    SYSTEM("system", "System"),
    LIGHT("light", "Light"),
    DARK("dark", "Premium Dark"),
    AMOLED("amoled", "AMOLED Black");

    companion object {
        fun fromKey(key: String?): ThemeMode = entries.firstOrNull { it.key == key } ?: DARK
    }
}

enum class BubbleStyle(val key: String, val label: String) {
    ROUNDED("rounded", "Rounded"),
    SOFT("soft", "Soft Square"),
    MINIMAL("minimal", "Minimal");

    companion object {
        fun fromKey(key: String?): BubbleStyle = entries.firstOrNull { it.key == key } ?: ROUNDED
    }
}
