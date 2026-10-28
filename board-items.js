/* Board games: each game has its OWN catalog (badges, arenas, taunts, chat lines), wallet and ranking. */
(function(){
function mk(g){
  var it=[];
  it.push({id:'bd_none',t:'badge',n:'No badge',free:1,e:'—',sw:'background:#1d2547',d:'Shows next to your name for your opponent too.'});
  g.badges.forEach(function(b,i){it.push({id:'bd_'+i,t:'badge',n:b[0],e:b[1],cur:b[2],p:b[3],sw:'background:#1d2547',d:'Shows next to your name for your opponent too.'})});
  it.push({id:'ar_std',t:'arena',n:'Classic',free:1,bg:'#050918',sw:'background:#050918'});
  g.arenas.forEach(function(a,i){it.push({id:'ar_'+i,t:'arena',n:a[0],cur:a[2],p:a[3],bg:a[1],sw:'background:'+a[1],d:'Background of your game screen.'})});
  g.taunts.forEach(function(a,i){it.push({id:'tn_'+i,t:'taunt',n:a[0],e:a[1],txt:a[2],col:a[3],cur:a[4],p:a[5],noequip:1,sw:'background:#1d2547',d:'Big banner on the screen. Your opponent sees it.'})});
  g.chat.forEach(function(a,i){it.push({id:'ch_'+i,t:'chat',n:a[0],txt:a[0],e:a[0],cur:'coins',p:a[1],noequip:1,sw:'background:#1d2547;font-size:13px;padding:4px',d:'Quick chat line, one tap in the chat box.'})});
  return{game:g.game,name:g.name,icon:g.icon,rankScale:g.scale||350,items:it,types:[{t:'badge',n:'Badges'},{t:'arena',n:'Arenas'},{t:'taunt',n:'Taunts'},{t:'chat',n:'Chat lines'}]}}
window.BX_CATALOG={
 chess:mk({game:'chess',name:'Chess',icon:'♚',scale:380,
  badges:[['Pawn','♟','coins',15],['Knight','♞','coins',25],['Rook','♜','coins',25],['Queen','♛','coins',40],['King','♚','gems',6],['Crown','👑','gems',10]],
  arenas:[['Wood Hall','linear-gradient(160deg,#3b2a1a,#120c06)','coins',30],['Midnight','linear-gradient(160deg,#0a1440,#02030c)','coins',30],['Marble','linear-gradient(160deg,#4a4f5e,#14161e)','coins',40],['Emerald','linear-gradient(160deg,#0b4a38,#02120d)','coins',40],['Royal Purple','linear-gradient(160deg,#4a1f7a,#0d0418)','gems',6]],
  taunts:[['Checkmate soon','♟','CHECKMATE IS COMING','#ffc857','coins',20],['Think harder','🤔','THINK HARDER...','#60a5fa','coins',20],['Blunder','😬','WHAT A BLUNDER!','#f43f5e','coins',25],['Too slow','⏳','TOO SLOW!','#a78bfa','coins',25],['I am the king','👑','I AM THE KING','#facc15','gems',5]],
  chat:[['Nice move!',10],['Your move, champ',10],['Check!',10],['Chal bhai chal',15],['Kya chaal hai!',15],['GG, well played',10]]}),
 ludo:mk({game:'ludo',name:'Ludo',icon:'🎲',scale:350,
  badges:[['Dice','🎲','coins',15],['Rocket','🚀','coins',25],['Home','🏠','coins',25],['Star','⭐','coins',30],['Lucky','🍀','gems',5],['Crown','👑','gems',10]],
  arenas:[['Sunset','linear-gradient(160deg,#7a2a1a,#1a0806)','coins',30],['Ocean','linear-gradient(160deg,#0a3a6a,#020a18)','coins',30],['Jungle','linear-gradient(160deg,#0b4a22,#02100a)','coins',40],['Candy','linear-gradient(160deg,#7a1f5a,#14040f)','coins',40],['Galaxy','linear-gradient(160deg,#2a1f7a,#050218)','gems',6]],
  taunts:[['Six aa gaya','🎲','SIX AA GAYA!','#ffc857','coins',20],['Cut diya','✂️','CUT DIYA!','#f43f5e','coins',25],['Ghar pahunch','🏠','GHAR PAHUNCH GAYA!','#4ade80','coins',25],['Nahi bachega','😈','NAHI BACHEGA!','#a78bfa','coins',25],['Luck mine','🍀','LUCK IS MINE','#2dd4bf','gems',5]],
  chat:[['Kya dice hai!',10],['Aaj meri baari',10],['Bach gaya re',15],['Ghar ke paas hu',15],['Good game!',10],['Rematch?',10]]}),
 carrom:mk({game:'carrom',name:'Carrom',icon:'🎯',scale:350,
  badges:[['Striker','🎯','coins',15],['Coin','🪙','coins',25],['White','⚪','coins',20],['Black','⚫','coins',20],['Queen','👸','gems',6],['Champion','🏆','gems',10]],
  arenas:[['Teak Board','linear-gradient(160deg,#7a4a1c,#1a0f06)','coins',30],['Night Club','linear-gradient(160deg,#1a1a4a,#03030c)','coins',30],['Mint','linear-gradient(160deg,#0b5a4a,#02120f)','coins',40],['Crimson','linear-gradient(160deg,#6a1020,#140308)','coins',40],['Gold Rush','linear-gradient(160deg,#7a5a0a,#140e02)','gems',6]],
  taunts:[['Queen mine','👑','QUEEN IS MINE!','#facc15','coins',20],['Clean strike','🎯','CLEAN STRIKE!','#4ade80','coins',20],['Foul','😆','FOUL! HA HA','#f43f5e','coins',25],['Pocket it','💥','POCKET IT!','#60a5fa','coins',25],['Boss shot','😎','BOSS SHOT','#a78bfa','gems',5]],
  chat:[['Kya shot hai!',10],['Queen le li',10],['Foul ho gaya',15],['Dhyan se khel',15],['GG bhai',10],['Ek aur game?',10]]}),
 uttt:mk({game:'uttt',name:'Ultimate Tic Tac Toe',icon:'❌',scale:300,
  badges:[['Cross','❌','coins',15],['Circle','⭕','coins',15],['Brain','🧠','coins',25],['Fire','🔥','coins',25],['Ninja','🥷','gems',5],['Crown','👑','gems',10]],
  arenas:[['Blueprint','linear-gradient(160deg,#0a2a5a,#02081a)','coins',30],['Neon Pink','linear-gradient(160deg,#6a0a4a,#14020f)','coins',30],['Slate','linear-gradient(160deg,#2a3040,#07090e)','coins',40],['Forest','linear-gradient(160deg,#0b4a2a,#02120a)','coins',40],['Aurora','linear-gradient(160deg,#0a6a5a,#2a0a6a)','gems',6]],
  taunts:[['Trapped','🪤','YOU ARE TRAPPED!','#f43f5e','coins',20],['Big brain','🧠','BIG BRAIN MOVE','#60a5fa','coins',20],['Three in a row','✅','THREE IN A ROW!','#4ade80','coins',25],['Nice try','😏','NICE TRY...','#a78bfa','coins',25],['Unbeatable','🔥','UNBEATABLE!','#ff7a1a','gems',5]],
  chat:[['Smart move!',10],['Where now?',10],['You sent me there!',15],['Kya dimaag hai',15],['GG',10],['One more?',10]]}),
 critter:(function(){var c=mk({game:'critter',name:'Critter Clash',icon:'🐝',scale:320,
  badges:[['Bee','🐝','coins',15],['Eagle','🦅','coins',25],['Beetle','🪲','coins',25],['Scorpion','🦂','coins',30],['Phoenix','🔥','gems',6],['Crown','👑','gems',10]],
  arenas:[['Swamp Ruins','linear-gradient(160deg,#1c3a30,#050e0b)','coins',30],['Sunset Meadow','linear-gradient(160deg,#7a3a1a,#1a0b06)','coins',30],['Frozen Pond','linear-gradient(160deg,#16506a,#04101a)','coins',40],['Neon Hive','linear-gradient(160deg,#5a0a6a,#0f0218)','coins',40],['Golden Nest','linear-gradient(160deg,#8a6a10,#1a1203)','gems',6]],
  taunts:[['Swarm time','🐜','SWARM TIME!','#f43f5e','coins',20],['Too slow','🐌','TOO SLOW!','#60a5fa','coins',20],['Feel the sting','🐝','FEEL THE STING!','#ffc857','coins',25],['Fly away','🕊️','FLY AWAY, LITTLE ONE','#4ade80','coins',25],['Apex predator','🦅','APEX PREDATOR','#a78bfa','gems',5]],
  chat:[['Nice pick!',10],['Big army!',10],['Tough round',15],['Kya creature hai!',15],['GG',10],['Rematch?',10]]});
  c.items.push({id:'sk_std',t:'skin',n:'Natural',free:1,e:'🌿',sw:'background:#1d2547',css:'',d:'The normal look of your creatures.'});
  [['Golden','✨','filter:drop-shadow(0 0 7px #ffd36a) saturate(1.5)','linear-gradient(135deg,#ffd36a,#b8860b)','coins',40],['Frost','❄️','filter:hue-rotate(165deg) drop-shadow(0 0 7px #8fe3ff)','linear-gradient(135deg,#bfefff,#3a8fd6)','coins',40],['Ember','🔥','filter:hue-rotate(-30deg) saturate(1.8) drop-shadow(0 0 7px #ff7a1a)','linear-gradient(135deg,#ffb36a,#c2331a)','coins',50],['Neon','💜','filter:hue-rotate(250deg) saturate(2) drop-shadow(0 0 8px #d86bff)','linear-gradient(135deg,#d86bff,#5b2bd6)','coins',50],['Shadow','🌑','filter:brightness(.45) contrast(1.4) drop-shadow(0 0 6px #7a5cff)','linear-gradient(135deg,#3a3a52,#08080f)','gems',6]].forEach(function(a,i){c.items.push({id:'sk_'+i,t:'skin',n:a[0],e:a[1],cur:a[4],p:a[5],css:a[2],sw:'background:'+a[3],d:'Your creatures get this look on your side of the arena.'})});
  c.types.push({t:'skin',n:'Creature skins'});return c})()
};
})();
