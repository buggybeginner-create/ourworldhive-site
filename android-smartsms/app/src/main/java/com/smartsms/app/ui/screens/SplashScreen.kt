package com.smartsms.app.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import com.smartsms.app.R
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.DbState
import com.smartsms.app.ui.vm.AppViewModel
import com.smartsms.app.ui.vm.AppViewModelProvider
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onReady: () -> Unit,
    onRetry: () -> Unit,
    vm: AppViewModel = viewModel(factory = AppViewModelProvider.Factory)
) {
    val db by vm.dbState.collectAsStateWithLifecycle()
    val scale = remember { Animatable(0.6f) }
    val fade = remember { Animatable(0f) }
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary

    LaunchedEffect(Unit) {
        fade.animateTo(1f, tween(500))
    }
    LaunchedEffect(Unit) {
        scale.animateTo(1f, tween(700, easing = FastOutSlowInEasing))
    }
    LaunchedEffect(db) {
        if (db is DbState.Ready) {
            delay(900) // let the brand animation finish
            onReady()
        }
    }

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(MaterialTheme.colorScheme.background, primary.copy(alpha = 0.18f)))
        ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            // Same picture as the app icon.
            Box(
                Modifier.size(120.dp).scale(scale.value).clip(RoundedCornerShape(32.dp))
                    .background(Brush.linearGradient(listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9), Color(0xFF1D4ED8))))
            ) {
                Image(painterResource(R.drawable.ic_launcher_foreground), contentDescription = null, modifier = Modifier.fillMaxSize())
            }
            Spacer(Modifier.height(24.dp))
            Text(
                "Smart SMS",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.alpha(fade.value)
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "Your messages, beautifully organised",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.alpha(fade.value)
            )
            Spacer(Modifier.height(36.dp))
            when (val s = db) {
                is DbState.Failed -> {
                    Text(
                        "Could not prepare the app: ${s.reason}",
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 32.dp)
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = onRetry) { Text("Try Again") }
                }
                else -> LinearProgressIndicator(
                    modifier = Modifier.size(width = 120.dp, height = 3.dp).alpha(fade.value),
                    color = secondary,
                    trackColor = Color.White.copy(alpha = 0.08f)
                )
            }
        }
    }
}
