/* Critter Clash: rules, creatures, battle engine and bot. Pure logic, no DOM. Works in a browser and in Node. */
(function(root){
'use strict';
var CC={};
/* id, name, emoji, kind, atk, hp, spd, ability, short text */
CC.ROSTER=[
 ['sparrow','Sparrow','🐦','bird',3,10,14,'swift','Swift: attacks twice in the first turn.'],
 ['duck','Duck','🦆','bird',3,16,8,'armor1','Waterproof: takes 1 less damage per hit.'],
 ['eagle','Eagle','🦅','bird',4,10,12,'dive','Dive: the first hit does double damage.'],
 ['owl','Owl','🦉','bird',4,12,10,'dodge25','Night eyes: 25% chance to dodge a hit.'],
 ['parrot','Parrot','🦜','bird',3,11,9,'rally','Rally: the whole team hits 8% harder.'],
 ['peacock','Peacock','🦚','bird',3,12,9,'dazzle','Dazzle: enemy hits on your team miss 10% more.'],
 ['swan','Swan','🦢','bird',4,12,9,'bless','Grace: heals the weakest friend a little each turn.'],
 ['flamingo','Flamingo','🦩','bird',4,14,8,'balance','Balance: takes 20% less damage.'],
 ['penguin','Penguin','🐧','bird',4,14,7,'huddle','Huddle: gets tougher when the team is big.'],
 ['turkey','Turkey','🦃','bird',3,22,6,'tank','Big body: lots of health.'],
 ['bee','Bee','🐝','bug',4,7,13,'sting','Sting: poison, 2 damage for 3 turns.'],
 ['ant','Ant','🐜','bug',3,9,10,'swarm','Swarm: hits harder for every other ant alive.'],
 ['ladybug','Ladybug','🐞','bug',3,12,10,'armor1','Spotted shell: takes 1 less damage per hit.'],
 ['butterfly','Butterfly','🦋','bug',4,9,12,'dodge25','Flutter: 25% chance to dodge a hit.'],
 ['cricket','Cricket','🦗','bug',3,10,11,'chirp','Chirp: enemy team hits 7% weaker.'],
 ['beetle','Beetle','🪲','bug',3,15,6,'armor2','Hard shell: takes 2 less damage per hit.'],
 ['scorpion','Scorpion','🦂','bug',4,9,9,'venom','Venom: poison, 3 damage for 3 turns.'],
 ['spider','Spider','🕷️','bug',4,10,9,'web','Web: the first target loses its next action.'],
 ['fly','Fly','🪰','bug',3,10,14,'pest','Pest: its hits ignore armor.'],
 ['mosquito','Mosquito','🦟','bug',4,9,12,'drain','Drain: heals itself for half the damage dealt.'],
 ['caterpillar','Caterpillar','🐛','bug',3,14,5,'evolve','Evolve: hits 15% harder every turn.'],
 ['cockroach','Cockroach','🪳','bug',3,12,7,'revive','Survivor: comes back once with 40% health.']
].map(function(r){return{id:r[0],name:r[1],e:r[2],kind:r[3],atk:r[4],hp:r[5],spd:r[6],ab:r[7],txt:r[8]}});
CC.BY={};CC.ROSTER.forEach(function(r,i){r.n=i;CC.BY[r.id]=r});
CC.MULT=[0,1,1.35,1.8,2.65,5];   /* stat multiplier by stars */
CC.qty=function(stars){return 6-stars};
CC.STAR_LO=[1,1,2,2,3];CC.STAR_HI=[3,4,4,5,5];
CC.ROUNDS=5;CC.LIVES=3;
function rng(seed){var a=seed|0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
CC.rng=rng;
CC.card=function(c){var r=CC.BY[c.cid],m=CC.MULT[c.stars];return{cid:c.cid,stars:c.stars,name:r.name,e:r.e,kind:r.kind,ab:r.ab,txt:r.txt,atk:Math.max(1,Math.round(r.atk*m)),hp:Math.max(1,Math.round(r.hp*m)),spd:r.spd,qty:CC.qty(c.stars)}};
/* the 5 cards both players see in a round (same for both, decided by the match seed) */
CC.offers=function(seed,round){
 var R=rng(seed*31+round*977+7),n=CC.ROSTER.length,lo=CC.STAR_LO[round],hi=CC.STAR_HI[round],used={},out=[];
 while(out.length<5){var i=Math.floor(R()*n);if(used[i])continue;used[i]=1;
  var s=out.length===0?lo:out.length===1?hi:lo+Math.floor(R()*(hi-lo+1));
  out.push({cid:CC.ROSTER[i].id,stars:s})}
 /* shuffle so the order does not hint at stars */
 for(var k=out.length-1;k>0;k--){var j=Math.floor(R()*(k+1)),t=out[k];out[k]=out[j];out[j]=t}
 return out};
/* ---------- battle ---------- */
function mkUnits(army,side){var us=[];army.forEach(function(c,ci){var k=CC.card(c);for(var q=0;q<k.qty;q++)us.push({side:side,ci:ci,e:k.e,name:k.name,ab:k.ab,atk:k.atk,atk0:k.atk,hp:k.hp,max:k.hp,spd:k.spd,alive:true,pois:[],stun:0,dived:false,webbed:false,revived:false,grow:1,id:0})});return us}
CC.battle=function(armyA,armyB,seed,wantLog){
 var R=rng(seed*7919+13),A=mkUnits(armyA,0),B=mkUnits(armyB,1),all=A.concat(B),log=wantLog?[]:null;
 all.forEach(function(u,i){u.id=i});
 function cnt(side,ab){var n=0;all.forEach(function(u){if(u.side===side&&u.alive&&u.ab===ab)n++});return n}
 function alive(side){var o=[];for(var i=0;i<all.length;i++)if(all[i].side===side&&all[i].alive)o.push(all[i]);return o}
 function atkOf(u){var m=1;m+=Math.min(3,cnt(u.side,'rally'))*.08;m-=Math.min(3,cnt(1-u.side,'chirp'))*.07;
  var v=u.atk*m;if(u.ab==='swarm')v+=u.atk0*.35*Math.min(5,cnt(u.side,'swarm')-1);if(u.ab==='evolve')v=u.atk0*u.grow*m;return v}
 function armorOf(u){var a=u.ab==='armor1'?1:u.ab==='armor2'?2:0;if(u.ab==='huddle')a+=Math.floor(alive(u.side).length/4);return a}
 function dodgeOf(u,attSide){var p=u.ab==='dodge25'?.25:0;p+=Math.min(3,cnt(u.side,'dazzle'))*.1;return Math.min(.6,p)}
 function die(u,ev){if(u.hp>0)return;if(u.ab==='revive'&&!u.revived){u.revived=true;u.hp=Math.ceil(u.max*.4);u.pois=[];ev&&ev.push({k:'rev',d:u.id});return}u.alive=false;u.hp=0}
 function hit(a,t,ev){
  var base=atkOf(a);if(a.ab==='dive'&&!a.dived){base*=2;a.dived=true}
  if(R()<dodgeOf(t,a.side)){ev.push({k:'miss',a:a.id,d:t.id});return}
  var dmg=base;if(a.ab!=='pest')dmg-=armorOf(t);dmg=Math.max(1,dmg);if(t.ab==='balance')dmg*=.8;dmg=Math.max(1,Math.round(dmg));
  t.hp-=dmg;ev.push({k:'hit',a:a.id,d:t.id,v:dmg});
  if(a.ab==='sting')t.pois.push({d:2,t:3});if(a.ab==='venom')t.pois.push({d:3,t:3});
  if(a.ab==='web'&&!a.webbed){a.webbed=true;t.stun=1}
  if(a.ab==='drain'){a.hp=Math.min(a.max,a.hp+Math.ceil(dmg/2))}
  die(t,ev)}
 var MAXT=30,turn=0,ev0=[];
 if(log)log.push({turn:0,ev:[],hp:all.map(function(u){return u.hp})});
 while(turn<MAXT&&alive(0).length&&alive(1).length){
  turn++;var ev=[];
  var order=all.filter(function(u){return u.alive}).sort(function(x,y){return y.spd-x.spd||((x.side^(turn&1))-(y.side^(turn&1)))||x.id-y.id});
  for(var oi=0;oi<order.length;oi++){var u=order[oi];if(!u.alive)continue;
   if(u.stun>0){u.stun--;ev.push({k:'stun',a:u.id});continue}
   var times=(u.ab==='swift'&&turn===1)?2:1;
   for(var q=0;q<times;q++){var en=alive(1-u.side);if(!en.length)break;var t=en[Math.floor(R()*en.length)];hit(u,t,ev)}
   if(!alive(0).length||!alive(1).length)break}
  /* end of turn: poison, heals, growth */
  all.forEach(function(u){if(!u.alive)return;var p=0;u.pois=u.pois.filter(function(x){p+=x.d;x.t--;return x.t>0});if(p){u.hp-=p;ev.push({k:'psn',d:u.id,v:p});die(u,ev)}});
  [0,1].forEach(function(s){var sw=cnt(s,'bless');if(!sw)return;var w=alive(s).filter(function(u){return u.hp<u.max}).sort(function(a,b){return a.hp/a.max-b.hp/b.max})[0];if(w){var h=Math.min(w.max-w.hp,3*sw);w.hp+=h;ev.push({k:'heal',d:w.id,v:h})}});
  all.forEach(function(u){if(u.alive&&u.ab==='evolve')u.grow*=1.15});
  if(log)log.push({turn:turn,ev:ev,hp:all.map(function(u){return Math.max(0,u.hp)})});
 }
 var a=alive(0),b=alive(1),w;
 if(a.length&&!b.length)w=0;else if(b.length&&!a.length)w=1;else if(!a.length&&!b.length)w=-1;
 else{var fa=0,ma=0,fb=0,mb=0;A.forEach(function(u){fa+=Math.max(0,u.hp);ma+=u.max});B.forEach(function(u){fb+=Math.max(0,u.hp);mb+=u.max});var ra=fa/ma,rb=fb/mb;w=Math.abs(ra-rb)<.02?-1:ra>rb?0:1}
 var res={winner:w,turns:turn,left:[a.length,b.length],units:all.map(function(u){return{s:u.side,ci:u.ci,e:u.e,max:u.max}})};if(log)res.log=log;return res};
/* a single pick is a card index 0..4 */
CC.armyPower=function(army){var p=0;army.forEach(function(c){var k=CC.card(c);p+=k.qty*(k.atk*k.hp)/10});return p};
/* ---------- bot ---------- */
CC.botPick=function(level,offer,myArmy,enemyArmy,seed,round){
 var n=offer.length;if(level<=0)return Math.floor(Math.random()*n);
 var best=-1,bs=-1e9,R=Math.random;
 for(var i=0;i<n;i++){
  var mine=myArmy.concat([offer[i]]),sc=0,cnt=0;
  if(level===1){sc=CC.armyPower(mine)+R()*4}
  else{
   for(var j=0;j<n;j++){var their=enemyArmy.concat([offer[j]]);var r=CC.battle(mine,their,seed*13+round*101+i*7+j,false);sc+=r.winner===0?1:r.winner<0?.5:0;cnt++}
   sc=sc/cnt+R()*.05}
  if(sc>bs){bs=sc;best=i}}
 return best};
if(typeof module!=='undefined'&&module.exports)module.exports=CC;else root.CC=CC;
})(typeof window!=='undefined'?window:this);
