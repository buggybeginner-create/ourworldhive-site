/* Ultimate Tic-Tac-Toe: rules, bot and UI */
(function(){
'use strict';
var $=BX.$,LN=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function win(a){for(var i=0;i<8;i++){var l=LN[i];if(a[l[0]]>=0&&a[l[0]]<2&&a[l[0]]===a[l[1]]&&a[l[0]]===a[l[2]])return a[l[0]]}return -1}
function init(){return{c:new Array(81).fill(-1),own:new Array(9).fill(-1),turn:0,next:-1,last:null,n:0}}
function full(s,b){for(var i=0;i<9;i++)if(s.c[b*9+i]<0)return false;return true}
function moves(s){var o=[],bs=[];if(s.next>=0&&s.own[s.next]<0)bs=[s.next];else for(var b=0;b<9;b++)if(s.own[b]<0)bs.push(b);
 bs.forEach(function(b){for(var i=0;i<9;i++)if(s.c[b*9+i]<0)o.push({b:b,c:i})});return o}
function bigWin(s){return win(s.own)}
function done(s){var w=bigWin(s);if(w>=0)return{winner:w,reason:'Three boards in a line'};for(var b=0;b<9;b++)if(s.own[b]<0)return null;
 var a=0,b2=0;s.own.forEach(function(v){if(v===0)a++;else if(v===1)b2++});return a===b2?{winner:-1,reason:'All boards finished, equal boards'}:{winner:a>b2?0:1,reason:'Most boards won'}}
function apply(s,seat,m){s.c[m.b*9+m.c]=seat;var cell=s.c.slice(m.b*9,m.b*9+9),w=win(cell);if(w>=0)s.own[m.b]=w;else if(full(s,m.b))s.own[m.b]=2;
 s.next=s.own[m.c]<0?m.c:-1;s.last={b:m.b,c:m.c};s.turn=1-seat;s.n++}
function clone(s){return{c:s.c.slice(),own:s.own.slice(),turn:s.turn,next:s.next,last:s.last,n:s.n}}
function evalS(s,me){var w=bigWin(s);if(w>=0)return w===me?1e5:-1e5;var v=0,W=[3,2,3,2,4,2,3,2,3];
 for(var b=0;b<9;b++){var o=s.own[b];if(o===me)v+=W[b]*30;else if(o===1-me)v-=W[b]*30;else if(o<0){for(var i=0;i<8;i++){var l=LN[i],a=0,z=0;for(var k=0;k<3;k++){var x=s.c[b*9+l[k]];if(x===me)a++;else if(x===1-me)z++}if(a&&!z)v+=a*a*W[b];if(z&&!a)v-=z*z*W[b]}}}
 for(var i=0;i<8;i++){var l=LN[i],a=0,z=0;for(var k=0;k<3;k++){var x=s.own[l[k]];if(x===me)a++;else if(x===1-me)z++}if(a&&!z)v+=a*a*60;if(z&&!a)v-=z*z*60}return v}
function search(s,d,a,b,me){var dn=done(s);if(dn)return dn.winner===me?1e5+d:dn.winner<0?0:-1e5-d;if(d===0)return evalS(s,me);var M=moves(s),mx=s.turn===me,best=mx?-1e9:1e9;
 for(var i=0;i<M.length;i++){var t=clone(s);apply(t,s.turn,M[i]);var v=search(t,d-1,a,b,me);if(mx){if(v>best)best=v;if(v>a)a=v}else{if(v<best)best=v;if(v<b)b=v}if(a>=b)break}return best}
function bot(s,seat,lvl){var M=moves(s);if(lvl<=0)return M[Math.floor(Math.random()*M.length)];var d=lvl===1?2:5,bs=-1e9,bm=[];
 M.forEach(function(m){var t=clone(s);apply(t,seat,m);var v=search(t,d-1,-1e9,1e9,seat)+Math.random()*3;if(v>bs+.001){bs=v;bm=[m]}else if(Math.abs(v-bs)<=.001)bm.push(m)});return bm[Math.floor(Math.random()*bm.length)]}
var DEF={init:init,
 validate:function(s,seat,m){if(seat!==s.turn)return'Not your turn';if(!m||!Number.isInteger(m.b)||!Number.isInteger(m.c)||m.b<0||m.b>8||m.c<0||m.c>8)return'Bad move';return moves(s).some(function(x){return x.b===m.b&&x.c===m.c})?null:'Illegal cell (wrong board or taken)'},
 apply:apply,needs:function(s,seat){return s.turn===seat},over:done,bot:bot,botDelay:600,onResign:function(s,seat){return{winner:1-seat,reason:'Resignation'}}};
var CSS='.ut3{width:var(--bs,min(94vw,560px));perspective:1200px;margin:0 auto}.utw{aspect-ratio:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:2.4%;padding:3%;border-radius:20px;background:linear-gradient(145deg,#141d4a,#0a1030);box-shadow:0 1px 0 #1c2a6a,0 2px 0 #1c2a6a,0 3px 0 #16225a,0 4px 0 #16225a,0 5px 0 #101a48,0 6px 0 #101a48,0 24px 44px rgba(0,0,0,.55),inset 0 0 40px rgba(124,196,255,.08);transform-style:preserve-3d;transition:transform .9s cubic-bezier(.2,.8,.2,1)}.utw.d3{transform:rotateX(32deg) scale(.96)}'+
'.ub{position:relative;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);min-height:0;min-width:0;gap:4%;padding:4%;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);transition:box-shadow .3s,background .3s,transform .3s}.ub.act{background:rgba(255,200,87,.1);border-color:#ffc857;box-shadow:0 0 22px rgba(255,200,87,.38);transform:translateZ(14px)}'+
'.uc{position:relative;min-height:0;min-width:0;border-radius:8px;background:rgba(255,255,255,.07);cursor:pointer;display:grid;place-items:center;transition:background .2s,transform .2s}.ub.act .uc.e:hover{background:rgba(255,200,87,.3);transform:scale(1.06)}.uc svg{width:78%;height:78%}.uc.lm{box-shadow:inset 0 0 0 2px #fff}.uc.pp svg{animation:utp .35s cubic-bezier(.2,1.5,.4,1)}@keyframes utp{from{transform:scale(0) rotate(-40deg)}}'+
'.uw{position:absolute;inset:0;display:grid;place-items:center;background:rgba(5,9,24,.78);border-radius:12px;animation:utf .5s}.uw svg{width:70%;height:70%;filter:drop-shadow(0 0 12px currentColor)}@keyframes utf{from{opacity:0;transform:scale(1.3)}}.ux{color:#ff7a90}.uo{color:#7cc4ff}';
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
function X(){return'<svg viewBox="0 0 40 40" class="ux"><path d="M9 9L31 31M31 9L9 31" stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none"/></svg>'}
function O(){return'<svg viewBox="0 0 40 40" class="uo"><circle cx="20" cy="20" r="11" stroke="currentColor" stroke-width="5" fill="none"/></svg>'}
function D(){return'<svg viewBox="0 0 40 40" style="color:#93a4cc"><path d="M10 20h20" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>'}
var root=$('#app'),G=null;
function lobby(){if(G){G.dispose();G=null}document.querySelectorAll('.bx-over').forEach(function(x){x.remove()});
 BX.lobby(root,{game:'uttt',alt:true,maxP:2,note:'All moves go into a hash-chained log and both browsers re-check each move against the rules (right board, free cell). Illegal or edited moves void the game. Firestore rules force alternating turns and make moves write-once.',botNames:['Computer'],onStart:start})}
function start(sess){
 var F=BX.frame(root,{seats:sess.seats,me:sess.me,mode:sess.mode,pairs:true,sub:['❌ X','⭕ O'],colors:['#ff7a90','#7cc4ff'],onLeave:lobby,onResign:function(){G.resign()}}),n=0;
 F.stage.innerHTML='<div class="ut3"><div class="utw d3" id="utw"></div></div>';var W=$('#utw'),cells=[],boards=[];
 for(var b=0;b<9;b++){var bd=document.createElement('div');bd.className='ub';for(var i=0;i<9;i++){var c=document.createElement('div');c.className='uc e';c.dataset.b=b;c.dataset.i=i;bd.appendChild(c);cells.push(c)}W.appendChild(bd);boards.push(bd)}
 function paint(s,anim){for(var k=0;k<81;k++){var c=cells[k],v=s.c[k],had=c.dataset.v;if(String(v)!==had){c.dataset.v=v;c.innerHTML=v===0?X():v===1?O():'';c.classList.toggle('e',v<0);if(v>=0&&anim)c.classList.add('pp')}}
  cells.forEach(function(c,k){c.classList.toggle('lm',!!s.last&&s.last.b*9+s.last.c===k)});
  var mv=moves(s),act={};mv.forEach(function(m){act[m.b]=1});
  boards.forEach(function(bd,b){bd.classList.toggle('act',!!act[b]&&!done(s));var o=s.own[b],w=bd.querySelector('.uw');if(o>=0&&!w){w=document.createElement('div');w.className='uw';w.innerHTML=o===0?X():o===1?O():D();bd.appendChild(w)}})}
 function turn(s){var seat=s.turn;F.act(seat);var mine=G&&G.mySeats().indexOf(seat)>=0;var a=0,b2=0;s.own.forEach(function(v){if(v===0)a++;else if(v===1)b2++});F.sc(0,a);F.sc(1,b2);
  F.status((mine?(sess.mode==='local'?sess.seats[seat].name:'🟢 Your move'):'⏳ '+sess.seats[seat].name+' is thinking…')+'<br><small>'+(s.next>=0&&s.own[s.next]<0?'Play in the highlighted board':'Play in any highlighted board')+'</small>');F.ver(G?G.verified:0);paint(s,false)}
 G=new BX.Game(DEF,sess,{onMove:function(s,info){BX.sfx.move();F.addMove((info.seat===0?'X':'O')+(info.mv.b+1)+'.'+(info.mv.c+1),n++);paint(s,true);turn(s)},onTurn:turn,
  onOver:function(r){var t=r.cheat?'Game void':r.winner<0?'Draw':(sess.mode==='online'?(r.winner===sess.me?'You win! 🏆':'You lost'):sess.seats[r.winner].name+' wins!');F.status('<b>'+t+'</b> — '+r.reason);BX.sfx[r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me)?'good':'bad']();setTimeout(function(){F.over(t,r.reason,r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me))},700)}});
 turn(G.state);
 function tap(b,i){if(!G||G.over||G.pending)return;var seat=G.humanSeat();if(!DEF.needs(G.state,seat)||G.mySeats().indexOf(seat)<0)return;if(!moves(G.state).some(function(m){return m.b===b&&m.c===i})){BX.sfx.bad();return}G.submit({b:b,c:i},seat)}
 W.addEventListener('click',function(e){var c=e.target.closest('.uc');if(c)tap(+c.dataset.b,+c.dataset.i)});
 var b3=document.createElement('button');b3.className='on';b3.textContent='3D view';b3.onclick=function(){W.classList.toggle('d3');b3.classList.toggle('on')};F.tools.appendChild(b3);
 window.__uttt={G:G,tap:tap};
}
lobby();
})();
