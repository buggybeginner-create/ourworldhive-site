package com.smartsms.app

import android.content.Intent
import android.os.Bundle
import com.smartsms.app.sms.Notify
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.ui.components.toColor
import com.smartsms.app.ui.nav.SmartSmsNavHost
import com.smartsms.app.ui.theme.SmartSmsTheme
import com.smartsms.app.ui.vm.AppViewModel
import com.smartsms.app.ui.vm.AppViewModelProvider

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        takeOpenRequest(intent)
        setContent {
            val appVm: AppViewModel = viewModel(factory = AppViewModelProvider.Factory)
            val settings by appVm.settings.collectAsStateWithLifecycle()
            val themes by appVm.themes.collectAsStateWithLifecycle()
            val s = settings ?: UserSettingsEntity()
            val theme = themes.firstOrNull { it.id == s.themeId } ?: themes.firstOrNull()
            SmartSmsTheme(
                settings = s,
                accent = theme?.accentArgb?.toColor() ?: Color(0xFF7C5CFF),
                secondary = theme?.secondaryArgb?.toColor() ?: Color(0xFF22D3EE)
            ) {
                Surface(color = MaterialTheme.colorScheme.background) {
                    SmartSmsNavHost(onRetryInit = appVm::retryInit, openRequests = container().openConversation)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        takeOpenRequest(intent)
    }

    /** Coming back to the app always checks for SMS that arrived meanwhile. */
    override fun onResume() {
        super.onResume()
        if (container().ready.value == DbState.Ready) container().onSmsAccessChanged()
    }

    private fun container() = (application as SmartSmsApp).container

    private fun takeOpenRequest(i: Intent?) {
        val id = i?.getLongExtra(Notify.EXTRA_CONVERSATION, -1L) ?: -1L
        if (id > 0) container().openConversation.value = id
    }
}
