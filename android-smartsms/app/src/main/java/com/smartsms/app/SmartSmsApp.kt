package com.smartsms.app

import android.app.Application
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SmartSmsApp : Application() {

    lateinit var container: AppContainer
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _initState = MutableStateFlow<InitState>(InitState.Loading)
    /** Progress of local database initialisation, shown by the splash screen. */
    val initState: StateFlow<InitState> = _initState.asStateFlow()

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        initializeDatabase()
    }

    fun initializeDatabase() {
        _initState.value = InitState.Loading
        appScope.launch {
            _initState.value = runCatching { container.databaseInitializer.initialize() }
                .fold(onSuccess = { InitState.Ready }, onFailure = { InitState.Failed(it.message ?: "Database error") })
        }
    }
}

sealed interface InitState {
    data object Loading : InitState
    data object Ready : InitState
    data class Failed(val message: String) : InitState
}
