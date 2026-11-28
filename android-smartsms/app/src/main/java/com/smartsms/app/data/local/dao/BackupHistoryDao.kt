package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.BackupHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BackupHistoryDao {

    @Query("SELECT * FROM backup_history ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<BackupHistoryEntity>>

    @Insert
    suspend fun insert(entry: BackupHistoryEntity): Long

    @Query("SELECT * FROM backup_history WHERE id = :id")
    suspend fun getById(id: Long): BackupHistoryEntity?

    @Query("DELETE FROM backup_history WHERE id = :id")
    suspend fun delete(id: Long)
}
