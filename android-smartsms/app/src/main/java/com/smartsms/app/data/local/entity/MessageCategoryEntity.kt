package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Display metadata for each smart category (label, colour, order). */
@Entity(tableName = "message_categories")
data class MessageCategoryEntity(
    @PrimaryKey val key: String,
    val label: String,
    val description: String,
    val colorArgb: Long,
    val sortOrder: Int,
    val isSystem: Boolean = true,
)
