package com.smartsms.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import kotlinx.coroutines.launch
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.smartsms.app.domain.Addresses
import com.smartsms.app.sms.Perms
import com.smartsms.app.sms.SmsSender
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.components.Avatar
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.UiState
import com.smartsms.app.ui.components.formatFull
import com.smartsms.app.ui.components.tint
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.theme.ChatAppearance
import com.smartsms.app.ui.theme.LocalChatAppearance
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.ConversationViewModel
import com.smartsms.app.ui.vm.ThreadData

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationScreen(nav: Navigator, vm: ConversationViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val state by vm.state.collectAsStateWithLifecycle()
    val sendError by vm.sendError.collectAsStateWithLifecycle()
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(sendError) { sendError?.let { snack.showSnackbar("Not sent: $it"); vm.clearSendError() } }
    val ready = state as? UiState.Ready<ThreadData>
    val conv = ready?.data?.conversation
    // Reply to the number the person actually wrote from (keeps the country code).
    val replyTo = ready?.data?.messages?.lastOrNull { it.isIncoming }?.address ?: ready?.data?.messages?.lastOrNull()?.address
    val canReply = conv != null && !conv.isDemo && replyTo != null && Addresses.canReply(replyTo)
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets.navigationBars,
        snackbarHost = { SnackbarHost(snack) },
        bottomBar = { if (canReply && replyTo != null) Composer(onSend = { vm.send(replyTo, it) }) },
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = nav::back) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back") }
                },
                title = {
                    if (conv != null) {
                        val cat = MessageCategory.fromKey(conv.category) ?: MessageCategory.PERSONAL
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Avatar(conv.displayName, cat.tint(), 38.dp)
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(conv.displayName, style = MaterialTheme.typography.titleMedium)
                                Text(conv.address, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (conv.isDemo) { Spacer(Modifier.width(8.dp)); DemoBadge() }
                        }
                    }
                },
                actions = {
                    if (conv != null && replyTo != null && Addresses.canReply(replyTo)) {
                        val ctx = LocalContext.current
                        IconButton(onClick = {
                            ctx.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(replyTo))))
                        }) { Icon(Icons.Rounded.Call, "Call") }
                    }
                    if (conv != null && !conv.isDemo) {
                        IconButton(onClick = { vm.togglePin(conv.id) }) {
                            Icon(Icons.Rounded.PushPin, if (conv.isPinned) "Unpin" else "Pin",
                                tint = if (conv.isPinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)
            )
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            StateContent(state) { data ->
                if (data.conversation == null) {
                    EmptyState(Icons.Rounded.Forum, "Conversation Not Found", "It may have been deleted or restored from a backup.")
                } else {
                    val footer = when {
                        data.conversation.isDemo -> "Sample chat · replies are off for DEMO messages"
                        canReply -> null
                        else -> "This sender does not accept replies"
                    }
                    MessageThread(data.messages, footer, onStar = vm::toggleStar, onCopied = { scope.launch { snack.showSnackbar("Copied") } })
                }
            }
        }
    }
}

@Composable
private fun MessageThread(messages: List<MessageEntity>, footer: String?, onStar: (Long) -> Unit, onCopied: () -> Unit) {
    val list = rememberLazyListState()
    LaunchedEffect(messages.size) { if (messages.isNotEmpty()) list.scrollToItem(messages.lastIndex + 1) }
    val look = LocalChatAppearance.current
    LazyColumn(
        state = list,
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(if (look.compactList) 4.dp else 8.dp)
    ) {
        items(messages, key = { it.id }) { m -> Bubble(m, look, onStar, onCopied) }
        if (footer != null) item {
            Text(
                footer,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
            )
        }
    }
}

@Composable
private fun Composer(onSend: (String) -> Boolean) {
    val ctx = LocalContext.current
    var text by rememberSaveable { mutableStateOf("") }
    var waiting by remember { mutableStateOf<String?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        val t = waiting
        waiting = null
        if (t != null && Perms.canSend(ctx) && onSend(t)) text = ""
    }
    Surface(color = MaterialTheme.colorScheme.surfaceContainer) {
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            Column(Modifier.weight(1f)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("Message") },
                    maxLines = 5,
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                if (text.isNotEmpty()) {
                    Text(
                        "${text.length} characters · ${SmsSender.parts(ctx, text)} SMS",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 14.dp, top = 2.dp)
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            FilledIconButton(
                enabled = text.isNotBlank(),
                onClick = {
                    val t = text.trim()
                    if (Perms.canSend(ctx)) {
                        if (onSend(t)) text = ""
                    } else {
                        waiting = t
                        launcher.launch(Perms.SEND_GROUP)
                    }
                },
                modifier = Modifier.size(52.dp)
            ) { Icon(Icons.AutoMirrored.Rounded.Send, "Send") }
        }
    }
}

private fun bubbleShape(look: ChatAppearance, incoming: Boolean): Shape {
    val r = look.corner.coerceIn(4, 28).dp
    val tail = 4.dp
    return when (look.bubbleStyle) {
        BubbleStyle.ROUNDED -> if (incoming) RoundedCornerShape(r, r, r, tail) else RoundedCornerShape(r, r, tail, r)
        BubbleStyle.SOFT -> RoundedCornerShape((r.value * 0.5f).dp)
        BubbleStyle.MINIMAL -> RoundedCornerShape(4.dp)
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun Bubble(m: MessageEntity, look: ChatAppearance, onStar: (Long) -> Unit, onCopied: () -> Unit) {
    val isOtp = m.category == MessageCategory.OTP.key
    var revealed by rememberSaveable(m.id) { mutableStateOf(!isOtp) }
    var menu by remember { mutableStateOf(false) }
    val clipboard = LocalClipboardManager.current
    val ctx = LocalContext.current
    val incoming = m.isIncoming
    val bg = if (incoming) MaterialTheme.colorScheme.surfaceContainerHigh else MaterialTheme.colorScheme.primary
    val fg = if (incoming) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onPrimary
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (incoming) Arrangement.Start else Arrangement.End) {
        Column(horizontalAlignment = if (incoming) Alignment.Start else Alignment.End) {
            Surface(
                shape = bubbleShape(look, incoming),
                color = bg,
                modifier = Modifier.widthIn(max = 300.dp)
                    .combinedClickable(
                        onClick = { if (!revealed) revealed = true },
                        // A hidden code is shown first; the menu works on what you can see.
                        onLongClick = { if (!revealed) revealed = true else menu = true }
                    )
            ) {
                Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    Text(
                        if (revealed) m.body else "One-time code hidden · tap to show",
                        style = MaterialTheme.typography.bodyLarge,
                        color = fg
                    )
                }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(
                        text = { Text("Copy Text") },
                        leadingIcon = { Icon(Icons.Rounded.ContentCopy, null) },
                        onClick = { clipboard.setText(AnnotatedString(m.body)); menu = false; onCopied() }
                    )
                    DropdownMenuItem(
                        text = { Text("Share") },
                        leadingIcon = { Icon(Icons.Rounded.Share, null) },
                        onClick = {
                            menu = false
                            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, m.body)
                            ctx.startActivity(Intent.createChooser(send, "Share message"))
                        }
                    )
                    DropdownMenuItem(
                        text = { Text(if (m.isStarred) "Remove Star" else "Star") },
                        leadingIcon = { Icon(Icons.Rounded.Star, null) },
                        onClick = { onStar(m.id); menu = false }
                    )
                }
            }
            if (look.showTimestamps || m.isStarred) {
                Row(Modifier.padding(horizontal = 6.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (m.isStarred) {
                        Icon(Icons.Rounded.Star, "Starred", Modifier.size(12.dp), tint = MaterialTheme.colorScheme.secondary)
                        Spacer(Modifier.width(4.dp))
                    }
                    if (look.showTimestamps) {
                        Text(formatFull(m.timestamp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

