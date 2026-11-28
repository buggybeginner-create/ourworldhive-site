package com.smartsms.app.data.repo

import android.content.ContentResolver
import android.net.Uri
import android.provider.OpenableColumns
import androidx.room.withTransaction
import com.smartsms.app.data.db.AppDatabase
import com.smartsms.app.data.db.BackupHistoryEntity
import com.smartsms.app.data.db.ConversationEntity
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.data.db.ScheduledMessageEntity
import com.smartsms.app.data.db.TransactionEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/**
 * Local backup: writes conversations, messages, scheduled messages and transactions to a
 * JSON file the user picks (phone storage, Google Drive app, etc.) and reads it back.
 * Nothing is uploaded by the app itself.
 */
class BackupRepository(private val db: AppDatabase) {

    val history: Flow<List<BackupHistoryEntity>> = db.backupHistoryDao().observeAll()

    suspend fun export(resolver: ContentResolver, uri: Uri): Result<Int> = withContext(Dispatchers.IO) {
        val name = displayName(resolver, uri)
        runCatching {
            val conversations = db.conversationDao().getAll()
            val messages = db.messageDao().getAll()
            val scheduled = db.scheduledMessageDao().getAll()
            val transactions = db.transactionDao().getAll()
            val root = JSONObject()
                .put("format", "smart-sms-backup")
                .put("version", 1)
                .put("createdAt", System.currentTimeMillis())
                .put("conversations", JSONArray(conversations.map { it.toJson() }))
                .put("messages", JSONArray(messages.map { it.toJson() }))
                .put("scheduled", JSONArray(scheduled.map { it.toJson() }))
                .put("transactions", JSONArray(transactions.map { it.toJson() }))
            resolver.openOutputStream(uri, "wt")?.use { it.write(root.toString(2).toByteArray()) }
                ?: error("Could not open the chosen file")
            conversations.size + messages.size + scheduled.size + transactions.size
        }.also { log("EXPORT", name, it) }
    }

    suspend fun import(resolver: ContentResolver, uri: Uri): Result<Int> = withContext(Dispatchers.IO) {
        val name = displayName(resolver, uri)
        runCatching {
            val text = resolver.openInputStream(uri)?.use { it.readBytes().decodeToString() }
                ?: error("Could not open the chosen file")
            val root = JSONObject(text)
            require(root.optString("format") == "smart-sms-backup") { "This is not a Smart SMS backup file" }
            val conversations = root.getJSONArray("conversations").objects().map { it.toConversation() }
            val messages = root.getJSONArray("messages").objects().map { it.toMessage() }
            val scheduled = root.getJSONArray("scheduled").objects().map { it.toScheduled() }
            val transactions = root.getJSONArray("transactions").objects().map { it.toTransaction() }
            db.withTransaction {
                db.messageDao().deleteAll()
                db.conversationDao().deleteAll()
                db.scheduledMessageDao().deleteAll()
                db.transactionDao().deleteAll()
                db.conversationDao().insertAll(conversations)
                db.messageDao().insertAll(messages)
                db.scheduledMessageDao().insertAll(scheduled)
                db.transactionDao().insertAll(transactions)
            }
            conversations.size + messages.size + scheduled.size + transactions.size
        }.also { log("IMPORT", name, it) }
    }

    private suspend fun log(kind: String, file: String, result: Result<Int>) {
        db.backupHistoryDao().insert(
            BackupHistoryEntity(
                timestamp = System.currentTimeMillis(),
                kind = kind,
                itemCount = result.getOrDefault(0),
                fileName = file,
                success = result.isSuccess,
                note = result.exceptionOrNull()?.message ?: ""
            )
        )
    }

    private fun displayName(resolver: ContentResolver, uri: Uri): String = runCatching {
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) c.getString(0) else null
        }
    }.getOrNull() ?: (uri.lastPathSegment ?: "backup.json")

    private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }

    private fun ConversationEntity.toJson() = JSONObject()
        .put("id", id).put("address", address).put("displayName", displayName)
        .put("lastMessage", lastMessage).put("lastTimestamp", lastTimestamp)
        .put("unreadCount", unreadCount).put("category", category)
        .put("isPinned", isPinned).put("isDemo", isDemo)

    private fun JSONObject.toConversation() = ConversationEntity(
        id = getLong("id"), address = getString("address"), displayName = getString("displayName"),
        lastMessage = getString("lastMessage"), lastTimestamp = getLong("lastTimestamp"),
        unreadCount = optInt("unreadCount"), category = getString("category"),
        isPinned = optBoolean("isPinned"), isDemo = optBoolean("isDemo")
    )

    private fun MessageEntity.toJson() = JSONObject()
        .put("id", id).put("conversationId", conversationId).put("address", address)
        .put("body", body).put("timestamp", timestamp).put("isIncoming", isIncoming)
        .put("isRead", isRead).put("isStarred", isStarred).put("category", category).put("isDemo", isDemo)

    private fun JSONObject.toMessage() = MessageEntity(
        id = getLong("id"), conversationId = getLong("conversationId"), address = getString("address"),
        body = getString("body"), timestamp = getLong("timestamp"), isIncoming = optBoolean("isIncoming", true),
        isRead = optBoolean("isRead"), isStarred = optBoolean("isStarred"),
        category = getString("category"), isDemo = optBoolean("isDemo")
    )

    private fun ScheduledMessageEntity.toJson() = JSONObject()
        .put("id", id).put("recipient", recipient).put("body", body).put("sendAt", sendAt)
        .put("status", status).put("createdAt", createdAt).put("isDemo", isDemo)

    private fun JSONObject.toScheduled() = ScheduledMessageEntity(
        id = getLong("id"), recipient = getString("recipient"), body = getString("body"),
        sendAt = getLong("sendAt"), status = optString("status", ScheduledMessageEntity.STATUS_PENDING),
        createdAt = optLong("createdAt"), isDemo = optBoolean("isDemo")
    )

    private fun TransactionEntity.toJson() = JSONObject()
        .put("id", id).put("messageId", messageId ?: JSONObject.NULL).put("amount", amount)
        .put("isDebit", isDebit).put("merchant", merchant).put("account", account ?: JSONObject.NULL)
        .put("budgetCategoryId", budgetCategoryId ?: JSONObject.NULL).put("timestamp", timestamp)
        .put("isDemo", isDemo)

    private fun JSONObject.toTransaction() = TransactionEntity(
        id = getLong("id"),
        messageId = if (isNull("messageId")) null else getLong("messageId"),
        amount = getDouble("amount"), isDebit = getBoolean("isDebit"), merchant = getString("merchant"),
        account = if (isNull("account")) null else getString("account"),
        budgetCategoryId = if (isNull("budgetCategoryId")) null else getLong("budgetCategoryId"),
        timestamp = getLong("timestamp"), isDemo = optBoolean("isDemo")
    )
}
