package com.smartsms.app.data.local

import androidx.room.withTransaction
import com.smartsms.app.data.local.entity.BudgetCategoryEntity
import com.smartsms.app.data.local.entity.ContactEntity
import com.smartsms.app.data.local.entity.ConversationEntity
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.data.local.entity.TransactionEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageClassifier
import com.smartsms.app.domain.TransactionType

/**
 * Inserts SAMPLE data so the app can be explored before real SMS access exists.
 *
 * Every row written here has source = [DataSource.DEMO]. People, banks and shops are
 * fictional, every sender name ends in "(Demo)", and the UI shows a DEMO badge on each item.
 * Demo rows can be removed at any time from Settings without touching real data.
 */
class DemoDataSeeder(
    private val db: SmartSmsDatabase,
    private val clock: () -> Long = System::currentTimeMillis,
) {

    private data class DemoThread(
        val name: String,
        val address: String,
        val isPerson: Boolean,
        val messages: List<Pair<Long, String>>, // minutes ago to body
        val pinned: Boolean = false,
    )

    private val threads = listOf(
        DemoThread(
            "Aarav Sharma (Demo)", "+91 90000 00001", true, pinned = true,
            messages = listOf(
                95L to "Hey! Are we still on for dinner tonight?",
                12L to "Booked a table for 8 pm. See you there!",
            ),
        ),
        DemoThread(
            "Priya Nair (Demo)", "+91 90000 00002", true,
            messages = listOf(
                300L to "Can you send me the photos from the trip?",
                240L to "Thanks, they look amazing 😍",
            ),
        ),
        DemoThread(
            "Mom (Demo)", "+91 90000 00003", true,
            messages = listOf(1500L to "Call me when you are free. Nothing urgent."),
        ),
        DemoThread(
            "Northwind Bank (Demo)", "DM-NWBANK", false,
            messages = listOf(
                2900L to "Rs. 2,450.00 debited from A/c XX1234 at FreshCart Grocery. Avl Bal Rs. 48,210.55",
                1440L to "Rs. 85,000.00 credited to A/c XX1234 as salary. Avl Bal Rs. 1,33,210.55",
                380L to "Rs. 640.00 spent on card ending 5678 at Metro Fuel Station.",
                55L to "Rs. 1,199.00 debited from A/c XX1234 via UPI to StreamPlus Subscriptions.",
            ),
        ),
        DemoThread(
            "Bluebird Card (Demo)", "VK-BLUBRD", false,
            messages = listOf(
                4300L to "Rs. 3,800.00 spent on card ending 9012 at UrbanStyle Fashion.",
                700L to "Rs. 520.00 paid to QuickBite Foods via UPI. Ref 000000.",
                200L to "Refund of Rs. 300.00 credited to card ending 9012 from QuickBite Foods.",
            ),
        ),
        DemoThread(
            "ShopSphere (Demo)", "AD-SHOPSP", false,
            messages = listOf(
                600L to "Mega Weekend Sale! Flat 50% off on electronics. Use code DEMO50. Limited time only.",
                30L to "Your cart misses you! Get free delivery on orders today.",
            ),
        ),
        DemoThread(
            "FlyHigh Travels (Demo)", "AX-FLYHGH", false,
            messages = listOf(2000L to "Exclusive offer: 20% cashback on domestic flights this week."),
        ),
        DemoThread(
            "SecureLogin (Demo)", "VM-SECLGN", false,
            messages = listOf(
                8L to "482913 is your OTP to log in. Valid for 10 minutes. Do not share it with anyone.",
                1200L to "Your verification code is 7731. It expires in 5 minutes.",
            ),
        ),
    )

    private val budgets = listOf(
        "Groceries" to (8000.0 to 0xFF10B981),
        "Food & Dining" to (5000.0 to 0xFFF97316),
        "Fuel & Transport" to (4000.0 to 0xFF3B82F6),
        "Shopping" to (6000.0 to 0xFFE11D74),
        "Subscriptions" to (2000.0 to 0xFF7C6CF2),
    )

    private fun budgetFor(merchant: String): String? = when {
        "Grocery" in merchant -> "Groceries"
        "Food" in merchant -> "Food & Dining"
        "Fuel" in merchant -> "Fuel & Transport"
        "Fashion" in merchant -> "Shopping"
        "Subscription" in merchant -> "Subscriptions"
        else -> null
    }

    private val merchantPattern = Regex("""\b(?:at|to|from)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)""")

    suspend fun seed() {
        val now = clock()
        val minute = 60_000L
        db.withTransaction {
            val budgetIds = budgets.associate { (name, value) ->
                name to db.budgetCategoryDao().insert(
                    BudgetCategoryEntity(name = name, monthlyLimit = value.first, colorArgb = value.second, source = DataSource.DEMO),
                )
            }

            threads.forEachIndexed { index, thread ->
                val contactId = if (thread.isPerson) {
                    db.contactDao().insert(
                        ContactEntity(
                            name = thread.name,
                            phoneNumber = thread.address,
                            avatarColor = avatarColors[index % avatarColors.size],
                            isFavorite = thread.pinned,
                            source = DataSource.DEMO,
                        ),
                    )
                } else null

                val ordered = thread.messages.sortedByDescending { it.first } // oldest first
                val latest = ordered.last()
                val category = MessageClassifier.classify(latest.second)
                val unread = if (thread.isPerson) 1 else ordered.size.coerceAtMost(2)

                val conversationId = db.conversationDao().insert(
                    ConversationEntity(
                        address = thread.address,
                        displayName = thread.name,
                        contactId = contactId,
                        lastMessagePreview = latest.second,
                        lastMessageAt = now - latest.first * minute,
                        unreadCount = unread,
                        category = category,
                        isPinned = thread.pinned,
                        source = DataSource.DEMO,
                    ),
                )

                ordered.forEachIndexed { msgIndex, (minutesAgo, body) ->
                    val timestamp = now - minutesAgo * minute
                    val isRead = msgIndex < ordered.size - unread
                    val messageId = db.messageDao().insert(
                        MessageEntity(
                            conversationId = conversationId,
                            address = thread.address,
                            senderName = thread.name,
                            body = body,
                            timestamp = timestamp,
                            isRead = isRead,
                            category = MessageClassifier.classify(body),
                            source = DataSource.DEMO,
                        ),
                    )
                    val amount = MessageClassifier.extractAmount(body)
                    val type = MessageClassifier.extractTransactionType(body)
                    if (amount != null && type != null) {
                        val merchant = merchantPattern.findAll(body).map { it.groupValues[1] }
                            .firstOrNull() ?: if (type == TransactionType.CREDIT) "Salary" else "Card payment"
                        db.transactionDao().insertAll(
                            listOf(
                                TransactionEntity(
                                    messageId = messageId,
                                    merchant = merchant,
                                    amount = amount,
                                    type = type,
                                    budgetCategoryId = budgetFor(merchant)?.let { budgetIds[it] },
                                    accountLabel = if ("card" in body.lowercase()) "Card (Demo)" else "Bank A/c (Demo)",
                                    timestamp = timestamp,
                                    source = DataSource.DEMO,
                                ),
                            ),
                        )
                    }
                }
            }

            val hour = 60 * minute
            db.scheduledMessageDao().insert(
                ScheduledMessageEntity(
                    recipientName = "Aarav Sharma (Demo)",
                    recipientAddress = "+91 90000 00001",
                    body = "Happy birthday! 🎉 Have an amazing day.",
                    scheduledAt = now + 26 * hour,
                    createdAt = now,
                    source = DataSource.DEMO,
                ),
            )
            db.scheduledMessageDao().insert(
                ScheduledMessageEntity(
                    recipientName = "Mom (Demo)",
                    recipientAddress = "+91 90000 00003",
                    body = "Reminder: doctor's appointment at 11 am tomorrow.",
                    scheduledAt = now + 5 * hour,
                    createdAt = now,
                    source = DataSource.DEMO,
                ),
            )
        }
    }

    /** Removes every demo row. Real data (source = DEVICE) is untouched. */
    suspend fun clear() {
        db.withTransaction {
            db.messageDao().deleteDemo()
            db.conversationDao().deleteDemo()
            db.contactDao().deleteDemo()
            db.transactionDao().deleteDemo()
            db.budgetCategoryDao().deleteDemo()
            db.scheduledMessageDao().deleteDemo()
        }
    }

    companion object {
        private val avatarColors = listOf(0xFF7C6CF2, 0xFF10B981, 0xFFF97316, 0xFF3B82F6, 0xFFE11D74)
    }
}
