package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.ConversationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ConversationDao {

    @Query(
        """
        SELECT * FROM conversations
        WHERE (:includeDemo OR source != 'DEMO')
        ORDER BY isPinned DESC, lastMessageAt DESC
        LIMIT :limit
        """
    )
    fun observeRecent(limit: Int, includeDemo: Boolean): Flow<List<ConversationEntity>>

    @Insert
    suspend fun insert(conversation: ConversationEntity): Long

    @Query(
        """
        UPDATE conversations
        SET unreadCount = (SELECT COUNT(*) FROM messages
                           WHERE messages.conversationId = conversations.id AND messages.isRead = 0)
        WHERE id = :conversationId
        """
    )
    suspend fun refreshUnreadCount(conversationId: Long)

    @Query("SELECT * FROM conversations ORDER BY lastMessageAt DESC")
    suspend fun getAll(): List<ConversationEntity>

    @Query("DELETE FROM conversations WHERE source = 'DEMO'")
    suspend fun deleteDemo()
}
