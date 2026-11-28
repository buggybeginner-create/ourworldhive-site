package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.FontSize
import com.smartsms.app.domain.ThemeMode

/** Single-row table (id is always 1) holding the user's preferences. */
@Entity(tableName = "user_settings")
data class UserSettingsEntity(
    @PrimaryKey val id: Int = SINGLETON_ID,
    val themeMode: ThemeMode = ThemeMode.DARK,
    val accentThemeId: Long = 1,
    val fontSize: FontSize = FontSize.MEDIUM,
    val bubbleStyle: BubbleStyle = BubbleStyle.ROUNDED,
    val showAvatars: Boolean = true,
    val compactMode: Boolean = false,
    val showDemoData: Boolean = true,
    val demoDataSeeded: Boolean = false,
) {
    companion object {
        const val SINGLETON_ID = 1
    }
}
