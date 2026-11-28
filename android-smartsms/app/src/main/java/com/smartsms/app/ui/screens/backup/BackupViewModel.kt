package com.smartsms.app.ui.screens.backup

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.entity.BackupHistoryEntity
import com.smartsms.app.data.repository.BackupRepository
import com.smartsms.app.ui.util.UiState
import com.smartsms.app.ui.util.asUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

sealed interface BackupAction {
    data object Idle : BackupAction
    data object Running : BackupAction
    data class Done(val entry: BackupHistoryEntity) : BackupAction
    data class Failed(val message: String) : BackupAction
}

class BackupViewModel(private val repository: BackupRepository) : ViewModel() {

    val history: StateFlow<UiState<List<BackupHistoryEntity>>> =
        repository.history.asUiState().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)

    private val _action = MutableStateFlow<BackupAction>(BackupAction.Idle)
    val action: StateFlow<BackupAction> = _action.asStateFlow()

    fun backupNow() {
        if (_action.value == BackupAction.Running) return
        _action.value = BackupAction.Running
        viewModelScope.launch {
            _action.value = repository.createLocalBackup().fold(
                onSuccess = { BackupAction.Done(it) },
                onFailure = { BackupAction.Failed(it.message ?: "Backup failed") },
            )
        }
    }

    fun dismissResult() {
        _action.value = BackupAction.Idle
    }

    fun delete(entry: BackupHistoryEntity) {
        viewModelScope.launch { repository.delete(entry) }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                BackupViewModel((this[APPLICATION_KEY] as SmartSmsApp).container.backupRepository)
            }
        }
    }
}
