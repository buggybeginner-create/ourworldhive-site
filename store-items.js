/* Hive Store: shared catalog + local cache (used by store.html and the games). */
(function(){
var C=function(r,g,b){return[r,g,b]};
var ITEMS=[
 /* kits: jersey colour on stickman players */
 {id:'kit_team',t:'kit',n:'Team colour',free:1,col:null},
 {id:'kit_crim',t:'kit',n:'Crimson',cur:'coins',p:30,col:C(200,30,50)},
 {id:'kit_blue',t:'kit',n:'Royal Blue',cur:'coins',p:30,col:C(40,90,220)},
 {id:'kit_ora',t:'kit',n:'Tiger Orange',cur:'coins',p:30,col:C(244,128,20)},
 {id:'kit_pink',t:'kit',n:'Hot Pink',cur:'coins',p:30,col:C(236,64,150)},
 {id:'kit_emer',t:'kit',n:'Emerald',cur:'coins',p:40,col:C(16,150,96)},
 {id:'kit_blk',t:'kit',n:'Midnight Black',cur:'coins',p:40,col:C(26,28,38)},
 {id:'kit_gold',t:'kit',n:'Gold Rush',cur:'gems',p:8,col:C(240,190,40)},
 {id:'kit_gal',t:'kit',n:'Galaxy Purple',cur:'gems',p:10,col:C(120,60,220)},
 /* caps */
 {id:'cap_band',t:'cap',n:'Headband',free:1,style:'band',col:null},
 {id:'cap_red',t:'cap',n:'Red Cap',cur:'coins',p:25,style:'cap',col:C(220,40,50)},
 {id:'cap_blue',t:'cap',n:'Blue Cap',cur:'coins',p:25,style:'cap',col:C(40,110,230)},
 {id:'cap_beanie',t:'cap',n:'Beanie',cur:'coins',p:30,style:'beanie',col:C(250,200,40)},
 {id:'cap_cow',t:'cap',n:'Cowboy Hat',cur:'coins',p:60,style:'cowboy',col:C(150,96,50)},
 {id:'cap_ninja',t:'cap',n:'Ninja Band',cur:'coins',p:30,style:'band',col:C(20,20,24)},
 {id:'cap_crown',t:'cap',n:'Golden Crown',cur:'gems',p:15,style:'crown',col:C(255,206,64)},
 /* bats */
 {id:'bat_std',t:'bat',n:'Classic Willow',free:1,col:null},
 {id:'bat_fire',t:'bat',n:'Fire Red',cur:'coins',p:40,col:C(210,40,30),sticker:C(255,170,0)},
 {id:'bat_neon',t:'bat',n:'Neon Blue',cur:'coins',p:40,col:C(30,160,250),sticker:C(255,255,255)},
 {id:'bat_ninja',t:'bat',n:'Black Ninja',cur:'coins',p:50,col:C(30,30,36),sticker:C(255,60,60)},
 {id:'bat_lime',t:'bat',n:'Lime Smash',cur:'coins',p:40,col:C(130,220,40),sticker:C(30,60,20)},
 {id:'bat_gold',t:'bat',n:'Golden Bat',cur:'gems',p:10,col:C(240,190,40),sticker:C(255,255,255)},
 /* taunts: big banner on the main screen, both players see it */
 {id:'tn_six',t:'taunt',n:'Sixer!',e:'🔥',txt:'SIXER INCOMING!',col:'#ff7a1a',cur:'coins',p:20},
 {id:'tn_bowl',t:'taunt',n:'Bowled you',e:'😎',txt:'BOWLED YOU!',col:'#2dd4bf',cur:'coins',p:20},
 {id:'tn_sit',t:'taunt',n:'Sit down',e:'🪑',txt:'SIT DOWN!',col:'#a78bfa',cur:'coins',p:25},
 {id:'tn_easy',t:'taunt',n:'Too easy',e:'😴',txt:'TOO EASY...',col:'#60a5fa',cur:'coins',p:25},
 {id:'tn_boom',t:'taunt',n:'Boom',e:'💥',txt:'BOOM!',col:'#f43f5e',cur:'coins',p:30},
 {id:'tn_luck',t:'taunt',n:'Better luck',e:'🍀',txt:'BETTER LUCK NEXT TIME',col:'#4ade80',cur:'coins',p:30},
 {id:'tn_king',t:'taunt',n:'King',e:'👑',txt:'I AM THE KING',col:'#facc15',cur:'gems',p:6},
 {id:'tn_bye',t:'taunt',n:'Bye bye',e:'👋',txt:'BYE BYE!',col:'#f472b6',cur:'gems',p:6},
 /* paid chat lines */
 {id:'ch_aaja',t:'chat',n:'Aaja bhai!',txt:'Aaja bhai!',cur:'coins',p:10},
 {id:'ch_baat',t:'chat',n:'Kya baat hai',txt:'Kya baat hai!',cur:'coins',p:10},
 {id:'ch_nikal',t:'chat',n:'Chal nikal',txt:'Chal nikal!',cur:'coins',p:15},
 {id:'ch_wow',t:'chat',n:'What a shot',txt:'What a shot!',cur:'coins',p:10},
 {id:'ch_press',t:'chat',n:'Pressure',txt:'Pressure is on!',cur:'coins',p:15},
 {id:'ch_gg',t:'chat',n:'GG bro',txt:'GG bro!',cur:'coins',p:10},
 {id:'ch_try',t:'chat',n:'Nice try',txt:'Nice try champ',cur:'coins',p:15},
 {id:'ch_bring',t:'chat',n:'Bring it on',txt:'Bring it on!',cur:'coins',p:15}
];
var PACKS=[
 {id:'c10',cur:'coins',amt:100,rs:10},{id:'c20',cur:'coins',amt:230,rs:20},{id:'c50',cur:'coins',amt:650,rs:50},
 {id:'g10',cur:'gems',amt:12,rs:10},{id:'g50',cur:'gems',amt:70,rs:50},{id:'g100',cur:'gems',amt:150,rs:100}
];
var KEY='owh_store_v1';
function by(id){for(var i=0;i<ITEMS.length;i++)if(ITEMS[i].id===id)return ITEMS[i];return null}
function load(){try{var s=JSON.parse(localStorage.getItem(KEY)||'{}');return{coins:+s.coins||0,gems:+s.gems||0,owned:s.owned||[],eq:s.eq||{},owner:!!s.owner}}catch(e){return{coins:0,gems:0,owned:[],eq:{},owner:false}}}
function save(w){try{localStorage.setItem(KEY,JSON.stringify(w))}catch(e){}}
function has(w,id){var it=by(id);return !!it&&(!!it.free||!!w.owner||w.owned.indexOf(id)>=0)}
window.OWHSTORE={ITEMS:ITEMS,PACKS:PACKS,by:by,load:load,save:save,has:has,
 /* what the game should draw for this player: only items the player really has */
 eq:function(w){w=w||load();var o={},e=w.eq||{};['kit','cap','bat'].forEach(function(t){var it=e[t]&&has(w,e[t])?by(e[t]):null;if(it&&!it.free)o[t]=e[t]});return o},
 owned:function(t,w){w=w||load();return ITEMS.filter(function(i){return i.t===t&&has(w,i.id)})}
};
})();
