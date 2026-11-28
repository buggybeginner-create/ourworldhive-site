package com.smartsms.app.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.DemoDataSeeder
import com.smartsms.app.data.local.entity.ThemeEntity
import com.smartsms.app.data.local.entity.UserSettingsEntity
import com.smartsms.app.data.repository.SettingsRepository
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.FontSize
import com.smartsms.app.domain.ThemeMode
import com.smartsms.app.ui.util.UiState
import com.smartsms.app.ui.util.asUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SettingsUi(val settings: UserSettingsEntity, val themes: List<ThemeEntity>)

/** Shared by the Settings and Theme customisation screens. */
class SettingsViewModel(
    private val repository: SettingsRepository,
    private val demoDataSeeder: DemoDataSeeder,
) : ViewModel() {

    val state: StateFlow<UiState<SettingsUi>> =
        combine(repository.settings, repository.themes) { s, t -> SettingsUi(s, t) }
            .asUiState()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private fun update(transform: (UserSettingsEntity) -> UserSettingsEntity) {
        viewModelScope.launch { repository.update(transform) }
    }

    fun setThemeMode(mode: ThemeMode) = update { it.copy(themeMode = mode) }
    fun setAccent(themeId: Long) = update { it.copy(accentThemeId = themeId) }
    fun setFontSize(size: FontSize) = update { it.copy(fontSize = size) }
    fun setBubbleStyle(style: BubbleStyle) = update { it.copy(bubbleStyle = style) }
    fun setShowAvatars(show: Boolean) = update { it.copy(showAvatars = show) }
    fun setCompactMode(compact: Boolean) = update { it.copy(compactMode = compact) }
    fun setShowDemoData(show: Boolean) = update { it.copy(showDemoData = show) }

    /** Deletes all demo rows and inserts a fresh set. Real data is not touched. */
    fun resetDemoData() {
        viewModelScope.launch {
            demoDataSeeder.clear()
            demoDataSeeder.seed()
            repository.update { it.copy(showDemoData = true, demoDataSeeded = true) }
            _message.value = "Demo data has been reset."
        }
    }

    /** Permanently removes demo rows. They are not re-created on next launch. */
    fun deleteDemoData() {
        viewModelScope.launch {
            demoDataSeeder.clear()
            repository.update { it.copy(demoDataSeeded = true) }
            _message.value = "Demo data deleted."
        }
    }

    fun messageShown() {
        _message.value = null
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val c = (this[APPLICATION_KEY] as SmartSmsApp).container
                SettingsViewModel(c.settingsRepository, c.demoDataSeeder)
            }
        }
    }
}
