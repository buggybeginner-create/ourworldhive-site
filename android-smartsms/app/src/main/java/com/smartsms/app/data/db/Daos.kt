package com.smartsms.app.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {
    @Query("SELECT * FROM messages WHERE (:showDemo OR isDemo = 0) ORDER BY timestamp DESC")
    fun observeAll(showDemo: Boolean): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE category = :category AND (:showDemo OR isDemo = 0) ORDER BY timestamp DESC")
    fun observeByCategory(category: String, showDemo: Boolean): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC")
    fun observeThread(conversationId: Long): Flow<List<MessageEntity>>

    @Query(
        "SELECT * FROM messages WHERE (:showDemo OR isDemo = 0) AND " +
            "(body LIKE '%' || :query || '%' OR address LIKE '%' || :query || '%') ORDER BY timestamp DESC LIMIT 200"
    )
    fun search(query: String, showDemo: Boolean): Flow<List<MessageEntity>>

    @Query(
        "SELECT category, COUNT(*) AS total, SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) AS unread " +
            "FROM messages WHERE (:showDemo OR isDemo = 0) " +
            "AND conversationId NOT IN (SELECT id FROM conversations WHERE isBlocked = 1 OR isArchived = 1) GROUP BY category"
    )
    fun observeCounts(showDemo: Boolean): Flow<List<CategoryCount>>

    @Insert
    suspend fun insertAll(messages: List<MessageEntity>): List<Long>

    /** Import from the phone: rows whose smsId is already stored are skipped (id = -1). */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAllIgnore(messages: List<MessageEntity>): List<Long>

    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp DESC LIMIT 1")
    suspend fun latestIn(conversationId: Long): MessageEntity?

    @Query("SELECT COUNT(*) FROM messages WHERE conversationId = :conversationId AND isRead = 0")
    suspend fun unreadIn(conversationId: Long): Int

    @Query(
        "SELECT category, COUNT(*) AS total, SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END) AS unread " +
            "FROM messages WHERE conversationId = :conversationId GROUP BY category"
    )
    suspend fun countsIn(conversationId: Long): List<CategoryCount>

    @Query("SELECT COUNT(*) FROM messages WHERE isDemo = 0")
    fun observeRealCount(): Flow<Int>

    @Query("DELETE FROM messages WHERE isDemo = 0")
    suspend fun deleteReal()

    /** MMS rows are stored with a negative smsId (-mmsId); the smallest one is the newest MMS read. */
    @Query("SELECT MIN(smsId) FROM messages WHERE smsId < 0")
    suspend fun minSmsId(): Long?

    @Query("UPDATE messages SET isRead = 1 WHERE isRead = 0")
    suspend fun markAllRead()

    @Query("UPDATE messages SET category = :to WHERE conversationId = :conversationId AND category = :from")
    suspend fun recategorize(conversationId: Long, from: String, to: String)

    @Query("UPDATE messages SET category = 'spam' WHERE conversationId = :conversationId AND category != 'otp'")
    suspend fun markSpam(conversationId: Long)

    @Query("UPDATE messages SET isRead = 1 WHERE conversationId = :conversationId")
    suspend fun markThreadRead(conversationId: Long)

    @Query("UPDATE messages SET isStarred = NOT isStarred WHERE id = :id")
    suspend fun toggleStar(id: Long)

    @Query("SELECT * FROM messages")
    suspend fun getAll(): List<MessageEntity>

    @Query("DELETE FROM messages WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("DELETE FROM messages")
    suspend fun deleteAll()
}

@Dao
interface ConversationDao {
    /** Every chat except blocked, archived and spam ones. */
    @Query(
        "SELECT * FROM conversations WHERE (:showDemo OR isDemo = 0) AND isBlocked = 0 AND isArchived = 0 " +
            "AND category != 'spam' ORDER BY isPinned DESC, lastTimestamp DESC"
    )
    fun observeAll(showDemo: Boolean): Flow<List<ConversationEntity>>

    @Query("SELECT * FROM conversations WHERE isArchived = 1 AND isBlocked = 0 ORDER BY lastTimestamp DESC")
    fun observeArchived(): Flow<List<ConversationEntity>>

    @Query("SELECT * FROM conversations WHERE isBlocked = 1 ORDER BY lastTimestamp DESC")
    fun observeBlocked(): Flow<List<ConversationEntity>>

    @Query("UPDATE conversations SET isArchived = :on WHERE id = :id")
    suspend fun setArchived(id: Long, on: Boolean)

    @Query("UPDATE conversations SET isBlocked = :on WHERE id = :id")
    suspend fun setBlocked(id: Long, on: Boolean)

    @Query("UPDATE conversations SET category = :category, notSpam = :notSpam WHERE id = :id")
    suspend fun setSpam(id: Long, category: String, notSpam: Boolean)

    @Query("SELECT * FROM conversations WHERE id = :id")
    suspend fun getById(id: Long): ConversationEntity?

    @Query(
        "SELECT * FROM conversations WHERE category = :category AND (:showDemo OR isDemo = 0) " +
            "AND isBlocked = 0 AND isArchived = 0 ORDER BY isPinned DESC, lastTimestamp DESC"
    )
    fun observeByCategory(category: String, showDemo: Boolean): Flow<List<ConversationEntity>>

    @Query("SELECT * FROM conversations WHERE id = :id")
    fun observeById(id: Long): Flow<ConversationEntity?>

    @Insert
    suspend fun insert(conversation: ConversationEntity): Long

    @Insert
    suspend fun insertAll(conversations: List<ConversationEntity>): List<Long>

    @Query("SELECT * FROM conversations WHERE isDemo = 0")
    suspend fun getReal(): List<ConversationEntity>

    @Update
    suspend fun update(conversation: ConversationEntity)

    @Query("DELETE FROM conversations WHERE isDemo = 0")
    suspend fun deleteReal()

    @Query("UPDATE conversations SET unreadCount = 0")
    suspend fun clearAllUnread()

    @Query("UPDATE conversations SET unreadCount = 0 WHERE id = :id")
    suspend fun clearUnread(id: Long)

    @Query("UPDATE conversations SET isPinned = NOT isPinned WHERE id = :id")
    suspend fun togglePin(id: Long)

    @Query("SELECT * FROM conversations")
    suspend fun getAll(): List<ConversationEntity>

    @Query("DELETE FROM conversations WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("DELETE FROM conversations")
    suspend fun deleteAll()
}

@Dao
interface ContactDao {
    @Query("SELECT * FROM contacts WHERE (:showDemo OR isDemo = 0) ORDER BY name")
    fun observeAll(showDemo: Boolean): Flow<List<ContactEntity>>

    @Query("SELECT * FROM contacts WHERE phone = :phone LIMIT 1")
    suspend fun findByPhone(phone: String): ContactEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(contacts: List<ContactEntity>)

    @Query("DELETE FROM contacts WHERE isDemo = 1")
    suspend fun deleteDemo()
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM message_categories ORDER BY sortOrder")
    fun observeAll(): Flow<List<CategoryEntity>>

    @Upsert
    suspend fun upsertAll(categories: List<CategoryEntity>)
}

@Dao
interface ScheduledMessageDao {
    @Query("SELECT * FROM scheduled_messages WHERE (:showDemo OR isDemo = 0) ORDER BY sendAt ASC")
    fun observeAll(showDemo: Boolean): Flow<List<ScheduledMessageEntity>>

    @Insert
    suspend fun insert(message: ScheduledMessageEntity): Long

    @Update
    suspend fun update(message: ScheduledMessageEntity)

    @Query("DELETE FROM scheduled_messages WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("SELECT * FROM scheduled_messages")
    suspend fun getAll(): List<ScheduledMessageEntity>

    @Query("SELECT * FROM scheduled_messages WHERE id = :id")
    suspend fun getById(id: Long): ScheduledMessageEntity?

    @Query("SELECT * FROM scheduled_messages WHERE status = 'PENDING' AND isDemo = 0")
    suspend fun getPendingReal(): List<ScheduledMessageEntity>

    @Insert
    suspend fun insertAll(messages: List<ScheduledMessageEntity>)

    @Query("DELETE FROM scheduled_messages WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("DELETE FROM scheduled_messages")
    suspend fun deleteAll()
}

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions WHERE (:showDemo OR isDemo = 0) AND timestamp >= :from ORDER BY timestamp DESC")
    fun observeSince(from: Long, showDemo: Boolean): Flow<List<TransactionEntity>>

    @Insert
    suspend fun insertAll(transactions: List<TransactionEntity>)

    @Query("SELECT * FROM transactions")
    suspend fun getAll(): List<TransactionEntity>

    @Query("DELETE FROM transactions WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("DELETE FROM transactions WHERE isDemo = 0 AND messageId IS NOT NULL")
    suspend fun deleteFromSms()

    @Query("DELETE FROM transactions")
    suspend fun deleteAll()
}

@Dao
interface BudgetCategoryDao {
    @Query("SELECT * FROM budget_categories ORDER BY id")
    fun observeAll(): Flow<List<BudgetCategoryEntity>>

    @Insert
    suspend fun insertAll(categories: List<BudgetCategoryEntity>): List<Long>

    @Update
    suspend fun update(category: BudgetCategoryEntity)

    @Query("SELECT * FROM budget_categories")
    suspend fun getAll(): List<BudgetCategoryEntity>
}

@Dao
interface BackupHistoryDao {
    @Query("SELECT * FROM backup_history ORDER BY timestamp DESC LIMIT 50")
    fun observeAll(): Flow<List<BackupHistoryEntity>>

    @Insert
    suspend fun insert(entry: BackupHistoryEntity)
}

@Dao
interface UserSettingsDao {
    @Query("SELECT * FROM user_settings WHERE id = 1")
    fun observe(): Flow<UserSettingsEntity?>

    @Query("SELECT * FROM user_settings WHERE id = 1")
    suspend fun get(): UserSettingsEntity?

    @Upsert
    suspend fun upsert(settings: UserSettingsEntity)
}

@Dao
interface ThemeDao {
    @Query("SELECT * FROM themes ORDER BY id")
    fun observeAll(): Flow<List<ThemeEntity>>

    @Insert
    suspend fun insertAll(themes: List<ThemeEntity>)
}

@Dao
interface ReminderDao {
    @Query("SELECT * FROM reminders WHERE (:showDemo OR isDemo = 0) ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END, dueAt ASC")
    fun observeAll(showDemo: Boolean): Flow<List<ReminderEntity>>

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(r: ReminderEntity): Long

    @Query("SELECT * FROM reminders WHERE id = :id")
    suspend fun getById(id: Long): ReminderEntity?

    @Query("SELECT * FROM reminders WHERE status = 'PENDING' AND isDemo = 0")
    suspend fun getPendingReal(): List<ReminderEntity>

    @Query("UPDATE reminders SET status = :status WHERE id = :id")
    suspend fun setStatus(id: Long, status: String)

    @Query("DELETE FROM reminders WHERE isDemo = 1")
    suspend fun deleteDemo()

    @Query("DELETE FROM reminders WHERE isDemo = 0 AND messageId IS NOT NULL")
    suspend fun deleteFromSms()
}
