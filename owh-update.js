/* OurWorldHive: "Update Available" for every app and game. Copyright DUKEKRRISH. All rights reserved.
   Loaded by owh-pwa.js and owh-loader.js, so every page gets it. It compares the date the open page was
   published (Last-Modified) with the page on the website. When the website has a newer copy, a small pill
   shows at the bottom: tap it to load the newest version. Apps with their own pill are skipped. */
(function(){
if(window.__owhUpd)return;window.__owhUpd=1;
var L=location,path=L.pathname,own=/(diary-app|pm|nifty-pulse|expense-tracker)\.html$/i.test(path);
if(own||!/^https?:$/.test(L.protocol))return;
var t0=Date.parse(document.lastModified)||0,shown=false,last=0;
function pill(){if(shown)return;shown=true;var d=document.createElement('div');d.id='owhUpd';d.setAttribute('role','status');
 d.style.cssText='position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147482000;display:flex;align-items:center;gap:2px;padding:4px 4px 4px 12px;border-radius:24px;background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;font:700 14px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 22px rgba(194,65,12,.4);max-width:calc(100vw - 24px)';
 d.innerHTML='<button type="button" data-u="go">🔄 Update Available · Tap To Update</button><button type="button" data-u="x" aria-label="Later">✕</button>';
 var bs=d.querySelectorAll('button');for(var i=0;i<bs.length;i++)bs[i].style.cssText='border:0;background:transparent;color:#fff;font:inherit;min-height:36px;padding:0 6px;cursor:pointer';
 d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-u]');if(!b)return;e.stopPropagation();e.preventDefault();d.remove();if(b.getAttribute('data-u')==='go')go()});
 (document.body||document.documentElement).appendChild(d)}
/* forget only this page's saved copy (other apps keep theirs), then open it fresh */
function go(){var jobs=[];try{if(window.caches)jobs.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.open(k).then(function(c){return c.keys().then(function(rs){return Promise.all(rs.filter(function(r){try{return new URL(r.url).pathname===path}catch(e){return false}}).map(function(r){return c.delete(r)}))})})}))}))}catch(e){}
 try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.update().catch(function(){})}))}))}catch(e){}
 var done=function(){L.reload()};Promise.all(jobs).then(done,done);setTimeout(done,2500)}
function chk(){if(shown||!navigator.onLine||Date.now()-last<60000||!t0)return;last=Date.now();
 fetch(path+'?_u='+Date.now(),{cache:'no-store',method:'HEAD'}).then(function(r){var lm=Date.parse(r.headers.get('last-modified')||'');if(lm&&lm>t0+60000)pill()}).catch(function(){})}
setTimeout(chk,7000);setInterval(chk,30*60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)chk()});window.addEventListener('online',chk);
window.owhCheckUpdate=function(){last=0;chk()};
})();
