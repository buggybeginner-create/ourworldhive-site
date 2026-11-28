package com.smartsms.app.ui.screens

import androidx.activity.result.IntentSenderRequest
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.runtime.rememberCoroutineScope
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.sms.DriveBackup
import com.smartsms.app.sms.DriveFile
import com.smartsms.app.sms.Prefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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
    val scope = rememberCoroutineScope()
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
                        Text("Backup To A File", style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Saves your conversations, scheduled messages and transactions into one file you choose on this phone or SD card.",
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
            item { DriveCard(onMessage = { m -> scope.launch { snack.showSnackbar(m) } }) }
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
                    (when (h.kind) {
                        "EXPORT" -> "Backup"
                        "DRIVE" -> "Google Drive backup"
                        "DRIVE_RESTORE" -> "Restored from Google Drive"
                        else -> "Restore"
                    }) + " · " + h.fileName,
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

/** Google Drive of the Google (Gmail) account the user picks: connect, back up now, automatic, restore. */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun DriveCard(onMessage: (String) -> Unit) {
    val ctx = LocalContext.current
    val c = (ctx.applicationContext as SmartSmsApp).container
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf(Prefs.driveEmail(ctx)) }
    var last by remember { mutableStateOf(Prefs.driveLast(ctx)) }
    var auto by remember { mutableStateOf(Prefs.driveAuto(ctx)) }
    var busy by remember { mutableStateOf(false) }
    var files by remember { mutableStateOf<List<DriveFile>?>(null) }
    var confirm by remember { mutableStateOf<DriveFile?>(null) }
    var next by remember { mutableStateOf<(suspend (String) -> Unit)?>(null) }

    val consent = rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { res ->
        val job = next
        next = null
        runCatching { DriveBackup.fromConsent(ctx, res.data) }.onSuccess { a ->
            if (a is DriveBackup.Auth.Token) {
                a.email?.let { Prefs.setDriveEmail(ctx, it); email = it } ?: run { if (email == null) { Prefs.setDriveEmail(ctx, "Google account"); email = "Google account" } }
                if (job != null) scope.launch { busy = true; try { job(a.token) } finally { busy = false } }
            }
        }.onFailure { busy = false; onMessage("Google did not allow access") }
    }
    // Runs [work] with a Drive token, showing Google's permission screen first if needed.
    val withToken: (suspend (String) -> Unit) -> Unit = { work ->
        busy = true
        scope.launch {
            try {
                when (val a = DriveBackup.authorize(ctx)) {
                    is DriveBackup.Auth.Token -> {
                        a.email?.let { Prefs.setDriveEmail(ctx, it); email = it } ?: run { if (email == null) { Prefs.setDriveEmail(ctx, "Google account"); email = "Google account" } }
                        work(a.token)
                    }
                    is DriveBackup.Auth.NeedsConsent -> {
                        next = work
                        consent.launch(IntentSenderRequest.Builder(a.intent.intentSender).build())
                    }
                }
            } catch (e: Exception) {
                onMessage("Google Drive: ${e.message ?: "could not connect"}")
            } finally {
                busy = false
            }
        }
    }

    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer), shape = MaterialTheme.shapes.large) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CloudSync, null, tint = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.width(12.dp))
                Text("Google Drive Backup", style = MaterialTheme.typography.titleLarge)
            }
            Text(
                if (email == null) "Back up to the Google Drive of your Gmail account, folder \"Smart SMS Backup\". Smart SMS can see only its own backup files, nothing else in your Drive."
                else "Account: $email · Last backup: " + (if (last > 0) formatFull(last) else "never"),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(enabled = !busy, modifier = Modifier.weight(1f), onClick = {
                    withToken { t ->
                        DriveBackup.backupNow(ctx, t).fold(
                            { last = Prefs.driveLast(ctx); onMessage("Saved to Google Drive") },
                            { e -> onMessage("Not saved: ${e.message}") }
                        )
                    }
                }) { Text(if (email == null) "Connect & Back Up" else "Back Up Now") }
                if (email != null) {
                    FilledTonalButton(enabled = !busy, modifier = Modifier.weight(1f), onClick = {
                        withToken { t ->
                            runCatching { withContext(Dispatchers.IO) { DriveBackup.list(t) } }
                                .onSuccess { files = it }.onFailure { e -> onMessage("Could not list backups: ${e.message}") }
                        }
                    }) { Text("Restore") }
                }
            }
            if (email != null) {
                Text("Automatic Backup", style = MaterialTheme.typography.titleSmall)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf(0 to "Off", 1 to "Daily", 7 to "Weekly").forEachIndexed { i, (d, label) ->
                        SegmentedButton(
                            selected = auto == d,
                            onClick = { auto = d; Prefs.setDriveAuto(ctx, d); DriveBackup.schedule(ctx, d) },
                            shape = SegmentedButtonDefaults.itemShape(i, 3)
                        ) { Text(label) }
                    }
                }
                Text(
                    "Runs by itself when the phone is online. The newest 30 backups are kept.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                TextButton(onClick = {
                    Prefs.setDriveEmail(ctx, null); Prefs.setDriveAuto(ctx, 0); DriveBackup.schedule(ctx, 0)
                    email = null; auto = 0
                    onMessage("Disconnected. Backups already in your Drive stay there.")
                }) { Text("Disconnect Google Account") }
            }
        }
    }

    files?.let { list ->
        AlertDialog(
            onDismissRequest = { files = null },
            title = { Text("Restore From Google Drive") },
            text = {
                if (list.isEmpty()) Text("No backups in your Drive yet.")
                else LazyColumn(Modifier.heightIn(max = 360.dp)) {
                    items(list) { f ->
                        TextButton(onClick = { confirm = f; files = null }, modifier = Modifier.fillMaxWidth()) {
                            Text(f.name.removePrefix("smart-sms-backup-").removeSuffix(".json") + " · " + (f.size / 1024).coerceAtLeast(1) + " KB")
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { files = null }) { Text("Close") } }
        )
    }
    confirm?.let { f ->
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text("Restore This Backup?") },
            text = { Text("Chats, messages, scheduled messages and transactions in the app are replaced by the backup from ${f.name.removePrefix("smart-sms-backup-").removeSuffix(".json")}. Your SMS on the phone are not touched.") },
            confirmButton = {
                TextButton(onClick = {
                    confirm = null
                    withToken { t ->
                        val r = runCatching { c.backupRepository.restoreJson(withContext(Dispatchers.IO) { DriveBackup.download(t, f.id) }) }
                        c.backupRepository.log("DRIVE_RESTORE", f.name, r)
                        onMessage(r.fold({ "Restored $it items" }, { "Not restored: ${it.message}" }))
                    }
                }) { Text("Restore") }
            },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Cancel") } }
        )
    }
}
