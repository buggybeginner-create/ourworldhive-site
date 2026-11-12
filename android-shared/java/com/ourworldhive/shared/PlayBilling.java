package com.ourworldhive.shared;

import android.app.Activity;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Play Billing for every Ourworldhive Android app (shared file, used by each app's build).
 * Product IDs follow one rule: tool_plan, for example diary_perm (one-time) or pm_m1 (subscription).
 * Prices are set in Play Console; the page only shows what Google returns.
 * The page talks to it through the app's JavaScript bridge; every answer goes back as one JSON text through Callback.
 * Copyright DUKEKRRISH. All rights reserved.
 */
public class PlayBilling implements PurchasesUpdatedListener {
    public interface Callback { void done(String json); }

    private final Activity act;
    private final BillingClient client;
    private final Map<String, ProductDetails> details = new HashMap<>();
    private Callback buyCb;

    public PlayBilling(Activity a) {
        act = a;
        client = BillingClient.newBuilder(a).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    private void ready(final Runnable r, final Callback cb) {
        if (client.isReady()) { r.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult br) {
                if (br.getResponseCode() == BillingClient.BillingResponseCode.OK) act.runOnUiThread(r);
                else cb.done(err("Google Play is not available (" + br.getDebugMessage() + ")"));
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    private static String err(String m) { try { return new JSONObject().put("ok", false).put("err", m).toString(); } catch (Exception e) { return "{\"ok\":false}"; } }
    private static String type(String t) { return "subs".equals(t) ? BillingClient.ProductType.SUBS : BillingClient.ProductType.INAPP; }

    /** list = [{id, type}] ; answers {ok, items:[{id, type, price, title}]} */
    public void products(final String list, final Callback cb) {
        ready(new Runnable() { public void run() {
            try {
                JSONArray a = new JSONArray(list);
                final List<QueryProductDetailsParams.Product> inapp = new ArrayList<>(), subs = new ArrayList<>();
                for (int i = 0; i < a.length(); i++) {
                    JSONObject o = a.getJSONObject(i);
                    QueryProductDetailsParams.Product p = QueryProductDetailsParams.Product.newBuilder().setProductId(o.getString("id")).setProductType(type(o.optString("type"))).build();
                    if ("subs".equals(o.optString("type"))) subs.add(p); else inapp.add(p);
                }
                final JSONArray out = new JSONArray();
                final int[] left = {(inapp.isEmpty() ? 0 : 1) + (subs.isEmpty() ? 0 : 1)};
                if (left[0] == 0) { cb.done("{\"ok\":true,\"items\":[]}"); return; }
                for (final List<QueryProductDetailsParams.Product> group : new List[]{inapp, subs}) {
                    if (group.isEmpty()) continue;
                    client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(group).build(), (br, res) -> {
                        synchronized (out) {
                            if (br.getResponseCode() == BillingClient.BillingResponseCode.OK && res != null) {
                                for (ProductDetails d : res.getProductDetailsList()) {
                                    details.put(d.getProductId(), d);
                                    try {
                                        String price = "";
                                        if (d.getOneTimePurchaseOfferDetails() != null) price = d.getOneTimePurchaseOfferDetails().getFormattedPrice();
                                        else if (d.getSubscriptionOfferDetails() != null && !d.getSubscriptionOfferDetails().isEmpty()) {
                                            List<ProductDetails.PricingPhase> ph = d.getSubscriptionOfferDetails().get(0).getPricingPhases().getPricingPhaseList();
                                            if (!ph.isEmpty()) price = ph.get(ph.size() - 1).getFormattedPrice();
                                        }
                                        out.put(new JSONObject().put("id", d.getProductId()).put("type", d.getProductType()).put("price", price).put("title", d.getName()));
                                    } catch (Exception ignored) { }
                                }
                            }
                            if (--left[0] == 0) { try { cb.done(new JSONObject().put("ok", true).put("items", out).toString()); } catch (Exception e) { cb.done(err("bad answer")); } }
                        }
                    });
                }
            } catch (Exception e) { cb.done(err("bad product list")); }
        } }, cb);
    }

    /** Opens Google Play's own payment sheet. account = the signed-in user id (or plant / project code) so the payment is tied to it. */
    public void buy(final String id, final String t, final String account, final Callback cb) {
        ready(new Runnable() { public void run() {
            ProductDetails d = details.get(id);
            if (d == null) {
                products("[{\"id\":\"" + id.replaceAll("[^A-Za-z0-9_.]", "") + "\",\"type\":\"" + ("subs".equals(t) ? "subs" : "inapp") + "\"}]", new Callback() { public void done(String j) {
                    if (details.get(id) == null) cb.done(err("This item is not on sale in Google Play yet (" + id + ")."));
                    else buy(id, t, account, cb);
                } });
                return;
            }
            BillingFlowParams.ProductDetailsParams.Builder pb = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d);
            if (d.getSubscriptionOfferDetails() != null && !d.getSubscriptionOfferDetails().isEmpty()) pb.setOfferToken(d.getSubscriptionOfferDetails().get(0).getOfferToken());
            BillingFlowParams.Builder fb = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(pb.build()));
            if (account != null && !account.isEmpty()) fb.setObfuscatedAccountId(account.length() > 64 ? account.substring(0, 64) : account);
            buyCb = cb;
            BillingResult br = client.launchBillingFlow(act, fb.build());
            if (br.getResponseCode() != BillingClient.BillingResponseCode.OK) { buyCb = null; cb.done(err("Could not open Google Play (" + br.getDebugMessage() + ")")); }
        } }, cb);
    }

    @Override public void onPurchasesUpdated(BillingResult br, List<Purchase> list) {
        Callback cb = buyCb; buyCb = null;
        if (cb == null) return;
        int code = br.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) { cb.done("{\"ok\":false,\"cancel\":true}"); return; }
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { cb.done("{\"ok\":false,\"owned\":true}"); return; }
        if (code != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) { cb.done(err("Payment did not finish (" + br.getDebugMessage() + ")")); return; }
        cb.done(json(list.get(0)).toString());
    }

    private static JSONObject json(Purchase p) {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", true).put("token", p.getPurchaseToken()).put("orderId", p.getOrderId() == null ? "" : p.getOrderId())
             .put("products", new JSONArray(p.getProducts())).put("pending", p.getPurchaseState() == Purchase.PurchaseState.PENDING).put("acked", p.isAcknowledged());
        } catch (Exception ignored) { }
        return o;
    }

    /** Everything this Google account owns in this app (to switch the full version back on after a reinstall). */
    public void owned(final Callback cb) {
        ready(new Runnable() { public void run() {
            final JSONArray out = new JSONArray();
            final String[] types = {BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS};
            final int[] left = {2};
            for (String tp : types) {
                client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(tp).build(), (br, list) -> {
                    synchronized (out) {
                        if (br.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null)
                            for (Purchase p : list) if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) out.put(json(p));
                        if (--left[0] == 0) { try { cb.done(new JSONObject().put("ok", true).put("items", out).toString()); } catch (Exception e) { cb.done(err("bad answer")); } }
                    }
                });
            }
        } }, cb);
    }

    /** Confirm a purchase to Google (the server also does this; doing it twice is harmless). */
    public void ack(final String token) {
        ready(new Runnable() { public void run() {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build(), br -> { });
        } }, new Callback() { public void done(String j) { } });
    }
}
