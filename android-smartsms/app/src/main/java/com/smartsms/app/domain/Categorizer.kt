package com.smartsms.app.domain

/**
 * Sorts a message into a folder from its sender and text, on the device only.
 *
 * OTP messages are only *recognised* so they can be kept in their own folder and hidden
 * behind a tap. The app never copies, auto-fills, forwards or uploads a code.
 */
object Categorizer {

    private val otpWords = Regex(
        "\\b(otp|one[- ]?time (pass(word|code)?|pin)|verification code|security code|login code|auth(entication)? code)\\b",
        RegexOption.IGNORE_CASE
    )
    private val codeNumber = Regex("\\b\\d{4,8}\\b")

    private val moneyWords = Regex(
        "\\b(debited|credited|debit|credit|spent|withdrawn|received|paid|payment of|txn|transaction|a/c|acct|account|upi|imps|neft|rtgs|avl bal|available balance)\\b",
        RegexOption.IGNORE_CASE
    )
    private val amount = Regex("(?:rs\\.?|inr|₹)\\s?[\\d,]+(?:\\.\\d{1,2})?", RegexOption.IGNORE_CASE)

    private val offerWords = Regex(
        "\\b(offer|sale|discount|cashback|coupon|deal|flat \\d+%|\\d+% off|free|win|reward|voucher|shop now|limited time|exclusive|unsubscribe)\\b",
        RegexOption.IGNORE_CASE
    )

    /** Common scam wording. Kept narrow on purpose: a wrong "spam" hides a real message. */
    private val spamWords = Regex(
        "(you have won|you've won|you won rs|lottery|lucky draw|claim (your )?(prize|reward|gift)|" +
            "kyc.{0,40}(expire|suspend|block|deactivat)|" +
            "(account|a/c|sim|card).{0,30}(will be|has been) (blocked|suspended|deactivated).{0,60}(click|link|http|call)|" +
            "congratulations.{0,50}(won|winner|selected for)|" +
            "work from home.{0,60}(earn|income)|earn (rs\\.?|₹)\\s?[\\d,]+.{0,30}(daily|per day|a day))",
        RegexOption.IGNORE_CASE
    )

    fun isSpam(body: String): Boolean = spamWords.containsMatchIn(body)

    /** Business senders in India look like "AX-HDFCBK" or "VM-AMAZON". */
    private val businessSender = Regex("^[A-Z]{2}-[A-Z0-9]{3,9}(-[A-Z])?$")

    fun isBusinessSender(address: String): Boolean =
        businessSender.matches(address.trim().uppercase())

    fun classify(address: String, body: String): MessageCategory {
        val text = body.trim()
        if (otpWords.containsMatchIn(text) && codeNumber.containsMatchIn(text)) return MessageCategory.OTP
        if (isSpam(text)) return MessageCategory.SPAM
        if (moneyWords.containsMatchIn(text) && amount.containsMatchIn(text)) return MessageCategory.TRANSACTIONS
        // A person's number stays Personal even if they write "free" or "50% off".
        if (!isBusinessSender(address)) return MessageCategory.PERSONAL
        if (offerWords.containsMatchIn(text)) return MessageCategory.OFFERS
        return MessageCategory.OFFERS
    }
}
