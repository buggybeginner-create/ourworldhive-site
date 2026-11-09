// Razorpay payments + automatic activation for ALL Ourworldhive apps. Cloudflare Worker (free plan is enough).
// Settings and secrets (Worker > Settings > Variables and Secrets):
//   FB_PROJECT, FB_API_KEY, SA_EMAIL, SA_KEY (Secret), RZP_KEY_ID, RZP_KEY_SECRET (Secret), RZP_WEBHOOK_SECRET (Secret), ORIGIN
// Routes:
//   POST /order    the app asks for a Razorpay order. The price is worked out HERE from the owner's price list
//                  (Firestore pp_config/pricing), so an app can never change what it pays.
//   POST /webhook  Razorpay tells us a payment is captured. We check the signature, read the order from Razorpay,
//                  and switch the plan on in Firestore. Each payment is counted once (pay_log/{paymentId}).
//   GET  /prices   not used, returns {}
// To add a new app later: add one line in APPS below and one small button in that app.
const DEF_INR={sf:{perm:1999},ep:{m1:199,m3:597,m12:2388},pm:{m1:199,m3:549,m12:1499,perm:1999},pp:{m1:499,m3:1399,m12:4499,perm:5999},diary:{perm:1999},calc:{perm:99}};
// kind: 'user' = one document per signed-in user (needs idToken), 'plant' / 'project' = one document per plant / project
const APPS={
  calc:{kind:'user',col:'cp_users',label:'CalcPad Full Version',once:true},
  diary:{kind:'user',col:'diary_users',label:'My Diary Full Version',once:true},
  sf:{kind:'plant',col:'sf_companies',label:'Safety Observation Full Version',once:true},
  ep:{kind:'plant',col:'ep_plants',label:'E-Permit',days:{m1:30,m3:90,m12:360}},
  pm:{kind:'plant',col:'pm_plants',label:'PM Tracker'},
  pp:{kind:'project',col:'pp_projects',label:'Project Planner'}
};
const PLAN_NAME={m1:'1 month',m3:'3 months',m12:'12 months',perm:'Permanent access'};
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
    let ok=false;try{ok=await activate(env,at,A,{target,plan:n.plan},pay.id)}catch(e){ok=false}
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
