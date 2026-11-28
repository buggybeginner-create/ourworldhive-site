package com.smartsms.app.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.screens.backup.BackupScreen
import com.smartsms.app.ui.screens.finance.FinanceScreen
import com.smartsms.app.ui.screens.inbox.InboxScreen
import com.smartsms.app.ui.screens.messages.MessageListScreen
import com.smartsms.app.ui.screens.scheduled.ScheduledScreen
import com.smartsms.app.ui.screens.settings.SettingsScreen
import com.smartsms.app.ui.screens.splash.SplashScreen
import com.smartsms.app.ui.screens.theme.ThemeScreen

private const val ANIM_MS = 280

@Composable
fun SmartSmsNavHost(navController: NavHostController = rememberNavController()) {
    val backStack by navController.currentBackStackEntryAsState()
    val currentDestination = backStack?.destination
    val showBottomBar = topLevelDestinations.any { it.route == currentDestination?.route }

    fun navigateTopLevel(route: String) {
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomBar,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut(),
            ) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                    topLevelDestinations.forEach { dest ->
                        val selected = currentDestination?.hierarchy?.any { it.route == dest.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = { navigateTopLevel(dest.route) },
                            icon = { Icon(dest.icon, contentDescription = null) },
                            label = { Text(dest.label) },
                            colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer),
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.SPLASH,
            enterTransition = { fadeIn(tween(ANIM_MS)) + slideInHorizontally(tween(ANIM_MS)) { it / 12 } },
            exitTransition = { fadeOut(tween(ANIM_MS)) },
            popEnterTransition = { fadeIn(tween(ANIM_MS)) },
            popExitTransition = { fadeOut(tween(ANIM_MS)) + slideOutHorizontally(tween(ANIM_MS)) { it / 12 } },
        ) {
            composable(Routes.SPLASH) {
                SplashScreen(onFinished = {
                    navController.navigate(Routes.INBOX) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                })
            }

            composable(Routes.INBOX) {
                InboxScreen(
                    onOpenCategory = { navController.navigate(Routes.messages(it)) },
                    onOpenConversation = { navController.navigate(Routes.messages(MessageCategory.ALL, it.address)) },
                    onOpenFinance = { navigateTopLevel(Routes.FINANCE) },
                    onOpenScheduled = { navigateTopLevel(Routes.SCHEDULED) },
                    onOpenTheme = { navController.navigate(Routes.THEME) },
                    onManageDemo = { navigateTopLevel(Routes.SETTINGS) },
                    contentPadding = PaddingValues(bottom = innerPadding.calculateBottomPadding()),
                    modifier = Modifier.statusBarsPadding(),
                )
            }

            composable(
                route = Routes.MESSAGES,
                arguments = listOf(
                    navArgument(Routes.ARG_CATEGORY) { type = NavType.StringType },
                    navArgument(Routes.ARG_QUERY) { type = NavType.StringType; defaultValue = "" },
                ),
            ) {
                MessageListScreen(
                    onBack = { navController.popBackStack() },
                    onManageDemo = { navigateTopLevel(Routes.SETTINGS) },
                )
            }

            composable(Routes.SCHEDULED) {
                ScheduledScreen(contentPadding = innerPadding)
            }

            composable(Routes.FINANCE) {
                FinanceScreen(contentPadding = innerPadding, onManageDemo = { navigateTopLevel(Routes.SETTINGS) })
            }

            composable(Routes.SETTINGS) {
                SettingsScreen(
                    contentPadding = innerPadding,
                    onOpenTheme = { navController.navigate(Routes.THEME) },
                    onOpenBackup = { navController.navigate(Routes.BACKUP) },
                )
            }

            composable(Routes.BACKUP) {
                BackupScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.THEME) {
                ThemeScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}

