package com.smartsms.app.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

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
    version = 2,
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
                .addMigrations(MIGRATION_1_2)
                .build()

        /** Phase 2: links rows to the phone's SMS store and records the result of scheduled sends. */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE messages ADD COLUMN smsId INTEGER")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_messages_smsId ON messages (smsId)")
                db.execSQL("ALTER TABLE scheduled_messages ADD COLUMN sentAt INTEGER")
                db.execSQL("ALTER TABLE scheduled_messages ADD COLUMN error TEXT")
                db.execSQL("ALTER TABLE user_settings ADD COLUMN lastSmsId INTEGER NOT NULL DEFAULT 0")
            }
        }
    }
}
