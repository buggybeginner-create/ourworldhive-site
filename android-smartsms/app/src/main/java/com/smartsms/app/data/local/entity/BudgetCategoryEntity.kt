package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.smartsms.app.domain.DataSource

@Entity(tableName = "budget_categories")
data class BudgetCategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val monthlyLimit: Double,
    val colorArgb: Long,
    val source: DataSource,
)
