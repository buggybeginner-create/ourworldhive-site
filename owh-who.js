/* OurWorldHive: small "who am I" tag for every game. Copyright DUKEKRRISH. All rights reserved.
   Shows Guest or the signed-in name. Tap it to run a quick connection check. */
(function(){
if(window.__owhWho)return;window.__owhWho=1;
var D=document,el=null,panel=null,lastU=undefined;
function css(){var s=D.createElement('style');s.textContent='#owhwho{position:fixed;right:max(12px,env(safe-area-inset-right,0px));top:max(14px,env(safe-area-inset-top,0px));z-index:2147482000;width:22px;height:22px;border-radius:50%;background:#7a8794;border:2px solid #ffffffd9;box-shadow:0 0 0 3px #0008,0 2px 8px #0008;cursor:pointer;padding:0}#owhwho:before{content:"";position:absolute;inset:-12px}#owhwho.in{background:#22c55e}#owhwho.gs{background:#f59e0b}#owhwho.off{background:#ef4444}#owhwhop{position:fixed;left:8px;right:8px;top:46px;z-index:2147482001;background:#0b1d2cf2;color:#e6f4f2;border:1px solid #ffffff40;border-radius:14px;padding:12px;font:13px/1.45 system-ui,-apple-system,sans-serif;max-height:55vh;overflow:auto;white-space:pre-wrap;word-break:break-word}';(D.head||D.documentElement).appendChild(s)}
var LBL='';
function who(u){return u?(u.isAnonymous?'GUEST (anonymous)':'SIGNED IN as '+(u.displayName||u.email||'your account')):'GUEST (not connected)'}
function paint(u,ready){if(!el)return;var c;
 if(u&&!u.isAnonymous)c='in';else if(u)c='gs';else if(ready)c='off';else c='gs';
 LBL=who(u);el.className=c;el.setAttribute('aria-label',LBL)}
function watch(){var tries=0,t=setInterval(function(){tries++;
 try{if(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth){clearInterval(t);var a=firebase.auth();paint(a.currentUser,true);a.onAuthStateChanged(function(u){lastU=u;paint(u,true)});return}}catch(e){}
 if(tries>400)clearInterval(t)},800)}
function load(u){return new Promise(function(res,rej){var s=D.createElement('script');s.src=u;s.onload=res;s.onerror=function(){rej(new Error('Could not load '+u))};D.head.appendChild(s)})}
async function check(){if(panel){panel.remove();panel=null;return}
 panel=D.createElement('div');panel.id='owhwhop';D.body.appendChild(panel);var out=[];var gn='';try{gn=localStorage.getItem('owh_bx_name')||''}catch(e){}out.push('\uD83D\uDFE2 green = signed in   \uD83D\uDFE1 yellow = guest   \uD83D\uDD34 red = not connected\nPlayer name: '+(gn||'(not set yet)')+'\nStatus: '+(LBL||'GUEST (not connected)')+'\n');function say(x){out.push(x);panel.textContent=out.join('\n')}
 say('Checking the connection...');
 try{
  if(!window.OWH_FIREBASE){say('No Firebase config on this page (offline-only game).');return}
  var b='https://www.gstatic.com/firebasejs/10.12.2/';
  if(!window.firebase)await load(b+'firebase-app-compat.js');if(!firebase.auth)await load(b+'firebase-auth-compat.js');if(!firebase.firestore)await load(b+'firebase-firestore-compat.js');
  if(!firebase.apps.length)firebase.initializeApp(window.OWH_FIREBASE);
  var a=firebase.auth();
  if(a.currentUser)say('Login: '+(a.currentUser.isAnonymous?'GUEST (anonymous)':'SIGNED IN as '+(a.currentUser.displayName||a.currentUser.email))+'\nUser id: '+a.currentUser.uid);
  else{try{await a.signInAnonymously();say('Login: GUEST (anonymous) created OK\nUser id: '+a.currentUser.uid)}catch(e){say('LOGIN FAILED: '+(e.code||e.message)+'\n'+(/admin-restricted|operation-not-allowed/.test(e.code||'')?'Fix: Firebase Console > Authentication > Sign-in method > turn ON "Anonymous".':'Check the internet and try again.'));return}}
  try{var q=await firebase.firestore().collection('hr_rooms').where('st','==','lobby').limit(1).get();say('Rooms read: OK ('+q.size+' open)')}
  catch(e){say('ROOMS READ FAILED: '+(e.code||e.message)+'\n'+(/permission/.test(e.code||e.message||'')?'Fix: publish the Firestore rules (Rules tab > Publish).':''));return}
  say('All good. If a room still does not open, tell Claude exactly what you saw.')
 }catch(e){say('Check failed: '+(e.code||e.message||e))}}
function init(){if(!D.body)return;css();el=D.createElement('div');el.id='owhwho';el.setAttribute('role','button');el.addEventListener('click',check);D.body.appendChild(el);paint(null,false);watch()}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',init);else init();
})();
