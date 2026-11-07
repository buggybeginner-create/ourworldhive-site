// E-Permit push sender for Cloudflare Workers (free plan is enough).
// Secrets and settings (Worker > Settings > Variables):
//   FB_PROJECT   your Firebase project id
//   FB_API_KEY   the Web API key from firebase-config.js
//   SA_EMAIL     client_email from the Firebase service-account JSON
//   SA_KEY       private_key from the same JSON (keep as a Secret)
//   ORIGIN       https://ourworldhive.com
// The app sends: { idToken, cid, to:[uid], title, body, pid }. The worker checks the sender is an active member
// of that plant, then sends a push to the phones saved on each active receiver.
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const enc=s=>b64u(new TextEncoder().encode(s));
async function saToken(env){
  const now=Math.floor(Date.now()/1000);
  const head=enc(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const cl=enc(JSON.stringify({iss:env.SA_EMAIL,scope:'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000}));
  const pem=env.SA_KEY.replace(/\\n/g,'\n').replace(/-----[^-]+-----/g,'').replace(/\s+/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(head+'.'+cl)));
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+head+'.'+cl+'.'+sig}).then(r=>r.json());
  return r.access_token;
}
export default{async fetch(req,env){
  const cors={'access-control-allow-origin':env.ORIGIN||'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS'};
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method!=='POST')return new Response('POST only',{status:405,headers:cors});
  let b;try{b=await req.json()}catch(e){return new Response('bad',{status:400,headers:cors})}
  const cid=String(b.cid||'').replace(/[^A-Za-z0-9_-]/g,'');if(!cid||!Array.isArray(b.to)||!b.idToken)return new Response('bad',{status:400,headers:cors});
  const lk=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+env.FB_API_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:b.idToken})}).then(r=>r.json());
  const uid=lk.users&&lk.users[0]&&lk.users[0].localId;if(!uid)return new Response('not signed in',{status:401,headers:cors});
  const at=await saToken(env);if(!at)return new Response('auth',{status:500,headers:cors});
  const base='https://firestore.googleapis.com/v1/projects/'+env.FB_PROJECT+'/databases/(default)/documents/ep_plants/'+cid+'/members/';
  const get=u=>fetch(base+u.replace(/[^A-Za-z0-9_-]/g,''),{headers:{authorization:'Bearer '+at}}).then(r=>r.json());
  const me=await get(uid);if(!me.fields||me.fields.status.stringValue!=='active')return new Response('not a member',{status:403,headers:cors});
  const title=String(b.title||'E-Permit').slice(0,80),body=String(b.body||'').slice(0,160);let sent=0;
  for(const u of b.to.slice(0,25)){
    const m=await get(String(u));if(!m.fields||m.fields.status.stringValue!=='active')continue;
    const toks=((m.fields.tokens||{}).arrayValue||{}).values||[];
    for(const t of toks){
      const r=await fetch('https://fcm.googleapis.com/v1/projects/'+env.FB_PROJECT+'/messages:send',{method:'POST',headers:{authorization:'Bearer '+at,'content-type':'application/json'},body:JSON.stringify({message:{token:t.stringValue,data:{title,body,pid:String(b.pid||''),url:'./permit.html'},webpush:{headers:{Urgency:'high',TTL:'3600'}}}})});
      if(r.ok)sent++;
    }
  }
  return new Response(JSON.stringify({sent}),{headers:Object.assign({'content-type':'application/json'},cors)});
}};
