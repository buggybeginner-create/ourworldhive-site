package com.smartsms.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartsms.app.data.db.UserSettingsEntity
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.ThemeMode

/** Chat appearance values read by the conversation screen. */
data class ChatAppearance(
    val bubbleStyle: BubbleStyle = BubbleStyle.ROUNDED,
    val corner: Int = 20,
    val showTimestamps: Boolean = true,
    val showAvatars: Boolean = true,
    val compactList: Boolean = false
)

val LocalChatAppearance = staticCompositionLocalOf { ChatAppearance() }

/** True when the dark palette (Premium Dark or AMOLED) is in use. */
val LocalIsDark = staticCompositionLocalOf { true }

private val Display = FontFamily.SansSerif

val SmartTypography = Typography(
    displaySmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 34.sp, lineHeight = 40.sp, letterSpacing = (-0.6).sp),
    headlineMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = (-0.4).sp),
    headlineSmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 28.sp, letterSpacing = (-0.2).sp),
    titleLarge = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 20.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp, letterSpacing = 0.1.sp),
    titleSmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.Medium, fontSize = 14.sp, lineHeight = 20.sp, letterSpacing = 0.1.sp),
    bodyLarge = TextStyle(fontFamily = Display, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 23.sp),
    bodyMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontFamily = Display, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp, letterSpacing = 0.2.sp),
    labelMedium = TextStyle(fontFamily = Display, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp, letterSpacing = 0.4.sp),
    labelSmall = TextStyle(fontFamily = Display, fontWeight = FontWeight.Medium, fontSize = 11.sp, lineHeight = 14.sp, letterSpacing = 0.6.sp)
)

val SmartShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp)
)

private fun premiumDark(accent: Color, secondary: Color) = darkColorScheme(
    primary = accent,
    onPrimary = Color.White,
    primaryContainer = accent.copy(alpha = 0.28f).compositeOver(Color(0xFF121726)),
    onPrimaryContainer = Color.White,
    secondary = secondary,
    onSecondary = Color(0xFF00121A),
    secondaryContainer = secondary.copy(alpha = 0.22f).compositeOver(Color(0xFF121726)),
    onSecondaryContainer = Color.White,
    background = Color(0xFF0B0F1A),
    onBackground = Color(0xFFE7EAF3),
    surface = Color(0xFF0B0F1A),
    onSurface = Color(0xFFE7EAF3),
    surfaceVariant = Color(0xFF1A2033),
    onSurfaceVariant = Color(0xFFA4ABC2),
    surfaceContainerLowest = Color(0xFF070A12),
    surfaceContainerLow = Color(0xFF101522),
    surfaceContainer = Color(0xFF131929),
    surfaceContainerHigh = Color(0xFF192034),
    surfaceContainerHighest = Color(0xFF20283F),
    outline = Color(0xFF3A4360),
    outlineVariant = Color(0xFF262E45),
    error = Color(0xFFFF6B81)
)

private fun amoled(accent: Color, secondary: Color) = premiumDark(accent, secondary).copy(
    background = Color.Black,
    surface = Color.Black,
    surfaceContainerLowest = Color.Black,
    surfaceContainerLow = Color(0xFF050505),
    surfaceContainer = Color(0xFF0D0D0F),
    surfaceContainerHigh = Color(0xFF141417),
    surfaceContainerHighest = Color(0xFF1C1C21),
    surfaceVariant = Color(0xFF16161A),
    primaryContainer = accent.copy(alpha = 0.25f).compositeOver(Color.Black),
    secondaryContainer = secondary.copy(alpha = 0.2f).compositeOver(Color.Black),
    outlineVariant = Color(0xFF1F1F24)
)

private fun light(accent: Color, secondary: Color) = lightColorScheme(
    primary = accent,
    onPrimary = Color.White,
    primaryContainer = accent.copy(alpha = 0.14f).compositeOver(Color.White),
    onPrimaryContainer = Color(0xFF16122E),
    secondary = secondary,
    onSecondary = Color.White,
    secondaryContainer = secondary.copy(alpha = 0.16f).compositeOver(Color.White),
    onSecondaryContainer = Color(0xFF062A33),
    background = Color(0xFFF6F7FB),
    onBackground = Color(0xFF12162A),
    surface = Color(0xFFF6F7FB),
    onSurface = Color(0xFF12162A),
    surfaceVariant = Color(0xFFE6E9F2),
    onSurfaceVariant = Color(0xFF545B73),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFBFBFE),
    surfaceContainer = Color.White,
    surfaceContainerHigh = Color(0xFFF0F2F8),
    surfaceContainerHighest = Color(0xFFE8EBF4),
    outline = Color(0xFFB9BFD2),
    outlineVariant = Color(0xFFDDE1EC),
    error = Color(0xFFD92D4B)
)

@Composable
fun SmartSmsTheme(
    settings: UserSettingsEntity,
    accent: Color,
    secondary: Color,
    content: @Composable () -> Unit
) {
    val mode = ThemeMode.fromKey(settings.themeMode)
    val systemDark = isSystemInDarkTheme()
    val dark = when (mode) {
        ThemeMode.SYSTEM -> systemDark
        ThemeMode.LIGHT -> false
        ThemeMode.DARK, ThemeMode.AMOLED -> true
    }
    val context = LocalContext.current
    val dynamicOk = settings.useDynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    var scheme: ColorScheme = when {
        dynamicOk && dark -> dynamicDarkColorScheme(context)
        dynamicOk -> dynamicLightColorScheme(context)
        mode == ThemeMode.AMOLED -> amoled(accent, secondary)
        dark -> premiumDark(accent, secondary)
        else -> light(accent, secondary)
    }
    if (dynamicOk && mode == ThemeMode.AMOLED) {
        scheme = scheme.copy(background = Color.Black, surface = Color.Black, surfaceContainerLowest = Color.Black)
    }

    val density = LocalDensity.current
    val scaled = Density(density.density, density.fontScale * settings.fontScale.coerceIn(0.8f, 1.5f))
    val chat = ChatAppearance(
        bubbleStyle = BubbleStyle.fromKey(settings.bubbleStyle),
        corner = settings.bubbleCorner,
        showTimestamps = settings.showTimestamps,
        showAvatars = settings.showAvatars,
        compactList = settings.compactList
    )

    CompositionLocalProvider(
        LocalDensity provides scaled,
        LocalChatAppearance provides chat,
        LocalIsDark provides dark
    ) {
        MaterialTheme(colorScheme = scheme, typography = SmartTypography, shapes = SmartShapes, content = content)
    }
}
