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
 chess:mk({game:'chess',name:'Royal Duel',icon:'♚',scale:380,
  badges:[['Pawn','♟','coins',15],['Knight','♞','coins',25],['Rook','♜','coins',25],['Queen','♛','coins',40],['King','♚','gems',6],['Crown','👑','gems',10]],
  arenas:[['Wood Hall','linear-gradient(160deg,#3b2a1a,#120c06)','coins',30],['Midnight','linear-gradient(160deg,#0a1440,#02030c)','coins',30],['Marble','linear-gradient(160deg,#4a4f5e,#14161e)','coins',40],['Emerald','linear-gradient(160deg,#0b4a38,#02120d)','coins',40],['Royal Purple','linear-gradient(160deg,#4a1f7a,#0d0418)','gems',6]],
  taunts:[['Checkmate soon','♟','CHECKMATE IS COMING','#ffc857','coins',20],['Think harder','🤔','THINK HARDER...','#60a5fa','coins',20],['Blunder','😬','WHAT A BLUNDER!','#f43f5e','coins',25],['Too slow','⏳','TOO SLOW!','#a78bfa','coins',25],['I am the king','👑','I AM THE KING','#facc15','gems',5]],
  chat:[['Nice move!',10],['Your move, champ',10],['Check!',10],['Chal bhai chal',15],['Kya chaal hai!',15],['GG, well played',10]]}),
 ludo:mk({game:'ludo',name:'Home Dash',icon:'🎲',scale:350,
  badges:[['Dice','🎲','coins',15],['Rocket','🚀','coins',25],['Home','🏠','coins',25],['Star','⭐','coins',30],['Lucky','🍀','gems',5],['Crown','👑','gems',10]],
  arenas:[['Sunset','linear-gradient(160deg,#7a2a1a,#1a0806)','coins',30],['Ocean','linear-gradient(160deg,#0a3a6a,#020a18)','coins',30],['Jungle','linear-gradient(160deg,#0b4a22,#02100a)','coins',40],['Candy','linear-gradient(160deg,#7a1f5a,#14040f)','coins',40],['Galaxy','linear-gradient(160deg,#2a1f7a,#050218)','gems',6]],
  taunts:[['Six aa gaya','🎲','SIX AA GAYA!','#ffc857','coins',20],['Cut diya','✂️','CUT DIYA!','#f43f5e','coins',25],['Ghar pahunch','🏠','GHAR PAHUNCH GAYA!','#4ade80','coins',25],['Nahi bachega','😈','NAHI BACHEGA!','#a78bfa','coins',25],['Luck mine','🍀','LUCK IS MINE','#2dd4bf','gems',5]],
  chat:[['Kya dice hai!',10],['Aaj meri baari',10],['Bach gaya re',15],['Ghar ke paas hu',15],['Good game!',10],['Rematch?',10]]}),
 carrom:mk({game:'carrom',name:'Disc Flick',icon:'🎯',scale:350,
  badges:[['Striker','🎯','coins',15],['Coin','🪙','coins',25],['White','⚪','coins',20],['Black','⚫','coins',20],['Queen','👸','gems',6],['Champion','🏆','gems',10]],
  arenas:[['Teak Board','linear-gradient(160deg,#7a4a1c,#1a0f06)','coins',30],['Night Club','linear-gradient(160deg,#1a1a4a,#03030c)','coins',30],['Mint','linear-gradient(160deg,#0b5a4a,#02120f)','coins',40],['Crimson','linear-gradient(160deg,#6a1020,#140308)','coins',40],['Gold Rush','linear-gradient(160deg,#7a5a0a,#140e02)','gems',6]],
  taunts:[['Queen mine','👑','QUEEN IS MINE!','#facc15','coins',20],['Clean strike','🎯','CLEAN STRIKE!','#4ade80','coins',20],['Foul','😆','FOUL! HA HA','#f43f5e','coins',25],['Pocket it','💥','POCKET IT!','#60a5fa','coins',25],['Boss shot','😎','BOSS SHOT','#a78bfa','gems',5]],
  chat:[['Kya shot hai!',10],['Queen le li',10],['Foul ho gaya',15],['Dhyan se khel',15],['GG bhai',10],['Ek aur game?',10]]}),
 uttt:mk({game:'uttt',name:'Nine Grids',icon:'❌',scale:300,
  badges:[['Cross','❌','coins',15],['Circle','⭕','coins',15],['Brain','🧠','coins',25],['Fire','🔥','coins',25],['Ninja','🥷','gems',5],['Crown','👑','gems',10]],
  arenas:[['Blueprint','linear-gradient(160deg,#0a2a5a,#02081a)','coins',30],['Neon Pink','linear-gradient(160deg,#6a0a4a,#14020f)','coins',30],['Slate','linear-gradient(160deg,#2a3040,#07090e)','coins',40],['Forest','linear-gradient(160deg,#0b4a2a,#02120a)','coins',40],['Aurora','linear-gradient(160deg,#0a6a5a,#2a0a6a)','gems',6]],
  taunts:[['Trapped','🪤','YOU ARE TRAPPED!','#f43f5e','coins',20],['Big brain','🧠','BIG BRAIN MOVE','#60a5fa','coins',20],['Three in a row','✅','THREE IN A ROW!','#4ade80','coins',25],['Nice try','😏','NICE TRY...','#a78bfa','coins',25],['Unbeatable','🔥','UNBEATABLE!','#ff7a1a','gems',5]],
  chat:[['Smart move!',10],['Where now?',10],['You sent me there!',15],['Kya dimaag hai',15],['GG',10],['One more?',10]]})
};
})();
