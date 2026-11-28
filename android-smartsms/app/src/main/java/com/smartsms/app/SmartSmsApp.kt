package com.smartsms.app

import android.app.Application
import com.smartsms.app.data.db.AppDatabase
import com.smartsms.app.data.db.DemoSeeder
import com.smartsms.app.data.db.UserSettingsEntity
import androidx.room.withTransaction
import com.smartsms.app.data.repo.BackupRepository
import com.smartsms.app.data.repo.DemoRepository
import com.smartsms.app.data.repo.FinanceRepository
import com.smartsms.app.data.repo.MessageRepository
import com.smartsms.app.data.repo.ScheduleRepository
import com.smartsms.app.data.repo.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.smartsms.app.sms.Perms
import com.smartsms.app.sms.ScheduleAlarms
import com.smartsms.app.sms.SmsImporter

/** Simple manual dependency container (no DI framework needed for Phase 1). */
class AppContainer(app: Application) {
    val database: AppDatabase = AppDatabase.build(app)
    val settingsRepository = SettingsRepository(database)
    val messageRepository = MessageRepository(database, settingsRepository)
    /** Long-lived scope for background work (imports, receivers). */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val smsImporter = SmsImporter(app, database, appScope)
    val scheduleRepository = ScheduleRepository(app, database, settingsRepository)
    val financeRepository = FinanceRepository(database, settingsRepository)
    val backupRepository = BackupRepository(database)
    val demoRepository = DemoRepository(database)

    private val _ready = MutableStateFlow<DbState>(DbState.Loading)
    /** The splash screen waits for this before opening the inbox. */
    val ready: StateFlow<DbState> = _ready.asStateFlow()

    private val appContext = app.applicationContext

    fun initDatabase() {
        _ready.value = DbState.Loading
        appScope.launch {
            _ready.value = runCatching {
                // One transaction: a half-finished first start is rolled back and redone next time.
                database.withTransaction {
                    if (database.userSettingsDao().get() == null) {
                        DemoSeeder.seedDefaults(database)
                        DemoSeeder.seedDemo(database)
                        database.userSettingsDao().upsert(UserSettingsEntity())
                    }
                }
            }.fold({ DbState.Ready }, { DbState.Failed(it.message ?: "Database could not be opened") })
            if (_ready.value == DbState.Ready) {
                runCatching { ScheduleAlarms.rescheduleAll(appContext, database) }
                onSmsAccessChanged()
            }
        }
    }

    /** Call after the user allows (or re-allows) SMS access. */
    fun onSmsAccessChanged() {
        if (!Perms.canRead(appContext)) return
        smsImporter.startWatching()
        appScope.launch { smsImporter.import() }
    }
}

sealed interface DbState {
    data object Loading : DbState
    data object Ready : DbState
    data class Failed(val reason: String) : DbState
}

class SmartSmsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        container.initDatabase()
    }
}
