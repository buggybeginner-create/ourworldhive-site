// Razorpay payment + auto-activation for Cloudflare Workers (free plan is enough).
// Settings and secrets (Worker > Settings > Variables and Secrets):
//   FB_PROJECT      your Firebase project id (ourworldhive)
//   FB_API_KEY      the Web API key from firebase-config.js
//   SA_EMAIL        client_email from the Firebase service-account JSON
//   SA_KEY          private_key from the same JSON (Secret)
//   RZP_KEY_ID      Razorpay Key Id (starts rzp_live_ or rzp_test_)
//   RZP_KEY_SECRET  Razorpay Key Secret (Secret)
//   RZP_WEBHOOK_SECRET  the secret you type when adding the webhook in Razorpay (Secret)
//   ORIGIN          https://ourworldhive.com
// Routes:  POST /order    app asks for a Razorpay order (price is fixed here, not by the app)
//          POST /webhook  Razorpay tells us a payment is captured; we switch the plan to paid in Firestore
// Only Razorpay's signed webhook can switch a plan on. The app can never do it by itself.
const PRICES={calc:{amount:9900,name:'CalcPad Full Version',col:'cp_users'}}; // amount in paise (99.00 INR)
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const enc=s=>b64u(new TextEncoder().encode(s));
async function saToken(env){
  const now=Math.floor(Date.now()/1000);
  const head=enc(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const cl=enc(JSON.stringify({iss:env.SA_EMAIL,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000}));
  const pem=env.SA_KEY.replace(/\\n/g,'\n').replace(/-----[^-]+-----/g,'').replace(/\s+/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(head+'.'+cl)));
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+head+'.'+cl+'.'+sig}).then(r=>r.json());
  return r.access_token;
}
async function hmacHex(secret,msg){
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const s=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const same=(a,b)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
export default{async fetch(req,env){
  const url=new URL(req.url);
  const cors={'access-control-allow-origin':env.ORIGIN||'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS'};
  const J=(o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:Object.assign({'content-type':'application/json'},cors)});
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method!=='POST')return new Response('POST only',{status:405,headers:cors});

  if(url.pathname.endsWith('/order')){
    let b;try{b=await req.json()}catch(e){return J({error:'bad'},400)}
    const p=PRICES[b.tool];if(!p||!b.idToken)return J({error:'bad'},400);
    const lk=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+env.FB_API_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:b.idToken})}).then(r=>r.json());
    const u=lk.users&&lk.users[0];if(!u)return J({error:'not signed in'},401);
    const o=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{'content-type':'application/json',authorization:'Basic '+btoa(env.RZP_KEY_ID+':'+env.RZP_KEY_SECRET)},
      body:JSON.stringify({amount:p.amount,currency:'INR',receipt:(b.tool+'_'+u.localId).slice(0,40),notes:{tool:b.tool,uid:u.localId,email:u.email||''}})}).then(r=>r.json());
    if(!o.id)return J({error:'order failed'},502);
    return J({orderId:o.id,amount:p.amount,key:env.RZP_KEY_ID,name:p.name,email:u.email||''});
  }

  if(url.pathname.endsWith('/webhook')){
    const raw=await req.text();
    const sig=req.headers.get('x-razorpay-signature')||'';
    if(!same(sig,await hmacHex(env.RZP_WEBHOOK_SECRET,raw)))return new Response('bad signature',{status:400});
    let ev;try{ev=JSON.parse(raw)}catch(e){return new Response('bad',{status:400})}
    if(ev.event!=='payment.captured'&&ev.event!=='order.paid')return new Response('ignored');
    const pay=ev.payload&&ev.payload.payment&&ev.payload.payment.entity;
    const ord=ev.payload&&ev.payload.order&&ev.payload.order.entity;
    const notes=(pay&&pay.notes)||(ord&&ord.notes)||{};
    const p=PRICES[notes.tool];const uid=String(notes.uid||'').replace(/[^A-Za-z0-9_-]/g,'');
    if(!p||!uid)return new Response('no notes');
    const paid=(pay&&pay.amount)||(ord&&ord.amount_paid)||0;
    if(paid<p.amount||(pay&&pay.status!=='captured'&&ev.event==='payment.captured'))return new Response('amount mismatch');
    const at=await saToken(env);if(!at)return new Response('auth',{status:500});
    const note='Razorpay '+((pay&&pay.id)||(ord&&ord.id)||'');
    const doc='https://firestore.googleapis.com/v1/projects/'+env.FB_PROJECT+'/databases/(default)/documents/'+p.col+'/'+uid;
    const r=await fetch(doc+'?updateMask.fieldPaths=plan&updateMask.fieldPaths=planAt&updateMask.fieldPaths=payNote',{method:'PATCH',headers:{authorization:'Bearer '+at,'content-type':'application/json'},
      body:JSON.stringify({fields:{plan:{stringValue:'paid'},planAt:{integerValue:String(Date.now())},payNote:{stringValue:note}}})});
    return new Response(r.ok?'ok':'firestore failed',{status:r.ok?200:500});
  }
  return new Response('not found',{status:404});
}};
