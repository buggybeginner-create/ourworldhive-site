package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow

/** Row returned by [TransactionDao.observeSpendByCategory]. */
data class CategorySpend(
    val budgetCategoryId: Long?,
    val spent: Double,
)

@Dao
interface TransactionDao {

    @Query("SELECT * FROM transactions WHERE timestamp >= :since AND (:includeDemo OR source != 'DEMO') ORDER BY timestamp DESC")
    fun observeSince(since: Long, includeDemo: Boolean): Flow<List<TransactionEntity>>

    @Query(
        """
        SELECT budgetCategoryId, SUM(amount) AS spent
        FROM transactions
        WHERE type = 'DEBIT' AND timestamp >= :since AND (:includeDemo OR source != 'DEMO')
        GROUP BY budgetCategoryId
        """
    )
    fun observeSpendByCategory(since: Long, includeDemo: Boolean): Flow<List<CategorySpend>>

    @Insert
    suspend fun insertAll(transactions: List<TransactionEntity>): List<Long>

    @Query("SELECT * FROM transactions ORDER BY timestamp DESC")
    suspend fun getAll(): List<TransactionEntity>

    @Query("DELETE FROM transactions WHERE source = 'DEMO'")
    suspend fun deleteDemo()
}
