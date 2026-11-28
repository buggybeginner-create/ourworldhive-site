package com.smartsms.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.smartsms.app.data.db.ConversationEntity
import com.smartsms.app.domain.MessageCategory
import com.smartsms.app.ui.components.Avatar
import com.smartsms.app.ui.components.DemoBadge
import com.smartsms.app.ui.components.formatTime
import com.smartsms.app.ui.components.tint
import com.smartsms.app.ui.theme.LocalChatAppearance

/** OTP folder previews never show the code itself. */
fun previewText(c: ConversationEntity): String =
    if (c.category == MessageCategory.OTP.key) "One-time code · tap to view" else c.lastMessage

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ConversationRow(
    c: ConversationEntity,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null
) {
    val look = LocalChatAppearance.current
    val cat = MessageCategory.fromKey(c.category) ?: MessageCategory.PERSONAL
    val unread = c.unreadCount > 0
    Row(
        Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .combinedClickable(onClick = onClick, onLongClick = onLongClick)
            .padding(horizontal = 12.dp, vertical = if (look.compactList) 8.dp else 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (look.showAvatars) {
            Avatar(c.displayName, cat.tint(), size = if (look.compactList) 40.dp else 50.dp)
            Spacer(Modifier.width(14.dp))
        }
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    c.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (unread) FontWeight.Bold else FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (c.isPinned) {
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.PushPin, "Pinned", Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                }
                if (c.isDemo) {
                    Spacer(Modifier.width(6.dp))
                    DemoBadge()
                }
            }
            Spacer(Modifier.height(3.dp))
            Text(
                previewText(c),
                style = MaterialTheme.typography.bodyMedium,
                color = if (unread) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = if (look.compactList) 1 else 2,
                overflow = TextOverflow.Ellipsis
            )
        }
        Spacer(Modifier.width(10.dp))
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                formatTime(c.lastTimestamp),
                style = MaterialTheme.typography.labelSmall,
                color = if (unread) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (unread) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${c.unreadCount}", style = MaterialTheme.typography.labelSmall, color = Color.White)
                }
            }
        }
    }
}
