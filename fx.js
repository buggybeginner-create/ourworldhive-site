/* Ourworldhive motion layer (see fx.css). Safe by design: it only adds classes, never rewrites page content. */
(function(){
if(window.__fx)return;window.__fx=1;
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
var lite=!!document.querySelector('meta[name="fx"][content="lite"]');
function q(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
/* scroll progress bar */
var bar=document.createElement('div');bar.id='fx-bar';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);
var head=document.querySelector('.sx-head'),tick=0;
function onScroll(){if(tick)return;tick=requestAnimationFrame(function(){tick=0;var h=document.documentElement,max=h.scrollHeight-innerHeight,y=window.pageYOffset||h.scrollTop;bar.style.transform='scaleX('+(max>0?Math.min(1,y/max):0)+')';if(head)head.classList.toggle('fx-scrolled',y>8)})}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);onScroll();
/* ripple on buttons */
document.addEventListener('pointerdown',function(e){var b=e.target.closest&&e.target.closest('.btn');if(!b||RM)return;var r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2,s=document.createElement('span');s.className='fx-rip';s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';b.appendChild(s);setTimeout(function(){s.remove()},650)},{passive:true});
/* soft fade between pages */
document.addEventListener('click',function(e){if(RM||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target&&a.target!=='_self'||a.hasAttribute('download')||a.hasAttribute('data-no-fx'))return;var u;try{u=new URL(a.href,location.href)}catch(x){return}if(u.origin!==location.origin||u.pathname===location.pathname&&u.search===location.search)return;if(!/\.html?$|\/$/.test(u.pathname))return;e.preventDefault();document.body.classList.add('fx-out');setTimeout(function(){location.href=u.href},170)});
addEventListener('pageshow',function(e){if(e.persisted)document.body.classList.remove('fx-out')});
if(RM)return;
/* count-up numbers: <span data-count="12">0</span> */
function countUp(el){var to=+el.getAttribute('data-count')||0,t0=null,dur=1100;function st(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/dur),v=Math.round(to*(1-Math.pow(1-p,3)));el.textContent=v.toLocaleString();if(p<1)requestAnimationFrame(st)}requestAnimationFrame(st)}
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(en){if(!en.isIntersecting)return;var el=en.target;io.unobserve(el);if(el.hasAttribute('data-count'))countUp(el);else el.classList.add('fx-in')})},{threshold:.12,rootMargin:'0px 0px -6% 0px'}):null;
function watchCounts(r){q('[data-count]',r).forEach(function(el){if(el.__fxc)return;el.__fxc=1;if(io)io.observe(el);else el.textContent=el.getAttribute('data-count')})}
watchCounts();
if(lite)return;
/* reveal on scroll */
var SEL='main h1,main h2,main .lede,main .row,main .mrow,main .sec>*,main .card,main .pc,main article,main figure,main .gcard,main .mk-show,main .mk-stat,.sx-fgrid>div';
var n=0;
function prep(root){q(SEL,root).forEach(function(el){if(el.__fxr||el.closest('[data-fx="off"]'))return;var cs=getComputedStyle(el);if(cs.position==='fixed'||cs.position==='absolute'||cs.display==='none')return;el.__fxr=1;var r=el.getBoundingClientRect();el.classList.add('fx-r');el.style.setProperty('--fd',Math.min(n%6*70,350)+'ms');n++;
  if(r.top<innerHeight*.94){setTimeout(function(){el.classList.add('fx-in')},60+n%8*55)}else if(io)io.observe(el);else el.classList.add('fx-in')})}
function spots(root){q('.row,.mrow,.pc,.gcard',root).forEach(function(el){if(el.__fxs)return;el.__fxs=1;var cs=getComputedStyle(el),af=getComputedStyle(el,'::after');if(af.content!=='none'&&af.content!=='normal')return;if(cs.position==='static')el.classList.add('fx-spot');else el.classList.add('fx-spot');el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left)+'px');el.style.setProperty('--my',(e.clientY-r.top)+'px')},{passive:true})});
  q('.pc,.gcard',root).forEach(function(el){el.classList.add('fx-lift')})}
function run(root){try{prep(root);spots(root);watchCounts(root)}catch(e){}}
run();
var main=document.querySelector('main')||document.body,mo=window.MutationObserver&&new MutationObserver(function(ms){var add=0;ms.forEach(function(m){if(m.addedNodes.length)add=1});if(add){clearTimeout(run._t);run._t=setTimeout(run,120)}});
if(mo)mo.observe(main,{childList:true,subtree:true});
/* soft cursor glow on laptops and desktops */
if(matchMedia('(hover:hover) and (pointer:fine)').matches){var g=document.createElement('div');g.id='fx-glow';g.setAttribute('aria-hidden','true');document.body.appendChild(g);var gx=0,gy=0,gt=0;addEventListener('pointermove',function(e){gx=e.clientX;gy=e.clientY;g.style.opacity=1;if(!gt)gt=requestAnimationFrame(function(){gt=0;g.style.transform='translate('+gx+'px,'+gy+'px)'})},{passive:true});document.addEventListener('mouseleave',function(){g.style.opacity=0})}
})();
