/* Ourworldhive: every page installs and opens as its own separate app. Copyright DUKEKRRISH. All rights reserved.
   Add to a page <head>:  <script src="owh-pwa.js"></script>   and create pwa/<page>.webmanifest + icons.
   The manifest scope is that one page only, so an installed app never captures links to other pages or apps. */
(function(){
var d=document,h=d.head||d.documentElement;
if(d.querySelector('link[rel="manifest"]'))return; /* page already has its own app setup */
var path=location.pathname,page=path.split('/').pop()||'index.html';
if(!/\.html$/.test(page))return;
if(path.slice(-1)==='/'){try{history.replaceState(history.state,'',page+location.search+location.hash)}catch(e){}}
var base=page.slice(0,-5);
function add(tag,attrs){var e=d.createElement(tag);for(var k in attrs)e.setAttribute(k,attrs[k]);h.appendChild(e);return e}
add('link',{rel:'manifest',href:'pwa/'+base+'.webmanifest'});
var old=d.querySelectorAll('link[rel="apple-touch-icon"]');for(var i=0;i<old.length;i++)old[i].parentNode.removeChild(old[i]);
add('link',{rel:'apple-touch-icon',href:'pwa/'+base+'-apple.png'});
add('meta',{name:'mobile-web-app-capable',content:'yes'});
add('meta',{name:'apple-mobile-web-app-capable',content:'yes'});
var t=add('meta',{name:'apple-mobile-web-app-title',content:(d.title||'').split('|')[0].trim()});
try{fetch('pwa/'+base+'.webmanifest').then(function(r){return r.json()}).then(function(m){if(m&&m.short_name)t.setAttribute('content',m.short_name)}).catch(function(){})}catch(e){}
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('app-sw.js',{scope:'./'+page}).catch(function(){})})}
})();
