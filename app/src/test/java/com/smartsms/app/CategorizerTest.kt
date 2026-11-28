package com.smartsms.app

import com.smartsms.app.domain.Categorizer
import com.smartsms.app.domain.MessageCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CategorizerTest {

    @Test
    fun otpIsRecognised() {
        assertEquals(
            MessageCategory.OTP,
            Categorizer.classify("AD-DEMOAPP", "482913 is your one-time password to log in. Do not share it.")
        )
        assertEquals(MessageCategory.OTP, Categorizer.classify("VM-BANKOT", "Your OTP for login is 5521"))
    }

    @Test
    fun otpWordWithoutCodeIsNotOtp() {
        assertEquals(MessageCategory.PERSONAL, Categorizer.classify("+919876500000", "Did you get the OTP yet?"))
    }

    @Test
    fun bankAlertIsTransaction() {
        assertEquals(
            MessageCategory.TRANSACTIONS,
            Categorizer.classify("AX-HDFCBK", "Rs.2,450.00 debited from A/c XX4821 at FRESHMART on UPI")
        )
        assertEquals(
            MessageCategory.TRANSACTIONS,
            Categorizer.classify("JM-ICICIB", "INR 65,000.00 credited to A/c XX4821 via NEFT")
        )
    }

    @Test
    fun promotionIsOffer() {
        assertEquals(MessageCategory.OFFERS, Categorizer.classify("JD-SHOPPY", "MEGA SALE! Flat 50% off this weekend"))
    }

    @Test
    fun unknownBusinessSenderFallsBackToOffers() {
        assertEquals(MessageCategory.OFFERS, Categorizer.classify("VM-NEWSUP", "Your weekly digest is ready"))
    }

    @Test
    fun peopleArePersonal() {
        assertEquals(MessageCategory.PERSONAL, Categorizer.classify("+91 98765 01234", "Dinner at 8?"))
    }

    @Test
    fun businessSenderPattern() {
        assertTrue(Categorizer.isBusinessSender("AX-HDFCBK"))
        assertTrue(Categorizer.isBusinessSender("vm-amazon"))
        assertFalse(Categorizer.isBusinessSender("+91 98765 01234"))
    }
}
