package com.smartsms.app.data.db

import androidx.room.withTransaction
import com.smartsms.app.domain.Categorizer
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.domain.TransactionParser

/**
 * Fills a fresh database.
 *
 * [seedDefaults] writes the app's own rows (folders, themes, budgets, settings).
 * [seedDemo] writes SAMPLE conversations — every row it writes has isDemo = true and the
 * UI marks them with a "Demo" badge. None of it is a real SMS from the phone.
 */
object DemoSeeder {

    private const val MIN = 60_000L
    private const val HOUR = 60 * MIN
    private const val DAY = 24 * HOUR

    private data class DemoThread(
        val address: String,
        val name: String,
        val color: Long,
        val messages: List<Triple<Long, Boolean, String>> // (ago, incoming, text)
    )

    private val threads = listOf(
        DemoThread(
            "+91 98765 01234", "Aarav (Demo)", 0xFF7C5CFF, listOf(
                Triple(3 * HOUR, true, "Hey! Are we still on for dinner tonight?"),
                Triple(3 * HOUR - 4 * MIN, false, "Yes, 8 pm works. Same place as last time?"),
                Triple(2 * HOUR, true, "Perfect, I'll book a table for four.")
            )
        ),
        DemoThread(
            "+91 91234 56789", "Meera (Demo)", 0xFFEC4899, listOf(
                Triple(DAY + 2 * HOUR, true, "Sent you the photos from the trip 📸"),
                Triple(DAY + HOUR, false, "They look amazing, thank you!"),
                Triple(30 * MIN, true, "Call me when you're free, need your advice on something.")
            )
        ),
        DemoThread(
            "AX-DEMOBK", "Demo Bank", 0xFF10B981, listOf(
                Triple(5 * DAY, true, "Rs.2,450.00 debited from A/c XX4821 at FRESHMART GROCERY on UPI. Avl Bal Rs.48,210.55 (Demo)"),
                Triple(3 * DAY, true, "INR 65,000.00 credited to A/c XX4821 from DEMO EMPLOYER PVT LTD via NEFT. (Demo)"),
                Triple(2 * DAY, true, "Rs.899.00 spent on Card XX7713 at CITYFUEL STATION. (Demo)"),
                Triple(20 * HOUR, true, "Rs.1,299.00 debited from A/c XX4821 to STREAMBOX ENTERTAINMENT via UPI. (Demo)"),
                Triple(4 * HOUR, true, "Rs.540.00 paid to QUICKBITE FOODS via UPI from A/c XX4821. (Demo)")
            )
        ),
        DemoThread(
            "VM-DEMOPAY", "Demo Wallet", 0xFF0EA5E9, listOf(
                Triple(6 * DAY, true, "You paid Rs.350.00 to METRO RIDES using UPI. Txn ID DEMO1234. (Demo)"),
                Triple(DAY, true, "Rs.200.00 received from Kabir via UPI. (Demo)")
            )
        ),
        DemoThread(
            "JD-DEMOSHOP", "Demo Store", 0xFFF59E0B, listOf(
                Triple(2 * DAY, true, "MEGA SALE! Flat 50% off on headphones this weekend only. Shop now. (Demo)"),
                Triple(9 * HOUR, true, "Your exclusive coupon DEMO200 gives Rs.200 cashback on your next order. (Demo)")
            )
        ),
        DemoThread(
            "AD-DEMOAPP", "Demo App", 0xFF64748B, listOf(
                Triple(15 * MIN, true, "482913 is your one-time password to log in to Demo App. Do not share it with anyone. (Demo)")
            )
        )
    )

    suspend fun seedDefaults(db: AppDatabase) = db.withTransaction {
        db.categoryDao().upsertAll(
            MessageCategory.entries.mapIndexed { i, c -> CategoryEntity(c.key, c.label, i) }
        )
        db.themeDao().insertAll(
            listOf(
                ThemeEntity(name = "Violet Pulse", accentArgb = 0xFF7C5CFF, secondaryArgb = 0xFF22D3EE),
                ThemeEntity(name = "Ocean", accentArgb = 0xFF0EA5E9, secondaryArgb = 0xFF14B8A6),
                ThemeEntity(name = "Emerald", accentArgb = 0xFF10B981, secondaryArgb = 0xFF84CC16),
                ThemeEntity(name = "Sunset", accentArgb = 0xFFF97316, secondaryArgb = 0xFFF43F5E),
                ThemeEntity(name = "Rose Gold", accentArgb = 0xFFE11D74, secondaryArgb = 0xFFF0ABFC),
                ThemeEntity(name = "Graphite", accentArgb = 0xFF94A3B8, secondaryArgb = 0xFFCBD5E1)
            )
        )
        db.budgetCategoryDao().insertAll(
            listOf(
                BudgetCategoryEntity(name = "Food & Groceries", monthlyLimit = 8000.0, colorArgb = 0xFF10B981, iconKey = "food"),
                BudgetCategoryEntity(name = "Travel & Fuel", monthlyLimit = 4000.0, colorArgb = 0xFF0EA5E9, iconKey = "travel"),
                BudgetCategoryEntity(name = "Bills & Subscriptions", monthlyLimit = 3000.0, colorArgb = 0xFF7C5CFF, iconKey = "bills"),
                BudgetCategoryEntity(name = "Shopping", monthlyLimit = 5000.0, colorArgb = 0xFFF59E0B, iconKey = "shopping"),
                BudgetCategoryEntity(name = "Other", monthlyLimit = 2000.0, colorArgb = 0xFF64748B, iconKey = "other")
            )
        )
    }

    suspend fun seedDemo(db: AppDatabase, now: Long = System.currentTimeMillis()) = db.withTransaction {
        val budgets = db.budgetCategoryDao().getAll()
        fun budgetFor(merchant: String): Long? {
            val name = com.smartsms.app.domain.BudgetGuess.nameFor(merchant)
            return budgets.firstOrNull { it.name == name }?.id
        }

        db.contactDao().insertAll(
            threads.filter { !Categorizer.isBusinessSender(it.address) }
                .map { ContactEntity(name = it.name, phone = it.address, avatarColor = it.color, isDemo = true) }
        )

        val transactions = mutableListOf<TransactionEntity>()
        for (t in threads) {
            val latest = t.messages.minBy { it.first }
            val category = Categorizer.classify(t.address, latest.third)
            val unread = t.messages.count { it.second && it.first < 4 * HOUR }
            val convId = db.conversationDao().insert(
                ConversationEntity(
                    address = t.address,
                    displayName = t.name,
                    lastMessage = latest.third,
                    lastTimestamp = now - latest.first,
                    unreadCount = unread,
                    category = category.key,
                    isDemo = true
                )
            )
            val rows = t.messages.map { (ago, incoming, text) ->
                MessageEntity(
                    conversationId = convId,
                    address = t.address,
                    body = text,
                    timestamp = now - ago,
                    isIncoming = incoming,
                    isRead = !(incoming && ago < 4 * HOUR),
                    category = Categorizer.classify(t.address, text).key,
                    isDemo = true
                )
            }
            val ids = db.messageDao().insertAll(rows)
            rows.forEachIndexed { i, m ->
                if (m.category == MessageCategory.TRANSACTIONS.key) {
                    TransactionParser.parse(m.body)?.let { p ->
                        val merchant = p.merchant ?: t.name
                        transactions += TransactionEntity(
                            messageId = ids[i],
                            amount = p.amount,
                            isDebit = p.isDebit,
                            merchant = merchant,
                            account = p.account,
                            budgetCategoryId = if (p.isDebit) budgetFor(merchant) else null,
                            timestamp = m.timestamp,
                            isDemo = true
                        )
                    }
                }
            }
        }
        db.transactionDao().insertAll(transactions)

        db.scheduledMessageDao().insertAll(
            listOf(
                ScheduledMessageEntity(
                    recipient = "+91 98765 01234",
                    body = "Happy birthday! Have a wonderful year ahead 🎉 (Demo)",
                    sendAt = now + 2 * DAY,
                    createdAt = now,
                    isDemo = true
                )
            )
        )
    }

    suspend fun removeDemo(db: AppDatabase) = db.withTransaction {
        db.messageDao().deleteDemo()
        db.conversationDao().deleteDemo()
        db.contactDao().deleteDemo()
        db.transactionDao().deleteDemo()
        db.scheduledMessageDao().deleteDemo()
    }
}
