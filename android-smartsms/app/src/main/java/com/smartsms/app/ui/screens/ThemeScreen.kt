package com.smartsms.app.ui.screens

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.ThemeEntity
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.domain.ThemeMode
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.components.toColor
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.SettingsViewModel

@Composable
fun ThemeScreen(nav: Navigator, vm: SettingsViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val settings by vm.settings.collectAsStateWithLifecycle()
    val themes by vm.themes.collectAsStateWithLifecycle()
    ScreenScaffold(title = "Themes", onBack = nav::back) { pad ->
        val s = settings
        if (s == null) LoadingState(Modifier.padding(pad))
        else ThemeContent(s, themes, vm, PaddingValues(start = 16.dp, end = 16.dp, top = pad.calculateTopPadding(), bottom = pad.calculateBottomPadding() + 24.dp))
    }
}

@Composable
private fun ThemeContent(s: UserSettingsEntity, themes: List<ThemeEntity>, vm: SettingsViewModel, pad: PaddingValues) {
    val mode = ThemeMode.fromKey(s.themeMode)
    LazyColumn(contentPadding = pad, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { PreviewCard() }
        item { SectionHeader("Mode") }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ThemeMode.entries.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { m ->
                            ModeCard(m, selected = m == mode, Modifier.weight(1f)) { vm.update { it.copy(themeMode = m.key) } }
                        }
                    }
                }
            }
        }
        item { SectionHeader("Accent Colour") }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                themes.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { t ->
                            AccentSwatch(t, selected = t.id == s.themeId && !s.useDynamicColor, Modifier.weight(1f)) {
                                vm.update { it.copy(themeId = t.id, useDynamicColor = false) }
                            }
                        }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            item {
                ListItem(
                    headlineContent = { Text("Wallpaper Colours") },
                    supportingContent = { Text("Use Material You colours from your wallpaper instead of the accent above") },
                    trailingContent = { Switch(checked = s.useDynamicColor, onCheckedChange = { on -> vm.update { it.copy(useDynamicColor = on) } }) },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent)
                )
            }
        }
    }
}

@Composable
private fun PreviewCard() {
    val cs = MaterialTheme.colorScheme
    Column(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.large).background(cs.surfaceContainer).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text("Preview", style = MaterialTheme.typography.labelMedium, color = cs.onSurfaceVariant)
        Box(Modifier.clip(RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)).background(cs.surfaceContainerHighest).padding(12.dp)) {
            Text("Did the parcel arrive?", color = cs.onSurface)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Box(Modifier.clip(RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp)).background(cs.primary).padding(12.dp)) {
                Text("Yes, just now! 🎉", color = cs.onPrimary)
            }
        }
    }
}

@Composable
private fun ModeCard(m: ThemeMode, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val (bg, fg) = when (m) {
        ThemeMode.LIGHT -> Color(0xFFF6F7FB) to Color(0xFF12162A)
        ThemeMode.DARK -> Color(0xFF131929) to Color(0xFFE7EAF3)
        ThemeMode.AMOLED -> Color.Black to Color.White
        ThemeMode.SYSTEM -> Color(0xFF6B7280) to Color.White
    }
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
    Box(
        modifier.height(76.dp).clip(MaterialTheme.shapes.medium)
            .background(if (m == ThemeMode.SYSTEM) Brush.linearGradient(listOf(Color(0xFFF6F7FB), Color.Black)) else Brush.linearGradient(listOf(bg, bg)))
            .border(if (selected) 2.dp else 1.dp, border, MaterialTheme.shapes.medium)
            .clickable(onClick = onClick)
            .padding(14.dp)
    ) {
        Text(m.label, color = fg, style = MaterialTheme.typography.titleSmall, modifier = Modifier.align(Alignment.BottomStart))
        if (selected) {
            Box(
                Modifier.align(Alignment.TopEnd).size(22.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) { Icon(Icons.Rounded.Check, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onPrimary) }
        }
    }
}

@Composable
private fun AccentSwatch(t: ThemeEntity, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val a = t.accentArgb.toColor()
    val b = t.secondaryArgb.toColor()
    Column(modifier.clip(MaterialTheme.shapes.medium).clickable(onClick = onClick).padding(6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(56.dp).clip(CircleShape).background(Brush.linearGradient(listOf(a, b)))
                .border(if (selected) 3.dp else 0.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape),
            contentAlignment = Alignment.Center
        ) { if (selected) Icon(Icons.Rounded.Check, null, tint = Color.White) }
        Spacer(Modifier.height(6.dp))
        Text(t.name, style = MaterialTheme.typography.labelMedium, maxLines = 1)
    }
}
