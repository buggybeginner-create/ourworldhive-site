/* OWHG: per-game engine for Ourworldhive games. Each game calls OWHG.init() with its OWN catalog.
   Gives every game (1) its own ranking (hr_rank, g.<game>) with a live stylish board and
   (2) its own store (own wallet, own items, UPI top-up approved by the owner in Studio).
   Works inside a single hosted game page: it only needs firebase-config.js (optional; offline it uses local data). */
(function(){
'use strict';
var OWNER='er.krushnananda@gmail.com',FBV='10.12.2';
var TIERS=[[0,'Novice','🌱'],[30,'Beginner','🌿'],[80,'Apprentice','🥉'],[160,'Challenger','🥈'],[280,'Skilled','🥇'],[450,'Expert','💠'],[700,'Master','🔮'],[1000,'Grandmaster','👑'],[1400,'Legend','🐉'],[2000,'Mythic Legend','🌌']];
var TC=['#b6c6e8','#8fe3a0','#e0a46a','#d9e3f2','#ffd36a','#3fd8ff','#b48bff','#ffc94d','#ff7a45','#ff6fb4'];
var BOTN=['Aarav K','Rohan S','Zoya M','Ishan P','Tara N','Kabir D','Mia R','Dev B','Sara G','Leo V','Nora J','Omar H'];
var C=null,LISTEN=[],FBP=null,CUR={uid:null,email:'',owner:false},ST={coins:0,gems:0,owned:[],eq:{}},RK={pts:0,w:0,l:0,d:0,n:0},Q={pts:0,w:0,l:0,d:0,n:0},qT=0,wUn=null,cfgStore={upi:'',name:''},orders=[];
function $(s,r){return(r||document).querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function jget(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function jset(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function ls(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function emit(){LISTEN.forEach(function(f){try{f()}catch(e){}})}
function tierOf(p){var i=0;TIERS.forEach(function(t,k){if(p>=t[0])i=k});return i}
function pName(){try{var n=localStorage.getItem('owh_bx_name');if(n)return n}catch(e){}var n2='Player'+(100+Math.floor(Math.random()*900));try{localStorage.setItem('owh_bx_name',n2)}catch(e){}return n2}
/* ---------------- firebase ---------------- */
function fb(){if(FBP)return FBP;FBP=(async function(){
  if(!window.OWH_FIREBASE)throw new Error('nocfg');var b='https://www.gstatic.com/firebasejs/'+FBV+'/';
  if(!window.firebase)await ls(b+'firebase-app-compat.js');if(!firebase.auth)await ls(b+'firebase-auth-compat.js');if(!firebase.firestore)await ls(b+'firebase-firestore-compat.js');
  if(!firebase.apps.length)firebase.initializeApp(window.OWH_FIREBASE);var a=firebase.auth();
  if(!a.currentUser)await new Promise(function(ok){var u=a.onAuthStateChanged(function(x){u();ok(x)})});
  if(!a.currentUser)await a.signInAnonymously();
  var u=a.currentUser;CUR.uid=u.uid;CUR.email=(u.email||'').toLowerCase();CUR.owner=CUR.email===OWNER;
  return{db:firebase.firestore(),auth:a}})().catch(function(e){FBP=null;throw e});return FBP}
/* ---------------- catalog helpers ---------------- */
function by(id){var a=C.items;for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
function has(id){var it=by(id);return !!it&&(!!it.free||CUR.owner||ST.owned.indexOf(id)>=0)}
function eqItem(t){var id=ST.eq&&ST.eq[t],it=id?by(id):null;return it&&has(id)&&!it.free?it:null}
function eqIds(){var o={};(C.types||[]).forEach(function(t){var it=eqItem(t.t);if(it)o[t.t]=it.id});return o}
function owned(t){return C.items.filter(function(i){return i.t===t&&has(i.id)})}
function stKey(){return'owh_gw_'+C.game}
function saveLocal(){jset(stKey(),{coins:ST.coins,gems:ST.gems,owned:ST.owned,eq:ST.eq,owner:CUR.owner})}
function wRef(db){return db.collection('game_wallets').doc(C.game+'__'+CUR.uid)}
async function attach(){
  try{var f=await fb();CUR.db=f.db;
    if(wUn)try{wUn()}catch(e){}
    var ref=wRef(f.db);
    wUn=ref.onSnapshot(function(s){
      if(!s.exists){ref.set({game:C.game,uid:CUR.uid,coins:0,gems:0,owned:[],eq:{},t:Date.now()}).catch(function(){});return}
      var d=s.data();ST={coins:+d.coins||0,gems:+d.gems||0,owned:d.owned||[],eq:d.eq||{}};saveLocal();emit();refreshStore()},function(e){CUR.err=e&&e.code});
    f.db.collection('config').doc('store').get().then(function(s){if(s.exists)cfgStore=Object.assign(cfgStore,s.data());refreshStore()}).catch(function(){});
    f.db.collection('store_orders').where('uid','==',CUR.uid).limit(30).onSnapshot(function(q){orders=q.docs.map(function(d){return Object.assign({id:d.id},d.data())}).filter(function(o){return o.game===C.game}).sort(function(a,b){return b.t-a.t});refreshStore()},function(){});
    emit();refreshStore();
  }catch(e){CUR.off=true}
}
/* ---------------- ranking ---------------- */
function rkKey(){return'owh_rk_'+C.game}
function flushRank(){
  clearTimeout(qT);qT=0;if(!(Q.pts||Q.n||Q.w||Q.l||Q.d))return;var d=Q;Q={pts:0,w:0,l:0,d:0,n:0};
  ensureName().then(function(){return fb()}).then(function(f){var ref=f.db.collection('hr_rank').doc(CUR.uid),named=jget('owh_rk_named',0);
    return f.db.runTransaction(async function(t){var sn=await t.get(ref),cur=sn.exists?sn.data():{name:pName(),av:C.icon||'🏅',pts:0,n:0,g:{},done:[]};cur.g=cur.g||{};
      var g=cur.g[C.game]||{w:0,l:0,d:0,pts:0,n:0};g.w=(g.w||0)+d.w;g.l=(g.l||0)+d.l;g.d=(g.d||0)+d.d;g.pts=(g.pts||0)+d.pts;g.n=(g.n||0)+d.n;cur.g[C.game]=g;
      cur.pts=(cur.pts||0)+d.pts;cur.n=(cur.n||0)+d.n;if(named||!cur.name)cur.name=pName();cur.av=cur.av||C.icon||'🏅';cur.upd=Date.now();t.set(ref,cur)})}).catch(function(){Q.pts+=d.pts;Q.w+=d.w;Q.l+=d.l;Q.d+=d.d;Q.n+=d.n})}
function report(r){
  r=r||{};var p=Math.max(0,Math.round(+r.pts||0));
  RK.pts+=p;RK.w+=r.win?1:0;RK.l+=r.loss?1:0;RK.d+=r.draw?1:0;RK.n+=(r.win||r.loss||r.draw||r.round)?1:0;jset(rkKey(),RK);
  Q.pts+=p;Q.w+=r.win?1:0;Q.l+=r.loss?1:0;Q.d+=r.draw?1:0;Q.n+=(r.win||r.loss||r.draw||r.round)?1:0;
  if(!qT)qT=setTimeout(flushRank,4000);emit();pill()}
window.addEventListener('pagehide',function(){if(C)flushRank()});
function botRows(){
  var days=Math.max(0,(Date.now()-Date.UTC(2026,9,1))/864e5),sc=C.rankScale||400,out=[];
  BOTN.slice(0,10).forEach(function(n,i){var base=sc*(0.9-i*0.075),pts=Math.max(5,Math.round(base*(0.35+Math.min(0.65,days*0.012))+(i*7)%13));out.push({n:n,p:pts,bot:1,av:'🤖'})});return out}

/* ---------------- unique player names (one global name per player) ---------------- */
function nameKey(n){return String(n||'').toLowerCase().replace(/\s+/g,' ').trim().replace(/ /g,'_')}
function nameOK(n){n=String(n||'').trim();if(n.length<3)return'Use at least 3 letters.';if(n.length>14)return'Use at most 14 characters.';if(!/^[A-Za-z0-9 _.\-]+$/.test(n))return'Use only letters, numbers, space, dot, dash or underscore.';
  if(BOTN.some(function(b){return nameKey(b)===nameKey(n)}))return'This name is taken.';return''}
/* claim (or keep) a name; resolves {ok:true,name} or {ok:false,msg} */
async function claimName(n){
  n=String(n||'').replace(/\s+/g,' ').trim();var bad=nameOK(n);if(bad)return{ok:false,msg:bad};
  var f;try{f=await fb()}catch(e){return{ok:false,msg:'Changing the name needs internet (so no two players share a name).'}}
  var key=nameKey(n),db=f.db,oldKey=jget('owh_name_key','');
  try{
    await db.runTransaction(async function(t){var ref=db.collection('names').doc(key),sn=await t.get(ref);
      if(sn.exists&&sn.data().uid!==CUR.uid)throw new Error('taken');t.set(ref,{uid:CUR.uid,name:n,t:Date.now()})});
  }catch(e){return{ok:false,msg:e.message==='taken'?'This name is already taken. Try another.':'Could not check the name: '+(e.code||e.message)}}
  if(oldKey&&oldKey!==key)db.collection('names').doc(oldKey).delete().catch(function(){});
  jset('owh_name_key',key);try{localStorage.setItem('owh_bx_name',n)}catch(e){}jset('owh_rk_named',1);
  /* the new name shows on every ranking and every game score straight away (scores live on your account, not on the name) */
  var up={name:n,upd:Date.now()};
  db.collection('hr_rank').doc(CUR.uid).set(up,{merge:true}).catch(function(){});
  db.collection('ck_rank').doc(CUR.uid).get().then(function(s){if(s.exists)return db.collection('ck_rank').doc(CUR.uid).update({name:n})}).catch(function(){});
  emit();return{ok:true,name:n}}
/* make sure the current (possibly auto) name is registered; if somebody else owns it, pick a free one */
var ensuring=null;
function ensureName(){if(ensuring)return ensuring;ensuring=(async function(){
  try{var n=pName(),k=jget('owh_name_key','');if(k&&k===nameKey(n))return n;
    for(var i=0;i<6;i++){var cand=i===0?n:(n.replace(/\d+$/,'').slice(0,10)+(100+Math.floor(Math.random()*900)));
      if(nameOK(cand)){cand='Player'+(100+Math.floor(Math.random()*900))}
      var r=await claimName(cand);if(r.ok)return r.name;if(/internet/.test(r.msg))return n}
  }catch(e){}return pName()})().then(function(v){ensuring=null;return v});return ensuring}
/* ---------------- controls help + key settings ---------------- */
var HP=null;
function keyId(e){var k=e.key;if(k===' ')return'space';return String(k).toLowerCase()}
function keyShow(k){k=String(k).toLowerCase();return({space:'Space',arrowleft:'\u2190',arrowright:'\u2192',arrowup:'\u2191',arrowdown:'\u2193',escape:'Esc',enter:'Enter'})[k]||String(k).toUpperCase()}
function keyCfgKey(){return'owh_keys_'+C.game}
function isKey(e,id){if(!HP)return false;var a=HP.keys.filter(function(x){return x.id===id})[0];if(!a)return false;var o=jget(keyCfgKey(),{})[id],k=keyId(e);
  return o?k===o:a.def.some(function(d){return d.toLowerCase()===k})}
function keyLabel(id){var a=HP.keys.filter(function(x){return x.id===id})[0];if(!a)return'';var o=jget(keyCfgKey(),{})[id];return o?keyShow(o):a.def.map(keyShow).join(' / ')}
function setHelp(h){HP=h;var p=$('#ogPill');if(p&&!$('#ogBi')){addInfoBtn(p)}}
function addInfoBtn(p){var b=document.createElement('button');b.id='ogBi';b.setAttribute('aria-label','Controls');b.textContent='\u24D8';b.onclick=function(){openHelp()};p.insertBefore(b,p.firstChild)}
var capturing=null;
function openHelp(){
  if(!HP)return;var sh=mkOv('ogHelp','86vh');
  var kb=jget(keyCfgKey(),{});
  sh.innerHTML='<div class="og-h"><span style="font-size:24px">\uD83C\uDFAE</span><h2>'+esc(C.name)+' controls</h2><button class="og-x" aria-label="Close">&#10005;</button></div>'+
   '<p class="og-note">Keys are set to <b>auto</b> (the default below). Tap a key to change it, then press the new key.</p>'+
   '<div id="ogKs">'+HP.keys.map(function(k){return'<div class="og-row" style="margin-bottom:6px"><div class="mid"><div class="nm">'+esc(k.label)+'</div></div><button class="og-b" data-k="'+k.id+'" style="min-width:92px">'+esc(keyLabel(k.id))+(kb[k.id]?' *':'')+'</button></div>'}).join('')+'</div>'+
   (HP.fixed&&HP.fixed.length?'<p class="og-note" style="margin-top:10px"><b>Fixed keys</b></p>'+HP.fixed.map(function(r){return'<div class="og-row" style="margin-bottom:6px"><div class="mid"><div class="sb" style="font-size:13px;color:#eef1ff">'+esc(r[1])+'</div></div><span class="og-tier" style="--tc:#8fe3a0">'+esc(r[0])+'</span></div>'}).join(''):'')+
   (HP.touch&&HP.touch.length?'<p class="og-note" style="margin-top:10px"><b>Touch / mouse</b></p>'+HP.touch.map(function(r){return'<div class="og-row" style="margin-bottom:6px"><span style="font-size:20px">'+r[0]+'</span><div class="mid"><div class="sb" style="font-size:13px;color:#eef1ff">'+esc(r[1])+'</div></div></div>'}).join(''):'')+
   '<div style="display:flex;gap:8px;margin-top:12px"><button class="og-b" id="ogKr">Reset to auto</button><button class="og-b pri" id="ogKd">Done</button></div><p class="og-msg" id="ogKm"></p>';
  $('.og-x',sh).onclick=function(){closeOv('ogHelp')};$('#ogKd').onclick=function(){closeOv('ogHelp')};
  $('#ogKr').onclick=function(){try{localStorage.removeItem(keyCfgKey())}catch(e){}openHelp()};
  [].forEach.call(sh.querySelectorAll('[data-k]'),function(b){b.onclick=function(){
    b.textContent='Press a key...';if(capturing)window.removeEventListener('keydown',capturing,true);
    capturing=function(e){e.preventDefault();e.stopImmediatePropagation();window.removeEventListener('keydown',capturing,true);capturing=null;var k=keyId(e);
      if(k==='escape'){openHelp();return}
      var cur=jget(keyCfgKey(),{}),clash=HP.keys.filter(function(x){return x.id!==b.dataset.k&&isKeyStr(x.id,k)})[0];
      if(clash){openHelp();var m=$('#ogKm');if(m){m.textContent=keyShow(k)+' is already used for "'+clash.label+'".';m.className='og-msg err'}return}
      cur[b.dataset.k]=k;jset(keyCfgKey(),cur);openHelp()};
    window.addEventListener('keydown',capturing,true)}})}
function isKeyStr(id,k){var a=HP.keys.filter(function(x){return x.id===id})[0],o=jget(keyCfgKey(),{})[id];return o?o===k:a.def.some(function(d){return d.toLowerCase()===k})}
/* short hint before a game starts (every time until "don't show again") */
function hint(force){
  if(!HP)return;if(!force&&jget('owh_hint_'+C.game,0))return;css();var o=$('#ogHint');if(o)o.remove();
  o=document.createElement('div');o.id='ogHint';o.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));z-index:2900;width:min(94vw,520px);background:rgba(12,16,38,.96);border:1px solid #3a4580;border-radius:16px;padding:12px 14px;color:#eef1ff;font:14px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)';
  var top=HP.keys.slice(0,5).map(function(k){return'<b>'+esc(keyLabel(k.id))+'</b> '+esc(k.short||k.label)}).join(' &middot; ');
  o.innerHTML='<div style="margin-bottom:8px">\uD83C\uDFAE <b>Keyboard:</b> '+top+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="og-b pri" id="ogHc">All controls &amp; settings</button><button class="og-b" id="ogHg">Got it</button><label style="font-size:12px;color:#98a3cc"><input type="checkbox" id="ogHn"> Do not show again</label></div>';
  document.body.appendChild(o);function done(){if($('#ogHn').checked)jset('owh_hint_'+C.game,1);o.remove()}
  $('#ogHg').onclick=done;$('#ogHc').onclick=function(){done();openHelp()};setTimeout(function(){if(o.parentNode)o.remove()},14000)}
/* ---------------- styles ---------------- */
function css(){if($('#ogCss'))return;var s=document.createElement('style');s.id='ogCss';s.textContent=`
.og-pill{position:fixed;z-index:900;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));display:flex;gap:6px}
.og-pill button{font:700 13px system-ui,sans-serif;border:0;border-radius:20px;padding:8px 12px;color:#fff;background:rgba(18,24,48,.82);backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;border:1px solid rgba(255,255,255,.18)}
.og-pill button b{color:#ffc857}
.og-ov{position:fixed;inset:0;z-index:3000;background:rgba(3,6,18,.72);display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#eef1ff;animation:ogF .2s}
@keyframes ogF{from{opacity:0}to{opacity:1}}@keyframes ogU{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
.og-sh{width:100%;max-width:560px;max-height:var(--ogh,88vh);overflow:auto;background:linear-gradient(180deg,#151c3a,#0b1022);border:1px solid #2a3354;border-radius:22px 22px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));animation:ogU .28s cubic-bezier(.2,.8,.2,1)}
.og-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}.og-h h2{flex:1;margin:0;font-size:19px}
.og-x{border:0;border-radius:50%;width:34px;height:34px;background:#2a3354;color:#fff;font-size:16px;cursor:pointer}
.og-live{font-size:11px;color:#8ff0c0;display:flex;align-items:center;gap:5px}.og-live i{width:8px;height:8px;border-radius:50%;background:#38d98a;animation:ogP 1.4s infinite}
@keyframes ogP{50%{opacity:.25;transform:scale(.7)}}
.og-pod{display:flex;align-items:flex-end;justify-content:center;gap:8px;height:170px;margin:6px 0 12px}
.og-pc{flex:1;max-width:110px;text-align:center;min-width:0}.og-pc .av{width:46px;height:46px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;background:#1d2547;border:3px solid var(--tc,#fff);box-shadow:0 0 18px var(--tc)}
.og-pc .nm{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.og-pc .pt{font-size:12px;color:#ffc857}
.og-pc .bar{border-radius:10px 10px 0 0;margin-top:4px;display:flex;align-items:flex-start;justify-content:center;font-size:24px;padding-top:4px;transform-origin:bottom;animation:ogR .7s cubic-bezier(.2,.9,.3,1) both}
@keyframes ogR{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.og-me{background:linear-gradient(135deg,#27306a,#4a2a78);border:1px solid #6a5cff;border-radius:16px;padding:12px;margin-bottom:10px}
.og-me .r1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.og-me b.big{font-size:26px}
.og-tier{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid var(--tc);color:var(--tc)}
.og-prog{height:7px;border-radius:5px;background:rgba(255,255,255,.12);margin-top:8px;overflow:hidden}.og-prog i{display:block;height:100%;background:linear-gradient(90deg,#ffc857,#ff7a45);transition:width .8s}
.og-rows{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.og-row{display:flex;align-items:center;gap:10px;background:#121936;border:1px solid #232c50;border-radius:12px;padding:8px 10px;animation:ogS .35s both}
@keyframes ogS{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.og-row.me{border-color:#6a5cff;background:#1d2250}.og-row .no{width:26px;text-align:center;font-weight:800;color:#98a3cc}
.og-row .av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1d2547;border:2px solid var(--tc);font-size:15px;font-weight:800;flex:none}
.og-row .mid{flex:1;min-width:0}.og-row .nm{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.og-row .sb{font-size:11.5px;color:#98a3cc}
.og-row .pts{text-align:right;font-weight:800;color:#ffc857}.og-row .pts small{display:block;font-weight:500;color:#98a3cc;font-size:10px}
.og-up{color:#38d98a;font-size:11px}.og-dn{color:#ff6b6b;font-size:11px}
.og-nm{display:flex;gap:8px;margin:12px 0 4px}.og-nm input{flex:1;font:inherit;padding:9px;border-radius:10px;border:1px solid #2a3354;background:#0b1026;color:#fff;min-width:0}
.og-b{font:700 14px system-ui;border:0;border-radius:12px;padding:10px 14px;color:#fff;background:#2c365e;cursor:pointer}.og-b.pri{background:#6a5cff}.og-b.gold{background:#ffc83d;color:#2b1d00}.og-b:disabled{opacity:.5}
.og-note{font-size:12px;color:#98a3cc;margin:6px 0}
.og-tabs{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px}.og-tabs button{white-space:nowrap}.og-tabs .og-b{background:#161d3c;border:1px solid #2a3354}.og-tabs .og-b.on{background:#6a5cff;border-color:#6a5cff}
.og-bal{display:flex;gap:6px}.og-bal b{background:#161d3c;border:1px solid #2a3354;padding:5px 10px;border-radius:16px;font-size:14px}
.og-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
.og-it{background:#121936;border:2px solid #232c50;border-radius:14px;padding:8px;text-align:center;cursor:pointer;min-width:0}.og-it.sel{border-color:#6a5cff}
.og-it .sw{height:42px;border-radius:9px;margin-bottom:5px;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden}
.og-it b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.og-it small{color:#98a3cc;font-size:12px}
.og-tg{display:inline-block;font-size:10.5px;padding:1px 7px;border-radius:9px;background:#222a4a;margin-top:3px}.og-tg.own{background:#124d33;color:#8ff0c0}.og-tg.eq{background:#6a5cff}
.og-info{background:#121936;border:1px solid #232c50;border-radius:14px;padding:10px;margin:10px 0;min-height:64px}.og-info h3{margin:0 0 3px;font-size:16px}
.og-msg{min-height:18px;font-size:13px;margin:6px 0 0}.og-msg.err{color:#ff6b6b}.og-msg.ok{color:#38d98a}
.og-pk{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin:8px 0}.og-pk div{background:#0f1530;border:2px solid #232c50;border-radius:12px;padding:10px;text-align:center;cursor:pointer}.og-pk div.sel{border-color:#ffc83d}.og-pk .big{font-size:19px;font-weight:800}
.og-in{width:100%;font:inherit;padding:10px;border-radius:10px;border:1px solid #2a3354;background:#0b1026;color:#fff}
.og-tz{position:fixed;left:50%;top:26%;transform:translateX(-50%) scale(.6);z-index:3500;pointer-events:none;opacity:0;text-align:center;font:900 30px system-ui;padding:14px 22px;border-radius:22px;background:rgba(6,8,22,.86);border:4px solid var(--c);color:var(--c);text-shadow:0 2px 10px #000;transition:opacity .2s,transform .25s;max-width:92vw}
.og-tz small{display:block;font-size:11px;color:#c9d3ff;font-weight:700}.og-tz.on{opacity:1;transform:translateX(-50%) scale(1)}
`;document.head.appendChild(s)}
/* ---------------- overlays ---------------- */
function closeOv(id){var o=$('#'+id);if(o)o.remove();if(id==='ogStore'&&C.onPreview)C.onPreview(null)}
function mkOv(id,h){closeOv(id);css();var o=document.createElement('div');o.className='og-ov';o.id=id;if(h)o.style.setProperty('--ogh',h);o.innerHTML='<div class="og-sh"></div>';o.addEventListener('click',function(e){if(e.target===o)closeOv(id)});document.body.appendChild(o);return o.firstChild}
/* ----- rank ----- */
var rkRows=null,rkUn=null;
function openRank(){
  var sh=mkOv('ogRank');
  sh.innerHTML='<div class="og-h"><span style="font-size:26px">'+esc(C.icon||'🏆')+'</span><h2>'+esc(C.name)+' ranking</h2><span class="og-live"><i></i>LIVE</span><button class="og-x" aria-label="Close">&#10005;</button></div><div id="ogRb"><p class="og-note">Loading...</p></div>';
  $('.og-x',sh).onclick=function(){closeOv('ogRank');if(rkUn){try{rkUn()}catch(e){}rkUn=null}};
  flushRank();paintRank(null,false);
  fb().then(function(f){
    if(!$('#ogRank'))return;if(rkUn)try{rkUn()}catch(e){}
    rkUn=f.db.collection('hr_rank').orderBy('g.'+C.game+'.pts','desc').limit(40).onSnapshot(function(q){
      var rows=[];q.forEach(function(d){var v=d.data(),g=v.g&&v.g[C.game];if(g&&g.pts>0)rows.push({n:v.name||'Player',p:g.pts,uid:d.id,av:v.av||'🙂',w:g.w||0,l:g.l||0,d:g.d||0})});paintRank(rows,true)},function(){paintRank(null,false)})
  }).catch(function(){paintRank(null,false)})}
function paintRank(real,ok){
  var b=$('#ogRb');if(!b)return;var rows=[];
  (real||[]).forEach(function(r){rows.push(r)});
  botRows().forEach(function(r){rows.push(r)});
  var meIn=rows.some(function(r){return CUR.uid&&r.uid===CUR.uid});
  rows.forEach(function(r){if(CUR.uid&&r.uid===CUR.uid){r.me=1;r.p=Math.max(r.p,RK.pts)}});
  if(!meIn&&RK.pts>0)rows.push({n:pName(),p:RK.pts,me:1,av:'🙂',w:RK.w,l:RK.l,d:RK.d});
  rows.sort(function(a,c){return c.p-a.p});
  var last=jget('owh_rk_last_'+C.game,{}),mi=-1;rows.forEach(function(r,i){if(r.me&&mi<0)mi=i});
  var ti=tierOf(RK.pts),nx=TIERS[ti+1],pr=nx?Math.min(100,Math.round((RK.pts-TIERS[ti][0])/(nx[0]-TIERS[ti][0])*100)):100;
  function av(r,t){return'<span class="av" style="--tc:'+TC[tierOf(r.p)]+'">'+(r.bot?'🤖':esc(String(r.av||r.n).slice(0,2)))+'</span>'}
  var pod='';if(rows.length>=3){var o=[1,0,2],hh=[100,130,80],cc=['#d9e3f2','#ffd36a','#e0a46a'],md=['🥈','🥇','🥉'];
    pod='<div class="og-pod">'+o.map(function(k,j){var r=rows[k];return'<div class="og-pc" style="--tc:'+TC[tierOf(r.p)]+'">'+av(r)+'<div class="nm">'+(r.bot?'🤖 ':'')+esc(r.n)+'</div><div class="pt">'+r.p+'</div><div class="bar" style="height:'+hh[j]*0.7+'px;background:linear-gradient(180deg,'+cc[j]+',#1d2547);animation-delay:'+(j*.12)+'s">'+md[j]+'</div></div>'}).join('')+'</div>'}
  var me='<div class="og-me"><div class="r1"><div><span class="og-tier" style="--tc:'+TC[ti]+'">'+TIERS[ti][2]+' '+TIERS[ti][1]+'</span><div class="og-note" style="margin:6px 0 0">'+RK.w+'W '+RK.l+'L '+RK.d+'D'+(nx?' &middot; '+(nx[0]-RK.pts)+' pts to '+esc(nx[1]):' &middot; top tier!')+'</div></div><div style="text-align:right"><b class="big">'+(RK.pts>0&&mi>=0?'#'+(mi+1):'-')+'</b><div class="og-note" style="margin:0">'+RK.pts+' points</div></div></div><div class="og-prog"><i style="width:'+pr+'%"></i></div></div>';
  var list='<ul class="og-rows">'+rows.slice(0,30).map(function(r,i){var key=r.uid||('b'+r.n),pv=last[key],ar=pv===undefined?'':(pv>i+1?'<span class="og-up"> ▲'+(pv-i-1)+'</span>':pv<i+1?'<span class="og-dn"> ▼'+(i+1-pv)+'</span>':'');
    return'<li class="og-row'+(r.me?' me':'')+'" style="animation-delay:'+Math.min(i,12)*.03+'s"><span class="no">'+(i<3?['🥇','🥈','🥉'][i]:i+1)+'</span>'+av(r)+'<div class="mid"><div class="nm">'+(r.bot?'🤖 ':'')+esc(r.n)+(r.me?' (you)':'')+ar+'</div><div class="sb">'+(r.bot?'Rival bot':(r.w||0)+'W '+(r.l||0)+'L '+(r.d||0)+'D')+' &middot; '+TIERS[tierOf(r.p)][1]+'</div></div><div class="pts">'+r.p+'<small>points</small></div></li>'}).join('')+'</ul>';
  var nl={};rows.forEach(function(r,i){nl[r.uid||('b'+r.n)]=i+1});if(ok)jset('owh_rk_last_'+C.game,nl);
  b.innerHTML=pod+me+list+(ok?'':'<p class="og-note">Online ranking is not reachable right now. Showing rival bots and your saved score.</p>')+
   '<div class="og-nm"><input id="ogNm" maxlength="14" value="'+esc(pName())+'" aria-label="Your name"><button class="og-b pri" id="ogNs">Save name</button></div><p class="og-msg" id="ogNmMsg"></p><p class="og-note">One name for all games. It must be unique. Bots are marked 🤖.</p>';
  $('#ogNs').onclick=async function(){var v=($('#ogNm').value||'').trim(),b=$('#ogNs');b.disabled=true;b.textContent='Checking...';var r=await claimName(v);b.disabled=false;
    var m=$('#ogNmMsg');if(r.ok){b.textContent='Saved ✔';m.textContent='Name saved. All your scores now show under '+r.name+'.';m.className='og-msg ok';if(C.onName)C.onName(r.name);paintRank(real,ok)}else{b.textContent='Save name';m.textContent=r.msg;m.className='og-msg err'}}}
/* ----- store ----- */
var sTab=null,sSel=null,sPack=null,sPrev={};
function sw(it){var st=it.sw||(it.col?('background:'+(Array.isArray(it.col)?'rgb('+it.col.join(',')+')':it.col)):it.bg?('background:'+it.bg):'background:#1d2547');return'<div class="sw" style="'+st+'">'+(it.e||'')+'</div>'}
function priceTxt(it){return it.free?'Free':(it.cur==='gems'?'💎 ':'🪙 ')+it.p}
function openStore(tab){
  var sh=mkOv('ogStore','74vh');sTab=tab||sTab||((C.types&&C.types[0])||{}).t;sSel=null;
  sh.innerHTML='<div class="og-h"><span style="font-size:24px">🛒</span><h2>'+esc(C.name)+' Store</h2><div class="og-bal"><b>🪙 <span id="ogC">0</span></b><b>💎 <span id="ogG">0</span></b></div><button class="og-x" aria-label="Close">&#10005;</button></div><p class="og-note" id="ogWho"></p><div class="og-tabs" id="ogTb"></div><div id="ogBd"></div><div class="og-info" id="ogIn"></div><p class="og-msg" id="ogMs"></p>';
  $('.og-x',sh).onclick=function(){closeOv('ogStore')};
  attach();refreshStore()}
function msg(t,k){var e=$('#ogMs');if(e){e.textContent=t||'';e.className='og-msg'+(k?' '+k:'')}}
function refreshStore(){
  if(!$('#ogStore'))return;$('#ogC').textContent=ST.coins;$('#ogG').textContent=ST.gems;
  $('#ogWho').textContent=CUR.owner?'Owner mode: every item is unlocked for you.':CUR.off?'Offline: you can look around, buying needs internet.':'Your wallet for this game only.';
  var tabs=(C.types||[]).concat([{t:'buy',n:'Top up'}]);
  $('#ogTb').innerHTML=tabs.map(function(t){return'<button class="og-b'+(t.t===sTab?' on':'')+'" data-t="'+t.t+'">'+esc(t.n)+'</button>'}).join('');
  [].forEach.call($('#ogTb').children,function(b){b.onclick=function(){sTab=b.dataset.t;sSel=null;refreshStore()}});
  if(sTab==='buy'){paintBuy();$('#ogIn').innerHTML='<b>Top up coins or gems</b><div class="og-note">Pay by UPI, enter the UTR, the owner adds them to this game\'s wallet.</div>';return}
  var list=C.items.filter(function(i){return i.t===sTab});
  $('#ogBd').innerHTML='<div class="og-grid">'+list.map(function(it){var own=has(it.id),eq=ST.eq&&ST.eq[it.t]===it.id||(it.free&&!(ST.eq&&ST.eq[it.t]));
    return'<div class="og-it'+(sSel===it.id?' sel':'')+'" data-id="'+it.id+'">'+sw(it)+'<b>'+esc(it.n)+'</b><small>'+priceTxt(it)+'</small><br>'+(eq&&!it.noequip?'<span class="og-tg eq">Equipped</span>':own?'<span class="og-tg own">'+(CUR.owner&&!it.free?'Owner':'Owned')+'</span>':'')+'</div>'}).join('')+'</div>';
  [].forEach.call($('#ogBd').querySelectorAll('.og-it'),function(el){el.onclick=function(){pick(el.dataset.id)}});
  paintInfo()}
function pick(id){var it=by(id);sSel=id;if(C.onPreview)C.onPreview(it);if(it.t==='taunt'&&C.showTaunt!==false)showTaunt(it,'YOU');refreshStore()}
function paintInfo(){
  var inf=$('#ogIn');if(!inf)return;if(!sSel){inf.innerHTML='<b>Tap an item</b><div class="og-note">You see it right away. Buy it to keep it.</div>';return}
  var it=by(sSel),own=has(it.id);inf.innerHTML='<h3>'+esc((it.e||'')+' '+it.n)+'</h3><div class="og-note">'+esc(it.d||'')+(own?(CUR.owner&&!it.free?' Unlocked for the owner.':' You own this.'):' Price '+priceTxt(it)+'.')+'</div><div id="ogAc"></div>';
  var a=$('#ogAc'),b=document.createElement('button');
  if(own){if(it.noequip){b.className='og-b pri';b.textContent=it.t==='taunt'?'Preview':'Owned';b.onclick=function(){if(it.t==='taunt')showTaunt(it,'YOU')}}else{b.className='og-b pri';b.textContent='Equip';b.onclick=function(){equip(it)}}}
  else{b.className='og-b gold';b.textContent='Buy for '+priceTxt(it);b.onclick=function(){buy(it)}}
  a.appendChild(b)}
async function equip(it){ST.eq=ST.eq||{};ST.eq[it.t]=it.free?null:it.id;saveLocal();emit();refreshStore();
  try{var f=await fb();await wRef(f.db).set({eq:ST.eq},{merge:true});msg('Equipped.','ok')}catch(e){msg('Equipped on this device.','ok')}}
async function buy(it){
  if(ST[it.cur]<it.p){msg('Not enough '+it.cur+'. Open Top up.','err');return}msg('Buying...');
  try{var f=await fb(),ref=wRef(f.db);
    await f.db.runTransaction(async function(tx){var s=await tx.get(ref),d=s.exists?s.data():{coins:0,gems:0,owned:[],eq:{}};
      if((d[it.cur]||0)<it.p)throw new Error('funds');if((d.owned||[]).indexOf(it.id)>=0)throw new Error('have');
      var up={game:C.game,uid:CUR.uid};up[it.cur]=(d[it.cur]||0)-it.p;up.owned=(d.owned||[]).concat([it.id]);
      if(!s.exists){up.coins=up.coins===undefined?0:up.coins;up.gems=up.gems===undefined?0:up.gems;up.eq={}}
      tx.set(ref,up,{merge:true})});msg('Bought! '+it.n+' is yours.','ok')}
  catch(e){msg(e.message==='funds'?'Not enough '+it.cur+'.':e.message==='have'?'You already own this.':'Could not buy: '+(e.code||e.message)+(/permission/i.test(e.code||e.message||'')?' (rules for game_wallets are not published yet)':''),'err')}}
var PACKS=[{id:'c10',cur:'coins',amt:100,rs:10},{id:'c20',cur:'coins',amt:230,rs:20},{id:'c50',cur:'coins',amt:650,rs:50},{id:'g10',cur:'gems',amt:12,rs:10},{id:'g50',cur:'gems',amt:70,rs:50},{id:'g100',cur:'gems',amt:150,rs:100}];
function paintBuy(){
  var packs=C.packs||PACKS,p=packs.filter(function(x){return x.id===sPack})[0],ready=!!cfgStore.upi;
  var pay='';
  if(p){if(!ready)pay='<b>Payments are opening soon.</b><div class="og-note">The owner has not added a UPI ID yet.</div>';
   else{var ref='OWH'+(C.game||'').slice(0,3).toUpperCase()+(CUR.uid||'x').slice(0,5).toUpperCase(),link='upi://pay?pa='+encodeURIComponent(cfgStore.upi)+'&pn='+encodeURIComponent(cfgStore.name||'Ourworldhive')+'&am='+p.rs+'&cu=INR&tn='+encodeURIComponent(ref);
    pay='<b>Pay &#8377;'+p.rs+' by UPI</b><div class="og-note">UPI ID: <b>'+esc(cfgStore.upi)+'</b> '+(cfgStore.name?'('+esc(cfgStore.name)+')':'')+' <button class="og-b" id="ogCp" style="padding:4px 10px;font-size:12px">Copy</button></div><p style="margin:6px 0"><a href="'+link+'"><button class="og-b gold">Open my UPI app (phone)</button></a></p><div class="og-note">Then enter the 12 digit UTR from your UPI app (note: '+ref+').</div><input class="og-in" id="ogUtr" inputmode="numeric" maxlength="12" placeholder="12 digit UTR"><p style="margin:8px 0 0"><button class="og-b pri" id="ogSend">I have paid</button></p>'}}
  $('#ogBd').innerHTML='<div class="og-pk">'+packs.map(function(x){return'<div class="'+(sPack===x.id?'sel':'')+'" data-p="'+x.id+'"><div class="big">'+(x.cur==='gems'?'💎':'🪙')+' '+x.amt+'</div>&#8377;'+x.rs+'</div>'}).join('')+'</div><div>'+(pay||'<p class="og-note">Choose a pack to see how to pay.</p>')+'</div>'+
   (orders.length?'<div class="og-note" style="margin-top:10px"><b>Your top-ups</b></div>'+orders.map(function(o){return'<div class="og-note">'+(o.cur==='gems'?'💎':'🪙')+' '+o.amt+' &middot; &#8377;'+o.rs+' &middot; <b style="color:'+(o.status==='approved'?'#38d98a':o.status==='rejected'?'#ff6b6b':'#ffc83d')+'">'+esc(o.status)+'</b></div>'}).join(''):'');
  [].forEach.call($('#ogBd').querySelectorAll('.og-pk div'),function(el){el.onclick=function(){sPack=el.dataset.p;paintBuy()}});
  var cp=$('#ogCp');if(cp)cp.onclick=function(){try{navigator.clipboard.writeText(cfgStore.upi);msg('UPI ID copied.','ok')}catch(e){}};
  var sd=$('#ogSend');if(sd)sd.onclick=async function(){var utr=($('#ogUtr').value||'').replace(/\D/g,'');if(utr.length!==12){msg('The UTR must be 12 digits.','err');return}
    if(orders.some(function(o){return o.utr===utr})){msg('You already sent this UTR.','err');return}msg('Sending...');
    try{var f=await fb();await f.db.collection('store_orders').add({game:C.game,uid:CUR.uid,pack:p.id,cur:p.cur,amt:p.amt,rs:p.rs,utr:utr,status:'pending',t:Date.now()});msg('Sent. Waiting for the owner to confirm.','ok');$('#ogUtr').value=''}
    catch(e){msg('Could not send: '+(e.code||e.message),'err')}}}
/* ----- taunt banner (DOM) ----- */
var tzT=0;
function showTaunt(it,who){css();var z=$('#ogTz');if(!z){z=document.createElement('div');z.id='ogTz';z.className='og-tz';document.body.appendChild(z)}
  z.style.setProperty('--c',it.col||'#ffc83d');z.innerHTML='<small>'+esc(who||'')+'</small>'+esc((it.e||'')+' '+(it.txt||it.n));z.classList.remove('on');void z.offsetWidth;z.classList.add('on');clearTimeout(tzT);tzT=setTimeout(function(){z.classList.remove('on')},2400)}
/* ----- buttons ----- */
function pill(){var p=$('#ogPill');if(!p)return;var r=$('#ogPr');if(r)r.textContent=RK.pts}
function mount(o){o=o||{};css();if($('#ogPill'))return;var p=document.createElement('div');p.className='og-pill';p.id='ogPill';
  if(o.top!=null)p.style.top=o.top;if(o.right!=null)p.style.right=o.right;if(o.left!=null){p.style.left=o.left;p.style.right='auto'}if(o.bottom!=null){p.style.bottom=o.bottom;p.style.top='auto'}
  p.innerHTML='<button id="ogBr" aria-label="Ranking">🏆 <b id="ogPr">'+RK.pts+'</b></button>'+(C.items&&C.items.length?'<button id="ogBs" aria-label="Store">🛒 Store</button>':'');
  document.body.appendChild(p);if(HP)addInfoBtn(p);$('#ogBr').onclick=openRank;var s=$('#ogBs');if(s)s.onclick=function(){openStore()}}
function unmount(){var p=$('#ogPill');if(p)p.remove()}
function init(cfg){
  C=cfg;C.items=C.items||[];C.types=C.types||[];
  var s=jget(stKey(),{});ST={coins:+s.coins||0,gems:+s.gems||0,owned:s.owned||[],eq:s.eq||{}};CUR.owner=!!s.owner;
  var r=jget(rkKey(),{});RK={pts:+r.pts||0,w:+r.w||0,l:+r.l||0,d:+r.d||0,n:+r.n||0};
  if(C.items.length||C.rank!==false)setTimeout(function(){fb().then(function(){return C.items.length?attach():0}).catch(function(){CUR.off=true})},300);
  return OWHG}
var OWHG=window.OWHG={init:init,report:report,openRank:openRank,openStore:openStore,mount:mount,unmount:unmount,showTaunt:showTaunt,
  by:function(id){return C?by(id):null},has:function(id){return C?has(id):false},eq:function(t){return C?eqItem(t):null},eqIds:function(){return C?eqIds():{}},owned:function(t){return C?owned(t):[]},
  items:function(t){return C?C.items.filter(function(i){return !t||i.t===t}):[]},on:function(f){LISTEN.push(f)},rank:function(){return RK},name:pName,game:function(){return C&&C.game},claimName:claimName,ensureName:ensureName,setHelp:setHelp,openHelp:openHelp,hint:hint,isKey:isKey,keyLabel:keyLabel};
})();
