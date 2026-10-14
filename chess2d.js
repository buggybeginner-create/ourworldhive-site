/* Chess page UI (3D board, animations). Rules and bot live in chess-core.js. */
(function(){
'use strict';
var CC=window.ChessCore,$=BX.$;
var SV={p:'<circle cx="22.5" cy="13.5" r="5.8"/><path d="M16.5 22.5Q22.5 18 28.5 22.5Q27 28.5 30.5 34h-16Q18 28.5 16.5 22.5Z"/><rect x="11.5" y="34" width="22" height="4.2" rx="2.1"/>',
r:'<path d="M11 8.5h5v4h4v-4h5v4h4v-4h5v9H11z"/><path d="M14.5 18.5h16l-1.6 14.5H16.1z"/><rect x="11" y="33" width="23" height="5.2" rx="1.6"/>',
n:'<path d="M12.5 36.5C12 28 14 21.5 19.5 17.5L16.5 14.8 18.8 8.8 23.4 11.8C31 11.8 34.6 19 33.4 36.5Z"/><circle cx="21.4" cy="15.2" r="1.3" class="eye"/><rect x="11.5" y="34" width="22" height="4.2" rx="2.1"/>',
b:'<circle cx="22.5" cy="7.6" r="2.5"/><path d="M22.5 11C28 15.6 28.4 21 25.6 25.2H19.4C16.6 21 17 15.6 22.5 11Z"/><path d="M16.5 36Q18 28 22.5 25.2Q27 28 28.5 36Z"/><rect x="11.5" y="34" width="22" height="4.2" rx="2.1"/><path d="M20.6 15.5l3.8 4.2" class="cut"/>',
q:'<circle cx="9.5" cy="13" r="2.3"/><circle cx="16.5" cy="9.6" r="2.3"/><circle cx="22.5" cy="8" r="2.3"/><circle cx="28.5" cy="9.6" r="2.3"/><circle cx="35.5" cy="13" r="2.3"/><path d="M10.5 15.5L15 29l3.2-15.2 4.3 14.6 4.3-14.6L30 29l4.5-13.5L33 35.5H12z"/><rect x="11" y="33.5" width="23" height="4.6" rx="2.2"/>',
k:'<rect x="21" y="3.6" width="3" height="10" rx="1"/><rect x="17.8" y="6.8" width="9.4" height="3" rx="1"/><path d="M15.5 36Q12.5 24 22.5 17Q32.5 24 29.5 36Z"/><path d="M13 22.5Q22.5 15 32 22.5l-1.3 4Q22.5 21 14.3 26.5Z"/><rect x="11" y="33.5" width="23" height="4.6" rx="2.2"/>'};
var DEFS='<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="gW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffdf5"/><stop offset=".55" stop-color="#e9dfc6"/><stop offset="1" stop-color="#b9ab8a"/></linearGradient><linearGradient id="gB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b6070"/><stop offset=".5" stop-color="#262a36"/><stop offset="1" stop-color="#0e1017"/></linearGradient></defs></svg>';
function pieceSVG(p){var lp=p.toLowerCase(),w=p===lp?0:1;return'<svg viewBox="0 0 45 45" class="'+(w?'pw':'pb')+'"><g fill="url(#'+(w?'gW':'gB')+')" stroke="'+(w?'#4a3f2a':'#9aa3bd')+'" stroke-width="1.1" stroke-linejoin="round">'+SV[lp]+'</g></svg>'}
var CSS='.cb3{width:var(--bs,min(94vw,600px));perspective:1200px;margin:0 auto}.cbw{position:relative;padding:3.2%;border-radius:16px;background:linear-gradient(145deg,#5a3b22,#2d1c0f);transform-style:preserve-3d;transition:transform .9s cubic-bezier(.2,.8,.2,1);box-shadow:0 1px 0 #3b2616,0 2px 0 #3b2616,0 3px 0 #33200f,0 4px 0 #33200f,0 5px 0 #2a1a0c,0 6px 0 #2a1a0c,0 7px 0 #221509,0 8px 0 #221509,0 22px 40px rgba(0,0,0,.55)}.cbw.d3{transform:rotateX(38deg) translateY(-3%) scale(.97)}'+
'.cbd{position:relative;aspect-ratio:1;display:grid;grid-template-columns:repeat(8,1fr);border-radius:4px;overflow:hidden;transform-style:preserve-3d;user-select:none;-webkit-user-select:none;touch-action:manipulation}'+
'.sq{position:relative;cursor:pointer}.sq.l{background:linear-gradient(135deg,#f0dfbd,#e2cd9f)}.sq.d{background:linear-gradient(135deg,#b88358,#9c6a41)}.sq.lm::before{content:"";position:absolute;inset:0;background:rgba(255,214,70,.42)}.sq.sel::before{content:"";position:absolute;inset:0;background:rgba(80,200,120,.55)}'+
'.sq.chk::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(255,40,40,.9),rgba(255,40,40,0) 72%)}.sq.mv::after{content:"";position:absolute;left:35%;top:35%;width:30%;height:30%;border-radius:50%;background:rgba(20,70,40,.42)}.sq.cp::after{content:"";position:absolute;inset:6%;border-radius:50%;border:4px solid rgba(20,70,40,.5)}'+
'.sq i{position:absolute;font-style:normal;font-size:clamp(8px,1.7vw,12px);font-weight:700;opacity:.6;pointer-events:none}.sq.l i{color:#9c6a41}.sq.d i{color:#f0dfbd}.sq i.f{right:4%;bottom:2%}.sq i.r{left:4%;top:2%}'+
'.cpl{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;transform-style:preserve-3d}.pc{position:absolute;left:0;top:0;width:12.5%;height:12.5%;transition:transform .38s cubic-bezier(.3,.85,.3,1);transform-style:preserve-3d;pointer-events:none}.pc.gone{opacity:0;transition:opacity .3s}'+
'.pc svg{width:100%;height:100%;display:block;transform-origin:50% 88%;transition:transform .9s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 3px 2px rgba(0,0,0,.5))}.pc svg .cut,.pc svg .eye{fill:none;stroke:#222;stroke-width:1.4}.pc svg.pw .eye{fill:#222}.pc svg.pb .cut{stroke:#c9d0e6}.pc svg.pb .eye{fill:#c9d0e6;stroke:none}'+
'.d3 .pc svg{transform:rotateX(-38deg) scale(1.22) translateY(-4%)}.pc.pop svg{animation:pcpop .4s}@keyframes pcpop{50%{filter:drop-shadow(0 12px 8px rgba(0,0,0,.45))}}'+
'.promo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:8px;background:rgba(10,16,40,.94);padding:12px;border-radius:14px;z-index:5;border:1px solid #ffc857}.promo button{width:62px;height:62px;border-radius:10px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);cursor:pointer;padding:3px}.promo button:hover{background:rgba(255,200,87,.3)}.promo svg{width:100%;height:100%}';
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
var root=$('#app'),G=null,F=null;
var NOTE='Every move goes into a hash-chained log, and both browsers re-check it with the full chess rules. An illegal or edited move is rejected and the game is voided in favour of the honest player. Firestore rules force alternating turns and make moves write-once. There is no central referee, so nobody can stop a person from secretly using a chess engine on their own device; for serious games, play people you trust.';
function lobby(){if(G){G.dispose();G=null}document.querySelectorAll('.bx-over').forEach(function(x){x.remove()});
 BX.lobby(root,{game:'chess',alt:true,maxP:2,note:NOTE,botNames:['Computer'],onStart:start})}
var DEF={init:function(){return CC.init()},
 validate:function(s,seat,mv){if(seat!==(s.turn==='w'?0:1))return'Not your turn';if(!mv||!Number.isInteger(mv.f)||!Number.isInteger(mv.t)||mv.f<0||mv.f>63||mv.t<0||mv.t>63)return'Bad move format';if(mv.p!=null&&'qrbn'.indexOf(mv.p)<0)return'Bad promotion';
  var L=CC.legal(s);return L.some(function(m){return CC.same(m,mv)})?null:'Illegal chess move'},
 apply:function(s,seat,mv){return CC.apply(s,{f:mv.f,t:mv.t,p:mv.p})},
 needs:function(s,seat){return(s.turn==='w'?0:1)===seat},
 over:function(s){var r=CC.status(s);if(!r)return null;if(r.end==='mate')return{winner:r.winner==='w'?0:1,reason:'Checkmate'};if(r.end==='stalemate')return{winner:-1,reason:'Stalemate'};return{winner:-1,reason:r.why}},
 bot:function(s,seat,lvl){var m=CC.bestMove(s,lvl);if(!m)return null;var o={f:m.f,t:m.t};if(m.p)o.p=m.p;return o},botDelay:380,
 onResign:function(s,seat){return{winner:1-seat,reason:'Resignation'}}};
window.__chessDef=DEF;
function seatOf(m){return G&&G.state.turn==='b'?0:1}
function start(sess){
 var flip=sess.mode==='online'&&sess.me===1,els=new Array(64).fill(null),sel=-1,L=[],d3=true,plies=0;
 F=BX.frame(root,{seats:sess.seats,me:sess.me,mode:sess.mode,pairs:true,colors:['#f1e6c8','#8a93a8'],sub:['White','Black'],onLeave:lobby,onResign:function(){G.resign()}});
 F.stage.innerHTML=DEFS+'<div class="cb3"><div class="cbw d3" id="cbw"><div class="cbd" id="cbd"></div></div></div>';
 var bd=$('#cbd'),cw=$('#cbw'),pl=document.createElement('div');pl.className='cpl';bd.appendChild(pl);
 function pos(sq){var r=sq>>3,f=sq&7;if(flip){r=7-r;f=7-f}return'translate('+f*100+'%,'+r*100+'%)'}
 function rc(sq){var r=sq>>3,f=sq&7;if(flip){r=7-r;f=7-f}return[r,f]}
 var sqs=[];for(var r=0;r<8;r++)for(var f=0;f<8;f++){var d=document.createElement('div');d.className='sq '+((r+f)%2?'d':'l');d.dataset.r=r;d.dataset.f=f;if(f===0)d.innerHTML+='<i class="r">'+(flip?r+1:8-r)+'</i>';if(r===7)d.innerHTML+='<i class="f">'+'abcdefgh'[flip?7-f:f]+'</i>';bd.insertBefore(d,pl);sqs.push(d)}
 function sqEl(sq){var p=rc(sq);return sqs[p[0]*8+p[1]]}
 function mk(sq,p){var e=document.createElement('div');e.className='pc';e.dataset.p=p;e.innerHTML=pieceSVG(p);e.style.transform=pos(sq);pl.appendChild(e);els[sq]=e;return e}
 function reconcile(s){for(var i=0;i<64;i++){var p=s.b[i],e=els[i];if(e&&e.dataset.p!==p){if(p&&e.dataset.p.toLowerCase()==='p'&&p!==e.dataset.p){e.dataset.p=p;e.innerHTML=pieceSVG(p)}else{e.remove();els[i]=null;e=null}}if(!els[i]&&p)mk(i,p)}}
 function marks(s){sqs.forEach(function(e){e.classList.remove('lm','sel','chk','mv','cp')});if(s.last){sqEl(s.last.f).classList.add('lm');sqEl(s.last.t).classList.add('lm')}
  if(CC.inCheck(s))sqEl(CC.kingSq(s.b,s.turn)).classList.add('chk');
  if(sel>=0){sqEl(sel).classList.add('sel');L.filter(function(m){return m.f===sel}).forEach(function(m){sqEl(m.t).classList.add(s.b[m.t]||(s.b[m.f].toLowerCase()==='p'&&m.t===s.ep)?'cp':'mv')})}}
 function material(s){var V={p:1,n:3,b:3,r:5,q:9},w=0,b=0;s.b.forEach(function(p){if(!p)return;var l=p.toLowerCase();if(!V[l])return;if(p===l)b+=V[l];else w+=V[l]});return w-b}
 function turnUI(s){var seat=s.turn==='w'?0:1;F.act(seat);var mat=material(s);F.sc(0,mat>0?'+'+mat:'');F.sc(1,mat<0?'+'+(-mat):'');
  var me=G?G.mySeats():[];var mine=me.indexOf(seat)>=0;var chk=CC.inCheck(s)?' — <b style="color:#ff8a8a">Check!</b>':'';
  F.status((mine?(sess.mode==='local'?(seat===0?'White':'Black')+' to move':'🟢 Your move'):'⏳ '+sess.seats[seat].name+' is thinking…')+chk);F.ver(G?G.verified:0);
  L=mine?CC.legal(s):[];marks(s)}
 G=new BX.Game(DEF,sess,{
  onMove:function(s,info){var m=s.last,e=els[m.f];sel=-1;
   if(e){var tgt=els[m.t];if(tgt){tgt.classList.add('gone');setTimeout(function(){tgt.remove()},300)}
    else if(m.cap){var ec=els[(m.f>>3)*8+(m.t&7)];if(ec){ec.classList.add('gone');setTimeout(function(){ec.remove()},300);els[(m.f>>3)*8+(m.t&7)]=null}}
    els[m.t]=e;els[m.f]=null;e.style.transform=pos(m.t);e.classList.add('pop');setTimeout(function(){e.classList.remove('pop')},420);
    if(e.dataset.p.toLowerCase()==='k'&&Math.abs(m.t-m.f)===2){var rf=m.t>m.f?m.f+3:m.f-4,rt=m.t>m.f?m.f+1:m.f-1,re=els[rf];if(re){els[rt]=re;els[rf]=null;re.style.transform=pos(rt)}}}
   setTimeout(function(){reconcile(s)},m.cap?20:380);
   if(m.cap){BX.sfx.cap();if(seatOf(m)===0)F.botReact('bad')}else BX.sfx.move();F.addMove(m.san,plies++);turnUI(s)},
  onTurn:function(s){turnUI(s)},
  onOver:function(r){var s=G.state;sel=-1;marks(s);var t=r.cheat?'Game void':r.winner<0?'Draw':(sess.mode==='online'?(r.winner===sess.me?'You win! 🏆':'You lost'):sess.seats[r.winner].name+' wins!');
   F.status('<b>'+t+'</b> — '+r.reason);BX.sfx[r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me)?'good':'bad']();setTimeout(function(){F.over(t,r.reason,r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me))},700)}});
 reconcile(G.state);turnUI(G.state);
 function tapSq(sq){if(!G||G.over)return;var s=G.state,seat=G.humanSeat();if(!DEF.needs(s,seat)||G.mySeats().indexOf(seat)<0||G.pending)return;
  if(sel>=0){var c=L.filter(function(m){return m.f===sel&&m.t===sq});if(c.length){if(c[0].p){promo(c);return}G.submit({f:sel,t:sq},seat);return}}
  var p=s.b[sq];if(p&&CC.col(p)===s.turn){sel=sq;BX.sfx.tick();marks(s)}else{sel=-1;marks(s)}}
 function promo(c){var q=document.createElement('div');q.className='promo';var w=G.state.turn==='w';['q','r','b','n'].forEach(function(x){var b=document.createElement('button');b.innerHTML=pieceSVG(w?x.toUpperCase():x);b.onclick=function(){q.remove();G.submit({f:c[0].f,t:c[0].t,p:x},G.humanSeat())};q.appendChild(b)});cw.appendChild(q)}
 bd.addEventListener('click',function(e){var s=e.target.closest('.sq');if(!s)return;var r=+s.dataset.r,f=+s.dataset.f;if(flip){r=7-r;f=7-f}tapSq(r*8+f)});
 var b3=document.createElement('button');b3.className='on';b3.textContent='3D view';b3.onclick=function(){d3=!d3;cw.classList.toggle('d3',d3);b3.classList.toggle('on',d3)};F.tools.appendChild(b3);
 var bf=document.createElement('button');bf.textContent='Flip board';bf.onclick=function(){flip=!flip;sqs.forEach(function(e){e.remove()});sqs.length=0;rebuild()};F.tools.appendChild(bf);
 function rebuild(){for(var r=0;r<8;r++)for(var f=0;f<8;f++){var d=document.createElement('div');d.className='sq '+((r+f)%2?'d':'l');d.dataset.r=r;d.dataset.f=f;if(f===0)d.innerHTML+='<i class="r">'+(flip?r+1:8-r)+'</i>';if(r===7)d.innerHTML+='<i class="f">'+'abcdefgh'[flip?7-f:f]+'</i>';bd.insertBefore(d,pl);sqs.push(d)}
  els.forEach(function(e,i){if(e)e.style.transform=pos(i)});marks(G.state)}
 window.__chess={G:G,tap:tapSq};
}
lobby();
})();
