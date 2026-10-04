
(function(){
var C=window.OWH_FIREBASE||null; if(!C) return;
var BASE='https://firestore.googleapis.com/v1/projects/'+C.projectId+'/databases/(default)/documents', KEY='?key='+encodeURIComponent(C.apiKey);
function dec(v){ if(!v) return null; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return +v.integerValue; if('doubleValue' in v) return v.doubleValue; if('booleanValue' in v) return v.booleanValue; if('timestampValue' in v) return Date.parse(v.timestampValue);
  if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); if('mapValue' in v){ var o={}, f=v.mapValue.fields||{}; for(var k in f) o[k]=dec(f[k]); return o; } return null; }
function decDoc(d){ var o={id:d.name.split('/').pop()}, f=d.fields||{}; for(var k in f) o[k]=dec(f[k]); return o; }
var MC={};
var API={
  query:function(coll,field,val,field2,val2){
    function ff(f,v){ return {fieldFilter:{field:{fieldPath:f},op:'EQUAL',value:typeof v==='boolean'?{booleanValue:v}:{stringValue:String(v)}}}; }
    var sq={from:[{collectionId:coll}],limit:200}; if(field) sq.where=field2?{compositeFilter:{op:'AND',filters:[ff(field,val),ff(field2,val2)]}}:ff(field,val);
    return fetch(BASE+':runQuery'+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:sq})}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }).then(function(a){ return a.filter(function(x){ return x.document; }).map(function(x){ return decDoc(x.document); }); });
  },
  get:function(path){ return fetch(BASE+'/'+path+KEY).then(function(r){ if(r.status===404) return null; if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }).then(function(d){ return d?decDoc(d):null; }); },
  media:function(id){ if(!id) return Promise.resolve(''); if(!MC[id]) MC[id]=API.get('media/'+encodeURIComponent(id)).then(function(d){ return d&&d.data||''; }).catch(function(){ delete MC[id]; return ''; }); return MC[id]; }
};
window.OWHAPI=API;
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }
var AMZ_TAG='ourworldhive-21';
function withTag(u){ u=String(u||'').trim(); if(!/^https?:\/\/([a-z0-9-]+\.)*amazon\.[a-z.]+\//i.test(u)) return u; try{ var x=new URL(u); if(!x.searchParams.get('tag')) x.searchParams.set('tag',window.OWH_AMZ_TAG||AMZ_TAG); return x.toString(); }catch(e){ return u; } }
function relFor(u){ return /^https?:\/\/([^\/]*\.)?(amazon\.|amzn\.|flipkart\.)/i.test(String(u||''))?'noopener sponsored':'noopener'; }
function safeUrl(u){ u=String(u||'').trim(); if(!u) return '#'; if(/^(https?:|mailto:|tel:)/i.test(u)) return u; if(/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#'; return u; }
function ytId(u){ var m=/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/.exec(String(u||'')); return m?m[1]:''; }
window.OWHRender=function(blocks,el,mediaFn){
  mediaFn=mediaFn||API.media; var h='';
  (blocks||[]).forEach(function(b,i){
    if(!b) return;
    if(b.t==='h') h+=(b.l===3?'<h3>':'<h2>')+esc(b.x)+(b.l===3?'</h3>':'</h2>');
    else if(b.t==='p') h+='<p>'+esc(b.x)+'</p>';
    else if(b.t==='img') h+='<figure>'+(b.u?'<a href="'+esc(safeUrl(b.u))+'" target="_blank" rel="noopener">':'')+'<img alt="'+esc(b.c||'')+'" data-m="'+esc(b.m||'')+'" loading="lazy">'+(b.u?'</a>':'')+(b.c?'<figcaption>'+esc(b.c)+'</figcaption>':'')+'</figure>';
    else if(b.t==='grid') h+='<div class="rgrid">'+(b.m||[]).map(function(m){ return '<img alt="" data-m="'+esc(m)+'" loading="lazy">'; }).join('')+'</div>';
    else if(b.t==='btn') h+='<div class="rbtn"><a class="'+(b.s==='s'?'':'pri')+'" href="'+esc(withTag(safeUrl(b.u)))+'"'+(b.n?' target="_blank"':'')+' rel="'+relFor(b.u)+'">'+esc(b.x||'Open')+'</a></div>';
    else if(b.t==='link') h+='<p class="rlink"><a href="'+esc(withTag(safeUrl(b.u)))+'"'+(b.n?' target="_blank"':'')+' rel="'+relFor(b.u)+'">'+esc(b.x||b.u)+'</a></p>';
    else if(b.t==='q') h+='<blockquote>'+esc(b.x)+(b.a?'<cite>'+esc(b.a)+'</cite>':'')+'</blockquote>';
    else if(b.t==='hr') h+='<hr>';
    else if(b.t==='yt'){ var id=ytId(b.u); if(id) h+='<div class="ryt"><iframe src="https://www.youtube-nocookie.com/embed/'+id+'" title="Video" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'; }
  });
  el.innerHTML=h;
  Array.prototype.forEach.call(el.querySelectorAll('img[data-m]'),function(im){ var id=im.getAttribute('data-m'); if(!id) return; Promise.resolve(mediaFn(id)).then(function(src){ if(src) im.src=src; else im.style.display='none'; }); });
};
window.OWHFmtDate=function(ms){ return ms?new Date(ms).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):''; };
window.OWHCard=function(p,i){ return '<a class="pc" href="p.html?s='+encodeURIComponent(p.slug)+'"><img class="ph" alt="" data-m="'+esc(p.cover||'')+'"'+(p.cover?'':' style="display:none"')+'><span class="tb"><b>'+esc(p.title)+'</b>'+(p.summary?'<p>'+esc(p.summary)+'</p>':'')+'<small>'+esc(window.OWHFmtDate(p.created))+'</small></span></a>'; };
window.OWHFillImages=function(root){ Array.prototype.forEach.call(root.querySelectorAll('img[data-m]'),function(im){ var id=im.getAttribute('data-m'); if(!id||im.src) return; API.media(id).then(function(src){ if(src) im.src=src; else im.style.display='none'; }); }); };

/* site settings chosen in the Control panel: header buttons, banner, social links, contact email */
function applyCfg(d){
  if(!d) return;
  if(d.amazonTag) window.OWH_AMZ_TAG=String(d.amazonTag).trim();
  var l=[]; try{ l=JSON.parse(d.menu||'[]'); }catch(e){}
  var ul=document.querySelector('.sx-nav');
  if(ul&&Array.isArray(l)) l.forEach(function(m){ if(!m||!m.label||!m.url||ul.querySelector('[data-x="'+esc(m.label)+'"]')) return; var li=document.createElement('li'), a=document.createElement('a'); a.textContent=m.label; a.href=safeUrl(m.url); a.setAttribute('data-x',m.label); if(m.n){ a.target='_blank'; a.rel=relFor(m.url); } li.appendChild(a); ul.appendChild(li); });
  var hd=document.querySelector('.sx-head');
  if(d.bannerOn&&d.banner&&hd&&!hd.classList.contains('fixed')&&!document.querySelector('.sx-banner')){
    var st=document.createElement('style'); st.textContent='.sx-banner{background:linear-gradient(90deg,#ffc857,#ff9f5a);color:#1a1030;text-align:center;font:600 14.5px/1.4 Figtree,system-ui,sans-serif;padding:9px 14px}.sx-banner a{color:#1a1030;text-decoration:underline;margin-left:8px}'; document.head.appendChild(st);
    var b=document.createElement('div'); b.className='sx-banner'; b.setAttribute('role','status'); b.textContent=d.banner; if(d.bannerUrl){ var a2=document.createElement('a'); a2.href=safeUrl(d.bannerUrl); a2.textContent='Learn more'; b.appendChild(a2); } hd.parentNode.insertBefore(b,hd.nextSibling);
  }
  var soc=[]; try{ soc=JSON.parse(d.social||'[]'); }catch(e){}
  var fb=document.querySelector('.sx-fbrand'); if(fb&&soc.length&&!fb.querySelector('.sx-social')){ var p=document.createElement('p'); p.className='sx-social'; p.style.cssText='display:flex;gap:14px;flex-wrap:wrap;margin-top:12px'; soc.forEach(function(s){ if(!s||!s.label||!s.url) return; var a=document.createElement('a'); a.href=safeUrl(s.url); a.textContent=s.label; a.target='_blank'; a.rel='noopener'; p.appendChild(a); }); fb.appendChild(p); }
  if(d.contact&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(d.contact)) Array.prototype.forEach.call(document.querySelectorAll('[data-owh-contact]'),function(e){ e.textContent='Email us at '; var a=document.createElement('a'); a.href='mailto:'+d.contact; a.textContent=d.contact; e.appendChild(a); e.appendChild(document.createTextNode('.')); });
}
var cached=null; try{ cached=JSON.parse(sessionStorage.getItem('owh_cfg')||'null'); }catch(e){}
if(cached&&Date.now()-cached.t<300000) applyCfg(cached.d);
else API.get('config/site').then(function(d){ try{ sessionStorage.setItem('owh_cfg',JSON.stringify({t:Date.now(),d:d||{}})); }catch(e){} applyCfg(d); }).catch(function(){});
})();
