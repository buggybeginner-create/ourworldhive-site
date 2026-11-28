package com.smartsms.app.data.repo

import com.smartsms.app.data.db.AppDatabase
import com.smartsms.app.data.db.BudgetCategoryEntity
import com.smartsms.app.data.db.CategoryCount
import com.smartsms.app.data.db.ConversationEntity
import com.smartsms.app.data.db.DemoSeeder
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.data.db.ScheduledMessageEntity
import com.smartsms.app.data.db.ThemeEntity
import com.smartsms.app.data.db.TransactionEntity
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.sms.ScheduleAlarms
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import java.util.Calendar

class SettingsRepository(private val db: AppDatabase) {
    val settings: Flow<UserSettingsEntity> =
        db.userSettingsDao().observe().map { it ?: UserSettingsEntity() }

    val themes: Flow<List<ThemeEntity>> = db.themeDao().observeAll()

    /** Emits only when the "show demo data" switch changes. */
    val showDemo: Flow<Boolean> = settings.map { it.showDemoData }.distinctUntilChanged()

    suspend fun update(transform: (UserSettingsEntity) -> UserSettingsEntity) {
        val current = db.userSettingsDao().get() ?: UserSettingsEntity()
        db.userSettingsDao().upsert(transform(current))
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class MessageRepository(private val db: AppDatabase, private val settings: SettingsRepository) {

    fun conversations(category: MessageCategory?): Flow<List<ConversationEntity>> =
        settings.showDemo.flatMapLatest { demo ->
            if (category == null) db.conversationDao().observeAll(demo)
            else db.conversationDao().observeByCategory(category.key, demo)
        }

    fun messages(category: MessageCategory?): Flow<List<MessageEntity>> =
        settings.showDemo.flatMapLatest { demo ->
            if (category == null) db.messageDao().observeAll(demo)
            else db.messageDao().observeByCategory(category.key, demo)
        }

    fun counts(): Flow<List<CategoryCount>> =
        settings.showDemo.flatMapLatest { db.messageDao().observeCounts(it) }

    fun search(query: String): Flow<List<MessageEntity>> =
        settings.showDemo.flatMapLatest { db.messageDao().search(query, it) }

    fun conversation(id: Long): Flow<ConversationEntity?> = db.conversationDao().observeById(id)

    fun thread(id: Long): Flow<List<MessageEntity>> = db.messageDao().observeThread(id)

    suspend fun markRead(conversationId: Long) {
        db.messageDao().markThreadRead(conversationId)
        db.conversationDao().clearUnread(conversationId)
    }

    suspend fun togglePin(conversationId: Long) = db.conversationDao().togglePin(conversationId)

    suspend fun toggleStar(messageId: Long) = db.messageDao().toggleStar(messageId)
}

class ScheduleRepository(
    private val ctx: android.content.Context,
    private val db: AppDatabase,
    private val settings: SettingsRepository
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    val scheduled: Flow<List<ScheduledMessageEntity>> =
        settings.showDemo.flatMapLatest { db.scheduledMessageDao().observeAll(it) }

    suspend fun add(recipient: String, body: String, sendAt: Long) {
        val item = ScheduledMessageEntity(
            recipient = recipient.trim(),
            body = body.trim(),
            sendAt = sendAt,
            createdAt = System.currentTimeMillis(),
            isDemo = false
        )
        val id = db.scheduledMessageDao().insert(item)
        ScheduleAlarms.schedule(ctx, item.copy(id = id))
    }

    suspend fun cancel(item: ScheduledMessageEntity) {
        ScheduleAlarms.cancel(ctx, item.id)
        db.scheduledMessageDao().update(item.copy(status = ScheduledMessageEntity.STATUS_CANCELLED))
    }

    suspend fun delete(id: Long) {
        ScheduleAlarms.cancel(ctx, id)
        db.scheduledMessageDao().delete(id)
    }

    /** Puts every waiting message on the clock again, e.g. after exact timing was allowed. */
    suspend fun reschedule() = ScheduleAlarms.rescheduleAll(ctx, db)
}

data class BudgetUsage(val budget: BudgetCategoryEntity, val spent: Double) {
    val fraction: Float get() = if (budget.monthlyLimit <= 0) 0f else (spent / budget.monthlyLimit).toFloat()
}

data class FinanceSummary(
    val spent: Double,
    val received: Double,
    val budgets: List<BudgetUsage>,
    val recent: List<TransactionEntity>,
    val hasDemo: Boolean
)

class FinanceRepository(private val db: AppDatabase, private val settings: SettingsRepository) {

    private fun monthStart(): Long = Calendar.getInstance().apply {
        set(Calendar.DAY_OF_MONTH, 1)
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    @OptIn(ExperimentalCoroutinesApi::class)
    val summary: Flow<FinanceSummary> = settings.showDemo.flatMapLatest { demo ->
        // Last 30 days, so the sample data always shows something whatever the date.
        val from = minOf(monthStart(), System.currentTimeMillis() - 30L * 24 * 60 * 60 * 1000)
        kotlinx.coroutines.flow.combine(
            db.transactionDao().observeSince(from, demo),
            db.budgetCategoryDao().observeAll()
        ) { tx, budgets ->
            FinanceSummary(
                spent = tx.filter { it.isDebit }.sumOf { it.amount },
                received = tx.filter { !it.isDebit }.sumOf { it.amount },
                budgets = budgets.map { b ->
                    BudgetUsage(b, tx.filter { it.isDebit && it.budgetCategoryId == b.id }.sumOf { it.amount })
                },
                recent = tx.take(20),
                hasDemo = tx.any { it.isDemo }
            )
        }
    }

    suspend fun setLimit(budget: BudgetCategoryEntity, limit: Double) =
        db.budgetCategoryDao().update(budget.copy(monthlyLimit = limit))
}

class DemoRepository(private val db: AppDatabase) {
    suspend fun remove() = DemoSeeder.removeDemo(db)
    suspend fun restore() {
        DemoSeeder.removeDemo(db)
        DemoSeeder.seedDemo(db)
    }
}

class ReminderRepository(
    private val ctx: android.content.Context,
    private val db: AppDatabase,
    private val settings: SettingsRepository
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    val reminders: Flow<List<com.smartsms.app.data.db.ReminderEntity>> =
        settings.showDemo.flatMapLatest { db.reminderDao().observeAll(it) }

    suspend fun setStatus(id: Long, status: String) {
        com.smartsms.app.sms.ReminderAlarms.cancel(ctx, id)
        db.reminderDao().setStatus(id, status)
        if (status == com.smartsms.app.data.db.ReminderEntity.STATUS_PENDING) {
            db.reminderDao().getById(id)?.let { com.smartsms.app.sms.ReminderAlarms.schedule(ctx, it) }
        }
    }
}
