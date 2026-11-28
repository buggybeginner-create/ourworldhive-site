package com.smartsms.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.entity.ThemeEntity
import com.smartsms.app.data.local.entity.UserSettingsEntity
import com.smartsms.app.data.repository.SettingsRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class AppearanceState(val settings: UserSettingsEntity, val accent: ThemeEntity?)

/** Feeds the app-wide theme (mode, accent, font size, chat appearance) from Room. */
class AppViewModel(repository: SettingsRepository) : ViewModel() {
    val appearance: StateFlow<AppearanceState> =
        combine(repository.settings, repository.themes) { settings, themes ->
            AppearanceState(settings, themes.firstOrNull { it.id == settings.accentThemeId })
        }.stateIn(viewModelScope, SharingStarted.Eagerly, AppearanceState(UserSettingsEntity(), null))

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer { AppViewModel((this[APPLICATION_KEY] as SmartSmsApp).container.settingsRepository) }
        }
    }
}
