/* Din Darpan service worker: lets the app install and open without internet. Always tries the newest version first. */
var C='din-darpan-app-v2',F=['din-darpan.html','din-darpan-hi.js','din-darpan-icon-192.png','din-darpan-manifest.webmanifest'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}).catch(function(){}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return /^din-darpan-app-/.test(x)&&x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);if(u.origin!==location.origin)return;
 e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)}).catch(function(){})}return res}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match('din-darpan.html',{ignoreSearch:true})})}))});
