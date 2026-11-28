package com.smartsms.app.ui.screens.scheduled

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.data.repository.ScheduledMessageRepository
import com.smartsms.app.data.repository.SettingsRepository
import com.smartsms.app.ui.util.UiState
import com.smartsms.app.ui.util.asUiState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ScheduledViewModel(
    private val repository: ScheduledMessageRepository,
    settings: SettingsRepository,
) : ViewModel() {

    val state: StateFlow<UiState<List<ScheduledMessageEntity>>> =
        settings.settings.map { it.showDemoData }.distinctUntilChanged()
            .flatMapLatest { repository.scheduled(it) }
            .asUiState()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)

    /** Returns an error message, or null when the entry was saved. */
    fun validate(address: String, body: String, at: Long): String? = when {
        address.isBlank() -> "Enter a phone number."
        !address.trim().matches(Regex("""^\+?[0-9 ()-]{3,20}$""")) -> "Enter a valid phone number."
        body.isBlank() -> "Write a message."
        at <= System.currentTimeMillis() -> "Pick a time in the future."
        else -> null
    }

    fun schedule(name: String, address: String, body: String, at: Long) {
        viewModelScope.launch { repository.schedule(name.trim(), address.trim(), body.trim(), at) }
    }

    fun cancel(id: Long) = viewModelScope.launch { repository.cancel(id) }

    fun restore(id: Long) = viewModelScope.launch { repository.restore(id) }

    fun delete(id: Long) = viewModelScope.launch { repository.delete(id) }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val c = (this[APPLICATION_KEY] as SmartSmsApp).container
                ScheduledViewModel(c.scheduledMessageRepository, c.settingsRepository)
            }
        }
    }
}
