package com.smartsms.app.data.repository

import com.smartsms.app.data.local.dao.CategoryCount
import com.smartsms.app.data.local.dao.ContactDao
import com.smartsms.app.data.local.dao.ConversationDao
import com.smartsms.app.data.local.dao.MessageCategoryDao
import com.smartsms.app.data.local.dao.MessageDao
import com.smartsms.app.data.local.entity.ContactEntity
import com.smartsms.app.data.local.entity.ConversationEntity
import com.smartsms.app.data.local.entity.MessageCategoryEntity
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.domain.MessageCategory
import kotlinx.coroutines.flow.Flow

class MessageRepository(
    private val messageDao: MessageDao,
    private val conversationDao: ConversationDao,
    private val contactDao: ContactDao,
    private val categoryDao: MessageCategoryDao,
) {
    fun messages(category: MessageCategory, query: String, includeDemo: Boolean): Flow<List<MessageEntity>> {
        val q = query.trim()
        return if (category == MessageCategory.ALL) {
            messageDao.observeAll(q, includeDemo)
        } else {
            messageDao.observeByCategory(category, q, includeDemo)
        }
    }

    fun categoryCounts(includeDemo: Boolean): Flow<List<CategoryCount>> = messageDao.observeCategoryCounts(includeDemo)

    fun recentConversations(includeDemo: Boolean, limit: Int = 20): Flow<List<ConversationEntity>> =
        conversationDao.observeRecent(limit, includeDemo)

    fun contacts(includeDemo: Boolean): Flow<List<ContactEntity>> = contactDao.observeAll(includeDemo)

    val categories: Flow<List<MessageCategoryEntity>> = categoryDao.observeAll()

    suspend fun markRead(message: MessageEntity) {
        if (message.isRead) return
        messageDao.markRead(message.id)
        conversationDao.refreshUnreadCount(message.conversationId)
    }

    suspend fun toggleStar(message: MessageEntity) = messageDao.setStarred(message.id, !message.isStarred)
}
