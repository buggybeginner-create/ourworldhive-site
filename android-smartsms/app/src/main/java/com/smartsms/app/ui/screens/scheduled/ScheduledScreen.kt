package com.smartsms.app.ui.screens.scheduled

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Restore
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.ScheduleSend
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.ScheduleStatus
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.util.Format
import com.smartsms.app.ui.util.UiState
import java.util.Calendar
import java.util.TimeZone

@Composable
fun ScheduledScreen(
    contentPadding: PaddingValues,
    viewModel: ScheduledViewModel = viewModel(factory = ScheduledViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showComposer by remember { mutableStateOf(false) }

    Scaffold(
        modifier = Modifier.padding(contentPadding),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = { Text("Scheduled messages") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showComposer = true },
                icon = { Icon(Icons.Rounded.Add, contentDescription = null) },
                text = { Text("Schedule") },
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                UiState.Loading -> LoadingState()
                is UiState.Error -> ErrorState(s.message)
                is UiState.Success -> {
                    val pending = s.data.filter { it.status == ScheduleStatus.PENDING }
                    val cancelled = s.data.filter { it.status == ScheduleStatus.CANCELLED }
                    LazyColumn(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        item { PhaseNotice() }
                        if (s.data.isEmpty()) {
                            item {
                                EmptyState(
                                    icon = Icons.Rounded.ScheduleSend,
                                    title = "Nothing scheduled",
                                    message = "Plan birthday wishes, reminders and follow-ups ahead of time.",
                                    actionLabel = "Schedule a message",
                                    onAction = { showComposer = true },
                                )
                            }
                        }
                        if (pending.isNotEmpty()) {
                            item { SectionHeader("Upcoming · ${pending.size}") }
                            items(pending, key = { it.id }) { item ->
                                ScheduledCard(item, onCancel = { viewModel.cancel(item.id) }, onRestore = {}, onDelete = { viewModel.delete(item.id) })
                            }
                        }
                        if (cancelled.isNotEmpty()) {
                            item { SectionHeader("Cancelled · ${cancelled.size}") }
                            items(cancelled, key = { it.id }) { item ->
                                ScheduledCard(item, onCancel = {}, onRestore = { viewModel.restore(item.id) }, onDelete = { viewModel.delete(item.id) })
                            }
                        }
                    }
                }
            }
        }
    }

    if (showComposer) {
        ScheduleComposer(
            validate = viewModel::validate,
            onDismiss = { showComposer = false },
            onSave = { name, number, body, at ->
                viewModel.schedule(name, number, body, at)
                showComposer = false
            },
        )
    }
}

@Composable
private fun PhaseNotice() {
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.secondaryContainer) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Info, contentDescription = null, tint = MaterialTheme.colorScheme.secondary)
            Spacer(Modifier.width(10.dp))
            Text(
                "Schedules are saved on this phone. Automatic sending will be switched on in a later update, once SMS permission is added.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer,
            )
        }
    }
}

@Composable
private fun ScheduledCard(item: ScheduledMessageEntity, onCancel: () -> Unit, onRestore: () -> Unit, onDelete: () -> Unit) {
    val cancelled = item.status == ScheduleStatus.CANCELLED
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(40.dp).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Schedule, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(item.recipientName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                        if (item.source == DataSource.DEMO) {
                            Spacer(Modifier.width(6.dp))
                            DemoBadge()
                        }
                    }
                    Text(item.recipientAddress, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDelete) { Icon(Icons.Rounded.DeleteOutline, contentDescription = "Delete") }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                item.body,
                style = MaterialTheme.typography.bodyMedium,
                textDecoration = if (cancelled) TextDecoration.LineThrough else null,
                color = if (cancelled) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                AssistChip(
                    onClick = {},
                    label = { Text(Format.dateTime(item.scheduledAt)) },
                    leadingIcon = { Icon(Icons.Rounded.CalendarMonth, contentDescription = null, modifier = Modifier.size(16.dp)) },
                )
                Spacer(Modifier.weight(1f))
                if (cancelled) {
                    TextButton(onClick = onRestore) {
                        Icon(Icons.Rounded.Restore, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Restore")
                    }
                } else {
                    TextButton(onClick = onCancel) {
                        Icon(Icons.Rounded.Block, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Cancel")
                    }
                }
            }
        }
    }
}

@Composable
private fun ScheduleComposer(
    validate: (String, String, Long) -> String?,
    onDismiss: () -> Unit,
    onSave: (String, String, String, Long) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var number by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var at by remember {
        mutableLongStateOf(
            Calendar.getInstance().apply {
                add(Calendar.HOUR_OF_DAY, 1)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis,
        )
    }
    var error by remember { mutableStateOf<String?>(null) }
    var pickDate by remember { mutableStateOf(false) }
    var pickTime by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Schedule a message") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = number,
                    onValueChange = { number = it },
                    label = { Text("Phone number") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(value = body, onValueChange = { body = it }, label = { Text("Message") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = { pickDate = true }, label = { Text(java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale.getDefault()).format(java.util.Date(at))) })
                    AssistChip(onClick = { pickTime = true }, label = { Text(Format.time(at)) })
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                error = validate(number, body, at)
                if (error == null) onSave(name, number, body, at)
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )

    if (pickDate) {
        val dateState = rememberDatePickerState(initialSelectedDateMillis = localToUtcDate(at))
        DatePickerDialog(
            onDismissRequest = { pickDate = false },
            confirmButton = {
                TextButton(onClick = {
                    dateState.selectedDateMillis?.let { at = withDate(at, it) }
                    pickDate = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickDate = false }) { Text("Cancel") } },
        ) {
            DatePicker(state = dateState)
        }
    }

    if (pickTime) {
        val cal = Calendar.getInstance().apply { timeInMillis = at }
        val timeState = rememberTimePickerState(initialHour = cal.get(Calendar.HOUR_OF_DAY), initialMinute = cal.get(Calendar.MINUTE))
        AlertDialog(
            onDismissRequest = { pickTime = false },
            title = { Text("Pick a time") },
            text = { TimePicker(state = timeState) },
            confirmButton = {
                TextButton(onClick = {
                    at = Calendar.getInstance().apply {
                        timeInMillis = at
                        set(Calendar.HOUR_OF_DAY, timeState.hour)
                        set(Calendar.MINUTE, timeState.minute)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }.timeInMillis
                    pickTime = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { pickTime = false }) { Text("Cancel") } },
        )
    }
}

/** The DatePicker works in UTC midnights; convert our local timestamp's date to that form. */
private fun localToUtcDate(localMillis: Long): Long {
    val local = Calendar.getInstance().apply { timeInMillis = localMillis }
    return Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        clear()
        set(local.get(Calendar.YEAR), local.get(Calendar.MONTH), local.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}

/** Keeps the local time of day from [localMillis] and applies the picked UTC date. */
private fun withDate(localMillis: Long, utcDateMillis: Long): Long {
    val picked = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { timeInMillis = utcDateMillis }
    return Calendar.getInstance().apply {
        timeInMillis = localMillis
        set(Calendar.YEAR, picked.get(Calendar.YEAR))
        set(Calendar.MONTH, picked.get(Calendar.MONTH))
        set(Calendar.DAY_OF_MONTH, picked.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}
