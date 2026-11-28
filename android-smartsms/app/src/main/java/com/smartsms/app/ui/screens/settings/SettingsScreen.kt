package com.smartsms.app.ui.screens.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.TextFields
import androidx.compose.material.icons.rounded.ViewAgenda
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.BuildConfig
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.SettingsRow
import com.smartsms.app.ui.theme.Palette
import com.smartsms.app.ui.util.UiState

@Composable
fun SettingsScreen(
    contentPadding: PaddingValues,
    onOpenTheme: () -> Unit,
    onOpenBackup: () -> Unit,
    viewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.messageShown()
        }
    }

    Scaffold(
        modifier = Modifier.padding(contentPadding),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                UiState.Loading -> LoadingState()
                is UiState.Error -> ErrorState(s.message)
                is UiState.Success -> {
                    val settings = s.data.settings
                    val accentName = s.data.themes.firstOrNull { it.id == settings.accentThemeId }?.name ?: "Custom"
                    LazyColumn(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        item {
                            SettingsGroup("Appearance") {
                                SettingsRow(
                                    icon = Icons.Rounded.Palette,
                                    title = "Theme & colours",
                                    subtitle = "${settings.themeMode.label} · $accentName",
                                    onClick = onOpenTheme,
                                    trailing = { Chevron() },
                                )
                                HorizontalDivider(Modifier.padding(start = 70.dp))
                                SettingsRow(
                                    icon = Icons.Rounded.TextFields,
                                    title = "Font size",
                                    subtitle = settings.fontSize.label,
                                    onClick = onOpenTheme,
                                    trailing = { Chevron() },
                                )
                            }
                        }
                        item {
                            SettingsGroup("Chat appearance") {
                                SettingsRow(
                                    icon = Icons.Rounded.ChatBubbleOutline,
                                    title = "Bubble style",
                                    subtitle = settings.bubbleStyle.label,
                                    onClick = onOpenTheme,
                                    trailing = { Chevron() },
                                )
                                HorizontalDivider(Modifier.padding(start = 70.dp))
                                SettingsRow(
                                    icon = Icons.Rounded.AccountCircle,
                                    title = "Show avatars",
                                    subtitle = "Coloured initials next to each sender",
                                    onClick = { viewModel.setShowAvatars(!settings.showAvatars) },
                                    trailing = { Switch(checked = settings.showAvatars, onCheckedChange = viewModel::setShowAvatars) },
                                )
                                HorizontalDivider(Modifier.padding(start = 70.dp))
                                SettingsRow(
                                    icon = Icons.Rounded.ViewAgenda,
                                    title = "Compact list",
                                    subtitle = "Fit more messages on screen",
                                    onClick = { viewModel.setCompactMode(!settings.compactMode) },
                                    trailing = { Switch(checked = settings.compactMode, onCheckedChange = viewModel::setCompactMode) },
                                )
                            }
                        }
                        item {
                            SettingsGroup("Data") {
                                SettingsRow(
                                    icon = Icons.Rounded.CloudSync,
                                    title = "Backup & Sync",
                                    subtitle = "Local backups and history",
                                    onClick = onOpenBackup,
                                    trailing = { Chevron() },
                                )
                            }
                        }
                        item {
                            SettingsGroup("Demo data") {
                                SettingsRow(
                                    icon = Icons.Rounded.Science,
                                    iconTint = Palette.DemoBadge,
                                    title = "Show demo data",
                                    subtitle = "Sample messages marked DEMO. They are not real SMS.",
                                    onClick = { viewModel.setShowDemoData(!settings.showDemoData) },
                                    trailing = { Switch(checked = settings.showDemoData, onCheckedChange = viewModel::setShowDemoData) },
                                )
                                HorizontalDivider(Modifier.padding(start = 70.dp))
                                SettingsRow(
                                    icon = Icons.Rounded.Refresh,
                                    iconTint = Palette.DemoBadge,
                                    title = "Reset demo data",
                                    subtitle = "Recreate the sample messages with fresh dates",
                                    onClick = viewModel::resetDemoData,
                                )
                                HorizontalDivider(Modifier.padding(start = 70.dp))
                                SettingsRow(
                                    icon = Icons.Rounded.DeleteSweep,
                                    iconTint = Palette.Danger,
                                    title = "Delete demo data",
                                    subtitle = "Remove every sample item permanently",
                                    onClick = { confirmDelete = true },
                                )
                            }
                        }
                        item {
                            SettingsGroup("About") {
                                SettingsRow(
                                    icon = Icons.Rounded.Shield,
                                    title = "Privacy",
                                    subtitle = "Phase 1 stores everything on this phone and does not read your SMS.",
                                )
                                HorizontalDivider(Modifier.padding(start = 70.dp))
                                SettingsRow(
                                    icon = Icons.Rounded.Info,
                                    title = "Smart SMS",
                                    subtitle = "Version ${BuildConfig.VERSION_NAME}",
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete demo data?") },
            text = { Text("All sample messages, transactions and schedules marked DEMO will be removed. Your own data stays. You can bring the samples back with Reset demo data.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteDemoData()
                    confirmDelete = false
                }) { Text("Delete", color = Palette.Danger) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
fun SettingsGroup(title: String, content: @Composable () -> Unit) {
    Column {
        Text(
            title,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(start = 6.dp, bottom = 8.dp),
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        ) {
            Column {
                Spacer(Modifier.height(4.dp))
                content()
                Spacer(Modifier.height(4.dp))
            }
        }
    }
}

@Composable
private fun Chevron() {
    Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
}
