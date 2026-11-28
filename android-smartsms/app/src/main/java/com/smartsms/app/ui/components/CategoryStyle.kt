package com.smartsms.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.AllInbox
import androidx.compose.material.icons.rounded.LocalOffer
import androidx.compose.material.icons.rounded.Password
import androidx.compose.material.icons.rounded.Person
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.smartsms.app.domain.MessageCategory

data class CategoryStyle(val icon: ImageVector, val color: Color)

fun MessageCategory.style(): CategoryStyle = when (this) {
    MessageCategory.ALL -> CategoryStyle(Icons.Rounded.AllInbox, Color(0xFF8B8FB0))
    MessageCategory.PERSONAL -> CategoryStyle(Icons.Rounded.Person, Color(0xFF7C6CF2))
    MessageCategory.TRANSACTIONS -> CategoryStyle(Icons.AutoMirrored.Rounded.ReceiptLong, Color(0xFF10B981))
    MessageCategory.OFFERS -> CategoryStyle(Icons.Rounded.LocalOffer, Color(0xFFF59E0B))
    MessageCategory.OTP -> CategoryStyle(Icons.Rounded.Password, Color(0xFF3B82F6))
}
