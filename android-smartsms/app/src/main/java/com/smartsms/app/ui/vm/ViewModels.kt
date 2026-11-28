package com.smartsms.app.ui.vm

import android.content.ContentResolver
import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.DbState
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.db.BackupHistoryEntity
import com.smartsms.app.data.db.BudgetCategoryEntity
import com.smartsms.app.data.db.CategoryCount
import com.smartsms.app.data.db.ConversationEntity
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.data.db.ScheduledMessageEntity
import com.smartsms.app.data.db.ThemeEntity
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.data.repo.FinanceSummary
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.components.UiState
import com.smartsms.app.sms.SmsSender
import com.smartsms.app.sms.SmsSyncState
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private const val STOP_TIMEOUT = 5_000L

/** Wraps a data flow into Loading → Ready / Error. */
private fun <T> Flow<T>.asUiState(): Flow<UiState<T>> =
    map<T, UiState<T>> { UiState.Ready(it) }.catch { emit(UiState.Error(it.message ?: "Unknown error")) }

private fun <T> Flow<UiState<T>>.stateIn(vm: ViewModel): StateFlow<UiState<T>> =
    stateIn(vm.viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT), UiState.Loading)

/* ------------------------------ App-wide ------------------------------ */

class AppViewModel(private val app: SmartSmsApp) : ViewModel() {
    private val c = app.container
    val dbState: StateFlow<DbState> = c.ready
    val settings: StateFlow<UserSettingsEntity?> = c.settingsRepository.settings
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val themes: StateFlow<List<ThemeEntity>> = c.settingsRepository.themes
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun retryInit() = c.initDatabase()
}

/* ------------------------------ Inbox dashboard ------------------------------ */

data class InboxData(
    val counts: Map<MessageCategory, CategoryCount>,
    val recent: List<ConversationEntity>,
    val pinned: List<ConversationEntity>,
    val monthSpent: Double,
    val upcoming: Int,
    val hasDemo: Boolean
)

class InboxViewModel(app: SmartSmsApp) : ViewModel() {
    private val c = app.container
    private val retry = MutableStateFlow(0)

    @OptIn(ExperimentalCoroutinesApi::class)
    val state: StateFlow<UiState<InboxData>> = retry.flatMapLatest {
        combine(
            c.messageRepository.counts(),
            c.messageRepository.conversations(null),
            c.financeRepository.summary,
            c.scheduleRepository.scheduled
        ) { counts, convs, finance, scheduled ->
            InboxData(
                counts = counts.mapNotNull { cc -> MessageCategory.fromKey(cc.category)?.let { it to cc } }.toMap(),
                recent = convs.filter { !it.isPinned }.take(8),
                pinned = convs.filter { it.isPinned },
                monthSpent = finance.spent,
                upcoming = scheduled.count { it.status == ScheduledMessageEntity.STATUS_PENDING },
                hasDemo = convs.any { it.isDemo }
            )
        }.asUiState()
    }.stateIn(this)

    fun retry() { retry.value++ }

    val sms: StateFlow<SmsSyncState> = c.smsImporter.state
    fun onSmsPermissionResult() = c.onSmsAccessChanged()
}

/* ------------------------------ Search ------------------------------ */

class SearchViewModel(app: SmartSmsApp) : ViewModel() {
    private val repo = app.container.messageRepository
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    @OptIn(ExperimentalCoroutinesApi::class, FlowPreview::class)
    val results: StateFlow<UiState<List<MessageEntity>>> = _query.debounce(200).flatMapLatest { q ->
        if (q.isBlank()) flowOf<UiState<List<MessageEntity>>>(UiState.Ready(emptyList()))
        else repo.search(q.trim()).asUiState()
    }.stateIn(this)

    fun setQuery(q: String) { _query.value = q }
}

/* ------------------------------ Messages / categories ------------------------------ */

class MessagesViewModel(app: SmartSmsApp, handle: SavedStateHandle) : ViewModel() {
    private val repo = app.container.messageRepository
    private val _category = MutableStateFlow(MessageCategory.fromKey(handle.get<String>("cat")))
    val category: StateFlow<MessageCategory?> = _category.asStateFlow()

    @OptIn(ExperimentalCoroutinesApi::class)
    val state: StateFlow<UiState<List<ConversationEntity>>> =
        _category.flatMapLatest { repo.conversations(it).asUiState() }.stateIn(this)

    /** Messages of the chosen folder, used by the OTP folder (codes hidden until tapped). */
    @OptIn(ExperimentalCoroutinesApi::class)
    val messages: StateFlow<UiState<List<MessageEntity>>> =
        _category.flatMapLatest { repo.messages(it).asUiState() }.stateIn(this)

    fun select(cat: MessageCategory?) { _category.value = cat }
    private val db = app.container.database
    fun markAllRead() = viewModelScope.launch { db.messageDao().markAllRead(); db.conversationDao().clearAllUnread() }
    fun togglePin(id: Long) = viewModelScope.launch { repo.togglePin(id) }
}

/* ------------------------------ Conversation thread ------------------------------ */

data class ThreadData(val conversation: ConversationEntity?, val messages: List<MessageEntity>)

class ConversationViewModel(app: SmartSmsApp, handle: SavedStateHandle) : ViewModel() {
    private val repo = app.container.messageRepository
    private val id: Long = handle.get<Long>("id") ?: -1L

    val state: StateFlow<UiState<ThreadData>> =
        combine(repo.conversation(id), repo.thread(id)) { c, m -> ThreadData(c, m) }.asUiState().stateIn(this)

    init { viewModelScope.launch { repo.markRead(id) } }

    fun toggleStar(messageId: Long) = viewModelScope.launch { repo.toggleStar(messageId) }
    fun togglePin(conversationId: Long) = viewModelScope.launch { repo.togglePin(conversationId) }

    private val convDao = app.container.database.conversationDao()
    private val msgDao = app.container.database.messageDao()
    fun setArchived(on: Boolean) = viewModelScope.launch { convDao.setArchived(id, on) }
    fun setBlocked(on: Boolean) = viewModelScope.launch { convDao.setBlocked(id, on) }

    /** Mark as spam, or "Not spam" (the chat then never goes back to Spam by itself). */
    fun setSpam(on: Boolean) = viewModelScope.launch {
        val c = convDao.getById(id) ?: return@launch
        if (on) {
            convDao.setSpam(id, MessageCategory.SPAM.key, false)
            msgDao.markSpam(id)
        } else {
            val back = if (com.smartsms.app.domain.Addresses.canReply(c.address)) MessageCategory.PERSONAL.key else MessageCategory.OFFERS.key
            convDao.setSpam(id, back, true)
            msgDao.recategorize(id, MessageCategory.SPAM.key, back)
        }
    }

    private val appCtx = app.applicationContext
    private val importer = app.container.smsImporter
    private val _sendError = MutableStateFlow<String?>(null)
    val sendError: StateFlow<String?> = _sendError.asStateFlow()
    fun clearSendError() { _sendError.value = null }

    /** Sends [text] to [to]. Android saves it in the phone's SMS store and it then shows in this chat. */
    fun send(to: String, text: String): Boolean = try {
        SmsSender.send(appCtx, to, text)
        importer.importSoon(1200)
        true
    } catch (e: Exception) {
        _sendError.value = e.message ?: "Could not send"
        false
    }
}

/* ------------------------------ New message ------------------------------ */

class NewMessageViewModel(app: SmartSmsApp) : ViewModel() {
    private val appCtx = app.applicationContext
    private val importer = app.container.smsImporter
    fun send(to: String, text: String): Result<Unit> = runCatching {
        SmsSender.send(appCtx, to.trim(), text.trim())
        importer.importSoon(1200)
    }
}

/* ------------------------------ Archived / blocked ------------------------------ */

class ChatListViewModel(app: SmartSmsApp, handle: SavedStateHandle) : ViewModel() {
    private val dao = app.container.database.conversationDao()
    val kind: String = handle.get<String>("kind") ?: "archived"
    val state: StateFlow<UiState<List<ConversationEntity>>> =
        (if (kind == "blocked") dao.observeBlocked() else dao.observeArchived()).asUiState().stateIn(this)
    fun restore(id: Long) = viewModelScope.launch {
        if (kind == "blocked") dao.setBlocked(id, false) else dao.setArchived(id, false)
    }
}

/* ------------------------------ Bills & EMIs ------------------------------ */

class BillsViewModel(app: SmartSmsApp) : ViewModel() {
    private val repo = app.container.reminderRepository
    val state: StateFlow<UiState<List<com.smartsms.app.data.db.ReminderEntity>>> = repo.reminders.asUiState().stateIn(this)
    fun setStatus(id: Long, status: String) = viewModelScope.launch { repo.setStatus(id, status) }
}

/* ------------------------------ Scheduled ------------------------------ */

class ScheduledViewModel(app: SmartSmsApp) : ViewModel() {
    private val repo = app.container.scheduleRepository
    val state: StateFlow<UiState<List<ScheduledMessageEntity>>> = repo.scheduled.asUiState().stateIn(this)

    fun add(recipient: String, body: String, sendAt: Long) = viewModelScope.launch { repo.add(recipient, body, sendAt) }
    fun cancel(item: ScheduledMessageEntity) = viewModelScope.launch { repo.cancel(item) }
    fun delete(id: Long) = viewModelScope.launch { repo.delete(id) }
    fun reschedule() = viewModelScope.launch { repo.reschedule() }
}

/* ------------------------------ Finance ------------------------------ */

class FinanceViewModel(app: SmartSmsApp) : ViewModel() {
    private val repo = app.container.financeRepository
    val state: StateFlow<UiState<FinanceSummary>> = repo.summary.asUiState().stateIn(this)
    fun setLimit(b: BudgetCategoryEntity, limit: Double) = viewModelScope.launch { repo.setLimit(b, limit) }
}

/* ------------------------------ Backup ------------------------------ */

class BackupViewModel(app: SmartSmsApp) : ViewModel() {
    private val repo = app.container.backupRepository
    val history: StateFlow<UiState<List<BackupHistoryEntity>>> = repo.history.asUiState().stateIn(this)

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()
    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun export(resolver: ContentResolver, uri: Uri) = run("Backup saved") { repo.export(resolver, uri) }
    fun import(resolver: ContentResolver, uri: Uri) = run("Backup restored") { repo.import(resolver, uri) }
    fun consumeMessage() { _message.value = null }

    private fun run(okText: String, block: suspend () -> Result<Int>) = viewModelScope.launch {
        _busy.value = true
        val r = block()
        _busy.value = false
        _message.value = r.fold({ "$okText · $it items" }, { "Failed: ${it.message}" })
    }
}

/* ------------------------------ Settings & theme ------------------------------ */

class SettingsViewModel(app: SmartSmsApp) : ViewModel() {
    private val c = app.container
    val settings: StateFlow<UserSettingsEntity?> = c.settingsRepository.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT), null)
    val themes: StateFlow<List<ThemeEntity>> = c.settingsRepository.themes
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT), emptyList())

    fun update(transform: (UserSettingsEntity) -> UserSettingsEntity) =
        viewModelScope.launch { c.settingsRepository.update(transform) }

    val sms: StateFlow<SmsSyncState> = c.smsImporter.state
    val realCount: StateFlow<Int> = c.database.messageDao().observeRealCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT), 0)
    fun onSmsPermissionResult() = c.onSmsAccessChanged()
    fun readAllAgain() = viewModelScope.launch { c.smsImporter.import(full = true) }
    fun refreshNames() = viewModelScope.launch { c.smsImporter.import() }
    fun rescheduleAll() = viewModelScope.launch { c.scheduleRepository.reschedule() }

    fun removeDemo() = viewModelScope.launch { c.demoRepository.remove() }
    fun restoreDemo() = viewModelScope.launch {
        c.demoRepository.restore()
        c.settingsRepository.update { it.copy(showDemoData = true) }
    }
}

/* ------------------------------ Factory ------------------------------ */

object AppViewModelProvider {
    val Factory: ViewModelProvider.Factory = viewModelFactory {
        initializer { AppViewModel(app()) }
        initializer { InboxViewModel(app()) }
        initializer { SearchViewModel(app()) }
        initializer { MessagesViewModel(app(), createSavedStateHandle()) }
        initializer { ConversationViewModel(app(), createSavedStateHandle()) }
        initializer { ScheduledViewModel(app()) }
        initializer { NewMessageViewModel(app()) }
        initializer { ChatListViewModel(app(), createSavedStateHandle()) }
        initializer { BillsViewModel(app()) }
        initializer { FinanceViewModel(app()) }
        initializer { BackupViewModel(app()) }
        initializer { SettingsViewModel(app()) }
    }
}

private fun androidx.lifecycle.viewmodel.CreationExtras.app(): SmartSmsApp =
    this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as SmartSmsApp
