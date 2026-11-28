package com.smartsms.app.ui.screens.theme

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.BrightnessAuto
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Contrast
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.local.entity.ThemeEntity
import com.smartsms.app.data.local.entity.UserSettingsEntity
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.FontSize
import com.smartsms.app.domain.ThemeMode
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.bubbleShape
import com.smartsms.app.ui.screens.settings.SettingsGroup
import com.smartsms.app.ui.screens.settings.SettingsViewModel
import com.smartsms.app.ui.util.UiState
import kotlin.math.roundToInt

private fun ThemeMode.icon(): ImageVector = when (this) {
    ThemeMode.SYSTEM -> Icons.Rounded.BrightnessAuto
    ThemeMode.LIGHT -> Icons.Rounded.LightMode
    ThemeMode.DARK -> Icons.Rounded.DarkMode
    ThemeMode.AMOLED -> Icons.Rounded.Contrast
}

private fun ThemeMode.shortLabel(): String = when (this) {
    ThemeMode.SYSTEM -> "System"
    ThemeMode.LIGHT -> "Light"
    ThemeMode.DARK -> "Dark"
    ThemeMode.AMOLED -> "AMOLED"
}

@Composable
fun ThemeScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Theme customisation") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                UiState.Loading -> LoadingState()
                is UiState.Error -> ErrorState(s.message)
                is UiState.Success -> {
                    val settings = s.data.settings
                    LazyColumn(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        item { PreviewCard(settings) }
                        item {
                            SettingsGroup("Theme") {
                                ThemeModePicker(settings.themeMode, viewModel::setThemeMode)
                            }
                        }
                        item {
                            SettingsGroup("Accent colour") {
                                AccentPicker(s.data.themes, settings.accentThemeId, viewModel::setAccent)
                            }
                        }
                        item {
                            SettingsGroup("Font size") {
                                FontSizePicker(settings.fontSize, viewModel::setFontSize)
                            }
                        }
                        item {
                            SettingsGroup("Chat bubbles") {
                                BubblePicker(settings.bubbleStyle, viewModel::setBubbleStyle)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PreviewCard(settings: UserSettingsEntity) {
    val colors = MaterialTheme.colorScheme
    Card(shape = MaterialTheme.shapes.large, colors = CardDefaults.cardColors(containerColor = colors.surfaceContainer)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Preview", style = MaterialTheme.typography.labelLarge, color = colors.onSurfaceVariant)
            Surface(shape = bubbleShape(settings.bubbleStyle, incoming = true), color = colors.surfaceContainerHighest, modifier = Modifier.widthIn(max = 260.dp)) {
                Text("Are we still meeting at 8?", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(12.dp))
            }
            Row(Modifier.fillMaxWidth()) {
                Spacer(Modifier.weight(1f))
                Surface(shape = bubbleShape(settings.bubbleStyle, incoming = false), color = colors.primary, modifier = Modifier.widthIn(max = 260.dp)) {
                    Text("Yes! See you there 👋", style = MaterialTheme.typography.bodyLarge, color = colors.onPrimary, modifier = Modifier.padding(12.dp))
                }
            }
        }
    }
}

@Composable
private fun ThemeModePicker(selected: ThemeMode, onSelect: (ThemeMode) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ThemeMode.entries.forEach { mode ->
            val isSelected = mode == selected
            val bg by animateColorAsState(
                if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerHigh,
                label = "themeModeBg",
            )
            val swatch = when (mode) {
                ThemeMode.SYSTEM -> Brush.linearGradient(listOf(Color(0xFFF6F6FB), Color(0xFF0E0F1A)))
                ThemeMode.LIGHT -> Brush.linearGradient(listOf(Color(0xFFFFFFFF), Color(0xFFE6E7F1)))
                ThemeMode.DARK -> Brush.linearGradient(listOf(Color(0xFF1F2236), Color(0xFF0E0F1A)))
                ThemeMode.AMOLED -> Brush.linearGradient(listOf(Color(0xFF141414), Color(0xFF000000)))
            }
            Column(
                Modifier
                    .weight(1f)
                    .background(bg, RoundedCornerShape(16.dp))
                    .clickable { onSelect(mode) }
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier
                        .size(40.dp)
                        .background(swatch, CircleShape)
                        .border(2.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(mode.icon(), contentDescription = null, tint = if (mode == ThemeMode.LIGHT) Color(0xFF151728) else Color.White, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    mode.shortLabel(),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
private fun AccentPicker(themes: List<ThemeEntity>, selectedId: Long, onSelect: (Long) -> Unit) {
    FlowRow(
        Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        themes.forEach { theme ->
            val selected = theme.id == selectedId
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(64.dp)) {
                Box(
                    Modifier
                        .size(48.dp)
                        .background(Brush.linearGradient(listOf(Color(theme.primaryArgb), Color(theme.secondaryArgb))), CircleShape)
                        .border(if (selected) 3.dp else 0.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape)
                        .clickable { onSelect(theme.id) },
                    contentAlignment = Alignment.Center,
                ) {
                    if (selected) Icon(Icons.Rounded.Check, contentDescription = "Selected", tint = Color.White)
                }
                Spacer(Modifier.height(6.dp))
                Text(theme.name, style = MaterialTheme.typography.labelSmall, maxLines = 1)
            }
        }
    }
}

@Composable
private fun FontSizePicker(selected: FontSize, onSelect: (FontSize) -> Unit) {
    val sizes = FontSize.entries
    Column(Modifier.padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Aa", style = MaterialTheme.typography.bodySmall)
            Slider(
                value = sizes.indexOf(selected).toFloat(),
                onValueChange = { onSelect(sizes[it.roundToInt().coerceIn(0, sizes.lastIndex)]) },
                valueRange = 0f..sizes.lastIndex.toFloat(),
                steps = sizes.size - 2,
                modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
            )
            Text("Aa", style = MaterialTheme.typography.titleLarge)
        }
        Text(selected.label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun BubblePicker(selected: BubbleStyle, onSelect: (BubbleStyle) -> Unit) {
    val options = BubbleStyle.entries
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(16.dp)) {
        options.forEachIndexed { index, style ->
            SegmentedButton(
                selected = style == selected,
                onClick = { onSelect(style) },
                shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size),
            ) { Text(style.label) }
        }
    }
}
