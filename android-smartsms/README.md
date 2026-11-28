# Smart SMS (Android app, Phase 1)

Kotlin · Jetpack Compose · Material 3 · MVVM · Room · Coroutines · Navigation Compose · Gradle Kotlin DSL

- App name: **Smart SMS**, package `com.smartsms.app`
- Minimum Android 8.0 (API 26), compile/target SDK 35
- Gradle 8.11.1 (wrapper included), Android Gradle Plugin 8.7.3, Kotlin 2.0.21, KSP 2.0.21-1.0.28
- Compose BOM 2024.12.01, Navigation 2.8.5, Lifecycle 2.8.7, Room 2.6.1, core-splashscreen 1.0.1
- Cloud build: `.github/workflows/android-build.yml` (at the repository root)

## What works in Phase 1

| Screen | What you can do |
|---|---|
| Splash | Animated Smart SMS branding while the local database is prepared; shows an error with Try again if it fails |
| Inbox dashboard | Greeting header with unread/message/OTP counts, search, category chips, category tiles, 30-day spend and next scheduled message, recent conversations |
| All messages, Personal, Transactions, Offers, OTP | Search inside the category, All / Unread / Starred filters, tap to open (marks read), star, one-tap copy of OTP codes |
| Scheduled messages | Add an entry with name, number, message, date and time; cancel, restore, delete |
| Finance dashboard | Spending and income for the last 30 days, 7-day bar chart, budget progress, recent transactions |
| Backup & Sync | Local JSON backup into the app's private storage, backup history, delete a backup |
| Theme customisation | System / Light / Premium dark / AMOLED black, six accent palettes, font size, chat bubble style, live preview |
| Settings | Shortcuts to theme and backup, show avatars, compact list, show / reset / delete demo data, version |

**Not in Phase 1** (and the app says so): reading or sending real SMS (no SMS permission is requested), automatic sending of scheduled messages, cloud sync.

## Demo data

On first launch the app inserts sample messages, conversations, contacts, transactions, budgets and schedules.
Every such row is stored with `source = DEMO`, every sender name ends in "(Demo)", each item shows an amber **DEMO** badge,
and lists show a banner saying they are not real SMS. Settings → Demo data can hide, reset or delete them. Real data will use `source = DEVICE`.

## Room database

Entities (`data/local/entity`): messages, conversations, contacts, message categories, scheduled messages, transactions,
budget categories, backup history, user settings (single row), themes. Each has a DAO in `data/local/dao`.
`DatabaseInitializer` creates default settings, themes and categories on every launch; `DemoDataSeeder` adds the sample data once.

## Build in the cloud (from your phone)

1. Open the repository on github.com in your phone's browser (desktop site works best: browser menu → *Desktop site*).
2. Tap **Actions** → **Smart SMS Android build** → **Run workflow** → **Run workflow**. It also runs on its own when files in `android-smartsms/` change on `main`.
3. Wait for the green tick (about 5–8 minutes).
4. Download the APK:
   - Easiest: **Releases** (on the repository's main page) → **Smart SMS test APK (latest)** → tap `Smart-SMS-debug.apk`.
   - Or: open the finished run → scroll to **Artifacts** → `Smart-SMS-debug-apk` (this downloads a .zip; open it and tap the APK inside).
5. Install: tap the downloaded APK. If Android asks, allow your browser or file manager to *Install unknown apps*, then tap **Install**.
   New builds install over the old one and keep your settings, because every build is signed with the same key (`debug.keystore`).

## Build on a computer (optional)

Open the `android-smartsms` folder in Android Studio (Ladybug or newer), or run `./gradlew assembleDebug` with JDK 17.
Unit tests: `./gradlew testDebugUnitTest`.

## Files
- `.github/workflows/android-build.yml`
- `android-smartsms/.gitignore`
- `android-smartsms/app/build.gradle.kts`
- `android-smartsms/app/proguard-rules.pro`
- `android-smartsms/app/src/main/AndroidManifest.xml`
- `android-smartsms/app/src/main/java/com/smartsms/app/AppContainer.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/MainActivity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/SmartSmsApp.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/DatabaseInitializer.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/DemoDataSeeder.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/SmartSmsDatabase.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/BackupHistoryDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/BudgetCategoryDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/ContactDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/ConversationDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/MessageCategoryDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/MessageDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/ScheduledMessageDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/ThemeDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/TransactionDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/dao/UserSettingsDao.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/BackupHistoryEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/BudgetCategoryEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/ContactEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/ConversationEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/MessageCategoryEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/MessageEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/ScheduledMessageEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/ThemeEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/TransactionEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/local/entity/UserSettingsEntity.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/repository/BackupRepository.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/repository/FinanceRepository.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/repository/MessageRepository.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/repository/ScheduledMessageRepository.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/data/repository/SettingsRepository.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/domain/MessageClassifier.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/domain/Models.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/AppViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/components/CategoryStyle.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/components/Common.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/components/MessageCard.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/components/StateViews.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/navigation/Routes.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/navigation/SmartSmsNavHost.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/backup/BackupScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/backup/BackupViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/finance/FinanceScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/finance/FinanceViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/inbox/InboxScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/inbox/InboxViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/messages/MessageListScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/messages/MessageListViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/scheduled/ScheduledScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/scheduled/ScheduledViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/settings/SettingsScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/settings/SettingsViewModel.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/splash/SplashScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/screens/theme/ThemeScreen.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/theme/Color.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/theme/Theme.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/theme/Type.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/util/Format.kt`
- `android-smartsms/app/src/main/java/com/smartsms/app/ui/util/UiState.kt`
- `android-smartsms/app/src/main/res/drawable/ic_launcher_background.xml`
- `android-smartsms/app/src/main/res/drawable/ic_launcher_foreground.xml`
- `android-smartsms/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- `android-smartsms/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- `android-smartsms/app/src/main/res/values/colors.xml`
- `android-smartsms/app/src/main/res/values/strings.xml`
- `android-smartsms/app/src/main/res/values/themes.xml`
- `android-smartsms/app/src/test/java/com/smartsms/app/FinanceSummaryTest.kt`
- `android-smartsms/app/src/test/java/com/smartsms/app/MessageClassifierTest.kt`
- `android-smartsms/build.gradle.kts`
- `android-smartsms/debug.keystore`
- `android-smartsms/gradle.properties`
- `android-smartsms/gradle/libs.versions.toml`
- `android-smartsms/gradle/wrapper/gradle-wrapper.jar`
- `android-smartsms/gradle/wrapper/gradle-wrapper.properties`
- `android-smartsms/gradlew`
- `android-smartsms/gradlew.bat`
- `android-smartsms/settings.gradle.kts`
- `android-smartsms/README.md`
