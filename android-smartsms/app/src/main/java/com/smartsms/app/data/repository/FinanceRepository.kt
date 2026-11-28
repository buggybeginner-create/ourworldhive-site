package com.smartsms.app.data.repository

import com.smartsms.app.data.local.dao.BudgetCategoryDao
import com.smartsms.app.data.local.dao.CategorySpend
import com.smartsms.app.data.local.dao.TransactionDao
import com.smartsms.app.data.local.entity.BudgetCategoryEntity
import com.smartsms.app.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow
import java.util.Calendar

class FinanceRepository(
    private val transactionDao: TransactionDao,
    private val budgetDao: BudgetCategoryDao,
) {
    fun transactionsSince(since: Long, includeDemo: Boolean): Flow<List<TransactionEntity>> =
        transactionDao.observeSince(since, includeDemo)

    fun spendByCategory(since: Long, includeDemo: Boolean): Flow<List<CategorySpend>> =
        transactionDao.observeSpendByCategory(since, includeDemo)

    fun budgets(includeDemo: Boolean): Flow<List<BudgetCategoryEntity>> = budgetDao.observeAll(includeDemo)

    companion object {
        /** Start of the rolling 30-day window used by the finance dashboard. */
        fun windowStart(now: Long = System.currentTimeMillis()): Long =
            Calendar.getInstance().apply {
                timeInMillis = now
                add(Calendar.DAY_OF_YEAR, -30)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis
    }
}
