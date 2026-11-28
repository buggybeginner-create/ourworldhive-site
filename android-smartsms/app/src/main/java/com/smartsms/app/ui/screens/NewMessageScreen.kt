package com.smartsms.app.ui.screens

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Contacts
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartsms.app.domain.Addresses
import com.smartsms.app.sms.Perms
import com.smartsms.app.sms.SmsSender
import com.smartsms.app.ui.nav.Navigator
import com.smartsms.app.ui.vm.AppViewModelProvider
import com.smartsms.app.ui.vm.NewMessageViewModel
import kotlinx.coroutines.launch

/** Opens the phone's contact list and returns one phone number (no contacts permission needed). */
private object PickPhone : ActivityResultContract<Unit, Uri?>() {
    override fun createIntent(context: Context, input: Unit) =
        Intent(Intent.ACTION_PICK).setType(ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE)
    override fun parseResult(resultCode: Int, intent: Intent?): Uri? =
        if (resultCode == Activity.RESULT_OK) intent?.data else null
}

@Composable
fun NewMessageScreen(nav: Navigator, vm: NewMessageViewModel = viewModel(factory = AppViewModelProvider.Factory)) {
    val ctx = LocalContext.current
    var to by rememberSaveable { mutableStateOf("") }
    var name by rememberSaveable { mutableStateOf("") }
    var text by rememberSaveable { mutableStateOf("") }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun doSend() {
        vm.send(to, text).fold(
            { nav.back() },
            { e -> scope.launch { snack.showSnackbar("Not sent: ${e.message ?: "unknown reason"}") } }
        )
    }

    val pick = rememberLauncherForActivityResult(PickPhone) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        runCatching {
            ctx.contentResolver.query(
                uri,
                arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME),
                null, null, null
            )?.use { c -> if (c.moveToFirst()) { to = c.getString(0).orEmpty(); name = c.getString(1).orEmpty() } }
        }
    }
    val askSend = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        if (Perms.canSend(ctx)) doSend()
        else scope.launch { snack.showSnackbar("Allow Smart SMS to send SMS to use this") }
    }
    val valid = Addresses.canReply(to) && text.isNotBlank()

    ScreenScaffold(title = "New Message", onBack = nav::back, snackbarHost = snack) { pad ->
        Column(
            Modifier.padding(pad).padding(horizontal = 16.dp).imePadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = to,
                onValueChange = { to = it; name = "" },
                label = { Text(if (name.isNotEmpty()) "To · $name" else "To (phone number)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                trailingIcon = { IconButton(onClick = { pick.launch(Unit) }) { Icon(Icons.Rounded.Contacts, "Pick from contacts") } },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text("Message") },
                minLines = 4,
                supportingText = { if (text.isNotEmpty()) Text("${text.length} characters · ${SmsSender.parts(ctx, text)} SMS") },
                modifier = Modifier.fillMaxWidth()
            )
            Row {
                Spacer(Modifier.weight(1f))
                Button(
                    enabled = valid,
                    onClick = { if (Perms.canSend(ctx)) doSend() else askSend.launch(Perms.SEND_GROUP) }
                ) {
                    Icon(Icons.AutoMirrored.Rounded.Send, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Send")
                }
            }
            Text(
                "Sent from your default SIM for SMS. The message also appears in your phone's SMS app.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
