/* Ourworldhive board-game kit: lobby, online rooms (Firestore), tamper-evident move log, shared game controller.
   Anti-cheat model: every move is appended to an immutable hash-chained log. Each player's browser re-checks every move
   with the full game rules, so an illegal or edited move is rejected by the other side. Firestore rules enforce turn order,
   chain order and make moves write-once. There is no central referee server; see the note on each game page. */
(function(){
'use strict';
var FB='10.12.2',BX=window.BX={};
function loadScript(u){return new Promise(function(res,rej){var s=document.createElement('script');s.src=u;s.onload=res;s.onerror=function(){rej(new Error('load '+u))};document.head.appendChild(s)})}
function $(s,r){return(r||document).querySelector(s)}
function el(h){var d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild}
BX.$=$;BX.el=el;
BX.name=function(v){try{if(v!=null)localStorage.setItem('owh_bx_name',String(v).slice(0,16));var n=localStorage.getItem('owh_bx_name');if(!n){n='Player'+(100+Math.floor(Math.random()*900));localStorage.setItem('owh_bx_name',n)}return n}catch(e){return v||'Player'}};
BX.toast=function(m,ms){var t=$('#bxToast');if(!t){t=el('<div id="bxToast"></div>');document.body.appendChild(t)}t.textContent=m;t.className='on';clearTimeout(BX._tt);BX._tt=setTimeout(function(){t.className=''},ms||2600)};
var AC=null;BX.snd=true;
BX.beep=function(f,d,type,v){if(!BX.snd)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();var o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.value=v||.05;o.connect(g);g.connect(AC.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(d||.1));o.stop(AC.currentTime+(d||.1)+.02)}catch(e){}};
BX.sfx={move:function(){BX.beep(300,.07,'triangle',.07)},cap:function(){BX.beep(180,.12,'square',.05)},good:function(){BX.beep(660,.1);setTimeout(function(){BX.beep(880,.14)},90)},bad:function(){BX.beep(140,.25,'sawtooth',.05)},tick:function(){BX.beep(900,.03,'square',.03)}};
BX.sha=function(s){var b=new TextEncoder().encode(s);return crypto.subtle.digest('SHA-256',b).then(function(d){return Array.prototype.map.call(new Uint8Array(d),function(x){return('0'+x.toString(16)).slice(-2)}).join('')})};
BX.rndHex=function(n){var a=new Uint8Array(n||16);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(x){return('0'+x.toString(16)).slice(-2)}).join('')};
BX.rng=function(seed){var a=seed|0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
/* ---------- firebase ---------- */
BX.init=function(){if(BX._r)return BX._r;BX._r=(async function(){
  if(!window.OWH_FIREBASE)throw new Error('no config');
  if(!window.firebase||!firebase.firestore||!firebase.auth){var b='https://www.gstatic.com/firebasejs/'+FB+'/';if(!window.firebase)await loadScript(b+'firebase-app-compat.js');if(!firebase.auth)await loadScript(b+'firebase-auth-compat.js');if(!firebase.firestore)await loadScript(b+'firebase-firestore-compat.js')}
  if(!firebase.apps.length)firebase.initializeApp(window.OWH_FIREBASE);
  BX.db=firebase.firestore();BX.auth=firebase.auth();
  if(!BX.auth.currentUser)await BX.auth.signInAnonymously();
  BX.uid=BX.auth.currentUser.uid;return true})();return BX._r};
var TS=function(){return firebase.firestore.FieldValue.serverTimestamp()};
function code(){var c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='',a=new Uint8Array(5);crypto.getRandomValues(a);for(var i=0;i<5;i++)s+=c[a[i]%c.length];return s}
BX.need=function(cb){if(window.OWHG&&window.BX_CATALOG)return cb();function ld(u,n){var x=document.createElement('script');x.src=u;x.onload=n;x.onerror=n;document.head.appendChild(x)}
 (window.OWHG?function(n){n()}:function(n){ld('owh-game.js',n)})(function(){ld('board-items.js',cb)})};
BX.gameInit=function(g){BX.G=g;BX.need(function(){var c=window.BX_CATALOG&&BX_CATALOG[g];if(c&&window.OWHG){OWHG.init(c);var H={chess:[['\uD83D\uDC46','Click or tap a piece, then click the square to move to'],['\u23F1\uFE0F','Pick a timer mode in the lobby if you want a clock']],ludo:[['\uD83C\uDFB2','Click or tap the dice to roll'],['\uD83D\uDC46','Then click the token you want to move']],carrom:[['\uD83D\uDC46','Slide the striker along your line to place it'],['\uD83C\uDFAF','Drag back to aim and set power, release to shoot']],uttt:[['\uD83D\uDC46','Click a cell in the highlighted board'],['\uD83E\uDDE0','Your cell decides which board your opponent plays next']],critter:[['\uD83D\uDC46','Tap a card to see it, then Lock in'],['\u2B50','More stars = stronger creatures but fewer of them'],['\uD83E\uDD16','Practise vs computer for free']]};
  OWHG.setHelp({keys:[{id:'help',label:'Show these controls',def:['h'],short:'controls'}],fixed:[['Esc','Close menus and panels'],['Mouse','Everything works with a mouse or touch']],touch:(H[g]||[]).concat([['\uD83D\uDCAC','Chat button: emojis, quick lines and taunts']])});
  if(!BX._hk){BX._hk=1;document.addEventListener('keydown',function(e){if(/INPUT|TEXTAREA/.test((e.target||{}).tagName)||e.ctrlKey||e.metaKey)return;if(window.OWHG&&OWHG.isKey(e,'help')){OWHG.openHelp();e.preventDefault()}})}
  OWHG.mount();setTimeout(function(){OWHG.hint()},900)}})};
BX.eqName=function(){var n=BX.name();try{var b=window.OWHG&&OWHG.game()===BX.G&&OWHG.eq('badge');if(b)n=(n.slice(0,12)+' '+b.e).slice(0,16)}catch(e){}return n};
BX.room={
 create:async function(game,max,alt){await BX.init();var rid=code(),seed=Math.floor(Math.random()*2147483646)+1;
  await BX.db.collection('board_rooms').doc(rid).set({game:game,host:BX.uid,players:[BX.uid],names:(function(){var o={};o[BX.uid]=BX.eqName();return o})(),max:max,alt:!!alt,seed:seed,status:'open',created:TS(),hb:{}});return rid},
 join:async function(rid){await BX.init();rid=String(rid||'').trim().toUpperCase();var ref=BX.db.collection('board_rooms').doc(rid);
  return BX.db.runTransaction(async function(tx){var s=await tx.get(ref);if(!s.exists)throw new Error('Room not found');var d=s.data();if(d.players.indexOf(BX.uid)>=0)return d;if(d.players.length>=d.max||d.status!=='open')throw new Error('Room is full');
   var p=d.players.concat([BX.uid]),nm={};Object.keys(d.names||{}).forEach(function(k){nm[k]=d.names[k]});nm[BX.uid]=BX.eqName();
   tx.update(ref,{players:p,names:nm,status:p.length>=d.max?'playing':'open'});d.players=p;d.names=nm;d.status=p.length>=d.max?'playing':'open';return d})},
 quick:async function(game,max,alt){await BX.init();var ms=function(v){return v&&v.toMillis?v.toMillis():Date.now()},now=Date.now(),q=await BX.db.collection('board_rooms').where('status','==','open').where('game','==',game).limit(15).get(),c=[];
  q.forEach(function(d){var v=d.data();if(v.players.indexOf(BX.uid)<0&&now-ms(v.created)<90000&&v.players.length<v.max)c.push({id:d.id,t:ms(v.created)})});c.sort(function(a,b){return a.t-b.t});
  for(var i=0;i<c.length;i++){try{var d=await BX.room.join(c[i].id);return{rid:c[i].id,data:d,joined:true}}catch(e){}}
  var rid=await BX.room.create(game,max,alt),sn=await BX.db.collection('board_rooms').doc(rid).get();return{rid:rid,data:sn.data(),t:ms(sn.data().created)}},
 open:async function(game){await BX.init();var q=await BX.db.collection('board_rooms').where('status','==','open').where('game','==',game).limit(15).get();var o=[];q.forEach(function(d){var v=d.data();if(v.players.indexOf(BX.uid)<0)o.push({rid:d.id,data:v})});return o},
 watch:function(rid,cb){return BX.db.collection('board_rooms').doc(rid).onSnapshot(function(s){if(s.exists)cb(s.data())})},
 moves:function(rid,cb){return BX.db.collection('board_rooms').doc(rid).collection('moves').orderBy('n').onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(d.data())});cb(a)})},
 send:function(rid,n,by,ph,mv){return BX.sha(ph+'|'+n+'|'+by+'|'+mv).then(function(h){return BX.db.collection('board_rooms').doc(rid).collection('moves').doc(String(n)).set({n:n,by:by,mv:mv,ph:ph,h:h})})},
 patch:function(rid,o){return BX.db.collection('board_rooms').doc(rid).update(o)},
 beat:function(rid){var o={};o['hb.'+BX.uid]=Date.now();return BX.db.collection('board_rooms').doc(rid).update(o).catch(function(){})}
};
/* ---------- game controller ---------- */
/* def: {init(seed,n,seats), validate(state,seat,move)->null|string|Promise, apply(state,seat,move), needs(state,seat)->bool,
   over(state)->null|{winner,reason}, bot(state,seat,level)->move|Promise, onResign(state,seat)} */
BX.Game=function(def,sess,ui){
 var G=this;G.def=def;G.s=sess;G.ui=ui||{};G.state=def.init(sess.seed,sess.seats.length,sess.seats);G.n=0;G.hash='genesis:'+(sess.rid||'local');G.log=[];G.q=Promise.resolve();G.pending=false;G.over=null;G.botBusy={};G.verified=0;G.t0=Date.now();
 if(sess.mode==='online'){
  G.unM=BX.room.moves(sess.rid,function(docs){docs.forEach(function(d){if(d.n>=G.nextIn()){G._in=d.n+1;G.enq(d)}})});
  G.unR=BX.room.watch(sess.rid,function(r){G.room=r;if(r.resigned&&!G.over){var seat=r.players.indexOf(r.resigned);if(seat>=0&&seat!==sess.me)G.finish(def.onResign?def.onResign(G.state,seat):{winner:sess.me,reason:'Opponent resigned'})}G.ui.onRoom&&G.ui.onRoom(r)});
  BX.room.beat(sess.rid);G.hb=setInterval(function(){BX.room.beat(sess.rid)},15000);
 }
 setTimeout(function(){G.after()},50);
};
BX.Game.prototype.nextIn=function(){return this._in||0};
BX.Game.prototype.enq=function(rec){var G=this;G.q=G.q.then(function(){return G.process(rec)}).catch(function(e){console.error(e)})};
BX.Game.prototype.mySeats=function(){var s=this.s;return s.mode==='online'?[s.me]:s.seats.map(function(x,i){return x.bot?-1:i}).filter(function(i){return i>=0})};
BX.Game.prototype.submit=function(mv,seat){var G=this,s=G.s;if(G.over)return Promise.resolve(false);
 if(seat==null)seat=s.mode==='online'?s.me:G.humanSeat();
 if(s.mode==='online'){if(G.pending)return Promise.resolve(false);G.pending=true;return BX.room.send(s.rid,G._out!=null?G._out:G.n,s.uids[seat],G.hash,JSON.stringify(mv)).catch(function(e){G.pending=false;console.warn('send',e);if(G.ui.onReject)G.ui.onReject();else BX.toast('Move not accepted (someone else moved first, or connection issue).')})}
 G.enq({n:G.n,by:seat,mv:mv,local:true});return Promise.resolve(true)};
BX.Game.prototype.humanSeat=function(){var G=this,st=G.state;var m=G.mySeats();for(var i=0;i<m.length;i++)if(G.def.needs(st,m[i]))return m[i];return m[0]};
BX.Game.prototype.process=async function(rec){var G=this,s=G.s,def=G.def;if(G.over)return;
 var seat=rec.by,mv=rec.mv;
 if(s.mode==='online'){
  seat=s.uids.indexOf(rec.by);if(seat<0){return G.cheat(-1,'Move from a player who is not in this room')}
  var h=await BX.sha(rec.ph+'|'+rec.n+'|'+rec.by+'|'+rec.mv);
  if(rec.n!==G.n||rec.ph!==G.hash||h!==rec.h)return G.cheat(seat,'Move log was edited or out of order');
  try{mv=JSON.parse(rec.mv)}catch(e){return G.cheat(seat,'Unreadable move')}
 }
 var err=await def.validate(G.state,seat,mv);
 if(err)return G.cheat(seat,String(err));
 def.apply(G.state,seat,mv);G.n++;if(s.mode==='online'){G.hash=rec.h;G._out=G.n}G.verified++;G.log.push({seat:seat,mv:mv});
 if(seat===s.me||s.mode!=='online')G.pending=false;
 G.ui.onMove&&G.ui.onMove(G.state,{seat:seat,mv:mv,n:G.n});
 var ov=def.over(G.state);if(ov)return G.finish(ov);
 G.after()};
BX.Game.prototype.after=function(){var G=this;if(G.over)return;G.ui.onTurn&&G.ui.onTurn(G.state);
 G.s.seats.forEach(function(st,i){if(!st.bot||G.botBusy[i]||G.over)return;if(!G.def.needs(G.state,i))return;G.botBusy[i]=1;
  setTimeout(async function(){try{if(G.over){G.botBusy[i]=0;return}var m=await G.def.bot(G.state,i,st.level||1);G.botBusy[i]=0;if(m)G.enq({n:G.n,by:i,mv:m,local:true})}catch(e){G.botBusy[i]=0;console.error(e)}},G.def.botDelay||650)})};
BX.Game.prototype.cheat=function(seat,why){var G=this,s=G.s;if(G.over)return;
 var win=s.mode==='online'&&seat!==s.me?s.me:-1;
 G.finish({winner:win,cheat:true,seat:seat,reason:'Illegal or tampered move detected ('+why+'). The game is void'+(win>=0?' and you are the winner.':'.')})};
BX.Game.prototype.finish=function(r){var G=this;if(G.over)return;G.over=r;clearInterval(G.hb);
 if(G.s.mode==='online'&&G.room&&G.s.me===0){BX.room.patch(G.s.rid,{status:'done',result:{winner:r.winner,reason:String(r.reason||'').slice(0,80)}}).catch(function(){})}
 G.ui.onOver&&G.ui.onOver(r)};
BX.Game.prototype.resign=function(){var G=this,s=G.s;if(G.over)return;if(s.mode==='online'){BX.room.patch(s.rid,{resigned:BX.uid}).catch(function(){});G.finish({winner:s.seats.length===2?1-s.me:-1,reason:'You resigned'})}else G.finish(G.def.onResign?G.def.onResign(G.state,G.humanSeat()):{winner:-1,reason:'Game ended'})};
BX.Game.prototype.dispose=function(){var G=this;G.over=G.over||{winner:-1,reason:'left'};clearInterval(G.hb);G.unM&&G.unM();G.unR&&G.unR()};
/* ---------- lobby ---------- */
BX.lobby=function(root,o){BX.closeFs();BX.gameInit(o.game);
 root.innerHTML='<div class="bx-lob"><div class="bx-card"><label class="bx-l">Your name</label><input id="bxN" maxlength="16" class="bx-in" value="'+BX.name()+'">'+
 '<div class="bx-tabs"><button data-t="bot" class="on">🤖 Vs Computer</button>'+(o.noLocal?'':'<button data-t="loc">👥 Pass &amp; play</button>')+'<button data-t="on">🌐 Online</button></div><div id="bxP"></div></div>'+
 '<div class="bx-card bx-note"><b>Fair play.</b> '+(o.note||'')+'</div></div>';
 var TCS=o.timer||null,tcI=0;try{tcI=Math.min((TCS||[]).length-1,+localStorage.getItem('owh_tc')||0)}catch(e){}
 var P=$('#bxP',root),tab='bot',nB=o.maxP?Math.min(o.maxP,o.minP||2):2,lvl=1,unW=null;
 $('#bxN',root).onchange=function(){var el=this,old=BX.name(),v=el.value.trim();BX.need(function(){OWHG.claimName(v).then(function(r){if(r.ok){el.value=r.name;BX.toast('Name saved. Your scores moved to the new name.')}else{el.value=old;BX.toast(r.msg)}})})};
 var nums=function(id,lo,hi,cur){var h='';for(var i=lo;i<=hi;i++)h+='<button data-v="'+i+'" class="'+(i===cur?'on':'')+'">'+i+'</button>';return'<div class="bx-seg" id="'+id+'">'+h+'</div>'};
 function seg(id,cb){$('#'+id,root).onclick=function(e){var b=e.target.closest('button');if(!b)return;[].forEach.call(this.children,function(x){x.classList.remove('on')});b.classList.add('on');cb(b.dataset.v)}}
 function tcHtml(){if(!TCS)return'';return'<label class="bx-l">⏱ Timer mode</label><div class="bx-seg bx-tc" id="bxT">'+TCS.map(function(t,i){return'<button data-v="'+i+'" class="'+(i===tcI?'on':'')+'">'+t.n+'</button>'}).join('')+'</div>'}
 function tcBind(){if(TCS)seg('bxT',function(v){tcI=+v;try{localStorage.setItem('owh_tc',v)}catch(e){}})}
 function start(sess){BX.cur={game:o.game,lvl:lvl,mode:sess.mode};if(TCS&&TCS[tcI]&&TCS[tcI].m&&sess.mode!=='online')sess.tc={m:TCS[tcI].m,inc:TCS[tcI].inc||0};root.innerHTML='';o.onStart(sess)}
 function names(n,bots,human){var a=[];for(var i=0;i<n;i++){a.push({name:i===0?BX.eqName():(bots?o.botNames?o.botNames[i-1]:'Computer '+i:'Player '+(i+1)),bot:!!(bots&&i>0),level:lvl})}return a}
 function render(){
  if(unW){unW();unW=null}
  if(tab==='bot'){P.innerHTML='<label class="bx-l">Difficulty</label><div class="bx-seg" id="bxL"><button data-v="0">Easy</button><button data-v="1" class="on">Medium</button><button data-v="2">Hard</button></div>'+tcHtml()+(o.maxP>2?'<label class="bx-l">Players (you + computers)</label>'+nums('bxC',o.minP||2,o.maxP,nB):'')+'<button class="btn gold bx-go" id="bxGo">Start game</button>';
   seg('bxL',function(v){lvl=+v});tcBind();if(o.maxP>2)seg('bxC',function(v){nB=+v});
   $('#bxGo',root).onclick=function(){var n=o.maxP>2?nB:2;start({mode:'bot',seats:names(n,true),me:0,seed:Math.floor(Math.random()*2147483646)+1,uids:null})}}
  else if(tab==='loc'){P.innerHTML=(o.maxP>2?'<label class="bx-l">Players on this device</label>'+nums('bxC',o.minP||2,o.maxP,nB):'<p class="bx-p">Two players share this screen and take turns.</p>')+tcHtml()+'<button class="btn gold bx-go" id="bxGo">Start game</button>';tcBind();
   if(o.maxP>2)seg('bxC',function(v){nB=+v});
   $('#bxGo',root).onclick=function(){var n=o.maxP>2?nB:2,a=names(n,false);a[0].name=BX.eqName();start({mode:'local',seats:a,me:0,seed:Math.floor(Math.random()*2147483646)+1,uids:null})}}
  else{P.innerHTML='<div id="bxOn"><p class="bx-p">Connecting…</p></div>';
   BX.init().then(function(){onlineUI()}).catch(function(){$('#bxOn',root).innerHTML='<p class="bx-p">Online play needs the site to be connected to Firebase with Anonymous sign-in enabled. Try again later, or play against the computer.</p>'})}}
 function enter(rid,d){
  var W=$('#bxOn',root);W.innerHTML='<div class="bx-wait"><div class="bx-spin"></div><h3>Room <span class="bx-code">'+rid+'</span></h3><p class="bx-p">Waiting for players ('+d.players.length+'/'+d.max+')… Share this code or link:</p><input class="bx-in" readonly value="'+location.origin+location.pathname+'?room='+rid+'" onclick="this.select()"><button class="btn" id="bxCp">Copy link</button> <button class="btn" id="bxCx">Cancel</button></div>';
  $('#bxCp',root).onclick=function(){try{navigator.clipboard.writeText(location.origin+location.pathname+'?room='+rid);BX.toast('Link copied')}catch(e){}};
  var done=false;function go(r){if(done)return;done=true;un();var seats=r.players.map(function(u){return{name:(r.names&&r.names[u])||'Player',bot:false}});start({mode:'online',rid:rid,seats:seats,uids:r.players,me:r.players.indexOf(BX.uid),seed:r.seed})}
  var un=BX.room.watch(rid,function(r){if(done)return;W.querySelector('p.bx-p').firstChild.textContent='Waiting for players ('+r.players.length+'/'+r.max+')… Share this code or link:';if(r.status!=='open'&&r.players.length>=r.max)go(r)});
  unW=function(){if(!done){done=true;un();clearTimeout(botT)}};
  /* owner-controlled bots: if nobody joins, fill the room with computer players (set in Studio) */
  var botT=0;
  if(d.players.length<d.max&&d.players.length<=1&&d.host===BX.uid){
   (window.OWHBOTS?Promise.resolve():new Promise(function(ok){var sc=document.createElement('script');sc.src='owh-bots.js';sc.onload=sc.onerror=ok;document.head.appendChild(sc)})).then(function(){
    if(done||!window.OWHBOTS)return;return OWHBOTS.cfg(BX.db,o.game).then(function(c){
     if(!c||done)return;
     botT=setTimeout(function(){if(done)return;done=true;un();
      BX.db.collection('board_rooms').doc(rid).delete().catch(function(){});
      var nm=OWHBOTS.names(d.max-1,c.tag),seats=[{name:BX.name(),bot:false}];
      for(var i=0;i<d.max-1;i++)seats.push({name:nm[i],bot:true,level:lvl});
      start({mode:'bot',seats:seats,me:0,seed:Math.floor(Math.random()*2147483646)+1,uids:null})},OWHBOTS.delay())})})}
  $('#bxCx',root).onclick=function(){unW();BX.db.collection('board_rooms').doc(rid).delete().catch(function(){});render()};
  if(d.players.length>=d.max&&d.status!=='open')go(d)}
 function onlineUI(){var W=$('#bxOn',root);
  W.innerHTML=(o.maxP>2?'<label class="bx-l">Players in the room</label>'+nums('bxC',o.minP||2,o.maxP,nB):'')+'<button class="btn gold bx-go" id="bxQm">⚡ Quick match</button><p class="bx-p" style="margin:4px 0 10px">Finds a live rival for you in a few seconds.</p><button class="btn bx-go" id="bxCr">Create room</button><label class="bx-l">Join with a code</label><div class="bx-row"><input id="bxCd" class="bx-in" maxlength="5" placeholder="ABCDE" style="text-transform:uppercase"><button class="btn" id="bxJn">Join</button></div><label class="bx-l">Open rooms <button class="bx-ln" id="bxRf">refresh</button></label><div id="bxRl" class="bx-rooms"><p class="bx-p">Loading…</p></div>';
  if(o.maxP>2)seg('bxC',function(v){nB=+v});
  $('#bxCr',root).onclick=function(){BX.room.create(o.game,o.maxP>2?nB:2,o.alt).then(function(rid){return BX.db.collection('board_rooms').doc(rid).get().then(function(s){enter(rid,s.data())})}).catch(function(e){BX.toast('Could not create the room: '+(e.code||e.message))})};
  $('#bxQm',root).onclick=function(){var b=this;b.disabled=true;b.textContent='Searching…';
   BX.room.quick(o.game,o.maxP>2?nB:2,o.alt).then(function(r){enter(r.rid,r.data);if(r.joined)return;var ms=function(v){return v&&v.toMillis?v.toMillis():Date.now()},mine=r.rid,myT=r.t||Date.now();
    var qi=setInterval(function(){if(!$('#bxCx',root)||!$('#bxOn',root)){clearInterval(qi);return}
     BX.room.open(o.game).then(function(a){if(!$('#bxCx',root))return;var best=null;a.forEach(function(x){var t=ms(x.data.created);if(x.rid!==mine&&x.data.players.length<x.data.max&&Date.now()-t<90000&&(t<myT||(t===myT&&x.rid<mine))&&(!best||t<best.t))best={rid:x.rid,t:t}});
      if(best){clearInterval(qi);if(unW){unW();unW=null}BX.db.collection('board_rooms').doc(mine).delete().catch(function(){});jn(best.rid)}}).catch(function(){})},4000)}).catch(function(e){b.disabled=false;b.textContent='⚡ Quick match';BX.toast('Could not search: '+(e.code||e.message))})};
  function jn(rid){BX.room.join(rid).then(function(d){enter(String(rid).toUpperCase(),d)}).catch(function(e){BX.toast(e.message||'Could not join')})}
  $('#bxJn',root).onclick=function(){jn($('#bxCd',root).value)};
  function list(){BX.room.open(o.game).then(function(a){var L=$('#bxRl',root);if(!L)return;L.innerHTML=a.length?'':'<p class="bx-p">No open rooms right now. Create one!</p>';a.forEach(function(r){var b=el('<button class="bx-room"><b>'+((r.data.names&&r.data.names[r.data.host])||'Player').replace(/</g,'&lt;')+'</b><span>'+r.data.players.length+'/'+r.data.max+' · '+r.rid+'</span></button>');b.onclick=function(){jn(r.rid)};L.appendChild(b)})}).catch(function(){var L=$('#bxRl',root);if(L)L.innerHTML='<p class="bx-p">Could not load rooms.</p>'})}
  $('#bxRf',root).onclick=list;list();
  var q=new URLSearchParams(location.search).get('room');if(q&&!BX._autoj){BX._autoj=1;jn(q)}}
 root.querySelector('.bx-tabs').onclick=function(e){var b=e.target.closest('button');if(!b)return;[].forEach.call(this.children,function(x){x.classList.remove('on')});b.classList.add('on');tab=b.dataset.t;render()};
 if(new URLSearchParams(location.search).get('room')){tab='on';[].forEach.call(root.querySelectorAll('.bx-tabs button'),function(x){x.classList.toggle('on',x.dataset.t==='on')})}
 render();
};

/* ---------- shared game frame: fullscreen, no scrolling, chat + emoji ---------- */
BX.COLORS=['#ffc857','#7cc4ff','#ff7a90','#7be0a0'];
BX.EMOJI=['😀','😂','😮','😡','👏','🔥','😭','👍'];
BX.closeFs=function(){var f=document.querySelector('.bx-fs');if(f){if(f._un)f._un();f.remove()}document.documentElement.classList.remove('bx-nos')};
BX.room.chatSend=function(rid,d){return BX.db.collection('board_rooms').doc(rid).collection('chat').add(d)};
BX.room.chatWatch=function(rid,cb){return BX.db.collection('board_rooms').doc(rid).collection('chat').orderBy('ts').limitToLast(60).onSnapshot(function(s){s.docChanges().forEach(function(c){if(c.type==='added')cb(c.doc.data())})})};
BX.confetti=function(){var c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:2600;pointer-events:none';document.body.appendChild(c);var W=c.width=innerWidth,H=c.height=innerHeight,x=c.getContext('2d'),P=[],cols=['#ffc857','#7cc4ff','#ff7a90','#7be0a0','#b79cff','#fff'];
 for(var i=0;i<150;i++)P.push({x:W/2+(Math.random()-.5)*W*.3,y:H*.55,vx:(Math.random()-.5)*14,vy:-Math.random()*16-6,r:Math.random()*6+3,c:cols[i%6],a:Math.random()*6,va:Math.random()*.4-.2});
 var t0=performance.now();(function f(t){var e=t-t0;x.clearRect(0,0,W,H);P.forEach(function(p){p.vy+=.32;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.globalAlpha=Math.max(0,1-e/3200);x.fillRect(-p.r,-p.r/2,p.r*2,p.r);x.restore()});if(e<3300)requestAnimationFrame(f);else c.remove()})(t0)};
BX.frame=function(root,o){
 BX.closeFs();root.innerHTML='';var seats=o.seats,mode=o.mode,esc=function(t){return String(t).replace(/[<&>]/g,'')};
 var fs=el('<div class="bx-fs"><i class="bx-b1"></i><i class="bx-b2"></i><div class="bx-top"><div class="bx-pls" id="bxPls"></div><div class="bx-st" id="bxSt"></div><button class="bx-ib" id="bxMn" aria-label="Menu">☰</button></div><div class="bx-mid"><div class="bx-stage" id="bxStage"></div></div><div class="bx-bot"><div class="bx-em" id="bxEm"></div><button class="bx-ib" id="bxCh" aria-label="Chat">💬<b class="bx-dot" hidden></b></button></div><div class="bx-pop" id="bxPop" hidden><div class="bx-tools" id="bxTools"></div>'+(o.noMoves?'':'<div class="bx-moves" id="bxMv"></div>')+'<div class="bx-ver" id="bxVer"></div><div class="bx-ctl"><button class="btn" id="bxRs">'+(o.resignLabel||'Resign')+'</button><button class="btn" id="bxSn">🔊 Sound</button><button class="btn" id="bxLv">Leave</button></div></div><div class="bx-chat" id="bxChat" hidden><div class="bx-cl" id="bxCl"></div><form id="bxCf"><input maxlength="120" placeholder="Say something nice…" autocomplete="off"><button class="btn gold">Send</button></form></div><div class="bx-fl" id="bxFl"></div></div>');
 document.body.appendChild(fs);document.documentElement.classList.add('bx-nos');
 try{var ar=window.OWHG&&OWHG.game()===BX.G&&OWHG.eq('arena');if(ar)fs.style.background=ar.bg}catch(e){}
 var Q=function(i){return fs.querySelector(i)},F={stage:Q('#bxStage'),tools:Q('#bxTools'),mv:Q('#bxMv'),fs:fs};
 var P=Q('#bxPls');if(seats.length>2)P.classList.add('many');seats.forEach(function(s,i){P.appendChild(el('<div class="bx-pl" data-i="'+i+'"><span class="av" style="background:'+(o.colors?o.colors[i]:BX.COLORS[i])+'">'+(s.bot?'🤖':esc(s.name||'?').charAt(0).toUpperCase())+'</span><span class="nm"><b>'+esc(s.name||'Player').slice(0,12)+(o.me===i&&mode==='online'?' • you':'')+'</b><small>'+(o.sub?o.sub[i]:'')+'</small></span><span class="ck" hidden></span><span class="sc"></span></div>'))});
 F.act=function(i){[].forEach.call(P.children,function(c,k){c.classList.toggle('act',k===i)})};
 F.clock=function(i,t,cls){var c=P.children[i].querySelector('.ck');c.hidden=false;c.textContent=t;c.className='ck '+(cls||'')};F.sc=function(i,t){P.children[i].querySelector('.sc').textContent=t};F.sub=function(i,t){P.children[i].querySelector('small').innerHTML=t};
 F.status=function(t){Q('#bxSt').innerHTML=t};
 F.ver=function(n){Q('#bxVer').innerHTML=mode==='online'?'🔒 '+n+' moves verified (hash-chained)':''};
 F.addMove=function(t,i){if(!F.mv)return;if(i%2===0&&o.pairs)F.mv.appendChild(el('<i>'+(i/2+1)+'.</i>'));var d=document.createElement('span');d.textContent=t;F.mv.appendChild(d);F.mv.scrollTop=1e6};
 function leave(){BX.closeFs();o.onLeave()}
 F.over=function(title,msg,good){if(good)BX.confetti();
  /* this game's own ranking */
  var gain=0,rtxt='';try{var cu=BX.cur||{};if(window.OWHG&&OWHG.game()===BX.G&&!/void/i.test(title)&&mode!=='local'){var dr=/draw|game over|stalemate/i.test(title),win=!!good&&!dr;
    if(mode==='online')gain=win?25:dr?8:3;else gain=win?6+5*(cu.lvl||0):dr?2:0;
    OWHG.report({pts:gain,win:win,draw:dr,loss:!win&&!dr});rtxt='<p style="margin:-6px 0 12px;color:#ffc857"><b>'+(gain?'+'+gain+' ranking points':'No ranking points this time')+'</b></p>'}}catch(e){}
  var d=el('<div class="bx-over"><div><h2>'+title+'</h2><p>'+msg+'</p>'+rtxt+'<button class="btn gold" id="bxAg">Play again</button><button class="btn" id="bxVw">View board</button>'+(rtxt?'<button class="btn" id="bxRk">🏆 Ranking</button>':'')+'</div></div>');document.body.appendChild(d);var rk=d.querySelector('#bxRk');if(rk)rk.onclick=function(){OWHG.openRank()};d.querySelector('#bxAg').onclick=function(){d.remove();leave()};d.querySelector('#bxVw').onclick=function(){d.remove()}};
 var pop=Q('#bxPop'),chat=Q('#bxChat');
 Q('#bxMn').onclick=function(e){e.stopPropagation();pop.hidden=!pop.hidden;chat.hidden=true};
 Q('#bxCh').onclick=function(e){e.stopPropagation();chat.hidden=!chat.hidden;pop.hidden=true;Q('.bx-dot').hidden=true;if(!chat.hidden){var i=chat.querySelector('input');i&&i.focus()}};
 fs.addEventListener('click',function(e){if(!e.target.closest('.bx-pop,.bx-chat'))pop.hidden=chat.hidden=true});
 Q('#bxSn').onclick=function(){BX.snd=!BX.snd;this.textContent=BX.snd?'🔊 Sound':'🔇 Muted'};
 Q('#bxLv').onclick=leave;Q('#bxRs').onclick=function(){pop.hidden=true;if(confirm('Are you sure?'))o.onResign()};
 /* reactions + chat */
 function float(seat,em){var f=Q('#bxFl'),d=el('<span class="bx-fe"><big>'+em+'</big><small>'+esc((seats[seat]&&seats[seat].name)||'').slice(0,10)+'</small></span>');d.style.left=(18+Math.random()*64)+'%';f.appendChild(d);setTimeout(function(){d.remove()},2600);BX.sfx.tick();var pc=P.children[seat];if(pc){pc.classList.add('bump');setTimeout(function(){pc.classList.remove('bump')},500)}}
 function line(seat,t){var L=Q('#bxCl');L.appendChild(el('<p><b style="color:'+(o.colors?o.colors[seat]:BX.COLORS[seat])+'">'+esc((seats[seat]&&seats[seat].name)||'?').slice(0,12)+'</b> '+esc(t)+'</p>'));L.scrollTop=1e6;if(chat.hidden)Q('.bx-dot').hidden=false}
 function incoming(seat,type,x){if(type==='e'&&x.indexOf('@t:')===0){var ti=window.OWHG&&OWHG.by(x.slice(3));if(ti&&ti.t==='taunt')OWHG.showTaunt(ti,(seats[seat]&&seats[seat].name)||'');return}if(type==='e')float(seat,x);else{line(seat,x);}}
 var BOTSAY=['😎','🤔','😂','👍','Good move!','Hmm, nice one','Let’s go!'],started=Date.now();
 function say(type,x){var seat=mode==='online'?o.me:0;if(mode==='online'){BX.room.chatSend(o.rid,{by:BX.uid,seat:seat,t:type,x:x,ts:Date.now()}).catch(function(){BX.toast('Chat not sent')})}else{incoming(seat,type,x);if(mode==='bot'&&Math.random()<.8){var bs=seats.map(function(s,i){return s.bot?i:-1}).filter(function(i){return i>=0});if(bs.length)setTimeout(function(){var b=bs[Math.floor(Math.random()*bs.length)],r=BOTSAY[Math.floor(Math.random()*BOTSAY.length)];incoming(b,r.length<4?'e':'m',r)},900+Math.random()*900)}}}
 F.botReact=function(kind){if(mode!=='bot'||Math.random()>.45)return;var bs=seats.map(function(s,i){return s.bot?i:-1}).filter(function(i){return i>=0});if(bs.length)setTimeout(function(){incoming(bs[0],'e',kind==='win'?'😎':kind==='bad'?'😭':'😮')},700)};
 var em=Q('#bxEm');BX.EMOJI.forEach(function(e){var b=document.createElement('button');b.textContent=e;b.onclick=function(ev){ev.stopPropagation();say('e',e)};em.appendChild(b)});
 Q('#bxCf').onsubmit=function(e){e.preventDefault();var i=this.querySelector('input'),v=i.value.trim();if(!v)return;i.value='';say('m',v)};
 if(mode==='local'){Q('#bxCh').style.display='none'}
 if(mode==='online'){var un=BX.room.chatWatch(o.rid,function(d){if(!d||typeof d.x!=='string'||d.seat===o.me&&d.by===BX.uid&&false)return;if(d.t==='e'&&d.ts<started-4000)return;incoming(d.seat|0,d.t,d.x.slice(0,120))});fs._un=un}
 /* taunts, chat lines and store (this game's own) */
 (function(){if(!(window.OWHG&&OWHG.game()===BX.G))return;
  var tb=document.createElement('button');tb.textContent='\uD83D\uDDEF';tb.title='Taunts';tb.onclick=function(ev){ev.stopPropagation();tray()};em.appendChild(tb);
  function tray(){var t=fs.querySelector('#bxTn');if(t){t.remove();return}t=document.createElement('div');t.id='bxTn';t.style.cssText='position:absolute;left:8px;right:8px;bottom:70px;z-index:40;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:8px;border-radius:16px;background:rgba(8,12,30,.94);border:1px solid rgba(255,255,255,.2)';
   OWHG.items('taunt').forEach(function(it){var b=document.createElement('button');b.className='btn';b.style.cssText='padding:7px 10px;font-size:13px';var own=OWHG.has(it.id);b.textContent=(own?it.e+' ':'\uD83D\uDD12 ')+it.n;b.onclick=function(ev){ev.stopPropagation();t.remove();if(!own){OWHG.openStore('taunt');return}say('e','@t:'+it.id)};t.appendChild(b)});
   var g=document.createElement('button');g.className='btn gold';g.style.cssText='padding:7px 10px;font-size:13px';g.textContent='\uD83D\uDED2 More';g.onclick=function(ev){ev.stopPropagation();t.remove();OWHG.openStore('taunt')};t.appendChild(g);fs.appendChild(t)}
  var chips=document.createElement('div');chips.style.cssText='display:flex;flex-wrap:wrap;gap:5px;padding:4px 0';chat.insertBefore(chips,Q('#bxCf'));
  function paintChips(){chips.innerHTML='';OWHG.owned('chat').forEach(function(it){var b=document.createElement('button');b.className='btn';b.style.cssText='padding:4px 9px;font-size:12px';b.textContent=it.txt;b.onclick=function(ev){ev.stopPropagation();say('m',it.txt)};chips.appendChild(b)});var m=document.createElement('button');m.className='btn gold';m.style.cssText='padding:4px 9px;font-size:12px';m.textContent='\uD83D\uDED2 Lines';m.onclick=function(ev){ev.stopPropagation();OWHG.openStore('chat')};chips.appendChild(m)}
  paintChips();OWHG.on(paintChips);
  var T=Q('#bxTools');if(T){var s1=document.createElement('button');s1.className='btn';s1.textContent='\uD83D\uDED2 Store';s1.onclick=function(){pop.hidden=true;OWHG.openStore()};var s2=document.createElement('button');s2.className='btn';s2.textContent='\uD83C\uDFC6 Ranking';s2.onclick=function(){pop.hidden=true;OWHG.openRank()};T.appendChild(s1);T.appendChild(s2)}
 })();
 F.close=function(){BX.closeFs()};
 return F};
})();
