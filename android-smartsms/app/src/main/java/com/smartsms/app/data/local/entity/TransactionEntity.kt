package com.smartsms.app.data.local.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.TransactionType

@Entity(tableName = "transactions", indices = [Index("timestamp"), Index("budgetCategoryId")])
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val messageId: Long? = null,
    val merchant: String,
    val amount: Double,
    val type: TransactionType,
    val budgetCategoryId: Long? = null,
    val accountLabel: String,
    val timestamp: Long,
    val source: DataSource,
)
