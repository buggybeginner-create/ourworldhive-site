package com.smartsms.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Inbox
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.sms.SmsSyncState
import com.smartsms.app.ui.components.DemoBanner
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatMoney
import com.smartsms.app.ui.components.icon
import com.smartsms.app.ui.components.tint
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.nav.Routes
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.InboxData
import com.smartsms.app.ui.vm.InboxViewModel
import java.util.Calendar

@Composable
fun InboxScreen(nav: Navigator, vm: InboxViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val state by vm.state.collectAsStateWithLifecycle()
    val sms by vm.sms.collectAsStateWithLifecycle()
    Box(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.statusBars)) {
        StateContent(state, onRetry = vm::retry) { data -> InboxContent(data, nav, sms, vm::onSmsPermissionResult) }
    }
}

private fun greeting(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..11 -> "Good morning"
    in 12..16 -> "Good afternoon"
    else -> "Good evening"
}

@Composable
private fun InboxContent(d: InboxData, nav: Navigator, sms: SmsSyncState, onSmsGranted: () -> Unit) {
    val totalUnread = d.counts.values.sumOf { it.unread }
    LazyColumn(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(greeting(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Smart SMS", style = MaterialTheme.typography.headlineMedium)
                }
                IconButton(onClick = { nav.open(Routes.COMPOSE) }) { Icon(Icons.Rounded.Edit, "New message") }
                IconButton(onClick = { nav.open(Routes.SCHEDULED) }) { Icon(Icons.Rounded.Schedule, "Scheduled messages") }
            }
            Spacer(Modifier.height(12.dp))
            SearchPill { nav.open(Routes.SEARCH) }
        }
        item { Spacer(Modifier.height(12.dp)); SmsAccessCard(sms, onSmsGranted) }
        if (d.hasDemo) item { Spacer(Modifier.height(12.dp)); DemoBanner() }
        item {
            Spacer(Modifier.height(12.dp))
            HeroCard(unread = totalUnread, spent = d.monthSpent, upcoming = d.upcoming, onFinance = { nav.tab(Routes.FINANCE) })
        }
        item {
            SectionHeader("Folders")
            CategoryGrid(d, onOpen = nav::openCategory)
        }
        item {
            SectionHeader("Quick Actions")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                QuickAction(Icons.Rounded.Schedule, "Schedule", Modifier.weight(1f)) { nav.open(Routes.SCHEDULED) }
                QuickAction(Icons.AutoMirrored.Rounded.TrendingUp, "Finance", Modifier.weight(1f)) { nav.tab(Routes.FINANCE) }
                QuickAction(Icons.Rounded.ReceiptLong, "Bills", Modifier.weight(1f)) { nav.open(Routes.BILLS) }
                QuickAction(Icons.Rounded.Palette, "Themes", Modifier.weight(1f)) { nav.open(Routes.THEME) }
            }
        }
        if (d.pinned.isNotEmpty()) {
            item { SectionHeader("Pinned") }
            items(d.pinned, key = { "p" + it.id }) { c -> ConversationRow(c, onClick = { nav.openConversation(c.id) }) }
        }
        item {
            SectionHeader("Recent") {
                TextButton(onClick = { nav.tab(Routes.MESSAGES) }) { Text("See All") }
            }
        }
        if (d.recent.isEmpty() && d.pinned.isEmpty()) {
            item {
                EmptyState(
                    icon = Icons.Rounded.Inbox,
                    title = "No Messages Yet",
                    subtitle = "Your conversations will appear here. Sample data is turned off in Settings."
                )
            }
        } else {
            items(d.recent, key = { it.id }) { c -> ConversationRow(c, onClick = { nav.openConversation(c.id) }) }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun SearchPill(onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier = Modifier.fillMaxWidth().height(52.dp)
    ) {
        Row(Modifier.padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(12.dp))
            Text("Search messages, people, amounts…", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun HeroCard(unread: Int, spent: Double, upcoming: Int, onFinance: () -> Unit) {
    val p = MaterialTheme.colorScheme.primary
    val s = MaterialTheme.colorScheme.secondary
    Box(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large)
            .background(Brush.linearGradient(listOf(p, p.copy(alpha = 0.75f), s.copy(alpha = 0.85f))))
            .clickable(onClick = onFinance)
            .padding(20.dp)
    ) {
        Column {
            Text("Spent in the last 30 days", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.85f))
            Text(formatMoney(spent), style = MaterialTheme.typography.displaySmall, color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                HeroStat("$unread", "Unread")
                HeroStat("$upcoming", "Scheduled")
            }
        }
    }
}

@Composable
private fun HeroStat(value: String, label: String) {
    Surface(shape = MaterialTheme.shapes.small, color = Color.White.copy(alpha = 0.16f)) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(value, style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.width(6.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.85f))
        }
    }
}

@Composable
private fun CategoryGrid(d: InboxData, onOpen: (MessageCategory) -> Unit) {
    val cats = MessageCategory.entries
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        cats.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { c ->
                    val cc = d.counts[c]
                    CategoryCard(c, cc?.total ?: 0, cc?.unread ?: 0, Modifier.weight(1f)) { onOpen(c) }
                }
            }
        }
    }
}

@Composable
private fun CategoryCard(c: MessageCategory, total: Int, unread: Int, modifier: Modifier, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
    ) {
        Column(Modifier.padding(16.dp)) {
            Box(
                Modifier.size(40.dp).clip(MaterialTheme.shapes.small).background(c.tint().copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center
            ) { Icon(c.icon(), null, tint = c.tint()) }
            Spacer(Modifier.height(12.dp))
            Text(c.label, style = MaterialTheme.typography.titleMedium)
            Text(
                if (unread > 0) "$total messages · $unread new" else "$total messages",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun QuickAction(icon: ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    Surface(onClick = onClick, modifier = modifier, shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainer) {
        Column(Modifier.padding(vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(6.dp))
            Text(label, style = MaterialTheme.typography.labelMedium)
        }
    }
}
