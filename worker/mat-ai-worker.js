// Material Tracker AI scan: reads a photo of a SAP list with Cloudflare Workers AI (free daily allowance is shared with your other Workers AI use).
// Setup (Cloudflare dashboard): Workers > Create > paste this file > Settings > Bindings > Add > Workers AI, variable name AI > Deploy.
// Then copy the worker address (https://NAME.YOURNAME.workers.dev) into Material Tracker > More > AI scan.
// The first time you may have to accept the Llama vision licence: run once in the Workers AI playground with the model below.
// NOT TESTED against the live service yet. If the model name changes, only MODEL needs editing.
const MODEL='@cf/meta/llama-3.2-11b-vision-instruct';
const ORIGIN='https://ourworldhive.com';
const PROMPT='This is a photo of a SAP "List Display of Purchase Requisitions" screen. Return ONLY a JSON array. One object per table row with keys: plant, chDt, mat, req, reqDt, org, dt, pr, txt, qty, un, val, trk, pgr, po, poDt. Dates as dd.mm.yyyy. qty and val as numbers without commas. Use "" for blank cells. pr is the 10 digit Purch.Req. number, mat is the 8 digit Material, txt is the Short Text.';
const cors=o=>({'access-control-allow-origin':o,'access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS','vary':'origin'});
export default{async fetch(req,env){const o=req.headers.get('origin')||'';const h=cors(o===ORIGIN||o.startsWith('http://localhost')?o:ORIGIN);
 if(req.method==='OPTIONS')return new Response(null,{headers:h});
 if(req.method!=='POST'||(o&&o!==ORIGIN&&!o.startsWith('http://localhost')))return new Response('no',{status:403,headers:h});
 try{const{image}=await req.json();if(!image||image.length>4e6)return new Response(JSON.stringify({rows:[]}),{status:400,headers:{...h,'content-type':'application/json'}});
  const r=await env.AI.run(MODEL,{messages:[{role:'user',content:[{type:'text',text:PROMPT},{type:'image_url',image_url:{url:image}}]}],max_tokens:3500});
  let t=String(r.response||r.result||'');const a=t.indexOf('['),b=t.lastIndexOf(']');let rows=[];try{rows=JSON.parse(t.slice(a,b+1))}catch(e){}
  return new Response(JSON.stringify({rows:Array.isArray(rows)?rows:[]}),{headers:{...h,'content-type':'application/json'}})}
 catch(e){return new Response(JSON.stringify({rows:[],error:'ai'}),{status:500,headers:{...h,'content-type':'application/json'}})}}}
