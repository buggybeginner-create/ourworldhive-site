/* Critter Clash: UI and match rules on top of the Ourworldhive board kit (lobby, rooms, ranking, store).
   Every player owns a card collection and brings a 5-card deck (limits: 1 Unique, 2 Rare, total 15 stars).
   Decks are public. Each round both players secretly lock in one card from their own deck (hash commit, then reveal),
   the played cards join their army and the two armies fight. Both browsers run the same battle and get the same result. */
(function(){
'use strict';
var $=BX.$,CC=window.CC,ROUNDS=CC.ROUNDS,LIVES=CC.LIVES,PICK_SEC=25;
var ST=['','★','★★','★★★','★★★★','★★★★★'];
/* ---------- match rules (run by the board kit on both sides) ---------- */
function init(seed){return{seed:seed,stage:0,decks:[null,null],round:0,phase:0,turn:0,commits:[null,null],reveals:[null,null],used:[[],[]],armies:[[],[]],wins:[0,0],res:[],last:null,n:0}}
function needs(s,seat){return s.turn===seat}
function validate(s,seat,m){
 if(seat!==s.turn)return'Not your turn';if(!m)return'Bad move';
 if(s.stage===0){if(m.t!=='d')return'Deck expected';var e=CC.deckCheck(m.deck);return e?'Illegal deck: '+e:null}
 if(s.phase<2)return(m.t==='c'&&typeof m.h==='string'&&/^[0-9a-f]{64}$/.test(m.h))?null:'Bad lock-in';
 if(m.t!=='r'||!Number.isInteger(m.i)||m.i<0||m.i>4||typeof m.salt!=='string'||!/^[0-9a-f]{8,64}$/.test(m.salt))return'Bad reveal';
 if(s.used[seat].indexOf(m.i)>=0)return'That card was already played';
 return BX.sha(s.round+'|'+m.i+'|'+m.salt).then(function(h){return h===s.commits[seat]?null:'Reveal does not match the lock-in'})}
function apply(s,seat,m){
 s.n++;
 if(s.stage===0){s.decks[seat]=m.deck.map(function(c){return{cid:c.cid,stars:c.stars}});if(s.decks[0]&&s.decks[1]){s.stage=1;s.phase=0;s.turn=0}else s.turn=1-seat;return}
 if(s.phase<2)s.commits[seat]=m.h;else s.reveals[seat]=m.i;
 s.phase++;
 if(s.phase===4){
  var p0=s.decks[0][s.reveals[0]],p1=s.decks[1][s.reveals[1]];s.used[0].push(s.reveals[0]);s.used[1].push(s.reveals[1]);
  s.armies[0].push(p0);s.armies[1].push(p1);
  var bs=s.seed*3+s.round,r=CC.battle(s.armies[0],s.armies[1],bs,false);
  s.last={round:s.round,picks:[p0,p1],armies:[s.armies[0].slice(),s.armies[1].slice()],seed:bs,winner:r.winner,left:r.left};
  s.res.push(r.winner);if(r.winner>=0)s.wins[r.winner]++;
  s.round++;s.phase=0;s.commits=[null,null];s.reveals=[null,null]}
 s.turn=s.phase%2}
function over(s){
 if(s.wins[0]>=LIVES)return{winner:0,reason:'Won '+s.wins[0]+' rounds'};
 if(s.wins[1]>=LIVES)return{winner:1,reason:'Won '+s.wins[1]+' rounds'};
 if(s.round>=ROUNDS){return s.wins[0]===s.wins[1]?{winner:-1,reason:'Equal rounds won'}:{winner:s.wins[0]>s.wins[1]?0:1,reason:'Most rounds won ('+Math.max(s.wins[0],s.wins[1])+' to '+Math.min(s.wins[0],s.wins[1])+')'}}
 return null}
function left(s,seat){var o=[];s.decks[seat].forEach(function(c,i){if(s.used[seat].indexOf(i)<0)o.push(i)});return o}
var BM={};
async function bot(s,seat,lvl){
 if(s.stage===0)return{t:'d',deck:CC.botDeck(lvl)};
 var k=seat+':'+s.seed+':'+s.round;
 if(s.phase<2){var mine=left(s,seat),theirs=left(s,1-seat),opts=mine.map(function(i){return s.decks[seat][i]}),eleft=theirs.map(function(i){return s.decks[1-seat][i]});
  var pi=CC.botPick(lvl,opts,s.armies[seat],s.armies[1-seat],eleft,s.seed,s.round),i=mine[pi],salt=BX.rndHex(8);BM[k]={i:i,salt:salt};return{t:'c',h:await BX.sha(s.round+'|'+i+'|'+salt)}}
 var m=BM[k];return m?{t:'r',i:m.i,salt:m.salt}:null}
var DEF={init:init,needs:needs,validate:validate,apply:apply,over:over,bot:bot,botDelay:900,onResign:function(s,seat){return{winner:1-seat,reason:'Resignation'}}};
window.__ccDEF=DEF;
/* ---------- my collection (saved on this device) ---------- */
var SK='owh_cc_save',SV=null;
function loadSave(){if(SV)return SV;try{SV=JSON.parse(localStorage.getItem(SK))}catch(e){SV=null}
 if(!SV||!Array.isArray(SV.cards)){SV={v:1,nec:150,nid:1,cards:[],deck:[],shop:Math.floor(Math.random()*1e6),played:0};CC.starter(Math.floor(Math.random()*1e6)).forEach(function(c){SV.cards.push({id:SV.nid++,cid:c.cid,stars:c.stars})});SV.deck=SV.cards.slice(0,5).map(function(c){return c.id});saveSave()}return SV}
function saveSave(){try{localStorage.setItem(SK,JSON.stringify(SV))}catch(e){}}
function byId(id){var a=SV.cards;for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
function deckCards(){loadSave();return SV.deck.map(byId).filter(Boolean)}
function deckOk(){var d=deckCards();return d.length===5&&!CC.deckCheck(d)}
function fixDeck(){loadSave();if(!deckOk()){var ix=CC.autoDeck(SV.cards);if(ix){SV.deck=ix.map(function(i){return SV.cards[i].id});saveSave()}}return deckCards().map(function(c){return{cid:c.cid,stars:c.stars}})}
/* ---------- look ---------- */
var CSS='.cc{width:min(100%,560px);height:100%;display:flex;flex-direction:column;gap:5px;padding:4px 8px 6px;box-sizing:border-box;font-family:inherit;user-select:none}'+
'.cc-info{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;color:#cdd8f5;min-height:22px}.cc-info b{color:#ffc857}.cc-dots{display:flex;gap:4px}.cc-dots i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;background:rgba(255,255,255,.1)}.cc-dots i.w{background:#1f9d55}.cc-dots i.l{background:#c2334d}.cc-dots i.d{background:#6b7390}'+
'.cc-strip{display:flex;gap:5px;justify-content:center;align-items:center;padding:4px 6px;border-radius:12px;background:rgba(255,90,120,.07);border:1px solid rgba(255,255,255,.1)}.cc-strip small{font-size:10.5px;color:#93a4cc;margin-right:2px;flex:none}.cc-mini{flex:1;max-width:19%;display:flex;flex-direction:column;align-items:center;padding:2px 0;border-radius:8px;background:rgba(0,0,0,.25);font-size:10px;color:#ffc857;line-height:1.15}.cc-mini b{font-size:19px;font-weight:400}.cc-mini.used{opacity:.3;filter:grayscale(1)}.cc-mini.r-R{box-shadow:inset 0 0 0 1px #5aa8ff}.cc-mini.r-U{box-shadow:inset 0 0 0 1px #ffc857}'+
'.cc-arena{position:relative;flex:1;min-height:150px;border-radius:14px;overflow:hidden;background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.1),rgba(0,0,0,.3));border:1px solid rgba(255,255,255,.12)}.cc-arena:before{content:"";position:absolute;left:5%;right:5%;top:50%;border-top:1px dashed rgba(255,255,255,.2)}.cc-arena .tag{position:absolute;left:8px;font-size:10.5px;color:#93a4cc;pointer-events:none}.cc-arena .tag.t{top:4px}.cc-arena .tag.b{bottom:4px}.cc-arena .msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#93a4cc;font-size:13px;padding:0 24px;pointer-events:none}'+
'.cc-u{position:absolute;transform:translate(-50%,-50%);line-height:1;animation:ccb 2.4s ease-in-out infinite;transition:opacity .4s,filter .4s;will-change:transform}.cc-u.dead{animation:none;opacity:.2;filter:grayscale(1);transform:translate(-50%,-50%) rotate(80deg) scale(.7)}.cc-u.atk{animation:cclunge .26s ease-out}.cc-u.hurt{animation:cchurt .24s}.cc-u.pop{animation:ccin .55s cubic-bezier(.2,1.6,.4,1)}.cc-u.rev{animation:ccrev .6s}'+
'@keyframes ccb{50%{transform:translate(-50%,calc(-50% - 3px))}}@keyframes cclunge{50%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.3)}}@keyframes cchurt{25%{transform:translate(-50%,-50%) translateX(-4px);filter:brightness(2.2) sepia(1) hue-rotate(-50deg) saturate(5)}75%{transform:translate(-50%,-50%) translateX(4px);filter:brightness(2.2) sepia(1) hue-rotate(-50deg) saturate(5)}}@keyframes ccin{from{transform:translate(-50%,-50%) scale(0);opacity:0}}@keyframes ccrev{50%{filter:brightness(2) drop-shadow(0 0 8px #4be39a)}}'+
'.cc-fl{position:absolute;transform:translate(-50%,-50%);font-weight:800;font-size:15px;color:#ffd36a;text-shadow:0 1px 2px #000;animation:ccf .8s forwards;pointer-events:none;z-index:3}.cc-fl.g{color:#4be39a}.cc-fl.m{color:#cdd8f5;font-size:12px}@keyframes ccf{to{transform:translate(-50%,-150%);opacity:0}}'+
'.cc-reveal{position:absolute;inset:0;z-index:5;display:flex;gap:10px;justify-content:center;align-items:center;background:rgba(3,6,18,.78)}.cc-reveal .cc-card{width:30%;animation:ccflip .6s}.cc-reveal b.vs{font-size:20px;color:#ffc857}@keyframes ccflip{from{transform:rotateY(90deg) scale(.7);opacity:0}}'+
'.cc-ban{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);z-index:6;text-align:center;padding:10px;background:rgba(0,0,0,.6);font-size:14px}.cc-ban h3{margin:0 0 2px;font-size:20px}'+
'.cc-hand{display:flex;flex-direction:column;gap:5px}.cc-offs{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding-top:6px}.cc-offs.has .cc-card:not(.sel){opacity:.62;transform:scale(.95)}'+
'.cc-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px 5px;border-radius:12px;border:2px solid rgba(255,255,255,.18);background:linear-gradient(160deg,#1a2352,#0c1233);color:#eaf1ff;cursor:pointer;font:inherit;min-width:0;transition:transform .2s,opacity .2s,border-color .2s}.cc-card:active{transform:scale(.96)}'+
'.cc-card .cs{font-style:normal;font-size:10.5px;color:#ffc857;letter-spacing:-1px;min-height:13px}.cc-card .ce{font-size:30px;line-height:1.15}.cc-card .cn{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.cc-card .cq{font-size:13px;font-weight:800;color:#7cc4ff}.cc-card .cst{font-size:10.5px;color:#cdd8f5;white-space:nowrap}.cc-card .rb{position:absolute;top:-7px;left:50%;transform:translateX(-50%);font-size:8.5px;font-weight:800;letter-spacing:.4px;padding:1px 6px;border-radius:8px;background:#3a4570;color:#cdd8f5;white-space:nowrap}'+
'.cc-card.r-R{border-color:#5aa8ff}.cc-card.r-R .rb{background:#2a6fd0;color:#fff}.cc-card.r-U{border-color:#ffc857;background:linear-gradient(160deg,#4a2a6a,#150a2a);box-shadow:0 0 10px rgba(255,200,87,.35)}.cc-card.r-U .rb{background:linear-gradient(90deg,#ffd36a,#ff9f43);color:#2a1600}'+
'.cc-card.sel{border-color:#ffc857;z-index:2;animation:ccsel .5s cubic-bezier(.2,1.6,.4,1) forwards,ccglow 1.2s .5s ease-in-out infinite}.cc-card.sel:after{content:"✨";position:absolute;top:-10px;right:-5px;font-size:15px;animation:ccsp .9s}.cc-card.used{opacity:.25;filter:grayscale(1);pointer-events:none}.cc-card.fly{animation:ccfly .6s ease-in forwards;z-index:9}.cc-card.sent{opacity:.35;filter:grayscale(.5);pointer-events:none;animation:none}.cc-card.lim{opacity:.4}'+
'@keyframes ccsel{0%{transform:scale(.9)}55%{transform:translateY(-12px) scale(1.2) rotate(-3deg)}100%{transform:translateY(-7px) scale(1.1)}}@keyframes ccglow{50%{box-shadow:0 0 18px rgba(255,200,87,.9)}}@keyframes ccsp{from{transform:scale(0) rotate(-60deg);opacity:0}60%{transform:scale(1.5);opacity:1}to{transform:scale(1);opacity:.9}}@keyframes ccfly{0%{transform:translateY(-7px) scale(1.1)}35%{transform:translateY(-30px) scale(1.25) rotate(-4deg)}100%{transform:translateY(-230px) scale(.3) rotate(10deg);opacity:0}}'+
'.cc-det{padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:12px;line-height:1.38;color:#cdd8f5;min-height:52px}.cc-det b{color:#fff}.cc-det em{color:#ffc857;font-style:normal}'+
'.cc-go{display:flex;gap:8px;align-items:center}.cc-go button{flex:1;padding:10px;border-radius:12px;border:0;font:inherit;font-weight:800;font-size:15px;background:linear-gradient(180deg,#ffd36a,#ff9f43);color:#2a1600;cursor:pointer}.cc-go button:disabled{opacity:.45;filter:grayscale(.6)}.cc-tm{flex:0 0 46px;text-align:center;font-weight:800;color:#ffc857;font-size:18px}.cc-bar{height:4px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}.cc-bar i{display:block;height:100%;width:100%;background:#7cc4ff;transition:width .25s linear}'+
'.cc-wait{text-align:center;color:#93a4cc;font-size:12.5px;min-height:16px}.cc-claim{display:inline-block;margin-left:6px;padding:6px 12px;border-radius:10px;border:0;background:#ffc857;color:#2a1600;font-weight:700;cursor:pointer}'+
/* collection manager and help */
'.cc-how{position:fixed;inset:0;z-index:3000;background:rgba(3,6,18,.9);display:grid;place-items:center;padding:10px}.cc-how>div{width:min(100%,520px);max-height:92vh;overflow:auto;padding:16px;border-radius:18px;background:#0e1538;border:1px solid rgba(255,255,255,.2);color:#dbe4ff;font-size:14px;line-height:1.5}.cc-how h2{margin:0 0 8px;font-size:21px;color:#ffc857}.cc-how li{margin:5px 0}.cc-how .ok{margin-top:10px;padding:9px 16px;border-radius:10px;border:0;background:#ffc857;color:#2a1600;font-weight:800;cursor:pointer}'+
'.cm-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.cm-top b{font-size:17px;color:#ffc857}.cm-x{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:6px 12px;font-size:15px;cursor:pointer}.cm-tabs{display:flex;gap:6px;margin-bottom:10px}.cm-tabs button{flex:1;padding:8px 4px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#cdd8f5;font:inherit;font-weight:700;cursor:pointer}.cm-tabs button.on{background:#ffc857;color:#2a1600;border-color:#ffc857}'+
'.cm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:8px 0}.cm-grid .cc-card{padding-top:9px}.cm-sum{display:flex;flex-wrap:wrap;gap:6px;font-size:12px;margin:6px 0}.cm-sum span{padding:3px 9px;border-radius:9px;background:rgba(255,255,255,.08)}.cm-sum span.bad{background:#7a2030;color:#fff}.cm-sum span.good{background:#1f6a42;color:#fff}.cm-msg{min-height:34px;font-size:12.5px;color:#ffc857;margin:4px 0}.cm-act{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.cm-act button{padding:9px 12px;border-radius:10px;border:0;background:#2b3770;color:#fff;font:inherit;font-weight:700;cursor:pointer}.cm-act button.pri{background:linear-gradient(180deg,#ffd36a,#ff9f43);color:#2a1600}.cm-act button.red{background:#9a2a40}.cm-act button:disabled{opacity:.4}.cm-h{margin:10px 0 2px;font-size:12px;color:#93a4cc;text-transform:uppercase;letter-spacing:.5px}'+
'.cm-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;max-width:560px;margin:0 auto 10px;padding:10px 14px;border-radius:14px;background:rgba(255,200,87,.1);border:1px solid rgba(255,200,87,.35);color:#eaf1ff;font-size:14px}.cm-bar button{padding:8px 14px;border-radius:10px;border:0;background:linear-gradient(180deg,#ffd36a,#ff9f43);color:#2a1600;font:inherit;font-weight:800;cursor:pointer}';
var stl=document.createElement('style');stl.textContent=CSS;document.head.appendChild(stl);
var root=$('#app'),G=null;
function skinCss(){try{var it=window.OWHG&&OWHG.game()===BX.G&&OWHG.eq('skin');return it&&it.css?it.css:''}catch(e){return''}}
function rb(k){var q=CC.rarity(k.stars);return q==='C'?'':'<i class="rb">'+(q==='R'?'RARE':'UNIQUE')+'</i>'}
function cardHtml(c,mine){var k=CC.card(c),sk=mine?skinCss():'';return rb(k)+'<i class="cs">'+ST[k.stars]+'</i><b class="ce" style="'+sk+'">'+k.e+'</b><span class="cn">'+k.name+'</span><span class="cq">×'+k.qty+'</span><span class="cst">⚔'+k.atk+' ❤'+k.hp+'</span>'}
function showHow(){var d=document.createElement('div');d.className='cc-how';d.innerHTML='<div><h2>How Critter Clash works</h2><ol><li>You own a <b>card collection</b> (open <b>My cards</b>). Bring a <b>deck of 5</b>. Limits: max <b>1 Unique</b> (5★), max <b>2 Rare</b> (3-4★), and <b>15 stars</b> in total, so nobody can bring a monster deck.</li><li>Decks are shown to both players. Each round you both <b>secretly lock in one card</b> from your own deck. You can not see the rival pick until both are locked.</li><li><b>Higher stars = stronger creatures but fewer of them</b> (1★ = 5 creatures, 5★ = just 1).</li><li>Played cards join your army and the armies <b>fight on the battlefield</b>. Abilities, speed, armor, poison and survival matter.</li><li>First to <b>3 rounds</b> wins, or most rounds after 5.</li><li>Matches earn <b>Nectar 🍯</b>. Use it in <b>My cards → Shop</b> to buy cards. You can sell cards back (you lose 40%) before a match starts.</li></ol><p style="color:#93a4cc">Wins raise your Critter Clash ranking (also on the Rankings page). Coins in the Store buy skins, taunts, arenas and badges.</p><button class="ok">Got it</button></div>';d.querySelector('.ok').onclick=function(){d.remove()};d.onclick=function(e){if(e.target===d)d.remove()};document.body.appendChild(d)}
/* ----- My cards: deck, collection, shop ----- */
function openManager(tab){loadSave();tab=tab||'deck';var sel=null,msg='',confirmSell=0;
 var d=document.createElement('div');d.className='cc-how';document.body.appendChild(d);d.onclick=function(e){if(e.target===d){d.remove();bar()}};
 function inDeck(id){return SV.deck.indexOf(id)>=0}
 function sumHtml(){var dc=deckCards(),u=0,r=0,st=0;dc.forEach(function(c){var q=CC.rarity(c.stars);if(q==='U')u++;else if(q==='R')r++;st+=c.stars});var D=CC.DECK;
  return'<div class="cm-sum"><span class="'+(dc.length===5?'good':'bad')+'">Cards '+dc.length+'/5</span><span class="'+(u>D.maxU?'bad':'')+'">Unique '+u+'/'+D.maxU+'</span><span class="'+(r>D.maxR?'bad':'')+'">Rare '+r+'/'+D.maxR+'</span><span class="'+(st>D.maxStars?'bad':'')+'">Stars '+st+'/'+D.maxStars+'</span></div>'}
 function card(c,extra){var k=CC.card(c);return'<button class="cc-card r-'+CC.rarity(c.stars)+(extra||'')+'" data-id="'+(c.id||'')+'">'+cardHtml(c,false)+'</button>'}
 function canAdd(c){var dc=deckCards().concat([c]);if(dc.length>5)return'Deck is full. Remove a card first.';var e=CC.deckCheck(dc.length===5?dc:dc.concat(new Array(5-dc.length).fill({cid:'ant',stars:1})));return e&&dc.length<5&&/exactly/.test(e)?null:e}
 function paint(){
  var h='<div class="cm-top"><b>🎴 My cards</b><span>🍯 <b>'+SV.nec+'</b> Nectar</span><button class="cm-x">✕</button></div><div class="cm-tabs">'+['deck:Deck','cards:Cards','shop:Shop'].map(function(t){var p=t.split(':');return'<button data-tab="'+p[0]+'" class="'+(tab===p[0]?'on':'')+'">'+p[1]+'</button>'}).join('')+'</div>';
  if(tab==='deck'){var dc=deckCards();
   h+=sumHtml()+'<div class="cm-grid" style="grid-template-columns:repeat(5,1fr)">'+[0,1,2,3,4].map(function(i){var c=dc[i];return c?card(c,sel===c.id?' sel':''):'<button class="cc-card" disabled style="min-height:96px;opacity:.4"><span class="ce">＋</span></button>'}).join('')+'</div>';
   var err=dc.length===5?CC.deckCheck(dc):'Pick 5 cards';h+='<div class="cm-msg">'+(msg||(err?'⚠ '+err:'✅ Deck is ready for battle'))+'</div><div class="cm-act"><button class="pri" data-a="auto">Auto-build best deck</button><button data-a="clr">Clear deck</button></div><div class="cm-h">Tap a card to add or remove it</div><div class="cm-grid">'+SV.cards.filter(function(c){return !inDeck(c.id)}).map(function(c){return card(c)}).join('')+'</div>'}
  else if(tab==='cards'){var c=sel?byId(sel):null;
   h+='<div class="cm-h">'+SV.cards.length+' cards. Tap one to see it.</div><div class="cm-grid">'+SV.cards.slice().sort(function(a,b){return b.stars-a.stars}).map(function(c){return card(c,(sel===c.id?' sel':'')+(inDeck(c.id)?' used':''))}).join('')+'</div>';
   if(c){var k=CC.card(c);h+='<div class="cc-det"><b>'+k.e+' '+k.name+'</b> · '+ST[k.stars]+' · <em>'+CC.RNAME[CC.rarity(k.stars)]+'</em><br>⚔ '+k.atk+' · ❤ '+k.hp+' · ⚡ '+k.spd+' · ×'+k.qty+'<br>'+k.txt+'</div><div class="cm-act"><button class="red" data-a="sell">'+(confirmSell?'Tap again to sell':'Sell for 🍯 '+CC.sellValue(c.stars))+'</button></div><div class="cm-msg">Buy price was 🍯 '+CC.PRICE[c.stars]+'. Selling gives 60% back (40% penalty).'+(inDeck(c.id)?' It is in your deck right now.':'')+'</div>'}
   if(msg)h+='<div class="cm-msg">'+msg+'</div>'}
  else{var stock=CC.shopStock(SV.shop,6);
   h+='<div class="cm-h">Today’s stock. New stock appears after every match.</div><div class="cm-grid" style="grid-template-columns:repeat(3,1fr)">'+stock.map(function(c,i){var bought=(SV.bought||[]).indexOf(SV.shop+':'+i)>=0;return'<div>'+card(c,bought?' sent':'').replace('data-id=""','data-s="'+i+'"')+'<div style="text-align:center;font-size:12px;margin-top:3px">'+(bought?'Sold out':'🍯 '+CC.PRICE[c.stars])+'</div></div>'}).join('')+'</div><div class="cm-act"><button data-a="reroll">New stock · 🍯 15</button></div><div class="cm-msg">'+(msg||'Tap a card to buy it.')+'</div>'}
  d.innerHTML='<div>'+h+'</div>'}
 function toast(m){msg=m;paint()}
 d.addEventListener('click',function(e){
  if(e.target.closest('.cm-x')){d.remove();bar();return}
  var tb=e.target.closest('[data-tab]');if(tb){tab=tb.dataset.tab;sel=null;msg='';confirmSell=0;paint();return}
  var a=e.target.closest('[data-a]');
  if(a){var act=a.dataset.a;
   if(act==='auto'){var ix=CC.autoDeck(SV.cards);if(ix){SV.deck=ix.map(function(i){return SV.cards[i].id});saveSave();msg='Best deck built from your cards.'}else msg='Not enough cards for a legal deck. Buy more in the Shop.';paint()}
   else if(act==='clr'){SV.deck=[];saveSave();msg='';paint()}
   else if(act==='sell'){var c=byId(sel);if(!c)return;if(SV.cards.length<=5){msg='You need at least 5 cards. Buy another card first.';confirmSell=0;paint();return}
    if(!confirmSell){confirmSell=1;paint();return}
    SV.nec+=CC.sellValue(c.stars);SV.cards=SV.cards.filter(function(x){return x.id!==c.id});SV.deck=SV.deck.filter(function(x){return x!==c.id});sel=null;confirmSell=0;saveSave();msg='Sold. +🍯 '+CC.sellValue(c.stars);paint()}
   else if(act==='reroll'){if(SV.nec<15){msg='You need 🍯 15.';paint();return}SV.nec-=15;SV.shop=Math.floor(Math.random()*1e6);SV.bought=[];saveSave();msg='New stock!';paint()}
   return}
  var s=e.target.closest('[data-s]');
  if(s&&tab==='shop'){var i=+s.dataset.s,stock=CC.shopStock(SV.shop,6),c=stock[i],key=SV.shop+':'+i;SV.bought=SV.bought||[];if(SV.bought.indexOf(key)>=0)return;
   if(SV.nec<CC.PRICE[c.stars]){msg='Not enough Nectar. Play matches to earn more, or sell a card.';paint();return}
   SV.nec-=CC.PRICE[c.stars];SV.bought.push(key);SV.cards.push({id:SV.nid++,cid:c.cid,stars:c.stars});saveSave();BX.sfx.good();msg='Bought '+CC.BY[c.cid].name+' '+ST[c.stars]+'!';paint();return}
  var cd=e.target.closest('.cc-card[data-id]');
  if(cd&&cd.dataset.id){var id=+cd.dataset.id,c2=byId(id);if(!c2)return;
   if(tab==='deck'){if(inDeck(id)){SV.deck=SV.deck.filter(function(x){return x!==id});msg=''}else{var er=canAdd(c2);if(er&&!/at least|Pick/.test(er)&&deckCards().length>=5){msg=er}else{var test=deckCards().concat([c2]);var u=0,r=0,st=0;test.forEach(function(q){var z=CC.rarity(q.stars);if(z==='U')u++;if(z==='R')r++;st+=q.stars});
      if(test.length>5)msg='Deck is full. Remove a card first.';else if(u>CC.DECK.maxU)msg='Only '+CC.DECK.maxU+' Unique card allowed.';else if(r>CC.DECK.maxR)msg='Only '+CC.DECK.maxR+' Rare cards allowed.';else if(st>CC.DECK.maxStars)msg='That would go over '+CC.DECK.maxStars+' total stars.';else{SV.deck.push(id);msg=''}}}
    saveSave();paint()}
   else{sel=id;confirmSell=0;msg='';paint()}}});
 paint()}
function bar(){var b=root.querySelector('.cm-bar');loadSave();var html='<span>🍯 <b>'+SV.nec+'</b> Nectar · '+SV.cards.length+' cards · deck '+(deckOk()?'✅':'⚠ needs fixing')+'</span><button>🎴 My cards</button>';
 if(!b){b=document.createElement('div');b.className='cm-bar';root.insertBefore(b,root.firstChild)}b.innerHTML=html;b.querySelector('button').onclick=function(){openManager('deck')}}
function lobby(){if(G){G.dispose();G=null}document.querySelectorAll('.bx-over,.cc-how').forEach(function(x){x.remove()});
 BX.lobby(root,{game:'critter',alt:true,maxP:2,noLocal:true,note:'Decks are public and limited (1 Unique, 2 Rare, 15 stars) so matches stay fair. Each pick is locked with a secret code (hash) before it is shown, so nobody can peek or change it. Both browsers run the same battle. Your cards are saved on this device.',botNames:['Critter Bot'],onStart:start});
 bar();
 if(!localStorage.getItem('owh_cc_how2')){try{localStorage.setItem('owh_cc_how2','1')}catch(e){}setTimeout(showHow,500)}}
/* ---------- the match ---------- */
function start(sess){
 var me=sess.me,opp=1-me,online=sess.mode==='online';
 var deck=fixDeck();
 var F=BX.frame(root,{seats:sess.seats,me:me,mode:sess.mode,noMoves:true,sub:['',''],colors:['#7cc4ff','#ff7a90'],onLeave:lobby,onResign:function(){G.resign()}});
 F.stage.innerHTML='<div class="cc"><div class="cc-info" id="ccI"></div><div class="cc-strip" id="ccE"></div><div class="cc-arena" id="ccA"></div><div class="cc-hand" id="ccH"></div></div>';
 var elI=$('#ccI'),elE=$('#ccE'),elA=$('#ccA'),elH=$('#ccH');
 var mine={round:-1,i:-1,salt:'',locked:false,cSent:false,rSent:false,dSent:false,t0:0},anim=false,shown=0,tmr=0,waitSince=0,queued=null,skip=false,units=[];
 function hearts(w){var h='';for(var i=0;i<LIVES;i++)h+=i<LIVES-w?'❤️':'🖤';return h}
 function paintHud(s){F.sc(me,hearts(s.wins[opp]));F.sc(opp,hearts(s.wins[me]));F.sub(me,'army '+s.armies[me].length);F.sub(opp,'army '+s.armies[opp].length);
  var d='';for(var r=0;r<ROUNDS;r++){var w=s.res[r];d+='<i class="'+(w===undefined?'':w<0?'d':w===me?'w':'l')+'">'+(w===undefined?(r+1):w<0?'=':w===me?'✓':'✗')+'</i>'}
  elI.innerHTML='<span>Round <b>'+Math.min(ROUNDS,s.round+1)+'</b>/'+ROUNDS+'</span><span class="cc-dots">'+d+'</span>'}
 function paintStrip(s){var dk=s.decks[opp];if(!dk){elE.innerHTML='<small>Rival deck:</small><span style="color:#93a4cc;font-size:12px">waiting…</span>';return}
  elE.innerHTML='<small>Rival deck</small>'+dk.map(function(c,i){var k=CC.card(c);return'<div class="cc-mini r-'+CC.rarity(c.stars)+(s.used[opp].indexOf(i)>=0?' used':'')+'"><b>'+k.e+'</b>'+ST[k.stars]+'</div>'}).join('')}
 /* ----- battlefield ----- */
 function layout(list,top){ /* list of squad indexes per unit; returns [x%,y%] per unit */
  var n=list.length,W=elA.clientWidth||340,H=elA.clientHeight||230,rows=n<=6?1:Math.ceil(n/8),cols=Math.ceil(n/rows),out=[];
  var y0=top?.08:.56,y1=top?.44:.92,sz=Math.max(18,Math.min(44,(W*.9/cols)*.85,((y1-y0)*H/rows)*.85));
  for(var i=0;i<n;i++){var r=Math.floor(i/cols),c=i%cols,inRow=Math.min(cols,n-r*cols),x=.5+(c-(inRow-1)/2)/Math.max(cols,2)*.9,y=rows===1?(y0+y1)/2:y0+(y1-y0)*(r+.5)/rows;out.push([x*100,y*100,sz])}
  return out}
 function drawArena(armies,opts){ /* armies: [seat0army, seat1army] ; opts.unitsOverride from battle result */
  opts=opts||{};elA.innerHTML='<span class="tag t">Rival army</span><span class="tag b">Your army</span>';units=[];
  var sides={me:[],op:[]};
  if(opts.res){opts.res.units.forEach(function(u,id){sides[u.s===me?'me':'op'].push({id:id,e:u.e})})}
  else{armies.forEach(function(army,seat){army.forEach(function(c){var k=CC.card(c);for(var q=0;q<k.qty;q++)sides[seat===me?'me':'op'].push({id:-1,e:k.e})})})}
  var empty=!sides.me.length&&!sides.op.length;
  if(empty){var m=document.createElement('div');m.className='msg';m.textContent=opts.msg||'Armies appear here as creatures are deployed.';elA.appendChild(m)}
  ['op','me'].forEach(function(side){var L=sides[side],pos=layout(L,side==='op');
   L.forEach(function(u,i){var el=document.createElement('span');el.className='cc-u'+(opts.pop?' pop':'');el.textContent=u.e;el.style.left=pos[i][0]+'%';el.style.top=pos[i][1]+'%';el.style.fontSize=pos[i][2]+'px';el.style.animationDelay=(Math.random()*1.5)+'s';if(side==='me')el.style.filter=skinCss().replace(/^filter:/,'').replace(/;$/,'');
    if(side==='me'){var sc=skinCss();if(sc)el.setAttribute('style',el.getAttribute('style')+';'+sc)}
    elA.appendChild(el);if(u.id>=0)units[u.id]={el:el,x:pos[i][0],y:pos[i][1],side:side}})})}
 function floatAt(u,txt,cls){if(!u)return;var f=document.createElement('span');f.className='cc-fl '+(cls||'');f.textContent=txt;f.style.left=u.x+'%';f.style.top=(u.y-4)+'%';elA.appendChild(f);setTimeout(function(){f.remove()},850)}
 /* ----- hand (my deck) ----- */
 function remaining(s){return left(s,me)}
 function handView(s){
  var dk=s.decks[me],sel=mine.round===s.round?mine.i:-1,lk=mine.round===s.round&&mine.locked;
  elH.innerHTML='<div class="cc-offs'+(sel>=0?' has':'')+'" id="ccO">'+dk.map(function(c,i){var u=s.used[me].indexOf(i)>=0;return'<button class="cc-card r-'+CC.rarity(c.stars)+(i===sel?' sel':'')+(u?' used':'')+'" data-i="'+i+'">'+cardHtml(c,true)+'</button>'}).join('')+'</div><div class="cc-det" id="ccD"></div><div class="cc-bar"><i id="ccB"></i></div><div class="cc-go"><button id="ccL" disabled>Lock in</button><span class="cc-tm" id="ccT"></span></div><div class="cc-wait" id="ccW"></div>';
  detail(s,sel);lockBtn(s);startTimer(s);
  if(remaining(s).length===1&&!mine.locked){mine.round=s.round;mine.i=remaining(s)[0];var b=elH.querySelector('.cc-card[data-i="'+mine.i+'"]');b&&b.classList.add('sel');detail(s,mine.i);setTimeout(function(){if(G&&!G.over&&G.state.round===s.round)lock()},900)}}
 function detail(s,i){var D=$('#ccD');if(!D)return;if(i<0){D.innerHTML='Tap one of <b>your</b> cards to play it this round. <em>Higher stars = stronger but fewer creatures.</em> Your rival also picks in secret.';return}
  var k=CC.card(s.decks[me][i]);D.innerHTML='<b>'+k.e+' '+k.name+'</b> · '+ST[k.stars]+' · <em>'+CC.RNAME[CC.rarity(k.stars)]+'</em> · <em>'+k.qty+' creature'+(k.qty>1?'s':'')+'</em><br>⚔ '+k.atk+' · ❤ '+k.hp+' · ⚡ '+k.spd+' each<br><b>'+k.txt+'</b>'}
 function lockBtn(s){var b=$('#ccL'),W=$('#ccW');if(!b)return;var lk=mine.round===s.round&&mine.locked;
  b.disabled=lk||mine.round!==s.round||mine.i<0;b.textContent=lk?'Locked ✓':'Lock in';
  F.status(lk?'🔒 Locked in':'Your move: pick a card');
  if(W&&!W.querySelector('button')){if(lk){var theirs=s.commits[opp]!=null||s.phase>=2;W.textContent=theirs?'Both locked. Revealing…':'Locked in. Waiting for your rival…';if(!theirs&&!waitSince)waitSince=Date.now()}else W.textContent=''}}
 function startTimer(s){clearInterval(tmr);var rnd=s.round,t0=mine.t0;
  tmr=setInterval(function(){if(!G||G.over||anim||G.state.round!==rnd){clearInterval(tmr);return}
   var left=PICK_SEC-(Date.now()-t0)/1000,T=$('#ccT'),B=$('#ccB');if(!T){clearInterval(tmr);return}
   var lk=mine.round===rnd&&mine.locked;T.textContent=lk?'':Math.max(0,Math.ceil(left));if(B)B.style.width=(lk?0:Math.max(0,left/PICK_SEC*100))+'%';
   if(left<=0&&!lk){var rem=remaining(G.state);if(mine.round!==rnd||mine.i<0||rem.indexOf(mine.i)<0){mine.round=rnd;mine.i=rem[Math.floor(Math.random()*rem.length)]}lock()}
   checkAway()},250)}
 function lock(){var s=G.state;if(mine.round!==s.round||mine.locked||mine.i<0)return;mine.salt=BX.rndHex(8);mine.locked=true;mine.cSent=false;mine.rSent=false;BX.sfx.good();
  var o=$('#ccO');if(o){[].forEach.call(o.children,function(b){if(+b.dataset.i===mine.i){b.classList.remove('sel');b.classList.add('fly');setTimeout(function(){b.classList.remove('fly');b.classList.add('sent')},620)}else b.classList.add('sent')})}
  pump()}
 function pump(){if(!G||G.over)return;var s=G.state;
  if(s.stage===0){if(s.turn===me&&!s.decks[me]&&!mine.dSent){mine.dSent=true;G.submit({t:'d',deck:deck},me).then(function(ok){if(ok===false)mine.dSent=false})}return}
  if(mine.round===s.round&&mine.locked){
   if(s.phase<2&&s.turn===me&&s.commits[me]==null&&!mine.cSent){mine.cSent=true;var r=s.round,i=mine.i,salt=mine.salt;BX.sha(r+'|'+i+'|'+salt).then(function(h){return G.submit({t:'c',h:h},me)}).then(function(ok){if(ok===false)mine.cSent=false})}
   else if(s.phase>=2&&s.turn===me&&s.reveals[me]==null&&!mine.rSent){mine.rSent=true;G.submit({t:'r',i:mine.i,salt:mine.salt},me).then(function(ok){if(ok===false)mine.rSent=false})}}
  lockBtn(G.state)}
 function checkAway(){if(!online||!G||G.over||!waitSince||Date.now()-waitSince<50000)return;var r=G.room,hb=r&&r.hb&&r.hb[sess.uids[opp]];if(hb&&Date.now()-hb<35000)return;
  var W=$('#ccW');if(W&&!W.querySelector('button')){W.innerHTML='Your rival seems to be gone. <button class="cc-claim">Claim the win</button>';W.querySelector('button').onclick=function(){G.finish({winner:me,reason:'Rival left the match'})}}}
 /* ----- the fight ----- */
 function playBattle(s){
  var L=s.last;anim=true;skip=false;clearInterval(tmr);waitSince=0;
  var pm=L.picks[me],po=L.picks[opp],before=[L.armies[0].slice(0,-1),L.armies[1].slice(0,-1)];
  paintStrip(s);paintHud(s);elH.innerHTML='<div class="cc-det" style="text-align:center">⚔ The armies are fighting… (tap the battlefield to skip)</div>';
  drawArena(before,{});
  /* reveal both picks */
  var rv=document.createElement('div');rv.className='cc-reveal';rv.innerHTML='<div class="cc-card r-'+CC.rarity(pm.stars)+'">'+cardHtml(pm,true)+'</div><b class="vs">VS</b><div class="cc-card r-'+CC.rarity(po.stars)+'">'+cardHtml(po,false)+'</div>';elA.appendChild(rv);BX.sfx.move();
  elA.onclick=function(){skip=true};
  setTimeout(function(){rv.remove();
   var res=CC.battle(L.armies[0],L.armies[1],L.seed,true),log=res.log;drawArena(null,{res:res,pop:true,msg:''});BX.sfx.tick();
   var fi=0;
   function frame(){var f=log[fi];if(!f||(skip&&fi<log.length-1)){fi=log.length-1;f=log[fi]}
    var ev=f.ev||[];
    if(!skip)ev.forEach(function(e,k){setTimeout(function(){
     if(e.k==='hit'){var a=units[e.a],t=units[e.d];if(a&&t){var W=elA.clientWidth,H=elA.clientHeight,dx=(t.x-a.x)/100*W*.6,dy=(t.y-a.y)/100*H*.6;a.el.style.setProperty('--dx',dx+'px');a.el.style.setProperty('--dy',dy+'px');a.el.classList.remove('atk');void a.el.offsetWidth;a.el.classList.add('atk');setTimeout(function(){a.el.classList.remove('atk')},280)}
      if(t){setTimeout(function(){t.el.classList.remove('hurt');void t.el.offsetWidth;t.el.classList.add('hurt');floatAt(t,'-'+e.v);setTimeout(function(){t.el.classList.remove('hurt')},260)},110)}}
     else if(e.k==='miss'){floatAt(units[e.d],'miss','m')}
     else if(e.k==='psn'){floatAt(units[e.d],'-'+e.v+' ☠','g')}
     else if(e.k==='heal'){floatAt(units[e.d],'+'+e.v,'g')}
     else if(e.k==='rev'){var u=units[e.d];if(u){u.el.classList.add('rev');setTimeout(function(){u.el.classList.remove('rev')},650)}}
    },Math.min(260,k*(260/Math.max(1,ev.length))))});
    if(!skip&&ev.length)BX.sfx.cap();
    setTimeout(function(){f.hp.forEach(function(hp,id){var u=units[id];if(u)u.el.classList.toggle('dead',hp<=0)});
     if(fi>=log.length-1){setTimeout(end,600);return}fi++;frame()},skip?20:400)}
   function end(){
    var w=L.winner,txt=w<0?'Draw round':w===me?'You win the round! ✅':'Rival wins the round ❌';
    var b=document.createElement('div');b.className='cc-ban';b.innerHTML='<h3>'+txt+'</h3><div>Survivors: you '+L.left[me]+' · rival '+L.left[opp]+'</div>';elA.appendChild(b);
    BX.sfx[w===me?'good':'bad']();paintHud(s);
    setTimeout(function(){anim=false;shown=L.round+1;elA.onclick=null;if(queued){var q=queued;queued=null;q()}else render()},1600)}
   frame()},1500)}
 /* ----- main render ----- */
 function render(){if(!G||(G.over&&!anim))return;var s=G.state;if(anim)return;
  if(s.last&&s.last.round+1>shown){playBattle(s);return}
  paintHud(s);paintStrip(s);
  if(s.stage===0){F.status('Swapping decks…');drawArena([[],[]],{msg:'Exchanging decks with your rival…'});elH.innerHTML='';pump();return}
  if(s.round>=ROUNDS)return;
  var key=s.seed+':'+s.round;
  if(elH.dataset.k!==key||!elH.querySelector('.cc-offs')){elH.dataset.k=key;if(mine.round!==s.round){mine.round=s.round;mine.i=-1;mine.locked=false;mine.cSent=false;mine.rSent=false}mine.t0=Date.now();drawArena(s.armies,{msg:'Your first creatures will arrive after round 1.'});handView(s)}
  pump()}
 elH.addEventListener('click',function(e){if(anim)return;var c=e.target.closest('.cc-card[data-i]'),L=e.target.closest('#ccL');var s=G&&G.state;if(!s||G.over||s.stage!==1)return;
  if(c){if(mine.locked&&mine.round===s.round)return;var i=+c.dataset.i;if(s.used[me].indexOf(i)>=0)return;mine.round=s.round;mine.i=i;var o=$('#ccO');o.classList.add('has');[].forEach.call(o.children,function(x){x.classList.toggle('sel',x===c)});detail(s,i);lockBtn(s);BX.sfx.tick();return}
  if(L&&!L.disabled)lock()});
 G=new BX.Game(DEF,sess,{
  onMove:function(s,info){waitSince=0;if(s.last&&s.last.round+1>shown&&!anim){playBattle(s);return}pump()},
  onTurn:function(s){render()},
  onReject:function(){mine.cSent=mine.rSent=mine.dSent=false;setTimeout(pump,800)},
  onOver:function(r){var go=function(){var t=r.cheat?'Game void':r.winner<0?'Draw':(r.winner===me?'You win! 🏆':'You lost');
    var nec=0;if(!r.cheat){loadSave();var win=r.winner===me,dr=r.winner<0,lv=(sess.seats[opp]&&sess.seats[opp].level)||0;nec=online?(win?40:dr?25:15):(win?15+10*lv:dr?8:5);SV.nec+=nec;SV.shop=Math.floor(Math.random()*1e6);SV.bought=[];SV.played=(SV.played||0)+1;saveSave()}
    F.status('<b>'+t+'</b> — '+r.reason);BX.sfx[r.winner===me?'good':'bad']();setTimeout(function(){F.over(t,r.reason+(nec?' · +🍯 '+nec+' Nectar (spend it in My cards → Shop)':''),r.winner>=0&&r.winner===me)},500)};
   if(anim){queued=go}else go()}});
 var hb=document.createElement('button');hb.className='on';hb.textContent='❓ How to play';hb.onclick=function(){$('#bxPop').hidden=true;showHow()};F.tools.appendChild(hb);
 render();
 window.__cc={G:G,state:function(){return G.state},mine:mine,pick:function(i){mine.round=G.state.round;mine.i=i;lock()}};
}
lobby();
})();
