package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.smartsms.app.domain.BackupStatus
import com.smartsms.app.domain.BackupType

@Entity(tableName = "backup_history")
data class BackupHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val createdAt: Long,
    val type: BackupType,
    val status: BackupStatus,
    val itemCount: Int,
    val sizeBytes: Long,
    val filePath: String? = null,
    val note: String = "",
)
