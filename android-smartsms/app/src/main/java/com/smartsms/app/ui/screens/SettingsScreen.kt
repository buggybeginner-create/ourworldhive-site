package com.smartsms.app.ui.screens

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

        item { SectionHeader("Messages & Data", Modifier.padding(horizontal = 8.dp)) }
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
            Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainer, modifier = Modifier.padding(horizontal = 8.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoLine(Icons.Rounded.Shield, "This version asks for no SMS, contacts or internet permission. Everything stays on this phone.")
                    InfoLine(Icons.Rounded.Shield, "One-time codes are kept in their own folder and hidden until you tap. Smart SMS never copies, auto-fills or forwards a code.")
                    InfoLine(Icons.Rounded.Info, "Smart SMS ${BuildConfig.VERSION_NAME} · Phase 1")
                }
            }
        }
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
