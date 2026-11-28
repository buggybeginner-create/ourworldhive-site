package com.smartsms.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.rounded.Alarm
import androidx.compose.material.icons.rounded.Contacts
import androidx.compose.material.icons.rounded.Sms
import androidx.compose.material.icons.rounded.Sync
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import com.smartsms.app.sms.Perms
import com.smartsms.app.sms.Prefs
import com.smartsms.app.ui.components.LocalAuth
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Archive
import androidx.compose.material.icons.rounded.Block
import com.smartsms.app.ui.components.formatTime
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.SystemUpdate
import com.smartsms.app.sms.SmsSyncState
import com.smartsms.app.ui.components.rememberCheck
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.Backup
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Restore
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.TextFields
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.BuildConfig
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.ThemeMode
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.nav.Routes
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.SettingsViewModel
import kotlin.math.roundToInt

@Composable
fun SettingsScreen(nav: Navigator, vm: SettingsViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val settings by vm.settings.collectAsStateWithLifecycle()
    ScreenScaffold(title = "Settings", topLevel = true) { pad ->
        val s = settings
        if (s == null) LoadingState(Modifier.padding(pad))
        else SettingsContent(s, vm, nav, PaddingValues(start = 12.dp, end = 12.dp, top = pad.calculateTopPadding(), bottom = 24.dp))
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun SettingsContent(s: UserSettingsEntity, vm: SettingsViewModel, nav: Navigator, pad: PaddingValues) {
    var confirmRemove by remember { mutableStateOf(false) }
    var confirmReread by remember { mutableStateOf(false) }
    val ctx = LocalContext.current
    val auth = LocalAuth.current
    var canRead by rememberCheck { Perms.canRead(ctx) }
    var canContacts by rememberCheck { Perms.canContacts(ctx) }
    val exact by rememberCheck { Perms.canExact(ctx) }
    val sms by vm.sms.collectAsStateWithLifecycle()
    val realCount by vm.realCount.collectAsStateWithLifecycle()
    val askRead = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        canRead = Perms.canRead(ctx); canContacts = Perms.canContacts(ctx)
        if (canRead) vm.onSmsPermissionResult() else ctx.startActivity(Perms.appSettings(ctx))
    }
    val askContacts = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        canContacts = ok
        if (ok) vm.refreshNames()
    }
    LaunchedEffect(exact) { if (exact) vm.rescheduleAll() }
    // Sliders update locally while dragging and save once on release.
    var font by remember(s.fontScale) { mutableFloatStateOf(s.fontScale) }
    var corner by remember(s.bubbleCorner) { mutableFloatStateOf(s.bubbleCorner.toFloat()) }

    LazyColumn(contentPadding = pad) {
        item { SectionHeader("Appearance", Modifier.padding(horizontal = 8.dp)) }
        item {
            NavRow(Icons.Rounded.Palette, "Theme & Colours", ThemeMode.fromKey(s.themeMode).label) { nav.open(Routes.THEME) }
        }
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text("Text Size · ${(font * 100).roundToInt()}%", style = MaterialTheme.typography.titleSmall)
                Slider(
                    value = font,
                    onValueChange = { font = it },
                    onValueChangeFinished = { vm.update { it.copy(fontScale = font) } },
                    valueRange = 0.85f..1.3f,
                    steps = 8
                )
                Text(
                    "The quick brown fox jumps over the lazy dog.",
                    style = MaterialTheme.typography.bodyLarge.copy(fontSize = MaterialTheme.typography.bodyLarge.fontSize * (font / s.fontScale))
                )
            }
        }

        item { SectionHeader("Chat Appearance", Modifier.padding(horizontal = 8.dp)) }
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text("Bubble Style", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                val current = BubbleStyle.fromKey(s.bubbleStyle)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    BubbleStyle.entries.forEachIndexed { i, b ->
                        SegmentedButton(
                            selected = current == b,
                            onClick = { vm.update { it.copy(bubbleStyle = b.key) } },
                            shape = SegmentedButtonDefaults.itemShape(i, BubbleStyle.entries.size)
                        ) { Text(b.label) }
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text("Bubble Corners · ${corner.roundToInt()} dp", style = MaterialTheme.typography.titleSmall)
                Slider(
                    value = corner,
                    onValueChange = { corner = it },
                    onValueChangeFinished = { vm.update { it.copy(bubbleCorner = corner.roundToInt()) } },
                    valueRange = 4f..28f
                )
            }
        }
        item {
            SwitchRow(Icons.Rounded.Schedule, "Show Times Under Messages", s.showTimestamps) { on -> vm.update { it.copy(showTimestamps = on) } }
        }
        item {
            SwitchRow(Icons.Rounded.ChatBubbleOutline, "Show Contact Pictures", s.showAvatars) { on -> vm.update { it.copy(showAvatars = on) } }
        }
        item {
            SwitchRow(Icons.Rounded.TextFields, "Compact Lists", s.compactList) { on -> vm.update { it.copy(compactList = on) } }
        }

        item { SectionHeader("Your SMS", Modifier.padding(horizontal = 8.dp)) }
        item {
            val status = when {
                !canRead -> "Not allowed · tap to allow"
                sms is SmsSyncState.Reading -> "Reading… ${(sms as SmsSyncState.Reading).count} messages"
                sms is SmsSyncState.Failed -> "Problem: ${(sms as SmsSyncState.Failed).reason}"
                sms is SmsSyncState.Done -> "Allowed · $realCount messages · last checked ${formatTime((sms as SmsSyncState.Done).at)}"
                else -> "Allowed · $realCount messages on this phone"
            }
            NavRow(Icons.Rounded.Sms, "SMS Access", status) { if (!canRead) askRead.launch(Perms.READ_GROUP) }
        }
        item {
            var notify by remember { mutableStateOf(Prefs.notifyNew(ctx)) }
            SwitchRow(Icons.Rounded.Notifications, "Notify New Messages", notify,
                subtitle = "Code messages show only \"One-time code received\"") { on ->
                notify = on; Prefs.setNotifyNew(ctx, on)
            }
        }
        if (canRead) {
            item { NavRow(Icons.Rounded.Sync, "Read All SMS Again", "Use if messages look missing or doubled") { confirmReread = true } }
            if (!canContacts) {
                item { NavRow(Icons.Rounded.Contacts, "Show Contact Names", "Names instead of numbers") { askContacts.launch(android.Manifest.permission.READ_CONTACTS) } }
            }
        }
        if (android.os.Build.VERSION.SDK_INT >= 31) {
            item {
                NavRow(
                    Icons.Rounded.Alarm, "Exact Time For Scheduled Messages",
                    if (exact) "On" else "Off · messages may go a few minutes late"
                ) { ctx.startActivity(Perms.exactAlarmSettings(ctx)) }
            }
        }

        item { SectionHeader("Privacy Lock", Modifier.padding(horizontal = 8.dp)) }
        item {
            var on by remember { mutableStateOf(Prefs.appLock(ctx)) }
            SwitchRow(Icons.Rounded.Fingerprint, "App Lock", on, subtitle = "Fingerprint or phone PIN to open Smart SMS") { want ->
                auth(if (want) "Turn on App Lock" else "Turn off App Lock") { on = want; Prefs.setAppLock(ctx, want) }
            }
        }
        item {
            var on by remember { mutableStateOf(Prefs.otpLock(ctx)) }
            SwitchRow(Icons.Rounded.Key, "Lock OTP Folder", on, subtitle = "Codes need your fingerprint or PIN, even inside chats") { want ->
                auth(if (want) "Lock the OTP folder" else "Unlock the OTP folder") { on = want; Prefs.setOtpLock(ctx, want) }
            }
        }

        item { SectionHeader("Messages & Data", Modifier.padding(horizontal = 8.dp)) }
        item { NavRow(Icons.Rounded.ReceiptLong, "Bills & EMIs", "Due dates found in your messages") { nav.open(Routes.BILLS) } }
        item { NavRow(Icons.Rounded.Bolt, "Quick Replies", "Ready-made answers above the reply box") { nav.open(Routes.QUICK) } }
        item { NavRow(Icons.Rounded.Archive, "Archived Chats", null) { nav.open(Routes.chats("archived")) } }
        item { NavRow(Icons.Rounded.Block, "Blocked Senders", null) { nav.open(Routes.chats("blocked")) } }
        item { NavRow(Icons.Rounded.Schedule, "Scheduled Messages", null) { nav.open(Routes.SCHEDULED) } }
        item { NavRow(Icons.Rounded.Backup, "Backup & Sync", null) { nav.open(Routes.BACKUP) } }

        item { SectionHeader("Sample Data", Modifier.padding(horizontal = 8.dp)) }
        item {
            SwitchRow(Icons.Rounded.Science, "Show Sample Messages", s.showDemoData, subtitle = "Demo rows marked DEMO. They are not real SMS.") { on ->
                vm.update { it.copy(showDemoData = on) }
            }
        }
        item { NavRow(Icons.Rounded.DeleteSweep, "Delete Sample Data", "Removes every DEMO row") { confirmRemove = true } }
        item { NavRow(Icons.Rounded.Restore, "Reload Sample Data", "Fresh demo messages and transactions") { vm.restoreDemo() } }

        item { SectionHeader("Privacy & About", Modifier.padding(horizontal = 8.dp)) }
        item {
            NavRow(Icons.Rounded.SystemUpdate, "Get Latest Version", "You have ${BuildConfig.VERSION_NAME} · opens the download in your browser") {
                ctx.startActivity(
                    android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(LATEST_APK))
                        .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
        item {
            Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainer, modifier = Modifier.padding(horizontal = 8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoLine(Icons.Rounded.Shield, "Your SMS are read and sorted only on this phone. Internet is used only to save backups into your own Google Drive (if you connect it) and to check for a new version. Your normal SMS app keeps saving messages as before.")
                    InfoLine(Icons.Rounded.Shield, "One-time codes are kept in their own folder and hidden until you tap. Smart SMS never copies, auto-fills or forwards a code.")
                    InfoLine(Icons.Rounded.Info, "Smart SMS ${BuildConfig.VERSION_NAME}")
                }
            }
        }
    }

    if (confirmReread) {
        AlertDialog(
            onDismissRequest = { confirmReread = false },
            title = { Text("Read All SMS Again?") },
            text = { Text("Smart SMS forgets its copy of your SMS and reads them again from the phone. Your SMS on the phone are not touched. Stars and pins on real chats are reset.") },
            confirmButton = { TextButton(onClick = { vm.readAllAgain(); confirmReread = false }) { Text("Read Again") } },
            dismissButton = { TextButton(onClick = { confirmReread = false }) { Text("Cancel") } }
        )
    }

    if (confirmRemove) {
        AlertDialog(
            onDismissRequest = { confirmRemove = false },
            title = { Text("Delete Sample Data?") },
            text = { Text("All DEMO conversations, transactions and scheduled messages are removed. Your own data is not touched. You can reload samples later.") },
            confirmButton = { TextButton(onClick = { vm.removeDemo(); confirmRemove = false }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { confirmRemove = false }) { Text("Cancel") } }
        )
    }
}

private const val LATEST_APK = "https://github.com/buggybeginner-create/ourworldhive-site/releases/download/smartsms-apk/Smart-SMS.apk"

@Composable
private fun NavRow(icon: ImageVector, title: String, subtitle: String?, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = if (subtitle != null) { { Text(subtitle) } } else null,
        leadingContent = { Icon(icon, null, tint = MaterialTheme.colorScheme.primary) },
        trailingContent = { Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, null) },
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = Modifier.clickableRow(onClick)
    )
}

@Composable
private fun SwitchRow(icon: ImageVector, title: String, checked: Boolean, subtitle: String? = null, onChange: (Boolean) -> Unit) {
    ListItem(
        headlineContent = { Text(title) },
        supportingContent = if (subtitle != null) { { Text(subtitle) } } else null,
        leadingContent = { Icon(icon, null, tint = MaterialTheme.colorScheme.primary) },
        trailingContent = { Switch(checked = checked, onCheckedChange = onChange) },
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = Modifier.clickableRow { onChange(!checked) }
    )
}

@Composable
private fun InfoLine(icon: ImageVector, text: String) {
    androidx.compose.foundation.layout.Row {
        Icon(icon, null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(end = 10.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun Modifier.clickableRow(onClick: () -> Unit): Modifier = this.clickable(onClick = onClick)
