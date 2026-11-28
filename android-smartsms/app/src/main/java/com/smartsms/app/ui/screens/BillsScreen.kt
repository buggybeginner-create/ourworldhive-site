package com.smartsms.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.ReceiptLong
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.ReminderEntity
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatMoney
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.BillsViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun BillsScreen(nav: Navigator, vm: BillsViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val state by vm.state.collectAsStateWithLifecycle()
    ScreenScaffold(title = "Bills & EMIs", onBack = nav::back) { pad ->
        Column(Modifier.padding(pad)) {
            Text(
                "Due dates are found in bank, card, loan and bill messages. You get an alert 2 days before and on the day, at 9 am.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
            )
            StateContent(state) { list ->
                val open = list.filter { it.status == ReminderEntity.STATUS_PENDING }
                val closed = list.filter { it.status != ReminderEntity.STATUS_PENDING }.sortedByDescending { it.dueAt }.take(20)
                if (list.isEmpty()) {
                    EmptyState(Icons.Rounded.ReceiptLong, "No Bills Yet", "When a card, loan or bill message mentions a due date, it appears here.")
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (open.isEmpty()) item { EmptyState(Icons.Rounded.EventAvailable, "All Clear", "Nothing due right now.") }
                        items(open, key = { it.id }) { r -> BillCard(r, vm) }
                        if (closed.isNotEmpty()) {
                            item { SectionHeader("Paid Or Dismissed") }
                            items(closed, key = { "c" + it.id }) { r -> BillCard(r, vm) }
                        }
                    }
                }
            }
        }
    }
}

private fun daysLeft(dueAt: Long): Long {
    val t = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, 9); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }
    return Math.floorDiv(dueAt - t.timeInMillis + 12 * 3600_000L, 24 * 3600_000L)
}

@Composable
private fun BillCard(r: ReminderEntity, vm: BillsViewModel) {
    val pending = r.status == ReminderEntity.STATUS_PENDING
    val left = daysLeft(r.dueAt)
    val (label, urgent) = when {
        !pending -> (if (r.status == ReminderEntity.STATUS_PAID) "Paid" else "Dismissed") to false
        left < 0 -> "Overdue by ${-left} day${if (left == -1L) "" else "s"}" to true
        left == 0L -> "Due today" to true
        left == 1L -> "Due tomorrow" to true
        else -> "Due in $left days" to (left <= 3)
    }
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (pending && urgent) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceContainer
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(r.title, style = MaterialTheme.typography.titleMedium)
                    Text(
                        "$label · " + SimpleDateFormat("EEE, d MMM yyyy", Locale.getDefault()).format(Date(r.dueAt)),
                        style = MaterialTheme.typography.labelMedium,
                        color = if (pending && urgent) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (r.isDemo) { DemoBadge(); Spacer(Modifier.width(8.dp)) }
                r.amount?.let { Text(formatMoney(it), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            }
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.End) {
                if (pending) {
                    TextButton(onClick = { vm.setStatus(r.id, ReminderEntity.STATUS_DISMISSED) }) { Text("Dismiss") }
                    Spacer(Modifier.width(6.dp))
                    FilledTonalButton(onClick = { vm.setStatus(r.id, ReminderEntity.STATUS_PAID) }) { Text("✓ Paid") }
                } else {
                    TextButton(onClick = { vm.setStatus(r.id, ReminderEntity.STATUS_PENDING) }) { Text("Undo") }
                }
            }
        }
    }
}
