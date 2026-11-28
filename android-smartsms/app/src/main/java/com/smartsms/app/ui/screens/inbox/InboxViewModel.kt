package com.smartsms.app.ui.screens.inbox

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.dao.CategoryCount
import com.smartsms.app.data.local.entity.ConversationEntity
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.data.repository.FinanceRepository
import com.smartsms.app.data.repository.MessageRepository
import com.smartsms.app.data.repository.ScheduledMessageRepository
import com.smartsms.app.data.repository.SettingsRepository
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.domain.ScheduleStatus
import com.smartsms.app.domain.TransactionType
import com.smartsms.app.ui.util.UiState
import com.smartsms.app.ui.util.asUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class InboxDashboard(
    val counts: Map<MessageCategory, CategoryCount>,
    val totalMessages: Int,
    val totalUnread: Int,
    val conversations: List<ConversationEntity>,
    val results: List<MessageEntity>,
    val spentLast30Days: Double,
    val nextScheduled: ScheduledMessageEntity?,
    val showsDemoData: Boolean,
)

class InboxViewModel(
    private val messages: MessageRepository,
    private val scheduled: ScheduledMessageRepository,
    private val finance: FinanceRepository,
    settings: SettingsRepository,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _category = MutableStateFlow(MessageCategory.ALL)
    val category: StateFlow<MessageCategory> = _category.asStateFlow()

    private val includeDemo = settings.settings.map { it.showDemoData }.distinctUntilChanged()

    val state: StateFlow<UiState<InboxDashboard>> = includeDemo.flatMapLatest { demo ->
        val results = combine(_query, _category) { q, c -> q to c }
            .flatMapLatest { (q, c) -> messages.messages(c, q, demo) }
        combine(
            messages.categoryCounts(demo),
            messages.recentConversations(demo, limit = 8),
            results,
            scheduled.scheduled(demo),
            finance.transactionsSince(FinanceRepository.windowStart(), demo),
        ) { counts, conversations, found, schedule, transactions ->
            val now = System.currentTimeMillis()
            val all = conversations.isNotEmpty() || counts.isNotEmpty()
            InboxDashboard(
                counts = counts.associateBy { it.category },
                totalMessages = counts.sumOf { it.total },
                totalUnread = counts.sumOf { it.unread },
                conversations = conversations,
                results = found,
                spentLast30Days = transactions.filter { it.type == TransactionType.DEBIT }.sumOf { it.amount },
                nextScheduled = schedule.filter { it.status == ScheduleStatus.PENDING && it.scheduledAt >= now }
                    .minByOrNull { it.scheduledAt },
                showsDemoData = all && (conversations.any { it.source == DataSource.DEMO } || found.any { it.source == DataSource.DEMO }),
            )
        }
    }.asUiState().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)

    fun onQueryChange(value: String) {
        _query.value = value
    }

    fun onCategorySelected(category: MessageCategory) {
        _category.value = category
    }

    fun markRead(message: MessageEntity) {
        viewModelScope.launch { messages.markRead(message) }
    }

    fun toggleStar(message: MessageEntity) {
        viewModelScope.launch { messages.toggleStar(message) }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val c = (this[APPLICATION_KEY] as SmartSmsApp).container
                InboxViewModel(c.messageRepository, c.scheduledMessageRepository, c.financeRepository, c.settingsRepository)
            }
        }
    }
}
