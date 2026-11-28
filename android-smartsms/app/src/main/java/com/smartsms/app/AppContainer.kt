package com.smartsms.app

import android.content.Context
import com.smartsms.app.data.local.DatabaseInitializer
import com.smartsms.app.data.local.DemoDataSeeder
import com.smartsms.app.data.local.SmartSmsDatabase
import com.smartsms.app.data.repository.BackupRepository
import com.smartsms.app.data.repository.FinanceRepository
import com.smartsms.app.data.repository.MessageRepository
import com.smartsms.app.data.repository.ScheduledMessageRepository
import com.smartsms.app.data.repository.SettingsRepository

/** Simple manual dependency container, created once by [SmartSmsApp]. */
class AppContainer(context: Context) {
    private val database = SmartSmsDatabase.build(context)

    val demoDataSeeder = DemoDataSeeder(database)
    val databaseInitializer = DatabaseInitializer(database, demoDataSeeder)

    val settingsRepository = SettingsRepository(database.userSettingsDao(), database.themeDao())
    val messageRepository = MessageRepository(
        database.messageDao(),
        database.conversationDao(),
        database.contactDao(),
        database.messageCategoryDao(),
    )
    val scheduledMessageRepository = ScheduledMessageRepository(database.scheduledMessageDao())
    val financeRepository = FinanceRepository(database.transactionDao(), database.budgetCategoryDao())
    val backupRepository = BackupRepository(context.applicationContext, database)
}
