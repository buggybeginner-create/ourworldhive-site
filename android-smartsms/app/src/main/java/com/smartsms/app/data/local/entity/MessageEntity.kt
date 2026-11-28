package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageCategory

@Entity(
    tableName = "messages",
    foreignKeys = [
        ForeignKey(
            entity = ConversationEntity::class,
            parentColumns = ["id"],
            childColumns = ["conversationId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index("conversationId"), Index("category"), Index("timestamp"), Index("source")],
)
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val conversationId: Long,
    val address: String,
    val senderName: String,
    val body: String,
    val timestamp: Long,
    val isIncoming: Boolean = true,
    val isRead: Boolean = false,
    val isStarred: Boolean = false,
    val category: MessageCategory,
    /** DEMO rows are sample data created by the app, never real SMS. */
    val source: DataSource,
)
