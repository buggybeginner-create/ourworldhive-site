/* Ourworldhive shared site layer (see site-fx.css). Pure JS, no libraries. */
(function(){
 if(window.__sxfx)return;window.__sxfx=1;
 var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
 var coarse=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
 function ready(f){document.readyState!=='loading'?f():document.addEventListener('DOMContentLoaded',f)}
 ready(function(){
  document.body.classList.add('sx-on');
  /* ---------- animated background: aurora + particle network ---------- */
  var hasStage=document.getElementById('stage')||document.getElementById('globe')||document.body.hasAttribute('data-nofx');
  if(!RM&&!hasStage){
   var cv=document.createElement('canvas');cv.id='sxbg';document.body.insertBefore(cv,document.body.firstChild);
   var x=cv.getContext('2d'),W=0,H=0,dpr=Math.min(1.5,window.devicePixelRatio||1),N=coarse?26:54,P=[],mx=.5,my=.5,run=true,t=0,last=0;
   function size(){W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}
   size();addEventListener('resize',size);
   for(var i=0;i<N;i++)P.push({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.00006,vy:(Math.random()-.5)*.00006,r:Math.random()*1.5+.5});
   addEventListener('pointermove',function(e){mx=e.clientX/W;my=e.clientY/H},{passive:true});
   document.addEventListener('visibilitychange',function(){run=!document.hidden;if(run)requestAnimationFrame(frame)});
   var blobs=[[.2,.25,'124,196,255',.22],[.8,.3,'155,123,255',.2],[.55,.85,'255,200,87',.12]];
   function frame(ts){if(!run)return;requestAnimationFrame(frame);var dt=Math.min(50,ts-last);last=ts;t+=dt*.001;
    x.clearRect(0,0,W,H);
    blobs.forEach(function(b,i){var bx=(b[0]+Math.sin(t*.12+i*2)*.12+(mx-.5)*.05)*W,by=(b[1]+Math.cos(t*.1+i*3)*.1+(my-.5)*.05)*H,r=Math.max(W,H)*.5;var g=x.createRadialGradient(bx,by,0,bx,by,r);g.addColorStop(0,'rgba('+b[2]+','+b[3]+')');g.addColorStop(1,'rgba('+b[2]+',0)');x.fillStyle=g;x.fillRect(0,0,W,H)});
    var sy=window.scrollY||0;
    for(var i=0;i<N;i++){var p=P[i];p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<0)p.x=1;if(p.x>1)p.x=0;if(p.y<0)p.y=1;if(p.y>1)p.y=0;
     p.px=p.x*W+(mx-.5)*p.r*18;p.py=((p.y*H-sy*.04*p.r)%H+H)%H+(my-.5)*p.r*18;
     x.fillStyle='rgba(200,225,255,'+(.25+p.r*.2)+')';x.beginPath();x.arc(p.px,p.py,p.r,0,6.283);x.fill()}
    x.lineWidth=.6;var D=coarse?90:130;
    for(var i=0;i<N;i++)for(var j=i+1;j<N;j++){var a=P[i],b=P[j],dx=a.px-b.px,dy=a.py-b.py,d=dx*dx+dy*dy;if(d<D*D){x.strokeStyle='rgba(140,190,255,'+(.16*(1-Math.sqrt(d)/D))+')';x.beginPath();x.moveTo(a.px,a.py);x.lineTo(b.px,b.py);x.stroke()}}}
   requestAnimationFrame(frame);
  }
  /* ---------- pointer spotlight (desktop) ---------- */
  if(!RM&&!coarse){var sp=document.createElement('div');sp.id='sxspot';document.body.appendChild(sp);var tx=0,ty=0,cx=0,cy=0;
   addEventListener('pointermove',function(e){tx=e.clientX;ty=e.clientY},{passive:true});
   (function lp(){cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;sp.style.transform='translate('+cx+'px,'+cy+'px)';requestAnimationFrame(lp)})()}
  /* ---------- 3D tilt on cards ---------- */
  if(!RM&&!coarse){
   var SEL='.card,.tile,.sx-card,[class*="-card"],[class*="card-"],.tool,.feat,.panel';
   function tiltable(el){if(el.classList.contains('sx-tilt')||el.closest('.sx-head,.sx-foot,nav,table,form,#stage'))return false;var r=el.getBoundingClientRect();return r.width>120&&r.width<640&&r.height>60&&r.height<520}
   function bind(el){if(!tiltable(el))return;el.classList.add('sx-tilt');
    el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;el.style.setProperty('--ry',((px-.5)*8).toFixed(2)+'deg');el.style.setProperty('--rx',((.5-py)*8).toFixed(2)+'deg');el.style.setProperty('--mx',(px*100)+'%');el.style.setProperty('--my',(py*100)+'%')});
    el.addEventListener('pointerleave',function(){el.style.setProperty('--ry','0deg');el.style.setProperty('--rx','0deg')})}
   function scan(){var l=document.querySelectorAll(SEL),n=0;for(var i=0;i<l.length&&n<90;i++){if(!l[i].classList.contains('sx-tilt')){bind(l[i]);n++}}}
   scan();var to;new MutationObserver(function(){clearTimeout(to);to=setTimeout(scan,400)}).observe(document.body,{childList:true,subtree:true})}
  /* ---------- gradient headings ---------- */
  var h=document.querySelector('main h1,.hero h1,h1');if(h&&!h.querySelector('*')&&!document.body.hasAttribute('data-nofx'))h.classList.add('sx-gr');
  /* ---------- back to top with progress ring ---------- */
  var b=document.createElement('button');b.id='sxtop';b.setAttribute('aria-label','Back to top');b.innerHTML='<svg viewBox="0 0 46 46"><circle class="tr" cx="23" cy="23" r="20"/><circle class="pr" cx="23" cy="23" r="20" stroke-dasharray="125.7" stroke-dashoffset="125.7"/></svg>↑';document.body.appendChild(b);
  var pr=b.querySelector('.pr');
  function sc(){var s=window.scrollY||0,m=document.documentElement.scrollHeight-innerHeight;b.classList.toggle('on',s>500);if(m>0)pr.style.strokeDashoffset=125.7*(1-Math.min(1,s/m))}
  addEventListener('scroll',sc,{passive:true});sc();b.onclick=function(){scrollTo({top:0,behavior:RM?'auto':'smooth'})};
 });
})();
