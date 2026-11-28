package com.smartsms.app.ui.screens.finance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.smartsms.app.SmartSmsApp
import com.smartsms.app.data.local.entity.BudgetCategoryEntity
import com.smartsms.app.data.local.entity.TransactionEntity
import com.smartsms.app.data.repository.FinanceRepository
import com.smartsms.app.data.repository.SettingsRepository
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.TransactionType
import com.smartsms.app.ui.util.UiState
import com.smartsms.app.ui.util.asUiState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import java.util.Calendar

data class BudgetProgress(val budget: BudgetCategoryEntity, val spent: Double) {
    val fraction: Float get() = if (budget.monthlyLimit <= 0) 0f else (spent / budget.monthlyLimit).toFloat()
}

data class DaySpend(val label: String, val amount: Double)

data class FinanceSummary(
    val totalDebit: Double,
    val totalCredit: Double,
    val budgets: List<BudgetProgress>,
    val lastSevenDays: List<DaySpend>,
    val recent: List<TransactionEntity>,
    val showsDemoData: Boolean,
) {
    val net: Double get() = totalCredit - totalDebit
}

class FinanceViewModel(
    private val finance: FinanceRepository,
    settings: SettingsRepository,
) : ViewModel() {

    val state: StateFlow<UiState<FinanceSummary>> =
        settings.settings.map { it.showDemoData }.distinctUntilChanged()
            .flatMapLatest { demo ->
                val since = FinanceRepository.windowStart()
                combine(
                    finance.transactionsSince(since, demo),
                    finance.spendByCategory(since, demo),
                    finance.budgets(demo),
                ) { transactions, spend, budgets ->
                    val spendMap = spend.associate { it.budgetCategoryId to it.spent }
                    FinanceSummary(
                        totalDebit = transactions.filter { it.type == TransactionType.DEBIT }.sumOf { it.amount },
                        totalCredit = transactions.filter { it.type == TransactionType.CREDIT }.sumOf { it.amount },
                        budgets = budgets.map { BudgetProgress(it, spendMap[it.id] ?: 0.0) },
                        lastSevenDays = lastSevenDays(transactions),
                        recent = transactions.take(15),
                        showsDemoData = transactions.any { it.source == DataSource.DEMO } || budgets.any { it.source == DataSource.DEMO },
                    )
                }
            }
            .asUiState()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)

    companion object {
        private val dayLabels = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

        /** Debit totals per day for the last 7 days, oldest first. */
        fun lastSevenDays(transactions: List<TransactionEntity>, now: Long = System.currentTimeMillis()): List<DaySpend> {
            val startOfToday = Calendar.getInstance().apply {
                timeInMillis = now
                set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            }
            return (6 downTo 0).map { daysAgo ->
                val dayStart = (startOfToday.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, -daysAgo) }
                val dayEnd = (dayStart.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, 1) }
                val total = transactions
                    .filter { it.type == TransactionType.DEBIT && it.timestamp >= dayStart.timeInMillis && it.timestamp < dayEnd.timeInMillis }
                    .sumOf { it.amount }
                DaySpend(dayLabels[dayStart.get(Calendar.DAY_OF_WEEK) - 1], total)
            }
        }

        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val c = (this[APPLICATION_KEY] as SmartSmsApp).container
                FinanceViewModel(c.financeRepository, c.settingsRepository)
            }
        }
    }
}
