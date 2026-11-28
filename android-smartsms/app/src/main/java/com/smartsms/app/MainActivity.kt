package com.smartsms.app

import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.sms.Notify
import com.smartsms.app.sms.Prefs
import com.smartsms.app.ui.components.LocalAuth
import com.smartsms.app.ui.components.toColor
import com.smartsms.app.ui.nav.SmartSmsNavHost
import com.smartsms.app.ui.screens.LockScreen
import com.smartsms.app.ui.theme.SmartSmsTheme
import com.smartsms.app.ui.vm.AppViewModel
import com.smartsms.app.ui.vm.AppViewModelProvider

/** FragmentActivity (a ComponentActivity) so the fingerprint / PIN prompt can be shown. */
class MainActivity : FragmentActivity() {

    private var stoppedAt = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null && Prefs.appLock(this)) container().locked.value = true
        takeOpenRequest(intent)
        setContent {
            val appVm: AppViewModel = viewModel(factory = AppViewModelProvider.Factory)
            val settings by appVm.settings.collectAsStateWithLifecycle()
            val themes by appVm.themes.collectAsStateWithLifecycle()
            val locked by container().locked.collectAsStateWithLifecycle()
            val s = settings ?: UserSettingsEntity()
            val theme = themes.firstOrNull { it.id == s.themeId } ?: themes.firstOrNull()
            SmartSmsTheme(
                settings = s,
                accent = theme?.accentArgb?.toColor() ?: Color(0xFF7C5CFF),
                secondary = theme?.secondaryArgb?.toColor() ?: Color(0xFF22D3EE)
            ) {
                CompositionLocalProvider(LocalAuth provides { title, ok -> authenticate(title, ok) }) {
                    Surface(color = MaterialTheme.colorScheme.background) {
                        Box {
                            SmartSmsNavHost(onRetryInit = appVm::retryInit, openRequests = container().openConversation)
                            if (locked) LockScreen(onUnlock = { authenticate("Unlock Smart SMS") { container().locked.value = false } })
                        }
                    }
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

    override fun onStop() {
        super.onStop()
        stoppedAt = SystemClock.elapsedRealtime()
    }

    /** App Lock: away for more than 30 seconds → locked again. */
    override fun onStart() {
        super.onStart()
        if (Prefs.appLock(this) && stoppedAt > 0 && SystemClock.elapsedRealtime() - stoppedAt > 30_000) {
            container().locked.value = true
        }
    }

    private fun container() = (application as SmartSmsApp).container

    private fun takeOpenRequest(i: Intent?) {
        val id = i?.getLongExtra(Notify.EXTRA_CONVERSATION, -1L) ?: -1L
        if (id > 0) container().openConversation.value = id
    }

    /** Fingerprint, face or the phone's PIN / pattern. Needs a screen lock on the phone. */
    fun authenticate(title: String, onOk: () -> Unit) {
        val how = BIOMETRIC_WEAK or DEVICE_CREDENTIAL
        if (BiometricManager.from(this).canAuthenticate(how) != BiometricManager.BIOMETRIC_SUCCESS) {
            Toast.makeText(this, "Set a screen lock (PIN, pattern or fingerprint) on your phone first.", Toast.LENGTH_LONG).show()
            return
        }
        val prompt = BiometricPrompt(
            this, ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onOk()
            }
        )
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle("Smart SMS")
                .setAllowedAuthenticators(how)
                .build()
        )
    }
}
