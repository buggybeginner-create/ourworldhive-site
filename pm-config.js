/* PM Tracker settings. Edit this file on GitHub.
   PM_VAPID: the Web Push key for phone alerts (Firebase console > Project settings > Cloud Messaging > Web Push certificates).
   PM_PAY: orderUrl is the address of your payments worker (see PAYMENTS-SETUP.md). The app shows the real prices from the worker.
   paypal: your PayPal.me link, shown to people outside India. upi: your UPI id, shown to people in India. Leave a value empty to hide it. */
window.PM_VAPID = "";
window.PM_PAY = { orderUrl: "", paypal: "", upi: "" };
