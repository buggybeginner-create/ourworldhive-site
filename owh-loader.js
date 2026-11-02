/* OurWorldHive loading screen. Copyright DUKEKRRISH. All rights reserved.
   Add to any page:  <script src="owh-loader.js" data-owh="gears"></script>   (gears | hive)
   Optional: data-name="PM Tracker"  data-color="#0f766e" */
(function(){
if(window.OWH&&window.OWH.on)return;
var D=document,root=D.documentElement,sc=D.currentScript,MODE=(sc&&sc.getAttribute('data-owh'))||'gears',
    NAME=(sc&&sc.getAttribute('data-name'))||'',WAIT=!!(sc&&sc.getAttribute('data-wait')),COL=(sc&&sc.getAttribute('data-color'))||'';
function gear(cx,cy,R,n,off,hole){var r=R-6,hw=Math.PI/n*0.5,d='',i,a,p=function(rr,aa){return(cx+rr*Math.cos(aa)).toFixed(1)+','+(cy+rr*Math.sin(aa)).toFixed(1)};
 for(i=0;i<n;i++){a=off+i*2*Math.PI/n;d+=(i?'L':'M')+p(r,a-hw)+'L'+p(R,a-hw*.6)+'L'+p(R,a+hw*.6)+'L'+p(r,a+hw)}
 d+='Z';var h=hole||R*.28;d+='M'+(cx+h)+','+cy+'A'+h+','+h+' 0 1 0 '+(cx-h)+','+cy+'A'+h+','+h+' 0 1 0 '+(cx+h)+','+cy+'Z';return d}
/* Two meshing gears: the big one turns one way, the small one the other way, at matching tooth speed */
function gears(){return '<svg class="owhg" viewBox="0 0 120 78" aria-hidden="true"><g class="owhg1" style="transform-origin:36px 40px"><path fill-rule="evenodd" d="'+gear(36,40,32,10,0)+'"/></g><g class="owhg2" style="transform-origin:82px 40px"><path fill-rule="evenodd" d="'+gear(82,40,23,8,Math.PI/8)+'"/></g></svg>'}
function hive(){var h='',i,c=[[40,22],[70,22],[25,48],[55,48],[85,48]];for(i=0;i<c.length;i++)h+='<polygon class="owhh" style="animation-delay:'+(i*.25)+'s" points="'+hex(c[i][0],c[i][1],14)+'"/>';return '<svg class="owhg owhhv" viewBox="0 0 110 72" aria-hidden="true">'+h+'</svg>'}
function hex(x,y,r){var s='',i;for(i=0;i<6;i++){var a=Math.PI/3*i+Math.PI/6;s+=(x+r*Math.cos(a)).toFixed(1)+','+(y+r*Math.sin(a)).toFixed(1)+' '}return s}
var TIPS=MODE==='hive'?['Collecting nectar','Building the honeycomb','Waking the bees','Almost there']:['Oiling the gears','Tightening the bolts','Calibrating the sensors','Almost there'];
var css='#owhld{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:radial-gradient(ellipse at 50% 35%,#12403b 0%,#0a2623 62%,#071b19 100%);color:#e6f4f2;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px;transition:opacity .45s ease,visibility .45s;opacity:1}#owhld.out{opacity:0;visibility:hidden;pointer-events:none}'
+'#owhld .owhg{width:min(46vw,190px);height:auto;overflow:visible}#owhld .owhg path{fill:var(--owhc,#2dd4bf)}#owhld .owhg2 path{fill:#ffc857}'
+'#owhld .owhg1{animation:owhcw 5s linear infinite}#owhld .owhg2{animation:owhccw 4s linear infinite}'
+'@keyframes owhcw{to{transform:rotate(360deg)}}@keyframes owhccw{to{transform:rotate(-360deg)}}'
+'#owhld .owhh{fill:#ffc857;fill-opacity:.15;stroke:#ffc857;stroke-width:1.5;animation:owhhx 1.6s ease-in-out infinite}@keyframes owhhx{0%,100%{fill-opacity:.12}50%{fill-opacity:.95}}'
+'#owhld .owhn{font-size:15px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ffc857;min-height:1.2em;max-width:88vw}'
+'#owhld .owhb{width:min(72vw,280px);height:10px;border-radius:10px;background:#ffffff1f;overflow:hidden;box-shadow:inset 0 0 0 1px #ffffff14}'
+'#owhld .owhb i{display:block;height:100%;width:0;border-radius:10px;background:linear-gradient(90deg,var(--owhc,#2dd4bf),#ffc857);background-size:200% 100%;animation:owhs 1.4s linear infinite;transition:width .25s ease-out}@keyframes owhs{to{background-position:-200% 0}}'
+'#owhld .owhp{font-size:13px;color:#9fd2cc;font-variant-numeric:tabular-nums}#owhld .owht{font-size:12.5px;color:#8fb7b2;min-height:1.2em}'
+'@media (prefers-reduced-motion:reduce){#owhld .owhg1,#owhld .owhg2,#owhld .owhh,#owhld .owhb i{animation:none}}';
var st=D.createElement('style');st.id='owhld-css';st.textContent=css;
var el=D.createElement('div');el.id='owhld';el.setAttribute('role','status');el.setAttribute('aria-label','Loading');
el.innerHTML=(MODE==='hive'?hive():gears())+'<div class="owhn"></div><div class="owhb"><i></i></div><div class="owhp">0%</div><div class="owht"></div>';
var bar=el.querySelector('.owhb i'),pc=el.querySelector('.owhp'),tt=el.querySelector('.owht'),nm=el.querySelector('.owhn');
(D.head||root).appendChild(st);root.appendChild(el);root.className+=' owh-on';
var t0=Date.now(),pct=0,fin=false,gone=false,ti=0,loaded=false;
function set(p){pct=Math.max(pct,Math.min(100,p));bar.style.width=pct+'%';pc.textContent=Math.round(pct)+'%'}
function name(){var n=NAME;if(!n){n=(D.title||'').split(/\s[-|–—:]\s|:\s|,\s/)[0]}nm.textContent=(n||'Loading').slice(0,34);var m=D.querySelector('meta[name=theme-color]'),c=COL||(m&&m.content);if(c&&/^#[0-9a-f]{3,8}$/i.test(c)){var l=parseInt(c.slice(1,3),16)||0;if(c.length>=7&&l+(parseInt(c.slice(3,5),16)||0)+(parseInt(c.slice(5,7),16)||0)>150)el.style.setProperty('--owhc',c)}}
function tick(){if(gone)return;/* climbs fast, then slows down and waits at 92% until the page is really ready */
 var s=(Date.now()-t0)/1000,target=92*(1-Math.exp(-s/1.6));if(WAIT)target=92+6*(1-Math.exp(-s/15));if(!fin)set(Math.min(target,WAIT?98:92));tt.textContent=TIPS[Math.min(TIPS.length-1,Math.floor(s/1.1))];ti=setTimeout(tick,120)}
function finish(){if(fin)return;fin=true;var wait=Math.max(0,700-(Date.now()-t0));setTimeout(function(){set(100);setTimeout(function(){el.className='out';setTimeout(function(){gone=true;clearTimeout(ti);root.className=root.className.replace(' owh-on','');if(el.parentNode)el.parentNode.removeChild(el)},520)},260)},wait)}
D.addEventListener('DOMContentLoaded',name);if(D.readyState!=='loading')name();
if(!WAIT){if(D.readyState==='complete')finish();else window.addEventListener('load',function(){loaded=true;finish()})}
window.addEventListener('pageshow',function(e){if(e.persisted)finish()});
setTimeout(finish,WAIT?30000:12000);/* never trap the visitor */
tick();
window.OWH={on:1,gears:gears,hive:hive,done:finish};
})();
