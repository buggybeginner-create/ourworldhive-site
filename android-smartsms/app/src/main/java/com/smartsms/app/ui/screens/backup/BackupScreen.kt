package com.smartsms.app.ui.screens.backup

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Backup
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.History
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.local.entity.BackupHistoryEntity
import com.smartsms.app.domain.BackupStatus
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.theme.Palette
import com.smartsms.app.ui.util.Format
import com.smartsms.app.ui.util.UiState

@Composable
fun BackupScreen(
    onBack: () -> Unit,
    viewModel: BackupViewModel = viewModel(factory = BackupViewModel.Factory),
) {
    val history by viewModel.history.collectAsStateWithLifecycle()
    val action by viewModel.action.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(action) {
        when (val a = action) {
            is BackupAction.Done -> {
                snackbar.showSnackbar("Backup saved: ${a.entry.itemCount} items, ${Format.bytes(a.entry.sizeBytes)}")
                viewModel.dismissResult()
            }
            is BackupAction.Failed -> {
                snackbar.showSnackbar("Backup failed: ${a.message}")
                viewModel.dismissResult()
            }
            else -> Unit
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Backup & Sync") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { LocalBackupCard(running = action == BackupAction.Running, onBackup = viewModel::backupNow) }
            item { CloudSyncCard() }
            item { SectionHeader("Backup history") }
            when (val h = history) {
                UiState.Loading -> item { Box(Modifier.height(160.dp)) { LoadingState() } }
                is UiState.Error -> item { ErrorState(h.message) }
                is UiState.Success -> {
                    if (h.data.isEmpty()) {
                        item {
                            EmptyState(
                                icon = Icons.Rounded.History,
                                title = "No backups yet",
                                message = "Create your first local backup to keep a copy of your messages and settings.",
                            )
                        }
                    } else {
                        items(h.data, key = { it.id }) { entry -> HistoryRow(entry, onDelete = { viewModel.delete(entry) }) }
                    }
                }
            }
        }
    }
}

@Composable
private fun LocalBackupCard(running: Boolean, onBackup: () -> Unit) {
    Card(shape = MaterialTheme.shapes.large, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconTile(Icons.Rounded.Backup, MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Local backup", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Saves messages, schedules, transactions and settings to a file in the app's private storage.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Button(onClick = onBackup, enabled = !running, modifier = Modifier.fillMaxWidth()) {
                if (running) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(Modifier.width(10.dp))
                    Text("Backing up…")
                } else {
                    Text("Back up now")
                }
            }
        }
    }
}

@Composable
private fun CloudSyncCard() {
    Card(shape = MaterialTheme.shapes.large, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            IconTile(Icons.Rounded.CloudSync, MaterialTheme.colorScheme.secondary)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Cloud sync", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Not connected. Cloud sync is planned for a later phase; nothing leaves your phone today.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(Icons.Rounded.CloudOff, contentDescription = "Not connected", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun IconTile(icon: androidx.compose.ui.graphics.vector.ImageVector, tint: androidx.compose.ui.graphics.Color) {
    Box(Modifier.size(44.dp).background(tint.copy(alpha = 0.15f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
        Icon(icon, contentDescription = null, tint = tint)
    }
}

@Composable
private fun HistoryRow(entry: BackupHistoryEntity, onDelete: () -> Unit) {
    val ok = entry.status == BackupStatus.SUCCESS
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceContainer, MaterialTheme.shapes.medium)
            .padding(start = 14.dp, top = 10.dp, bottom = 10.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            if (ok) Icons.Rounded.CheckCircle else Icons.Rounded.ErrorOutline,
            contentDescription = if (ok) "Succeeded" else "Failed",
            tint = if (ok) Palette.Success else Palette.Danger,
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(Format.dateTime(entry.createdAt), style = MaterialTheme.typography.titleSmall)
            Text(
                if (ok) "${entry.type.label} · ${Format.bytes(entry.sizeBytes)} · ${entry.note}" else "Failed · ${entry.note}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onDelete) { Icon(Icons.Rounded.DeleteOutline, contentDescription = "Delete backup") }
    }
}
