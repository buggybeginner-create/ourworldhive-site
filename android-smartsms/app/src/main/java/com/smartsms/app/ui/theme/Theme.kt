package com.smartsms.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.FontSize
import com.smartsms.app.domain.ThemeMode

/** Chat appearance preferences, available anywhere via [LocalChatAppearance]. */
@Immutable
data class ChatAppearance(
    val bubbleStyle: BubbleStyle = BubbleStyle.ROUNDED,
    val showAvatars: Boolean = true,
    val compactMode: Boolean = false,
)

val LocalChatAppearance = staticCompositionLocalOf { ChatAppearance() }

val SmartShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

private fun onColorFor(color: Color): Color = if (color.luminance() > 0.5f) Color(0xFF111111) else Color.White

fun smartColorScheme(mode: ThemeMode, systemDark: Boolean, primary: Color, secondary: Color): ColorScheme {
    val resolved = if (mode == ThemeMode.SYSTEM) (if (systemDark) ThemeMode.DARK else ThemeMode.LIGHT) else mode
    return when (resolved) {
        ThemeMode.LIGHT -> lightColorScheme(
            primary = primary,
            onPrimary = onColorFor(primary),
            primaryContainer = primary.copy(alpha = 0.14f).compositeOver(Palette.LightSurface),
            onPrimaryContainer = primary,
            secondary = secondary,
            onSecondary = onColorFor(secondary),
            secondaryContainer = secondary.copy(alpha = 0.16f).compositeOver(Palette.LightSurface),
            onSecondaryContainer = Palette.LightOnSurface,
            tertiary = Palette.Warning,
            background = Palette.LightBackground,
            onBackground = Palette.LightOnSurface,
            surface = Palette.LightSurface,
            onSurface = Palette.LightOnSurface,
            surfaceVariant = Palette.LightSurfaceHigh,
            onSurfaceVariant = Palette.LightOnSurfaceVariant,
            surfaceContainerLowest = Palette.LightSurface,
            surfaceContainerLow = Palette.LightSurface,
            surfaceContainer = Palette.LightSurfaceHigh,
            surfaceContainerHigh = Palette.LightSurfaceHigh,
            surfaceContainerHighest = Palette.LightSurfaceHighest,
            outline = Palette.LightOutline,
            outlineVariant = Palette.LightSurfaceHighest,
            error = Palette.Danger,
        )
        ThemeMode.AMOLED -> darkColorScheme(
            primary = primary,
            onPrimary = onColorFor(primary),
            primaryContainer = primary.copy(alpha = 0.22f).compositeOver(Palette.AmoledSurface),
            onPrimaryContainer = Color.White,
            secondary = secondary,
            onSecondary = onColorFor(secondary),
            secondaryContainer = secondary.copy(alpha = 0.2f).compositeOver(Palette.AmoledSurface),
            onSecondaryContainer = Color.White,
            tertiary = Palette.Warning,
            background = Palette.AmoledBackground,
            onBackground = Palette.DarkOnSurface,
            surface = Palette.AmoledBackground,
            onSurface = Palette.DarkOnSurface,
            surfaceVariant = Palette.AmoledSurfaceHigh,
            onSurfaceVariant = Palette.DarkOnSurfaceVariant,
            surfaceContainerLowest = Palette.AmoledBackground,
            surfaceContainerLow = Palette.AmoledSurface,
            surfaceContainer = Palette.AmoledSurface,
            surfaceContainerHigh = Palette.AmoledSurfaceHigh,
            surfaceContainerHighest = Palette.AmoledSurfaceHighest,
            outline = Palette.AmoledOutline,
            outlineVariant = Palette.AmoledSurfaceHigh,
            error = Palette.Danger,
        )
        else -> darkColorScheme(
            primary = primary,
            onPrimary = onColorFor(primary),
            primaryContainer = primary.copy(alpha = 0.24f).compositeOver(Palette.DarkSurface),
            onPrimaryContainer = Color.White,
            secondary = secondary,
            onSecondary = onColorFor(secondary),
            secondaryContainer = secondary.copy(alpha = 0.2f).compositeOver(Palette.DarkSurface),
            onSecondaryContainer = Color.White,
            tertiary = Palette.Warning,
            background = Palette.DarkBackground,
            onBackground = Palette.DarkOnSurface,
            surface = Palette.DarkBackground,
            onSurface = Palette.DarkOnSurface,
            surfaceVariant = Palette.DarkSurfaceHigh,
            onSurfaceVariant = Palette.DarkOnSurfaceVariant,
            surfaceContainerLowest = Palette.DarkBackground,
            surfaceContainerLow = Palette.DarkSurface,
            surfaceContainer = Palette.DarkSurface,
            surfaceContainerHigh = Palette.DarkSurfaceHigh,
            surfaceContainerHighest = Palette.DarkSurfaceHighest,
            outline = Palette.DarkOutline,
            outlineVariant = Palette.DarkSurfaceHigh,
            error = Palette.Danger,
        )
    }
}

fun isDarkMode(mode: ThemeMode, systemDark: Boolean): Boolean = when (mode) {
    ThemeMode.SYSTEM -> systemDark
    ThemeMode.LIGHT -> false
    ThemeMode.DARK, ThemeMode.AMOLED -> true
}

@Composable
fun SmartSmsTheme(
    themeMode: ThemeMode = ThemeMode.DARK,
    primary: Color = Color(0xFF7C6CF2),
    secondary: Color = Color(0xFF00CEC9),
    fontSize: FontSize = FontSize.MEDIUM,
    chatAppearance: ChatAppearance = ChatAppearance(),
    content: @Composable () -> Unit,
) {
    val colorScheme = smartColorScheme(themeMode, isSystemInDarkTheme(), primary, secondary)
    CompositionLocalProvider(LocalChatAppearance provides chatAppearance) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = smartTypography(fontSize.scale),
            shapes = SmartShapes,
            content = content,
        )
    }
}
