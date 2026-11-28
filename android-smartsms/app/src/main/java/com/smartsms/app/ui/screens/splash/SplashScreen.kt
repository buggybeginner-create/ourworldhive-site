package com.smartsms.app.ui.screens.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Chat
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartsms.app.InitState
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.ui.components.ErrorState
import kotlinx.coroutines.delay

/** Branded splash. Waits for local database initialisation, then opens the inbox. */
@Composable
fun SplashScreen(onFinished: () -> Unit) {
    val app = LocalContext.current.applicationContext as SmartSmsApp
    val initState by app.initState.collectAsStateWithLifecycle()
    val colors = MaterialTheme.colorScheme

    val logoScale = remember { Animatable(0.6f) }
    val textAlpha = remember { Animatable(0f) }
    val glow = rememberInfiniteTransition(label = "glow")
    val glowAlpha by glow.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing), RepeatMode.Reverse),
        label = "glowAlpha",
    )

    LaunchedEffect(Unit) {
        logoScale.animateTo(1f, tween(650, easing = FastOutSlowInEasing))
        textAlpha.animateTo(1f, tween(400))
    }

    LaunchedEffect(initState) {
        if (initState == InitState.Ready) {
            delay(900)
            onFinished()
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFF0E0F1A), Color(0xFF1A1440), Color(0xFF0E0F1A)))),
        contentAlignment = Alignment.Center,
    ) {
        val failed = initState as? InitState.Failed
        if (failed != null) {
            ErrorState(message = "Could not prepare the local database: ${failed.message}", onRetry = app::initializeDatabase)
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(contentAlignment = Alignment.Center) {
                    Box(
                        Modifier
                            .size(150.dp)
                            .alpha(glowAlpha)
                            .background(Brush.radialGradient(listOf(colors.primary.copy(alpha = 0.6f), Color.Transparent)), RoundedCornerShape(75.dp)),
                    )
                    Box(
                        Modifier
                            .size(96.dp)
                            .scale(logoScale.value)
                            .background(Brush.linearGradient(listOf(colors.primary, colors.secondary)), RoundedCornerShape(30.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.AutoMirrored.Rounded.Chat, contentDescription = null, tint = Color.White, modifier = Modifier.size(48.dp))
                    }
                }
                Spacer(Modifier.height(24.dp))
                Column(Modifier.alpha(textAlpha.value), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Smart SMS", style = MaterialTheme.typography.headlineLarge, color = Color.White)
                    Spacer(Modifier.height(6.dp))
                    Text("Your messages, beautifully organised", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.7f))
                }
            }
            Column(
                Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                LinearProgressIndicator(Modifier.width(120.dp), color = colors.primary, trackColor = Color.White.copy(alpha = 0.12f))
                Text("Preparing your inbox", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.6f))
            }
        }
    }
}
