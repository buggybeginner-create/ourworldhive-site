package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.domain.MessageCategory
import kotlinx.coroutines.flow.Flow

/** Row returned by [MessageDao.observeCategoryCounts]. */
data class CategoryCount(
    val category: MessageCategory,
    val total: Int,
    val unread: Int,
)

@Dao
interface MessageDao {

    @Query(
        """
        SELECT * FROM messages
        WHERE (:includeDemo OR source != 'DEMO')
          AND (:query = '' OR body LIKE '%' || :query || '%'
               OR senderName LIKE '%' || :query || '%'
               OR address LIKE '%' || :query || '%')
        ORDER BY timestamp DESC
        """
    )
    fun observeAll(query: String, includeDemo: Boolean): Flow<List<MessageEntity>>

    @Query(
        """
        SELECT * FROM messages
        WHERE category = :category
          AND (:includeDemo OR source != 'DEMO')
          AND (:query = '' OR body LIKE '%' || :query || '%'
               OR senderName LIKE '%' || :query || '%'
               OR address LIKE '%' || :query || '%')
        ORDER BY timestamp DESC
        """
    )
    fun observeByCategory(category: MessageCategory, query: String, includeDemo: Boolean): Flow<List<MessageEntity>>

    @Query(
        """
        SELECT category, COUNT(*) AS total,
               SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) AS unread
        FROM messages
        WHERE (:includeDemo OR source != 'DEMO')
        GROUP BY category
        """
    )
    fun observeCategoryCounts(includeDemo: Boolean): Flow<List<CategoryCount>>

    @Query("SELECT * FROM messages WHERE id = :id")
    suspend fun getById(id: Long): MessageEntity?

    @Query("UPDATE messages SET isRead = 1 WHERE id = :id")
    suspend fun markRead(id: Long)

    @Query("UPDATE messages SET isStarred = :starred WHERE id = :id")
    suspend fun setStarred(id: Long, starred: Boolean)

    @Insert
    suspend fun insert(message: MessageEntity): Long

    @Insert
    suspend fun insertAll(messages: List<MessageEntity>): List<Long>

    @Query("SELECT * FROM messages ORDER BY timestamp DESC")
    suspend fun getAll(): List<MessageEntity>

    @Query("SELECT COUNT(*) FROM messages WHERE source = 'DEMO'")
    suspend fun countDemo(): Int

    @Query("DELETE FROM messages WHERE source = 'DEMO'")
    suspend fun deleteDemo()
}
