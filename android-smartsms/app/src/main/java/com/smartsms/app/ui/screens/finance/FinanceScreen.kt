package com.smartsms.app.ui.screens.finance

import androidx.compose.foundation.Canvas
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.TrendingDown
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.Savings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.data.local.entity.TransactionEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.TransactionType
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.DemoNotice
import com.smartsms.app.ui.components.EmptyState
import com.smartsms.app.ui.components.ErrorState
import com.smartsms.app.ui.components.LoadingState
import com.smartsms.app.ui.components.SectionHeader
import com.smartsms.app.ui.theme.Palette
import com.smartsms.app.ui.util.Format
import com.smartsms.app.ui.util.UiState

@Composable
fun FinanceScreen(
    contentPadding: PaddingValues,
    onManageDemo: () -> Unit,
    viewModel: FinanceViewModel = viewModel(factory = FinanceViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        modifier = Modifier.padding(contentPadding),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                title = { Text("Finance") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                UiState.Loading -> LoadingState(label = "Reading transactions…")
                is UiState.Error -> ErrorState(s.message)
                is UiState.Success -> {
                    val data = s.data
                    if (data.recent.isEmpty() && data.budgets.isEmpty()) {
                        EmptyState(
                            icon = Icons.Rounded.Savings,
                            title = "No transactions yet",
                            message = "Bank and card alerts will be turned into a spending dashboard here.",
                        )
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            if (data.showsDemoData) item { DemoNotice(onManage = onManageDemo) }
                            item { SummaryCard(data) }
                            item { WeekChart(data.lastSevenDays) }
                            if (data.budgets.isNotEmpty()) {
                                item { SectionHeader("Budgets, last 30 days") }
                                items(data.budgets, key = { it.budget.id }) { BudgetRow(it) }
                            }
                            item { SectionHeader("Recent transactions") }
                            items(data.recent, key = { it.id }) { TransactionRow(it) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(data: FinanceSummary) {
    val colors = MaterialTheme.colorScheme
    Box(
        Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(colors.primary, colors.secondary.copy(alpha = 0.8f))), RoundedCornerShape(28.dp))
            .padding(20.dp),
    ) {
        Column {
            Text("Spent in the last 30 days", style = MaterialTheme.typography.bodyMedium, color = colors.onPrimary.copy(alpha = 0.85f))
            Text(Format.currency(data.totalDebit), style = MaterialTheme.typography.headlineMedium, color = colors.onPrimary)
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MiniStat(Icons.AutoMirrored.Rounded.TrendingUp, "Income", Format.currency(data.totalCredit), colors.onPrimary, Modifier.weight(1f))
                MiniStat(Icons.AutoMirrored.Rounded.TrendingDown, "Net", Format.currency(data.net), colors.onPrimary, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun MiniStat(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String, color: Color, modifier: Modifier) {
    Row(
        modifier.background(color.copy(alpha = 0.14f), RoundedCornerShape(16.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall, color = color.copy(alpha = 0.8f))
            Text(value, style = MaterialTheme.typography.titleSmall, color = color, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun WeekChart(days: List<DaySpend>) {
    val barColor = MaterialTheme.colorScheme.primary
    val trackColor = MaterialTheme.colorScheme.surfaceContainerHighest
    val max = (days.maxOfOrNull { it.amount } ?: 0.0).coerceAtLeast(1.0)
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text("Last 7 days", style = MaterialTheme.typography.titleSmall)
            Text(
                "Total ${Format.currency(days.sumOf { it.amount })}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            Canvas(Modifier.fillMaxWidth().height(120.dp)) {
                val slot = size.width / days.size
                val barWidth = slot * 0.45f
                days.forEachIndexed { index, day ->
                    val left = slot * index + (slot - barWidth) / 2
                    drawRoundRect(trackColor, Offset(left, 0f), Size(barWidth, size.height), CornerRadius(barWidth / 2))
                    val h = (day.amount / max).toFloat() * size.height
                    if (h > 0f) {
                        drawRoundRect(barColor, Offset(left, size.height - h), Size(barWidth, h), CornerRadius(barWidth / 2))
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth()) {
                days.forEach {
                    Text(it.label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun BudgetRow(progress: BudgetProgress) {
    val color = Color(progress.budget.colorArgb)
    val over = progress.fraction > 1f
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(10.dp).background(color, RoundedCornerShape(50)))
                Spacer(Modifier.width(8.dp))
                Text(progress.budget.name, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                if (progress.budget.source == DataSource.DEMO) DemoBadge()
            }
            Spacer(Modifier.height(10.dp))
            LinearProgressIndicator(
                progress = { progress.fraction.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = if (over) Palette.Danger else color,
                trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                strokeCap = StrokeCap.Round,
                gapSize = 0.dp,
                drawStopIndicator = {},
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "${Format.currency(progress.spent)} of ${Format.currency(progress.budget.monthlyLimit)}" + if (over) " · over budget" else "",
                style = MaterialTheme.typography.bodySmall,
                color = if (over) Palette.Danger else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun TransactionRow(tx: TransactionEntity) {
    val credit = tx.type == TransactionType.CREDIT
    val tint = if (credit) Palette.Success else Palette.Danger
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceContainer, MaterialTheme.shapes.medium)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(40.dp).background(tint.copy(alpha = 0.14f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
            Icon(
                if (credit) Icons.AutoMirrored.Rounded.TrendingUp else Icons.AutoMirrored.Rounded.TrendingDown,
                contentDescription = null,
                tint = tint,
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(tx.merchant, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                if (tx.source == DataSource.DEMO) {
                    Spacer(Modifier.width(6.dp))
                    DemoBadge()
                }
            }
            Text("${tx.accountLabel} · ${Format.shortTime(tx.timestamp)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            (if (credit) "+" else "−") + Format.currency(tx.amount),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = tint,
        )
    }
}
