/* Games page motion layer. Watches the game list and decorates it; never touches game logic. */
(function(){
'use strict';
document.documentElement.classList.add('gx-js');
var reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
var fine=window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches;
var $=function(s,r){return (r||document).querySelector(s)};
var main=$('#main'), list=$('#gList'), arena=$('.arena');
if(!main||!list||!arena) return;

/* aurora background */
var au=document.createElement('div'); au.className='gx-aurora'; au.setAttribute('aria-hidden','true'); au.innerHTML='<i></i><i></i><i></i>';
document.body.insertBefore(au,document.body.firstChild);

/* floating game icons and stars */
var cv=document.createElement('canvas'); cv.id='gxp'; cv.setAttribute('aria-hidden','true'); document.body.insertBefore(cv,au.nextSibling);
var cx=cv.getContext('2d'), W=0,H=0, DPR=Math.min(window.devicePixelRatio||1,2), P=[], GL=['🏏','🏎️','🚀','🎯','🏓','🏸','⚽','🐍','🧩','🎮','⭐','🏀'];
function size(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;}
size(); addEventListener('resize',size);
var N=Math.round(Math.min(26,Math.max(10,W/55)));
for(var i=0;i<N;i++) P.push({x:Math.random(),y:Math.random(),s:14+Math.random()*26,v:.012+Math.random()*.03,r:Math.random()*6.28,w:(Math.random()-.5)*.6,g:GL[i%GL.length],a:.07+Math.random()*.12,star:i%3===0});
var last=performance.now(), vis=true;
document.addEventListener('visibilitychange',function(){vis=!document.hidden;last=performance.now()});
function tick(t){
  requestAnimationFrame(tick);
  if(!vis||document.body.classList.contains('playing')) return;
  var dt=Math.min(.05,(t-last)/1000); last=t;
  cx.setTransform(DPR,0,0,DPR,0,0); cx.clearRect(0,0,W,H);
  cx.textAlign='center'; cx.textBaseline='middle';
  for(var i=0;i<P.length;i++){var p=P[i];
    if(!reduced){p.y-=p.v*dt; p.r+=p.w*dt; if(p.y<-.1){p.y=1.1;p.x=Math.random()}}
    var x=p.x*W+Math.sin(p.r*2+i)*10, y=p.y*H;
    cx.save(); cx.translate(x,y); cx.rotate(p.r*.3); cx.globalAlpha=p.a;
    if(p.star){cx.fillStyle='#fff';cx.beginPath();cx.arc(0,0,p.s*.06+1,0,6.283);cx.fill()}
    else{cx.font=p.s+'px serif';cx.fillText(p.g,0,0)}
    cx.restore();}
}
requestAnimationFrame(tick);

/* hero: orbiting game icons */
var orb=document.createElement('div'); orb.className='gx-orbit'; orb.setAttribute('aria-hidden','true');
orb.innerHTML='<div class="ring"></div><div class="ring r2"></div><div class="gxo"></div>'+
 [['🏏',0,'14s'],['🏎️',90,'14s'],['🚀',180,'14s'],['🎯',270,'14s']].map(function(s){return '<div class="sat" style="--t:'+s[2]+';transform:rotate('+s[1]+'deg)"><span style="transform:translateX(min(130px,17vw)) rotate(-'+s[1]+'deg)">'+s[0]+'</span></div>'}).join('');
arena.insertBefore(orb,arena.firstChild);

/* stat chips + filter chips */
var hub=$('#hub'), h2=hub&&hub.querySelector('h2');
var stats=document.createElement('div'); stats.className='gx-stats';
stats.innerHTML='<div><b data-n="0" id="gxN">0</b><span>games</span></div><div><b>Free</b><span>to play</span></div><div><b>Live</b><span>rankings</span></div>';
var lede=$('.lede',arena); if(lede) lede.parentNode.insertBefore(stats,lede.nextSibling);

var CATS={all:null,sports:['pingpong','badminton','cricket','penalty','hoops'],racing:['highway','runner3d','hop'],action:['space','tank','snake'],puzzle:['stack','mole','memory','merge']};
var NAMES={all:'All',sports:'🏆 Sports',racing:'🏎️ Racing',action:'🚀 Action',puzzle:'🧩 Puzzle'};
var chips=document.createElement('div'); chips.className='gx-chips'; chips.setAttribute('role','group'); chips.setAttribute('aria-label','Game type');
chips.innerHTML=Object.keys(NAMES).map(function(k){return '<button type="button" data-c="'+k+'"'+(k==='all'?' class="on"':'')+'>'+NAMES[k]+'</button>'}).join('')+'<button type="button" class="surp" data-c="rnd">🎲 Surprise me</button>';
if(h2) h2.parentNode.insertBefore(chips,h2.nextSibling);
var cur='all';
function applyFilter(){
  var ids=CATS[cur];
  list.querySelectorAll('.game').forEach(function(b){var id=b.dataset.g;b.classList.toggle('gx-hide',!!ids&&ids.indexOf(id)<0)});
  var ck=$('#ckBan'); if(ck) ck.style.display=(!ids||ids.indexOf('cricket')>=0)?'':'none';
}
chips.addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b) return;
  if(b.dataset.c==='rnd'){var all=[].slice.call(list.querySelectorAll('.game:not(.gx-hide)')); if(all.length){var g=all[Math.floor(Math.random()*all.length)];g.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});g.classList.add('gx-in');setTimeout(function(){g.click()},reduced?0:550)} return}
  cur=b.dataset.c; chips.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)}); applyFilter();
});

/* decorate cards whenever the app redraws the list */
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('gx-in');io.unobserve(en.target)}})},{threshold:.08}):null;
function colorsOf(el){var m=(el.getAttribute('style')||'').match(/#[0-9a-fA-F]{3,8}/g);return m||[]}
function countUp(el,to){if(reduced){el.textContent=to;return}var t0=performance.now();(function f(t){var k=Math.min(1,(t-t0)/900);el.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f)})(t0)}
var lastN=-1;
function decorate(){
  var cards=list.querySelectorAll('.game'); var n=cards.length;
  cards.forEach(function(b,i){
    if(b.dataset.gx) return; b.dataset.gx='1';
    var ic=b.querySelector('.ic'), c=ic?colorsOf(ic):[];
    if(c[0]) b.style.setProperty('--a1',c[0]); if(c[1]) b.style.setProperty('--a2',c[1]);
    b.style.setProperty('--d',(i%7)*.35+'s'); b.style.transitionDelay=(i%6)*70+'ms';
    if(io) io.observe(b); else b.classList.add('gx-in');
    if(fine&&!reduced){
      b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        b.style.setProperty('--ry',((x-.5)*10).toFixed(2)+'deg');b.style.setProperty('--rx',((.5-y)*8).toFixed(2)+'deg');b.style.setProperty('--mx',(x*100)+'%');b.style.setProperty('--my',(y*100)+'%')});
      b.addEventListener('pointerleave',function(){b.style.setProperty('--rx','0deg');b.style.setProperty('--ry','0deg')});
    }
  });
  applyFilter();
  if(n&&n!==lastN){lastN=n;var s=$('#gxN');if(s)countUp(s,n)}
}
new MutationObserver(function(){decorate()}).observe(list,{childList:true});
decorate();

/* medal rows in the ranking table */
var rk=$('#rkT');
if(rk) new MutationObserver(function(){rk.querySelectorAll('tr').forEach(function(r){var t=r.textContent;r.classList.toggle('gx-g1',t.indexOf('🥇')>=0);r.classList.toggle('gx-g2',t.indexOf('🥈')>=0);r.classList.toggle('gx-g3',t.indexOf('🥉')>=0)})}).observe(rk,{childList:true,subtree:true});
})();
