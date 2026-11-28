package com.smartsms.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.smartsms.app.data.local.entity.BudgetCategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BudgetCategoryDao {

    @Query("SELECT * FROM budget_categories WHERE (:includeDemo OR source != 'DEMO') ORDER BY name ASC")
    fun observeAll(includeDemo: Boolean): Flow<List<BudgetCategoryEntity>>

    @Insert
    suspend fun insert(category: BudgetCategoryEntity): Long

    @Query("SELECT * FROM budget_categories ORDER BY name ASC")
    suspend fun getAll(): List<BudgetCategoryEntity>

    @Query("DELETE FROM budget_categories WHERE source = 'DEMO'")
    suspend fun deleteDemo()
}
