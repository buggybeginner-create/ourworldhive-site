package com.smartsms.app.domain

/**
 * Rule-based classifier that sorts a message body into a smart category.
 * Pure Kotlin with no Android dependencies, so it is covered by unit tests.
 */
object MessageClassifier {

    private val otpPatterns = listOf(
        Regex("""\b(otp|one[\s-]?time\s+pass(word|code)?|verification\s+code|security\s+code|login\s+code)\b""", RegexOption.IGNORE_CASE),
        Regex("""\bcode\s*(is|:)?\s*\d{4,8}\b""", RegexOption.IGNORE_CASE),
    )

    private val transactionPatterns = listOf(
        Regex("""\b(debited|credited|withdrawn|spent|paid|received|transferred|refund(ed)?)\b""", RegexOption.IGNORE_CASE),
        Regex("""\b(a/c|acct|account|upi|card\s+ending|avl\s+bal|available\s+balance)\b""", RegexOption.IGNORE_CASE),
    )

    private val offerPatterns = listOf(
        Regex("""\b(offer|sale|discount|cashback|coupon|deal|% off|flat\s+\d+|limited\s+time|use\s+code|free\s+delivery|voucher)\b""", RegexOption.IGNORE_CASE),
    )

    private val amountPattern = Regex("""(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""", RegexOption.IGNORE_CASE)
    private val otpCodePattern = Regex("""\b(\d{4,8})\b""")

    fun classify(body: String): MessageCategory {
        val text = body.trim()
        if (text.isEmpty()) return MessageCategory.PERSONAL
        if (otpPatterns.any { it.containsMatchIn(text) }) return MessageCategory.OTP
        val transactionHits = transactionPatterns.count { it.containsMatchIn(text) }
        if (transactionHits >= 1 && amountPattern.containsMatchIn(text)) return MessageCategory.TRANSACTIONS
        if (offerPatterns.any { it.containsMatchIn(text) }) return MessageCategory.OFFERS
        if (transactionHits >= 2) return MessageCategory.TRANSACTIONS
        return MessageCategory.PERSONAL
    }

    /** First rupee amount in the text, e.g. "Rs. 1,250.50" -> 1250.5. */
    fun extractAmount(body: String): Double? =
        amountPattern.find(body)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull()

    private val debitWords = listOf("debited", "spent", "paid", "withdrawn", "transferred to")
    private val creditWords = listOf("credited", "received", "refund")

    /** Debit or credit, decided by whichever keyword appears first in the text. */
    fun extractTransactionType(body: String): TransactionType? {
        val lower = body.lowercase()
        val firstDebit = debitWords.map { lower.indexOf(it) }.filter { it >= 0 }.minOrNull()
        val firstCredit = creditWords.map { lower.indexOf(it) }.filter { it >= 0 }.minOrNull()
        return when {
            firstDebit == null && firstCredit == null -> null
            firstCredit == null -> TransactionType.DEBIT
            firstDebit == null -> TransactionType.CREDIT
            firstDebit < firstCredit -> TransactionType.DEBIT
            else -> TransactionType.CREDIT
        }
    }

    /** The one-time code in an OTP message, if one is present. */
    fun extractOtp(body: String): String? {
        if (classify(body) != MessageCategory.OTP) return null
        return otpCodePattern.find(body)?.groupValues?.get(1)
    }
}
