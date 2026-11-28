package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageCategory

/** One thread with a sender, holding a summary of its latest message. */
@Entity(tableName = "conversations", indices = [Index("address"), Index("lastMessageAt")])
data class ConversationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val address: String,
    val displayName: String,
    val contactId: Long? = null,
    val lastMessagePreview: String,
    val lastMessageAt: Long,
    val unreadCount: Int = 0,
    val category: MessageCategory,
    val isPinned: Boolean = false,
    val source: DataSource,
)
