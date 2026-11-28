package com.smartsms.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

private val Base = Typography()

private fun TextStyle.scaled(scale: Float): TextStyle = copy(
    fontSize = fontSize * scale,
    lineHeight = if (lineHeight == TextUnit.Unspecified) lineHeight else lineHeight * scale,
)

/** Modern sans typography; [scale] comes from the user's font-size preference. */
fun smartTypography(scale: Float): Typography {
    val family = FontFamily.SansSerif
    return Typography(
        displayLarge = Base.displayLarge.copy(fontFamily = family, fontWeight = FontWeight.Bold).scaled(scale),
        displayMedium = Base.displayMedium.copy(fontFamily = family, fontWeight = FontWeight.Bold).scaled(scale),
        displaySmall = Base.displaySmall.copy(fontFamily = family, fontWeight = FontWeight.Bold).scaled(scale),
        headlineLarge = Base.headlineLarge.copy(fontFamily = family, fontWeight = FontWeight.Bold).scaled(scale),
        headlineMedium = Base.headlineMedium.copy(fontFamily = family, fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp).scaled(scale),
        headlineSmall = Base.headlineSmall.copy(fontFamily = family, fontWeight = FontWeight.SemiBold).scaled(scale),
        titleLarge = Base.titleLarge.copy(fontFamily = family, fontWeight = FontWeight.SemiBold).scaled(scale),
        titleMedium = Base.titleMedium.copy(fontFamily = family, fontWeight = FontWeight.SemiBold).scaled(scale),
        titleSmall = Base.titleSmall.copy(fontFamily = family, fontWeight = FontWeight.Medium).scaled(scale),
        bodyLarge = Base.bodyLarge.copy(fontFamily = family).scaled(scale),
        bodyMedium = Base.bodyMedium.copy(fontFamily = family).scaled(scale),
        bodySmall = Base.bodySmall.copy(fontFamily = family).scaled(scale),
        labelLarge = Base.labelLarge.copy(fontFamily = family, fontWeight = FontWeight.SemiBold).scaled(scale),
        labelMedium = Base.labelMedium.copy(fontFamily = family, fontWeight = FontWeight.Medium).scaled(scale),
        labelSmall = Base.labelSmall.copy(fontFamily = family, fontWeight = FontWeight.Medium).scaled(scale),
    )
}
