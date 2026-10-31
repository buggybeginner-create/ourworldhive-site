/* ZeroHarm service worker: keeps the app files on the phone so the app opens fast and works offline. */
var C='safety-app-v5';
self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return /^safety-app-/.test(n)&&n!==C}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url),same=u.origin===self.location.origin,ext=u.hostname==='www.gstatic.com';
 if(!same&&!ext)return;if(same&&!/\/(safety\.html|firebase-config\.js|zeroharm-export\.js|safety-manifest\.webmanifest|safety-icon-\d+\.png)$/.test(u.pathname))return;
 var keep=function(res){if(res&&(res.ok||res.type==='opaque')){var c=res.clone();caches.open(C).then(function(x){x.put(r,c)}).catch(function(){})}return res};
 e.respondWith(caches.open(C).then(function(c){return c.match(r,{ignoreSearch:true})}).then(function(m){var net=fetch(r,{cache:'no-cache'}).then(keep).catch(function(){return null});if(m){if(same)e.waitUntil(net);return m}return net.then(function(x){return x||Response.error()})}))});
