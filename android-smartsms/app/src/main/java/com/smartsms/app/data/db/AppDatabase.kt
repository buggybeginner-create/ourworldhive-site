package com.smartsms.app.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        MessageEntity::class,
        ConversationEntity::class,
        ContactEntity::class,
        CategoryEntity::class,
        ScheduledMessageEntity::class,
        TransactionEntity::class,
        BudgetCategoryEntity::class,
        BackupHistoryEntity::class,
        UserSettingsEntity::class,
        ThemeEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun messageDao(): MessageDao
    abstract fun conversationDao(): ConversationDao
    abstract fun contactDao(): ContactDao
    abstract fun categoryDao(): CategoryDao
    abstract fun scheduledMessageDao(): ScheduledMessageDao
    abstract fun transactionDao(): TransactionDao
    abstract fun budgetCategoryDao(): BudgetCategoryDao
    abstract fun backupHistoryDao(): BackupHistoryDao
    abstract fun userSettingsDao(): UserSettingsDao
    abstract fun themeDao(): ThemeDao

    companion object {
        const val NAME = "smart_sms.db"

        fun build(context: Context): AppDatabase =
            Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, NAME)
                .build()
    }
}
