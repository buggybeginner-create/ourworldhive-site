/* PM Tracker daily alerts: a Cloudflare Worker that runs on a schedule (cron) and sends push notifications.
   Secrets to add in Cloudflare: FIREBASE_PROJECT_ID, SA_EMAIL (client_email), SA_KEY (private_key), RUN_KEY (any secret word, for a manual test).
   Optional variables: APP_URL (default https://ourworldhive.com/pm.html), TZ_MINUTES (default 330 for India).
   WhatsApp (optional): secrets WA_TOKEN, WA_PHONE_ID; variables WA_TEMPLATE (statistics, default pm_daily_report), WA_TEMPLATE_MINE (own jobs, default pm_my_jobs),
   WA_LANG (default en), WA_CC (default 91), WA_AT (default send time 08:00), WA_WINDOW (minutes, default 30).
   Run the worker every 15 minutes (a cron trigger that fires every 15 minutes). Phone alerts then go once a day at PUSH_AT (for example 08:00); if PUSH_AT is not set they go at every run.
   Who gets the daily phone alert (Nov 2026):
     - users: their own jobs (and jobs of their groups) + every job of their own section
     - managers: the jobs of their sections (departments they manage + sections they own, can be many); a manager with none gets the whole plant
     - the plant Admin (plant owner): no daily alert
   Copyright DUKEKRRISH. All rights reserved. */
const FS='https://firestore.googleapis.com/v1/projects/';
/* groups: a task given to a group (g_...) belongs to every member of that group. GM is read from the plant settings before messages are built. */
let GM={};const isMine=(t,id)=>t.assignee===id||(typeof t.assignee==='string'&&t.assignee.slice(0,2)==='g_'&&(GM[t.assignee]||[]).indexOf(id)>=0);
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64us=s=>b64u(new TextEncoder().encode(s));
async function accessToken(env){const now=Math.floor(Date.now()/1000),h=b64us(JSON.stringify({alg:'RS256',typ:'JWT'})),c=b64us(JSON.stringify({iss:env.SA_EMAIL,scope:'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3300}));
 const pem=String(env.SA_KEY).replace(/\\n/g,'\n').replace(/-----[A-Z ]+-----/g,'').replace(/\s+/g,''),der=Uint8Array.from(atob(pem),x=>x.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']),sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(h+'.'+c)),jwt=h+'.'+c+'.'+b64u(sig);
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'grant_type='+encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')+'&assertion='+jwt});const j=await r.json();if(!j.access_token)throw new Error('token: '+JSON.stringify(j).slice(0,200));return j.access_token}
function fv(v){if(!v)return null;if('stringValue' in v)return v.stringValue;if('integerValue' in v)return +v.integerValue;if('doubleValue' in v)return v.doubleValue;if('booleanValue' in v)return v.booleanValue;if('nullValue' in v)return null;if(v.arrayValue)return(v.arrayValue.values||[]).map(fv);if(v.mapValue){const o={};Object.keys(v.mapValue.fields||{}).forEach(k=>o[k]=fv(v.mapValue.fields[k]));return o}return null}
const dec=d=>{const o={id:d.name.split('/').pop()};Object.keys(d.fields||{}).forEach(k=>o[k]=fv(d.fields[k]));return o};
const ymd=d=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
const localToday=(ms,tz)=>ymd(new Date(ms+tz*60000));
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return ymd(d)};
const diff=(a,b)=>Math.round((new Date(a+'T00:00:00Z')-new Date(b+'T00:00:00Z'))/864e5);
const planOk=(p,now)=>p.plan==='permanent'||((p.plan==='trial'||p.plan==='monthly')&&(p.expiresMs||0)>now);
/* manager = role manager or admin, but never the plant owner (the plant Admin gets no daily alert) */
const isOwner=(plant,m)=>!!plant.ownerUid&&m.id===plant.ownerUid;
const isMgrM=m=>m.role==='manager'||m.role==='admin';
/* sections a manager looks after: sections of the departments he manages + sections where he (or his group) is the owner; null = whole plant (can be many sections) */
function mgrSecs(cfg,m){const s=new Set();((cfg&&cfg.depts)||[]).forEach(d=>{if(d&&(d.mgrs||[]).indexOf(m.id)>=0)(d.secs||[]).forEach(x=>s.add(x))});((cfg&&cfg.sections)||[]).forEach(x=>{const o=x&&x.owner||'';if(o&&(o===m.id||(o.slice(0,2)==='g_'&&(GM[o]||[]).indexOf(m.id)>=0)))s.add(x.id)});return s.size?s:null}
const forMgr=(cfg,m)=>{const S=mgrSecs(cfg,m);return t=>!S||S.has(t.sec)};
/* a user's own section (members keep the section name): users get their own jobs + every job of their section */
function userSec(cfg,m){const n=String(m.sec||'').trim().toLowerCase();if(!n||n.indexOf('dept: ')===0)return'';const x=((cfg&&cfg.sections)||[]).find(y=>y&&String(y.name||'').toLowerCase()===n);return x?x.id:''}
const forUser=(cfg,m)=>{const sec=userSec(cfg,m);return t=>isMine(t,m.id)||(!!sec&&t.sec===sec)};
/* Build one message per person: users get their own tasks, managers get their department (or the whole plant). */
function buildMessages(plant,cfg,members,tasks,today,appUrl){const A=plant.alertDays==null?7:plant.alertDays,out=[];
 const open=tasks.filter(t=>t.active!==false&&!t.closed&&t.due&&t.due<=addDays(today,A));
 members.filter(m=>m.status==='active'&&m.tokens&&m.tokens.length&&!isOwner(plant,m)).forEach(m=>{const mgr=isMgrM(m),inScope=mgr?forMgr(cfg,m):forUser(cfg,m),mine=open.filter(inScope);if(!mine.length)return;
  const over=mine.filter(t=>t.due<today),tod=mine.filter(t=>t.due===today),soon=mine.filter(t=>t.due>today);
  if(!over.length&&!tod.length&&!(soon.length&&!mgr))return;
  const bits=[];if(over.length)bits.push(over.length+' overdue');if(tod.length)bits.push(tod.length+' due today');if(soon.length)bits.push(soon.length+' due soon');
  const top=over.concat(tod,soon).sort((a,b)=>a.due<b.due?-1:1).slice(0,3).map(t=>t.tag+(t.due<today?' ('+diff(today,t.due)+'d late)':t.due===today?' (today)':' ('+t.due.slice(5)+')')).join(', ');
  m.tokens.forEach(tok=>out.push({token:tok,member:m.id,plant:plant.code,title:plant.name+': '+bits.join(', '),body:top+(mine.length>3?' and '+(mine.length-3)+' more':''),url:(appUrl||'https://ourworldhive.com/pm.html')}))});return out}
/* Daily shutdown progress for managers (not the plant Admin): one message per plan that is not finished yet, counted in the manager's own department. */
function buildShutdownDigests(plant,cfg,members,tasks,today,appUrl){const out=[];
 members.filter(m=>m.status==='active'&&isMgrM(m)&&!isOwner(plant,m)&&m.tokens&&m.tokens.length).forEach(m=>{const inScope=forMgr(cfg,m),plans={};
  tasks.filter(t=>t.cat==='SD'&&t.active!==false&&inScope(t)).forEach(t=>{const k=t.sd||'Shutdown',p=plans[k]=plans[k]||{name:k,start:'',total:0,done:0,over:0,jobs:[]};if(t.sdStart&&(!p.start||t.sdStart<p.start))p.start=t.sdStart;p.jobs.push(t)});
  Object.keys(plans).forEach(k=>{const p=plans[k];p.total=p.jobs.length;p.jobs.forEach(t=>{const d=t.closed||(t.lastDone&&(!p.start||t.lastDone>=p.start));if(d)p.done++;else if(t.due<today)p.over++});if(p.done===p.total)return;
   m.tokens.forEach(tok=>out.push({token:tok,member:m.id,plant:plant.code,title:plant.name+': shutdown '+p.name,body:p.done+' of '+p.total+' jobs done ('+Math.round(p.done*100/p.total)+'%)'+(p.over?', '+p.over+' overdue':''),url:appUrl||'https://ourworldhive.com/pm.html'}))})});return out}
/* ---- statistics for the managers (the same rules as the Stats screen) ---- */
function buildStats(tasks,logs,today){const ms=today.slice(0,8)+'01',open=tasks.filter(t=>t.active!==false&&!t.closed&&t.due),pend=open.filter(t=>t.due<=today),doneToday=logs.filter(l=>l.done===today).length;
 let ok=0,late=0,np=0;logs.forEach(l=>{if(l.due>=ms&&l.due<=today){if(l.done<=l.due)ok++;else late++}});open.forEach(t=>{if(t.due>=ms&&t.due<=today)np++});const target=ok+late+np;
 return{todayTarget:pend.length+doneToday,doneToday,pending:pend.length,overdue:open.filter(t=>t.due<today).length,monthTarget:target,monthOk:ok,monthPct:target?Math.round(ok*100/target):100}}
const waNum=(m,cc)=>{const c=String(m.contact||'');if(c.indexOf('@')>=0)return'';const d=c.replace(/\D/g,'').slice(-10);return d.length>=8?String(cc||'91').replace(/\D/g,'')+d:''};
const niceDate=s=>{const d=new Date(s+'T00:00:00Z');return d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]+' '+d.getUTCFullYear()};
/* one WhatsApp template message for one person. kind: stats (plant statistics) or mine (the person's own jobs) */
function waMessage(r,plant,stats,tasks,today,env,cc){const to=r.to||waNum(r.m,cc),app=env.APP_URL||'https://ourworldhive.com/pm.html',clean=x=>({type:'text',text:String(x).replace(/[\n\t]+/g,' ').slice(0,60)});let name,vals;
 if(r.kind==='mine'){const mine=(tasks||[]).filter(t=>t.active!==false&&!t.closed&&t.due&&isMine(t,r.m.id)&&t.due<=today);name=env.WA_TEMPLATE_MINE||'pm_my_jobs';vals=[r.m.name||'there',plant.name,mine.length,mine.filter(t=>t.due<today).length,app]}
 else{name=env.WA_TEMPLATE||'pm_daily_report';vals=[plant.name,niceDate(today),stats.pending,stats.doneToday,stats.monthPct,stats.monthOk,stats.monthTarget,stats.overdue,app]}
 return{to,body:{messaging_product:'whatsapp',to,type:'template',template:{name,language:{code:env.WA_LANG||'en'},components:[{type:'body',parameters:vals.map(clean)}]}}}}
/* who gets a message, at what time and what */
const hm=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||''));return m?(+m[1])*60+(+m[2]):-1};
const inWindow=(at,cur,win)=>{const t=hm(at);return t>=0&&cur>=t&&cur<t+win};
const localMinutes=(now,tz)=>{const d=new Date(now+tz*60000);return d.getUTCHours()*60+d.getUTCMinutes()};
function waRecipients(cfg,members,env){const cc=(cfg&&cfg.cc)||env.WA_CC||'91',by={};members.forEach(m=>by[m.id]=m);
 const L=Array.isArray(cfg.waS)&&cfg.waS.length?cfg.waS:members.filter(m=>m.role==='manager').map(m=>({mid:m.id,on:true,time:env.WA_AT||'08:00',kind:'stats'}));
 return L.filter(r=>r&&r.on!==false&&by[r.mid]&&by[r.mid].status==='active'&&waNum(by[r.mid],cc)).map(r=>({m:by[r.mid],time:r.time||env.WA_AT||'08:00',kind:r.kind==='mine'?'mine':'stats',to:waNum(by[r.mid],cc)}))}
async function sendWa(env,m){const r=await fetch('https://graph.facebook.com/v21.0/'+env.WA_PHONE_ID+'/messages',{method:'POST',headers:{authorization:'Bearer '+env.WA_TOKEN,'content-type':'application/json'},body:JSON.stringify(m.body)});return r.ok}
async function api(env,tok,path,opt){const r=await fetch(FS+env.FIREBASE_PROJECT_ID+'/databases/(default)/documents'+path,Object.assign({headers:{authorization:'Bearer '+tok,'content-type':'application/json'}},opt||{}));if(!r.ok)throw new Error(path+' '+r.status);return r.json()}
async function listAll(env,tok,path){let out=[],pt='';do{const j=await api(env,tok,path+'?pageSize=300'+(pt?'&pageToken='+pt:''));out=out.concat((j.documents||[]).map(dec));pt=j.nextPageToken||''}while(pt);return out}
async function sendOne(env,tok,m,appUrl){const r=await fetch('https://fcm.googleapis.com/v1/projects/'+env.FIREBASE_PROJECT_ID+'/messages:send',{method:'POST',headers:{authorization:'Bearer '+tok,'content-type':'application/json'},body:JSON.stringify({message:{token:m.token,data:{title:m.title,body:m.body,url:m.url,tag:'pm-'+m.plant},webpush:{headers:{Urgency:'high',TTL:'43200'}}}})});if(r.ok)return'ok';const t=await r.text();return/UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(t)?'dead':'fail'}
async function getState(env,tok,code){try{return dec(await api(env,tok,'/pm_plants/'+code+'/cfg/wa_state'))||{}}catch(e){return{}}}
async function setState(env,tok,code,o){const ks=Object.keys(o);if(!ks.length)return;try{const f={};ks.forEach(k=>f[k]={stringValue:String(o[k])});await api(env,tok,'/pm_plants/'+code+'/cfg/wa_state?'+ks.map(k=>'updateMask.fieldPaths='+k).join('&'),{method:'PATCH',body:JSON.stringify({fields:f})})}catch(e){}}
async function run(env,opt){opt=opt||{};const tz=+(env.TZ_MINUTES||330),now=opt.now||Date.now(),today=localToday(now,tz),cur=localMinutes(now,tz),win=+(env.WA_WINDOW||30),force=!!opt.force,tok=await accessToken(env),plants=await listAll(env,tok,'/pm_plants'),stat={plants:0,sent:0,dead:0,fail:0},wantWa=!!(env.WA_TOKEN&&env.WA_PHONE_ID),pushTime=force||!env.PUSH_AT||inWindow(env.PUSH_AT,cur,win);
 const qry=async(code,col,where,limit)=>{const q=await api(env,tok,'/pm_plants/'+code+':runQuery',{method:'POST',body:JSON.stringify({structuredQuery:Object.assign({from:[{collectionId:col}],limit},where?{where}:{})})});return(Array.isArray(q)?q:[]).filter(x=>x.document).map(x=>dec(x.document))};
 for(const p of plants){if(!planOk(p,now))continue;stat.plants++;const code=p.id;p.code=code;const members=await listAll(env,tok,'/pm_plants/'+code+'/members'),hasTok=members.some(m=>m.tokens&&m.tokens.length&&!isOwner(p,m));let st=null;const getSt=async()=>st||(st=await getState(env,tok,code));
  const doPush=hasTok&&pushTime&&(force||!env.PUSH_AT||(await getSt()).push!==today);if(!doPush&&!wantWa)continue;
  if(doPush){let cfg={};try{cfg=dec(await api(env,tok,'/pm_plants/'+code+'/cfg/main'))||{}}catch(e){cfg={}}GM=cfg.gm||{};const cut=addDays(today,p.alertDays==null?7:p.alertDays),tasks=await qry(code,'tasks',{fieldFilter:{field:{fieldPath:'due'},op:'LESS_THAN_OR_EQUAL',value:{stringValue:cut}}},2000),msgs=buildMessages(p,cfg,members,tasks,today,env.APP_URL),deadByMember={};
   try{msgs.push(...buildShutdownDigests(p,cfg,members,await qry(code,'tasks',{fieldFilter:{field:{fieldPath:'cat'},op:'EQUAL',value:{stringValue:'SD'}}},2000),today,env.APP_URL))}catch(e){}
   for(const m of msgs){const r=await sendOne(env,tok,m,env.APP_URL);if(r==='ok')stat.sent++;else if(r==='dead'){stat.dead++;(deadByMember[m.member]=deadByMember[m.member]||[]).push(m.token)}else stat.fail++}
   if(env.PUSH_AT&&!force)await setState(env,tok,code,{push:today});
   for(const id of Object.keys(deadByMember)){const mem=members.find(x=>x.id===id),keep=(mem.tokens||[]).filter(t=>deadByMember[id].indexOf(t)<0);try{await api(env,tok,'/pm_plants/'+code+'/members/'+id+'?updateMask.fieldPaths=tokens',{method:'PATCH',body:JSON.stringify({fields:{tokens:{arrayValue:{values:keep.map(t=>({stringValue:t}))}}}})})}catch(e){}}}
  if(wantWa){try{const cfg=dec(await api(env,tok,'/pm_plants/'+code+'/cfg/main'));GM=cfg.gm||{};if(cfg.wa===true){const state=await getSt(),due=waRecipients(cfg,members,env).filter(r=>force||(inWindow(r.time,cur,win)&&state['w_'+r.m.id]!==today));
   if(due.length){const tasks=await qry(code,'tasks',null,5000),logs=due.some(r=>r.kind==='stats')?await qry(code,'logs',{fieldFilter:{field:{fieldPath:'done'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:today.slice(0,8)+'01'}}},5000):[],stats=buildStats(tasks,logs,today),done={};
    for(const r of due){if(await sendWa(env,waMessage(r,p,stats,tasks,today,env,(cfg&&cfg.cc)||env.WA_CC||'91'))){stat.wa=(stat.wa||0)+1;done['w_'+r.m.id]=today}else stat.waFail=(stat.waFail||0)+1}
    if(!force)await setState(env,tok,code,done)}}}catch(e){stat.waFail=(stat.waFail||0)+1}}}
 return stat}
export default{async scheduled(ev,env,ctx){ctx.waitUntil(run(env))},async fetch(req,env){const u=new URL(req.url);if(u.pathname==='/run'&&env.RUN_KEY&&u.searchParams.get('key')===env.RUN_KEY){try{return new Response(JSON.stringify(await run(env,{force:u.searchParams.get('force')==='1'})),{headers:{'content-type':'application/json'}})}catch(e){return new Response(String(e),{status:500})}}return new Response('PM Tracker alerts worker is running.')}};
