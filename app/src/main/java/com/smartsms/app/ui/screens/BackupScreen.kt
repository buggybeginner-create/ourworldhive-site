package com.smartsms.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.BackupHistoryEntity
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatFull
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.BackupViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun BackupScreen(nav: Navigator, vm: BackupViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val context = LocalContext.current
    val history by vm.history.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val message by vm.message.collectAsStateWithLifecycle()
    val snack = remember { SnackbarHostState() }
    var pendingImport by remember { mutableStateOf<Uri?>(null) }

    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) vm.export(context.contentResolver, uri)
    }
    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) pendingImport = uri
    }
    LaunchedEffect(message) {
        message?.let { snack.showSnackbar(it); vm.consumeMessage() }
    }

    ScreenScaffold(title = "Backup & Sync", onBack = nav::back, snackbarHost = snack) { pad ->
        LazyColumn(
            modifier = Modifier.padding(pad),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer), shape = MaterialTheme.shapes.large) {
                    Column(Modifier.padding(20.dp)) {
                        Text("Local Backup", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Saves your conversations, scheduled messages and transactions into one file you choose — phone storage, an SD card or the Drive app. Nothing is uploaded by Smart SMS.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(16.dp))
                        if (busy) {
                            LinearProgressIndicator(Modifier.fillMaxWidth())
                            Spacer(Modifier.height(16.dp))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(enabled = !busy, onClick = { exportLauncher.launch(defaultName()) }, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Rounded.Upload, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Back Up Now")
                            }
                            FilledTonalButton(
                                enabled = !busy,
                                onClick = { importLauncher.launch(arrayOf("application/json", "application/octet-stream", "text/plain")) },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Rounded.Download, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Restore")
                            }
                        }
                    }
                }
            }
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), shape = MaterialTheme.shapes.large) {
                    Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.CloudSync, null, tint = MaterialTheme.colorScheme.secondary)
                        Spacer(Modifier.width(14.dp))
                        Column {
                            Text("Cloud Sync", style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Automatic encrypted sync is planned for a later phase. Until then, use Back Up Now.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
            item { SectionHeader("History") }
            item {
                StateContent(history) { list ->
                    if (list.isEmpty()) {
                        EmptyState(Icons.Rounded.History, "No Backups Yet", "Your backups and restores will be listed here.")
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { list.forEach { HistoryRow(it) } }
                    }
                }
            }
        }
    }

    pendingImport?.let { uri ->
        AlertDialog(
            onDismissRequest = { pendingImport = null },
            icon = { Icon(Icons.Rounded.Download, null) },
            title = { Text("Restore This Backup?") },
            text = { Text("The conversations, scheduled messages and transactions in the app will be replaced by the ones in the file. Your settings stay as they are.") },
            confirmButton = {
                TextButton(onClick = { vm.import(context.contentResolver, uri); pendingImport = null }) { Text("Restore") }
            },
            dismissButton = { TextButton(onClick = { pendingImport = null }) { Text("Cancel") } }
        )
    }
}

private fun defaultName(): String =
    "smart-sms-backup-" + SimpleDateFormat("yyyy-MM-dd-HHmm", Locale.US).format(Date()) + ".json"

@Composable
private fun HistoryRow(h: BackupHistoryEntity) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(
            if (h.success) Icons.Rounded.CheckCircle else Icons.Rounded.ErrorOutline,
            null,
            tint = if (h.success) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error
        )
        Spacer(Modifier.width(12.dp))
        Box(Modifier.weight(1f)) {
            Column {
                Text(
                    (if (h.kind == "EXPORT") "Backup" else "Restore") + " · " + h.fileName,
                    style = MaterialTheme.typography.titleSmall
                )
                Text(
                    formatFull(h.timestamp) + if (h.success) " · ${h.itemCount} items" else " · ${h.note}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
