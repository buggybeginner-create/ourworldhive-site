package com.smartsms.app.ui.nav

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import kotlinx.coroutines.flow.MutableStateFlow
import com.smartsms.app.ui.screens.NewMessageScreen
import com.smartsms.app.ui.screens.BillsScreen
import com.smartsms.app.ui.screens.ChatListScreen
import com.smartsms.app.ui.screens.QuickRepliesScreen
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.screens.BackupScreen
import com.smartsms.app.ui.screens.ConversationScreen
import com.smartsms.app.ui.screens.FinanceScreen
import com.smartsms.app.ui.screens.InboxScreen
import com.smartsms.app.ui.screens.MessagesScreen
import com.smartsms.app.ui.screens.ScheduledScreen
import com.smartsms.app.ui.screens.SearchScreen
import com.smartsms.app.ui.screens.SettingsScreen
import com.smartsms.app.ui.screens.SplashScreen
import com.smartsms.app.ui.screens.ThemeScreen

object Routes {
    const val SPLASH = "splash"
    const val INBOX = "inbox"
    const val MESSAGES = "messages"
    const val CATEGORY = "category/{cat}"
    const val CONVERSATION = "conversation/{id}"
    const val SEARCH = "search"
    const val SCHEDULED = "scheduled"
    const val FINANCE = "finance"
    const val BACKUP = "backup"
    const val THEME = "theme"
    const val SETTINGS = "settings"
    const val COMPOSE = "compose"
    const val BILLS = "bills"
    const val CHATS = "chats/{kind}"
    const val QUICK = "quickreplies"
    fun chats(kind: String) = "chats/$kind"

    fun category(c: MessageCategory) = "category/${c.key}"
    fun conversation(id: Long) = "conversation/$id"
}

private data class TopLevel(val route: String, val label: String, val icon: ImageVector)

private val topLevel = listOf(
    TopLevel(Routes.INBOX, "Inbox", Icons.Rounded.Home),
    TopLevel(Routes.MESSAGES, "Messages", Icons.Rounded.Forum),
    TopLevel(Routes.FINANCE, "Finance", Icons.Rounded.AccountBalanceWallet),
    TopLevel(Routes.SETTINGS, "Settings", Icons.Rounded.Settings)
)

/** Actions every screen can call; keeps screens free of NavController details. */
class Navigator(private val nav: NavHostController) {
    fun open(route: String) = nav.navigate(route) { launchSingleTop = true }
    fun openCategory(c: MessageCategory) = open(Routes.category(c))
    fun openConversation(id: Long) = open(Routes.conversation(id))
    fun back() { nav.popBackStack() }
    fun tab(route: String) = nav.navigate(route) {
        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
    fun finishSplash() = nav.navigate(Routes.INBOX) { popUpTo(Routes.SPLASH) { inclusive = true } }
}

@Composable
fun SmartSmsNavHost(onRetryInit: () -> Unit, openRequests: MutableStateFlow<Long?>) {
    val nav = rememberNavController()
    val navigator = Navigator(nav)
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route
    val openId by openRequests.collectAsState()
    LaunchedEffect(openId, route) {
        val id = openId
        if (id != null && route != null && route != Routes.SPLASH) {
            openRequests.value = null
            navigator.openConversation(id)
        }
    }
    val showBar = topLevel.any { it.route == route }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (showBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer, tonalElevation = 0.dp) {
                    topLevel.forEach { t ->
                        NavigationBarItem(
                            selected = route == t.route,
                            onClick = { navigator.tab(t.route) },
                            icon = { Icon(t.icon, contentDescription = t.label) },
                            label = { Text(t.label) },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Routes.SPLASH,
            modifier = Modifier.padding(bottom = padding.calculateBottomPadding()),
            enterTransition = { slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(260)) + fadeIn(tween(260)) },
            exitTransition = { fadeOut(tween(180)) },
            popEnterTransition = { fadeIn(tween(220)) },
            popExitTransition = { slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(240)) + fadeOut(tween(240)) }
        ) {
            composable(Routes.SPLASH, enterTransition = { fadeIn() }, exitTransition = { fadeOut(tween(400)) }) {
                SplashScreen(onReady = navigator::finishSplash, onRetry = onRetryInit)
            }
            composable(Routes.INBOX, enterTransition = { fadeIn(tween(300)) }) { InboxScreen(navigator) }
            composable(Routes.MESSAGES, enterTransition = { fadeIn(tween(220)) }) { MessagesScreen(navigator, fixedCategory = null) }
            composable(Routes.CATEGORY, arguments = listOf(navArgument("cat") { type = NavType.StringType })) { e ->
                MessagesScreen(navigator, fixedCategory = MessageCategory.fromKey(e.arguments?.getString("cat")))
            }
            composable(Routes.CONVERSATION, arguments = listOf(navArgument("id") { type = NavType.LongType })) {
                ConversationScreen(navigator)
            }
            composable(Routes.SEARCH) { SearchScreen(navigator) }
            composable(Routes.SCHEDULED) { ScheduledScreen(navigator) }
            composable(Routes.FINANCE, enterTransition = { fadeIn(tween(220)) }) { FinanceScreen(navigator) }
            composable(Routes.BACKUP) { BackupScreen(navigator) }
            composable(Routes.THEME) { ThemeScreen(navigator) }
            composable(Routes.SETTINGS, enterTransition = { fadeIn(tween(220)) }) { SettingsScreen(navigator) }
            composable(Routes.COMPOSE) { NewMessageScreen(navigator) }
            composable(Routes.BILLS) { BillsScreen(navigator) }
            composable(Routes.QUICK) { QuickRepliesScreen(navigator) }
            composable(Routes.CHATS, arguments = listOf(navArgument("kind") { type = NavType.StringType })) { ChatListScreen(navigator) }
        }
    }
}

