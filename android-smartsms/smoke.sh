#!/usr/bin/env bash
# CI emulator check: installs the APK, gives it SMS access, sends it a real (emulated) SMS,
# checks the SMS shows up, sends a reply, checks Android saved the reply, then visits the
# main screens and saves screenshots. Fails on a crash or if any SMS check fails.
set -u
mkdir -p shots
PKG=com.smartsms.app
fail=0
adb root >/dev/null 2>&1; sleep 3; adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
sleep 25   # let the launcher settle so it does not show "isn't responding" over our app
adb install -r Smart-SMS.apk
for p in READ_SMS RECEIVE_SMS SEND_SMS READ_CONTACTS POST_NOTIFICATIONS; do adb shell pm grant $PKG android.permission.$p; done
adb emu sms send 9876543210 "Hello from the smoke test, dinner at 8?"
adb emu sms send 5551234 "Rs.500.00 debited from A/c XX1234 at TESTSHOP on UPI"
adb emu sms send 5559999 "Congratulations! You have won Rs.25,00,000 in our lucky draw. Claim your prize now"
sleep 4
adb logcat -c
adb shell am start -W -n $PKG/.MainActivity
sleep 10

shot() { adb exec-out screencap -p > "shots/$1.png"; echo "saved $1"; }
dump() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
  # A system "isn't responding" dialog (from another app) can cover the screen: press Wait.
  if grep -q "isn't responding" ui.xml; then
    local w; w=$(grep -o 'text="Wait"[^>]*bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' ui.xml | head -1 | grep -o '\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]')
    [ -n "$w" ] && tap_bounds "$w"
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
  fi
}
tap_bounds() {
  local x1 y1 x2 y2
  read -r x1 y1 x2 y2 <<<"$(echo "$1" | sed -E 's/\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]/\1 \2 \3 \4/')"
  adb shell input tap $(( (x1 + x2) / 2 )) $(( (y1 + y2) / 2 )); sleep 2
}
find_attr() { grep -o "$1=\"$2\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" ui.xml | head -1 | grep -o '\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]'; }
tap_text() {
  dump; local b; b=$(find_attr text "$1"); [ -z "$b" ] && b=$(find_attr content-desc "$1")
  if [ -z "$b" ]; then echo "not found: $1"; return 1; fi
  tap_bounds "$b"
}

shot 01-inbox-real-sms
echo "--- phone SMS store:"; adb shell content query --uri content://sms --projection _id,address,type,body 2>&1 | head -10
echo "--- default SMS app:"; adb shell settings get secure sms_default_application
echo "--- app log:"; adb logcat -d | grep -i -E "smartsms|SQLite|Room|SecurityException" | tail -20
tap_text "Messages"
dump
echo "--- texts on screen:"; grep -o 'text="[^"]\{3,80\}"' ui.xml | head -40
if grep -q "dinner at 8" ui.xml; then echo "CHECK OK: received SMS is shown"; else echo "CHECK FAILED: received SMS not shown"; fail=1; fi

shot 01b-messages-real
tap_text "Hello from the smoke test, dinner at 8?" && shot 02-conversation
dump
eb=$(grep -o 'class="android.widget.EditText"[^>]*bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' ui.xml | head -1 | grep -o '\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]')
if [ -n "$eb" ]; then
  tap_bounds "$eb"
  adb shell input text "Reply_from_smoke_test"
  sleep 1
  tap_text "Send"
  sleep 6
  shot 03-after-reply
  if adb shell content query --uri content://sms/sent --projection body 2>/dev/null | grep -q "Reply_from_smoke_test"; then
    echo "CHECK OK: reply was sent and saved by Android"
  else
    echo "CHECK FAILED: reply not found in sent SMS"; fail=1
  fi
  dump
  if grep -q "Reply_from_smoke_test" ui.xml; then echo "CHECK OK: reply shows in the chat"; else echo "CHECK FAILED: reply not shown in chat"; fail=1; fi
  # The friend answers while the chat is open: it must appear by itself.
  adb emu sms send 9876543210 "Friend answers while the chat is open"
  sleep 8
  dump
  shot 03b-friend-answer
  if grep -q "Friend answers while the chat is open" ui.xml; then echo "CHECK OK: new SMS appears in the open chat"; else echo "CHECK FAILED: new SMS did not appear in the open chat"; fail=1; fi
else
  echo "CHECK FAILED: no reply box"; fail=1
fi
adb shell input keyevent 4; sleep 1
adb shell input keyevent 4; sleep 1
adb shell am start -W -n $PKG/.MainActivity >/dev/null; sleep 2

tap_text "Messages" && shot 04-all-messages
tap_text "New Message" && shot 04b-new-message && adb shell input keyevent 4 && sleep 1
tap_text "Transactions" && shot 05-transactions
# the folder chips scroll sideways: swipe them left so "Spam" is visible
dump; cb=$(find_attr text "Transactions")
if [ -n "$cb" ]; then read -r x1 y1 x2 y2 <<<"$(echo "$cb" | sed -E 's/\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]/\1 \2 \3 \4/')"; cy=$(( (y1 + y2) / 2 )); adb shell input swipe 1000 $cy 100 $cy 300; sleep 1; fi
tap_text "Spam" && shot 05b-spam
dump
if grep -q "lucky draw" ui.xml; then echo "CHECK OK: scam SMS is in Spam"; else echo "CHECK FAILED: scam SMS not in Spam"; fail=1; fi
tap_text "All"
dump
if grep -q "lucky draw" ui.xml; then echo "CHECK FAILED: scam SMS also shows in All"; fail=1; else echo "CHECK OK: scam SMS kept out of All"; fi
tap_text "Finance" && shot 06-finance
tap_text "Settings" && shot 07-settings
tap_text "Theme &amp; Colours" && shot 08-themes
adb shell input keyevent 4; sleep 1
adb shell input swipe 540 1700 540 700 300; sleep 1
tap_text "Scheduled Messages" && shot 09-scheduled
adb shell input keyevent 4; sleep 1
tap_text "Inbox"
adb shell input swipe 540 1700 540 900 300; sleep 1
tap_text "Bills" && shot 11-bills && adb shell input keyevent 4 && sleep 1
tap_text "Search messages, people, amounts…" && adb shell input text "TESTSHOP" && sleep 2 && shot 10-search

adb logcat -d > shots/logcat.txt
if grep -q "FATAL EXCEPTION" shots/logcat.txt; then
  echo "APP CRASHED"; grep -A 30 "FATAL EXCEPTION" shots/logcat.txt; fail=1
else
  echo "No crash"
fi
exit $fail
