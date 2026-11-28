package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.smartsms.app.domain.DataSource

@Entity(tableName = "contacts", indices = [Index("phoneNumber")])
data class ContactEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phoneNumber: String,
    val avatarColor: Long,
    val isFavorite: Boolean = false,
    val source: DataSource,
)
