/* E-Permit service worker: keeps the app files on the phone so the app opens fast and works offline. */
var C='permit-app-v6';
self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return /^permit-app-/.test(n)&&n!==C}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url),same=u.origin===self.location.origin,ext=u.hostname==='www.gstatic.com';
 if(!same&&!ext)return;if(same&&!/\/(permit\.html|firebase-config\.js|permit-manifest\.webmanifest|permit-icon-\d+\.png)$/.test(u.pathname))return;
 var keep=function(res){if(res&&(res.ok||res.type==='opaque')){var c=res.clone();caches.open(C).then(function(x){x.put(r,c)}).catch(function(){})}return res};
 e.respondWith(caches.open(C).then(function(c){return c.match(r,{ignoreSearch:true})}).then(function(m){var net=fetch(r,{cache:'no-cache'}).then(keep).catch(function(){return null});if(m){if(same)e.waitUntil(net);return m}return net.then(function(x){return x||Response.error()})}))});

/* Push alerts: a short message sent from the E-Permit push worker. Shown only when the app is not on screen. */
self.addEventListener('push',function(e){var d={};try{d=e.data?e.data.json():{}}catch(x){}d=d.data||d;var t=d.title||'E-Permit',b=d.body||'';
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(L){if(L.some(function(c){return c.visibilityState==='visible'}))return;return self.registration.showNotification(t,{body:b,tag:'ep-'+(d.pid||'x'),icon:'permit-icon-192.png',badge:'permit-icon-192.png',data:{url:d.url||'./permit.html'}})}))});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(L){for(var i=0;i<L.length;i++){if(/permit\.html/.test(L[i].url)&&'focus' in L[i])return L[i].focus()}return self.clients.openWindow('./permit.html')}))});
