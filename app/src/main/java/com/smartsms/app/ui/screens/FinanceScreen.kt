package com.smartsms.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.Savings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.db.BudgetCategoryEntity
import com.smartsms.app.data.db.TransactionEntity
import com.smartsms.app.data.repo.BudgetUsage
import com.smartsms.app.data.repo.FinanceSummary
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.DemoBanner
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.components.StateContent
import com.smartsms.app.ui.components.formatMoney
import com.smartsms.app.ui.components.formatTime
import com.smartsms.app.ui.components.toColor
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.FinanceViewModel

private val Green = Color(0xFF10B981)
private val Red = Color(0xFFFF6B81)

@Composable
fun FinanceScreen(@Suppress("UNUSED_PARAMETER") nav: Navigator, vm: FinanceViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val state by vm.state.collectAsStateWithLifecycle()
    var editing by remember { mutableStateOf<BudgetCategoryEntity?>(null) }

    ScreenScaffold(title = "Finance", topLevel = true) { pad ->
        Box(Modifier.padding(pad)) {
            StateContent(state) { s ->
                FinanceContent(s, PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp)) { editing = it }
            }
        }
    }
    editing?.let { b ->
        LimitDialog(b, onDismiss = { editing = null }) { v -> vm.setLimit(b, v); editing = null }
    }
}

@Composable
private fun FinanceContent(s: FinanceSummary, pad: PaddingValues, onEdit: (BudgetCategoryEntity) -> Unit) {
    LazyColumn(contentPadding = pad, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (s.hasDemo) item { DemoBanner() ; Spacer(Modifier.height(12.dp)) }
        item {
            Text(
                "Built from transaction alerts in your messages · last 30 days",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard("Spent", s.spent, Icons.Rounded.ArrowUpward, Red, Modifier.weight(1f))
                StatCard("Received", s.received, Icons.Rounded.ArrowDownward, Green, Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
            NetCard(s.received - s.spent)
        }
        item { SectionHeader("Budgets · Tap To Change Limit") }
        items(s.budgets, key = { it.budget.id }) { u -> BudgetRow(u) { onEdit(u.budget) } }
        item { SectionHeader("Recent Transactions") }
        if (s.recent.isEmpty()) {
            item { EmptyState(Icons.Rounded.Savings, "No Transactions", "Bank and UPI alerts will be summarised here.") }
        } else {
            items(s.recent, key = { it.id }) { t -> TxRow(t) }
        }
    }
}

@Composable
private fun StatCard(label: String, value: Double, icon: androidx.compose.ui.graphics.vector.ImageVector, tint: Color, modifier: Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer), shape = MaterialTheme.shapes.medium) {
        Column(Modifier.padding(16.dp)) {
            Box(Modifier.size(32.dp).clip(CircleShape).background(tint.copy(alpha = 0.16f)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(formatMoney(value), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun NetCard(net: Double) {
    val p = MaterialTheme.colorScheme.primary
    Row(
        Modifier.fillMaxWidth().clip(MaterialTheme.shapes.medium).background(p.copy(alpha = 0.14f)).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Rounded.Savings, null, tint = p)
        Spacer(Modifier.width(12.dp))
        Text("Net flow", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        Text(
            (if (net >= 0) "+" else "−") + formatMoney(kotlin.math.abs(net)),
            style = MaterialTheme.typography.titleLarge,
            color = if (net >= 0) Green else Red,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun BudgetRow(u: BudgetUsage, onClick: () -> Unit) {
    val color = u.budget.colorArgb.toColor()
    val over = u.fraction > 1f
    Column(Modifier.fillMaxWidth().clip(MaterialTheme.shapes.small).clickable(onClick = onClick).padding(vertical = 10.dp, horizontal = 4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(color))
            Spacer(Modifier.width(10.dp))
            Text(u.budget.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            Text(
                "${formatMoney(u.spent)} / ${formatMoney(u.budget.monthlyLimit)}",
                style = MaterialTheme.typography.labelMedium,
                color = if (over) Red else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Spacer(Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { u.fraction.coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
            color = if (over) Red else color,
            trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            drawStopIndicator = {}
        )
    }
}

@Composable
private fun TxRow(t: TransactionEntity) {
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp, horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        val tint = if (t.isDebit) Red else Green
        Box(Modifier.size(40.dp).clip(CircleShape).background(tint.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
            Icon(if (t.isDebit) Icons.Rounded.ArrowUpward else Icons.Rounded.ArrowDownward, null, tint = tint, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(t.merchant, style = MaterialTheme.typography.titleSmall, maxLines = 1, modifier = Modifier.weight(1f, fill = false))
                if (t.isDemo) { Spacer(Modifier.width(6.dp)); DemoBadge() }
            }
            Text(
                formatTime(t.timestamp) + (t.account?.let { " · A/c ••$it" } ?: ""),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Text(
            (if (t.isDebit) "−" else "+") + formatMoney(t.amount),
            style = MaterialTheme.typography.titleMedium,
            color = tint,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun LimitDialog(b: BudgetCategoryEntity, onDismiss: () -> Unit, onSave: (Double) -> Unit) {
    var text by remember { mutableStateOf(b.monthlyLimit.toLong().toString()) }
    val value = text.toDoubleOrNull()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(b.name) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { v -> text = v.filter { it.isDigit() }.take(9) },
                label = { Text("Monthly limit (₹)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
        },
        confirmButton = { TextButton(enabled = value != null && value > 0, onClick = { onSave(value ?: 0.0) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
