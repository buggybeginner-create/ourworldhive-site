/* Ourworldhive install helper, registered separately for each page (scope = that page only).
   Network first: when online the latest version always loads; when offline the last opened copy is shown. */
var C='owh-pages-v1';
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET'||r.mode!=='navigate')return;
  var key=r.url.split('?')[0].split('#')[0];
  e.respondWith(fetch(r,{cache:'no-cache'}).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put(key,cp)})}return res})
    .catch(function(){return caches.match(key).then(function(m){return m||Response.error()})}));
});
