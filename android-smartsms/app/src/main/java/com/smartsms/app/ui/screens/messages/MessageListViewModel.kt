package com.smartsms.app.ui.screens.messages

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.data.repository.MessageRepository
import com.smartsms.app.data.repository.SettingsRepository
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.navigation.Routes
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

enum class MessageFilter(val label: String) { ALL("All"), UNREAD("Unread"), STARRED("Starred") }

/** Backs the All messages screen and each category screen (Personal, Transactions, Offers, OTP). */
class MessageListViewModel(
    savedStateHandle: SavedStateHandle,
    private val messages: MessageRepository,
    settings: SettingsRepository,
) : ViewModel() {

    val category: MessageCategory = MessageCategory.fromKey(savedStateHandle.get<String>(Routes.ARG_CATEGORY))

    private val _query = MutableStateFlow(savedStateHandle.get<String>(Routes.ARG_QUERY).orEmpty())
    val query: StateFlow<String> = _query.asStateFlow()

    private val _filter = MutableStateFlow(MessageFilter.ALL)
    val filter: StateFlow<MessageFilter> = _filter.asStateFlow()

    private val includeDemo = settings.settings.map { it.showDemoData }.distinctUntilChanged()

    val state: StateFlow<UiState<List<MessageEntity>>> =
        combine(includeDemo, _query) { demo, q -> demo to q }
            .flatMapLatest { (demo, q) -> messages.messages(category, q, demo) }
            .combine(_filter) { list, f ->
                when (f) {
                    MessageFilter.ALL -> list
                    MessageFilter.UNREAD -> list.filter { !it.isRead }
                    MessageFilter.STARRED -> list.filter { it.isStarred }
                }
            }
            .asUiState()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)

    fun onQueryChange(value: String) {
        _query.value = value
    }

    fun onFilterChange(value: MessageFilter) {
        _filter.value = value
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
                MessageListViewModel(createSavedStateHandle(), c.messageRepository, c.settingsRepository)
            }
        }
    }
}
