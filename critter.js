/* Critter Clash: UI and match rules on top of the Ourworldhive board kit (lobby, rooms, ranking, store).
   Each round both players secretly lock in one card from the same 5 offers. The picks are hidden with a hash (commit, then reveal),
   so nobody can see the other pick before locking. Both browsers then run the same battle and get the same result. */
(function(){
'use strict';
var $=BX.$,CC=window.CC,ROUNDS=CC.ROUNDS,LIVES=CC.LIVES,PICK_SEC=25;
var ST=['','★','★★','★★★','★★★★','★★★★★'];
/* ---------- match rules (run by the board kit on both sides) ---------- */
function init(seed){return{seed:seed,round:0,phase:0,turn:0,commits:[null,null],reveals:[null,null],armies:[[],[]],wins:[0,0],res:[],last:null,n:0}}
function needs(s,seat){return s.turn===seat}
function validate(s,seat,m){
 if(seat!==s.turn)return'Not your turn';if(!m)return'Bad move';
 if(s.phase<2){return(m.t==='c'&&typeof m.h==='string'&&/^[0-9a-f]{64}$/.test(m.h))?null:'Bad lock-in'}
 if(m.t!=='r'||!Number.isInteger(m.i)||m.i<0||m.i>4||typeof m.salt!=='string'||!/^[0-9a-f]{8,64}$/.test(m.salt))return'Bad reveal';
 return BX.sha(s.round+'|'+m.i+'|'+m.salt).then(function(h){return h===s.commits[seat]?null:'Reveal does not match the lock-in'})}
function apply(s,seat,m){
 if(s.phase<2)s.commits[seat]=m.h;else s.reveals[seat]=m.i;
 s.phase++;s.n++;
 if(s.phase===4){
  var off=CC.offers(s.seed,s.round),pre=[s.armies[0].slice(),s.armies[1].slice()];
  s.armies[0].push(off[s.reveals[0]]);s.armies[1].push(off[s.reveals[1]]);
  var bs=s.seed*3+s.round,r=CC.battle(s.armies[0],s.armies[1],bs,false);
  s.last={round:s.round,picks:[off[s.reveals[0]],off[s.reveals[1]]],armies:[s.armies[0].slice(),s.armies[1].slice()],seed:bs,winner:r.winner,left:r.left};
  s.res.push(r.winner);if(r.winner>=0)s.wins[r.winner]++;
  s.round++;s.phase=0;s.commits=[null,null];s.reveals=[null,null]}
 s.turn=s.phase%2}
function over(s){
 if(s.wins[0]>=LIVES)return{winner:0,reason:'Won '+s.wins[0]+' rounds'};
 if(s.wins[1]>=LIVES)return{winner:1,reason:'Won '+s.wins[1]+' rounds'};
 if(s.round>=ROUNDS){return s.wins[0]===s.wins[1]?{winner:-1,reason:'Equal rounds won'}:{winner:s.wins[0]>s.wins[1]?0:1,reason:'Most rounds won ('+Math.max(s.wins[0],s.wins[1])+' to '+Math.min(s.wins[0],s.wins[1])+')'}}
 return null}
window.__ccDEF=null;var BM={};
async function bot(s,seat,lvl){
 var off=CC.offers(s.seed,s.round),k=seat+':'+s.seed+':'+s.round;
 if(s.phase<2){var i=CC.botPick(lvl,off,s.armies[seat],s.armies[1-seat],s.seed,s.round),salt=BX.rndHex(8);BM[k]={i:i,salt:salt};return{t:'c',h:await BX.sha(s.round+'|'+i+'|'+salt)}}
 var m=BM[k];return m?{t:'r',i:m.i,salt:m.salt}:null}
var DEF={init:init,needs:needs,validate:validate,apply:apply,over:over,bot:bot,botDelay:900,onResign:function(s,seat){return{winner:1-seat,reason:'Resignation'}}};
window.__ccDEF=DEF;
/* ---------- look ---------- */
var CSS='.cc{width:min(100%,560px);height:100%;display:flex;flex-direction:column;gap:6px;padding:4px 8px 6px;box-sizing:border-box;font-family:inherit;user-select:none}'+
'.cc-info{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:#cdd8f5;min-height:22px}.cc-info b{color:#ffc857}.cc-dots{display:flex;gap:4px}.cc-dots i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;background:rgba(255,255,255,.1)}.cc-dots i.w{background:#1f9d55}.cc-dots i.l{background:#c2334d}.cc-dots i.d{background:#6b7390}'+
'.cc-army{display:flex;gap:6px;justify-content:center;min-height:86px;align-items:stretch;padding:6px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}.cc-army.e{background:rgba(255,90,120,.07)}.cc-army .ph{align-self:center;color:#93a4cc;font-size:12.5px}'+
'.cc-sq{position:relative;flex:1 1 0;max-width:20%;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 2px;border-radius:10px;background:rgba(0,0,0,.25);transition:transform .15s,opacity .3s}.cc-sq .ce{font-size:26px;line-height:1.1}.cc-sq small{font-size:11px;color:#cdd8f5;white-space:nowrap}.cc-sq .hp{display:block;width:86%;height:5px;border-radius:3px;background:rgba(255,255,255,.14);overflow:hidden}.cc-sq .hp b{display:block;height:100%;width:100%;background:#4be39a;transition:width .12s}.cc-sq.hit{transform:scale(1.1);background:rgba(255,120,120,.35)}.cc-sq.dead{opacity:.25;filter:grayscale(1)}.cc-sq .fl{position:absolute;top:-4px;right:2px;font-size:12px;font-weight:700;color:#ffd36a;animation:ccf .7s forwards;pointer-events:none}@keyframes ccf{to{transform:translateY(-16px);opacity:0}}'+
'.cc-mid{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;justify-content:center}.cc-offs{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}'+
'.cc-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px 5px;border-radius:12px;border:2px solid rgba(255,255,255,.16);background:linear-gradient(160deg,#1a2352,#0c1233);color:#eaf1ff;cursor:pointer;font:inherit;min-width:0;transition:transform .15s,border-color .15s,box-shadow .15s}.cc-card:active{transform:scale(.96)}.cc-card.sel{border-color:#ffc857;box-shadow:0 0 14px rgba(255,200,87,.55);transform:translateY(-4px)}.cc-card.lk{opacity:.45}.cc-card.lk.sel{opacity:1}'+
'.cc-card .cs{font-style:normal;font-size:10.5px;color:#ffc857;letter-spacing:-1px;min-height:13px}.cc-card .ce{font-size:30px;line-height:1.15}.cc-card .cn{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.cc-card .cq{font-size:13px;font-weight:800;color:#7cc4ff}.cc-card .cst{font-size:10.5px;color:#cdd8f5;white-space:nowrap}.cc-card.s4,.cc-card.s5{border-color:rgba(255,200,87,.5)}.cc-card.s5{background:linear-gradient(160deg,#4a2a6a,#150a2a)}'+
'.cc-det{padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:12.5px;line-height:1.4;color:#cdd8f5;min-height:56px}.cc-det b{color:#fff}.cc-det em{color:#ffc857;font-style:normal}'+
'.cc-go{display:flex;gap:8px;align-items:center}.cc-go button{flex:1;padding:11px;border-radius:12px;border:0;font:inherit;font-weight:800;font-size:15px;background:linear-gradient(180deg,#ffd36a,#ff9f43);color:#2a1600;cursor:pointer}.cc-go button:disabled{opacity:.45;filter:grayscale(.6)}.cc-tm{flex:0 0 46px;text-align:center;font-weight:800;color:#ffc857;font-size:18px}.cc-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}.cc-bar i{display:block;height:100%;width:100%;background:#7cc4ff;transition:width .25s linear}'+
'.cc-ban{text-align:center;padding:10px;border-radius:14px;background:rgba(0,0,0,.35);font-size:15px}.cc-ban h3{margin:0 0 4px;font-size:20px}.cc-vs{display:flex;gap:10px;justify-content:center;align-items:center}.cc-vs .cc-card{width:30%;animation:ccp .5s}@keyframes ccp{from{transform:rotateY(90deg) scale(.8);opacity:0}}.cc-vs b{font-size:20px;color:#ffc857}'+
'.cc-wait{text-align:center;color:#93a4cc;font-size:13px;padding:4px}.cc-claim{display:block;margin:6px auto;padding:8px 14px;border-radius:10px;border:0;background:#ffc857;color:#2a1600;font-weight:700;cursor:pointer}'+
'.cc-how{position:fixed;inset:0;z-index:3000;background:rgba(3,6,18,.88);display:grid;place-items:center;padding:14px}.cc-how>div{max-width:440px;max-height:88vh;overflow:auto;padding:18px;border-radius:18px;background:#0e1538;border:1px solid rgba(255,255,255,.2);color:#dbe4ff;font-size:14px;line-height:1.5}.cc-how h2{margin:0 0 8px;font-size:21px;color:#ffc857}.cc-how li{margin:5px 0}.cc-how button{margin-top:10px;padding:9px 16px;border-radius:10px;border:0;background:#ffc857;color:#2a1600;font-weight:800;cursor:pointer}';
var stl=document.createElement('style');stl.textContent=CSS;document.head.appendChild(stl);
var root=$('#app'),G=null;
function skinCss(){try{var it=window.OWHG&&OWHG.game()===BX.G&&OWHG.eq('skin');return it&&it.css?it.css:''}catch(e){return''}}
function cardHtml(c,mine){var k=CC.card(c),sk=mine?skinCss():'';return'<i class="cs">'+ST[k.stars]+'</i><b class="ce" style="'+sk+'">'+k.e+'</b><span class="cn">'+k.name+'</span><span class="cq">×'+k.qty+'</span><span class="cst">⚔'+k.atk+' ❤'+k.hp+'</span>'}
function showHow(){var d=document.createElement('div');d.className='cc-how';d.innerHTML='<div><h2>How Critter Clash works</h2><ol><li>Each round you and your rival see the <b>same 5 creature cards</b>.</li><li>Every card has stars. <b>Higher stars = stronger creatures but fewer of them</b> (1★ = 5 creatures, 5★ = just 1). Pick what you trust.</li><li>You both <b>lock in secretly</b>. You can not see what the rival picked until both have locked.</li><li>The new squad joins your army and the two armies <b>fight automatically</b>. Abilities, speed, armor, poison and survival all matter.</li><li>Win a round to take a point. First to <b>3 rounds</b> wins, or most rounds after 5.</li><li>Later rounds show better cards: more stars, more variety.</li></ol><p style="color:#93a4cc">Win matches to climb your own Critter Clash ranking (also on the common Rankings page). Coins from the Store buy skins, taunts, arenas and badges.</p><button>Got it</button></div>';d.querySelector('button').onclick=function(){d.remove()};d.onclick=function(e){if(e.target===d)d.remove()};document.body.appendChild(d)}
function lobby(){if(G){G.dispose();G=null}document.querySelectorAll('.bx-over,.cc-how').forEach(function(x){x.remove()});
 BX.lobby(root,{game:'critter',alt:true,maxP:2,noLocal:true,note:'Picks are locked with a secret code (hash) before they are shown, so nobody can peek or change a pick. Both browsers re-check every move and run the same battle. Practise against computers for free, or find a live rival.',botNames:['Critter Bot'],onStart:start});
 if(!localStorage.getItem('owh_cc_how')){try{localStorage.setItem('owh_cc_how','1')}catch(e){}setTimeout(showHow,500)}}
function start(sess){
 var me=sess.me,opp=1-me,online=sess.mode==='online';
 var F=BX.frame(root,{seats:sess.seats,me:me,mode:sess.mode,noMoves:true,sub:['',''],colors:['#7cc4ff','#ff7a90'],onLeave:lobby,onResign:function(){G.resign()}});
 F.stage.innerHTML='<div class="cc"><div class="cc-info" id="ccI"></div><div class="cc-army e" id="ccE"></div><div class="cc-mid" id="ccM"></div><div class="cc-army" id="ccY"></div></div>';
 var elI=$('#ccI'),elE=$('#ccE'),elY=$('#ccY'),elM=$('#ccM');
 var mine={round:-1,i:-1,salt:'',locked:false,cSent:false,rSent:false},anim=false,shown=0,tmr=0,t0=0,waitSince=0,oppHb=0,queued=null,skip=false;
 function hearts(w){var h='';for(var i=0;i<LIVES;i++)h+=i<LIVES-w?'❤️':'🖤';return h}
 function paintHud(s){F.sc(me,hearts(s.wins[opp]));F.sc(opp,hearts(s.wins[me]));F.sub(me,'army '+s.armies[me].length);F.sub(opp,'army '+s.armies[opp].length);
  var d='';for(var r=0;r<ROUNDS;r++){var w=s.res[r];d+='<i class="'+(w===undefined?'':w<0?'d':w===me?'w':'l')+'">'+(w===undefined?(r+1):w<0?'=':w===me?'✓':'✗')+'</i>'}
  elI.innerHTML='<span>Round <b>'+Math.min(ROUNDS,s.round+1)+'</b>/'+ROUNDS+'</span><span class="cc-dots">'+d+'</span>'}
 function squadHtml(army,mineSide,live){if(!army.length)return'<span class="ph">'+(mineSide?'Your army is empty. Pick your first creatures!':'Rival army is empty')+'</span>';
  return army.map(function(c,i){var k=CC.card(c);return'<div class="cc-sq" data-c="'+i+'"><b class="ce" style="'+(mineSide?skinCss():'')+'">'+k.e+'</b><small>×<span class="n">'+k.qty+'</span> '+ST[k.stars]+'</small><i class="hp"><b></b></i></div>'}).join('')}
 function paintArmies(s){elY.innerHTML=squadHtml(s.armies[me],true);elE.innerHTML=squadHtml(s.armies[opp],false)}
 /* ----- picking view ----- */
 function pickView(s){
  var off=CC.offers(s.seed,s.round),sel=mine.round===s.round?mine.i:-1,lk=mine.round===s.round&&mine.locked;
  elM.innerHTML='<div class="cc-offs">'+off.map(function(c,i){return'<button class="cc-card s'+c.stars+(i===sel?' sel':'')+(lk?' lk':'')+'" data-i="'+i+'">'+cardHtml(c,true)+'</button>'}).join('')+'</div><div class="cc-det" id="ccD"></div><div class="cc-bar"><i id="ccB"></i></div><div class="cc-go"><button id="ccL" disabled>Lock in</button><span class="cc-tm" id="ccT"></span></div><div class="cc-wait" id="ccW"></div>';
  detail(off,sel);lockBtn(s);
  startTimer(s)}
 function detail(off,i){var D=$('#ccD');if(!D)return;if(i<0){D.innerHTML='Tap a card to see its details. <em>Higher stars = stronger but fewer creatures.</em> Your rival picks from the same cards, and you will not see their choice until both have locked.';return}
  var k=CC.card(off[i]);D.innerHTML='<b>'+k.e+' '+k.name+'</b> · '+ST[k.stars]+' · <em>'+k.qty+' creature'+(k.qty>1?'s':'')+'</em> ('+(k.kind==='bird'?'bird':'insect')+')<br>⚔ attack '+k.atk+' · ❤ health '+k.hp+' · ⚡ speed '+k.spd+' each<br><b>'+k.txt+'</b>'}
 function lockBtn(s){var b=$('#ccL'),W=$('#ccW');if(!b)return;var lk=mine.round===s.round&&mine.locked;
  b.disabled=lk||mine.round!==s.round||mine.i<0;b.textContent=lk?'Locked ✓':'Lock in';
  F.status(lk?'🔒 Locked in':'Your move: pick a card');
  if(W){if(lk){var theirs=s.commits[opp]!=null;W.textContent=theirs?'Both locked. Revealing…':'Locked in. Waiting for your rival…';if(!theirs&&!waitSince)waitSince=Date.now()}else W.textContent=''}}
 function startTimer(s){clearInterval(tmr);var rnd=s.round;t0=mine.t0;
  tmr=setInterval(function(){if(!G||G.over||anim||G.state.round!==rnd){clearInterval(tmr);return}
   var left=PICK_SEC-(Date.now()-t0)/1000,T=$('#ccT'),B=$('#ccB');if(!T){clearInterval(tmr);return}
   var lk=mine.round===rnd&&mine.locked;T.textContent=lk?'':Math.max(0,Math.ceil(left));if(B)B.style.width=(lk?0:Math.max(0,left/PICK_SEC*100))+'%';
   if(left<=0&&!lk){var off=CC.offers(G.state.seed,rnd);if(mine.round!==rnd||mine.i<0){mine.round=rnd;mine.i=Math.floor(Math.random()*off.length)}lock()}
   checkAway()},250)}
 function lock(){var s=G.state;if(mine.round!==s.round||mine.locked||mine.i<0)return;mine.salt=BX.rndHex(8);mine.locked=true;mine.cSent=false;mine.rSent=false;BX.sfx.good();pump()}
 /* ----- sends our commit / reveal when it is our turn ----- */
 function pump(){if(!G||G.over)return;var s=G.state;
  if(mine.round===s.round&&mine.locked){
   if(s.phase<2&&s.turn===me&&s.commits[me]==null&&!mine.cSent){mine.cSent=true;var r=s.round,i=mine.i,salt=mine.salt;BX.sha(r+'|'+i+'|'+salt).then(function(h){return G.submit({t:'c',h:h},me)}).then(function(ok){if(ok===false)mine.cSent=false})}
   else if(s.phase>=2&&s.turn===me&&s.reveals[me]==null&&!mine.rSent){mine.rSent=true;G.submit({t:'r',i:mine.i,salt:mine.salt},me).then(function(ok){if(ok===false)mine.rSent=false})}}
  var s2=G.state;lockBtn(s2)}
 function checkAway(){if(!online||!G||G.over||!waitSince||Date.now()-waitSince<50000)return;var r=G.room,hb=r&&r.hb&&r.hb[sess.uids[opp]];if(hb&&Date.now()-hb<35000)return;
  var W=$('#ccW');if(W&&!W.querySelector('button')){W.innerHTML='Your rival seems to be gone. <button class="cc-claim">Claim the win</button>';W.querySelector('button').onclick=function(){G.finish({winner:me,reason:'Rival left the match'})}}}
 /* ----- battle view ----- */
 function playBattle(s){
  var L=s.last;anim=true;skip=false;clearInterval(tmr);waitSince=0;
  var pm=L.picks[me],po=L.picks[opp];
  elM.innerHTML='<div class="cc-ban"><h3>Round '+(L.round+1)+'</h3><div class="cc-vs"><button class="cc-card s'+pm.stars+'" disabled>'+cardHtml(pm,true)+'</button><b>VS</b><button class="cc-card s'+po.stars+'" disabled>'+cardHtml(po,false)+'</button></div><div style="margin-top:6px;color:#93a4cc;font-size:12px">Tap to skip</div></div>';
  elY.innerHTML=squadHtml(L.armies[me],true);elE.innerHTML=squadHtml(L.armies[opp],false);
  var res=CC.battle(L.armies[0],L.armies[1],L.seed,true),log=res.log,sq={},mx={};
  res.units.forEach(function(u,id){var side=u.s===me?'me':'op',k=side+u.ci;mx[k]=(mx[k]||0)+u.max;(sq[k]=sq[k]||[]).push(id)});
  function sqEl(side,ci){return(side==='me'?elY:elE).querySelector('.cc-sq[data-c="'+ci+'"]')}
  var fi=0,ev=elM;ev.onclick=function(){skip=true};
  function setHp(f){Object.keys(sq).forEach(function(k){var side=k.slice(0,2),ci=k.slice(2),e=sqEl(side,ci);if(!e)return;var hp=0,alive=0;sq[k].forEach(function(id){hp+=f.hp[id];if(f.hp[id]>0)alive++});
    e.querySelector('.hp b').style.width=Math.round(hp/mx[k]*100)+'%';e.querySelector('.n').textContent=alive;e.classList.toggle('dead',alive===0)})}
  function frame(){var f=log[fi];if(!f||skip&&fi<log.length-1){fi=log.length-1;f=log[fi]}
   setHp(f);(f.ev||[]).forEach(function(e){if(e.k==='hit'&&!skip){var u=res.units[e.d],el=sqEl(u.s===me?'me':'op',u.ci);if(el){el.classList.add('hit');var x=document.createElement('span');x.className='fl';x.textContent='-'+e.v;el.appendChild(x);setTimeout(function(){el.classList.remove('hit');x.remove()},300)}}});
   if(f.ev&&f.ev.length&&!skip)BX.sfx.cap();
   if(fi>=log.length-1){setTimeout(end,500);return}fi++;setTimeout(frame,skip?10:150)}
  function end(){
   var w=L.winner,txt=w<0?'Draw round':w===me?'You win the round! ✅':'Rival wins the round ❌';
   elM.innerHTML='<div class="cc-ban"><h3>'+txt+'</h3><div>Survivors: you '+L.left[me]+' · rival '+L.left[opp]+'</div></div>';
   BX.sfx[w===me?'good':'bad']();paintHud(s);
   setTimeout(function(){anim=false;shown=L.round+1;if(queued){var q=queued;queued=null;q()}else render()},1500)}
  frame()}
 /* ----- main render ----- */
 function render(){if(!G||(G.over&&!anim))return;var s=G.state;
  if(anim)return;
  if(s.last&&s.last.round+1>shown){playBattle(s);return}
  paintHud(s);paintArmies(s);
  if(s.round>=ROUNDS)return;
  var cur=elM.querySelector('.cc-offs');
  var key=s.seed+':'+s.round;
  if(!cur||elM.dataset.k!==key){elM.dataset.k=key;mine.i=mine.round===s.round?mine.i:-1;if(mine.round!==s.round){mine.round=s.round;mine.i=-1;mine.locked=false;mine.cSent=false;mine.rSent=false}mine.t0=Date.now();pickView(s)}
  pump()}
 elM.addEventListener('click',function(e){if(anim)return;var c=e.target.closest('.cc-card[data-i]'),L=e.target.closest('#ccL');var s=G&&G.state;if(!s||G.over)return;
  if(c){if(mine.locked&&mine.round===s.round)return;mine.round=s.round;mine.i=+c.dataset.i;[].forEach.call(elM.querySelectorAll('.cc-card'),function(x){x.classList.toggle('sel',x===c)});detail(CC.offers(s.seed,s.round),mine.i);lockBtn(s);BX.sfx.tick();return}
  if(L&&!L.disabled)lock()});
 G=new BX.Game(DEF,sess,{
  onMove:function(s,info){waitSince=0;if(s.last&&s.last.round+1>shown&&!anim){playBattle(s);return}pump()},
  onTurn:function(s){render()},
  onReject:function(){mine.cSent=mine.rSent=false;setTimeout(pump,800)},
  onRoom:function(r){oppHb=1},
  onOver:function(r){var go=function(){var t=r.cheat?'Game void':r.winner<0?'Draw':(r.winner===me?'You win! 🏆':'You lost');F.status('<b>'+t+'</b> — '+r.reason);BX.sfx[r.winner===me?'good':'bad']();setTimeout(function(){F.over(t,r.reason,r.winner>=0&&r.winner===me)},500)};
   if(anim){queued=go}else go()}});
 var hb=document.createElement('button');hb.className='on';hb.textContent='❓ How to play';hb.onclick=function(){$('#bxPop').hidden=true;showHow()};F.tools.appendChild(hb);
 render();
 window.__cc={G:G,state:function(){return G.state},mine:mine,pick:function(i){mine.round=G.state.round;mine.i=i;lock()}};
}
lobby();
})();
