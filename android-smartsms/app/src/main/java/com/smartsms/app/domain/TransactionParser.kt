package com.smartsms.app.domain

data class ParsedTransaction(
    val amount: Double,
    val isDebit: Boolean,
    val merchant: String?,
    val account: String?
)

/** Reads the amount, direction, merchant and masked account from a bank / UPI alert. */
object TransactionParser {

    private val amountRe = Regex("(?:rs\\.?|inr|₹)\\s?([\\d,]+(?:\\.\\d{1,2})?)", RegexOption.IGNORE_CASE)
    private val debitRe = Regex("\\b(debited|spent|withdrawn|paid|debit|sent|purchase)\\b", RegexOption.IGNORE_CASE)
    private val creditRe = Regex("\\b(credited|received|deposited|credit|refund(ed)?)\\b", RegexOption.IGNORE_CASE)
    private val accountRe = Regex("(?:a/c|acct|account|card)\\s*(?:no\\.?)?\\s*[x*]*\\s*(\\d{3,6})", RegexOption.IGNORE_CASE)
    private val merchantRe = Regex(
        "\\b(?:at|to|towards|from|by|for)\\s+([A-Za-z0-9&.' ]{2,40}?)(?=\\s+(?:on|via|ref|upi|using|avl|a/c|txn|is|for)\\b|[.,;]|$)",
        RegexOption.IGNORE_CASE
    )

    fun parse(body: String): ParsedTransaction? {
        val amountMatch = amountRe.find(body) ?: return null
        val value = amountMatch.groupValues[1].replace(",", "").toDoubleOrNull() ?: return null
        if (value <= 0.0) return null
        val debitAt = debitRe.find(body)?.range?.first ?: Int.MAX_VALUE
        val creditAt = creditRe.find(body)?.range?.first ?: Int.MAX_VALUE
        if (debitAt == Int.MAX_VALUE && creditAt == Int.MAX_VALUE) return null
        val isDebit = debitAt <= creditAt
        val merchant = merchantRe.findAll(body)
            .map { it.groupValues[1].trim() }
            .firstOrNull { m -> m.isNotEmpty() && !m.matches(Regex("(?i)(your|a/c|account|card|rs|inr).*")) }
        val account = accountRe.find(body)?.groupValues?.get(1)
        return ParsedTransaction(value, isDebit, merchant, account)
    }
}
