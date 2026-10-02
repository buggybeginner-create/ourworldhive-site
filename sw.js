// Minimal service worker: lets My Diary show reminder notifications. It does not cache pages, so updates always arrive.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){ if(cs.length) return cs[0].focus(); return self.clients.openWindow('diary-app.html'); }));
});
