/* OurWorldHive: when a game is opened from an invite link, load the newest version once (clears old cached copies). Copyright DUKEKRRISH. All rights reserved. */
(function(){try{
var u=new URL(location.href),q=u.searchParams;
if(!(q.get('room')||q.get('friend'))||q.get('_f'))return;
var k='owh_fresh_'+(q.get('room')||q.get('friend'));try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
var go=function(){q.set('_f',String(Date.now()));location.replace(u.pathname+'?'+q.toString()+u.hash)};
var t=setTimeout(go,1500),jobs=[];
try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)jobs.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}))}catch(e){}
try{if(window.caches&&caches.keys)jobs.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(x){return caches.delete(x)}))}))}catch(e){}
Promise.all(jobs).then(function(){clearTimeout(t);go()},function(){clearTimeout(t);go()});
}catch(e){}})();
