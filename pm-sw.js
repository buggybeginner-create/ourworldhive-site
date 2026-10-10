/* PM Tracker service worker: shows push alerts when the app is closed. */
self.window=self;importScripts('firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp(self.OWH_FIREBASE);const messaging=firebase.messaging();
messaging.onBackgroundMessage(function(p){var d=(p&&p.data)||{};return self.registration.showNotification(d.title||'PM Tracker',{body:d.body||'',icon:'pm-icon-192.png',badge:'pm-icon-192.png',tag:d.tag||'pm',data:{url:d.url||'pm.html'}})});
self.addEventListener('notificationclick',function(e){e.notification.close();var url=(e.notification.data&&e.notification.data.url)||'pm.html';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){for(var i=0;i<l.length;i++){if(l[i].url.indexOf('pm.html')>=0&&'focus' in l[i])return l[i].focus()}return clients.openWindow(url)}))});
self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
/* Keeps the app files on the phone so PM Tracker opens without internet. Online, the newest file is always used first. */
var PMC='pm-app-v1';
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url),same=u.origin===self.location.origin,ext=u.hostname==='www.gstatic.com'||u.hostname==='cdnjs.cloudflare.com';
 if(!same&&!ext)return;if(same&&!/\/(pm\.html|pm-config\.js|firebase-config\.js|pm-manifest\.webmanifest|pm-icon-\d+\.png)$/.test(u.pathname))return;
 e.respondWith(fetch(r).then(function(res){if(res&&(res.ok||res.type==='opaque')){var c=res.clone();caches.open(PMC).then(function(x){x.put(r,c)}).catch(function(){})}return res}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||Response.error()})}))});
