package com.smartsms.app.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect

/** A yes/no that is checked again whenever the screen comes back (e.g. from Android settings). */
@Composable
fun rememberCheck(check: () -> Boolean): MutableState<Boolean> {
    val state = remember { mutableStateOf(check()) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { state.value = check() }
    return state
}
