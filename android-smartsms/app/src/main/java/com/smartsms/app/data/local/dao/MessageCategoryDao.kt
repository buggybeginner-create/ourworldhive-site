package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.smartsms.app.data.local.entity.MessageCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageCategoryDao {

    @Query("SELECT * FROM message_categories ORDER BY sortOrder ASC")
    fun observeAll(): Flow<List<MessageCategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(categories: List<MessageCategoryEntity>)

    @Query("SELECT COUNT(*) FROM message_categories")
    suspend fun count(): Int
}
