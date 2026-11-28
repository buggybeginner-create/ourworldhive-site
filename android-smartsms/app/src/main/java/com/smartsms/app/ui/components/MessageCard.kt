package com.smartsms.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.smartsms.app.data.local.entity.MessageEntity
import com.smartsms.app.domain.BubbleStyle
import com.smartsms.app.domain.DataSource
import com.smartsms.app.domain.MessageClassifier
import com.smartsms.app.ui.theme.LocalChatAppearance
import com.smartsms.app.ui.util.Format

/** Bubble shape for the user's chat appearance preference. */
fun bubbleShape(style: BubbleStyle, incoming: Boolean = true): Shape = when (style) {
    BubbleStyle.ROUNDED -> if (incoming) RoundedCornerShape(4.dp, 20.dp, 20.dp, 20.dp) else RoundedCornerShape(20.dp, 4.dp, 20.dp, 20.dp)
    BubbleStyle.SOFT -> RoundedCornerShape(10.dp)
    BubbleStyle.MINIMAL -> RoundedCornerShape(2.dp)
}

@Composable
fun MessageCard(message: MessageEntity, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val appearance = LocalChatAppearance.current
    val style = message.category.style()
    val vertical = if (appearance.compactMode) 10.dp else 14.dp
    Card(
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = vertical), verticalAlignment = Alignment.Top) {
            if (appearance.showAvatars) {
                SenderAvatar(message.senderName, style.color, size = if (appearance.compactMode) 36 else 44)
                Spacer(Modifier.width(12.dp))
            }
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        message.senderName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = if (message.isRead) FontWeight.Medium else FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (message.source == DataSource.DEMO) {
                        Spacer(Modifier.width(6.dp))
                        DemoBadge()
                    }
                    Spacer(Modifier.weight(1f))
                    Text(
                        Format.shortTime(message.timestamp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (message.isRead) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    message.body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = if (appearance.compactMode) 1 else 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!appearance.compactMode) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CategoryPill(message)
                        MessageClassifier.extractOtp(message.body)?.let { code ->
                            Spacer(Modifier.width(8.dp))
                            OtpPill(code)
                        }
                        Spacer(Modifier.weight(1f))
                        if (!message.isRead) {
                            Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.primary, CircleShape))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryPill(message: MessageEntity) {
    val style = message.category.style()
    Row(
        modifier = Modifier
            .background(style.color.copy(alpha = 0.14f), RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(style.icon, contentDescription = null, tint = style.color, modifier = Modifier.size(12.dp))
        Text(message.category.label, style = MaterialTheme.typography.labelSmall, color = style.color)
    }
}

@Composable
private fun OtpPill(code: String) {
    val clipboard = LocalClipboardManager.current
    Row(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f), RoundedCornerShape(50))
            .clickable { clipboard.setText(AnnotatedString(code)) }
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(code, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        Icon(Icons.Rounded.ContentCopy, contentDescription = "Copy code", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(12.dp))
    }
}

/** Full message view with star toggle. Opening it marks the message as read. */
@Composable
fun MessageDetailDialog(message: MessageEntity, onDismiss: () -> Unit, onToggleStar: () -> Unit) {
    val appearance = LocalChatAppearance.current
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
        dismissButton = {
            TextButton(onClick = onToggleStar) {
                Icon(if (message.isStarred) Icons.Rounded.Star else Icons.Rounded.StarBorder, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(if (message.isStarred) "Starred" else "Star")
            }
        },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(message.senderName, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                if (message.source == DataSource.DEMO) {
                    Spacer(Modifier.width(8.dp))
                    DemoBadge()
                }
            }
        },
        text = {
            Column {
                Text(
                    "${message.address} · ${Format.dateTime(message.timestamp)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(14.dp))
                Surface(
                    shape = bubbleShape(appearance.bubbleStyle, incoming = message.isIncoming),
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                ) {
                    Text(message.body, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.padding(14.dp))
                }
                if (message.source == DataSource.DEMO) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "This is a sample demo message created by Smart SMS. It is not a real SMS.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
    )
}
