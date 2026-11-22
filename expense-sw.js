/* Expense Tracker service worker: opens at once from the saved copy (also without internet) and quietly gets the newest
   version for next time; the page shows "Update Available" when there is one. Firebase files are kept too. */
var C='expense-app-v5',F=['expense-tracker.html','expense-icon-192.png','expense-manifest.webmanifest','firebase-config.js'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}).catch(function(){}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return /^expense-app-/.test(x)&&x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET'||r.cache==='no-store')return;var u=new URL(r.url),same=u.origin===location.origin,fb=u.hostname==='www.gstatic.com'&&/\/firebasejs\//.test(u.pathname);
 if(!same&&!fb)return;if(same&&!/\/(expense-tracker\.html|expense-icon-\d+\.png|expense-icon-maskable-512\.png|expense-manifest\.webmanifest|firebase-config\.js)$/.test(u.pathname)&&u.pathname!=='/'&&!/\/$/.test(u.pathname))return;
 var keep=function(res){if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)}).catch(function(){})}return res};
 /* Firebase files have a fixed version in their address: keep them, never ask again */
 if(fb){e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(keep)}));return}
 /* app files: saved copy at once, newest copy fetched in the background */
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(m){var net=fetch(r,{cache:'no-cache'}).then(keep).catch(function(){return null});if(m){e.waitUntil(net);return m}return net.then(function(res){return res||caches.match('expense-tracker.html',{ignoreSearch:true})})}))});
