/* Shared prices and discounts for the Ourworldhive tools (PM Tracker and Project Planner).
   One public Firestore document, pp_config/pricing, holds everything. The owner edits it inside either tool.
   Every screen that shows a price reads it from here, so a change appears everywhere on its own. */
(function(){
var CURS=[['INR','₹','India'],['USD','$','USA and rest of the world'],['EUR','€','Europe'],['GBP','£','United Kingdom'],['AED','AED ','UAE'],['SGD','S$','Singapore'],['AUD','A$','Australia'],['CAD','C$','Canada']];
var PLANS=[['m1','1 month',1],['m3','3 months',3],['m12','12 months',12],['perm','Permanent access',0]];
var TOOLS=[['pm','PM Tracker'],['pp','Project Planner']];
var DEF={
 pm:{INR:{m1:199,m3:549,m12:1499,perm:1999},USD:{m1:5,m3:14,m12:37,perm:49},EUR:{m1:4.5,m3:12.9,m12:34,perm:45},GBP:{m1:3.9,m3:10.9,m12:29,perm:39},AED:{m1:19,m3:52,m12:139,perm:179},SGD:{m1:6.5,m3:17.9,m12:49,perm:65},AUD:{m1:7.5,m3:20,m12:55,perm:75},CAD:{m1:7,m3:19,m12:50,perm:65}},
 pp:{INR:{m1:499,m3:1399,m12:4499,perm:5999},USD:{m1:9,m3:25,m12:79,perm:99},EUR:{m1:8,m3:23,m12:72,perm:92},GBP:{m1:7,m3:20,m12:63,perm:79},AED:{m1:33,m3:92,m12:290,perm:365},SGD:{m1:12,m3:33,m12:105,perm:130},AUD:{m1:14,m3:39,m12:120,perm:150},CAD:{m1:13,m3:36,m12:110,perm:140}}};
var P={cfg:fresh(),loaded:false,CURS:CURS,PLANS:PLANS,TOOLS:TOOLS,DEF:DEF};
function clone(o){return JSON.parse(JSON.stringify(o))}
function fresh(){return{prices:clone(DEF),disc:{pm:{pct:0,label:'',until:''},pp:{pct:0,label:'',until:''}},upi:'',paypal:''}}
function merge(j){var c=fresh();if(!j||typeof j!=='object')return c;
 TOOLS.forEach(function(t){var k=t[0];CURS.forEach(function(u){var s=j.prices&&j.prices[k]&&j.prices[k][u[0]];if(s)PLANS.forEach(function(p){var v=+s[p[0]];if(isFinite(v)&&v>=0)c.prices[k][u[0]][p[0]]=v});});
  var d=j.disc&&j.disc[k];if(d){var pc=Math.max(0,Math.min(95,+d.pct||0));c.disc[k]={pct:pc,label:String(d.label||'').slice(0,60),until:/^\d{4}-\d{2}-\d{2}$/.test(d.until||'')?d.until:''}}});
 c.upi=String(j.upi||'').slice(0,80);c.paypal=String(j.paypal||'').slice(0,200);return c}
function today(){var d=new Date(),p=function(n){return('0'+n).slice(-2)};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
P.guessCur=function(){try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'',lg=(navigator.language||'').toUpperCase();if(/^Asia\/(Kolkata|Calcutta)$/.test(tz)||/-IN$/.test(lg))return'INR';if(tz==='Europe/London')return'GBP';if(/^Europe\//.test(tz))return'EUR';if(tz==='Asia/Dubai')return'AED';if(tz==='Asia/Singapore')return'SGD';if(/^Australia\//.test(tz))return'AUD';if(/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Montreal|Regina|St_Johns)$/.test(tz))return'CAD'}catch(e){}return'USD'};
P.disc=function(t){var d=P.cfg.disc[t]||{pct:0,label:'',until:''};var on=d.pct>0&&(!d.until||d.until>=today());return{pct:d.pct,label:d.label,until:d.until,active:on}};
P.base=function(t,cur,plan){var r=(P.cfg.prices[t]||{})[cur]||DEF[t][cur]||DEF[t].USD;return r[plan]};
P.final=function(t,cur,plan){var b=P.base(t,cur,plan),d=P.disc(t);if(!d.active)return b;var v=b*(100-d.pct)/100;return cur==='INR'?Math.round(v):Math.round(v*100)/100};
P.fmt=function(cur,v){var s=(CURS.filter(function(x){return x[0]===cur})[0]||[0,'$'])[1];var t=cur==='INR'?Math.round(v).toLocaleString('en-IN'):(Math.abs(v-Math.round(v))<1e-9?String(Math.round(v)):v.toFixed(2));return s+t};
P.money=function(t,cur,plan){return P.fmt(cur,P.final(t,cur,plan))};
P.untilText=function(u){if(!u)return'';var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],a=u.split('-');return a[2]*1+' '+m[a[1]-1]+' '+a[0]};
P.discText=function(t){var d=P.disc(t);return d.active?(d.pct+'% off'+(d.label?': '+d.label:'')+(d.until?', till '+P.untilText(d.until):'')):''};
P.line=function(t,cur){cur=cur||P.guessCur();var d=P.disc(t),s='Free for 30 days. Then '+P.money(t,cur,'m1')+' a month, or '+P.money(t,cur,'perm')+' once for permanent access.';return d.active?s+' '+P.discText(t)+'.':s};
P.tag=function(t,cur){cur=cur||P.guessCur();var d=P.disc(t),s='Free for 30 days, then '+P.money(t,cur,'m1')+' a month';return d.active?s+'. '+P.discText(t):s};
function changed(){try{window.dispatchEvent(new CustomEvent('owh-price'))}catch(e){}}
P.set=function(j){P.cfg=merge(j);P.loaded=true;changed()};
P.load=function(force){if(P._p&&!force)return P._p;var f=window.OWH_FIREBASE;
 if(!f||!f.projectId||!f.apiKey||!window.fetch){P._p=Promise.resolve(P.cfg);return P._p}
 P._p=fetch('https://firestore.googleapis.com/v1/projects/'+f.projectId+'/databases/(default)/documents/pp_config/pricing?key='+f.apiKey,{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(d){var s=d&&d.fields&&d.fields.json&&d.fields.json.stringValue;if(s){try{P.set(JSON.parse(s))}catch(e){}}return P.cfg}).catch(function(){return P.cfg});return P._p};
/* ---------- owner editor ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
P.editor=function(el,o){o=o||{};var W=merge(clone(P.cfg)),tool=o.tool||'pp',cur=P.guessCur();
 function draw(){var pr=W.prices[tool][cur],d=W.disc[tool],h='<div style="display:grid;gap:8px">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap">'+(o.lock?'<b style="align-self:center">'+esc(TOOLS.filter(function(t){return t[0]===tool})[0][1])+'</b>':'<select id="owhp_t" aria-label="Tool">'+TOOLS.map(function(t){return'<option value="'+t[0]+'"'+(t[0]===tool?' selected':'')+'>'+t[1]+'</option>'}).join('')+'</select>')+'<select id="owhp_c" aria-label="Currency">'+CURS.map(function(u){return'<option value="'+u[0]+'"'+(u[0]===cur?' selected':'')+'>'+esc(u[1].trim())+' '+esc(u[2])+'</option>'}).join('')+'</select></div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+PLANS.map(function(p){return'<label style="display:block;font-size:12.5px">'+p[1]+' price<input type="number" min="0" step="any" data-pl="'+p[0]+'" value="'+pr[p[0]]+'" style="width:100%"></label>'}).join('')+'</div>';
  h+='<div style="border-top:1px solid #8884;padding-top:8px;font-weight:700">Discount on '+esc(TOOLS.filter(function(t){return t[0]===tool})[0][1])+' (all currencies)</div><div style="display:grid;grid-template-columns:1fr 2fr;gap:8px"><label style="font-size:12.5px">Percent off<input type="number" id="owhp_pc" min="0" max="95" step="1" value="'+d.pct+'" style="width:100%"></label><label style="font-size:12.5px">Name (shown to people)<input type="text" id="owhp_lb" maxlength="60" placeholder="Diwali offer" value="'+esc(d.label)+'" style="width:100%"></label></div><label style="font-size:12.5px">Last day of the offer (empty = until you remove it)<input type="date" id="owhp_un" value="'+esc(d.until)+'" style="width:100%"></label>';
  h+='<div style="border-top:1px solid #8884;padding-top:8px;font-weight:700">Payment details (both tools)</div><input type="text" id="owhp_upi" placeholder="UPI ID, for example name@bank" value="'+esc(W.upi)+'"><input type="text" id="owhp_pp" placeholder="PayPal link, for example https://paypal.me/yourname" value="'+esc(W.paypal)+'">';
  h+='<div id="owhp_pv" style="font-size:13px;padding:8px 10px;border-radius:10px;background:#8881"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="owhp_sv" type="button">Save prices</button><button class="btn" id="owhp_rs" type="button">Reset this currency</button></div><div id="owhp_ms" style="font-size:12.5px"></div></div>';
  el.innerHTML=h;
  function pull(){PLANS.forEach(function(p){var i=el.querySelector('[data-pl="'+p[0]+'"]');if(i){var v=+i.value;W.prices[tool][cur][p[0]]=isFinite(v)&&v>=0?v:0}});
   W.disc[tool]={pct:Math.max(0,Math.min(95,+el.querySelector('#owhp_pc').value||0)),label:el.querySelector('#owhp_lb').value.trim(),until:el.querySelector('#owhp_un').value||''};W.upi=el.querySelector('#owhp_upi').value.trim();W.paypal=el.querySelector('#owhp_pp').value.trim()}
  function pv(){pull();var save=P.cfg;P.cfg=W;var dd=P.disc(tool);var t=PLANS.map(function(p){return p[1]+': '+(dd.active?'<s>'+P.fmt(cur,P.base(tool,cur,p[0]))+'</s> ':'')+'<b>'+P.money(tool,cur,p[0])+'</b>'}).join(' &nbsp;|&nbsp; ');P.cfg=save;el.querySelector('#owhp_pv').innerHTML='People will see: '+t+(dd.active?'<br>'+esc(dd.pct+'% off'+(dd.label?': '+dd.label:'')+(dd.until?', till '+P.untilText(dd.until):'')):'<br>No discount is running.')}
  el.querySelectorAll('input').forEach(function(i){i.addEventListener('input',pv)});pv();
  if(el.querySelector('#owhp_t'))el.querySelector('#owhp_t').onchange=function(e){pull();tool=e.target.value;draw()};el.querySelector('#owhp_c').onchange=function(e){pull();cur=e.target.value;draw()};
  el.querySelector('#owhp_rs').onclick=function(){W.prices[tool][cur]=clone(DEF[tool][cur]);draw()};
  el.querySelector('#owhp_sv').onclick=function(){pull();var s=JSON.stringify(W),ms=el.querySelector('#owhp_ms');ms.textContent='Saving...';Promise.resolve(o.save?o.save(s):null).then(function(){P.set(JSON.parse(s));ms.textContent='Saved. The new prices are live on the marketplace and in both tools.'}).catch(function(e){ms.textContent='Could not save: '+(e&&e.message||e)+'. Publish the newest Firestore rules and sign in as the owner.'})}}
 draw()};
window.OWH_PRICE=P;P.load();
})();
