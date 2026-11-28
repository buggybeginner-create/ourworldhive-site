package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.ThemeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ThemeDao {

    @Query("SELECT * FROM themes ORDER BY id ASC")
    fun observeAll(): Flow<List<ThemeEntity>>

    @Insert
    suspend fun insertAll(themes: List<ThemeEntity>): List<Long>

    @Query("SELECT COUNT(*) FROM themes")
    suspend fun count(): Int
}
