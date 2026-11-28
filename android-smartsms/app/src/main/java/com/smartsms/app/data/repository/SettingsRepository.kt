package com.smartsms.app.data.repository

import com.smartsms.app.data.local.dao.ThemeDao
import com.smartsms.app.data.local.dao.UserSettingsDao
import com.smartsms.app.data.local.entity.ThemeEntity
import com.smartsms.app.data.local.entity.UserSettingsEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SettingsRepository(
    private val settingsDao: UserSettingsDao,
    private val themeDao: ThemeDao,
) {
    val settings: Flow<UserSettingsEntity> = settingsDao.observe().map { it ?: UserSettingsEntity() }

    val themes: Flow<List<ThemeEntity>> = themeDao.observeAll()

    suspend fun update(transform: (UserSettingsEntity) -> UserSettingsEntity) {
        val current = settingsDao.get() ?: UserSettingsEntity()
        settingsDao.upsert(transform(current).copy(id = UserSettingsEntity.SINGLETON_ID))
    }
}
