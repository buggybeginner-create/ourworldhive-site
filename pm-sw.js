/* PM Tracker service worker: shows push alerts when the app is closed. */
self.window=self;importScripts('firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp(self.OWH_FIREBASE);const messaging=firebase.messaging();
messaging.onBackgroundMessage(function(p){var d=(p&&p.data)||{};return self.registration.showNotification(d.title||'PM Tracker',{body:d.body||'',icon:'pm-icon-192.png',badge:'pm-icon-192.png',tag:d.tag||'pm',data:{url:d.url||'pm.html'}})});
self.addEventListener('notificationclick',function(e){e.notification.close();var url=(e.notification.data&&e.notification.data.url)||'pm.html';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){for(var i=0;i<l.length;i++){if(l[i].url.indexOf('pm.html')>=0&&'focus' in l[i])return l[i].focus()}return clients.openWindow(url)}))});
self.addEventListener('install',function(){self.skipWaiting()});self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
/* Keeps the app files on the phone so PM Tracker opens without internet. Online, the newest file is always used first. */
var PMC='pm-app-v2';
/* Firebase files have a fixed version number, so the phone keeps them and uses them straight away (fast start).
   The app page is fetched from the internet first, but if the network is slow (3 seconds) the saved copy opens instead. */
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url),same=u.origin===self.location.origin,ext=u.hostname==='www.gstatic.com'||u.hostname==='cdnjs.cloudflare.com';
 if(!same&&!ext)return;if(same&&!/\/(pm\.html|pm-config\.js|firebase-config\.js|pm-manifest\.webmanifest|pm-icon-\d+\.png)$/.test(u.pathname))return;
 var keep=function(res){if(res&&(res.ok||res.type==='opaque')){var c=res.clone();caches.open(PMC).then(function(x){x.put(r,c)}).catch(function(){})}return res};
 var cached=function(){return caches.match(r,{ignoreSearch:true})};
 if(ext){e.respondWith(cached().then(function(m){return m||fetch(r).then(keep)}));return}
 e.respondWith(new Promise(function(done){var fin=false,t=setTimeout(function(){cached().then(function(m){if(m&&!fin){fin=true;done(m)}})},3000);
  fetch(r).then(function(res){clearTimeout(t);if(!fin){fin=true;done(keep(res))}else keep(res)}).catch(function(){clearTimeout(t);cached().then(function(m){if(!fin){fin=true;done(m||Response.error())}})})}))});
