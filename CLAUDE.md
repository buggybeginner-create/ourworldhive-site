# Notes for working on ourworldhive.com

- **My Diary (diary-app.html):** change `const APP_VER = '…'` on EVERY edit of the file (e.g. `2026-11-14.6`).
  Open apps (web and the Play Store app, which loads this page) compare it with the live file and show an
  "Update Available" pill. Without a new value, users are never told about the update.
- Android wrappers (android-*/) need a new .aab upload to Play only when Java, manifest, icons or other
  native files change. Changes to the web page reach the apps without an upload.
- **Nifty Pulse (nifty-pulse.html):** change `var APP_VER = '…'` on EVERY edit (e.g. `2026-11-17.2`), same
  "Update Available" pill as My Diary. Its Cloudflare worker code lives in cloudflare/nifty-pulse-worker.js and is
  pasted into Cloudflare by hand (worker `nifty-pulse` on er-krushnananda.workers.dev); changes there need a re-paste.
