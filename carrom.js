/* Carrom: deterministic physics (only + - * / sqrt, literal constants), rules, bot and canvas UI */
(function(){
'use strict';
var $=BX.$;
var RC=19,RS=25,DT=1/240,PR=46,POCK=[[30,30],[970,30],[30,970],[970,970]],YB=[840,160],XMIN=160,XMAX=840;
var D12=[[1,0],[.8660254037844386,.5],[.5,.8660254037844386],[0,1],[-.5,.8660254037844386],[-.8660254037844386,.5],[-1,0],[-.8660254037844386,-.5],[-.5,-.8660254037844386],[0,-1],[.5,-.8660254037844386],[.8660254037844386,-.5]];
var CENTERS=[[500,500],[500,458],[500,542],[458,500],[542,500],[458,458],[542,458],[458,542],[542,542],[500,416],[500,584],[416,500],[584,500]];
function init(){var c=[{x:500,y:500,t:2,in:0}],k,j;for(k=0;k<6;k++)c.push({x:500+D12[2*k][0]*38.4,y:500+D12[2*k][1]*38.4,t:k%2,in:0});
 for(j=0;j<12;j++){var al=j%2===0,d=D12[j],r=al?76.8:66.5;c.push({x:500+d[0]*r,y:500+d[1]*r,t:(j>>1)%2===0?(al?0:1):(al?1:0),in:0})}
 var w=0,b=0;c.forEach(function(q){if(q.t===0)w++;if(q.t===1)b++});
 /* make exactly 9/9 */ if(w!==9||b!==9){c.forEach(function(q,i){if(i>6)q.t=(i%2)})}
 return{coins:c,turn:0,got:[[],[]],pend:0,qowner:-1,done:null,anim:null,ev:null,shots:0}}
function simulate(s,shot,rec){var P=[],i,j,pot=[],steps=0,quiet=0,frames=rec?[]:null,evs=rec?[]:null,sIn=false;
 s.coins.forEach(function(c,id){P.push({id:id,x:c.x,y:c.y,vx:0,vy:0,r:RC,m:1,in:c.in})});
 var S={id:19,x:shot.x,y:shot.y,vx:shot.vx,vy:shot.vy,r:RS,m:2.4,in:0};P.push(S);
 while(steps<6000){steps++;var moving=false;
  for(i=0;i<20;i++){var p=P[i];if(p.in)continue;p.x+=p.vx*DT;p.y+=p.vy*DT;var f=1-1.6*DT;p.vx*=f;p.vy*=f;if(p.vx*p.vx+p.vy*p.vy<64){p.vx=0;p.vy=0}else moving=true;
   if(p.x<p.r){p.x=p.r;if(p.vx<0)p.vx=-p.vx*.8}if(p.x>1000-p.r){p.x=1000-p.r;if(p.vx>0)p.vx=-p.vx*.8}if(p.y<p.r){p.y=p.r;if(p.vy<0)p.vy=-p.vy*.8}if(p.y>1000-p.r){p.y=1000-p.r;if(p.vy>0)p.vy=-p.vy*.8}}
  for(i=0;i<20;i++){var a=P[i];if(a.in)continue;for(j=i+1;j<20;j++){var b=P[j];if(b.in)continue;var dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,rs=a.r+b.r;if(d2<rs*rs&&d2>1e-9){var d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=rs-d,tm=a.m+b.m;a.x-=nx*ov*b.m/tm;a.y-=ny*ov*b.m/tm;b.x+=nx*ov*a.m/tm;b.y+=ny*ov*a.m/tm;
     var rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){var im=-(1.9)*rv/(1/a.m+1/b.m);a.vx-=im*nx/a.m;a.vy-=im*ny/a.m;b.vx+=im*nx/b.m;b.vy+=im*ny/b.m;if(evs&&evs.length<80)evs.push([frames.length,-rv])}}}}
  for(i=0;i<20;i++){var q=P[i];if(q.in)continue;for(j=0;j<4;j++){var px=q.x-POCK[j][0],py=q.y-POCK[j][1];if(px*px+py*py<PR*PR){q.in=1;q.vx=0;q.vy=0;if(q.id===19)sIn=true;else pot.push(q.id);if(evs&&evs.length<80)evs.push([frames.length,-1]);break}}}
  if(rec&&steps%4===0){var fr=new Float32Array(40);for(i=0;i<20;i++){fr[i*2]=P[i].in?-1:P[i].x;fr[i*2+1]=P[i].y}frames.push(fr)}
  if(!moving){if(++quiet>=20)break}else quiet=0}
 return{P:P,pot:pot,sIn:sIn,frames:frames,evs:evs}}
function freeSpot(s,skip){for(var k=0;k<CENTERS.length;k++){var c=CENTERS[k],ok=true;for(var i=0;i<s.coins.length;i++){var o=s.coins[i];if(o.in||i===skip)continue;var dx=o.x-c[0],dy=o.y-c[1];if(dx*dx+dy*dy<(2*RC+1)*(2*RC+1)){ok=false;break}}if(ok)return c}return CENTERS[0]}
function ret(s,id){var c=freeSpot(s,id),o=s.coins[id];o.x=c[0];o.y=c[1];o.in=0}
function validate(s,seat,m){if(s.done)return'Game over';if(seat!==s.turn)return'Not your turn';if(!m||m.t!=='s')return'Shot expected';
 if(!Number.isInteger(m.x)||!Number.isInteger(m.dx)||!Number.isInteger(m.dy))return'Bad shot';if(m.x<XMIN||m.x>XMAX)return'Striker outside baseline';var L=m.dx*m.dx+m.dy*m.dy;if(L>1000000)return'Shot too powerful';if(L<2500)return'Shot too weak';
 for(var i=0;i<s.coins.length;i++){var c=s.coins[i];if(c.in)continue;var dx=c.x-m.x,dy=c.y-YB[seat];if(dx*dx+dy*dy<(RC+RS)*(RC+RS))return'Striker overlaps a coin'}return null}
function apply(s,seat,m){var r=simulate(s,{x:m.x,y:YB[seat],vx:m.dx*3,vy:m.dy*3},true);s.shots++;
 r.P.forEach(function(p){if(p.id<19){var c=s.coins[p.id];c.x=p.x;c.y=p.y;if(p.in)c.in=1}});
 var own=seat,oppT=1-seat,foul=r.sIn,ownPot=[],oppPot=[],queen=false;
 r.pot.forEach(function(id){var t=s.coins[id].t;if(t===own)ownPot.push(id);else if(t===oppT)oppPot.push(id);else queen=true});
 var ev={seat:seat,pot:r.pot.slice(),foul:foul,own:ownPot.length,opp:oppPot.length,queen:false,qret:false,frames:r.frames,evs:r.evs,msg:''};
 /* pending queen cover from the previous shot of this seat */
 if(s.pend===seat+1){if(ownPot.length&&!foul){s.qowner=seat;s.pend=0;ev.msg='Queen covered! +3'}else{ret(s,0);s.pend=0;ev.qret=true;ev.msg='Queen not covered, back to centre'}}
 ownPot.forEach(function(id){s.got[seat].push(id)});oppPot.forEach(function(id){s.got[oppT].push(id)});
 if(queen){if(foul){ret(s,0);ev.qret=true;ev.msg='Foul, queen returned'}else if(ownPot.length){s.qowner=seat;ev.queen=true;ev.msg='Queen pocketed and covered! +3'}else{s.pend=seat+1;ev.queen=true;ev.msg='Queen pocketed. Cover it now!'}}
 if(foul){var back=s.got[seat].filter(function(id){return s.coins[id].t===own}).pop();if(back!=null){s.got[seat]=s.got[seat].filter(function(id){return id!==back});ret(s,back);ev.msg=(ev.msg?ev.msg+' ':'')+'Foul: striker pocketed, one coin returned'}else ev.msg=(ev.msg?ev.msg+' ':'')+'Foul: striker pocketed'}
 /* last-coin rule: cannot win before the queen is taken */
 var mine=s.got[seat].filter(function(id){return s.coins[id].t===own}).length;if(mine===9&&s.qowner<0&&s.pend===0){var last=s.got[seat].filter(function(id){return s.coins[id].t===own}).pop();s.got[seat]=s.got[seat].filter(function(id){return id!==last});ret(s,last);ev.msg+=' Last coin returned: take the queen first'}
 var cnt=[0,1].map(function(sd){return s.got[sd].filter(function(id){return s.coins[id].t===sd}).length});
 [0,1].forEach(function(sd){if(cnt[sd]===9&&s.qowner>=0&&!s.done)s.done={winner:sd}});
 var cont=!foul&&(ownPot.length>0||s.pend===seat+1);if(!cont)s.turn=1-seat;s.ev=ev;s.anim=r.frames}
function score(s,sd){var n=s.got[sd].filter(function(id){return s.coins[id].t===sd}).length;return n+(s.qowner===sd?3:0)}
function over(s){return s.done?{winner:s.done.winner,reason:'All coins pocketed and the queen taken'}:null}
function needs(s,seat){return!s.done&&s.turn===seat}
function clone(s){return{coins:s.coins.map(function(c){return{x:c.x,y:c.y,t:c.t,in:c.in}}),turn:s.turn,got:[s.got[0].slice(),s.got[1].slice()],pend:s.pend,qowner:s.qowner,done:null,anim:null,ev:null,shots:s.shots}}
var animEnd=0;
function evalShot(s,seat,m){var t=clone(s),r=simulate(t,{x:m.x,y:YB[seat],vx:m.dx*3,vy:m.dy*3},false),sc=0;
 r.pot.forEach(function(id){var tt=s.coins[id].t;if(tt===seat)sc+=10;else if(tt===1-seat)sc-=7;else sc+=(s.pend===seat+1?12:5)});if(r.sIn)sc-=16;
 if(r.pot.length===0){var best=1e9;t.coins.forEach(function(c){if(c.in||c.t!==seat)return;POCK.forEach(function(p){var dx=c.x-p[0],dy=c.y-p[1],d=Math.sqrt(dx*dx+dy*dy);if(d<best)best=d})});sc-=best*.004}return sc}
function bot(s,seat,lvl){return new Promise(function(res){
 var cands=[],rnd=function(a,b){return a+Math.random()*(b-a)};
 function mk(x,dx,dy){var l=Math.sqrt(dx*dx+dy*dy)||1,p=Math.min(1000,l);return{t:'s',x:Math.round(x),dx:Math.round(dx/l*p),dy:Math.round(dy/l*p)}}
 var sx0=rnd(XMIN+40,XMAX-40);if(lvl<=0){var m0=mk(sx0,rnd(-300,300),(seat===0?-1:1)*rnd(300,900));if(validate(s,seat,m0))m0=mk(500,0,seat===0?-700:700);return res(m0)}
 var targets=s.coins.filter(function(c){return!c.in&&(c.t===seat||c.t===2)});
 var N=lvl===1?10:26,tries=0;
 while(cands.length<N&&tries++<200){var c=targets[Math.floor(Math.random()*targets.length)],p=POCK[Math.floor(Math.random()*4)],sx=rnd(XMIN,XMAX);
  var dx=c.x-p[0],dy=c.y-p[1],d=Math.sqrt(dx*dx+dy*dy)||1;var gx=c.x+dx/d*(RC+RS-2),gy=c.y+dy/d*(RC+RS-2);var sy=YB[seat];var vx=gx-sx,vy=gy-sy;
  if((seat===0&&vy>-20)||(seat===1&&vy<20))continue;var pw=rnd(360,lvl===1?900:760)*(0.55+Math.sqrt(vx*vx+vy*vy)/1400);var m=mk(sx,vx,vy);var l=Math.sqrt(vx*vx+vy*vy);m.dx=Math.round(vx/l*Math.min(1000,pw));m.dy=Math.round(vy/l*Math.min(1000,pw));if(!validate(s,seat,m))cands.push(m)}
 if(!cands.length)cands.push(mk(500,0,seat===0?-800:800));
 var best=null,bs=-1e9;cands.forEach(function(m){var v=evalShot(s,seat,m)+Math.random()*(lvl===1?4:.8);if(v>bs){bs=v;best=m}});res(best)})}
var DEF={init:init,validate:validate,apply:apply,needs:needs,over:over,bot:bot,get botDelay(){return Math.max(700,animEnd-performance.now()+500)},onResign:function(s,seat){return{winner:1-seat,reason:'Resignation'}}};
var CSS='.cr-w{position:relative;width:var(--bs,min(94vw,560px));aspect-ratio:1;touch-action:none}.cr-w canvas{width:100%;height:100%;display:block;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);touch-action:none}.cr-sl{position:absolute;left:11%;right:11%;bottom:1.4%;width:78%;height:5.5%;-webkit-appearance:none;appearance:none;background:transparent;margin:0;z-index:2}.cr-sl::-webkit-slider-runnable-track{height:5px;border-radius:4px;background:rgba(255,255,255,.3)}.cr-sl::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;margin-top:-10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#6ec1ff);box-shadow:0 2px 8px rgba(0,0,0,.5);border:2px solid #fff}.cr-sl::-moz-range-track{height:5px;border-radius:4px;background:rgba(255,255,255,.3)}.cr-sl::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#6ec1ff;border:2px solid #fff}.cr-sl.flip{transform:scaleX(-1)}.cr-sl[hidden]{display:none}.cr-hint{position:absolute;left:0;right:0;top:46%;text-align:center;font-weight:700;color:#fff;text-shadow:0 2px 8px #000;pointer-events:none;opacity:0;transition:opacity .4s;font-size:clamp(14px,3.4vw,22px)}.cr-hint.on{opacity:1}';
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
var root=$('#app'),G=null,RAF=0;
function lobby(){cancelAnimationFrame(RAF);if(G){G.dispose();G=null}document.querySelectorAll('.bx-over').forEach(function(x){x.remove()});
 BX.lobby(root,{game:'carrom',alt:false,maxP:2,note:'The physics is fully deterministic: a shot is just three whole numbers (striker position, direction, power) and every browser re-simulates it to get the identical board. Power is capped and the striker must start on your baseline, so nobody can teleport coins or hit harder than allowed. Edited shots are rejected. No server referee exists, so protection is peer-to-peer.',botNames:['Computer'],onStart:start})}
function start(sess){
 var mine=sess.mode==='online'?[sess.me]:sess.seats.map(function(s,i){return s.bot?-1:i}).filter(function(i){return i>=0});animEnd=0;
 var F=BX.frame(root,{seats:sess.seats,me:sess.me,mode:sess.mode,noMoves:true,colors:['#f3e9d2','#6b6b78'],sub:['⚪ White','⚫ Black'],onLeave:lobby,onResign:function(){G.resign()}});
 F.stage.innerHTML='<div class="cr-w" id="crw"><canvas id="crc"></canvas><input class="cr-sl" id="crs" type="range" min="'+XMIN+'" max="'+XMAX+'" step="1" value="500" aria-label="Move striker"><div class="cr-hint" id="crh"></div></div>';
 var W=$('#crw'),cv=$('#crc'),x=cv.getContext('2d'),sl=$('#crs'),hint=$('#crh'),SZ=0,dpr=Math.min(2,window.devicePixelRatio||1),bg=null,aim=null,sx=500,disp=null,frameIdx=-1,animFrames=null,ctr=0,msgT=0;
 function viewSeat(){return sess.mode==='online'?sess.me:sess.mode==='local'?G.state.turn:0}
 function flip(){return viewSeat()===1}
 function fit(){var r=W.getBoundingClientRect();SZ=Math.round(r.width);cv.width=SZ*dpr;cv.height=SZ*dpr;bg=null}
 var ro=new ResizeObserver(fit);ro.observe(W);
 function drawBoard(){var c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;var g=c.getContext('2d'),u=c.width/1000;g.scale(u,u);
  var fr=g.createLinearGradient(0,0,1000,1000);fr.addColorStop(0,'#6b4423');fr.addColorStop(.5,'#8a5a2f');fr.addColorStop(1,'#5a371b');g.fillStyle=fr;g.fillRect(0,0,1000,1000);
  var pl=g.createRadialGradient(500,480,60,500,500,720);pl.addColorStop(0,'#f6dfae');pl.addColorStop(1,'#d9b072');g.fillStyle=pl;g.fillRect(34,34,932,932);g.strokeStyle='#4a2c12';g.lineWidth=6;g.strokeRect(34,34,932,932);
  g.strokeStyle='rgba(120,70,30,.55)';g.lineWidth=3;[[YB[0]],[YB[1]]].forEach(function(b){var y=b[0];g.beginPath();g.moveTo(140,y-26);g.lineTo(860,y-26);g.moveTo(140,y+26);g.lineTo(860,y+26);g.stroke();[140,860].forEach(function(xx){g.beginPath();g.arc(xx,y,26,0,6.283);g.fillStyle='#c0392b';g.fill();g.stroke()})});
  g.beginPath();g.arc(500,500,90,0,6.283);g.stroke();g.beginPath();g.arc(500,500,28,0,6.283);g.fillStyle='rgba(192,57,43,.5)';g.fill();g.stroke();g.beginPath();g.arc(500,500,160,0,6.283);g.setLineDash([8,10]);g.stroke();g.setLineDash([]);
  [[110,110,1],[890,110,-1],[110,890,-1],[890,890,1]].forEach(function(a){g.beginPath();g.moveTo(34,34);});
  [[0,0],[1,0],[0,1],[1,1]].forEach(function(q,i){var px=POCK[i][0],py=POCK[i][1],gr=g.createRadialGradient(px,py,6,px,py,PR+8);gr.addColorStop(0,'#000');gr.addColorStop(.75,'#1a1109');gr.addColorStop(1,'#3b2411');g.fillStyle=gr;g.beginPath();g.arc(px,py,PR+8,0,6.283);g.fill();g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.stroke()});
  return c}
 function coinCol(t){return t===0?['#fffaf0','#e8dcc0','#b8a888']:t===1?['#6a6a78','#262630','#0c0c12']:['#ff7a8a','#d1243a','#7d0f1f']}
 function disc(g,px,py,r,cols,glossy){g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(px+4,py+6,r,r*.92,0,0,6.283);g.fill();var gr=g.createRadialGradient(px-r*.35,py-r*.4,r*.1,px,py,r);gr.addColorStop(0,cols[0]);gr.addColorStop(.55,cols[1]);gr.addColorStop(1,cols[2]);g.fillStyle=gr;g.beginPath();g.arc(px,py,r,0,6.283);g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1.5;g.stroke();
  g.strokeStyle='rgba(0,0,0,.18)';g.beginPath();g.arc(px,py,r*.66,0,6.283);g.stroke();g.beginPath();g.arc(px,py,r*.36,0,6.283);g.stroke();g.fillStyle='rgba(255,255,255,'+(glossy?.65:.35)+')';g.beginPath();g.ellipse(px-r*.3,py-r*.38,r*.3,r*.16,-.7,0,6.283);g.fill()}
 function strikerPos(s){return{x:sx,y:YB[s.turn]}}
 function frame(t){RAF=requestAnimationFrame(frame);if(!SZ||!G)return;var s=G.state;if(!bg)bg=drawBoard();var f=flip();
  x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);x.drawImage(bg,0,0);var u=cv.width/1000;x.setTransform(u,0,0,u,0,0);if(f){x.translate(1000,1000);x.rotate(Math.PI)}
  var pts=[];
  if(animFrames){var now=performance.now(),i=Math.min(animFrames.length-1,Math.floor((now-animStart)/16.67));if(i!==frameIdx){for(var e=0;e<evs.length;e++){if(evs[e][0]>frameIdx&&evs[e][0]<=i){if(evs[e][1]<0)BX.sfx.good();else BX.beep(180+Math.min(420,evs[e][1]*.4),.06,'square',Math.min(.09,.02+evs[e][1]/9000))}}frameIdx=i}
   var fr=animFrames[i];for(var k=0;k<19;k++)if(fr[k*2]>=0)pts.push({x:fr[k*2],y:fr[k*2+1],t:s.coins[k].t});
   if(fr[38]>=0)pts.push({x:fr[38],y:fr[39],t:3});
   if(i>=animFrames.length-1&&now-animStart>animFrames.length*16.67+120){animFrames=null;afterAnim()}}
  else{s.coins.forEach(function(c){if(!c.in)pts.push({x:c.x,y:c.y,t:c.t})});if(!s.done&&mine.indexOf(s.turn)>=0&&!G.over&&performance.now()>animEnd){var sp=strikerPos(s);pts.push({x:sp.x,y:sp.y,t:3,live:1})}}
  pts.forEach(function(p){if(p.t===3)return;disc(x,p.x,p.y,RC,coinCol(p.t),false)});
  pts.forEach(function(p){if(p.t!==3)return;disc(x,p.x,p.y,RS,['#ffffff','#9bd4ff','#3a86c8'],true);x.strokeStyle='rgba(30,80,140,.6)';x.lineWidth=2;x.beginPath();x.arc(p.x,p.y,RS*.5,0,6.283);x.stroke()});
  if(aim){var sp2=strikerPos(s),L=Math.sqrt(aim.dx*aim.dx+aim.dy*aim.dy),p=Math.min(1,L/1000),ux=aim.dx/(L||1),uy=aim.dy/(L||1);
   x.save();x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=4;x.setLineDash([2,14]);x.lineCap='round';var hit=ray(s,sp2.x,sp2.y,ux,uy);x.beginPath();x.moveTo(sp2.x,sp2.y);x.lineTo(sp2.x+ux*hit.d,sp2.y+uy*hit.d);x.stroke();x.setLineDash([]);
   if(hit.c){x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=2;x.beginPath();x.arc(sp2.x+ux*hit.d,sp2.y+uy*hit.d,RS,0,6.283);x.stroke()}
   x.strokeStyle='hsl('+(120-p*120)+',90%,55%)';x.lineWidth=10;x.lineCap='round';x.beginPath();x.moveTo(sp2.x-ux*30,sp2.y-uy*30);x.lineTo(sp2.x-ux*(30+p*220),sp2.y-uy*(30+p*220));x.stroke();x.restore()}
  if(msgT>0){hint.classList.add('on');msgT-=1/60;if(msgT<=0)hint.classList.remove('on')}}
 var animStart=0,evs=[];
 function ray(s,ox,oy,ux,uy){var best=1400,hc=null;s.coins.forEach(function(c){if(c.in)return;var dx=c.x-ox,dy=c.y-oy,pr=dx*ux+dy*uy;if(pr<0)return;var d2=dx*dx+dy*dy-pr*pr,rr=RC+RS;if(d2<rr*rr){var d=pr-Math.sqrt(rr*rr-d2);if(d>0&&d<best){best=d;hc=c}}});
  var tw=[(ux>0?(1000-RS-ox)/ux:ux<0?(RS-ox)/ux:1e9),(uy>0?(1000-RS-oy)/uy:uy<0?(RS-oy)/uy:1e9)];var w=Math.min(tw[0],tw[1]);if(w<best){best=w;hc=null}return{d:Math.max(0,best),c:hc}}
 function afterAnim(){var s=G.state;turnUI(s);F.ver(G.verified)}
 function turnUI(s){var seat=s.turn;F.act(seat);F.sc(0,score(s,0));F.sc(1,score(s,1));var me=mine.indexOf(seat)>=0,nm=sess.seats[seat].name;
  sl.hidden=!(me&&!s.done&&!G.over);sl.classList.toggle('flip',flip());sl.value=flip()?1000-sx:sx;
  var q=s.pend===seat+1?' • 👑 cover the queen!':'';
  F.status(s.done?'':(me?(sess.mode==='local'?nm+': ':'')+'🎯 Slide striker, drag back to aim'+q:'⏳ '+nm+' is aiming…'));F.ver(G.verified)}
 G=new BX.Game(DEF,sess,{
  onMove:function(s,info){var ev=s.ev;animFrames=ev.frames;evs=ev.evs||[];frameIdx=-1;animStart=performance.now();animEnd=animStart+animFrames.length*16.67+700;aim=null;
   if(ev.msg){hint.textContent=ev.msg;msgT=2.8}
   if(ev.pot.length&&ev.own&&!ev.foul)F.botReact&&info.seat===0&&F.botReact('bad');
   F.sc(0,score(s,0));F.sc(1,score(s,1));F.status('🎱 Shot in motion…');sl.hidden=true},
  onTurn:function(s){if(!animFrames)turnUI(s)},
  onOver:function(r){F.status('<b>'+(r.cheat?'Game void':sess.seats[r.winner]?sess.seats[r.winner].name+' wins!':'Draw')+'</b>');var good=r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me),t=r.cheat?'Game void':r.winner<0?'Game over':(sess.mode==='online'?(r.winner===sess.me?'You win! 🏆':sess.seats[r.winner].name+' wins'):sess.seats[r.winner].name+' wins!');BX.sfx[good?'good':'bad']();setTimeout(function(){F.over(t,r.reason,good)},animFrames?animFrames.length*17+500:600)}});
 fit();turnUI(G.state);RAF=requestAnimationFrame(frame);
 sl.oninput=function(){var v=+this.value;sx=flip()?1000-v:v};
 function pt(e){var px=e.offsetX/cv.clientWidth*1000,py=e.offsetY/cv.clientHeight*1000;return flip()?[1000-px,1000-py]:[px,py]}
 var down=false;
 cv.addEventListener('pointerdown',function(e){var s=G.state;if(G.over||G.pending||animFrames||performance.now()<animEnd||mine.indexOf(s.turn)<0)return;down=true;try{cv.setPointerCapture(e.pointerId)}catch(_){}var p=pt(e),sp=strikerPos(s);aim={dx:0,dy:0,start:p,moved:false}});
 cv.addEventListener('pointermove',function(e){if(!down||!aim)return;var s=G.state,p=pt(e),sp=strikerPos(s),dx=sp.x-p[0],dy=sp.y-p[1],L=Math.sqrt(dx*dx+dy*dy),k=2.6,pw=Math.min(1000,L*k);if(L<4){aim.dx=0;aim.dy=0;return}
  /* must pull back toward own side: shot direction is from striker toward the opposite side of the pointer */
  aim.dx=dx/L*pw;aim.dy=dy/L*pw;aim.moved=true});
 function release(){if(!down)return;down=false;var s=G.state;if(!aim||!aim.moved){aim=null;return}var m={t:'s',x:Math.round(sx),dx:Math.round(aim.dx),dy:Math.round(aim.dy)},seat=s.turn;aim=null;var err=validate(s,seat,m);if(err){hint.textContent=err;msgT=1.6;BX.sfx.bad();return}G.submit(m,seat)}
 cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',function(){down=false;aim=null});
 window.__carrom={G:G,shoot:function(xx,dx,dy){return G.submit({t:'s',x:xx,dx:dx,dy:dy},G.state.turn)},sim:simulate};
}
lobby();
})();
