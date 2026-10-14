/* Chess 3D renderer on the owh3d WebGL engine: lathe-built pieces, board themes, piece skins,
   ghost captures and Yamraj on his buffalo. No game rules in here (see chess-core.js / chess.js). */
(function(root){
'use strict';
var E3=root.E3;
var THEMES={
 wood:{name:'Classic Wood',l:'#f0d9b5',d:'#b58863',frame:'#5a3b22',base:'#2d1c0f',table:'#1b120a',bg:'radial-gradient(ellipse at 50% 28%,#4a3422,#150d07 70%)',fog:[.08,.05,.03],spec:.35,orb:null},
 marble:{name:'Royal Marble',l:'#ecebf0',d:'#7d8190',frame:'#2b2f3c',base:'#161a24',table:'#10131b',bg:'radial-gradient(ellipse at 50% 25%,#3a4259,#0b0e17 72%)',fog:[.05,.06,.1],spec:.95,orb:null},
 emerald:{name:'Emerald Club',l:'#eeeed2',d:'#6f9a4e',frame:'#254628',base:'#10240f',table:'#0c1a0c',bg:'radial-gradient(ellipse at 50% 28%,#2f6a3a,#07130a 72%)',fog:[.03,.08,.04],spec:.5,orb:null},
 neon:{name:'Neon Grid',l:'#23306f',d:'#0d1236',frame:'#2a0d55',base:'#0a0620',table:'#05030f',bg:'radial-gradient(ellipse at 50% 30%,#3a1488,#05020f 70%)',fog:[.03,.01,.08],spec:.8,el:.3,ed:.22,orb:['#3de0ff','#ff3da8']},
 ice:{name:'Frozen Lake',l:'#eaf7ff',d:'#78b0d8',frame:'#3c6283',base:'#1d3550',table:'#122238',bg:'radial-gradient(ellipse at 50% 28%,#6fa8d6,#0d1e33 72%)',fog:[.1,.16,.22],spec:1,orb:['#ffffff']},
 lava:{name:'Volcano',l:'#6a2f24',d:'#220d09',frame:'#150807',base:'#0c0403',table:'#080302',bg:'radial-gradient(ellipse at 50% 80%,#8a2a08,#1a0603 55%,#050101)',fog:[.14,.04,.02],spec:.6,ed:.28,edc:'#ff4b1a',orb:['#ff7a1a','#ffcf33']},
 grave:{name:'Haunted Yard',l:'#a3a29c',d:'#4b4a52',frame:'#26262b',base:'#121216',table:'#0b0d0d',bg:'radial-gradient(ellipse at 50% 30%,#2b4a3a,#060b09 72%)',fog:[.03,.06,.05],spec:.2,orb:['#9dffb0']}
};
var SKINS={
 classic:{name:'Ivory and Ebony',w:'#f4ecd8',b:'#2b2420',sw:.55,sb:.6,ew:0,eb:0,aw:1,ab:1},
 marble:{name:'Polished Marble',w:'#eef0f4',b:'#2d3038',sw:1,sb:1,ew:0,eb:0,aw:1,ab:1},
 gold:{name:'Royal Gold',w:'#f0c75a',b:'#5a3a22',sw:1,sb:.9,ew:.1,eb:0,aw:1,ab:1},
 neon:{name:'Neon Glow',w:'#4dfcff',b:'#ff4dd2',sw:.9,sb:.9,ew:.55,eb:.55,aw:1,ab:1},
 crystal:{name:'Crystal',w:'#d6efff',b:'#7a55c8',sw:1,sb:1,ew:.12,eb:.18,aw:.78,ab:.8},
 fire:{name:'Fire and Ice',w:'#bfe9ff',b:'#ff5a1f',sw:1,sb:.7,ew:.1,eb:.55,aw:.92,ab:1},
 haunt:{name:'Bone and Shadow',w:'#e9e5cf',b:'#3a2a52',sw:.3,sb:.7,ew:0,eb:.3,aw:1,ab:1,bglow:'#7dff6a'}
};
var PROF={
 pawn:[[0,0],[.34,0],[.36,.04],[.35,.09],[.27,.15],[.2,.2],[.15,.32],[.13,.42],[.19,.46],[.2,.5],[.14,.54],[0,.54]],
 rook:[[0,0],[.38,0],[.4,.05],[.38,.11],[.3,.18],[.23,.24],[.2,.4],[.2,.58],[.27,.64],[.31,.68],[.31,.78],[0,.78]],
 bishop:[[0,0],[.36,0],[.38,.05],[.36,.1],[.28,.17],[.2,.24],[.14,.4],[.12,.56],[.19,.6],[.2,.64],[.12,.68],[0,.68]],
 queen:[[0,0],[.38,0],[.4,.05],[.38,.11],[.3,.18],[.22,.26],[.16,.5],[.14,.7],[.2,.78],[.24,.84],[.3,.96],[.34,1.06],[.3,1.08],[.2,1.04],[0,1.04]],
 king:[[0,0],[.39,0],[.41,.05],[.39,.11],[.31,.18],[.23,.27],[.17,.52],[.15,.76],[.22,.84],[.26,.9],[.3,1.0],[.32,1.1],[.28,1.14],[.18,1.1],[0,1.1]],
 kbase:[[0,0],[.37,0],[.39,.05],[.37,.1],[.29,.17],[.24,.24],[0,.24]]
};
var KN=[[-.28,.15,.24,.55],[-.2,.17,.26,.8],[-.08,.16,.34,1.0],[.04,.14,.44,1.08],[.14,.13,.56,1.08],[.26,.12,.62,.98],[.38,.1,.6,.8],[.5,.085,.58,.7]];
function hex(c){c=String(c).replace('#','');return[parseInt(c.substr(0,2),16)/255,parseInt(c.substr(2,2),16)/255,parseInt(c.substr(4,2),16)/255]}
function shade(c,f){var h=hex(c);return[Math.min(1,h[0]*f),Math.min(1,h[1]*f),Math.min(1,h[2]*f)]}
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rnd(a,b){var h=(Math.imul(a|0,374761393)+Math.imul(b|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}

function create(host,opt){
 opt=opt||{};
 var cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none';cv.setAttribute('aria-label','3D chess board');cv.tabIndex=0;
 host.style.position='relative';host.appendChild(cv);
 var e=E3.create(cv);if(!e)throw new Error('WebGL is not available');
 Object.keys(PROF).forEach(function(k){e.mesh(k,E3.lathe(PROF[k],32))});e.mesh('kn',E3.loft(KN,22,2.6));
 var dpr=Math.min(2,root.devicePixelRatio||1),W=360,H=360,theme=THEMES[opt.theme]||THEMES.wood,skin=SKINS[opt.skin]||SKINS.classic;
 var flip=!!opt.flip,pcs=[],bysq=new Array(64).fill(null),marks={sel:-1,dots:[],caps:[],last:null,check:-1},T=0,last=performance.now(),raf=0,dead=false;
 var cam={az:flip?Math.PI:0,el:.98,dist:12,tAz:flip?Math.PI:0,tEl:.9,tDist:12,fov:.78,auto:false,mode:'player',intro:0};
 var tapCb=null,acts=[],queueEnd=0,shake=0,ghosts=[],yam=null,flashT=0,pending=[];
 function sqXZ(sq){var r=sq>>3,f=sq&7;if(flip){r=7-r;f=7-f}return[f-3.5,r-3.5]}
 function xzSq(x,z){var f=Math.floor(x+4),r=Math.floor(z+4);if(f<0||f>7||r<0||r>7)return-1;if(flip){f=7-f;r=7-r}return r*8+f}
 function fit(){var a=W/H,th=Math.tan(cam.fov/2);cam.base=Math.max(13.2,5.3/(th*Math.min(a,1.6)))/(cam.mode==='top'?1.1:1)}
 function resize(){var r=host.getBoundingClientRect();W=Math.max(120,Math.round(r.width));H=Math.max(120,Math.round(r.height));e.size(W,H,dpr);cv.style.width='100%';cv.style.height='100%';fit();if(cam.mode!=='free')cam.tDist=cam.base}
 var ro=root.ResizeObserver?new ResizeObserver(resize):null;if(ro)ro.observe(host);root.addEventListener('resize',resize);resize();cam.dist=cam.base*1.9;cam.el=1.3;cam.az+=flip?-.9:.9;cam.tDist=cam.base;
 /* ---------- pieces ---------- */
 function mkPiece(ch,sq){var w=ch===ch.toUpperCase(),xz=sqXZ(sq),p={ch:ch,w:w,sq:sq,x:xz[0],z:xz[1],y:0,sc:1,a:1,rx:0,rz:0,glow:0,id:Math.random()};pcs.push(p);return p}
 function rm(p){var i=pcs.indexOf(p);if(i>=0)pcs.splice(i,1);if(bysq[p.sq]===p)bysq[p.sq]=null}
 function setBoard(b,drop){pcs.length=0;bysq.fill(null);for(var i=0;i<64;i++){var c=b[i];if(!c)continue;var p=mkPiece(c,i);bysq[i]=p;if(drop){p.y=7+rnd(i,3)*5;p.dropT=T+rnd(i,4)*.7;p.vy=0;p.a=0}}}
 function resetPos(){pcs.forEach(function(p){var xz=sqXZ(p.sq);p.x=xz[0];p.z=xz[1]})}
 /* ---------- drawing ---------- */
 function drawPiece(p,ghostA){
  var sk=skin,c=p.w?sk.w:sk.b,s=p.w?sk.sw:sk.sb,em=(p.w?sk.ew:sk.eb)+p.glow,a=(p.w?sk.aw:sk.ab)*p.a*(ghostA==null?1:ghostA),t=p.ch.toLowerCase(),sc=p.sc*1.12,x=p.x,y=p.y,z=p.z,o={s:s*.72,e:em,a:a,rx:p.rx,rz:p.rz},ry=(p.w!==flip)?Math.PI:0;
  if(a<=.01)return;
  var dk=shade(c,.62),O=function(ox,oy,oz,ex){var ca=Math.cos(ry),sa=Math.sin(ry);return[x+(ox*ca+oz*sa)*sc,y+oy*sc,z+(-ox*sa+oz*ca)*sc]};
  var g=function(n,ox,oy,oz,sx,sy,sz,col,ex){var q=O(ox,oy,oz),oo={s:o.s,e:o.e,a:a,ry:ry,rx:p.rx,rz:p.rz};if(ex)for(var k in ex)oo[k]=ex[k];e.draw(n,q[0],q[1],q[2],sx*sc,sy*sc,sz*sc,col,oo)};
  if(t==='n'){g('kbase',0,0,0,1,1,1,c);g('ball',0,.42,-.04,.5,.56,.62,c);g('kn',0,0,0,1,1,1,c);g('box',0,1.0,-.13,.03,.46,.24,dk,{rx:-.28});g('cone',-.075,1.16,.04,.09,.17,.09,c);g('cone',.075,1.16,.04,.09,.17,.09,c);g('ball',-.12,.96,.2,.05,.06,.06,'#0b0b0b',{e:0});g('ball',.12,.96,.2,.05,.06,.06,'#0b0b0b',{e:0});g('ball',0,.64,.5,.1,.07,.07,dk,{e:0});return}
  g({p:'pawn',r:'rook',b:'bishop',q:'queen',k:'king'}[t],0,0,0,1,1,1,c);
  if(t==='p')g('ball',0,.66,0,.38,.38,.38,c);
  else if(t==='r'){for(var i=0;i<8;i++){var an=i*.7854,ox=Math.cos(an)*.235,oz=Math.sin(an)*.235;g('box',ox,.84,oz,.13,.14,.13,c,{ry:ry-an})}}
  else if(t==='b'){g('ball',0,.88,0,.34,.52,.34,c);g('ball',0,1.17,0,.11,.11,.11,c);g('box',.06,.92,.15,.03,.22,.05,'#101010',{rz:.7,e:0})}
  else if(t==='q'){for(var j=0;j<8;j++){var an2=j*.7854,qx=Math.cos(an2)*.28,qz=Math.sin(an2)*.28;g('cone',qx,1.17,qz,.09,.2,.09,c);g('ball',qx,1.29,qz,.07,.07,.07,c,{e:o.e+.2})}g('ball',0,1.2,0,.17,.17,.17,c,{e:o.e+.1})}
  else if(t==='k'){g('box',0,1.31,0,.075,.32,.075,c,{e:o.e+.15});g('box',0,1.36,0,.24,.075,.075,c,{e:o.e+.15});g('ball',0,1.14,0,.2,.12,.2,c)}
  if(!p.w&&skin.bglow&&t!=='p')g('ball',-.07,.82,.2,.05,.05,.05,skin.bglow,{e:1})}
 function box(x,y,z,sx,sy,sz,c,o){e.draw('box',x,y,z,sx,sy,sz,c,o)}
 function drawBoard(){
  var th=theme,spec=th.spec;
  box(0,-1.2,0,60,.2,60,th.table,{s:.05});
  box(0,-.28,0,10.2,.5,10.2,th.base,{s:.7});
  box(0,.05,-4.45,10,.22,.58,th.frame,{s:spec});box(0,.05,4.45,10,.22,.58,th.frame,{s:spec});box(-4.45,.05,0,.58,.22,8.4,th.frame,{s:spec});box(4.45,.05,0,.58,.22,8.4,th.frame,{s:spec});
  if(th.orb){box(0,.17,-4.45,9.9,.02,.08,th.orb[0],{e:1});box(0,.17,4.45,9.9,.02,.08,th.orb[th.orb.length>1?1:0],{e:1});box(-4.45,.17,0,.08,.02,8.3,th.orb[0],{e:1});box(4.45,.17,0,.08,.02,8.3,th.orb[th.orb.length>1?1:0],{e:1})}
  for(var r=0;r<8;r++)for(var f=0;f<8;f++){var lt=(r+f)%2===0,col=lt?th.l:th.d,ee=lt?(th.el||0):(th.ed||0),oc=!lt&&th.edc?th.edc:null;
   if(oc&&ee){box(f-3.5,.045,r-3.5,1,.1,1,col,{s:spec,e:ee*(.7+.3*Math.sin(T*1.6+f*1.7+r*2.3))})}else box(f-3.5,.045,r-3.5,1,.1,1,col,{s:spec,e:ee})}
 }
 function drawMarks(){
  var y=.1;
  if(marks.last){marks.last.forEach(function(sq){var q=sqXZ(sq);box(q[0],y,q[1],.98,.012,.98,'#ffd646',{a:.4,e:.7})})}
  if(marks.sel>=0){var q=sqXZ(marks.sel);box(q[0],y+.004,q[1],.98,.012,.98,'#3dff8a',{a:.5,e:.9})}
  if(marks.check>=0){var c=sqXZ(marks.check),pl=.45+.35*Math.sin(T*7);box(c[0],y+.006,c[1],.98,.014,.98,'#ff2a2a',{a:pl,e:1})}
  marks.dots.forEach(function(sq){var q=sqXZ(sq),pu=.5+.15*Math.sin(T*5+sq);e.draw('cyl',q[0],y+.02,q[1],.34,.04,.34,'#28e0b0',{a:pu,e:.9})});
  marks.caps.forEach(function(sq){var q=sqXZ(sq),pu=.35+.2*Math.sin(T*6+sq);box(q[0],y+.008,q[1],.98,.014,.98,'#ff4a4a',{a:pu,e:.9});e.draw('cyl',q[0],y+.02,q[1],.7,.03,.7,'#ff9a9a',{a:.25,e:1})})}
 function shadowOf(p){var h=Math.max(0,p.y);e.shadow(p.x+.08,p.z+.08,.78*p.sc,.78*p.sc,.103,.34*p.a*(1-Math.min(.6,h*.2)))}
 function ambient(){var o=theme.orb;if(!o)return;for(var i=0;i<26;i++){var col=o[i%o.length],a=i*2.399,rr=4.5+rnd(i,1)*5,x=Math.cos(a+T*.07*(1+rnd(i,2)))*rr,z=Math.sin(a+T*.07*(1+rnd(i,2)))*rr,y=theme.name==='Volcano'?((T*.5*(.4+rnd(i,3))+rnd(i,4)*6)%7):1+rnd(i,5)*4+Math.sin(T*.8+i)*.5;e.ball(x,y,z,.12,.12,.12,col,{e:1,a:.8})}}
 /* ---------- ghost ---------- */
 function drawGhost(gx,gy,gz,al,face,t,sc){
  sc=sc||1;var w=Math.sin(t*9)*.08,col='#f4fbff';
  e.ball(gx,gy+.1,gz,.9*sc,.95*sc,.9*sc,'#9fe8ff',{e:1,a:.12*al});
  e.cone(gx,gy-.3*sc,gz,.82*sc,1.15*sc,.82*sc,col,{e:.95,a:.88*al,s:.2});
  e.ball(gx,gy+.34*sc,gz,.62*sc,.66*sc,.62*sc,col,{e:.95,a:.92*al});
  for(var i=0;i<7;i++){var an=i/7*6.283,rr=.4*sc;e.ball(gx+Math.cos(an)*rr,gy-.82*sc+Math.sin(t*8+i*2)*.06,gz+Math.sin(an)*rr,.26*sc,.3*sc,.26*sc,col,{e:.95,a:.85*al})}
  var fx=Math.sin(face),fz=Math.cos(face),rx=Math.cos(face),rz=-Math.sin(face);
  [-1,1].forEach(function(sd){e.ball(gx+fx*.27*sc+rx*sd*.15*sc,gy+.4*sc,gz+fz*.27*sc+rz*sd*.15*sc,.12*sc,.16*sc,.1*sc,'#050510',{a:al});
   e.box(gx+rx*sd*.58*sc+fx*.18*sc,gy+.0*sc+w*sd,gz+rz*sd*.58*sc+fz*.18*sc,.12*sc,.1*sc,.55*sc,col,{e:.95,a:.85*al,ry:face,rx:-.4+w*sd*2})});
  var mo=.5+.5*Math.sin(t*14);e.ball(gx+fx*.3*sc,gy+.2*sc,gz+fz*.3*sc,.2*sc,(.1+mo*.17)*sc,.12*sc,'#05020a',{a:al})}
 /* ---------- Yamraj on the buffalo ---------- */
 function drawYam(Y){
  var t=T-Y.t0,al=Y.a,ry=Y.ry,sc=Y.sc,x=Y.x,y=Y.y,z=Y.z,ca=Math.cos(ry),sa=Math.sin(ry),bob=Math.sin(t*3)*.12,tr=Math.sin(t*8),lau=.5+.5*Math.sin(t*13);
  var P=function(ox,oy,oz){return[x+(ox*ca+oz*sa)*sc,y+(oy+bob)*sc,z+(-ox*sa+oz*ca)*sc]};
  var D=function(n,ox,oy,oz,sx,sy,sz,col,ex){var q=P(ox,oy,oz),oo={ry:ry,a:al,s:.3};if(ex)for(var k in ex)oo[k]=ex[k];if(oo.a!==al)oo.a*=al;e.draw(n,q[0],q[1],q[2],sx*sc,sy*sc,sz*sc,col,oo)};
  /* storm cloud and aura */
  D('ball',0,.3,-.6,6,1.2,4,'#1b1226',{a:.4,s:0});D('ball',-2.2,.6,-.2,3.4,1.2,2.8,'#2a1a38',{a:.35,s:0});D('ball',2.3,.5,-.3,3.4,1.2,2.6,'#241632',{a:.35,s:0});
  D('ball',0,2,0,5,5,4,'#ff2a2a',{a:.08,e:1,s:0});
  /* buffalo */
  var B='#2d2d36',B2='#4a4a55';
  D('ball',0,1.0,-.15,1.15,1.05,2.3,B);D('ball',0,1.35,.55,1.0,.9,.9,B);D('ball',0,1.05,1.2,.78,.74,.95,B);D('box',0,.82,1.62,.5,.36,.42,B2);
  D('ball',-.13,.82,1.84,.1,.1,.08,'#000',{s:0});D('ball',.13,.82,1.84,.1,.1,.08,'#000',{s:0});
  [-1,1].forEach(function(sd){D('ball',.2*sd,1.2,1.62,.1,.1,.08,'#ff2a2a',{e:1,s:0});
   [[.42,1.4,1.05,.26],[.7,1.5,.98,.23],[.92,1.7,.92,.2],[1.02,1.95,.86,.16],[1.0,2.18,.8,.11]].forEach(function(h){D('ball',h[0]*sd,h[1],h[2],h[3],h[3],h[3]*1.3,'#efe4c6',{s:.6})})});
  [[-1,.6],[1,.6],[-1,-.9],[1,-.9]].forEach(function(l,i){var sw=Math.sin(t*7+i*1.6)*.35;D('box',l[0]*.42,.48,l[1],.24,.95,.24,B,{rx:sw});D('box',l[0]*.42,.06,l[1]+sw*.5,.28,.14,.3,'#111',{})});
  D('cyl',0,.98,-1.35,.1,.9,.1,B,{rx:.9+Math.sin(t*5)*.3});D('ball',0,.55,-1.7,.22,.3,.22,'#111',{});
  /* Yamraj */
  var SK='#2c4a96';
  D('box',0,2.08,-.1,.84,.98,.52,'#c8102e');D('box',0,2.2,.17,.7,.28,.06,'#ffcf33',{e:.4,s:.8});D('box',0,1.9,.2,.9,.12,.58,'#ffcf33',{e:.3});
  [-1,1].forEach(function(sd){D('box',.3*sd,1.62,.1,.32,.8,.34,'#e8e0d0',{rx:-1.0,rz:sd*.25});D('ball',.62*sd,2.35,.1,.3,.45,.3,SK,{rz:sd*.4})});
  D('box',-.62,2.7,.2,.2,.8,.24,SK,{rz:.55,rx:-.3});D('box',.62,2.62,.3,.2,.8,.24,SK,{rz:-1.2+Math.sin(t*4)*.2});
  /* mace */
  D('cyl',-.95,3.3,.3,.1,1.5,.1,'#6b4a2b',{rz:.35});D('ball',-1.18,4.2,.3,.52,.52,.52,'#ffcf33',{e:.45,s:1});for(var sp=0;sp<8;sp++){var an=sp*.7854;D('cone',-1.18+Math.cos(an)*.3,4.2+Math.sin(an)*.3,.3,.12,.22,.12,'#ffe27a',{rz:an-1.57,e:.4})}
  /* noose */
  for(var nn=0;nn<14;nn++){var aa=nn/14*6.283;D('ball',1.05+Math.cos(aa)*.34+Math.sin(t*3)*.1,2.15+Math.sin(aa)*.34,.5,.09,.09,.09,'#ffcf33',{e:.4})}
  /* head */
  D('ball',0,2.95,.12,.62,.68,.6,SK);
  D('cone',0,3.6,.12,.62,.62,.58,'#ffcf33',{e:.6,s:1});for(var cs=0;cs<5;cs++){var ca2=(cs-2)*.24;D('cone',ca2*1.2,3.62-Math.abs(cs-2)*.04,.12,.1,.24,.1,'#ffe27a',{e:.7})}D('ball',0,3.34,.12,.7,.18,.66,'#ffcf33',{e:.4,s:1});
  [-1,1].forEach(function(sd){D('ball',.17*sd,3.02,.38,.17,.17,.1,'#fff',{s:0});D('ball',.17*sd,3.02,.44,.08,.08,.06,'#ff1a1a',{e:1,s:0});D('box',.2*sd,3.18,.4,.26,.06,.06,'#07070a',{rz:sd*.35,s:0});D('box',.2*sd,2.76,.42,.34,.07,.06,'#07070a',{rz:-sd*.28,s:0});D('cone',.5*sd,2.95,.12,.1,.24,.1,SK,{rz:-sd*1.2})});
  D('ball',0,2.72,.4,.3,.12+lau*.16,.12,'#14040a',{s:0});D('box',0,2.8,.44,.12,.04,.04,'#fff',{s:0,e:.5});
  /* lightning flicker */
  if(Math.sin(t*17)>.8){for(var l=0;l<4;l++){D('box',-2.4+l*.2+Math.sin(t*40)*.2,3.2-l*.55,-.6,.07,.6,.05,'#c8e6ff',{e:1,s:0,rz:(l%2?.5:-.5)})}}
 }
 /* ---------- frame ---------- */
 function updateCam(dt){
  if(cam.mode==='cine'&&!cam.drag){cam.tAz+=dt*.12}
  var k=1-Math.pow(.0008,dt);cam.az+=(cam.tAz-cam.az)*k;cam.el+=(cam.tEl-cam.el)*k;cam.dist+=(cam.tDist-cam.dist)*k}
 function render(){
  var sh=shake>0?shake*.06:0,tg=[0,.15,0],ce=Math.cos(cam.el),eye=[tg[0]+Math.sin(cam.az)*ce*cam.dist+(Math.random()-.5)*sh,tg[1]+Math.sin(cam.el)*cam.dist+(Math.random()-.5)*sh,tg[2]+Math.cos(cam.az)*ce*cam.dist];
  cam.eye=eye;cam.tg=tg;
  e.begin({eye:eye,at:tg,fov:cam.fov,fog:theme.fog,fogNear:40,fogFar:90,sun:[.35,.9,.45],near:.5,far:120});
  drawBoard();drawMarks();
  pcs.forEach(function(p){if(p.a>.01)shadowOf(p)});
  pcs.forEach(function(p){if(p.a>.01)drawPiece(p)});
  ambient();
  ghosts.forEach(function(g){drawGhost(g.x,g.y,g.z,g.al,g.face,T-g.t0,g.sc);if(g.carry){var pc=g.carry;pc.x=g.x+Math.sin(g.face)*.3;pc.z=g.z+Math.cos(g.face)*.3;pc.y=g.y-.9}});
  if(yam)drawYam(yam)}
 function loop(now){if(dead)return;raf=requestAnimationFrame(loop);var dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
  shake=Math.max(0,shake-dt*2.2);updateCam(dt);
  for(var i=acts.length-1;i>=0;i--){if(acts[i](T,dt)===false)acts.splice(i,1)}
  pcs.forEach(function(p){if(p.dropT!=null&&T>=p.dropT){p.vy-=22*dt;p.y+=p.vy*dt;p.a=Math.min(1,p.a+dt*4);if(p.y<=0){p.y=0;if(p.vy<-4){p.vy=-p.vy*.25}else{p.vy=0;p.dropT=null;p.a=1}}}});
  render()}
 raf=requestAnimationFrame(loop);
 /* ---------- animations ---------- */
 function tween(dur,fn,done,delay){var t0=T+(delay||0);acts.push(function(t){if(t<t0)return true;var u=clamp((t-t0)/dur,0,1);fn(u);if(u>=1){done&&done();return false}return true})}
 function now(){return T}
 function schedule(dur,fn){var start=Math.max(T,queueEnd);queueEnd=start+dur;var d=start-T;if(d<=.001)fn(0);else acts.push((function(){var fired=false;return function(t){if(!fired&&t>=start){fired=true;fn(0);return false}return fired?false:true}})())}
 function arc(p,x1,z1,dur,h,delay,done){var x0=p.x,z0=p.z;tween(dur,function(u){var q=ease(u);p.x=x0+(x1-x0)*q;p.z=z0+(z1-z0)*q;p.y=Math.sin(Math.PI*u)*h},function(){p.y=0;done&&done()},delay)}
 function takeGhost(victim,delay,dur){
  var g={x:0,y:0,z:0,al:0,face:0,t0:T+delay,sc:1.6,carry:null},x1=victim.x,z1=victim.z,sx=x1-6,sz=z1+6,sy=6;
  ghosts.push(g);g.hidden=true;
  var grab=.52*dur;
  acts.push(function(t){var u=(t-g.t0)/dur;if(u<0){g.al=0;return true}if(u>=1){var i=ghosts.indexOf(g);if(i>=0)ghosts.splice(i,1);if(g.carry)rm(g.carry);return false}
   g.al=u<.1?u*10:u>.85?(1-u)/.15:1;
   if(u<.52){var q=ease(u/.52);g.x=sx+(x1-sx)*q+Math.sin(u*14)*.3*(1-q);g.z=sz+(z1-sz)*q;g.y=sy+(1.45-sy)*q+Math.sin(u*10)*.25;g.face=Math.atan2(x1-g.x,z1-g.z)}
   else{if(!g.carry){g.carry=victim;victim.dropT=null;BXfx&&BXfx.laugh&&BXfx.laugh(1)}var q2=ease((u-.52)/.48);g.x=x1+(x1+7-x1)*q2;g.z=z1+(z1-8-z1)*q2;g.y=1.45+(8.5-1.45)*q2+Math.sin(u*12)*.3;g.face=Math.PI*.8;victim.a=Math.max(0,1-q2*1.25);victim.sc=1-q2*.4;victim.rz=Math.sin(u*16)*.4*q2}
   return true})}
 var BXfx=opt.fx||null;
 /* move(m, prevBoard, nextBoard, opts) */
 function move(m,prevB,nextB,o){o=o||{};
  var mover=bysq[m.f],cap=bysq[m.t],capSq=m.t;
  if(!mover){setBoard(nextB);return}
  if(!cap&&prevB&&mover.ch.toLowerCase()==='p'&&(m.f&7)!==(m.t&7)){capSq=(m.f>>3)*8+(m.t&7);cap=bysq[capSq]}
  var xz=sqXZ(m.t),kn=mover.ch.toLowerCase()==='n',useGhost=!!(cap&&o.ghost),dur=.42,pre=useGhost?.62:0,total=pre+dur+.15;
  var rookP=null,rt=-1;
  if(mover.ch.toLowerCase()==='k'&&Math.abs((m.t&7)-(m.f&7))===2){var rf=(m.t>m.f)?m.f+3:m.f-4;rt=(m.t>m.f)?m.f+1:m.f-1;rookP=bysq[rf];if(rookP){bysq[rf]=null}}
  schedule(total+(useGhost?.7:0),function(){
   bysq[m.f]=null;mover.sq=m.t;
   if(cap){bysq[capSq]=null;if(useGhost){takeGhost(cap,0,1.5)}else{var c0=cap;tween(.3,function(u){c0.sc=1-u*.7;c0.a=1-u;c0.y=u*.6},function(){rm(c0)},dur*.75)}shake=Math.max(shake,.5);BXfx&&BXfx.cap&&BXfx.cap()}
   bysq[m.t]=mover;
   if(rookP){rookP.sq=rt;bysq[rt]=rookP;var rxz=sqXZ(rt);arc(rookP,rxz[0],rxz[1],dur,.3,pre)}
   arc(mover,xz[0],xz[1],dur,kn?1.1:.28,pre,function(){
    var np=nextB[m.t];if(np&&np!==mover.ch){mover.ch=np;mover.w=np===np.toUpperCase();var p0=mover;tween(.5,function(u){p0.sc=1+Math.sin(u*Math.PI)*.35;p0.glow=(1-u)*.6},function(){p0.sc=1;p0.glow=0})}
    shake=Math.max(shake,cap?.35:.08)})
  })}
 function sync(b){if(T<queueEnd){pending.push(b);return}setBoard(b)}
 acts.push(function(t){if(t>=queueEnd&&pending.length){var b=pending.pop();pending.length=0;if(!ghosts.length)setBoard(b)}return true});
 function kingFall(sq){var p=bysq[sq];if(!p)return;tween(.9,function(u){p.rz=ease(u)*1.45*(Math.sin(sq)>0?1:-1);p.y=-ease(u)*.12;p.x+=0},null,.4)}
 function flash(){flashT=T}
 /* ---------- Yamraj ---------- */
 function summon(on){
  if(on){if(yam&&!yam.leaving)return;var ry0=cam.az;yam={t0:T,x:-9,y:18,z:-12,a:0,sc:1.05,sv:[cam.tAz,cam.tEl,cam.tDist,cam.mode],ry:ry0,leaving:false,hover:true};
   var Y=yam;if(cam.mode!=='cine'){cam.tEl=.74;cam.tDist=cam.base*1.2}acts.push(function(t){if(Y!==yam&&!Y.leaving)return false;var u=t-Y.t0;
    if(Y.leaving){var v=(t-Y.lt)/1.4;Y.x+=.12;Y.y+=.35;Y.a=Math.max(0,1-v);if(v>=1){if(yam===Y)yam=null;return false}return true}
    var d=clamp(u/2.4,0,1),q=ease(d);Y.a=Math.min(1,u*1.2);Y.ry=cam.az*.5+Y.ry*.5;
    Y.x=-9*(1-q)+Math.sin(u*1.1)*.9*q;Y.y=18*(1-q)+(1.5)*q+Math.sin(u*2)*.12;Y.z=-12*(1-q)+(-3.6)*q+Math.cos(u*.9)*.4*q;
    if(d>=1&&!Y.laughed){Y.laughed=true;shake=Math.max(shake,.9);flash();opt.onYamLaugh&&opt.onYamLaugh()}
    return true})}
  else if(yam&&!yam.leaving){yam.leaving=true;yam.lt=T;var sv=yam.sv;if(sv&&sv[3]!=='free'&&sv[3]!=='cine'){cam.tEl=sv[1];cam.tDist=sv[2]}}}
 /* ---------- input ---------- */
 var ptr={},drag=null,pinch=0;
 function ray(px,py){var nx=px/W*2-1,ny=1-py/H*2,t=Math.tan(cam.fov/2),ex=cam.eye,tg=cam.tg;var f=[tg[0]-ex[0],tg[1]-ex[1],tg[2]-ex[2]],l=Math.hypot(f[0],f[1],f[2]);f=[f[0]/l,f[1]/l,f[2]/l];var r=[f[2],0,-f[0]],rl=Math.hypot(r[0],r[2]);r=[r[0]/rl,0,r[2]/rl];var u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
  var d=[f[0]+r[0]*nx*t*(W/H)+u[0]*ny*t,f[1]+r[1]*nx*t*(W/H)+u[1]*ny*t,f[2]+r[2]*nx*t*(W/H)+u[2]*ny*t];return function(py0){var s=(py0-ex[1])/d[1];return s>0?[ex[0]+d[0]*s,ex[2]+d[2]*s]:null}}
 function pickAt(cx,cy){var rc=cv.getBoundingClientRect(),R=ray(cx-rc.left,cy-rc.top),a=R(.1),b=R(.55);return[a?xzSq(a[0],a[1]):-1,b?xzSq(b[0],b[1]):-1]}
 cv.addEventListener('pointerdown',function(ev){ev.preventDefault();try{cv.setPointerCapture(ev.pointerId)}catch(_){}ptr[ev.pointerId]={x:ev.clientX,y:ev.clientY};drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:0,t:performance.now()};cam.drag=true;cv.focus&&cv.focus()});
 cv.addEventListener('pointermove',function(ev){var p=ptr[ev.pointerId];if(!p)return;var ids=Object.keys(ptr);if(ids.length===2){var o=ptr[ids.filter(function(k){return +k!==ev.pointerId})[0]],d0=Math.hypot(p.x-o.x,p.y-o.y),d1=Math.hypot(ev.clientX-o.x,ev.clientY-o.y);if(pinch){cam.tDist=clamp(cam.tDist*(d0/Math.max(20,d1)),cam.base*.55,cam.base*1.6);cam.mode='free'}pinch=1;p.x=ev.clientX;p.y=ev.clientY;if(drag)drag.moved=99;return}
  var dx=ev.clientX-p.x,dy=ev.clientY-p.y;p.x=ev.clientX;p.y=ev.clientY;if(drag&&drag.id===ev.pointerId){drag.moved+=Math.abs(dx)+Math.abs(dy);if(drag.moved>9){cam.tAz-=dx*.0085;cam.tEl=clamp(cam.tEl+dy*.006,.3,1.5);cam.mode='free';cam.az=cam.tAz;cam.el=cam.tEl}}});
 function up(ev){var d=drag;delete ptr[ev.pointerId];if(Object.keys(ptr).length<2)pinch=0;if(d&&d.id===ev.pointerId){cam.drag=false;drag=null;if(d.moved<=9&&ev.type==='pointerup'&&tapCb){var s=pickAt(ev.clientX,ev.clientY);tapCb(s)}}}
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',function(ev){ev.preventDefault();cam.tDist=clamp(cam.tDist*(1+ev.deltaY*.0012),cam.base*.55,cam.base*1.6);cam.mode='free'},{passive:false});
 function camMode(m){cam.mode=m;fit();var a0=flip?Math.PI:0;if(m==='player'){cam.tAz=a0;cam.tEl=.9;cam.tDist=cam.base}else if(m==='top'){cam.tAz=a0;cam.tEl=1.5;cam.tDist=cam.base*1.02}else if(m==='low'){cam.tAz=a0;cam.tEl=.5;cam.tDist=cam.base*.92}else if(m==='cine'){cam.tEl=.72;cam.tDist=cam.base*.95}else if(m==='side'){cam.tAz=a0+Math.PI/2;cam.tEl=.6;cam.tDist=cam.base*.95}}
 return{canvas:cv,setBoard:function(b,drop){setBoard(b,drop)},sync:sync,move:move,marks:function(m){marks=m},setFlip:function(f){flip=!!f;resetPos();camMode(cam.mode==='free'?'player':cam.mode)},theme:function(id){theme=THEMES[id]||theme},skin:function(id){skin=SKINS[id]||skin},camera:camMode,camMode:function(){return cam.mode},
  onTap:function(f){tapCb=f},summon:summon,hasYam:function(){return !!(yam&&!yam.leaving)},kingFall:kingFall,flash:flash,shake:function(v){shake=Math.max(shake,v)},busy:function(){return T<queueEnd||ghosts.length>0},
  project:function(sq,y){var xz=sqXZ(sq);return e.project([xz[0],y||1,xz[1]])},now:now,
  dispose:function(){dead=true;cancelAnimationFrame(raf);if(ro)ro.disconnect();root.removeEventListener('resize',resize);try{e.dispose()}catch(_){}cv.remove()},_cam:cam,_pcs:pcs}}
root.Chess3D={create:create,THEMES:THEMES,SKINS:SKINS};
})(window);
