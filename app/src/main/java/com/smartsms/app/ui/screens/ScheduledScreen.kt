package com.smartsms.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Cancel
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.automirrored.rounded.ScheduleSend
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.ScheduledMessageEntity
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatFull
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.ScheduledViewModel
import java.util.Calendar
import java.util.TimeZone

@Composable
fun ScheduledScreen(nav: Navigator, vm: ScheduledViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val state by vm.state.collectAsStateWithLifecycle()
    var adding by rememberSaveable { mutableStateOf(false) }

    ScreenScaffold(
        title = "Scheduled",
        onBack = nav::back,
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { adding = true },
                icon = { Icon(Icons.Rounded.Add, null) },
                text = { Text("Schedule") }
            )
        }
    ) { pad ->
        Column(Modifier.padding(pad)) {
            Text(
                "Messages are saved with their time. Automatic sending is switched on in a later phase, once Smart SMS can be your default SMS app.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
            )
            StateContent(state) { list ->
                if (list.isEmpty()) {
                    EmptyState(Icons.AutoMirrored.Rounded.ScheduleSend, "Nothing Scheduled", "Tap Schedule to plan a birthday wish, a reminder or a follow-up.")
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(list, key = { it.id }) { s -> ScheduledCard(s, onCancel = { vm.cancel(s) }, onDelete = { vm.delete(s.id) }) }
                    }
                }
            }
        }
    }

    if (adding) {
        ScheduleDialog(
            onDismiss = { adding = false },
            onSave = { to, text, at -> vm.add(to, text, at); adding = false }
        )
    }
}

@Composable
private fun ScheduledCard(s: ScheduledMessageEntity, onCancel: () -> Unit, onDelete: () -> Unit) {
    val cancelled = s.status == ScheduledMessageEntity.STATUS_CANCELLED
    val past = s.sendAt < System.currentTimeMillis()
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(36.dp).clip(MaterialTheme.shapes.small)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.16f)),
                    contentAlignment = Alignment.Center
                ) { Icon(Icons.Rounded.Schedule, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp)) }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(s.recipient, style = MaterialTheme.typography.titleMedium)
                    Text(
                        when {
                            cancelled -> "Cancelled"
                            past -> "Was due ${formatFull(s.sendAt)}"
                            else -> formatFull(s.sendAt)
                        },
                        style = MaterialTheme.typography.labelMedium,
                        color = if (cancelled) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (s.isDemo) DemoBadge()
            }
            Spacer(Modifier.height(10.dp))
            Text(s.body, style = MaterialTheme.typography.bodyMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (!cancelled) {
                    TextButton(onClick = onCancel) {
                        Icon(Icons.Rounded.Cancel, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Cancel")
                    }
                }
                IconButton(onClick = onDelete) { Icon(Icons.Rounded.DeleteOutline, "Delete") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduleDialog(onDismiss: () -> Unit, onSave: (String, String, Long) -> Unit) {
    var to by rememberSaveable { mutableStateOf("") }
    var text by rememberSaveable { mutableStateOf("") }
    val start = remember { Calendar.getInstance().apply { add(Calendar.HOUR_OF_DAY, 1); set(Calendar.MINUTE, 0) } }
    var at by rememberSaveable { mutableLongStateOf(start.timeInMillis) }
    var pickDate by remember { mutableStateOf(false) }
    var pickTime by remember { mutableStateOf(false) }
    val valid = to.isNotBlank() && text.isNotBlank() && at > System.currentTimeMillis()

    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.AutoMirrored.Rounded.ScheduleSend, null) },
        title = { Text("Schedule a Message") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = to, onValueChange = { to = it }, label = { Text("To (phone number)") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = text, onValueChange = { text = it }, label = { Text("Message") }, minLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { pickDate = true }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Date")
                    }
                    OutlinedButton(onClick = { pickTime = true }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Rounded.Schedule, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Time")
                    }
                }
                Text(
                    if (at > System.currentTimeMillis()) "Sends ${formatFull(at)}" else "Pick a time in the future",
                    style = MaterialTheme.typography.labelMedium,
                    color = if (at > System.currentTimeMillis()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )
            }
        },
        confirmButton = { TextButton(enabled = valid, onClick = { onSave(to, text, at) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )

    if (pickDate) {
        // DatePicker works in UTC midnight; convert the chosen day back to local time, keeping the hour.
        val dp = rememberDatePickerState(initialSelectedDateMillis = toUtcMidnight(at))
        DatePickerDialog(
            onDismissRequest = { pickDate = false },
            confirmButton = {
                TextButton(onClick = {
                    dp.selectedDateMillis?.let { at = withDate(at, it) }
                    pickDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickDate = false }) { Text("Cancel") } }
        ) { DatePicker(state = dp) }
    }
    if (pickTime) {
        val cal = Calendar.getInstance().apply { timeInMillis = at }
        val tp = rememberTimePickerState(cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE), is24Hour = false)
        AlertDialog(
            onDismissRequest = { pickTime = false },
            title = { Text("Pick Time") },
            text = { TimePicker(state = tp) },
            confirmButton = {
                TextButton(onClick = {
                    at = Calendar.getInstance().apply {
                        timeInMillis = at
                        set(Calendar.HOUR_OF_DAY, tp.hour); set(Calendar.MINUTE, tp.minute); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                    }.timeInMillis
                    pickTime = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickTime = false }) { Text("Cancel") } }
        )
    }
}

private fun toUtcMidnight(local: Long): Long {
    val l = Calendar.getInstance().apply { timeInMillis = local }
    return Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        clear(); set(l.get(Calendar.YEAR), l.get(Calendar.MONTH), l.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}

private fun withDate(local: Long, utcMidnight: Long): Long {
    val d = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { timeInMillis = utcMidnight }
    return Calendar.getInstance().apply {
        timeInMillis = local
        set(d.get(Calendar.YEAR), d.get(Calendar.MONTH), d.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}
