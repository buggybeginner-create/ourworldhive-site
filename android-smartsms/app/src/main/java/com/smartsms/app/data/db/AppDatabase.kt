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
        ThemeEntity::class,
        ReminderEntity::class
    ],
    version = 3,
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
    abstract fun reminderDao(): ReminderDao

    companion object {
        const val NAME = "smart_sms.db"

        fun build(context: Context): AppDatabase =
            Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, NAME)
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                .build()

        /** Block, archive and "not spam" on chats; bill and EMI reminders. */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE conversations ADD COLUMN isBlocked INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE conversations ADD COLUMN isArchived INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE conversations ADD COLUMN notSpam INTEGER NOT NULL DEFAULT 0")
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `reminders` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                        "`messageId` INTEGER, `conversationId` INTEGER, `title` TEXT NOT NULL, `amount` REAL, " +
                        "`dueAt` INTEGER NOT NULL, `status` TEXT NOT NULL, `isDemo` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL)"
                )
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_reminders_messageId` ON `reminders` (`messageId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_reminders_dueAt` ON `reminders` (`dueAt`)")
            }
        }

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
