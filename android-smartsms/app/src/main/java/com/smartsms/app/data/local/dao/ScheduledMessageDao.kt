package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.domain.ScheduleStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface ScheduledMessageDao {

    @Query("SELECT * FROM scheduled_messages WHERE (:includeDemo OR source != 'DEMO') ORDER BY status ASC, scheduledAt ASC")
    fun observeAll(includeDemo: Boolean): Flow<List<ScheduledMessageEntity>>

    @Insert
    suspend fun insert(message: ScheduledMessageEntity): Long

    @Query("UPDATE scheduled_messages SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: Long, status: ScheduleStatus)

    @Query("DELETE FROM scheduled_messages WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("SELECT * FROM scheduled_messages ORDER BY scheduledAt ASC")
    suspend fun getAll(): List<ScheduledMessageEntity>

    @Query("DELETE FROM scheduled_messages WHERE source = 'DEMO'")
    suspend fun deleteDemo()
}
