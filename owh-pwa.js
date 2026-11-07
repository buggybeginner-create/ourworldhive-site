/* Ourworldhive: every page installs and opens as its own separate app. Copyright DUKEKRRISH. All rights reserved.
   Add to a page <head>:  <script src="owh-pwa.js"></script>   and create pwa/<page>.webmanifest + icons.
   A page with its own manifest uses  <script src="owh-pwa.js" data-own="1"></script>  (only the INSTALL button is added).
   The manifest scope is that one page only, so an installed app never captures links to other pages or apps. */
(function(){
var d=document,h=d.head||d.documentElement;
var path=location.pathname,page=path.split('/').pop()||'index.html';
if(!/\.html$/.test(page))return;
var sc=d.currentScript,OWN=!!(sc&&sc.getAttribute('data-own'))||!!d.querySelector('link[rel="manifest"]'); /* page already has its own app setup: only add the INSTALL button */
if(!/diary-app\.html|parcel-ledger\.html/.test(page))installBtn();
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

/* ---- Support / Donate: a link next to the copyright line, and OWHDON.open() for menus ---- */
function donateInit(){
  var UPI='8917262863@ybl',box=null;
  function close(){if(box){box.remove();box=null}}
  function open(){
    if(box)return;box=d.createElement('div');
    box.style.cssText='position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font:500 14px/1.5 system-ui,sans-serif';
    var amts=[49,99,199,499],links=amts.map(function(a){return '<a href="upi://pay?pa='+UPI+'&pn=DUKEKRRISH&am='+a+'&cu=INR&tn=Donation" style="flex:1;min-width:64px;text-align:center;text-decoration:none;background:#ffc857;color:#14181c;border-radius:10px;padding:10px 6px;font-weight:700">&#8377;'+a+'</a>'}).join('');
    box.innerHTML='<div style="background:#14181c;color:#fff;border:1px solid #ffc857;border-radius:14px;max-width:380px;width:100%;padding:16px;max-height:90vh;overflow:auto"><div style="font-weight:800;font-size:17px;margin-bottom:6px">&hearts; SUPPORT / DONATE</div><div style="color:#cbd5e1">If this app helps you, you can send any amount by UPI. Donating is optional, and every app stays free to try. Thank you!</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">'+links+'</div><a href="upi://pay?pa='+UPI+'&pn=DUKEKRRISH&cu=INR&tn=Donation" style="display:block;text-align:center;text-decoration:none;border:1px solid #ffc857;color:#ffc857;border-radius:10px;padding:10px;font-weight:700">PAY ANY AMOUNT BY UPI APP</a><div style="margin:12px 0 4px;color:#cbd5e1">UPI ID (to pay from any app or to contact for help):</div><div style="display:flex;gap:8px;align-items:center"><code style="flex:1;background:#0b0e11;border-radius:8px;padding:9px;word-break:break-all">'+UPI+'</code><button type="button" id="owhdc" style="background:#ffc857;color:#14181c;border:0;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer">COPY</button></div><button type="button" id="owhdx" style="margin-top:14px;width:100%;background:none;color:#aab;border:1px solid #445;border-radius:10px;padding:10px;cursor:pointer">CLOSE</button></div>';
    d.body.appendChild(box);
    box.addEventListener('click',function(e){if(e.target===box)close()});
    box.querySelector('#owhdx').onclick=close;
    box.querySelector('#owhdc').onclick=function(){var b=this;try{navigator.clipboard.writeText(UPI).then(function(){b.textContent='COPIED'},function(){b.textContent=UPI})}catch(e){b.textContent=UPI}};
  }
  /* Get latest version: clears the saved copy of the app on this phone and reloads. Data stays safe. */
  function upd(){try{if(!confirm('Get the latest version of this app? Your data stays safe.'))return}catch(e){}
    var j=[];try{if(navigator.serviceWorker)j.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}))}catch(e){}
    try{if(window.caches)j.push(caches.keys().then(function(k){return Promise.all(k.map(function(c){return caches.delete(c)}))}))}catch(e){}
    Promise.all(j).catch(function(){}).then(function(){var u=new URL(location.href);u.searchParams.set('_u',String(Date.now()));location.replace(u.toString())})}
  window.OWHUPD={run:upd};
  window.OWHDON={open:open};
  var tm=0;
  function scan(){if(!d.body)return;var w=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT,null),n,list=[];
    while((n=w.nextNode())){if(/©\s*(\d{4}\s*)?DUKEKRRISH/.test(n.nodeValue)){var el=n.parentNode;if(el&&!el.getAttribute('data-don')&&!(el.closest&&el.closest('script,style,title,noscript,textarea,#sheet-donate')))list.push(el)}}
    list.forEach(function(el){el.setAttribute('data-don','1');var a=d.createElement('a');a.href='#';a.className='owh-don';a.textContent=' • ♥ Support / Donate';a.style.cssText='color:inherit;font-weight:700;text-decoration:underline;cursor:pointer;white-space:nowrap';a.onclick=function(e){e.preventDefault();open()};el.appendChild(a);var u=d.createElement('a');u.href='#';u.className='owh-upd';u.textContent=' \u2022 \u21BB Get latest version';u.style.cssText='color:inherit;font-weight:700;text-decoration:underline;cursor:pointer;white-space:nowrap';u.onclick=function(e){e.preventDefault();upd()};el.appendChild(u)})}
  function kick(){clearTimeout(tm);tm=setTimeout(scan,350)}
  var APPS=/^(pm|permit|safety|project-planner|expense-tracker|grocery-cart|loan-tracker|parcel-ledger|diary-app|money-planner|home-planner|family-tree)\.html$/;
  function floatBtn(){if(!APPS.test(page)||d.getElementById('owhdon'))return;var vis=false,l=d.querySelectorAll('.owh-don');for(var i=0;i<l.length;i++)if(l[i].offsetParent!==null)vis=true;if(vis)return;
    var b=d.createElement('button');b.id='owhdon';b.type='button';b.setAttribute('aria-label','Support or donate');b.textContent='\u2665';
    b.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right,0px));bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:2147482000;width:34px;height:34px;border-radius:50%;border:1px solid #ffc857;background:#14181c;color:#ffc857;font-size:17px;line-height:1;cursor:pointer;opacity:.8;box-shadow:0 3px 10px rgba(0,0,0,.4)';
    b.onclick=open;d.body.appendChild(b);
    if(!d.getElementById('owhupb')){var g=d.createElement('button');g.id='owhupb';g.type='button';g.setAttribute('aria-label','Get latest version');g.title='Get latest version';g.textContent='\u21BB';
      g.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right,0px));bottom:calc(126px + env(safe-area-inset-bottom,0px));z-index:2147482000;width:34px;height:34px;border-radius:50%;border:1px solid #ffc857;background:#14181c;color:#ffc857;font-size:18px;line-height:1;cursor:pointer;opacity:.8;box-shadow:0 3px 10px rgba(0,0,0,.4)';
      g.onclick=upd;d.body.appendChild(g)}}
  setTimeout(function(){floatBtn()},2500);
  function start(){scan();try{new MutationObserver(kick).observe(d.body,{childList:true,subtree:true})}catch(e){}}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
}
})();