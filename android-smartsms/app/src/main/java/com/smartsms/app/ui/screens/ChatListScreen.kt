package com.smartsms.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Archive
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.ChatListViewModel

/** Archived chats or blocked senders. Long-press a chat to bring it back. */
@Composable
fun ChatListScreen(nav: Navigator, vm: ChatListViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val state by vm.state.collectAsStateWithLifecycle()
    val blocked = vm.kind == "blocked"
    ScreenScaffold(title = if (blocked) "Blocked Senders" else "Archived Chats", onBack = nav::back) { pad ->
        Column(Modifier.padding(pad)) {
            Text(
                if (blocked) "Messages from these senders are kept here quietly, with no alerts. Long-press to unblock."
                else "Archived chats are hidden from the inbox. Long-press to put a chat back.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
            )
            StateContent(state) { list ->
                if (list.isEmpty()) {
                    EmptyState(
                        if (blocked) Icons.Rounded.Block else Icons.Rounded.Archive,
                        if (blocked) "No One Blocked" else "Nothing Archived",
                        if (blocked) "Open a chat and choose Block from its ⋮ menu." else "Open a chat and choose Archive from its ⋮ menu."
                    )
                } else {
                    LazyColumn(contentPadding = PaddingValues(8.dp)) {
                        items(list, key = { it.id }) { c ->
                            ConversationRow(c, onClick = { nav.openConversation(c.id) }, onLongClick = { vm.restore(c.id) })
                        }
                    }
                }
            }
        }
    }
}
