/* Chess page (real 3D). Rules and bot live in chess-core.js, rendering in chess3d.js on owh3d.js.
   Falls back to the flat CSS board (chess2d.js) when WebGL is not available. */
(function(){
'use strict';
var CC=window.ChessCore,$=BX.$;
function glOK(){try{var c=document.createElement('canvas');return!!(c.getContext('webgl')||c.getContext('experimental-webgl'))&&!!window.E3&&!!window.Chess3D}catch(e){return false}}
if(!glOK()){var fb=document.createElement('script');fb.src='chess2d.js';document.body.appendChild(fb);return}
var TH=Chess3D.THEMES,SK=Chess3D.SKINS;
var P={theme:'wood',skin:'classic',roast:1,voice:1,ghost:1,yam:1,cam:'player'};
try{var sv=JSON.parse(localStorage.getItem('owh_chess3')||'null');if(sv)for(var k in sv)if(k in P)P[k]=sv[k]}catch(e){}
if(!TH[P.theme])P.theme='wood';if(!SK[P.skin])P.skin='classic';
function savePrefs(){try{localStorage.setItem('owh_chess3',JSON.stringify(P))}catch(e){}}
var CSS='.cx-wrap{position:relative;width:100%;height:100%;overflow:hidden;border-radius:0}.cx-wrap canvas{cursor:grab}'+
'.cx-bub{position:absolute;left:50%;top:10px;transform:translate(-50%,-14px) scale(.96);opacity:0;display:flex;gap:10px;align-items:center;max-width:min(92%,460px);padding:9px 14px 9px 10px;border-radius:18px;background:rgba(10,14,34,.9);border:1px solid rgba(255,200,87,.55);color:#eaf1ff;font:600 14px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5);pointer-events:none;transition:opacity .25s,transform .25s;z-index:6}.cx-bub.on{opacity:1;transform:translate(-50%,0) scale(1)}.cx-bub i{font-style:normal;font-size:28px;line-height:1}.cx-bub small{display:block;font-size:11px;opacity:.65;font-weight:600;letter-spacing:.04em;text-transform:uppercase}.cx-bub.y{border-color:#ff4a4a;background:rgba(40,6,10,.93);box-shadow:0 0 40px rgba(255,40,40,.35)}'+
'.cx-fab{position:absolute;left:8px;bottom:8px;display:flex;flex-direction:column;gap:8px;z-index:5}.cx-fab button{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(10,14,34,.7);color:#fff;font-size:19px;cursor:pointer;backdrop-filter:blur(6px)}.cx-fab button:hover{border-color:#ffc857}'+
'.cx-panel{position:absolute;left:8px;bottom:58px;right:8px;max-width:420px;max-height:44%;overflow:auto;padding:14px;border-radius:18px;background:rgba(8,12,32,.92);border:1px solid rgba(255,200,87,.4);color:#eaf1ff;z-index:7;font:14px system-ui,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.6)}.cx-panel[hidden]{display:none}.cx-panel h4{margin:10px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ffc857}.cx-panel h4:first-child{margin-top:0}.cx-ch{display:flex;flex-wrap:wrap;gap:7px}.cx-ch button{display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:inherit;font:inherit;font-size:13px;cursor:pointer}.cx-ch button.on{border-color:#ffc857;background:rgba(255,200,87,.14);color:#ffc857}.cx-sw{display:inline-flex}.cx-sw b{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.4)}.cx-sw b+b{margin-left:-5px}.cx-tg{display:flex;flex-wrap:wrap;gap:8px 16px}.cx-tg label{display:flex;gap:6px;align-items:center;cursor:pointer}.cx-x{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:18px;cursor:pointer}'+
'.cx-doom{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .6s;background:radial-gradient(ellipse at 50% 45%,transparent 35%,rgba(120,0,10,.55) 100%);z-index:3}.cx-doom.on{opacity:1;animation:cxd 1.3s infinite alternate}@keyframes cxd{to{filter:brightness(1.6)}}'+
'.cx-wrap .promo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:10px;background:rgba(10,16,40,.95);padding:14px;border-radius:16px;z-index:8;border:1px solid #ffc857}.cx-wrap .promo button{width:64px;height:64px;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:40px;line-height:1;cursor:pointer}.cx-wrap .promo button:hover{border-color:#ffc857;background:rgba(255,200,87,.15)}'+
'.cx-hint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);padding:6px 14px;border-radius:99px;background:rgba(10,14,34,.7);color:#cdd8f5;font:12.5px system-ui,sans-serif;pointer-events:none;transition:opacity 1s;z-index:4;white-space:nowrap}';
var st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
var root=$('#app'),G=null,F=null,scene=null,idleT=null,bubT=null;
var NOTE='Every move goes into a hash-chained log, and both browsers re-check it with the full chess rules. An illegal or edited move is rejected and the game is voided in favour of the honest player. Firestore rules force alternating turns and make moves write-once.';
/* ---------- audio ---------- */
var AC=null;
function laugh(deep){if(!BX.snd)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();var n=deep?8:4,t0=AC.currentTime+.02,f0=deep?92:210,lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=deep?900:1500;lp.connect(AC.destination);
 for(var i=0;i<n;i++){var o=AC.createOscillator(),g=AC.createGain(),t=t0+i*(deep?.2:.15);o.type='sawtooth';o.frequency.setValueAtTime(f0*(1+(i%2)*.18),t);o.frequency.exponentialRampToValueAtTime(f0*.8,t+.16);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(deep?.22:.12,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+.17);o.connect(g);g.connect(lp);o.start(t);o.stop(t+.2)}}catch(e){}}
function speak(txt,deep){if(!P.voice||!BX.snd||!window.speechSynthesis)return;try{var u=new SpeechSynthesisUtterance(String(txt).replace(/[^\w\s.,!?'ऀ-ॿ-]/g,''));u.pitch=deep?.15:1.45;u.rate=deep?.72:1.05;u.volume=1;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
/* ---------- roast lines ---------- */
var ROAST={p:['Just a pawn? It is mine now.','Pyada gaya... kaun sa bada nuksan hai!','Pawns are free, right? Thanks!','Bechara pyada, promotion ka sapna adhura.','That pawn had dreams. Had.'],
 n:['Ghoda tera, ab chara mera!','Your horse just ran out of oats.','Dhai chaal wala ab zero chaal par.','That knight was not so bright.','Neigh... and gone.'],
 b:['Pandit ji ko vida kar diya!','Diagonal dreams, crushed.','Your bishop needs a blessing now.','Tirchi chaal ka tirchaa anjaam!'],
 r:['Hathi gaya! Ab sirf sanrakshan bacha.','Tower down! Timber!','Your rook just got booked.','Castle wall gira, kya tower tha!'],
 q:['Rani ko bhi nahi chhoda, sorry not sorry.','Queen down! Aaj raja akela hai.','Your Majesty is now Your Alone-ness.','The queen has left the building.'],
 chk:['Raja ji, sambhalke! Check hai.','Check! Hilo mat, bachna hai to.'],
 mate:['Game over! Jao, chai peeke aao.','Checkmate! That was swift justice.']};
var YAMS=['HAHAHA! Kitna sochega? Chaal chal warna main le jaunga!','Time khatam ho raha hai... Yamraj intezaar kar raha hai! HAHAHA!','Aaj tera raja mere saath chalega! HAHAHA!'];
var YAMN=['Arre bhai, kitna sochega? Chaal chal! HAHAHA!','Samay beet raha hai, mortal! HAHAHA!'];
function bubble(av,who,txt,cls,ms){var h=scene&&scene.host;if(!h)return;var b=h.querySelector('.cx-bub');if(!b){b=document.createElement('div');b.className='cx-bub';h.appendChild(b)}
 b.className='cx-bub'+(cls?' '+cls:'');b.innerHTML='<i>'+av+'</i><div><small></small><span></span></div>';b.querySelector('small').textContent=who;b.querySelector('span').textContent=txt;void b.offsetWidth;b.classList.add('on');clearTimeout(bubT);bubT=setTimeout(function(){b.classList.remove('on')},ms||3800)}
/* ---------- game ---------- */
function lobby(){stopIdle();if(G){G.dispose();G=null}if(scene){scene.dispose();scene=null}document.querySelectorAll('.bx-over').forEach(function(x){x.remove()});
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
var VAL={p:1,n:3,b:3,r:5,q:9};
function material(s){var w=0,b=0;s.b.forEach(function(p){if(!p)return;var l=p.toLowerCase();if(!VAL[l])return;if(p===l)b+=VAL[l];else w+=VAL[l]});return w-b}
function stopIdle(){clearTimeout(idleT);idleT=null;if(scene)scene.summon(false);var d=document.querySelector('.cx-doom');if(d)d.classList.remove('on')}
function start(sess){
 var flip=sess.mode==='online'&&sess.me===1,sel=-1,L=[],plies=0,prevB=CC.init().b.slice(),promoEl=null;
 F=BX.frame(root,{seats:sess.seats,me:sess.me,mode:sess.mode,pairs:true,colors:['#f1e6c8','#8a93a8'],sub:['White','Black'],onLeave:lobby,onResign:function(){G.resign()}});
 var wrap=document.createElement('div');wrap.className='cx-wrap';wrap.style.background=TH[P.theme].bg;F.stage.innerHTML='';F.stage.style.perspective='none';F.stage.appendChild(wrap);
 try{scene=Chess3D.create(wrap,{theme:P.theme,skin:P.skin,flip:flip,fx:{cap:function(){BX.sfx.cap()},laugh:function(n){laugh(false)}},onYamLaugh:function(){var crit=critical(G.state);var t=(crit?YAMS:YAMN)[Math.floor(Math.random()*3)%(crit?YAMS.length:YAMN.length)];bubble('👹','Yamraj',t,'y',5200);laugh(true);speak(t.replace(/HAHAHA!?/g,'ha ha ha'),true);var d=wrap.querySelector('.cx-doom');if(d)d.classList.add('on')}})}catch(err){console.error(err);BX.toast('3D could not start, using the flat board');BX.closeFs();var s2=document.createElement('script');s2.src='chess2d.js';document.body.appendChild(s2);return}
 scene.host=wrap;scene.camera(P.cam);
 var doom=document.createElement('div');doom.className='cx-doom';wrap.appendChild(doom);
 function critical(s){var seat=s.turn==='w'?0:1,m=material(s)*(seat===0?1:-1);return CC.inCheck(s)||m<=-3}
 /* floating buttons and style panel */
 var fab=document.createElement('div');fab.className='cx-fab';fab.innerHTML='<button type="button" id="cxSt" aria-label="Board and piece style" title="Style">🎨</button><button type="button" id="cxCm" aria-label="Change camera" title="Camera">🎥</button>';wrap.appendChild(fab);
 var panel=document.createElement('div');panel.className='cx-panel';panel.hidden=true;wrap.appendChild(panel);
 function sw(a,b){return'<span class="cx-sw"><b style="background:'+a+'"></b><b style="background:'+b+'"></b></span>'}
 function drawPanel(){var h='<button class="cx-x" type="button" aria-label="Close">×</button><h4>Board</h4><div class="cx-ch">'+Object.keys(TH).map(function(k){return'<button type="button" data-th="'+k+'" class="'+(P.theme===k?'on':'')+'">'+sw(TH[k].l,TH[k].d)+TH[k].name+'</button>'}).join('')+'</div><h4>Pieces</h4><div class="cx-ch">'+Object.keys(SK).map(function(k){return'<button type="button" data-sk="'+k+'" class="'+(P.skin===k?'on':'')+'">'+sw(SK[k].w,SK[k].b)+SK[k].name+'</button>'}).join('')+'</div><h4>Camera</h4><div class="cx-ch">'+[['player','Player'],['top','Top view'],['low','Low angle'],['side','Side'],['cine','Cinematic']].map(function(c){return'<button type="button" data-cm="'+c[0]+'" class="'+(scene.camMode()===c[0]?'on':'')+'">'+c[1]+'</button>'}).join('')+'</div><h4>Fun</h4><div class="cx-tg">'+[['roast','Roast bubbles'],['voice','Voices'],['ghost','Ghost captures'],['yam','Yamraj when slow']].map(function(c){return'<label><input type="checkbox" data-tg="'+c[0]+'"'+(P[c[0]]?' checked':'')+'> '+c[1]+'</label>'}).join('')+'</div><p style="margin:10px 0 0;font-size:12px;opacity:.65">Drag the board to turn it, pinch or scroll to zoom.</p>';panel.innerHTML=h}
 panel.addEventListener('click',function(ev){var b=ev.target.closest('button'),c=ev.target.closest('input');if(c&&c.dataset.tg){P[c.dataset.tg]=c.checked?1:0;savePrefs();if(c.dataset.tg==='yam'&&!c.checked)stopIdle();else if(c.dataset.tg==='yam')armIdle(G.state);return}if(!b)return;
  if(b.classList.contains('cx-x')){panel.hidden=true;return}
  if(b.dataset.th){P.theme=b.dataset.th;scene.theme(P.theme);wrap.style.background=TH[P.theme].bg}else if(b.dataset.sk){P.skin=b.dataset.sk;scene.skin(P.skin)}else if(b.dataset.cm){P.cam=b.dataset.cm;scene.camera(P.cam)}savePrefs();drawPanel()});
 fab.querySelector('#cxSt').onclick=function(){panel.hidden=!panel.hidden;if(!panel.hidden)drawPanel()};
 var CMS=['player','top','low','side','cine'];fab.querySelector('#cxCm').onclick=function(){var i=CMS.indexOf(scene.camMode());P.cam=CMS[(i+1)%CMS.length];scene.camera(P.cam);savePrefs();hint('Camera: '+P.cam)};
 function hint(t){var h=wrap.querySelector('.cx-hint');if(!h){h=document.createElement('div');h.className='cx-hint';wrap.appendChild(h)}h.textContent=t;h.style.opacity=1;clearTimeout(h._t);h._t=setTimeout(function(){h.style.opacity=0},3200)}
 /* state to 3D marks */
 function marks(s){var dots=[],caps=[];if(sel>=0)L.filter(function(m){return m.f===sel}).forEach(function(m){var cp=s.b[m.t]||(s.b[m.f]&&s.b[m.f].toLowerCase()==='p'&&m.t===s.ep);(cp?caps:dots).push(m.t)});
  scene.marks({sel:sel,dots:dots,caps:caps,last:s.last?[s.last.f,s.last.t]:null,check:CC.inCheck(s)?CC.kingSq(s.b,s.turn):-1})}
 function turnUI(s){var seat=s.turn==='w'?0:1;F.act(seat);var mat=material(s);F.sc(0,mat>0?'+'+mat:'');F.sc(1,mat<0?'+'+(-mat):'');
  var me=G?G.mySeats():[],mine=me.indexOf(seat)>=0,chk=CC.inCheck(s)?' — <b style="color:#ff8a8a">Check!</b>':'';
  F.status((mine?(sess.mode==='local'?(seat===0?'White':'Black')+' to move':'🟢 Your move'):'⏳ '+sess.seats[seat].name+' is thinking…')+chk);F.ver(G?G.verified:0);
  L=mine?CC.legal(s):[];marks(s);armIdle(s)}
 function armIdle(s){stopIdle();if(!P.yam||!G||G.over)return;var seat=s.turn==='w'?0:1;if(G.mySeats().indexOf(seat)<0||G.pending)return;var crit=critical(s);
  idleT=setTimeout(function(){if(!G||G.over||scene.busy()&&false)return;scene.summon(true);idleT=setTimeout(function(){scene.summon(false);var d=wrap.querySelector('.cx-doom');if(d)d.classList.remove('on');armIdle(G.state)},26000)},crit?14000:42000)}
 function nameOf(seat){return sess.seats[seat]?sess.seats[seat].name:'Player'}
 G=new BX.Game(DEF,sess,{
  onMove:function(s,info){var m=s.last,pb=prevB,capCh=pb[m.t]||(m.cap&&pb[m.f]&&pb[m.f].toLowerCase()==='p'?pb[(m.f>>3)*8+(m.t&7)]:null);sel=-1;stopIdle();
   scene.move(m,pb,s.b,{ghost:!!P.ghost});setTimeout(function(){scene.sync(s.b)},1900);prevB=s.b.slice();
   var byWhite=s.turn==='b';
   if(capCh){BX.sfx.cap();var t=capCh.toLowerCase(),pool=ROAST[t]||ROAST.p,line=pool[(plies*7+m.t)%pool.length],seat=byWhite?0:1;
    if(P.roast){bubble(sess.seats[seat]&&sess.seats[seat].bot?'🤖':'😈',nameOf(seat)+' says',line,'',3800);speak(line,false)}
    if(!byWhite)F.botReact('bad')}else BX.sfx.move();
   if(!capCh&&CC.inCheck(s)&&P.roast&&!CC.status(s)){var cl=ROAST.chk[plies%ROAST.chk.length];bubble('⚠️','Check',cl,'',2800)}
   if(CC.inCheck(s)){scene.shake(.6);scene.flash()}
   F.addMove(m.san,plies++);turnUI(s)},
  onTurn:function(s){turnUI(s)},
  onOver:function(r){var s=G.state;sel=-1;marks(s);stopIdle();var good=r.winner>=0&&(sess.mode!=='online'||r.winner===sess.me),t=r.cheat?'Game void':r.winner<0?'Draw':(sess.mode==='online'?(r.winner===sess.me?'You win! 🏆':'You lost'):sess.seats[r.winner].name+' wins!');
   F.status('<b>'+t+'</b> — '+r.reason);BX.sfx[good?'good':'bad']();
   if(r.reason==='Checkmate'){var ks=CC.kingSq(s.b,s.turn);setTimeout(function(){scene.kingFall(ks)},900);if(P.roast){var ml=ROAST.mate[plies%ROAST.mate.length];setTimeout(function(){bubble('💀','Checkmate',ml,'',4200)},1300)}
    if(!good&&sess.mode==='bot'&&P.yam){setTimeout(function(){scene.summon(true)},2200)}}
   setTimeout(function(){F.over(t,r.reason,good)},r.reason==='Checkmate'?3200:700)}});
 scene.setBoard(G.state.b,true);turnUI(G.state);
 hint('Tap a piece, then a square. Drag to turn the board.');
 /* input */
 function ownAt(c,s){return s.b[c]&&CC.col(s.b[c])===s.turn}
 function tapSq(cand){if(!G||G.over)return;var s=G.state,seat=G.humanSeat();if(!DEF.needs(s,seat)||G.mySeats().indexOf(seat)<0||G.pending)return;if(typeof cand==='number')cand=[cand,cand];
  if(sel>=0){for(var i=0;i<cand.length;i++){var c=cand[i];if(c<0)continue;var mv=L.filter(function(m){return m.f===sel&&m.t===c});if(mv.length){if(mv[0].p){promo(mv);return}G.submit({f:sel,t:c},seat);return}}}
  var pick=-1;for(var j=cand.length-1;j>=0;j--){if(cand[j]>=0&&ownAt(cand[j],s)){pick=cand[j];break}}
  if(pick>=0){sel=pick;BX.sfx.tick()}else sel=-1;marks(s)}
 function promo(c){if(promoEl)promoEl.remove();var q=document.createElement('div');q.className='promo';promoEl=q;var w=G.state.turn==='w',gl={q:w?'♕':'♛',r:w?'♖':'♜',b:w?'♗':'♝',n:w?'♘':'♞'};
  ['q','r','b','n'].forEach(function(x){var b=document.createElement('button');b.textContent=gl[x];b.setAttribute('aria-label','Promote to '+x);b.onclick=function(){q.remove();promoEl=null;G.submit({f:c[0].f,t:c[0].t,p:x},G.humanSeat())};q.appendChild(b)});wrap.appendChild(q)}
 scene.onTap(tapSq);
 var bf=document.createElement('button');bf.textContent='Flip board';bf.onclick=function(){flip=!flip;scene.setFlip(flip);marks(G.state)};F.tools.appendChild(bf);
 var bs=document.createElement('button');bs.textContent='🎨 Style';bs.onclick=function(){F.fs.querySelector('.bx-pop').hidden=true;panel.hidden=false;drawPanel()};F.tools.appendChild(bs);
 window.__chess={G:G,tap:tapSq,scene:scene,P:P};
}
lobby();
})();
