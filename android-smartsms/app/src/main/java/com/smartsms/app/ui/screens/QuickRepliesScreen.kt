package com.smartsms.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.smartsms.app.sms.Prefs
import com.smartsms.app.ui.nav.Navigator

/** Ready-made replies shown above the reply box: tap one to put it in the box. */
@Composable
fun QuickRepliesScreen(nav: Navigator) {
    val ctx = LocalContext.current
    var list by remember { mutableStateOf(Prefs.quickReplies(ctx)) }
    var add by remember { mutableStateOf("") }
    fun save(l: List<String>) { list = l; Prefs.setQuickReplies(ctx, l) }

    ScreenScaffold(title = "Quick Replies", onBack = nav::back) { pad ->
        LazyColumn(
            modifier = Modifier.padding(pad),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Text(
                    "These appear above the reply box in every chat. Tap one to put it in the box, then send.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = add, onValueChange = { add = it.take(160) }, singleLine = true,
                        label = { Text("New quick reply") }, modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    FilledIconButton(enabled = add.isNotBlank() && list.size < 20, onClick = {
                        save(list + add.trim()); add = ""
                    }) { Icon(Icons.Rounded.Add, "Add") }
                }
            }
            itemsIndexed(list, key = { i, t -> "$i$t" }) { i, t ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer)) {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(t, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                        IconButton(onClick = { save(list.filterIndexed { j, _ -> j != i }) }) { Icon(Icons.Rounded.DeleteOutline, "Delete") }
                    }
                }
            }
        }
    }
}
