/* Training Hub VFD simulators: PARAMETER SEARCH tab.
   Type a word (e.g. "motor", "ramp", "current") or a parameter number; every matching parameter of the
   simulated drive is listed with its number, name, present value and details (meaning, settings, range, default).
   Usage: VfdSearch.mount(container, api)  api = {list(), val(p), fmt(p,v), mean(p), opts(p), pid(p), lang(), title}
   © 2026 DUKEKRRISH · ourworldhive.com */
(function(){
"use strict";
var T={
 ttl:['Parameter search','पैरामीटर खोज','Parameter search'],
 ph:['Type a word or number: motor, ramp, current, 99.06 …','शब्द या नंबर लिखें: motor, ramp, current, 99.06 …','Word ya number likho: motor, ramp, current, 99.06 …'],
 hint:['Search works on parameter number, name, meaning and setting names. Tap a result for details.','खोज पैरामीटर नंबर, नाम, अर्थ और सेटिंग नामों पर काम करती है। विवरण के लिए परिणाम पर टैप करें।','Search parameter number, naam, matlab aur setting names par kaam karti hai. Details ke liye result par tap karo.'],
 found:['parameters found','पैरामीटर मिले','parameters mile'],none:['No parameter found. Try another word (English names, e.g. "speed", "fault").','कोई पैरामीटर नहीं मिला। दूसरा शब्द आज़माएँ (अंग्रेज़ी नाम, जैसे "speed", "fault")।','Koi parameter nahi mila. Doosra word try karo (English naam, jaise "speed", "fault").'],
 all:['All parameters','सभी पैरामीटर','All parameters'],more:['Showing first {n}. Type more letters to narrow down.','पहले {n} दिखाए गए। और अक्षर लिखकर कम करें।','Pehle {n} dikhaye. Aur letters likh ke kam karo.'],
 present:['Present value','वर्तमान मान','Present value'],range:['Range','सीमा','Range'],def:['Default','डिफ़ॉल्ट','Default'],unit:['Unit','इकाई','Unit'],ro:['Read-only signal','केवल पढ़ने वाला सिग्नल','Read-only signal'],
 sets:['Settings','सेटिंग्स','Settings'],chg:['Changed from default','डिफ़ॉल्ट से बदला','Default se badla'],tab:['Search','खोज','Search'],
 note:['Values shown are the present values in this simulator. Change them on the keypad.','दिखाए गए मान इस सिमुलेटर के वर्तमान मान हैं। कीपैड से बदलें।','Dikhaye gaye values is simulator ki present values hain. Keypad se badlo.']
};
var CHIPS=['motor','speed','frequency','current','ramp','start','stop','reference','fault','voltage','torque','analog','relay','limit'];
function L(api,a){var l=api.lang();return a[l==='hi'?1:l==='hg'?2:0]||a[0]}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function norm(s){return String(s||'').toLowerCase()}
function mount(box,api){
  if(!box)return;
  api.ro=api.ro||function(p){return p.type==='ro'||p.type==='r'};
  api.pid=api.pid||function(p){return p.id};
  api.fmt=api.fmt||function(p,v){var o=api.opts?api.opts(p):p.opts;if(v==null||v==='')return '—';if(typeof v==='string'&&isNaN(+v))return v;
    if(o){for(var i=0;i<o.length;i++)if(String(o[i][0])===String(v))return o[i].slice(1).filter(function(x){return x!==''&&x!=null}).join(' — ')||String(v);return String(v)}
    return (+v).toFixed(p.dec||0)+(p.unit?' '+p.unit:'')};
  var st=document.createElement('style');
  st.textContent='.ps-wrap{grid-column:1/-1;display:flex;flex-direction:column;gap:12px;max-width:900px;width:100%;margin:0 auto}'+
   '.ps-in{width:100%;box-sizing:border-box;background:#1d2226;border:1px solid var(--line,#3f4851);border-radius:10px;color:var(--ink,#e8ecef);font:500 16px var(--f-ui,system-ui);padding:12px 14px}'+
   '.ps-in:focus{outline:2px solid var(--accent,#6fa8dc);outline-offset:1px}'+
   '.ps-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.ps-chips button{appearance:none;background:#1d2226;border:1px solid var(--line,#3f4851);color:var(--ink2,#a9b3bc);border-radius:999px;font:600 12px var(--f-key,system-ui);letter-spacing:.04em;padding:6px 10px;cursor:pointer;text-transform:uppercase}'+
   '.ps-chips button.on{border-color:var(--accent,#6fa8dc);color:#fff;background:#2b4a68}'+
   '.ps-cnt{font:600 12px var(--f-key,system-ui);letter-spacing:.06em;color:var(--ink3,#77828c);text-transform:uppercase}'+
   '.ps-list{display:flex;flex-direction:column;gap:6px}'+
   '.ps-it{background:var(--card,#2b3137);border:1px solid var(--line,#3f4851);border-radius:10px;overflow:hidden}'+
   '.ps-row{appearance:none;width:100%;background:none;border:0;color:inherit;text-align:left;cursor:pointer;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;font:inherit}'+
   '.ps-row b{font:600 13.5px var(--f-mono,monospace);color:var(--seg-on,#ff5b4a);white-space:nowrap}'+
   '.ps-row span{font-size:14px;line-height:1.3;min-width:0}.ps-row i{font-style:normal;font:500 12.5px var(--f-mono,monospace);color:var(--ink2,#a9b3bc);text-align:right;max-width:11em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
   '.ps-row mark{background:#5a4a14;color:#ffeec5;border-radius:2px;padding:0 1px}'+
   '.ps-det{padding:0 12px 12px;border-top:1px dashed var(--line,#3f4851);font-size:13.5px;line-height:1.5}'+
   '.ps-det p{margin:8px 0 0}.ps-det dl{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:8px 0 0;font-size:13px}.ps-det dt{color:var(--ink3,#77828c)}.ps-det dd{margin:0;font-family:var(--f-mono,monospace);font-size:12.5px;overflow-wrap:anywhere}'+
   '.ps-opts{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:2px;font-size:13px}.ps-opts li{display:flex;gap:10px;padding:3px 8px;border-radius:6px}.ps-opts li code{font-family:var(--f-mono,monospace);color:var(--ink2,#a9b3bc);min-width:2.6em}.ps-opts li.cur{background:#3a2422;color:#ffd9d4}'+
   '.ps-tag{display:inline-block;font:600 10.5px var(--f-key,system-ui);letter-spacing:.08em;text-transform:uppercase;border:1px solid #7a5a1d;color:#ffe7b3;border-radius:999px;padding:2px 7px;margin-left:6px;vertical-align:1px}';
  document.head.appendChild(st);
  box.innerHTML='<div class="ps-wrap"><div class="card"><h3 class="ps-t"></h3><input class="ps-in" type="search" autocomplete="off" spellcheck="false"><div class="ps-chips"></div><p class="note ps-h" style="margin:10px 0 0"></p></div><div class="ps-cnt"></div><div class="ps-list"></div><p class="note ps-n"></p></div>';
  var inp=box.querySelector('.ps-in'),list=box.querySelector('.ps-list'),cnt=box.querySelector('.ps-cnt'),chips=box.querySelector('.ps-chips');
  var open={},MAX=80;
  function optsOf(p){var o=api.opts?api.opts(p):p.opts;return o||null}
  function optLabel(o){return o.slice(1).filter(function(x){return x!==''&&x!=null}).join(' — ')}
  function hay(p){
    var o=optsOf(p),s=[api.pid(p),p.id,p.name,api.mean(p,'en'),api.mean(p)];
    if(o)o.forEach(function(x){s.push(optLabel(x))});
    return norm(s.join(' | '));
  }
  function hl(txt,q){txt=esc(txt);if(!q)return txt;var i=txt.toLowerCase().indexOf(q);return i<0?txt:txt.slice(0,i)+'<mark>'+txt.slice(i,i+q.length)+'</mark>'+txt.slice(i+q.length)}
  function details(p){
    var v=api.val(p),o=optsOf(p),h='<div class="ps-det"><p>'+esc(api.mean(p)||'')+'</p>';
    if(o&&o.length)h+='<div class="sub" style="margin-top:10px">'+esc(L(api,T.sets))+'</div><ul class="ps-opts">'+o.map(function(x){return '<li class="'+(String(x[0])===String(v)?'cur':'')+'"><code>'+esc(x[0])+'</code><span>'+esc(optLabel(x))+'</span></li>'}).join('')+'</ul>';
    h+='<dl><dt>'+esc(L(api,T.present))+'</dt><dd>'+esc(api.fmt(p,v))+'</dd>';
    if(api.ro(p))h+='<dt></dt><dd>'+esc(L(api,T.ro))+'</dd>';
    else{if(p.min!=null&&p.max!=null)h+='<dt>'+esc(L(api,T.range))+'</dt><dd>'+esc(p.min+' … '+p.max+(p.unit?' '+p.unit:''))+'</dd>';
      if(p.def!=null)h+='<dt>'+esc(L(api,T.def))+'</dt><dd>'+esc(api.fmt(p,p.def))+'</dd>';}
    return h+'</dl></div>';
  }
  function render(){
    var q=norm(inp.value).trim(),all=api.list(),res=[];
    if(!q)res=all.slice();
    else{var qs=q.replace(/[\s.\-]/g,'');
      all.forEach(function(p){var idn=norm(api.pid(p)).replace(/[\s.\-]/g,'');var sc=idn===qs?0:idn.indexOf(qs)===0?1:norm(p.name).indexOf(q)>=0?2:hay(p).indexOf(q)>=0?3:-1;if(sc>=0)res.push([sc,p])});
      res.sort(function(a,b){return a[0]-b[0]});res=res.map(function(x){return x[1]})}
    cnt.textContent=(q?res.length+' '+L(api,T.found):L(api,T.all)+' · '+res.length);
    var show=res.slice(0,MAX);
    list.innerHTML=show.map(function(p){var v=api.val(p),chg=!api.ro(p)&&p.def!=null&&String(v)!==String(p.def);
      return '<div class="ps-it"><button class="ps-row" data-id="'+esc(p.id)+'" aria-expanded="'+(open[p.id]?'true':'false')+'"><b>'+hl(api.pid(p),q)+'</b><span>'+hl(p.name,q)+(chg?'<span class="ps-tag">'+esc(L(api,T.chg))+'</span>':'')+'</span><i>'+esc(api.fmt(p,v))+'</i></button>'+(open[p.id]?details(p):'')+'</div>'}).join('')+
      (res.length>MAX?'<p class="note">'+esc(L(api,T.more).replace('{n}',MAX))+'</p>':'')+(q&&!res.length?'<p class="empty">'+esc(L(api,T.none))+'</p>':'');
  }
  list.addEventListener('click',function(e){var b=e.target.closest('.ps-row');if(!b)return;var id=b.getAttribute('data-id');open[id]=!open[id];render()});
  inp.addEventListener('input',function(){chips.querySelectorAll('button').forEach(function(c){c.classList.toggle('on',c.textContent.toLowerCase()===norm(inp.value).trim())});render()});
  chips.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var w=b.getAttribute('data-w');inp.value=inp.value.trim().toLowerCase()===w?'':w;inp.dispatchEvent(new Event('input'))});
  function texts(){box.querySelector('.ps-t').textContent=L(api,T.ttl)+(api.title?' · '+api.title:'');inp.placeholder=L(api,T.ph);box.querySelector('.ps-h').textContent=L(api,T.hint);box.querySelector('.ps-n').textContent=L(api,T.note);
    chips.innerHTML=CHIPS.map(function(c){return '<button data-w="'+c+'">'+c+'</button>'}).join('');var tb=document.getElementById('psTabL');if(tb)tb.textContent=L(api,T.tab);render()}
  var ls=document.getElementById('lang');if(ls)ls.addEventListener('change',function(){setTimeout(texts,0)});
  texts();
  return {refresh:render};
}
window.VfdSearch={mount:mount};
})();
