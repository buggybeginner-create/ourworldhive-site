# Payments on Ourworldhive (Razorpay + owh-pay Worker)

One Worker (`owh-pay`, file `worker/razorpay-pay-worker.js`) serves every app. One Razorpay account, one webhook.
Flow: app button -> `OWH_PRICE.rzpPay({...})` (in `owh-pricing.js`) -> Worker `/order` (price decided by the Worker) -> Razorpay checkout ->
Razorpay webhook `/webhook` (payment.captured) -> Worker switches the plan on in Firestore. Each payment is counted once (`pay_log/{paymentId}`).

## Apps already connected
| tool | where the plan lives | what a payment does |
|---|---|---|
| calc | cp_users/{uid} | plan = paid |
| mm | mm_users/{uid} | MapMark: adds 30/90/365 days |
| diary | diary_users/{uid} | plan = paid |
| pm | pm_plants/{code} | adds 1/3/12 months (or permanent) |
| pp | pp_projects/{id} | adds 30/90/365 days (or permanent) |
| ep | ep_plants/{code} | adds 30/90/360 days |
| sf | sf_companies/{code} | plan = paid (one-time INR 199). Worker ready, app button NOT added yet: decide what the paid version unlocks first |

## Add payment to a NEW app (3 small steps)
1. Worker: add one line to `APPS` (kind `user`, `plant` or `project`, the Firestore collection, a label, `once:true` for one-time apps; `days:{m1:30,...}` for plant kinds that count in days)
   and one line to `DEF_INR` with the INR price in rupees. Redeploy the Worker (paste the file in Cloudflare, Deploy). Variables stay as they are.
2. App: load `owh-pricing.js`, add a button that calls
   `OWH_PRICE.rzpPay({tool:'<name>', plan:'m1'|'m3'|'m12'|'perm', plant:<code> or pid:<id> or idToken:<firebase id token>, email})`.
   It returns a promise: true = paid, false = closed the window. Then tell the person the plan updates in about a minute.
3. If the owner should be able to change the price or run discounts: add the tool to `TOOLS`/`DEF` in `owh-pricing.js` (the Worker reads `pp_config/pricing`).

Rules: online payment is INR only. The Worker refuses a suspended plant. No Firestore rule change is needed (the Worker uses the service account).
Test in Razorpay Test mode first. Secrets (Razorpay key secret, webhook secret, service-account key) live only in Cloudflare Variables.
