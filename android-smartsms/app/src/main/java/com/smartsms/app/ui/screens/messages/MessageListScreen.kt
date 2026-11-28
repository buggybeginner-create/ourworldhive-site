package com.smartsms.app.ui.screens.messages

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.components.DemoNotice
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.MessageCard
import com.smartsms.app.ui.components.MessageDetailDialog
import com.smartsms.app.ui.components.SearchField
import com.smartsms.app.ui.components.style
import com.smartsms.app.ui.util.UiState

private fun MessageCategory.emptyMessage(): String = when (this) {
    MessageCategory.ALL -> "There are no messages yet."
    MessageCategory.PERSONAL -> "Messages from people you know will appear here."
    MessageCategory.TRANSACTIONS -> "Bank, card and UPI alerts will appear here."
    MessageCategory.OFFERS -> "Promotions and deals will be collected here, away from your personal chats."
    MessageCategory.OTP -> "One-time passwords will appear here with a one-tap copy button."
}

@Composable
fun MessageListScreen(
    onBack: () -> Unit,
    onManageDemo: () -> Unit,
    viewModel: MessageListViewModel = viewModel(factory = MessageListViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val query by viewModel.query.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    var opened by remember { mutableStateOf<MessageEntity?>(null) }
    val category = viewModel.category
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            LargeTopAppBar(
                title = { Text(category.label) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back") }
                },
                actions = {
                    Icon(
                        category.style().icon,
                        contentDescription = null,
                        tint = category.style().color,
                        modifier = Modifier.padding(end = 16.dp),
                    )
                },
                scrollBehavior = scrollBehavior,
                colors = TopAppBarDefaults.largeTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                ),
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SearchField(query = query, onQueryChange = viewModel::onQueryChange, placeholder = "Search in ${category.label.lowercase()}")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(MessageFilter.entries) { f ->
                        FilterChip(
                            selected = filter == f,
                            onClick = { viewModel.onFilterChange(f) },
                            label = { Text(f.label) },
                            shape = RoundedCornerShape(50),
                        )
                    }
                }
            }
            Box(Modifier.fillMaxSize()) {
                when (val s = state) {
                    UiState.Loading -> LoadingState()
                    is UiState.Error -> ErrorState(s.message)
                    is UiState.Success -> {
                        val list = s.data
                        if (list.isEmpty()) {
                            EmptyState(
                                icon = if (query.isNotBlank()) Icons.Rounded.SearchOff else category.style().icon,
                                title = if (query.isNotBlank() || filter != MessageFilter.ALL) "Nothing found" else "No ${category.label.lowercase()} yet",
                                message = if (query.isNotBlank() || filter != MessageFilter.ALL) "Try another search or filter." else category.emptyMessage(),
                            )
                        } else {
                            LazyColumn(
                                contentPadding = PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                if (list.any { it.source == DataSource.DEMO }) {
                                    item { DemoNotice(onManage = onManageDemo) }
                                }
                                items(list, key = { it.id }) { message ->
                                    MessageCard(message, onClick = {
                                        viewModel.markRead(message)
                                        opened = message
                                    })
                                }
                            }
                        }
                        val open = opened?.let { o -> list.firstOrNull { it.id == o.id } ?: o }
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
    }
}
