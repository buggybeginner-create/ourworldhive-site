package com.smartsms.app

import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.domain.MessageClassifier
import com.smartsms.app.domain.TransactionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MessageClassifierTest {

    @Test
    fun otpMessagesAreDetected() {
        assertEquals(MessageCategory.OTP, MessageClassifier.classify("482913 is your OTP to log in. Do not share it."))
        assertEquals(MessageCategory.OTP, MessageClassifier.classify("Your verification code is 7731."))
    }

    @Test
    fun bankAlertsAreTransactions() {
        assertEquals(
            MessageCategory.TRANSACTIONS,
            MessageClassifier.classify("Rs. 2,450.00 debited from A/c XX1234 at FreshCart Grocery."),
        )
        assertEquals(
            MessageCategory.TRANSACTIONS,
            MessageClassifier.classify("INR 500 credited to your account via UPI."),
        )
    }

    @Test
    fun promotionsAreOffers() {
        assertEquals(MessageCategory.OFFERS, MessageClassifier.classify("Mega sale! Flat 50% off. Use code DEMO50."))
        assertEquals(MessageCategory.OFFERS, MessageClassifier.classify("Exclusive offer: 20% cashback this week."))
    }

    @Test
    fun everydayChatIsPersonal() {
        assertEquals(MessageCategory.PERSONAL, MessageClassifier.classify("Are we still on for dinner tonight?"))
        assertEquals(MessageCategory.PERSONAL, MessageClassifier.classify(""))
    }

    @Test
    fun amountsAreParsed() {
        assertEquals(2450.0, MessageClassifier.extractAmount("Rs. 2,450.00 debited")!!, 0.001)
        assertEquals(1_33_210.55, MessageClassifier.extractAmount("Avl Bal Rs. 1,33,210.55")!!, 0.001)
        assertEquals(99.5, MessageClassifier.extractAmount("₹99.50 paid")!!, 0.001)
        assertNull(MessageClassifier.extractAmount("No money here"))
    }

    @Test
    fun transactionDirectionUsesFirstKeyword() {
        assertEquals(TransactionType.DEBIT, MessageClassifier.extractTransactionType("Rs. 100 debited from A/c"))
        assertEquals(TransactionType.CREDIT, MessageClassifier.extractTransactionType("Rs. 100 credited to A/c"))
        assertEquals(TransactionType.CREDIT, MessageClassifier.extractTransactionType("Refund of Rs. 300 credited"))
        assertNull(MessageClassifier.extractTransactionType("Hello there"))
    }

    @Test
    fun otpCodeIsExtractedOnlyFromOtpMessages() {
        assertEquals("482913", MessageClassifier.extractOtp("482913 is your OTP. Valid for 10 minutes."))
        assertNull(MessageClassifier.extractOtp("Booked a table for 8 pm, 2024 edition"))
    }
}
