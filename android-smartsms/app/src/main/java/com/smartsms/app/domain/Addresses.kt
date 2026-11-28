package com.smartsms.app.domain

/** One key per sender, so "+91 98765 01234", "098765 01234" and "9876501234" become one chat. */
object Addresses {
    private val businessPrefix = Regex("^[A-Z]{2}-")

    fun key(raw: String): String {
        val a = raw.trim()
        val digits = a.filter { it.isDigit() }
        val looksLikePhone = a.isNotEmpty() && a.all { it.isDigit() || it in "+-() " } && digits.length >= 6
        return when {
            looksLikePhone -> if (digits.length > 10) digits.takeLast(10) else digits
            else -> businessPrefix.replace(a.uppercase(), "") // "AX-HDFCBK" and "VM-HDFCBK" → "HDFCBK"
        }
    }

    /** People can be replied to; letter-only senders (banks, shops) cannot. */
    fun canReply(raw: String): Boolean {
        val a = raw.trim()
        return a.isNotEmpty() && a.all { it.isDigit() || it in "+-() " } && a.count { it.isDigit() } >= 3
    }
}

/** Picks a budget for a merchant name (used for demo rows and real alerts alike). */
object BudgetGuess {
    fun nameFor(merchant: String): String {
        val m = merchant.lowercase()
        return when {
            listOf("grocery", "food", "bite", "mart", "swiggy", "zomato", "blinkit", "zepto", "restaurant", "cafe").any { it in m } -> "Food & Groceries"
            listOf("fuel", "petrol", "ride", "metro", "travel", "uber", "ola", "irctc", "rapido").any { it in m } -> "Travel & Fuel"
            listOf("stream", "bill", "recharge", "entertainment", "electric", "jio", "airtel", "netflix", "insurance").any { it in m } -> "Bills & Subscriptions"
            listOf("shop", "store", "amazon", "flipkart", "myntra", "meesho", "ajio").any { it in m } -> "Shopping"
            else -> "Other"
        }
    }
}
