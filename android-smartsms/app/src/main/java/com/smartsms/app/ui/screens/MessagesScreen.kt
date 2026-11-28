package com.smartsms.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.domain.MessageCategory
import androidx.compose.ui.platform.LocalContext
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.sms.Prefs
import com.smartsms.app.ui.components.LocalAuth
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatTime
import com.smartsms.app.ui.components.icon
import com.smartsms.app.ui.components.tint
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.nav.Routes
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.MessagesViewModel

/**
 * fixedCategory == null → "All Messages" with folder chips (bottom-bar tab).
 * fixedCategory != null → one folder (Personal, Transactions, Offers or OTP).
 */
@Composable
fun MessagesScreen(
    nav: Navigator,
    fixedCategory: MessageCategory?,
    vm: MessagesViewModel = viewModel(factory = AppViewModelProvider.Factory)
) {
    LaunchedEffect(fixedCategory) { if (fixedCategory != null) vm.select(fixedCategory) }
    val selected by vm.category.collectAsStateWithLifecycle()
    val state by vm.state.collectAsStateWithLifecycle()
    val otpMessages by vm.messages.collectAsStateWithLifecycle()

    ScreenScaffold(
        title = fixedCategory?.label ?: "All Messages",
        onBack = if (fixedCategory != null) nav::back else null,
        topLevel = fixedCategory == null,
        actions = {
            IconButton(onClick = { nav.open(Routes.SEARCH) }) { Icon(Icons.Rounded.Search, "Search") }
            IconButton(onClick = { vm.markAllRead() }) { Icon(Icons.Rounded.DoneAll, "Mark all as read") }
        },
        floatingActionButton = {
            if (fixedCategory == null) {
                ExtendedFloatingActionButton(
                    onClick = { nav.open(Routes.COMPOSE) },
                    icon = { Icon(Icons.Rounded.Edit, null) },
                    text = { Text("New Message") }
                )
            }
        }
    ) { pad ->
        Column(Modifier.padding(pad)) {
            if (fixedCategory == null) {
                CategoryChips(selected) { vm.select(it) }
            } else {
                Text(
                    fixedCategory.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
                )
            }
            if (selected == MessageCategory.OTP) {
                val ctx = LocalContext.current
                val container = (ctx.applicationContext as SmartSmsApp).container
                val until by container.otpUnlockedUntil.collectAsStateWithLifecycle()
                val auth = LocalAuth.current
                if (Prefs.otpLock(ctx) && System.currentTimeMillis() >= until) {
                    EmptyState(
                        Icons.Rounded.Lock, "OTP Folder Is Locked",
                        "Use your fingerprint or phone PIN to open it. It stays open for 5 minutes.",
                        actionLabel = "Unlock",
                        onAction = { auth("Open OTP folder") { container.unlockOtp() } }
                    )
                } else {
                    StateContent(otpMessages) { list -> OtpList(list, onOpen = nav::openConversation) }
                }
            } else {
                StateContent(state) { list ->
                    if (list.isEmpty()) {
                        val c = selected
                        EmptyState(
                            icon = c?.icon() ?: Icons.Rounded.Search,
                            title = "Nothing Here Yet",
                            subtitle = if (c == null) "No conversations to show." else "No ${c.label.lowercase()} messages to show."
                        )
                    } else {
                        LazyColumn(contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 8.dp, bottom = 96.dp)) {
                            items(list, key = { it.id }) { c ->
                                ConversationRow(c, onClick = { nav.openConversation(c.id) }, onLongClick = { vm.togglePin(c.id) })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryChips(selected: MessageCategory?, onSelect: (MessageCategory?) -> Unit) {
    val options: List<MessageCategory?> = listOf(null) + MessageCategory.entries
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(options) { c ->
            FilterChip(
                selected = selected == c,
                onClick = { onSelect(c) },
                label = { Text(c?.label ?: "All") },
                leadingIcon = if (c != null) {
                    { Icon(c.icon(), null, Modifier.size(18.dp), tint = c.tint()) }
                } else null,
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    }
}

/** OTP folder: codes stay hidden until the user taps. The app never copies or forwards them. */
@Composable
private fun OtpList(list: List<MessageEntity>, onOpen: (Long) -> Unit) {
    if (list.isEmpty()) {
        EmptyState(Icons.Rounded.Lock, "No Codes", "One-time codes you receive are kept here, hidden until you tap.")
        return
    }
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(list, key = { it.id }) { m -> OtpCard(m, onOpen) }
    }
}

@Composable
private fun OtpCard(m: MessageEntity, onOpen: (Long) -> Unit) {
    var shown by rememberSaveable(m.id) { mutableStateOf(false) }
    Card(
        onClick = { if (shown) onOpen(m.conversationId) else shown = true },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(if (shown) Icons.Rounded.Visibility else Icons.Rounded.Lock, null, tint = MessageCategory.OTP.tint())
                Spacer(Modifier.width(10.dp))
                Text(m.address, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                if (m.isDemo) { DemoBadge(); Spacer(Modifier.width(8.dp)) }
                Text(formatTime(m.timestamp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                if (shown) m.body else "Code hidden · tap to show",
                style = MaterialTheme.typography.bodyMedium,
                color = if (shown) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
            )
            AnimatedVisibility(shown) {
                Text(
                    "Never share this code with anyone. Tap again to open the conversation.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}
