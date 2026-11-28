package com.smartsms.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ManageSearch
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatTime
import com.smartsms.app.ui.components.icon
import com.smartsms.app.ui.components.tint
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.SearchViewModel

@Composable
fun SearchScreen(nav: Navigator, vm: SearchViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val query by vm.query.collectAsStateWithLifecycle()
    val results by vm.results.collectAsStateWithLifecycle()
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }

    Column(
        Modifier.fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .windowInsetsPadding(WindowInsets.navigationBars)
            .imePadding()
    ) {
        Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = nav::back) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back") }
            TextField(
                value = query,
                onValueChange = vm::setQuery,
                placeholder = { Text("Search messages, people, amounts…") },
                singleLine = true,
                shape = CircleShape,
                trailingIcon = {
                    if (query.isNotEmpty()) IconButton(onClick = { vm.setQuery("") }) { Icon(Icons.Rounded.Close, "Clear") }
                },
                colors = TextFieldDefaults.colors(
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh
                ),
                modifier = Modifier.weight(1f).focusRequester(focus)
            )
        }
        StateContent(results) { list ->
            when {
                query.isBlank() -> EmptyState(
                    Icons.Rounded.ManageSearch, "Search Everything",
                    "Find any message by word, sender or amount, e.g. \"dinner\", \"Bank\" or \"2,450\"."
                )
                list.isEmpty() -> EmptyState(Icons.Rounded.SearchOff, "No Results", "Nothing matches \"$query\".")
                else -> LazyColumn(contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)) {
                    item {
                        Text(
                            "${list.size} result${if (list.size == 1) "" else "s"}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                    items(list, key = { it.id }) { m -> ResultRow(m, query) { nav.openConversation(m.conversationId) } }
                }
            }
        }
    }
}

@Composable
private fun ResultRow(m: MessageEntity, query: String, onClick: () -> Unit) {
    val cat = MessageCategory.fromKey(m.category) ?: MessageCategory.PERSONAL
    val body = if (cat == MessageCategory.OTP) "One-time code · open to view" else m.body
    val hl = MaterialTheme.colorScheme.primary
    val text = buildAnnotatedString {
        val q = query.trim()
        var i = 0
        if (q.isNotEmpty()) {
            while (true) {
                val at = body.indexOf(q, i, ignoreCase = true)
                if (at < 0) break
                append(body.substring(i, at))
                withStyle(SpanStyle(color = hl, fontWeight = FontWeight.Bold)) { append(body.substring(at, at + q.length)) }
                i = at + q.length
            }
        }
        append(body.substring(i))
    }
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 8.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(cat.icon(), null, tint = cat.tint())
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(m.address, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                if (m.isDemo) { DemoBadge(); Spacer(Modifier.width(8.dp)) }
                Text(formatTime(m.timestamp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(2.dp))
            Text(text, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
        }
    }
}
