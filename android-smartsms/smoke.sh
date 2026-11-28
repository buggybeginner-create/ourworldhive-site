#!/usr/bin/env bash
# Installs the debug APK on the CI emulator, opens every main screen and saves screenshots.
# Fails if the app crashes.
set -u
mkdir -p shots
adb install -r Smart-SMS.apk
adb logcat -c
adb shell am start -W -n com.smartsms.app/.MainActivity
sleep 6

shot() { adb exec-out screencap -p > "shots/$1.png"; echo "saved $1"; }
tap_text() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
  local b
  b=$(grep -o "text=\"$1\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" ui.xml | head -1 | grep -o '\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]')
  if [ -z "$b" ]; then
    b=$(grep -o "content-desc=\"$1\"[^>]*bounds=\"\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]\"" ui.xml | head -1 | grep -o '\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]')
  fi
  if [ -z "$b" ]; then echo "not found: $1"; return 1; fi
  local n; n=($(echo "$b" | tr -d '[]' | tr ',' ' '))
  # bounds look like [x1,y1][x2,y2] -> after tr: "x1 y1x2 y2" ; parse with sed instead
  local x1 y1 x2 y2
  read -r x1 y1 x2 y2 <<<"$(echo "$b" | sed -E 's/\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]/\1 \2 \3 \4/')"
  adb shell input tap $(( (x1 + x2) / 2 )) $(( (y1 + y2) / 2 ))
  sleep 2
}

shot 01-inbox
adb shell input swipe 540 1800 540 600 400; sleep 1; shot 02-inbox-scrolled
adb shell input swipe 540 600 540 1800 400; sleep 1
tap_text "Messages" && shot 03-all-messages
tap_text "Transactions" && shot 04-transactions-chip
tap_text "OTP" && shot 05-otp
tap_text "Personal" && sleep 1 && adb shell input tap 540 700 && sleep 2 && shot 06-conversation && adb shell input keyevent 4 && sleep 1
tap_text "Finance" && shot 07-finance
tap_text "Settings" && shot 08-settings
tap_text "Theme &amp; Colours" && shot 09-themes
tap_text "AMOLED Black" && shot 10-amoled
tap_text "Light" && shot 11-light
tap_text "Premium Dark"
adb shell input keyevent 4; sleep 1
adb shell input swipe 540 1800 540 600 400; sleep 1
tap_text "Backup &amp; Sync" && shot 12-backup
adb shell input keyevent 4; sleep 1
tap_text "Scheduled Messages" && shot 13-scheduled
tap_text "Schedule" && shot 14-schedule-dialog && adb shell input keyevent 4 && sleep 1
adb shell input keyevent 4; sleep 1
tap_text "Inbox"
tap_text "Search messages, people, amounts…" && adb shell input text "dinner" && sleep 2 && shot 15-search

adb logcat -d > shots/logcat.txt
if grep -q "FATAL EXCEPTION" shots/logcat.txt; then
  echo "APP CRASHED"; grep -A 30 "FATAL EXCEPTION" shots/logcat.txt; exit 1
fi
echo "No crash"
