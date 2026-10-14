/* Parcel Ledger service worker: opens offline. The page is fetched from the network first so updates always arrive. */
var C='parcel-v1',F=['parcel-ledger.html','parcel-icon-192.png','parcel-manifest.webmanifest'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);if(u.origin!==location.origin&&u.hostname.indexOf('fonts.g')<0)return;
 e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)}).catch(function(){});return res}).catch(function(){return caches.match(r).then(function(m){return m||caches.match('parcel-ledger.html')})}))});
