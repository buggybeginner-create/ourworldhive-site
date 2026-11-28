package com.smartsms.app.ui.screens.inbox

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material.icons.rounded.Sms
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.local.entity.ConversationEntity
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.DemoNotice
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.MessageCard
import com.smartsms.app.ui.components.MessageDetailDialog
import com.smartsms.app.ui.components.SearchField
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.components.SenderAvatar
import com.smartsms.app.ui.components.style
import com.smartsms.app.ui.theme.LocalChatAppearance
import com.smartsms.app.ui.util.Format
import com.smartsms.app.ui.util.UiState

@Composable
fun InboxScreen(
    onOpenCategory: (MessageCategory) -> Unit,
    onOpenConversation: (ConversationEntity) -> Unit,
    onOpenFinance: () -> Unit,
    onOpenScheduled: () -> Unit,
    onOpenTheme: () -> Unit,
    onManageDemo: () -> Unit,
    contentPadding: PaddingValues,
    modifier: Modifier = Modifier,
    viewModel: InboxViewModel = viewModel(factory = InboxViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val query by viewModel.query.collectAsStateWithLifecycle()
    val category by viewModel.category.collectAsStateWithLifecycle()
    var opened by remember { mutableStateOf<MessageEntity?>(null) }

    Box(modifier.fillMaxSize().padding(contentPadding)) {
        when (val s = state) {
            UiState.Loading -> LoadingState(label = "Loading your inbox…")
            is UiState.Error -> ErrorState(s.message)
            is UiState.Success -> {
                val data = s.data
                val filtering = query.isNotBlank() || category != MessageCategory.ALL
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item { DashboardHeader(data, onOpenTheme) }
                    item { SearchField(query = query, onQueryChange = viewModel::onQueryChange) }
                    item {
                        CategoryChips(selected = category, counts = data.counts.mapValues { it.value.unread }, onSelect = viewModel::onCategorySelected)
                    }
                    if (data.showsDemoData) item { DemoNotice(onManage = onManageDemo) }

                    if (filtering) {
                        item {
                            SectionHeader(
                                title = if (query.isNotBlank()) "${data.results.size} results" else category.label,
                                actionLabel = if (category != MessageCategory.ALL) "Open" else null,
                                onAction = { onOpenCategory(category) },
                            )
                        }
                        if (data.results.isEmpty()) {
                            item {
                                EmptyState(
                                    icon = Icons.Rounded.SearchOff,
                                    title = "No matching messages",
                                    message = "Try a different word, sender or category.",
                                )
                            }
                        } else {
                            items(data.results, key = { it.id }) { message ->
                                MessageCard(message, onClick = {
                                    viewModel.markRead(message)
                                    opened = message
                                })
                            }
                        }
                    } else {
                        item { CategoryGrid(data, onOpenCategory) }
                        item { QuickStats(data, onOpenFinance, onOpenScheduled) }
                        item {
                            SectionHeader(
                                title = "Recent conversations",
                                actionLabel = "See all",
                                onAction = { onOpenCategory(MessageCategory.ALL) },
                            )
                        }
                        if (data.conversations.isEmpty()) {
                            item {
                                EmptyState(
                                    icon = Icons.Rounded.Sms,
                                    title = "Your inbox is empty",
                                    message = "Messages will appear here. You can turn demo data back on in Settings to explore the app.",
                                    actionLabel = "Open settings",
                                    onAction = onManageDemo,
                                )
                            }
                        } else {
                            items(data.conversations, key = { it.id }) { conversation ->
                                ConversationRow(conversation, onClick = { onOpenConversation(conversation) })
                            }
                        }
                    }
                }

                val open = opened?.let { o -> data.results.firstOrNull { it.id == o.id } ?: o }
                if (open != null) {
                    MessageDetailDialog(
                        message = open,
                        onDismiss = { opened = null },
                        onToggleStar = { viewModel.toggleStar(open) },
                    )
                }
            }
        }
    }
}

@Composable
private fun DashboardHeader(data: InboxDashboard, onOpenTheme: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.linearGradient(listOf(colors.primary, colors.primary.copy(alpha = 0.75f), colors.secondary.copy(alpha = 0.85f))),
                RoundedCornerShape(28.dp),
            )
            .padding(20.dp),
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(Format.greeting(), style = MaterialTheme.typography.bodyMedium, color = colors.onPrimary.copy(alpha = 0.85f))
                    Text("Smart SMS", style = MaterialTheme.typography.headlineMedium, color = colors.onPrimary)
                }
                IconButton(
                    onClick = onOpenTheme,
                    modifier = Modifier.background(colors.onPrimary.copy(alpha = 0.15f), CircleShape),
                ) {
                    Icon(Icons.Rounded.Palette, contentDescription = "Theme", tint = colors.onPrimary)
                }
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                HeaderStat("Unread", data.totalUnread.toString(), colors.onPrimary)
                HeaderStat("Messages", data.totalMessages.toString(), colors.onPrimary)
                HeaderStat("OTP", (data.counts[MessageCategory.OTP]?.total ?: 0).toString(), colors.onPrimary)
            }
        }
    }
}

@Composable
private fun HeaderStat(label: String, value: String, color: Color) {
    Column {
        Text(value, style = MaterialTheme.typography.titleLarge, color = color, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelMedium, color = color.copy(alpha = 0.8f))
    }
}

@Composable
private fun CategoryChips(selected: MessageCategory, counts: Map<MessageCategory, Int>, onSelect: (MessageCategory) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(MessageCategory.entries) { category ->
            val style = category.style()
            val unread = if (category == MessageCategory.ALL) counts.values.sum() else counts[category] ?: 0
            FilterChip(
                selected = selected == category,
                onClick = { onSelect(category) },
                label = { Text(if (unread > 0) "${category.label} · $unread" else category.label) },
                leadingIcon = { Icon(style.icon, contentDescription = null, modifier = Modifier.size(18.dp)) },
                shape = RoundedCornerShape(50),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    selectedLeadingIconColor = style.color,
                    iconColor = style.color,
                ),
            )
        }
    }
}

@Composable
private fun CategoryGrid(data: InboxDashboard, onOpenCategory: (MessageCategory) -> Unit) {
    val rows = MessageCategory.stored.chunked(2)
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { category ->
                    val count = data.counts[category]
                    CategoryTile(
                        category = category,
                        total = count?.total ?: 0,
                        unread = count?.unread ?: 0,
                        onClick = { onOpenCategory(category) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryTile(category: MessageCategory, total: Int, unread: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val style = category.style()
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.padding(16.dp)) {
            Box(
                Modifier.size(40.dp).background(style.color.copy(alpha = 0.16f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(style.icon, contentDescription = null, tint = style.color)
            }
            Spacer(Modifier.height(12.dp))
            Text(category.label, style = MaterialTheme.typography.titleSmall)
            Text(
                if (unread > 0) "$total messages · $unread new" else "$total messages",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun QuickStats(data: InboxDashboard, onOpenFinance: () -> Unit, onOpenScheduled: () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        StatCard(
            icon = Icons.Rounded.AccountBalanceWallet,
            tint = Color(0xFF10B981),
            title = Format.currency(data.spentLast30Days),
            subtitle = "Spent, last 30 days",
            onClick = onOpenFinance,
            modifier = Modifier.weight(1f),
        )
        StatCard(
            icon = Icons.Rounded.Schedule,
            tint = Color(0xFF3B82F6),
            title = data.nextScheduled?.let { Format.shortTimeUntil(it.scheduledAt) } ?: "None",
            subtitle = data.nextScheduled?.let { "Next: ${it.recipientName}" } ?: "No scheduled messages",
            onClick = onOpenScheduled,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun StatCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
                Spacer(Modifier.weight(1f))
                Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(10.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun ConversationRow(conversation: ConversationEntity, onClick: () -> Unit) {
    val appearance = LocalChatAppearance.current
    val style = conversation.category.style()
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = if (appearance.compactMode) 10.dp else 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (appearance.showAvatars) {
                SenderAvatar(conversation.displayName, style.color, size = if (appearance.compactMode) 36 else 46)
                Spacer(Modifier.width(12.dp))
            }
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (conversation.isPinned) {
                        Icon(Icons.Rounded.PushPin, contentDescription = "Pinned", modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(4.dp))
                    }
                    Text(
                        conversation.displayName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = if (conversation.unreadCount > 0) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (conversation.source == DataSource.DEMO) {
                        Spacer(Modifier.width(6.dp))
                        DemoBadge()
                    }
                    Spacer(Modifier.weight(1f))
                    Text(Format.shortTime(conversation.lastMessageAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(3.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        conversation.lastMessagePreview,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    if (conversation.unreadCount > 0) {
                        Spacer(Modifier.width(8.dp))
                        Box(
                            Modifier.background(MaterialTheme.colorScheme.primary, CircleShape).padding(horizontal = 7.dp, vertical = 2.dp),
                        ) {
                            Text(conversation.unreadCount.toString(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                }
            }
        }
    }
}

