// Razorpay payments + automatic activation for ALL Ourworldhive apps. Cloudflare Worker (free plan is enough).
// Settings and secrets (Worker > Settings > Variables and Secrets):
//   FB_PROJECT, FB_API_KEY, SA_EMAIL, SA_KEY (Secret), RZP_KEY_ID, RZP_KEY_SECRET (Secret), RZP_WEBHOOK_SECRET (Secret), ORIGIN
// Routes:
//   POST /order    the app asks for a Razorpay order. The price is worked out HERE from the owner's price list
//                  (Firestore pp_config/pricing), so an app can never change what it pays.
//   POST /webhook  Razorpay tells us a payment is captured. We check the signature, read the order from Razorpay,
//                  and switch the plan on in Firestore. Each payment is counted once (pay_log/{paymentId}).
//   GET  /prices   not used, returns {}
//   POST /wallet   {idToken} -> Hive Wallet balance of the signed-in person + price per AI use
//   POST /ai/drawing {idToken,image,hint} -> AI reads a circuit drawing for Spark Bench. The price per use
//                  comes from the owner's price list (tool 'sbai'). It is taken from the wallet only when
//                  the reading succeeds. The owner (OWNER_EMAIL) uses it free.
// Hive Wallet: people top up any amount (Rs 20 to Rs 10,000) with Razorpay; the webhook adds it to wallet/{uid}.bal (paise).
//   Every AI use is written to wallet_log. The site is the middle-man: people pay the site, the site pays the AI.
// Extra settings for the AI reader (Worker > Settings > Variables and Secrets):
//   ANTHROPIC_KEY (Secret)  your Claude API key from console.anthropic.com (keep a small prepaid balance there)
//   AI_MODEL     (optional) default claude-sonnet-5-5
//   OWNER_EMAIL  (optional) default er.krushnananda@gmail.com
//   If ANTHROPIC_KEY is empty but a Workers AI binding named AI exists, the free Workers AI vision model is used (lower quality).
// To add a new app later: add one line in APPS below and one small button in that app.
const DEF_INR={sf:{perm:1999},ep:{m1:199,m3:597,m12:2388},pm:{m1:199,m3:549,m12:1499,perm:1999},pp:{m1:499,m3:1399,m12:4499,perm:5999},diary:{perm:1999},calc:{perm:99}};
// kind: 'user' = one document per signed-in user (needs idToken), 'plant' / 'project' = one document per plant / project
const APPS={
  calc:{kind:'user',col:'cp_users',label:'CalcPad Full Version',once:true},
  diary:{kind:'user',col:'diary_users',label:'My Diary Full Version',once:true},
  sf:{kind:'plant',col:'sf_companies',label:'Safety Observation Full Version',once:true},
  ep:{kind:'plant',col:'ep_plants',label:'E-Permit',days:{m1:30,m3:90,m12:360}},
  pm:{kind:'plant',col:'pm_plants',label:'PM Tracker'},
  pp:{kind:'project',col:'pp_projects',label:'Project Planner'},
  wallet:{kind:'wallet',col:'wallet',label:'Hive Wallet top-up'}
};
const TOPUP_MIN=20,TOPUP_MAX=10000; // rupees
const USE_DEF_INR={sbai:10};        // default price per AI use (rupees) if the owner has not set one
const PLAN_NAME={m1:'1 month',m3:'3 months',m12:'12 months',perm:'Permanent access',topup:'Wallet top-up'};
const PP_DAYS={m1:30,m3:90,m12:365};
const PM_MONTHS={m1:1,m3:3,m12:12};

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
const cleanId=s=>String(s||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
const rzpAuth=env=>'Basic '+btoa(env.RZP_KEY_ID+':'+env.RZP_KEY_SECRET);

// ---- Firestore REST helpers (service account, bypasses rules) ----
const fsBase=env=>'https://firestore.googleapis.com/v1/projects/'+env.FB_PROJECT+'/databases/(default)/documents/';
async function fsGet(env,at,path){
  const r=await fetch(fsBase(env)+path,{headers:{authorization:'Bearer '+at}});
  if(r.status===404)return null;if(!r.ok)throw new Error('fs get '+r.status);
  const j=await r.json(),o={};for(const k in (j.fields||{})){const v=j.fields[k];o[k]=v.stringValue!==undefined?v.stringValue:v.integerValue!==undefined?+v.integerValue:v.doubleValue!==undefined?v.doubleValue:v.booleanValue!==undefined?v.booleanValue:null}
  return o;
}
async function fsGetRaw(env,at,path){
  const r=await fetch(fsBase(env)+path,{headers:{authorization:'Bearer '+at}});
  if(r.status===404)return {doc:null,ut:''};if(!r.ok)throw new Error('fs get '+r.status);
  const j=await r.json(),o={};for(const k in (j.fields||{})){const v=j.fields[k];o[k]=v.stringValue!==undefined?v.stringValue:v.integerValue!==undefined?+v.integerValue:v.doubleValue!==undefined?v.doubleValue:null}
  return {doc:o,ut:j.updateTime||''};
}
// add (or take away, if negative) paise from wallet/{uid}.bal safely, even if two things happen at once
async function walletAdd(env,at,uid,paise,extra){
  for(let i=0;i<6;i++){
    const {doc,ut}=await fsGetRaw(env,at,'wallet/'+uid);
    const bal=Math.max(0,Math.round((doc&&doc.bal||0)+paise));
    const o=Object.assign({bal,ts:Date.now()},extra||{});
    if(paise>0)o.topped=Math.round((doc&&doc.topped||0)+paise);else o.spent=Math.round((doc&&doc.spent||0)-paise);
    const r=await fsPatch(env,at,'wallet/'+uid,o,doc?'currentDocument.updateTime='+encodeURIComponent(ut):'currentDocument.exists=false');
    if(r.ok)return bal;
    if(r.status!==400&&r.status!==409&&r.status!==412)throw new Error('wallet '+r.status);
  }
  throw new Error('wallet busy, try again');
}
async function fsAddDoc(env,at,col,obj){const fields={};Object.keys(obj).forEach(k=>fields[k]=fv(obj[k]));
  return fetch(fsBase(env)+col,{method:'POST',headers:{authorization:'Bearer '+at,'content-type':'application/json'},body:JSON.stringify({fields})})}
async function whoIs(env,idToken){
  if(!idToken)return null;
  const lk=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+env.FB_API_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken})}).then(r=>r.json());
  const u=lk.users&&lk.users[0];return u?{uid:u.localId,email:(u.email||'').toLowerCase(),verified:!!u.emailVerified}:null;
}
const isOwner=(env,u)=>!!u&&u.verified&&u.email===String(env.OWNER_EMAIL||'er.krushnananda@gmail.com').toLowerCase();
// price per AI use, from the owner's list (pp_config/pricing, tool key, INR, 'perm' = per use), with discount
async function usePrice(env,at,tool){
  let b=USE_DEF_INR[tool]||0,pct=0,until='';
  try{const d=await fsGet(env,at,'pp_config/pricing');const j=d&&d.json?JSON.parse(d.json):null;
    if(j){const o=j.prices&&j.prices[tool]&&j.prices[tool].INR&&+j.prices[tool].INR.perm;if(isFinite(o)&&o>0)b=o;
      const dd=j.disc&&j.disc[tool];if(dd){pct=Math.max(0,Math.min(95,+dd.pct||0));until=/^\d{4}-\d{2}-\d{2}$/.test(dd.until||'')?dd.until:''}}}catch(e){}
  const today=new Date(Date.now()+19800000).toISOString().slice(0,10);
  if(pct>0&&(!until||until>=today))b=b*(100-pct)/100;
  return Math.max(1,Math.round(b*100)); // paise
}

// ---- AI drawing reader (Spark Bench) ----
const SB_PROMPT=`You are an electrical and electronics engineer. Read the attached circuit / schematic / panel drawing.
Return ONLY one JSON object, no other text, with these keys:
"title": short name of the circuit.
"summary": 2-4 sentences: what the circuit does and how it works.
"parts": array of EVERY component you can see, each {"tag": tag on the drawing (e.g. K1, R3, MCB2) or "" ,"name": what it is,"function": what it does in THIS circuit (1-2 sentences),"benefit": why it is used / what it protects or improves (1 sentence),"sim": one of the simulator types below if it can be simulated, else ""}.
"spec": a simulator circuit {"c":[[label,type,x,y,rot,params]],"w":[["label.pin","label.pin"]]} rebuilt from the drawing using ONLY these types and pin numbers:
 R(resistor) pins 0,1 params {"R":ohms}; C pins 0,1 {"C":farads}; L pins 0,1 {"L":henry}; POT pins 0=A,1=B,2=W {"R":ohms,"pos":0.5};
 SW(switch, push button, MCB, fuse, contact) pins 0,1 {"closed":true|false}; BAT pins 0=-,1=+ {"V":volts,"r":0.1}; DCV pins 0=-,1=+ {"V":volts,"r":0.001};
 AC pins 0=ref,1=out {"amp":peak volts,"freq":50,"off":0,"r":0.001}; GEN pins 0=ref,1=out {"wave":"sine|square|triangle","amp":5,"freq":1000,"off":0,"r":1};
 GND pin 0; JUNC pin 0; VM(voltmeter) pins 0=-,1=+; AM(ammeter) pins 0=in,1=out; D(diode, also use for SCR/thyristor) pins 0=A,1=K; LED pins 0=A,1=K {"color":"red"}; ZD pins 0=A,1=K {"Vz":5.1};
 NPN/PNP pins 0=B,1=C,2=E {"beta":100}; NMOS/PMOS pins 0=G,1=D,2=S {"Vt":2,"K":0.5}; OA(op-amp) pins 0=+,1=-,2=out {"vmax":12,"vmin":-12};
 RLY(relay or contactor) pins 0=coil+,1=coil-,2=C1,3=C2 {"R":200,"L":0.05,"Vpull":6}; XF(transformer) pins 0=P1,1=P2,2=S1,3=S2 {"L":1,"ratio":secondary/primary,"r1":1};
 BULB(lamp, indicator) pins 0,1 {"R":50}; BUZ pins 0,1 {"R":100}; N555 pins 0=TRIG,1=THR,2=OUT,3=DIS,4=VCC,5=GND.
 Use the drawing's tags as labels when possible (unique). Place parts on a 20-unit grid, x 0..1200, y 0..800, about 160 apart, rot 0/90/180/270.
 Mains (230/415 V) control circuits: use AC sources with amp = 1.414 x rms. Every circuit needs a GND connected to the source reference.
 If the drawing is too large, simulate the most important working section (e.g. one control loop) and say which in "notes".
 If nothing can be simulated, give "spec":{"c":[],"w":[]}.
"notes": array of short strings: assumptions, parts you could not read, what was left out of the simulation.`;
async function aiRead(env,image,hint){
  const m=/^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/.exec(image||'');if(!m)throw new Error('send a PNG or JPG picture');
  const text=SB_PROMPT+(hint?'\nUser note about the drawing: '+String(hint).slice(0,300):'');
  let out='';
  if(env.ANTHROPIC_KEY){
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':env.ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:env.AI_MODEL||'claude-sonnet-5-5',max_tokens:8000,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:m[1],data:m[3]}},{type:'text',text}]}]})});
    const j=await r.json();if(!r.ok)throw new Error('AI: '+(j&&j.error&&j.error.message||r.status));
    out=(j.content||[]).map(c=>c.text||'').join('');
  }else if(env.AI){
    const r=await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct',{messages:[{role:'user',content:[{type:'text',text},{type:'image_url',image_url:{url:image}}]}],max_tokens:4000});
    out=String(r.response||r.result||'');
  }else throw new Error('AI is not set up yet (owner: add ANTHROPIC_KEY in the Worker settings)');
  const a=out.indexOf('{'),b=out.lastIndexOf('}');let res=null;try{res=JSON.parse(out.slice(a,b+1))}catch(e){}
  if(!res||!Array.isArray(res.parts))throw new Error('the AI could not read this drawing clearly');
  return res;
}

function fv(v){return typeof v==='number'?{integerValue:String(Math.round(v))}:{stringValue:String(v)}}
async function fsPatch(env,at,path,obj,extra){
  const keys=Object.keys(obj),fields={};keys.forEach(k=>fields[k]=fv(obj[k]));
  const q=keys.map(k=>'updateMask.fieldPaths='+encodeURIComponent(k)).join('&')+(extra?'&'+extra:'');
  const r=await fetch(fsBase(env)+path+'?'+q,{method:'PATCH',headers:{authorization:'Bearer '+at,'content-type':'application/json'},body:JSON.stringify({fields})});
  return r;
}

// ---- price: owner's list in Firestore (public doc pp_config/pricing), else defaults. INR only. ----
async function priceInr(env,at,tool,plan){
  const A=APPS[tool];if(!A)return 0;if(A.once)plan='perm';
  let b=(DEF_INR[tool]||{})[plan];if(!b)return 0;
  let pct=0,until='';
  try{
    const d=await fsGet(env,at,'pp_config/pricing');
    const j=d&&d.json?JSON.parse(d.json):null;
    if(j){
      const o=j.prices&&j.prices[tool]&&j.prices[tool].INR&&+j.prices[tool].INR[plan];
      if(isFinite(o)&&o>0)b=o;
      const dd=j.disc&&j.disc[tool];if(dd){pct=Math.max(0,Math.min(95,+dd.pct||0));until=/^\d{4}-\d{2}-\d{2}$/.test(dd.until||'')?dd.until:''}
    }
  }catch(e){}
  const today=new Date(Date.now()+19800000).toISOString().slice(0,10);
  if(pct>0&&(!until||until>=today))b=Math.round(b*(100-pct)/100);
  return Math.max(1,Math.round(b))*100; // paise
}

// ---- activation, one function per kind ----
const addMonths=(ms,n)=>{const d=new Date(ms);d.setMonth(d.getMonth()+n);return d.getTime()};
async function activate(env,at,A,n,payId){
  if(A.kind==='wallet'){await walletAdd(env,at,n.target,n.amount,{lastPay:'Razorpay '+payId});return true}
  const path=A.col+'/'+n.target,now=Date.now(),note='Razorpay '+payId;
  const cur=await fsGet(env,at,path);
  if(A.once){ // one-time apps: plan = paid (the plant / company must exist unless it is a user document)
    if(A.kind!=='user'&&!cur)return false;
    return (await fsPatch(env,at,path,{plan:'paid',planAt:now,payNote:note})).ok;
  }
  if(!cur)return false; // plant / project must exist
  if(A.kind==='plant'){
    if(cur.plan==='permanent')return true; // already permanent, nothing to add
    if(n.plan==='perm')return (await fsPatch(env,at,path,{plan:'permanent',expiresMs:0})).ok;
    const base=(!(cur.expiresMs>now))?now:cur.expiresMs;
    if(A.days){const d=A.days[n.plan];if(!d)return false;return (await fsPatch(env,at,path,{plan:'monthly',expiresMs:base+d*864e5})).ok}
    const months=PM_MONTHS[n.plan];if(!months)return false;
    return (await fsPatch(env,at,path,{plan:'monthly',expiresMs:addMonths(base,months)})).ok;
  }
  if(A.kind==='project'){
    if(cur.plan==='permanent')return true;
    if(n.plan==='perm')return (await fsPatch(env,at,path,{plan:'permanent',expiresMs:0})).ok;
    const days=PP_DAYS[n.plan];if(!days)return false;
    const base=Math.max(now,((cur.plan==='monthly'||cur.plan==='trial')&&cur.expiresMs>now)?cur.expiresMs:now);
    return (await fsPatch(env,at,path,{plan:'monthly',expiresMs:base+days*864e5})).ok;
  }
  return false;
}

async function handle(req,env){
  const url=new URL(req.url);
  const cors={'access-control-allow-origin':env.ORIGIN||'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  const J=(o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:Object.assign({'content-type':'application/json'},cors)});
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method==='GET'&&url.pathname.endsWith('/prices'))return J({});
  if(req.method!=='POST')return new Response('POST only',{status:405,headers:cors});

  // ===== create an order =====
  if(url.pathname.endsWith('/order')){
    let b;try{b=await req.json()}catch(e){return J({error:'bad request'},400)}
    // PM Tracker sends {plant,plan,currency}; Project Planner sends {tool:'pp',pid,plan}; CalcPad and Diary send {tool,idToken}
    const tool=b.tool||(b.plant?'pm':'');const A=APPS[tool];if(!A)return J({error:'unknown app'},400);
    if(b.currency&&b.currency!=='INR')return J({error:'online payment is for India (INR) only'},400);
    if(A.kind==='wallet'){
      const rs=Math.round(+b.amount||0);if(!(rs>=TOPUP_MIN&&rs<=TOPUP_MAX))return J({error:'top-up must be Rs '+TOPUP_MIN+' to Rs '+TOPUP_MAX},400);
      const u=await whoIs(env,b.idToken);if(!u)return J({error:'sign in first'},401);
      const o=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{'content-type':'application/json',authorization:rzpAuth(env)},
        body:JSON.stringify({amount:rs*100,currency:'INR',receipt:('wallet_'+u.uid).slice(0,40),notes:{tool:'wallet',target:u.uid,plan:'topup'}})}).then(r=>r.json());
      if(!o.id)return J({error:'order failed'},502);
      return J({orderId:o.id,amount:rs*100,currency:'INR',key:env.RZP_KEY_ID,keyId:env.RZP_KEY_ID,name:'Ourworldhive',label:'Hive Wallet top-up Rs '+rs,email:u.email});
    }
    const plan=A.once?'perm':String(b.plan||'');if(!PLAN_NAME[plan])return J({error:'unknown plan'},400);
    const at=await saToken(env);if(!at)return J({error:'server auth'},500);
    let target='',email='';
    if(A.kind==='user'){
      if(!b.idToken)return J({error:'sign in first'},401);
      const lk=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+env.FB_API_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:b.idToken})}).then(r=>r.json());
      const u=lk.users&&lk.users[0];if(!u)return J({error:'not signed in'},401);
      target=u.localId;email=u.email||'';
    }else{
      target=cleanId(A.kind==='plant'?b.plant:b.pid);if(!target)return J({error:'missing code'},400);
      let d;try{d=await fsGet(env,at,A.col+'/'+target)}catch(e){return J({error:'lookup failed'},502)}
      if(!d)return J({error:'not found'},404);
      if(d.plan==='suspended')return J({error:'this is suspended, please contact the owner'},403);
    }
    const amount=await priceInr(env,at,tool,plan);if(!amount)return J({error:'no price'},500);
    const o=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{'content-type':'application/json',authorization:rzpAuth(env)},
      body:JSON.stringify({amount,currency:'INR',receipt:(tool+'_'+target).slice(0,40),notes:{tool,target,plan}})}).then(r=>r.json());
    if(!o.id)return J({error:'order failed'},502);
    const label=A.label+(A.once?'':' - '+PLAN_NAME[plan]);
    return J({orderId:o.id,amount,currency:'INR',key:env.RZP_KEY_ID,keyId:env.RZP_KEY_ID,name:A.label,label,email});
  }

  // ===== Hive Wallet balance =====
  if(url.pathname.endsWith('/wallet')){
    let b;try{b=await req.json()}catch(e){return J({error:'bad request'},400)}
    const u=await whoIs(env,b.idToken);if(!u)return J({error:'sign in first'},401);
    const at=await saToken(env);if(!at)return J({error:'server auth'},500);
    const d=await fsGet(env,at,'wallet/'+u.uid);
    const tool=/^[a-z]{2,8}$/.test(b.tool||'')?b.tool:'sbai';
    return J({bal:(d&&d.bal||0)/100,owner:isOwner(env,u),price:(await usePrice(env,at,tool))/100,min:TOPUP_MIN,max:TOPUP_MAX,email:u.email,ai:!!(env.ANTHROPIC_KEY||env.AI)});
  }

  // ===== AI drawing reader (Spark Bench) =====
  if(url.pathname.endsWith('/ai/drawing')){
    let b;try{b=await req.json()}catch(e){return J({error:'picture too big or bad request'},400)}
    if(!b.image||b.image.length>5e6)return J({error:'picture missing or too big (max about 3.5 MB)'},400);
    const u=await whoIs(env,b.idToken);if(!u)return J({error:'sign in first'},401);
    const at=await saToken(env);if(!at)return J({error:'server auth'},500);
    const own=isOwner(env,u),price=await usePrice(env,at,'sbai');
    const d=await fsGet(env,at,'wallet/'+u.uid),bal=d&&d.bal||0;
    if(!own&&bal<price)return J({error:'low balance',need:price/100,bal:bal/100},402);
    let res;try{res=await aiRead(env,b.image,b.hint)}catch(e){return J({error:String(e.message||e)},502)} // failed reading = nothing is charged
    let nb=bal;
    if(!own){nb=await walletAdd(env,at,u.uid,-price);}
    try{await fsAddDoc(env,at,'wallet_log',{uid:u.uid,email:u.email,tool:'sbai',amount:own?0:price,bal:nb,ts:Date.now(),title:String(res.title||'').slice(0,80)})}catch(e){}
    return J({result:res,charged:own?0:price/100,bal:nb/100,owner:own});
  }

  // ===== Razorpay webhook =====
  if(url.pathname.endsWith('/webhook')){
    const raw=await req.text();
    const sig=req.headers.get('x-razorpay-signature')||'';
    if(!same(sig,await hmacHex(env.RZP_WEBHOOK_SECRET,raw)))return new Response('bad signature',{status:400});
    let ev;try{ev=JSON.parse(raw)}catch(e){return new Response('bad',{status:400})}
    if(ev.event!=='payment.captured')return new Response('ignored');
    const pay=ev.payload&&ev.payload.payment&&ev.payload.payment.entity;
    if(!pay||!pay.id||!pay.order_id||pay.status!=='captured')return new Response('no payment');
    // Always read the order from Razorpay: its notes and amount are the truth (made by this Worker).
    const ord=await fetch('https://api.razorpay.com/v1/orders/'+encodeURIComponent(pay.order_id),{headers:{authorization:rzpAuth(env)}}).then(r=>r.json());
    const n=ord&&ord.notes||{};const A=APPS[n.tool];const target=cleanId(n.target);
    if(!A||!target||!PLAN_NAME[n.plan])return new Response('not ours');
    if(!(pay.amount>=ord.amount)||ord.currency!=='INR')return new Response('amount mismatch');
    const at=await saToken(env);if(!at)return new Response('auth',{status:500});
    // count each payment once: create pay_log/{id}; if it already exists, stop
    const lg=await fetch(fsBase(env)+'pay_log/'+cleanId(pay.id)+'?currentDocument.exists=false&updateMask.fieldPaths=tool&updateMask.fieldPaths=target&updateMask.fieldPaths=plan&updateMask.fieldPaths=amount&updateMask.fieldPaths=ts',
      {method:'PATCH',headers:{authorization:'Bearer '+at,'content-type':'application/json'},body:JSON.stringify({fields:{tool:fv(n.tool),target:fv(target),plan:fv(n.plan),amount:fv(pay.amount),ts:fv(Date.now())}})});
    if(!lg.ok){const t=await lg.text();if(lg.status===409||/ALREADY_EXISTS|FAILED_PRECONDITION/.test(t))return new Response('already done');return new Response('log failed',{status:500})}
    let ok=false;try{ok=await activate(env,at,A,{target,plan:n.plan,amount:ord.amount},pay.id)}catch(e){ok=false}
    if(!ok){ // let Razorpay retry later
      await fetch(fsBase(env)+'pay_log/'+cleanId(pay.id),{method:'DELETE',headers:{authorization:'Bearer '+at}});
      return new Response('activation failed',{status:500});
    }
    return new Response('ok');
  }
  return new Response('not found',{status:404});
}
// Any crash inside the Worker is sent back as a readable error (with CORS) so the app can show the real reason.
export default{async fetch(req,env){
  try{return await handle(req,env)}
  catch(e){return new Response(JSON.stringify({error:'server error: '+String(e&&e.message||e).slice(0,140)}),{status:500,headers:{'content-type':'application/json','access-control-allow-origin':env.ORIGIN||'*'}})}
}};
