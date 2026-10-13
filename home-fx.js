/* Ourworldhive home: atmosphere glow, orbiting satellites and moon, shooting stars, rotating hero line. */
(function(){
'use strict';
var reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
var fb=document.getElementById('fxb'), ff=document.getElementById('fxf');
if(!fb||!ff) return;
var xb=fb.getContext('2d'), xf=ff.getContext('2d'), TAU=Math.PI*2;
var small=Math.min(innerWidth,innerHeight)<700;
var DPR=Math.min(window.devicePixelRatio||1,small?1.5:2), W=0,H=0, mx=0,my=0, tmx=0,tmy=0;
function size(){
  var r=fb.parentNode.getBoundingClientRect(); W=r.width; H=r.height;
  [fb,ff].forEach(function(c){ c.width=Math.round(W*DPR); c.height=Math.round(H*DPR); });
}
size(); addEventListener('resize',size);
addEventListener('pointermove',function(e){ tmx=(e.clientX/innerWidth-.5); tmy=(e.clientY/innerHeight-.5); },{passive:true});

/* drifting stars (two depth layers) */
var seed=11; function rnd(){ seed=(seed*16807)%2147483647; return seed/2147483647; }
var stars=[]; for(var i=0;i<(small?70:130);i++) stars.push({x:rnd(),y:rnd(),r:rnd()*1.2+.3,p:rnd()*TAU,s:rnd()*1.6+.4,d:rnd()<.5?.012:.03,c:rnd()<.2?'255,214,140':(rnd()<.4?'150,205,255':'255,255,255')});
var shoot=null, nextShoot=2500;

/* orbits: tilt, radius multiples of the globe radius, speed, colour */
var orbits=[
  {tilt:-.38, rx:1.42, ry:.30, sp:.34, t:.6, col:'255,200,87',  size:3.2},
  {tilt:.52,  rx:1.62, ry:.40, sp:-.24, t:3.2, col:'124,196,255', size:2.8},
  {tilt:-.12, rx:2.05, ry:.52, sp:.085, t:1.8, col:'205,214,235', size:0, moon:true}
];
var trails=orbits.map(function(){ return []; });

function orbitPt(o,t,R){
  var x=Math.cos(t)*o.rx*R, y=Math.sin(t)*o.ry*R, c=Math.cos(o.tilt), s=Math.sin(o.tilt);
  return {x:x*c-y*s, y:x*s+y*c, front:Math.sin(t)>0};
}
function ringHalf(ctx,o,cx,cy,R,front,alpha){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(o.tilt);
  ctx.beginPath(); ctx.ellipse(0,0,o.rx*R,o.ry*R,0,front?0:Math.PI,front?Math.PI:TAU);
  ctx.lineWidth=front?1.4:1; ctx.strokeStyle='rgba('+o.col+','+alpha+')'; ctx.setLineDash(o.moon?[2,7]:[]); ctx.stroke(); ctx.restore();
}
function glowDot(ctx,x,y,r,col,a){
  var g=ctx.createRadialGradient(x,y,0,x,y,r*6); g.addColorStop(0,'rgba('+col+','+a+')'); g.addColorStop(.25,'rgba('+col+','+(a*.35)+')'); g.addColorStop(1,'rgba('+col+',0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*6,0,TAU); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
}
function moon(ctx,x,y,r,front){
  var g=ctx.createRadialGradient(x-r*.4,y-r*.4,r*.1,x,y,r); g.addColorStop(0,'#f4f6fb'); g.addColorStop(.6,'#aab3c8'); g.addColorStop(1,'#59627a');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
  ctx.fillStyle='rgba(60,70,95,.35)'; [[.25,.1,.22],[-.3,.3,.16],[.1,-.35,.13]].forEach(function(c){ ctx.beginPath(); ctx.arc(x+c[0]*r,y+c[1]*r,c[2]*r,0,TAU); ctx.fill(); });
}

var last=performance.now(), tt=0, visible=true;
document.addEventListener('visibilitychange',function(){ visible=!document.hidden; last=performance.now(); });

function frame(now){
  requestAnimationFrame(frame);
  if(!visible) return;
  var dt=Math.min(.05,(now-last)/1000); last=now;
  var G=window.__owhG?window.__owhG():null;
  xb.setTransform(DPR,0,0,DPR,0,0); xf.setTransform(DPR,0,0,DPR,0,0);
  xb.clearRect(0,0,W,H); xf.clearRect(0,0,W,H);
  if(!G||!G.on||G.R<10) return;
  if(!reduced) tt+=dt;
  mx+=(tmx-mx)*.04; my+=(tmy-my)*.04;
  var cx=G.cx, cy=G.cy, R=G.R, pulse=reduced?0:Math.sin(tt*.9)*.5+.5;

  /* stars with twinkle + mouse parallax */
  for(var i=0;i<stars.length;i++){ var s=stars[i];
    var x=((s.x*W - tt*s.d*60 + mx*-60*s.d*10)%W+W)%W, y=s.y*H+my*-40*s.d*10;
    var a=.35+.65*(reduced?.6:(Math.sin(tt*s.s+s.p)*.5+.5));
    xb.fillStyle='rgba('+s.c+','+a.toFixed(2)+')'; xb.beginPath(); xb.arc(x,y,s.r,0,TAU); xb.fill(); }

  /* shooting star */
  if(!reduced){
    nextShoot-=dt*1000;
    if(nextShoot<=0&&!shoot){ var ang=.5+rnd()*.35; shoot={x:rnd()*W*.8,y:rnd()*H*.35,vx:Math.cos(ang)*620,vy:Math.sin(ang)*620,l:0}; nextShoot=3500+rnd()*6000; }
    if(shoot){ shoot.l+=dt; shoot.x+=shoot.vx*dt; shoot.y+=shoot.vy*dt;
      var f=Math.max(0,1-shoot.l/1.1), tx=shoot.x-shoot.vx*.12, ty=shoot.y-shoot.vy*.12;
      var g=xb.createLinearGradient(shoot.x,shoot.y,tx,ty); g.addColorStop(0,'rgba(255,255,255,'+f+')'); g.addColorStop(1,'rgba(255,255,255,0)');
      xb.strokeStyle=g; xb.lineWidth=1.8; xb.beginPath(); xb.moveTo(shoot.x,shoot.y); xb.lineTo(tx,ty); xb.stroke();
      if(shoot.l>1.1||shoot.x>W+50||shoot.y>H+50) shoot=null; }
  }

  /* atmosphere: soft outer glow, breathing slightly */
  xb.save(); xb.globalCompositeOperation='lighter';
  var gr=xb.createRadialGradient(cx,cy,R*.96,cx,cy,R*(1.34+pulse*.03));
  gr.addColorStop(0,'rgba(90,170,255,'+(.42+pulse*.1)+')'); gr.addColorStop(.18,'rgba(70,140,255,.20)'); gr.addColorStop(.55,'rgba(70,90,255,.07)'); gr.addColorStop(1,'rgba(40,60,200,0)');
  xb.fillStyle=gr; xb.beginPath(); xb.arc(cx,cy,R*1.4,0,TAU); xb.fill();
  var wide=xb.createRadialGradient(cx,cy,R*.9,cx,cy,R*2.6); wide.addColorStop(0,'rgba(60,100,230,.10)'); wide.addColorStop(1,'rgba(60,100,230,0)');
  xb.fillStyle=wide; xb.beginPath(); xb.arc(cx,cy,R*2.6,0,TAU); xb.fill();
  xb.restore();

  /* orbit rings and satellites */
  orbits.forEach(function(o,k){
    if(!reduced) o.t+=o.sp*dt;
    var ra=o.moon?.12:.2;
    ringHalf(xb,o,cx,cy,R,false,ra*.7); ringHalf(xf,o,cx,cy,R,true,ra*1.5);
    var p=orbitPt(o,o.t,R), px=cx+p.x, py=cy+p.y, ctx=p.front?xf:xb;
    if(o.moon){ moon(ctx,px,py,Math.max(6,R*.075),p.front); return; }
    var tr=trails[k]; tr.push({x:px,y:py,f:p.front}); if(tr.length>34) tr.shift();
    for(var j=1;j<tr.length;j++){ var c2=tr[j].f?xf:xb; c2.strokeStyle='rgba('+o.col+','+(j/tr.length*.55)+')'; c2.lineWidth=j/tr.length*2.2; c2.beginPath(); c2.moveTo(tr[j-1].x,tr[j-1].y); c2.lineTo(tr[j].x,tr[j].y); c2.stroke(); }
    glowDot(ctx,px,py,o.size*(p.front?1:.7),o.col,p.front?.9:.5);
  });
}
requestAnimationFrame(function(t){ last=t; frame(t); });
setTimeout(function(){ document.body.classList.add('hfx-on'); },400);

/* rotating hero line */
var p=document.querySelector('.brand p');
if(p){
  var lines=['Spin the Earth, open <b>any country</b>.','Live <b>day and night</b> across the planet.','Watch <b>planes and ships</b> cross the world.','Wonders, maps, news and <b>one community</b>.'];
  var i=0; p.innerHTML='<span class="hw">'+lines[0]+'</span>';
  if(!reduced) setInterval(function(){
    var el=p.firstChild; el.classList.add('out');
    setTimeout(function(){ i=(i+1)%lines.length; el.innerHTML=lines[i]; el.classList.remove('out'); },520);
  },4200);
}
})();
