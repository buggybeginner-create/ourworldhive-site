package com.smartsms.app

import com.smartsms.app.domain.Categorizer
import com.smartsms.app.domain.DueParser
import com.smartsms.app.domain.MessageCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class DueParserTest {
    private val utc = TimeZone.getTimeZone("UTC")
    private fun at(y: Int, m: Int, d: Int): Long =
        Calendar.getInstance(utc).apply { clear(); set(y, m - 1, d, 9, 0, 0) }.timeInMillis
    private val received = at(2026, 11, 28)

    @Test
    fun creditCardStatement() {
        val r = DueParser.parse("AX-HDFCBK", "Statement for Card XX1234: Total Amt Due Rs.4,250.00, Min Amt Due Rs.212.00, Due Date 05-DEC-26.", received, utc)
        assertNotNull(r); r!!
        assertEquals(at(2026, 12, 5), r.dueAt)
        assertEquals(4250.0, r.amount!!, 0.01)
        assertTrue(r.title.startsWith("Credit Card Bill"))
    }

    @Test
    fun emiWithoutYear() {
        val r = DueParser.parse("VM-BAJAJF", "Your EMI of Rs 3,999 for loan 123 is due on 7th Dec. Keep balance.", received, utc)!!
        assertEquals(at(2026, 12, 7), r.dueAt)
        assertEquals(3999.0, r.amount!!, 0.01)
        assertTrue(r.title.startsWith("EMI"))
    }

    @Test
    fun numericDate() {
        val r = DueParser.parse("JD-TPDDLE", "Electricity bill of Rs.1,120 is payable by 10/12/2026.", received, utc)!!
        assertEquals(at(2026, 12, 10), r.dueAt)
    }

    @Test
    fun paymentConfirmationIsNotAReminder() {
        assertNull(DueParser.parse("AX-HDFCBK", "Thank you for your payment of Rs.4,250 towards Card XX1234 due on 05-Dec-26.", received, utc))
    }

    @Test
    fun oldDateIsIgnored() {
        assertNull(DueParser.parse("AX-HDFCBK", "Total Amt Due Rs.900 Due Date 05-OCT-26", received, utc))
    }

    @Test
    fun noTriggerNoReminder() {
        assertNull(DueParser.parse("JD-SHOP", "Sale ends on 5 Dec! Flat 50% off", received, utc))
    }

    @Test
    fun scamIsSpam() {
        assertEquals(MessageCategory.SPAM, Categorizer.classify("+919999900000", "Dear customer your KYC will expire today, your account will be blocked. Click http://bit.ly/x"))
        assertEquals(MessageCategory.SPAM, Categorizer.classify("VM-LUCKYD", "Congratulations! You have won Rs.25,00,000 in lucky draw"))
        assertEquals(MessageCategory.TRANSACTIONS, Categorizer.classify("AX-HDFCBK", "Rs.500.00 debited from A/c XX1234 at SHOP on UPI"))
    }
}
