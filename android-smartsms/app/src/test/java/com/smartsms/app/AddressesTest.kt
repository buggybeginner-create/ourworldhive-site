package com.smartsms.app

import com.smartsms.app.domain.Addresses
import com.smartsms.app.domain.BudgetGuess
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AddressesTest {
    @Test
    fun sameNumberWrittenDifferentlyIsOneChat() {
        val k = Addresses.key("+91 98765 01234")
        assertEquals(k, Addresses.key("09876501234"))
        assertEquals(k, Addresses.key("9876501234"))
        assertEquals("9876501234", k)
    }

    @Test
    fun businessSendersDropTheOperatorPrefix() {
        assertEquals("HDFCBK", Addresses.key("AX-HDFCBK"))
        assertEquals("HDFCBK", Addresses.key("VM-HDFCBK"))
    }

    @Test
    fun onlyNumbersCanBeRepliedTo() {
        assertTrue(Addresses.canReply("+91 98765 01234"))
        assertFalse(Addresses.canReply("AX-HDFCBK"))
    }

    @Test
    fun budgetGuess() {
        assertEquals("Food & Groceries", BudgetGuess.nameFor("SWIGGY"))
        assertEquals("Bills & Subscriptions", BudgetGuess.nameFor("AIRTEL PREPAID"))
        assertEquals("Other", BudgetGuess.nameFor("RANDOM CO"))
    }
}
