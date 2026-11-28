package com.smartsms.app.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.LocalOffer
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.smartsms.app.domain.MessageCategory
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Screen state used by every ViewModel. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Ready<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

@Composable
fun <T> StateContent(
    state: UiState<T>,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    content: @Composable (T) -> Unit
) {
    when (state) {
        is UiState.Loading -> LoadingState(modifier)
        is UiState.Error -> ErrorState(state.message, onRetry, modifier)
        is UiState.Ready -> content(state.data)
    }
}

@Composable
fun LoadingState(modifier: Modifier = Modifier, label: String = "Loading…") {
    Column(
        modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        CircularProgressIndicator(strokeWidth = 3.dp, modifier = Modifier.size(36.dp))
        Spacer(Modifier.height(16.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)?, modifier: Modifier = Modifier) {
    EmptyState(
        icon = Icons.Rounded.ErrorOutline,
        title = "Something went wrong",
        subtitle = message,
        modifier = modifier,
        tint = MaterialTheme.colorScheme.error,
        actionLabel = if (onRetry != null) "Try Again" else null,
        onAction = onRetry
    )
}

@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.primary,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    val pulse = rememberInfiniteTransition(label = "empty")
    val a by pulse.animateFloat(0.55f, 1f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "a")
    Column(
        modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            Modifier.size(88.dp).clip(CircleShape)
                .background(Brush.radialGradient(listOf(tint.copy(alpha = 0.28f), Color.Transparent))),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(40.dp).alpha(a))
        }
        Spacer(Modifier.height(18.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(20.dp))
            Button(onClick = onAction) { Text(actionLabel) }
        }
    }
}

@Composable
fun Avatar(name: String, color: Color, size: Dp = 48.dp) {
    val initials = name.replace("(Demo)", "").trim().split(" ").filter { it.isNotBlank() }
        .take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "#" }
    Box(
        Modifier.size(size).clip(CircleShape)
            .background(Brush.linearGradient(listOf(color, color.copy(alpha = 0.6f)))),
        contentAlignment = Alignment.Center
    ) {
        Text(initials, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    }
}

/** Marks sample rows so they are never mistaken for real SMS. */
@Composable
fun DemoBadge(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(6.dp),
        color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.9f)
    ) {
        Row(Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Science, null, Modifier.size(11.dp), tint = MaterialTheme.colorScheme.onTertiaryContainer)
            Spacer(Modifier.size(3.dp))
            Text("DEMO", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
        }
    }
}

@Composable
fun DemoBanner(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.55f)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Science, null, tint = MaterialTheme.colorScheme.onTertiaryContainer)
            Spacer(Modifier.size(10.dp))
            Text(
                "Sample messages for preview. These are not your real SMS — reading real SMS comes in a later phase. You can hide them in Settings.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onTertiaryContainer
            )
        }
    }
}

@Composable
fun SectionHeader(title: String, modifier: Modifier = Modifier, trailing: @Composable (() -> Unit)? = null) {
    Row(
        modifier.fillMaxWidth().padding(top = 20.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f)
        )
        trailing?.invoke()
    }
}

fun MessageCategory.icon(): ImageVector = when (this) {
    MessageCategory.PERSONAL -> Icons.Rounded.ChatBubble
    MessageCategory.TRANSACTIONS -> Icons.Rounded.AccountBalanceWallet
    MessageCategory.OFFERS -> Icons.Rounded.LocalOffer
    MessageCategory.OTP -> Icons.Rounded.Key
}

fun MessageCategory.tint(): Color = when (this) {
    MessageCategory.PERSONAL -> Color(0xFF7C5CFF)
    MessageCategory.TRANSACTIONS -> Color(0xFF10B981)
    MessageCategory.OFFERS -> Color(0xFFF59E0B)
    MessageCategory.OTP -> Color(0xFF0EA5E9)
}

private val inr: NumberFormat = NumberFormat.getCurrencyInstance(Locale("en", "IN")).apply { maximumFractionDigits = 0 }

fun formatMoney(value: Double): String = inr.format(value)

/** "10:42 am" today, "Yesterday", "Mon", or "12 Nov". */
fun formatTime(ts: Long, now: Long = System.currentTimeMillis()): String {
    val c = Calendar.getInstance().apply { timeInMillis = ts }
    val n = Calendar.getInstance().apply { timeInMillis = now }
    val sameYear = c.get(Calendar.YEAR) == n.get(Calendar.YEAR)
    val dayDiff = n.get(Calendar.DAY_OF_YEAR) - c.get(Calendar.DAY_OF_YEAR)
    return when {
        ts > now -> SimpleDateFormat("d MMM, h:mm a", Locale.getDefault()).format(Date(ts))
        sameYear && dayDiff == 0 -> SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date(ts))
        sameYear && dayDiff == 1 -> "Yesterday"
        sameYear && dayDiff in 2..6 -> SimpleDateFormat("EEE", Locale.getDefault()).format(Date(ts))
        sameYear -> SimpleDateFormat("d MMM", Locale.getDefault()).format(Date(ts))
        else -> SimpleDateFormat("d MMM yyyy", Locale.getDefault()).format(Date(ts))
    }
}

fun formatFull(ts: Long): String = SimpleDateFormat("EEE, d MMM yyyy · h:mm a", Locale.getDefault()).format(Date(ts))

fun Long.toColor(): Color = Color(this.toInt())
