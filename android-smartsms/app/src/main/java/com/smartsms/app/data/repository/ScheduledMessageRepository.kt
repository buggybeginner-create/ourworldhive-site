package com.smartsms.app.data.repository

import com.smartsms.app.data.local.dao.ScheduledMessageDao
import com.smartsms.app.data.local.entity.ScheduledMessageEntity
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.ScheduleStatus
import kotlinx.coroutines.flow.Flow

class ScheduledMessageRepository(private val dao: ScheduledMessageDao) {

    fun scheduled(includeDemo: Boolean): Flow<List<ScheduledMessageEntity>> = dao.observeAll(includeDemo)

    /** Saves a schedule entry the user created. Sending happens in a later phase. */
    suspend fun schedule(name: String, address: String, body: String, at: Long): Long =
        dao.insert(
            ScheduledMessageEntity(
                recipientName = name.ifBlank { address },
                recipientAddress = address,
                body = body,
                scheduledAt = at,
                createdAt = System.currentTimeMillis(),
                source = DataSource.DEVICE,
            ),
        )

    suspend fun cancel(id: Long) = dao.updateStatus(id, ScheduleStatus.CANCELLED)

    suspend fun restore(id: Long) = dao.updateStatus(id, ScheduleStatus.PENDING)

    suspend fun delete(id: Long) = dao.delete(id)
}
