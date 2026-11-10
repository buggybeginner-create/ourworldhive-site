/* Ourworldhive: every page installs and opens as its own separate app. Copyright DUKEKRRISH. All rights reserved.
   Add to a page <head>:  <script src="owh-pwa.js"></script>   and create pwa/<page>.webmanifest + icons.
   A page with its own manifest uses  <script src="owh-pwa.js" data-own="1"></script>  (only the INSTALL button is added).
   The manifest scope is that one page only, so an installed app never captures links to other pages or apps. */
(function(){
var d=document,h=d.head||d.documentElement;
var path=location.pathname,page=path.split('/').pop()||'index.html';
if(!/\.html$/.test(page))return;
var sc=d.currentScript,OWN=!!(sc&&sc.getAttribute('data-own'))||!!d.querySelector('link[rel="manifest"]'); /* page already has its own app setup: only add the INSTALL button */
var framed=false;try{framed=window.top!==window}catch(e){framed=true}
if(!framed&&!/parcel-ledger\.html/.test(page))installBtn(); /* never inside a frame: an embedded page cannot be installed */
donateInit();
if(OWN)return;
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
/* ---- separate INSTALL button for this page ---- */
function installBtn(){
  var sa=window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(sa||/^android-app:/.test(document.referrer||''))return;
  var key='owh-inst-'+page,ev=null,b=null;
  try{if(localStorage.getItem(key))return}catch(e){}
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!/crios|fxios/i.test(navigator.userAgent);
  function show(){if(b)return;var st=d.createElement('style');
    st.textContent='.owh-inst{position:fixed;left:max(12px,env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;gap:6px;background:#14181c;color:#fff;border:1px solid #ffc857;border-radius:999px;padding:4px 4px 4px 12px;font:700 12px/1 system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 6px 18px rgba(0,0,0,.45)}.owh-inst button{appearance:none;border:0;background:#ffc857;color:#14181c;font:inherit;border-radius:999px;padding:8px 12px;cursor:pointer}.owh-inst .x{background:none;color:#aab;padding:6px 8px;font-size:15px}.owh-tip{position:fixed;left:12px;right:12px;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:2147483000;background:#14181c;color:#fff;border:1px solid #ffc857;border-radius:12px;padding:10px 12px;font:500 14px/1.45 system-ui,sans-serif;max-width:420px}';
    d.head.appendChild(st);
    b=d.createElement('div');b.className='owh-inst';b.innerHTML='<span>APP</span><button type="button">INSTALL</button><button type="button" class="x" aria-label="Close">×</button>';
    b.children[1].onclick=function(){if(ev){ev.prompt();ev.userChoice.then(function(c){if(c&&c.outcome==='accepted')hide()});ev=null}
      else{var tp=d.createElement('div');tp.className='owh-tip';tp.textContent=ios?'Tap Share (⬆) then "Add to Home Screen" to install this page as its own app.':'Open the browser menu (⋮) and tap "Install app" / "Add to Home screen".';d.body.appendChild(tp);setTimeout(function(){tp.remove()},6000)}};
    b.children[2].onclick=function(){try{localStorage.setItem(key,Date.now())}catch(e){}hide()};
    d.body.appendChild(b);
    var hb=b;setTimeout(function(){if(b!==hb)return;hb.style.transition='opacity .4s';hb.style.opacity='0';setTimeout(function(){if(b===hb){try{localStorage.setItem(key,'1')}catch(e){}hide()}},420)},2000); /* auto-hide after 2 seconds */
    try{var ml=d.querySelector('link[rel="manifest"]');if(ml)fetch(ml.href).then(function(r){return r.json()}).then(function(m){if(b&&m&&m.short_name)b.firstChild.textContent=m.short_name.toUpperCase()}).catch(function(){})}catch(e){}}
  function hide(){if(b){b.remove();b=null}}
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();ev=e;if(d.body)show();else window.addEventListener('load',show)});
  window.addEventListener('appinstalled',hide);
  if(ios)window.addEventListener('load',show);
}

/* ---- Support / Donate and Get latest version: no popup, no footer link, no floating button.
   Each app shows them inside its own Profile: OWHDON.card() returns the donate block as HTML, OWHUPD.run() refreshes the app. ---- */
function donateInit(){
  var UPI='8917262863@ybl';
  function card(){
    var amts=[49,99,199,499],links=amts.map(function(a){return '<a href="upi://pay?pa='+UPI+'&pn=DUKEKRRISH&am='+a+'&cu=INR&tn=Donation">&#8377;'+a+'</a>'}).join('');
    return '<b>&hearts; SUPPORT / DONATE</b><div class="note" style="margin:4px 0">If this app helps you, you can send any amount by UPI. Donating is optional, and every app stays free to try. Thank you!</div><div>'+links+'<a href="upi://pay?pa='+UPI+'&pn=DUKEKRRISH&cu=INR&tn=Donation">OTHER AMOUNT</a></div><div class="note" style="margin-top:8px">UPI ID: <b>'+UPI+'</b> <button type="button" class="chip" data-owhcopy="'+UPI+'">COPY</button></div>';
  }
  d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-owhcopy]');if(!b)return;e.preventDefault();var v=b.getAttribute('data-owhcopy');try{navigator.clipboard.writeText(v).then(function(){b.textContent='COPIED'},function(){b.textContent=v})}catch(x){b.textContent=v}});
  window.OWHDON={card:card,upi:UPI};
  /* Get latest version: clears the saved copy of the app on this phone and reloads. Data stays safe. */
  function upd(){try{if(!confirm('Get the latest version of this app? Your data stays safe.'))return}catch(e){}
    var j=[];try{if(navigator.serviceWorker)j.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}))}catch(e){}
    try{if(window.caches)j.push(caches.keys().then(function(k){return Promise.all(k.map(function(c){return caches.delete(c)}))}))}catch(e){}
    Promise.all(j).catch(function(){}).then(function(){var u=new URL(location.href);u.searchParams.set('_u',String(Date.now()));location.replace(u.toString())})}
  window.OWHUPD={run:upd};
}
})();