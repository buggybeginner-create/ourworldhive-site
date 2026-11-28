package com.smartsms.app.sms

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.provider.Telephony
import androidx.room.withTransaction
import com.smartsms.app.data.db.AppDatabase
import com.smartsms.app.data.db.CategoryCount
import com.smartsms.app.data.db.ConversationEntity
import com.smartsms.app.data.db.MessageEntity
import com.smartsms.app.data.db.TransactionEntity
import com.smartsms.app.domain.Addresses
import com.smartsms.app.domain.BudgetGuess
import com.smartsms.app.domain.Categorizer
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.domain.TransactionParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

sealed interface SmsSyncState {
    data object Idle : SmsSyncState
    data class Reading(val count: Int) : SmsSyncState
    data class Done(val added: Int, val at: Long) : SmsSyncState
    data class Failed(val reason: String) : SmsSyncState
}

/**
 * Copies SMS from the phone's own SMS store into Smart SMS (read only — the phone's store is
 * never changed). Each phone SMS is stored once (smsId), so running it again only adds new ones.
 */
class SmsImporter(private val app: Context, private val db: AppDatabase, private val scope: CoroutineScope) {

    private val mutex = Mutex()
    private val _state = MutableStateFlow<SmsSyncState>(SmsSyncState.Idle)
    val state: StateFlow<SmsSyncState> = _state.asStateFlow()

    private var observer: ContentObserver? = null
    private var pending: Job? = null

    /** Watches the phone's SMS store while the app is alive, so new and sent SMS appear by themselves. */
    fun startWatching() {
        if (observer != null || !Perms.canRead(app)) return
        val o = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) = importSoon()
            override fun onChange(selfChange: Boolean, uri: Uri?) = importSoon()
        }
        try {
            app.contentResolver.registerContentObserver(Telephony.Sms.CONTENT_URI, true, o)
            observer = o
        } catch (_: SecurityException) {
        }
    }

    /** Several changes in a row (a long SMS arrives in parts) cause one import. */
    fun importSoon(waitMs: Long = 1500) {
        pending?.cancel()
        pending = scope.launch {
            delay(waitMs)
            import()
        }
    }

    suspend fun import(full: Boolean = false): Result<Int> = withContext(Dispatchers.IO) {
        if (!Perms.canRead(app)) return@withContext Result.failure(SecurityException("SMS access is not allowed"))
        mutex.withLock {
            _state.value = SmsSyncState.Reading(0)
            val r = runCatching { readNew(full) }
            _state.value = r.fold(
                { SmsSyncState.Done(it, System.currentTimeMillis()) },
                { SmsSyncState.Failed(it.message ?: "Could not read SMS") }
            )
            r
        }
    }

    private suspend fun readNew(full: Boolean): Int {
        if (full) {
            db.withTransaction {
                db.transactionDao().deleteFromSms()
                db.messageDao().deleteReal()
                db.conversationDao().deleteReal()
            }
        }
        val settingsDao = db.userSettingsDao()
        val since = if (full) 0L else (settingsDao.get()?.lastSmsId ?: 0L)
        val convByKey = db.conversationDao().getReal().associateBy { it.address }.toMutableMap()
        val budgets = db.budgetCategoryDao().getAll()
        val names = HashMap<String, String>()
        val touched = LinkedHashSet<String>()
        val batch = ArrayList<MessageEntity>(400)
        var maxId = since
        var added = 0

        suspend fun flush() {
            if (batch.isEmpty()) return
            val ids = db.messageDao().insertAllIgnore(batch)
            val tx = ArrayList<TransactionEntity>()
            batch.forEachIndexed { i, m ->
                if (ids[i] <= 0) return@forEachIndexed
                added++
                if (m.category == MessageCategory.TRANSACTIONS.key) {
                    TransactionParser.parse(m.body)?.let { p ->
                        val merchant = p.merchant ?: Addresses.key(m.address)
                        val budget = if (p.isDebit) budgets.firstOrNull { it.name == BudgetGuess.nameFor(merchant) }?.id else null
                        tx += TransactionEntity(
                            messageId = ids[i], amount = p.amount, isDebit = p.isDebit, merchant = merchant,
                            account = p.account, budgetCategoryId = budget, timestamp = m.timestamp, isDemo = false
                        )
                    }
                }
            }
            if (tx.isNotEmpty()) db.transactionDao().insertAll(tx)
            batch.clear()
            _state.value = SmsSyncState.Reading(added)
        }

        val cols = arrayOf(
            Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY,
            Telephony.Sms.DATE, Telephony.Sms.TYPE, Telephony.Sms.READ
        )
        app.contentResolver.query(
            Telephony.Sms.CONTENT_URI, cols, "${Telephony.Sms._ID} > ?", arrayOf(since.toString()), "${Telephony.Sms._ID} ASC"
        )?.use { c ->
            val iId = c.getColumnIndexOrThrow(Telephony.Sms._ID)
            val iAddr = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val iBody = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val iDate = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
            val iType = c.getColumnIndexOrThrow(Telephony.Sms.TYPE)
            val iRead = c.getColumnIndexOrThrow(Telephony.Sms.READ)
            while (c.moveToNext()) {
                val id = c.getLong(iId)
                if (id > maxId) maxId = id
                val type = c.getInt(iType)
                if (type == Telephony.Sms.MESSAGE_TYPE_DRAFT) continue
                val addr = c.getString(iAddr)?.trim().orEmpty()
                if (addr.isEmpty()) continue
                val body = c.getString(iBody).orEmpty()
                val key = Addresses.key(addr)
                val conv = convByKey[key] ?: run {
                    val e = ConversationEntity(
                        address = key, displayName = displayName(addr, names), lastMessage = "", lastTimestamp = 0,
                        category = MessageCategory.PERSONAL.key, isDemo = false
                    )
                    e.copy(id = db.conversationDao().insert(e)).also { convByKey[key] = it }
                }
                touched += key
                val incoming = type == Telephony.Sms.MESSAGE_TYPE_INBOX
                batch += MessageEntity(
                    conversationId = conv.id, address = addr, body = body, timestamp = c.getLong(iDate),
                    isIncoming = incoming, isRead = !incoming || c.getInt(iRead) == 1,
                    category = Categorizer.classify(addr, body).key, isDemo = false, smsId = id
                )
                if (batch.size >= 400) flush()
            }
        }
        flush()

        // Refresh each chat that got new messages: last line, time, unread count, folder.
        for (key in touched) {
            val conv = convByKey[key] ?: continue
            val latest = db.messageDao().latestIn(conv.id) ?: continue
            val updated = conv.copy(
                lastMessage = latest.body.take(300),
                lastTimestamp = latest.timestamp,
                unreadCount = db.messageDao().unreadIn(conv.id),
                category = folderFor(latest.address, db.messageDao().countsIn(conv.id))
            )
            db.conversationDao().update(updated)
            convByKey[key] = updated
        }

        // Contact names for chats that still show only a number (e.g. contacts allowed later).
        if (Perms.canContacts(app)) {
            convByKey.values.filter { c -> c.displayName.none { it.isLetter() } }.forEach { c ->
                val n = lookupName(c.address)
                if (n != null) db.conversationDao().update(c.copy(displayName = n))
            }
        }

        settingsDao.get()?.let { s ->
            // First real import: hide the sample rows so real and demo never mix on screen.
            val hideDemo = since == 0L && added > 0
            settingsDao.upsert(s.copy(lastSmsId = maxId, showDemoData = if (hideDemo) false else s.showDemoData))
        }
        return added
    }

    /** People → Personal. Businesses → their most common kind of message (OTP only if that is all they send). */
    private fun folderFor(address: String, counts: List<CategoryCount>): String {
        if (Addresses.canReply(address)) return MessageCategory.PERSONAL.key
        val nonOtp = counts.filter { it.category != MessageCategory.OTP.key }
        return (nonOtp.maxByOrNull { it.total } ?: counts.maxByOrNull { it.total })?.category ?: MessageCategory.OFFERS.key
    }

    private fun displayName(raw: String, cache: HashMap<String, String>): String =
        cache.getOrPut(raw) {
            if (!Addresses.canReply(raw)) Addresses.key(raw)
            else lookupName(raw) ?: raw
        }

    private fun lookupName(number: String): String? {
        if (!Perms.canContacts(app) || !Addresses.canReply(number)) return null
        return try {
            val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
            app.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(0) else null
            }
        } catch (_: Exception) {
            null
        }
    }
}
