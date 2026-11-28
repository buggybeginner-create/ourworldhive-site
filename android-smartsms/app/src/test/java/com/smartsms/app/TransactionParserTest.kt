package com.smartsms.app

import com.smartsms.app.domain.TransactionParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TransactionParserTest {

    @Test
    fun debitWithMerchantAndAccount() {
        val p = TransactionParser.parse("Rs.2,450.00 debited from A/c XX4821 at FRESHMART GROCERY on UPI. Avl Bal Rs.48,210.55")
        assertNotNull(p)
        p!!
        assertEquals(2450.0, p.amount, 0.001)
        assertTrue(p.isDebit)
        assertEquals("FRESHMART GROCERY", p.merchant)
        assertEquals("4821", p.account)
    }

    @Test
    fun creditIsNotDebit() {
        val p = TransactionParser.parse("INR 65,000.00 credited to A/c XX4821 from DEMO EMPLOYER PVT LTD via NEFT.")!!
        assertEquals(65000.0, p.amount, 0.001)
        assertFalse(p.isDebit)
    }

    @Test
    fun rupeeSymbolWorks() {
        val p = TransactionParser.parse("₹540 paid to QUICKBITE FOODS via UPI")!!
        assertEquals(540.0, p.amount, 0.001)
        assertTrue(p.isDebit)
        assertEquals("QUICKBITE FOODS", p.merchant)
    }

    @Test
    fun noDirectionMeansNoTransaction() {
        assertNull(TransactionParser.parse("Recharge plans start at Rs.199"))
    }

    @Test
    fun noAmountMeansNoTransaction() {
        assertNull(TransactionParser.parse("Your account was debited"))
    }
}
