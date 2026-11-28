package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.ContactEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ContactDao {

    @Query("SELECT * FROM contacts WHERE (:includeDemo OR source != 'DEMO') ORDER BY isFavorite DESC, name ASC")
    fun observeAll(includeDemo: Boolean): Flow<List<ContactEntity>>

    @Insert
    suspend fun insert(contact: ContactEntity): Long

    @Query("SELECT * FROM contacts ORDER BY name ASC")
    suspend fun getAll(): List<ContactEntity>

    @Query("DELETE FROM contacts WHERE source = 'DEMO'")
    suspend fun deleteDemo()
}
