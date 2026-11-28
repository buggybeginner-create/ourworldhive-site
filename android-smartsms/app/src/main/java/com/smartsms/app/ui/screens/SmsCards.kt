package com.smartsms.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Sms
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.smartsms.app.sms.Perms
import com.smartsms.app.sms.SmsSyncState
import com.smartsms.app.ui.components.rememberCheck

/**
 * Inbox card: asks for SMS access, then shows the first read. Hidden once access is given
 * and the first read is finished.
 */
@Composable
fun SmsAccessCard(sms: SmsSyncState, onGranted: () -> Unit) {
    val ctx = LocalContext.current
    var canRead by rememberCheck { Perms.canRead(ctx) }
    var denied by rememberSaveable { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        canRead = Perms.canRead(ctx)
        if (canRead) onGranted() else denied = true
    }

    if (canRead && sms !is SmsSyncState.Reading) return

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        shape = MaterialTheme.shapes.large,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Sms, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(10.dp))
                Text(
                    if (sms is SmsSyncState.Reading) "Reading Your SMS…" else "Show Your Real SMS",
                    style = MaterialTheme.typography.titleMedium
                )
            }
            Spacer(Modifier.height(8.dp))
            if (sms is SmsSyncState.Reading) {
                LinearProgressIndicator(Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Text("${sms.count} messages so far. You can keep using the app.", style = MaterialTheme.typography.bodySmall)
                return@Column
            }
            Text(
                "Allow Smart SMS to read your messages. They are sorted on this phone and never uploaded. " +
                    "Contacts is optional and only shows names instead of numbers.",
                style = MaterialTheme.typography.bodySmall
            )
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Lock, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(6.dp))
                Text("One-time codes stay hidden and are never copied.", style = MaterialTheme.typography.labelSmall)
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { launcher.launch(Perms.READ_GROUP) }) { Text(if (denied) "Try Again" else "Allow SMS Access") }
                if (denied) {
                    OutlinedButton(onClick = { ctx.startActivity(Perms.appSettings(ctx)) }) { Text("Open App Settings") }
                }
            }
            if (denied) {
                Text(
                    "If Android no longer asks, open App Settings → Permissions → SMS → Allow.",
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}
