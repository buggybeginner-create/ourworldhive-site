/* MapMark service worker: installs the app and opens it without internet. Always tries the newest version first.
   Leaflet files from unpkg are kept too, so the map tools still open offline (map pictures need internet). */
var C='mapmark-app-v1',F=['mapmark.html','mapmark-icon-192.png','mapmark-manifest.webmanifest','owh-pwa.js','firebase-config.js','owh-pricing.js','owh-contact.js'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}).catch(function(){}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return /^mapmark-app-/.test(x)&&x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);
 var lib=u.hostname==='unpkg.com'&&/leaflet/.test(u.pathname);
 if(u.origin!==location.origin&&!lib)return;
 e.respondWith(fetch(r).then(function(res){if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)}).catch(function(){})}return res}).catch(function(){return caches.match(r,{ignoreSearch:!lib}).then(function(m){return m||(lib?Response.error():caches.match('mapmark.html',{ignoreSearch:true}))})}))});
