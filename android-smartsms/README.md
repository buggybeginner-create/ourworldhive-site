# Smart SMS

A premium SMS organiser for Android (Kotlin · Jetpack Compose · Material 3 · MVVM · Room · Coroutines · Navigation Compose).

**Phase 1** is the app shell: every screen, the local database and the cloud build.
It asks for **no SMS, contacts or internet permission**. All messages you see are
sample rows marked **DEMO** — they are not real SMS. Reading real SMS comes in a later phase.

## Screens

| Screen | What works in Phase 1 |
|---|---|
| Splash | Animated brand screen, waits until the database is ready, retry on error |
| Inbox dashboard | Greeting, search, 30-day spend card, folder cards with counts, quick actions, pinned + recent chats |
| All Messages | Every conversation, folder chips, long-press to pin |
| Personal / Transactions / Offers | Folder views from the on-device categoriser |
| OTP | Codes hidden until you tap; never copied, auto-filled or forwarded |
| Conversation | Chat bubbles in your chosen style, long-press to star |
| Search | Live search over sender and text, matches highlighted |
| Scheduled | Add (date + time pickers), cancel, delete. Saved only — sending is a later phase |
| Finance | Spent / received / net, budget bars with editable limits, recent transactions |
| Backup & Sync | Back up to a JSON file you choose, restore with confirmation, history. Cloud sync is a later phase |
| Themes | Premium Dark, Light, AMOLED Black, System; 6 accent colours; wallpaper colours on Android 12+ |
| Settings | Text size, bubble style and corners, timestamps, avatars, compact lists, sample-data controls |

## Project layout

```
app/src/main/java/com/smartsms/app/
  SmartSmsApp.kt          Application + manual dependency container, first-start seeding
  MainActivity.kt         Splash API, edge-to-edge, theme from saved settings
  data/db/                Room entities, DAOs, AppDatabase, DemoSeeder (all demo rows isDemo = true)
  data/repo/              Repositories (messages, settings, schedule, finance, backup, demo)
  domain/                 Categorizer, TransactionParser, enums
  ui/theme/               Colour schemes (dark / light / AMOLED), typography, shapes, chat appearance
  ui/components/          Loading / error / empty states, avatar, demo badge, formatting
  ui/nav/                 Routes, bottom bar, NavHost
  ui/vm/                  ViewModels + factory
  ui/screens/             The 12 screens (+ conversation and search)
app/src/test/             Unit tests for the categoriser and transaction parser
../.github/workflows/smartsms-apk.yml   Cloud build: tests, APK, emulator smoke test
```

## Build in the cloud (no PC needed)

This project lives in the `android-smartsms/` folder of the ourworldhive-site repository, next to the other Hive apps.

1. Open the repository on GitHub → **Actions** → **Smart SMS APK** → **Run workflow** (it also runs by itself when anything in `android-smartsms/` changes).
2. Wait for the green tick (about 5–8 minutes).
3. Download the APK from **Releases** → *Smart SMS APK (latest)* → `Smart-SMS.apk`, or from the run's **Artifacts**.
4. Open the APK on your phone and allow "Install unknown apps" when Android asks.
