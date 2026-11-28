package com.smartsms.app.data.repository

import android.content.Context
import com.smartsms.app.data.local.SmartSmsDatabase
import com.smartsms.app.data.local.entity.BackupHistoryEntity
import com.smartsms.app.domain.BackupStatus
import com.smartsms.app.domain.BackupType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Local backups: writes the database contents to a JSON file in the app's private
 * storage and records each attempt in backup history. Cloud sync arrives in a later phase.
 */
class BackupRepository(
    private val context: Context,
    private val db: SmartSmsDatabase,
) {
    val history: Flow<List<BackupHistoryEntity>> = db.backupHistoryDao().observeAll()

    suspend fun createLocalBackup(): Result<BackupHistoryEntity> = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        runCatching {
            val messages = db.messageDao().getAll()
            val conversations = db.conversationDao().getAll()
            val contacts = db.contactDao().getAll()
            val scheduled = db.scheduledMessageDao().getAll()
            val transactions = db.transactionDao().getAll()
            val budgets = db.budgetCategoryDao().getAll()
            val settings = db.userSettingsDao().get()

            val root = JSONObject()
                .put("format", "smart-sms-backup")
                .put("version", 1)
                .put("createdAt", now)
                .put("note", "Rows with source DEMO are sample data, not real SMS.")
                .put("messages", JSONArray(messages.map {
                    JSONObject().put("id", it.id).put("conversationId", it.conversationId).put("address", it.address)
                        .put("senderName", it.senderName).put("body", it.body).put("timestamp", it.timestamp)
                        .put("isIncoming", it.isIncoming).put("isRead", it.isRead).put("isStarred", it.isStarred)
                        .put("category", it.category.name).put("source", it.source.name)
                }))
                .put("conversations", JSONArray(conversations.map {
                    JSONObject().put("id", it.id).put("address", it.address).put("displayName", it.displayName)
                        .put("lastMessageAt", it.lastMessageAt).put("category", it.category.name).put("source", it.source.name)
                }))
                .put("contacts", JSONArray(contacts.map {
                    JSONObject().put("id", it.id).put("name", it.name).put("phoneNumber", it.phoneNumber).put("source", it.source.name)
                }))
                .put("scheduledMessages", JSONArray(scheduled.map {
                    JSONObject().put("id", it.id).put("recipientName", it.recipientName).put("recipientAddress", it.recipientAddress)
                        .put("body", it.body).put("scheduledAt", it.scheduledAt).put("status", it.status.name).put("source", it.source.name)
                }))
                .put("transactions", JSONArray(transactions.map {
                    JSONObject().put("id", it.id).put("merchant", it.merchant).put("amount", it.amount).put("type", it.type.name)
                        .put("budgetCategoryId", it.budgetCategoryId ?: JSONObject.NULL).put("timestamp", it.timestamp).put("source", it.source.name)
                }))
                .put("budgetCategories", JSONArray(budgets.map {
                    JSONObject().put("id", it.id).put("name", it.name).put("monthlyLimit", it.monthlyLimit).put("source", it.source.name)
                }))
                .put("settings", settings?.let {
                    JSONObject().put("themeMode", it.themeMode.name).put("accentThemeId", it.accentThemeId)
                        .put("fontSize", it.fontSize.name).put("bubbleStyle", it.bubbleStyle.name)
                        .put("showAvatars", it.showAvatars).put("compactMode", it.compactMode)
                } ?: JSONObject.NULL)

            val dir = File(context.filesDir, "backups").apply { mkdirs() }
            val stamp = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date(now))
            val file = File(dir, "smart-sms-$stamp.json")
            file.writeText(root.toString(2))

            val itemCount = messages.size + conversations.size + contacts.size + scheduled.size + transactions.size + budgets.size
            val entry = BackupHistoryEntity(
                createdAt = now,
                type = BackupType.LOCAL,
                status = BackupStatus.SUCCESS,
                itemCount = itemCount,
                sizeBytes = file.length(),
                filePath = file.absolutePath,
                note = "${messages.size} messages, ${transactions.size} transactions",
            )
            entry.copy(id = db.backupHistoryDao().insert(entry))
        }.onFailure { error ->
            db.backupHistoryDao().insert(
                BackupHistoryEntity(
                    createdAt = now,
                    type = BackupType.LOCAL,
                    status = BackupStatus.FAILED,
                    itemCount = 0,
                    sizeBytes = 0,
                    note = error.message ?: "Unknown error",
                ),
            )
        }
    }

    /** Deletes the history entry and its backup file, if the file still exists. */
    suspend fun delete(entry: BackupHistoryEntity) = withContext(Dispatchers.IO) {
        entry.filePath?.let { File(it).delete() }
        db.backupHistoryDao().delete(entry.id)
    }
}
