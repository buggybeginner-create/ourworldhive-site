package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/** An accent colour palette the user can pick on the Theme screen. */
@Entity(tableName = "themes")
data class ThemeEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val primaryArgb: Long,
    val secondaryArgb: Long,
    val isBuiltIn: Boolean = true,
)
