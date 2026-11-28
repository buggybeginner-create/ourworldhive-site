package com.smartsms.app.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/*
 * Every table that can hold message-like content has an `isDemo` column.
 * Phase 1 only stores sample rows (isDemo = true); real SMS rows added in later
 * phases are written with isDemo = false, so the two never mix and the demo
 * rows can be hidden or deleted in one step.
 */

@Entity(
    tableName = "messages",
    indices = [Index("conversationId"), Index("category"), Index("timestamp")]
)
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val conversationId: Long,
    val address: String,
    val body: String,
    val timestamp: Long,
    val isIncoming: Boolean = true,
    val isRead: Boolean = false,
    val isStarred: Boolean = false,
    val category: String,
    val isDemo: Boolean
)

@Entity(tableName = "conversations", indices = [Index(value = ["address"], unique = true)])
data class ConversationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val address: String,
    val displayName: String,
    val lastMessage: String,
    val lastTimestamp: Long,
    val unreadCount: Int = 0,
    val category: String,
    val isPinned: Boolean = false,
    val isDemo: Boolean
)

@Entity(tableName = "contacts", indices = [Index(value = ["phone"], unique = true)])
data class ContactEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String,
    val avatarColor: Long,
    val isDemo: Boolean
)

@Entity(tableName = "message_categories")
data class CategoryEntity(
    @PrimaryKey val key: String,
    val label: String,
    val sortOrder: Int,
    val isSystem: Boolean = true
)

@Entity(tableName = "scheduled_messages", indices = [Index("sendAt")])
data class ScheduledMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val recipient: String,
    val body: String,
    val sendAt: Long,
    /** PENDING or CANCELLED. Sending is added in a later phase. */
    val status: String = STATUS_PENDING,
    val createdAt: Long,
    val isDemo: Boolean
) {
    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_CANCELLED = "CANCELLED"
    }
}

@Entity(tableName = "transactions", indices = [Index("timestamp"), Index("budgetCategoryId")])
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val messageId: Long?,
    val amount: Double,
    val isDebit: Boolean,
    val merchant: String,
    val account: String?,
    val budgetCategoryId: Long?,
    val timestamp: Long,
    val isDemo: Boolean
)

@Entity(tableName = "budget_categories")
data class BudgetCategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val monthlyLimit: Double,
    val colorArgb: Long,
    val iconKey: String
)

@Entity(tableName = "backup_history")
data class BackupHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long,
    /** EXPORT or IMPORT */
    val kind: String,
    val itemCount: Int,
    val fileName: String,
    val success: Boolean,
    val note: String
)

/** Single row (id = 1) holding every user preference. */
@Entity(tableName = "user_settings")
data class UserSettingsEntity(
    @PrimaryKey val id: Int = 1,
    val themeMode: String = "dark",
    val themeId: Long = 1,
    val useDynamicColor: Boolean = false,
    val fontScale: Float = 1.0f,
    val bubbleStyle: String = "rounded",
    val bubbleCorner: Int = 20,
    val showTimestamps: Boolean = true,
    val compactList: Boolean = false,
    val showAvatars: Boolean = true,
    val showDemoData: Boolean = true
)

@Entity(tableName = "themes")
data class ThemeEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val accentArgb: Long,
    val secondaryArgb: Long,
    val isBuiltIn: Boolean = true
)

/** Result row of the per-folder count query. */
data class CategoryCount(
    val category: String,
    val total: Int,
    val unread: Int
)
