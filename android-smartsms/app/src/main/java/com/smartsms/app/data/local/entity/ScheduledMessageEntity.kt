package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.ScheduleStatus

@Entity(tableName = "scheduled_messages", indices = [Index("scheduledAt")])
data class ScheduledMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val recipientName: String,
    val recipientAddress: String,
    val body: String,
    val scheduledAt: Long,
    val status: ScheduleStatus = ScheduleStatus.PENDING,
    val createdAt: Long,
    val source: DataSource,
)
