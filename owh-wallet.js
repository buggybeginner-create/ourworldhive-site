/* Hive Wallet: one prepaid balance for every pay-per-use tool on Ourworldhive. © 2026 DUKEKRRISH. All rights reserved.
   People top up any amount with Razorpay (through the owh-pay Worker). Each use (for example an AI drawing read in Spark Bench)
   is taken from the balance by the Worker, only when the use succeeds. Prices per use come from the owner's price list in Studio.
   Needs: firebase-config.js and owh-pricing.js on the page.
   Use:  OWH_WALLET.mount(element,{tool:'sbai',useName:'drawing read'})   then   OWH_WALLET.token()  ->  Firebase ID token (asks to sign in). */
(function(){
var W=window,d=document,state={bal:null,price:null,owner:false,email:'',min:20,max:10000,ai:true},els=[],opts={tool:'sbai',useName:'use'};
function payUrl(){return (W.OWH_PRICE&&W.OWH_PRICE.PAY_URL)||'https://owh-pay.er-krushnananda.workers.dev'}
function load(src){return new Promise(function(a,b){var e=d.createElement('script');e.src=src;e.onload=a;e.onerror=function(){b(new Error('Could not load sign-in. Check internet.'))};d.head.appendChild(e)})}
var fbP=null;
function fb(){if(fbP)return fbP;var b='https://www.gstatic.com/firebasejs/10.12.2/';
 fbP=(W.firebase&&W.firebase.initializeApp?Promise.resolve():load(b+'firebase-app-compat.js'))
  .then(function(){return W.firebase.auth?null:load(b+'firebase-auth-compat.js')})
  .then(function(){if(!W.firebase.apps.length)W.firebase.initializeApp(W.OWH_FIREBASE);
   return new Promise(function(r){var u=W.firebase.auth().onAuthStateChanged(function(){u();r(W.firebase.auth())})})});
 fbP.catch(function(){fbP=null});return fbP}
function user(){return fb().then(function(a){return a.currentUser})}
function signIn(){return fb().then(function(a){if(a.currentUser)return a.currentUser;var p=new W.firebase.auth.GoogleAuthProvider();return a.signInWithPopup(p).then(function(r){return r.user})})}
function token(ask){return fb().then(function(a){var u=a.currentUser;if(u)return u.getIdToken();if(!ask)return null;return signIn().then(function(u){return u.getIdToken()})}).then(function(t){if(t)refreshQuiet(t);return t})}
function rs(v){return '₹'+(Math.round(v*100)/100).toLocaleString('en-IN',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2})}
function api(path,body){return fetch(payUrl()+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){j._status=r.status;return j})})}
function refreshQuiet(t){return api('/wallet',{idToken:t,tool:opts.tool}).then(function(j){if(j.error)throw new Error(j.error);state.bal=j.bal;state.price=j.price;state.owner=j.owner;state.email=j.email;state.min=j.min;state.max=j.max;state.ai=j.ai;paint();return state})}
function refresh(){return token(false).then(function(t){if(!t){state.bal=null;paint();return state}return refreshQuiet(t)})}
function css(){if(d.getElementById('owhw-css'))return;var s=d.createElement('style');s.id='owhw-css';s.textContent=
 '.owhw{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(255,200,87,.45);border-radius:14px;background:rgba(255,200,87,.07);font:600 14px/1.3 system-ui,sans-serif;color:inherit}'+
 '.owhw b{font-size:18px;color:#ffc857}.owhw small{opacity:.8;font-weight:500}.owhw button{appearance:none;border:1px solid #ffc857;background:#ffc857;color:#1a1030;border-radius:999px;padding:8px 14px;font:700 13px system-ui,sans-serif;letter-spacing:.04em;cursor:pointer}.owhw button.gh{background:none;color:#ffc857}'+
 '.owhw-bg{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}.owhw-dl{background:#11182a;color:#eaf1ff;border:1px solid #ffc85766;border-radius:16px;max-width:420px;width:100%;padding:18px;font:15px/1.5 system-ui,sans-serif;max-height:90vh;overflow:auto}'+
 '.owhw-dl h3{margin:0 0 6px;font-size:18px;letter-spacing:.04em}.owhw-amts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.owhw-amts button,.owhw-dl .bt{appearance:none;border:1px solid #ffc85799;background:#ffc85714;color:#ffe2a0;border-radius:10px;padding:10px;font:700 15px system-ui,sans-serif;cursor:pointer}.owhw-amts button[aria-pressed=true]{background:#ffc857;color:#1a1030}'+
 '.owhw-dl input{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid #556;background:#0b1020;color:#fff;font-size:16px}.owhw-dl .row{display:flex;gap:8px;margin-top:12px}.owhw-dl .row .bt{flex:1}.owhw-dl .bt.go{background:#ffc857;color:#1a1030}.owhw-msg{min-height:20px;font-size:13.5px;margin-top:8px;color:#ffd7a0}';
 d.head.appendChild(s)}
function paint(){els.forEach(function(el){var h='';
 if(state.bal===null)h='<span>HIVE WALLET</span><small>Sign in to see your balance and top up. Pay only for what you use.</small><button type="button" data-w="in">SIGN IN</button>';
 else if(state.owner)h='<span>HIVE WALLET</span><b>OWNER</b><small>Free for you (owner). Others pay '+(state.price!=null?rs(state.price):'')+' per '+opts.useName+'.</small>';
 else h='<span>HIVE WALLET</span><b>'+rs(state.bal)+'</b><small>'+(state.price!=null?rs(state.price)+' per '+opts.useName+' · about '+Math.floor(state.bal/state.price)+' left':'')+'</small><button type="button" data-w="top">TOP UP</button><button type="button" class="gh" data-w="re" aria-label="Refresh balance">↻</button>';
 el.innerHTML=h})}
function mount(el,o){css();if(o)for(var k in o)opts[k]=o[k];el.classList.add('owhw');els.push(el);paint();
 el.addEventListener('click',function(e){var b=e.target.closest('[data-w]');if(!b)return;var w=b.getAttribute('data-w');
  if(w==='in')token(true).catch(function(err){alert(err.message||err)});if(w==='top')topup();if(w==='re')refresh()});
 user().then(function(u){if(u)refresh()}).catch(function(){})}
function topup(need){css();return token(true).then(function(t){return new Promise(function(done){
 var amts=[50,100,200,500,1000,2000],pick=need?Math.max(state.min,Math.ceil(need/50)*50):100;
 var bg=d.createElement('div');bg.className='owhw-bg';bg.innerHTML='<div class="owhw-dl" role="dialog" aria-label="Top up Hive Wallet"><h3>TOP UP HIVE WALLET</h3><div>Balance: <b>'+rs(state.bal||0)+'</b>'+(state.price?' · '+rs(state.price)+' per '+opts.useName:'')+'</div>'+
  '<div class="owhw-amts">'+amts.map(function(a){return '<button type="button" data-a="'+a+'" aria-pressed="'+(a===pick)+'">'+rs(a)+'</button>'}).join('')+'</div>'+
  '<label style="font-size:13px">OR ENTER AMOUNT (₹'+state.min+' – ₹'+state.max.toLocaleString('en-IN')+')<input type="number" inputmode="numeric" min="'+state.min+'" max="'+state.max+'" value="'+pick+'"></label>'+
  '<div style="font-size:12.5px;opacity:.8;margin-top:8px">UPI, cards, net banking (Razorpay, India). The balance never expires and is used only when a '+opts.useName+' succeeds. Top-ups are not refundable as cash; see the refund policy.</div>'+
  '<div class="row"><button type="button" class="bt" data-x="1">CANCEL</button><button type="button" class="bt go" data-p="1">PAY</button></div><div class="owhw-msg"></div></div>';
 d.body.appendChild(bg);var inp=bg.querySelector('input'),msg=bg.querySelector('.owhw-msg');
 function close(v){bg.remove();done(v)}
 bg.addEventListener('click',function(e){if(e.target===bg||e.target.closest('[data-x]'))return close(false);var a=e.target.closest('[data-a]');
  if(a){inp.value=a.getAttribute('data-a');[].forEach.call(bg.querySelectorAll('[data-a]'),function(x){x.setAttribute('aria-pressed',x===a)})}
  if(e.target.closest('[data-p]')){var v=Math.round(+inp.value||0);if(!(v>=state.min&&v<=state.max)){msg.textContent='Enter an amount from ₹'+state.min+' to ₹'+state.max+'.';return}
   if(!W.OWH_PRICE||!W.OWH_PRICE.rzpPay){msg.textContent='Payment could not load. Refresh the page.';return}
   msg.textContent='Opening payment...';var old=state.bal||0;
   token(true).then(function(t){return W.OWH_PRICE.rzpPay({tool:'wallet',plan:'topup',amount:v,idToken:t,email:state.email})}).then(function(paid){
    if(!paid){msg.textContent='Payment window closed.';return}
    msg.textContent='Payment received. Adding to your wallet...';var n=0;(function poll(){refresh().then(function(){if(state.bal>old+0.001){close(true)}else if(++n<20)setTimeout(poll,3000);else{msg.textContent='Paid. Your balance will update in a minute; press ↻ to refresh.';setTimeout(function(){close(true)},3500)}})})()
   }).catch(function(e){msg.textContent=(e&&e.message)||'Payment failed.'})}});
})})}
/* run a paid tool through the Worker: handles sign-in, low balance (opens top-up) and refreshes the balance */
function use(path,body){return token(true).then(function(t){body.idToken=t;return api(path,body)}).then(function(j){
 if(j._status===402){state.bal=j.bal;paint();return topup(j.need).then(function(ok){if(!ok)throw new Error('Top up your Hive Wallet to continue.');return use(path,body)})}
 if(j.error)throw new Error(j.error);if(j.bal!=null){state.bal=j.bal;paint()}return j})}
W.OWH_WALLET={mount:mount,token:token,signIn:signIn,refresh:refresh,topup:topup,use:use,state:state};
})();
