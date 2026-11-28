package com.smartsms.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.smartsms.app.data.local.dao.BackupHistoryDao
import com.smartsms.app.data.local.dao.BudgetCategoryDao
import com.smartsms.app.data.local.dao.ContactDao
import com.smartsms.app.data.local.dao.ConversationDao
import com.smartsms.app.data.local.dao.MessageCategoryDao
import com.smartsms.app.data.local.dao.MessageDao
import com.smartsms.app.data.local.dao.ScheduledMessageDao
import com.smartsms.app.data.local.dao.ThemeDao
import com.smartsms.app.data.local.dao.TransactionDao
import com.smartsms.app.data.local.dao.UserSettingsDao
import com.smartsms.app.data.local.entity.BackupHistoryEntity
import com.smartsms.app.data.local.entity.BudgetCategoryEntity
import com.smartsms.app.data.local.entity.ContactEntity
import com.smartsms.app.data.local.entity.ConversationEntity
import com.smartsms.app.data.local.entity.MessageCategoryEntity
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.data.local.entity.ThemeEntity
import com.smartsms.app.data.local.entity.TransactionEntity
import com.smartsms.app.data.local.entity.UserSettingsEntity

@Database(
    entities = [
        MessageEntity::class,
        ConversationEntity::class,
        ContactEntity::class,
        MessageCategoryEntity::class,
        ScheduledMessageEntity::class,
        TransactionEntity::class,
        BudgetCategoryEntity::class,
        BackupHistoryEntity::class,
        UserSettingsEntity::class,
        ThemeEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class SmartSmsDatabase : RoomDatabase() {
    abstract fun messageDao(): MessageDao
    abstract fun conversationDao(): ConversationDao
    abstract fun contactDao(): ContactDao
    abstract fun messageCategoryDao(): MessageCategoryDao
    abstract fun scheduledMessageDao(): ScheduledMessageDao
    abstract fun transactionDao(): TransactionDao
    abstract fun budgetCategoryDao(): BudgetCategoryDao
    abstract fun backupHistoryDao(): BackupHistoryDao
    abstract fun userSettingsDao(): UserSettingsDao
    abstract fun themeDao(): ThemeDao

    companion object {
        private const val NAME = "smart_sms.db"

        fun build(context: Context): SmartSmsDatabase =
            Room.databaseBuilder(context.applicationContext, SmartSmsDatabase::class.java, NAME)
                // Phase 1 has no released schema yet; later phases must add real migrations.
                .fallbackToDestructiveMigration()
                .build()
    }
}
