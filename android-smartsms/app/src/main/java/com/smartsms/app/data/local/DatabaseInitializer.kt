package com.smartsms.app.data.local

import androidx.room.withTransaction
import com.smartsms.app.data.local.entity.MessageCategoryEntity
import com.smartsms.app.data.local.entity.ThemeEntity
import com.smartsms.app.data.local.entity.UserSettingsEntity
import com.smartsms.app.domain.MessageCategory

/**
 * Creates the rows the app always needs: default settings, built-in themes and the
 * category table. Safe to call on every launch. Demo data is handled by [DemoDataSeeder].
 */
class DatabaseInitializer(
    private val db: SmartSmsDatabase,
    private val demoDataSeeder: DemoDataSeeder,
) {
    suspend fun initialize() {
        db.withTransaction {
            if (db.themeDao().count() == 0) db.themeDao().insertAll(builtInThemes)
            db.messageCategoryDao().upsertAll(categories)
            if (db.userSettingsDao().get() == null) db.userSettingsDao().upsert(UserSettingsEntity())
        }
        val settings = db.userSettingsDao().get() ?: UserSettingsEntity()
        if (!settings.demoDataSeeded) {
            demoDataSeeder.seed()
            db.userSettingsDao().upsert(settings.copy(demoDataSeeded = true))
        }
    }

    companion object {
        val builtInThemes = listOf(
            ThemeEntity(id = 1, name = "Royal Violet", primaryArgb = 0xFF7C6CF2, secondaryArgb = 0xFF00CEC9),
            ThemeEntity(id = 2, name = "Ocean Blue", primaryArgb = 0xFF3B82F6, secondaryArgb = 0xFF22D3EE),
            ThemeEntity(id = 3, name = "Emerald", primaryArgb = 0xFF10B981, secondaryArgb = 0xFF84CC16),
            ThemeEntity(id = 4, name = "Sunset", primaryArgb = 0xFFF97316, secondaryArgb = 0xFFF43F5E),
            ThemeEntity(id = 5, name = "Rose Gold", primaryArgb = 0xFFE11D74, secondaryArgb = 0xFFF5A3B6),
            ThemeEntity(id = 6, name = "Amber", primaryArgb = 0xFFF59E0B, secondaryArgb = 0xFFFDE047),
        )

        val categories = listOf(
            MessageCategoryEntity(MessageCategory.PERSONAL.key, "Personal", "Friends, family and people you know", 0xFF7C6CF2, 0),
            MessageCategoryEntity(MessageCategory.TRANSACTIONS.key, "Transactions", "Bank, card and UPI alerts", 0xFF10B981, 1),
            MessageCategoryEntity(MessageCategory.OFFERS.key, "Offers", "Promotions, deals and coupons", 0xFFF59E0B, 2),
            MessageCategoryEntity(MessageCategory.OTP.key, "OTP", "One-time passwords and codes", 0xFF3B82F6, 3),
        )
    }
}
