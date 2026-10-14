/* Ludo: rules, provably-fair dice (hash-chain commit/reveal), bots and canvas UI */
(function(){
'use strict';
var $=BX.$,SHA=BX.sha,CHAIN_N=800;
/* ---- board geometry ---- */
var PATH=[];(function(){var a=function(c,r){PATH.push([c,r])},i;for(i=0;i<=5;i++)a(i,6);for(i=5;i>=0;i--)a(6,i);a(7,0);a(8,0);for(i=1;i<=5;i++)a(8,i);for(i=9;i<=14;i++)a(i,6);a(14,7);a(14,8);for(i=13;i>=9;i--)a(i,8);for(i=9;i<=14;i++)a(8,i);a(7,14);a(6,14);for(i=13;i>=9;i--)a(6,i);for(i=5;i>=0;i--)a(i,8);a(0,7)})();
var START=[1,14,27,40],SAFE={};[1,9,14,22,27,35,40,48].forEach(function(i){SAFE[i]=1});
var HOME=[[[1,7],[2,7],[3,7],[4,7],[5,7]],[[7,1],[7,2],[7,3],[7,4],[7,5]],[[13,7],[12,7],[11,7],[10,7],[9,7]],[[7,13],[7,12],[7,11],[7,10],[7,9]]];
var YARD=[[0,0],[9,0],[9,9],[0,9]],SLOT=[[1.5,1.5],[4.5,1.5],[1.5,4.5],[4.5,4.5]];
var LCOL=[{n:'Red',c:'#ef4444',d:'#991b1b',l:'#fecaca'},{n:'Green',c:'#22c55e',d:'#166534',l:'#bbf7d0'},{n:'Yellow',c:'#facc15',d:'#a16207',l:'#fef08a'},{n:'Blue',c:'#3b82f6',d:'#1e3a8a',l:'#bfdbfe'}];
function colorsFor(n){return n===2?[0,2]:n===3?[0,1,2]:[0,1,2,3]}
function idx(col,p){return(START[col]+p-1)%52}
function posOf(col,k,p){if(p===0){return[YARD[col][0]+SLOT[k][0],YARD[col][1]+SLOT[k][1]]}if(p<=51){var q=PATH[idx(col,p)];return[q[0]+.5,q[1]+.5]}if(p<=56){var h=HOME[col][p-52];return[h[0]+.5,h[1]+.5]}
 var c=[[6.1,7.5],[7.5,6.1],[8.9,7.5],[7.5,8.9]][col],o=[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]][k];return[c[0]+o[0],c[1]+o[1]]}
/* ---- rules ---- */
function init(seed,n){var cols=colorsFor(n),pcs=[],i;for(i=0;i<n;i++)pcs.push([0,0,0,0]);return{n:n,col:cols,pcs:pcs,turn:0,phase:'commit',dice:0,sixes:0,anchor:new Array(n).fill(null),last:new Array(n).fill(null),rolls:0,ev:null,done:null}}
function movable(s,seat,d){var o=[];for(var k=0;k<4;k++){var p=s.pcs[seat][k];if(p===0){if(d===6)o.push(k)}else if(p+d<=57)o.push(k)}return o}
function pass(s){s.turn=(s.turn+1)%s.n;s.phase='roll';s.dice=0;s.sixes=0}
function validate(s,seat,m){
 if(!m||typeof m.t!=='string')return'Bad move';
 if(s.phase==='commit'){if(m.t!=='c')return'Commit expected';if(s.anchor[seat])return'Already committed';if(typeof m.a!=='string'||!/^[0-9a-f]{64}$/.test(m.a))return'Bad commitment';return null}
 if(seat!==s.turn)return'Not your turn';
 if(s.phase==='roll'){if(m.t!=='r')return'Roll expected';if(typeof m.v!=='string'||!/^[0-9a-f]{64}$/.test(m.v))return'Bad reveal';
  return SHA(m.v).then(function(h){if(h!==s.last[seat])return'Dice reveal does not match the commitment (tampering)';
   var others=s.last.filter(function(x,i){return i!==seat}).join('');return SHA(m.v+'|'+others+'|'+s.rolls).then(function(h2){m._d=parseInt(h2.slice(0,8),16)%6+1;return null})})}
 if(s.phase==='move'){if(m.t!=='m')return'Move expected';if(!Number.isInteger(m.k)||m.k<0||m.k>3)return'Bad piece';return movable(s,seat,s.dice).indexOf(m.k)>=0?null:'Illegal piece for this dice'}
 return'Bad phase'}
function apply(s,seat,m){s.ev=null;
 if(s.phase==='commit'){s.anchor[seat]=m.a;s.last[seat]=m.a;if(s.anchor.every(Boolean)){s.phase='roll';s.turn=0}return}
 if(s.phase==='roll'){var d=m._d;s.last[seat]=m.v;s.rolls++;s.dice=d;s.ev={t:'roll',seat:seat,d:d};
  if(d===6){s.sixes++;if(s.sixes>=3){s.ev.triple=1;pass(s);return}}
  if(!movable(s,seat,d).length){s.ev.none=1;pass(s);return}s.phase='move';return}
 if(s.phase==='move'){var col=s.col[seat],p=s.pcs[seat][m.k],np=p===0?1:p+s.dice,cap=[],d2=s.dice;s.pcs[seat][m.k]=np;
  if(np<=51&&!SAFE[idx(col,np)]){var at=idx(col,np);for(var o=0;o<s.n;o++){if(o===seat)continue;for(var q=0;q<4;q++){var pp=s.pcs[o][q];if(pp>=1&&pp<=51&&idx(s.col[o],pp)===at){s.pcs[o][q]=0;cap.push([o,q])}}}}
  s.ev={t:'move',seat:seat,k:m.k,from:p,to:np,cap:cap,d:d2};
  if(s.pcs[seat].every(function(x){return x===57}))s.done={winner:seat};
  var extra=d2===6||cap.length||np===57;if(extra){s.phase='roll';s.dice=0}else pass(s)}}
function over(s){return s.done?{winner:s.done.winner,reason:'All four pieces reached home'}:null}
/* ---- fair dice chains (local, never sent except one reveal per roll) ---- */
var CH={};
async function mkChain(){var x=BX.rndHex(16),a=[x];for(var i=0;i<CHAIN_N;i++){x=await SHA(x);a.push(x)}return a}
async function chain(seat){if(!CH[seat])CH[seat]={a:await mkChain(),r:0};return CH[seat]}
function needs(s,seat){if(s.done)return false;if(s.phase==='commit')return!s.anchor[seat];return s.turn===seat}
/* ---- bot ---- */
function danger(s,seat,col,np){if(np>51||SAFE[idx(col,np)])return 0;var at=idx(col,np),r=0;for(var o=0;o<s.n;o++){if(o===seat)continue;for(var q=0;q<4;q++){var pp=s.pcs[o][q];if(pp>=1&&pp<=51){var oi=idx(s.col[o],pp),dist=(at-oi+52)%52;if(dist>=1&&dist<=6)r+=1/dist}}}return r}
async function bot(s,seat,lvl){
 if(s.phase==='commit'){var c=await chain(seat);return{t:'c',a:c.a[CHAIN_N]}}
 if(s.phase==='roll'){var c2=await chain(seat),v=c2.a[CHAIN_N-1-c2.r];c2.r++;return{t:'r',v:v}}
 var L=movable(s,seat,s.dice),col=s.col[seat];if(lvl<=0)return{t:'m',k:L[Math.floor(Math.random()*L.length)]};
 var best=-1e9,bk=L[0];L.forEach(function(k){var p=s.pcs[seat][k],np=p===0?1:p+s.dice,sc=Math.random();
  if(np===57)sc+=60;if(p===0)sc+=28;if(np>=52&&np<57)sc+=14;
  if(np<=51&&!SAFE[idx(col,np)]){var at=idx(col,np);for(var o=0;o<s.n;o++){if(o===seat)continue;for(var q=0;q<4;q++){var pp=s.pcs[o][q];if(pp>=1&&pp<=51&&idx(s.col[o],pp)===at)sc+=45+pp*.3}}}
  if(np<=51&&SAFE[idx(col,np)])sc+=10;sc+=np*.15;
  if(lvl>=2){sc-=danger(s,seat,col,np)*25;if(p>=1&&p<=51)sc+=danger(s,seat,col,p)*18}
  if(sc>best){best=sc;bk=k}});return{t:'m',k:bk}}
var DEF={init:init,validate:validate,apply:apply,needs:needs,over:over,bot:bot,botDelay:700,onResign:function(s,seat){return{winner:s.n===2?1-seat:-1,reason:'Resignation'}}};
/* ---- UI ---- */
var CSS='.ld-w{position:relative;width:var(--bs,min(94vw,560px));aspect-ratio:1;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 0 4px #1a2250;transform:rotateX(18deg);transform-origin:50% 80%;transition:transform .8s}.ld-w.flat{transform:none}.ld-w canvas{width:100%;height:100%;display:block;border-radius:18px;touch-action:manipulation}'+
'.ldice{position:absolute;left:50%;top:50%;width:11%;aspect-ratio:1;margin:-5.5% 0 0 -5.5%;perspective:400px;cursor:pointer;z-index:3}.ldice .cube{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 1s cubic-bezier(.15,.8,.2,1)}.ldice .f{position:absolute;inset:0;background:linear-gradient(145deg,#fff,#d9deea);border-radius:18%;display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);padding:14%;box-shadow:inset 0 0 8px rgba(0,0,0,.25);backface-visibility:hidden}.ldice .f i{border-radius:50%;margin:12%}.ldice .f i.on{background:radial-gradient(circle at 35% 30%,#555,#000)}'+
'.ldice.act{animation:ldp 1s ease-in-out infinite}@keyframes ldp{50%{transform:scale(1.18);filter:drop-shadow(0 0 14px #ffc857)}}.ldice .f1{transform:translateZ(var(--h))}.ldice .f6{transform:rotateY(180deg) translateZ(var(--h))}.ldice .f3{transform:rotateY(90deg) translateZ(var(--h))}.ldice .f4{transform:rotateY(-90deg) translateZ(var(--h))}.ldice .f2{transform:rotateX(90deg) translateZ(var(--h))}.ldice .f5{transform:rotateX(-90deg) translateZ(var(--h))}';
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
var PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
var ROT={1:[0,0],6:[0,180],3:[0,-90],4:[0,90],2:[-90,0],5:[90,0]};
var root=$('#app'),G=null,RAF=0;
function lobby(){cancelAnimationFrame(RAF);if(G){G.dispose();G=null}document.querySelectorAll('.bx-over').forEach(function(x){x.remove()});
 BX.lobby(root,{game:'ludo',alt:false,minP:2,maxP:4,note:'Dice are provably fair. Before the game every player commits to a secret hash chain; each roll reveals one link, which everyone verifies against that commitment and mixes with the other players’ latest links. Nobody (including the roller) can choose or re-roll a number. Piece moves are checked by every browser against the full rules, and illegal or edited moves void the game. No server referee exists, so the protection is peer-to-peer.',botNames:['Computer','Computer 2','Computer 3'],onStart:start})}
function start(sess){
 CH={};var n=sess.seats.length,cols=colorsFor(n),mine=sess.mode==='online'?[sess.me]:sess.seats.map(function(s,i){return s.bot?-1:i}).filter(function(i){return i>=0});
 var F=BX.frame(root,{seats:sess.seats,me:sess.me,mode:sess.mode,noMoves:true,colors:cols.map(function(c){return LCOL[c].c}),sub:cols.map(function(c){return LCOL[c].n}),onLeave:lobby,onResign:function(){G.resign()}});
 F.stage.innerHTML='<div class="ld-w" id="ldw"><canvas id="ldc"></canvas><div class="ldice" id="ldd"><div class="cube" id="ldq"></div></div></div>';
 var W=$('#ldw'),cv=$('#ldc'),x=cv.getContext('2d'),dd=$('#ldd'),cube=$('#ldq'),SZ=0,dpr=Math.min(2,window.devicePixelRatio||1);
 for(var f=1;f<=6;f++){var fc=document.createElement('div');fc.className='f f'+f;for(var q=0;q<9;q++){var i2=document.createElement('i');if(PIPS[f].indexOf(q)>=0)i2.className='on';fc.appendChild(i2)}cube.appendChild(fc)}
 function fit(){var r=W.getBoundingClientRect();SZ=Math.round(r.width);cv.width=SZ*dpr;cv.height=SZ*dpr;cube.style.setProperty('--h',(SZ*.11/2)+'px');dd.style.setProperty('--h',(SZ*.11/2)+'px');bg=null}
 var bg=null,ro=new ResizeObserver(fit);ro.observe(W);
 var spin=0;function showDice(v,anim){var a=ROT[v],t=anim?(spin+=1):spin;cube.style.transform='rotateX('+(a[0]+360*(anim?3:0)*1)+'deg) rotateY('+(a[1]+360*(anim?3:0))+'deg)';if(anim){cube.style.transition='none';cube.style.transform='rotateX(0) rotateY(0)';void cube.offsetWidth;cube.style.transition='transform 1s cubic-bezier(.15,.8,.2,1)';cube.style.transform='rotateX('+(a[0]+1080)+'deg) rotateY('+(a[1]+1080)+'deg)'}}
 showDice(1,false);
 /* piece visuals */
 var vis=[];function placeAll(s){vis=s.pcs.map(function(a,sd){return a.map(function(p,k){var q=posOf(s.col[sd],k,p);return{x:q[0],y:q[1],z:0,queue:[]}})})}
 var cellOcc={};
 /* drawing */
 function drawBoard(){var c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;var g=c.getContext('2d'),u=c.width/15;g.scale(u,u);
  var gr=g.createLinearGradient(0,0,15,15);gr.addColorStop(0,'#fdf6e3');gr.addColorStop(1,'#efe3c3');g.fillStyle=gr;g.fillRect(0,0,15,15);
  for(var cI=0;cI<4;cI++){var C=LCOL[cI],o=YARD[cI];var yg=g.createLinearGradient(o[0],o[1],o[0]+6,o[1]+6);yg.addColorStop(0,C.c);yg.addColorStop(1,C.d);g.fillStyle=yg;g.fillRect(o[0],o[1],6,6);g.fillStyle='rgba(255,255,255,.88)';rr(g,o[0]+.9,o[1]+.9,4.2,4.2,.5);g.fill();
   SLOT.forEach(function(sl){g.fillStyle=C.l;g.beginPath();g.arc(o[0]+sl[0],o[1]+sl[1],.62,0,6.283);g.fill();g.strokeStyle=C.d;g.lineWidth=.07;g.stroke()})}
  g.lineWidth=.04;PATH.forEach(function(p,i){g.fillStyle='#fff';g.fillRect(p[0],p[1],1,1);g.strokeStyle='#c9bd9b';g.strokeRect(p[0],p[1],1,1)});
  for(var h=0;h<4;h++){g.fillStyle=LCOL[h].c;HOME[h].forEach(function(p){g.fillRect(p[0],p[1],1,1);g.strokeStyle='rgba(0,0,0,.25)';g.strokeRect(p[0],p[1],1,1)});var sp=PATH[START[h]];g.fillStyle=LCOL[h].c;g.fillRect(sp[0],sp[1],1,1);g.strokeStyle='rgba(0,0,0,.25)';g.strokeRect(sp[0],sp[1],1,1)}
  [9,22,35,48].forEach(function(i){var p=PATH[i];star(g,p[0]+.5,p[1]+.5,.34,'#9a8b60')});[1,14,27,40].forEach(function(i){var p=PATH[i];star(g,p[0]+.5,p[1]+.5,.3,'#fff')});
  var tri=[[[6,6],[9,6],[7.5,7.5]],[[9,6],[9,9],[7.5,7.5]],[[9,9],[6,9],[7.5,7.5]],[[6,9],[6,6],[7.5,7.5]]],tc=[0,1,2,3];
  var order=[3,1,2,0];// left=red(0), top=green, right=yellow, bottom=blue
  var ts=[[[6,6],[6,9],[7.5,7.5]],[[6,6],[9,6],[7.5,7.5]],[[9,6],[9,9],[7.5,7.5]],[[6,9],[9,9],[7.5,7.5]]];
  ts.forEach(function(t,i){g.fillStyle=LCOL[i].c;g.beginPath();g.moveTo(t[0][0],t[0][1]);g.lineTo(t[1][0],t[1][1]);g.lineTo(t[2][0],t[2][1]);g.closePath();g.fill();g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=.05;g.stroke()});
  return c}
 function rr(g,x0,y0,w,h,r){g.beginPath();g.moveTo(x0+r,y0);g.arcTo(x0+w,y0,x0+w,y0+h,r);g.arcTo(x0+w,y0+h,x0,y0+h,r);g.arcTo(x0,y0+h,x0,y0,r);g.arcTo(x0,y0,x0+w,y0,r);g.closePath()}
 function star(g,cx,cy,r,col){g.fillStyle=col;g.beginPath();for(var i=0;i<10;i++){var a=-1.5708+i*.6283,rad=i%2?r*.45:r;g.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad)}g.closePath();g.fill()}
 var parts=[];function burst(px,py,col){for(var i=0;i<18;i++)parts.push({x:px,y:py,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25-.05,l:1,c:col})}
 var tStart=performance.now();
 function frame(t){RAF=requestAnimationFrame(frame);if(!SZ)return;var s=G&&G.state;if(!s)return;if(!bg)bg=drawBoard();
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);x.drawImage(bg,0,0);var u=cv.width/15;x.setTransform(u,0,0,u,0,0);
  /* animate queues */
  vis.forEach(function(a){a.forEach(function(v){if(v.queue.length){var tgt=v.queue[0],dx=tgt.x-v.x,dy=tgt.y-v.y,dist=Math.hypot(dx,dy),sp=tgt.fast?.9:.38;if(dist<sp){v.x=tgt.x;v.y=tgt.y;v.queue.shift();if(tgt.sfx)BX.sfx.tick();if(tgt.burst)burst(tgt.x,tgt.y,tgt.col)}else{v.x+=dx/dist*sp;v.y+=dy/dist*sp}v.z=Math.sin(Math.min(1,1-dist/Math.max(dist,.01))*3.14)*0+.3*Math.min(1,dist)}else v.z=0})});
  /* group by cell for offset */
  var occ={};vis.forEach(function(a,sd){a.forEach(function(v,k){if(s.pcs[sd][k]===0||s.pcs[sd][k]===57)return;var key=Math.round(v.x*2)+','+Math.round(v.y*2);(occ[key]=occ[key]||[]).push([sd,k])})});
  var list=[];vis.forEach(function(a,sd){a.forEach(function(v,k){var ox=0,oy=0,p=s.pcs[sd][k];var key=Math.round(v.x*2)+','+Math.round(v.y*2),g2=occ[key];if(g2&&g2.length>1){var i3=g2.findIndex(function(z){return z[0]===sd&&z[1]===k});var ang=i3/g2.length*6.283;ox=Math.cos(ang)*.2;oy=Math.sin(ang)*.2}list.push({sd:sd,k:k,x:v.x+ox,y:v.y+oy,z:v.z,p:p})})});
  list.sort(function(a,b){return a.y-b.y});
  var movK=(G&&!G.over&&s.phase==='move'&&mine.indexOf(s.turn)>=0)?movable(s,s.turn,s.dice):[];
  list.forEach(function(it){var C=LCOL[s.col[it.sd]],r=.42,lift=it.z;x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(it.x+.05,it.y+.28,.34,.14,0,0,6.283);x.fill();
   var py=it.y-lift-.05;
   var can=movK.length&&it.sd===s.turn&&movK.indexOf(it.k)>=0;if(can){var pu=.5+.5*Math.sin(t/180);x.strokeStyle='rgba(255,255,255,'+(.5+.5*pu)+')';x.lineWidth=.1;x.beginPath();x.arc(it.x,py,r+.08+pu*.08,0,6.283);x.stroke();py-=pu*.08}
   var gr=x.createRadialGradient(it.x-.14,py-.16,.03,it.x,py,r);gr.addColorStop(0,C.l);gr.addColorStop(.35,C.c);gr.addColorStop(1,C.d);x.fillStyle=gr;x.beginPath();x.arc(it.x,py,r,0,6.283);x.fill();x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=.045;x.stroke();
   x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.ellipse(it.x-.13,py-.2,.12,.07,-.6,0,6.283);x.fill();x.fillStyle=C.d;x.beginPath();x.arc(it.x,py,.13,0,6.283);x.fill();x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.arc(it.x-.03,py-.03,.05,0,6.283);x.fill()});
  parts=parts.filter(function(p){p.l-=.03;p.x+=p.vx;p.y+=p.vy;x.fillStyle=p.c;x.globalAlpha=Math.max(0,p.l);x.beginPath();x.arc(p.x,p.y,.09,0,6.283);x.fill();x.globalAlpha=1;return p.l>0});
  /* turn ring around dice */
  if(!s.done){var col=LCOL[s.col[s.turn]].c;x.strokeStyle=col;x.lineWidth=.12;x.globalAlpha=.6+.4*Math.sin(t/260);x.beginPath();x.arc(7.5,7.5,1.28,0,6.283);x.stroke();x.globalAlpha=1}}
 function sync(s,ev){if(!ev||ev.t!=='move'){return}var v=vis[ev.seat][ev.k],col=s.col[ev.seat],path=[];
  if(ev.from===0){var q=posOf(col,ev.k,1);path.push({x:q[0],y:q[1],sfx:1,fast:1})}else for(var p=ev.from+1;p<=ev.to;p++){var q2=posOf(col,ev.k,p);path.push({x:q2[0],y:q2[1],sfx:1})}
  v.queue=path;ev.cap.forEach(function(c){var tv=vis[c[0]][c[1]],bp=posOf(s.col[c[0]],c[1],0);tv.queue=[{x:tv.x,y:tv.y},{x:bp[0],y:bp[1],fast:1,burst:1,col:LCOL[s.col[c[0]]].c}];BX.sfx.cap()});
  if(ev.to===57)setTimeout(function(){BX.sfx.good()},path.length*180)}
 function turnUI(s){if(s.phase==='commit'){F.status('Securing fair dice… 🔐');return}var seat=s.turn;F.act(seat);
  var cnt=s.pcs.map(function(a){return a.filter(function(p){return p===57}).length});cnt.forEach(function(c,i){F.sc(i,'🏠'+c)});
  var me=mine.indexOf(seat)>=0,nm=sess.seats[seat].name,hot=(s.phase==='roll'&&me);
  F.status(s.done?'':(me?(sess.mode==='local'?nm+': ':'')+(s.phase==='roll'?'🎲 Tap the dice to roll':'👉 Choose a piece to move'):'⏳ '+nm+(s.phase==='roll'?' is rolling…':' is choosing…')));
  dd.classList.toggle('act',hot&&!G.over);F.ver(G.verified)}
 var pendingAuto=0;
 G=new BX.Game(DEF,sess,{
  onMove:function(s,info){var ev=s.ev;
   if(ev&&ev.t==='roll'){showDice(ev.d,true);BX.sfx.tick();setTimeout(function(){BX.sfx.good&&0},900);
    if(ev.triple)F.status('😬 Three sixes! Turn lost');else if(ev.none)F.status('No move possible with '+ev.d)}
   if(ev&&ev.t==='move')sync(s,ev);
   if(ev&&ev.t==='move'&&ev.cap.length&&info.seat!==undefined)F.botReact('bad');
   turnUI(s);autoPlay(s)},
  onTurn:function(s){if(!vis.length)placeAll(s);turnUI(s)},
  onReject:function(){setTimeout(commitAll,500)},
  onOver:function(r){F.status('<b>'+(r.cheat?'Game void':sess.seats[r.winner]?sess.seats[r.winner].name+' wins!':'Draw')+'</b>');var good=r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me);var t=r.cheat?'Game void':r.winner<0?'Game over':(sess.mode==='online'?(r.winner===sess.me?'You win! 🏆':sess.seats[r.winner].name+' wins'):sess.seats[r.winner].name+' wins!');BX.sfx[good?'good':'bad']();setTimeout(function(){F.over(t,r.reason,good)},900)}});
 placeAll(G.state);RAF=requestAnimationFrame(frame);fit();
 async function commitAll(){for(var i=0;i<mine.length;i++){var sd=mine[i];if(G.over||G.state.anchor[sd])continue;var c=await chain(sd);await G.submit({t:'c',a:c.a[CHAIN_N]},sd)}}
 commitAll();
 function autoPlay(s){clearTimeout(pendingAuto);if(G.over||s.phase!=='move')return;var sd=s.turn;if(mine.indexOf(sd)<0)return;var L=movable(s,sd,s.dice);if(L.length===1)pendingAuto=setTimeout(function(){if(!G.over&&G.state.phase==='move'&&G.state.turn===sd)G.submit({t:'m',k:L[0]},sd)},900)}
 async function rollNow(){var s=G.state;if(G.over||G.pending||s.phase!=='roll'||mine.indexOf(s.turn)<0)return;var sd=s.turn,c=await chain(sd),v=c.a[CHAIN_N-1-c.r];c.r++;G.submit({t:'r',v:v},sd)}
 dd.addEventListener('click',rollNow);
 function pick(e){var s=G.state;if(G.over||G.pending||s.phase!=='move'||mine.indexOf(s.turn)<0)return;var px=e.offsetX/cv.clientWidth*15,py=e.offsetY/cv.clientHeight*15,L=movable(s,s.turn,s.dice),best=-1,bd=1.1;
  L.forEach(function(k){var v=vis[s.turn][k],d=Math.hypot(v.x-px,v.y-py);if(d<bd){bd=d;best=k}});if(best>=0){clearTimeout(pendingAuto);G.submit({t:'m',k:best},s.turn)}}
 cv.addEventListener('click',pick);
 var b3=document.createElement('button');b3.className='on';b3.textContent='3D tilt';b3.onclick=function(){W.classList.toggle('flat');b3.classList.toggle('on')};F.tools.appendChild(b3);
 window.__ludo={G:G,rollNow:rollNow,vis:function(){return vis},movable:movable,tapPiece:function(k){var s=G.state;G.submit({t:'m',k:k},s.turn)}};
}
lobby();
})();
