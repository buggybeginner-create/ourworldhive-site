package com.smartsms.app.ui.navigation

import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Inbox
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.ui.graphics.vector.ImageVector
import com.smartsms.app.domain.MessageCategory

object Routes {
    const val SPLASH = "splash"
    const val INBOX = "inbox"
    const val MESSAGES = "messages/{category}?query={query}"
    const val SCHEDULED = "scheduled"
    const val FINANCE = "finance"
    const val BACKUP = "backup"
    const val THEME = "theme"
    const val SETTINGS = "settings"

    const val ARG_CATEGORY = "category"
    const val ARG_QUERY = "query"

    fun messages(category: MessageCategory, query: String = ""): String =
        "messages/${category.key}?query=${Uri.encode(query)}"
}

data class TopLevelDestination(val route: String, val label: String, val icon: ImageVector)

val topLevelDestinations = listOf(
    TopLevelDestination(Routes.INBOX, "Inbox", Icons.Rounded.Inbox),
    TopLevelDestination(Routes.FINANCE, "Finance", Icons.Rounded.AccountBalanceWallet),
    TopLevelDestination(Routes.SCHEDULED, "Scheduled", Icons.Rounded.Schedule),
    TopLevelDestination(Routes.SETTINGS, "Settings", Icons.Rounded.Settings),
)
