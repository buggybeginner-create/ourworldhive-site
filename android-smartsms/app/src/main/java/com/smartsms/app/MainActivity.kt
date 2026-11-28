package com.smartsms.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsms.app.ui.AppViewModel
import com.smartsms.app.ui.navigation.SmartSmsNavHost
import com.smartsms.app.ui.theme.ChatAppearance
import com.smartsms.app.ui.theme.SmartSmsTheme
import com.smartsms.app.ui.theme.isDarkMode

class MainActivity : ComponentActivity() {

    private val appViewModel: AppViewModel by viewModels { AppViewModel.Factory }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val appearance by appViewModel.appearance.collectAsStateWithLifecycle()
            val settings = appearance.settings
            val dark = isDarkMode(settings.themeMode, isSystemInDarkTheme())

            DisposableEffect(dark) {
                val style = if (dark) {
                    SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                } else {
                    SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
                }
                enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
                onDispose {}
            }

            SmartSmsTheme(
                themeMode = settings.themeMode,
                primary = appearance.accent?.let { Color(it.primaryArgb) } ?: Color(0xFF7C6CF2),
                secondary = appearance.accent?.let { Color(it.secondaryArgb) } ?: Color(0xFF00CEC9),
                fontSize = settings.fontSize,
                chatAppearance = ChatAppearance(settings.bubbleStyle, settings.showAvatars, settings.compactMode),
            ) {
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                    SmartSmsNavHost()
                }
            }
        }
    }
}
