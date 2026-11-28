package com.smartsms.app

import com.smartsms.app.data.local.entity.TransactionEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.TransactionType
import com.smartsms.app.ui.screens.finance.FinanceViewModel
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Calendar

class FinanceSummaryTest {

    private fun tx(amount: Double, type: TransactionType, at: Long) = TransactionEntity(
        merchant = "Test", amount = amount, type = type, accountLabel = "Test", timestamp = at, source = DataSource.DEMO,
    )

    @Test
    fun lastSevenDaysSumsDebitsPerDay() {
        val now = Calendar.getInstance().apply { set(2026, Calendar.NOVEMBER, 28, 12, 0, 0) }.timeInMillis
        val day = 24 * 60 * 60 * 1000L
        val result = FinanceViewModel.lastSevenDays(
            listOf(
                tx(100.0, TransactionType.DEBIT, now),
                tx(50.0, TransactionType.DEBIT, now - 60_000),
                tx(999.0, TransactionType.CREDIT, now),
                tx(30.0, TransactionType.DEBIT, now - 2 * day),
                tx(500.0, TransactionType.DEBIT, now - 10 * day),
            ),
            now,
        )
        assertEquals(7, result.size)
        assertEquals(150.0, result.last().amount, 0.001)
        assertEquals(30.0, result[4].amount, 0.001)
        assertEquals(180.0, result.sumOf { it.amount }, 0.001)
        assertEquals("Sat", result.last().label)
    }
}
