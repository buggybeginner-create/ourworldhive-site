/* Material Tracker. Copyright DUKEKRRISH. All rights reserved. */
(function(){
'use strict';
const $=id=>document.getElementById(id),VER='10 Nov 2026 a';
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const hash=s=>{let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^a>>>16,2246822507)^Math.imul(b^b>>>13,3266489909);b=Math.imul(b^b>>>16,2246822507)^Math.imul(a^a>>>13,3266489909);return(4294967296*(2097151&b)+(a>>>0)).toString(36)};
const num=s=>{const v=parseFloat(String(s==null?'':s).replace(/,/g,''));return isFinite(v)?v:0};
const fmt=v=>v===''||v==null||!isFinite(+v)?'':(+v).toLocaleString('en-US',{maximumFractionDigits:2});
const STS=['Pending','Ordered','Received','Closed'];
/* columns: u = filled by you, the rest come from SAP */
const COLS=[['mat','Material'],['pr','PR No.'],['txt','Short Text'],['qty','Qty','n'],['un','Unit'],['val','Total Value','n'],['po','PO'],['poDt','PO Date'],['recv','Received','n','u'],['zamt','Z Amount','n','u'],['resp','Responsibility','','u'],['st','Status','','u'],['due','Due Date','','u'],['rem','Remarks','','u'],['reqDt','Req. Date'],['plant','Plant'],['pgr','PGr'],['trk','Tracking No.'],['dt','Doc Type']];
const FKEYS=['mat','pr','txt','qty','un','val','po','poDt','recv','recvDt','zamt','resp','st','due','rem','reqDt','chDt','plant','pgr','trk','dt','org','item','rel','req'];
const SAPK=['mat','pr','txt','qty','un','val','po','poDt','reqDt','chDt','plant','pgr','trk','dt','org','item','rel','req'];
let ROWS=LS.get('owh_mt_rows',[]),VIEW=LS.get('owh_mt_view','table'),FL={st:'All',rf:'',q:'',so:'req'},SORT=null;
const live=()=>ROWS.filter(r=>!r.del);
const save=()=>LS.set('owh_mt_rows',ROWS);
const keyOf=r=>r.pr?(r.pr+'|'+(r.mat||String(r.txt||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24))):'m'+uid();
const eff=r=>r.st||(num(r.recv)>0&&num(r.recv)>=num(r.qty)?'Received':(r.po?'Ordered':'Pending'));
const today=()=>new Date().toISOString().slice(0,10);
const isOver=r=>r.due&&r.due<today()&&!['Received','Closed'].includes(eff(r));
const dmy=s=>{const m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s||'');return m?m[3]+m[2]+m[1]:''};
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2400)}

/* ---------- reading SAP text ---------- */
const DT=/\b\d{2}\.\d{2}\.\d{4}\b/g,MONEY=/(?<![\d.,])\d{1,3}(?:,\d{3})*\.\d{2}(?![\d.])/g,UNITS='EA|AU|M|KG|NOS|ST|PC|PCS|SET|LTR|L|MT|ROL|BOX|LOT|PAC|PAA|G|KL';
const clean=l=>l.replace(/[|¦\[\]—_=~{}]/g,' ').replace(/[\t ]+/g,' ').trim();
const fixDigits=l=>l.replace(/\b[0-9OolISB]{8,12}\b/g,t=>{const d=(t.match(/\d/g)||[]).length;return d>=t.length*.6?t.replace(/[Oo]/g,'0').replace(/[lI]/g,'1').replace(/S/g,'5').replace(/B/g,'8'):t});
function parseList(text){const out=[];
 String(text||'').split(/\r?\n/).forEach(raw=>{let l=fixDigits(clean(raw));if(l.length<25)return;
  const pr=l.match(/\b(1[12]\d{8})\b/);if(!pr)return;
  if(((l.match(DT)||[]).length+(l.match(MONEY)||[]).length+(new RegExp('\\b('+UNITS+')\\b').test(l)?1:0))<2)return;
  const before=l.slice(0,pr.index),a0=l.slice(pr.index+10).trim(),r={pr:pr[1]};
  const ds=before.match(DT)||[];r.chDt=ds[0]||'';r.reqDt=ds[1]||'';
  const pl=before.match(/\bP[0OD]{2}[0-9S]\b/);r.plant=pl?'P00'+pl[0].slice(-1).replace('S','5'):'';
  const ot=before.match(/\b(\d{4})\s+[Z2](MAT|SER)\b/)||before.match(/\b[Z2](MAT|SER)\b/);
  if(ot){const o=/^(\d{4})/.exec(ot[0]);if(o)r.org=o[1]}
  r.dt=pr[1].slice(0,2)==='11'?'ZMAT':'ZSER';
  let a=a0;const mt=a.match(/^(1\d{7}|\d{8})\b/);if(mt){r.mat=mt[1];a=a.slice(8).trim()}
  const po=a.match(/\b(5[13]\d{8})\b/);if(po){r.po=po[1];const k=a.indexOf(po[1]);const pd=a.slice(k+10).match(DT);r.poDt=pd?pd[0]:''}
  const tk=a.match(/\b(89\d{8})\b/);if(tk)r.trk=tk[1];
  const pg=a.match(/\bP0\d\b/);if(pg)r.pgr=pg[0];
  const mv=a.match(MONEY)||[];
  const qu=new RegExp('(?:^|\\s)(\\d[\\d,]*)\\s*('+UNITS+')\\b').exec(a);
  let txt=a;
  if(qu){r.qty=num(qu[1]);r.un=qu[2];txt=a.slice(0,qu.index)}
  else{const u2=new RegExp('\\b('+UNITS.split('|').slice(0,2).join('|')+')\\b').exec(a);if(u2){r.un=u2[1];txt=a.slice(0,u2.index)}else{const m2=a.search(MONEY);if(m2>0)txt=a.slice(0,m2)}}
  if(mv.length)r.val=num(mv[0]);
  txt=txt.replace(/[^A-Za-z0-9 .,()\/\-+&"'#%*:]/g,' ').replace(/\s+/g,' ').replace(/^[^A-Za-z0-9"]+/,'').trim();
  r.txt=txt;r.chk=!(r.qty&&r.val!=null&&r.txt.length>2);
  if(!mv.length&&r.val==null)r.val='';
  out.push(r)});
 return out}
function parseDetail(text){const t=String(text||''),out=[];
 const h=/Purchase\s+Req\.?\s*(1[12]\d{8})/i.exec(t)||/\b(1[12]\d{8})\b/.exec(t);if(!h)return out;
 const lines=t.split(/\r?\n/).map(clean);
 let rel=[],on=false;for(const l of lines){if(/Release\s+Strategy/i.test(l)){on=true}if(/Release\s+Indicator/i.test(l))on=false;if(on&&/[A-Z]{2}\s+[A-Z]{3,}/.test(l)&&!/Release\s+(group|Strategy)/i.test(l))rel.push(l.replace(/\s+/g,' '))}
 for(const raw of lines){const l=fixDigits(raw);
  const m=new RegExp('(?:^|\\s)(\\d{1,5})\\s+(\\d{8})\\s+(.+?)\\s+(\\d[\\d,]*)\\s*('+UNITS+')\\s+('+MONEY.source+')?\\s*('+MONEY.source+')?').exec(l);
  if(!m)continue;
  const r={pr:h[1],item:m[1],mat:m[2],txt:m[3].replace(/[^A-Za-z0-9 .,()\/\-+&"']/g,' ').replace(/\s+/g,' ').trim(),qty:num(m[4]),un:m[5],dt:h[1].slice(0,2)==='11'?'ZMAT':'ZSER'};
  const mo=l.slice(m.index).match(MONEY)||[];if(mo.length)r.val=num(mo[mo.length-1]);
  const d=l.match(DT);if(d)r.reqDt=d[d.length-1];const pl=l.match(/\bP0\d\d\b/);if(pl)r.plant=pl[0];const pg=l.match(/\bP0\d\b/);if(pg)r.pgr=pg[0];
  const tk=l.match(/\b89\d{8}\b/);if(tk)r.trk=tk[0];const rq=l.match(/\bK\.?\s?[A-Z]{3,}\b/);if(rq)r.req=rq[0].replace(/\s/g,'');
  if(rel.length)r.rel=rel.join(' | ').slice(0,300);
  r.chk=!(r.qty&&r.txt.length>2);out.push(r);break}
 if(!out.length){const m=/\b(1[79]\d{6})\b/.exec(t);out.push({pr:h[1],mat:m?m[1]:undefined,txt:'',dt:h[1].slice(0,2)==='11'?'ZMAT':'ZSER',rel:rel.length?rel.join(' | ').slice(0,300):undefined,chk:true})}
 return out}
function readText(text){let r=parseList(text);if(!r.length)r=parseDetail(text);return r}

/* ---------- list actions ---------- */
function upsert(rows){let added=0,updated=0;const now=Date.now();
 rows.forEach(n=>{const k=keyOf(n),id='r'+hash(k),ex=ROWS.find(x=>x.id===id);
  if(ex){SAPK.forEach(f=>{if(n[f]!==undefined&&n[f]!==''&&n[f]!==null)ex[f]=n[f]});ex.del=false;ex.upd=now;updated++}
  else{const r={id,upd:now,ts:now};FKEYS.forEach(f=>{if(n[f]!==undefined&&n[f]!=='')r[f]=n[f]});ROWS.push(r);added++}});
 save();cloudSoon();return{added,updated}}
function visible(){let L=live();const q=FL.q.trim().toLowerCase();
 if(FL.st!=='All')L=L.filter(r=>FL.st==='Overdue'?isOver(r):eff(r)===FL.st);
 if(FL.rf)L=L.filter(r=>(r.resp||'')===FL.rf);
 if(q)L=L.filter(r=>FKEYS.some(k=>String(r[k]==null?'':r[k]).toLowerCase().includes(q)));
 const s=SORT||{k:FL.so,d:-1},k=s.k;const val=r=>k==='req'?dmy(r.reqDt):k==='po'?dmy(r.poDt):k==='val'?num(r.val):k==='due'?(r.due||'9'):k==='st'?STS.indexOf(eff(r)):k==='mat'?String(r.mat||r.txt||''):(r[k]||'');
 const dir=s.d||-1;return L.sort((a,b)=>{const x=val(a),y=val(b);return(x>y?1:x<y?-1:0)*(SORT?dir:(k==='mat'||k==='due'?1:-1))})}
function drawFilters(){const L=live(),cnt=s=>s==='All'?L.length:s==='Overdue'?L.filter(isOver).length:L.filter(r=>eff(r)===s).length;
 $('sf').innerHTML=['All',...STS,'Overdue'].map(s=>`<button class="chip${FL.st===s?' on':''}" data-st="${s}">${s} (${cnt(s)})</button>`).join('');
 const rs=[...new Set(L.map(r=>r.resp).filter(Boolean))].sort();$('rf').innerHTML='<option value="">All responsibility</option>'+rs.map(x=>`<option${FL.rf===x?' selected':''}>${esc(x)}</option>`).join('');$('so').value=FL.so;
 const ov=L.filter(isOver).length,soon=L.filter(r=>r.due&&r.due>=today()&&r.due<=new Date(Date.now()+3*864e5).toISOString().slice(0,10)&&!['Received','Closed'].includes(eff(r))).length;
 $('ovb').innerHTML=(ov||soon)?`<div class="ban">${ov?`<b>${ov} overdue</b>`:''}${ov&&soon?' • ':''}${soon?`${soon} due in the next 3 days`:''}</div>`:''}
const bdg=r=>{const s=eff(r);return`<span class="bd s-${s}">${s}</span>${isOver(r)?' <span class="bd s-Overdue">Overdue</span>':''}`};
function cell(r,k){const v=r[k];if(k==='mat'&&!v)return r.pr&&r.pr[1]==='2'?'<span class="mut">Service</span>':'';if(k==='st')return bdg(r);if(k==='qty'||k==='recv')return fmt(v);if(k==='val'||k==='zamt')return fmt(v);if(k==='due')return v?v.split('-').reverse().join('.'):'';return esc(v==null?'':v)}
function drawList(){drawFilters();const L=visible();$('cnt').textContent=L.length+' of '+live().length;$('vt').textContent=VIEW==='table'?'Cards':'Table';
 if(!live().length){$('lv').innerHTML='<div class="card" style="text-align:center;padding:28px 12px"><div style="font-size:34px">📦</div><b>No materials yet</b><div class="mut" style="margin:6px 0 10px">Scan a SAP screen or add an item by hand.</div><div class="row" style="justify-content:center"><button class="btn p" data-go="scan">📷 Scan</button><button class="btn" id="add2">+ Add item</button></div></div>';return}
 if(!L.length){$('lv').innerHTML='<div class="mut" style="padding:20px;text-align:center">Nothing matches the filters.</div>';return}
 if(VIEW==='table'){const head=COLS.map(c=>`<th data-sort="${c[0]}" class="${c[2]==='n'?'num ':''}${c[3]||''}">${c[1]}${SORT&&SORT.k===c[0]?(SORT.d>0?' ▲':' ▼'):''}</th>`).join('');
  $('lv').innerHTML=`<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${L.map(r=>`<tr class="rw${r.chk?' chk':''}" data-id="${r.id}">${COLS.map(c=>`<td class="${c[2]==='n'?'num ':''}${c[3]||''}${c[0]==='txt'?' tx':''}">${cell(r,c[0])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
 else $('lv').innerHTML='<div class="cg">'+L.map(r=>`<div class="cd${r.chk?' chk':''}" data-id="${r.id}"><div class="row"><b class="grow">${esc(r.mat||(r.pr&&r.pr[1]==='2'?'Service':'No material no.'))}</b>${bdg(r)}</div><h4>${esc(r.txt||'')}</h4><div class="kv"><div><b>PR No.</b>${esc(r.pr||'')}</div><div><b>Qty</b>${fmt(r.qty)} ${esc(r.un||'')}</div><div><b>Total value</b>${fmt(r.val)}</div><div><b>PO</b>${esc(r.po||'-')}</div><div><b>PO date</b>${esc(r.poDt||'-')}</div><div><b>Received</b>${fmt(r.recv)||'-'}</div><div><b>Z amount</b>${fmt(r.zamt)||'-'}</div><div><b>Responsibility</b>${esc(r.resp||'-')}</div><div><b>Due</b>${cell(r,'due')||'-'}</div></div>${r.rem?`<div class="mut" style="margin-top:5px">${esc(r.rem)}</div>`:''}<div class="row" style="margin-top:7px"><button class="btn sm g" data-recv="${r.id}">✔ Received</button><button class="btn sm" data-edit="${r.id}">Edit</button></div></div>`).join('')+'</div>'}

/* ---------- edit sheet ---------- */
function sheet(h){$('sb').innerHTML='<button class="cl" aria-label="Close">&times;</button>'+h;$('sh').hidden=false;$('sb').querySelector('.cl').onclick=()=>{$('sh').hidden=true}}
function editRow(id){const r=id?ROWS.find(x=>x.id===id):{},isN=!id;if(!r)return;
 const f=(k,l,t,w2)=>`<div class="${w2?'w2':''}"><label>${l}</label><input data-f="${k}" type="${t||'text'}" value="${esc(r[k]==null?'':r[k])}"${k==='resp'?' list="rl"':''}></div>`;
 const rs=[...new Set(live().map(x=>x.resp).filter(Boolean))];
 sheet(`<h2>${isN?'Add item':'Edit item'}</h2><div class="fg">${f('mat','Material')}${f('pr','PR No.')}${f('txt','Short Text','',1)}${f('qty','Qty','number')}${f('un','Unit')}${f('val','Total Value','number')}${f('po','PO')}${f('poDt','PO Date')}${f('reqDt','Req. Date')}
 <div class="w2" style="border-top:1px solid var(--line);padding-top:6px"><b class="mut">YOUR DETAILS</b></div>${f('recv','Received Qty','number')}${f('zamt','Z Amount','number')}${f('resp','Responsibility')}<div><label>Status</label><select data-f="st"><option value="">Auto (${esc(isN?'Pending':eff(r))})</option>${STS.map(s=>`<option${r.st===s?' selected':''}>${s}</option>`).join('')}</select></div>${f('due','Due Date','date')}${f('rem','Remarks','',1)}${f('plant','Plant')}${f('pgr','PGr')}${f('trk','Tracking No.')}${r.rel?`<div class="w2"><label>Release</label><div class="mut">${esc(r.rel)}</div></div>`:''}</div><datalist id="rl">${rs.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
 <div class="row" style="margin-top:10px"><button class="btn p" id="es">Save</button>${isN?'':'<button class="btn g" id="er">✔ Mark received</button><button class="btn red" id="ed">Delete</button>'}</div>`);
 const read=()=>{const o={};document.querySelectorAll('#sb [data-f]').forEach(e=>{const k=e.dataset.f;let v=e.value.trim();if(['qty','recv','zamt','val'].includes(k))v=v===''?'':num(v);o[k]=v});return o};
 $('es').onclick=()=>{const o=read();if(isN){if(!o.txt&&!o.mat){toast('Enter a material or text');return}const k=keyOf(o),nid=o.pr?'r'+hash(k):'r'+uid();const n=Object.assign({id:nid,upd:Date.now(),ts:Date.now()},o);Object.keys(n).forEach(k=>{if(n[k]==='')delete n[k]});const ex=ROWS.find(x=>x.id===nid);if(ex)Object.assign(ex,n,{del:false});else ROWS.push(n)}
  else{Object.assign(r,o,{upd:Date.now(),chk:false});Object.keys(o).forEach(k=>{if(o[k]==='')delete r[k]})}
  save();cloudSoon();$('sh').hidden=true;redraw();toast('Saved')};
 if(!isN){$('er').onclick=()=>{markRecv(r);$('sh').hidden=true;redraw()};$('ed').onclick=()=>{if($('ed').dataset.c){r.del=true;r.upd=Date.now();save();cloudSoon();$('sh').hidden=true;redraw();toast('Deleted')}else{$('ed').dataset.c=1;$('ed').textContent='Tap again to delete'}}}}
function markRecv(r){r.recv=num(r.qty)||r.recv||1;r.recvDt=today();r.st='Received';r.upd=Date.now();save();cloudSoon();toast('Marked received')}

/* ---------- summary ---------- */
function drawSum(){const L=live(),sum=(a,f)=>a.reduce((s,r)=>s+num(r[f]),0),by=s=>L.filter(r=>eff(r)===s);
 const T=[['Items',L.length,'All'],['Total value',fmt(sum(L,'val')),'All'],...STS.map(s=>[s,by(s).length,s]),['Overdue',L.filter(isOver).length,'Overdue'],['Z amount',fmt(sum(L,'zamt')),'All'],['Pending value',fmt(sum(by('Pending').concat(by('Ordered')),'val')),'Pending']];
 const rs={};L.forEach(r=>{const k=r.resp||'(none)';(rs[k]=rs[k]||[]).push(r)});
 $('sm').innerHTML=`<div class="tiles">${T.map(t=>`<button class="tile" data-sf="${t[2]}"><b>${t[1]}</b><span>${t[0]}</span></button>`).join('')}</div><div class="card"><h3>By responsibility</h3><div class="tw" style="max-height:none"><table><thead><tr><th>Responsibility</th><th class="num">Items</th><th class="num">Open</th><th class="num">Received</th><th class="num">Value</th><th class="num">Z amount</th></tr></thead><tbody>${Object.keys(rs).sort().map(k=>{const a=rs[k];return`<tr><td>${esc(k)}</td><td class="num">${a.length}</td><td class="num">${a.filter(r=>!['Received','Closed'].includes(eff(r))).length}</td><td class="num">${a.filter(r=>eff(r)==='Received').length}</td><td class="num">${fmt(sum(a,'val'))}</td><td class="num">${fmt(sum(a,'zamt'))}</td></tr>`}).join('')||'<tr><td colspan="6" class="mut">No data yet</td></tr>'}</tbody></table></div></div>`}

/* ---------- scan ---------- */
let SCN={rows:[],text:'',img:null};
const loadScript=(u)=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('load'));document.head.appendChild(s)});
const imgEl=f=>new Promise((ok,no)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('img'));i.src=u});
function prepAI(img,maxS){const sc=Math.min(1,maxS/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*sc),h=Math.round(img.naturalHeight*sc),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);return c}
/* photo of a monitor: grey, stretch the contrast, then a light blur hides the screen pixel pattern; about 3400 px wide reads best */
function prep(img,T){const sc=T/Math.max(img.naturalWidth,img.naturalHeight),w=Math.round(img.naturalWidth*sc),h=Math.round(img.naturalHeight*sc),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,0,0,w,h);
 const d=x.getImageData(0,0,w,h),a=d.data,H=new Uint32Array(256);for(let i=0;i<a.length;i+=4){const g=(a[i]*299+a[i+1]*587+a[i+2]*114)/1000|0;a[i]=g;H[g]++}
 const n=w*h;let lo=0,hi=255,s0=0;while(lo<255&&s0+H[lo]<n*.02){s0+=H[lo];lo++}s0=0;while(hi>0&&s0+H[hi]<n*.02){s0+=H[hi];hi--}if(hi<=lo+8){lo=0;hi=255}
 const k=255/(hi-lo);for(let i=0;i<a.length;i+=4){const v=Math.max(0,Math.min(255,((a[i]-lo)*k)|0));a[i]=a[i+1]=a[i+2]=v}x.putImageData(d,0,0);
 const c2=document.createElement('canvas');c2.width=w;c2.height=h;const y=c2.getContext('2d');y.filter='blur('+(w*.00045).toFixed(2)+'px)';y.drawImage(c,0,0);return c2}
async function ocr(canvas,prog){if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 const w=await Tesseract.createWorker('eng',1,{langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int',logger:m=>{if(m.status==='recognizing text')prog(m.progress)}});
 try{await w.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});const r=await w.recognize(canvas);return r.data.text||''}finally{await w.terminate()}}
const sst=(m,p)=>{$('sst').textContent=m;$('spb').hidden=p==null;if(p!=null)$('spb').firstChild.style.width=Math.round(p*100)+'%'};
async function scanFiles(files){files=[...files];if(!files.length)return;$('thumbs').innerHTML='';let all=[],txt='';
 for(let i=0;i<files.length;i++){try{sst('Reading photo '+(i+1)+' of '+files.length+'... first time needs internet to load the reader',0);const im=await imgEl(files[i]);
  const th=document.createElement('img');th.src=im.src;th.style.cssText='height:54px;border-radius:8px';$('thumbs').appendChild(th);SCN.img=prepAI(im,1400).toDataURL('image/jpeg',.8);
  const t=await ocr(prep(im,3400),p=>sst('Reading photo '+(i+1)+' of '+files.length+'...',p));txt+=t+'\n';all=all.concat(readText(t))}catch(e){sst('Could not read this photo. Check internet and try again, or use Paste text.');return}}
 const seen=new Set();all=all.filter(r=>{const k=keyOf(r);if(seen.has(k))return false;seen.add(k);return true});
 SCN.rows=all;SCN.text=txt;sst(all.length?all.length+' item(s) found. Check them, then add.':'No items found in this photo. Try a closer, straighter photo, or use AI / Paste text.');drawReview()}
async function aiRead(){const u=($('ai').value||LS.get('owh_mt_ai','')).trim();if(!u){toast('Set the AI scan address in More first');return}if(!SCN.img){toast('Scan a photo first');return}
 sst('Asking AI to read the photo...',.3);try{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({image:SCN.img})});if(!r.ok)throw 0;const j=await r.json();const rows=(j.rows||[]).map(x=>{const o={};FKEYS.forEach(k=>{if(x[k]!=null&&x[k]!=='')o[k]=['qty','val'].includes(k)?num(x[k]):String(x[k])});o.chk=!(o.qty&&o.txt);return o}).filter(x=>x.pr||x.mat||x.txt);
  if(!rows.length)throw 0;SCN.rows=rows;sst(rows.length+' item(s) read by AI. Check them, then add.');drawReview()}catch(e){sst('AI could not read this photo.')}}
function drawReview(){const R=SCN.rows;if(!R.length&&!SCN.text){$('rvw').innerHTML='';return}
 const cols=[['pr','PR No.'],['mat','Material'],['txt','Short Text'],['qty','Qty'],['un','Unit'],['val','Total Value'],['po','PO'],['poDt','PO Date'],['reqDt','Req. Date'],['plant','Plant']];
 $('rvw').innerHTML=`<div class="card"><h3>Check before adding (${R.length})</h3>${R.length?`<div class="tw rv" style="max-height:48dvh"><table><thead><tr><th><input type="checkbox" id="ra" checked></th><th>Tag</th>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${R.map((r,i)=>{const ex=ROWS.find(x=>x.id==='r'+hash(keyOf(r))&&!x.del);return`<tr class="${r.chk?'chk':''}"><td><input type="checkbox" data-ri="${i}" checked></td><td>${ex?'<span class="tg u">Update</span>':'<span class="tg n">New</span>'}${r.chk?' <span class="tg c">Check</span>':''}</td>${cols.map(c=>`<td><input data-rc="${i}.${c[0]}" value="${esc(r[c[0]]==null?'':r[c[0]])}" style="min-width:${c[0]==='txt'?220:c[0]==='un'||c[0]==='qty'?54:100}px"></td>`).join('')}</tr>`}).join('')}</tbody></table></div><div class="row" style="margin-top:8px"><button class="btn p" id="radd">Add selected to list</button><button class="btn" id="rai">Read again with AI</button><button class="btn" id="rclr">Clear</button></div>`:'<div class="mut">Nothing was recognised.</div><div class="row" style="margin-top:6px"><button class="btn" id="rai">Read with AI</button></div>'}
 <details style="margin-top:8px"><summary class="mut">Text that was read (fix it and read again)</summary><textarea id="rtx" rows="7" style="margin-top:6px;font:12px ui-monospace,monospace">${esc(SCN.text)}</textarea><button class="btn sm" id="rre" style="margin-top:6px">Read this text again</button></details></div>`;
 const ra=$('ra');if(ra)ra.onchange=()=>document.querySelectorAll('[data-ri]').forEach(c=>c.checked=ra.checked)}
function addReviewed(){const take=[];document.querySelectorAll('[data-ri]').forEach(c=>{if(!c.checked)return;const i=+c.dataset.ri,r=Object.assign({},SCN.rows[i]);document.querySelectorAll('[data-rc^="'+i+'."]').forEach(e=>{const k=e.dataset.rc.split('.')[1];let v=e.value.trim();if(k==='qty'||k==='val')v=v===''?'':num(v);if(v===''){delete r[k]}else r[k]=v});delete r.chk;take.push(r)});
 if(!take.length){toast('Nothing selected');return}const k=upsert(take);SCN={rows:[],text:'',img:null};$('thumbs').innerHTML='';sst(k.added+' added, '+k.updated+' updated.');drawReview();redraw();toast(k.added+' added, '+k.updated+' updated');goTab('list')}
function pasteSheet(){sheet('<h2>Paste text</h2><div class="mut" style="margin-bottom:6px">Copy rows from the SAP list (select, Ctrl+C) and paste them here.</div><textarea id="pt" rows="9" placeholder="Paste here..." style="font:12px ui-monospace,monospace"></textarea><div class="row" style="margin-top:8px"><button class="btn p" id="pgo">Read</button></div>');$('pgo').onclick=()=>{const t=$('pt').value;SCN.text=t;SCN.rows=readText(t);$('sh').hidden=true;sst(SCN.rows.length?SCN.rows.length+' item(s) found.':'Nothing found in that text.');drawReview()}}

/* ---------- export, import ---------- */
function dl(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function exportCsv(){const hdr=COLS.map(c=>c[1]),keys=COLS.map(c=>c[0]);const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
 const L=live().map(r=>keys.map(k=>q(k==='st'?eff(r):r[k])).join(','));dl('material-tracker-'+today()+'.csv','﻿'+[hdr.map(q).join(',')].concat(L).join('\r\n'),'text/csv')}
function csvParse(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===','){r.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';rows.push(r);r=[]}else f+=c}if(f!==''||r.length){r.push(f);rows.push(r)}return rows}
async function importFile(f){try{const t=await f.text();if(/\.json$/i.test(f.name)){const j=JSON.parse(t);const a=Array.isArray(j)?j:j.rows;if(!Array.isArray(a))throw 0;let n=0;a.forEach(x=>{if(!x||!x.id)return;const ex=ROWS.find(y=>y.id===x.id);if(!ex)ROWS.push(x);else if((x.upd||0)>(ex.upd||0))Object.assign(ex,x);n++});save();cloudSoon();redraw();toast(n+' items restored');return}
  const rows=csvParse(t.replace(/^﻿/,'')),h=rows.shift().map(x=>x.trim().toLowerCase()),map={};COLS.forEach(c=>{const i=h.indexOf(c[1].toLowerCase());if(i>=0)map[c[0]]=i});if(map.pr==null&&map.mat==null&&map.txt==null)throw 0;
  const out=rows.filter(r=>r.some(x=>x.trim())).map(r=>{const o={};Object.keys(map).forEach(k=>{let v=(r[map[k]]||'').trim();if(['qty','val','recv','zamt'].includes(k))v=v===''?'':num(v);if(v!=='')o[k]=v});return o});
  const now=Date.now();let n=0;out.forEach(o=>{if(o.st&&!STS.includes(o.st))delete o.st;const k=keyOf(o),id=o.pr?'r'+hash(k):'r'+uid(),ex=ROWS.find(x=>x.id===id);if(ex)Object.assign(ex,o,{upd:now,del:false});else ROWS.push(Object.assign({id,upd:now,ts:now},o));n++});save();cloudSoon();redraw();toast(n+' items imported')}catch(e){toast('Could not read that file')}}

/* ---------- cloud sync (Google account) ---------- */
const Cloud={user:null,ready:null,busy:false};
const ldS=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('load'));document.head.appendChild(s)});
Cloud.init=function(){if(Cloud.ready)return Cloud.ready;Cloud.ready=(async()=>{if(!window.OWH_FIREBASE)throw new Error('cfg');const b='https://www.gstatic.com/firebasejs/10.12.2/';
 if(!window.firebase)await ldS(b+'firebase-app-compat.js');if(!firebase.auth)await ldS(b+'firebase-auth-compat.js');if(!firebase.firestore)await ldS(b+'firebase-firestore-compat.js');
 if(!firebase.apps.length)firebase.initializeApp(window.OWH_FIREBASE);Cloud.db=firebase.firestore();Cloud.auth=firebase.auth();
 Cloud.auth.onAuthStateChanged(u=>{Cloud.user=u&&!u.isAnonymous?u:null;drawAcct();if(Cloud.user)Cloud.sync()})})().catch(e=>{Cloud.ready=null;throw e});return Cloud.ready};
Cloud.login=async function(){try{await Cloud.init();const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await Cloud.auth.signInWithPopup(p)}catch(e){toast(e&&e.code==='auth/popup-closed-by-user'?'Sign-in was cancelled.':'Sign-in failed. Check internet and try again.')}};
Cloud.sync=async function(manual){if(!Cloud.user||Cloud.busy)return;Cloud.busy=true;try{const col=Cloud.db.collection('mt_users').doc(Cloud.user.uid).collection('items'),snap=await col.get(),rem={};snap.forEach(d=>rem[d.id]=d.data());
  let down=0,up=0;Object.keys(rem).forEach(id=>{const x=rem[id];let o;try{o=JSON.parse(x.d)}catch(e){return}o.id=id;o.del=!!x.del;o.upd=x.upd;const l=ROWS.find(r=>r.id===id);if(!l){ROWS.push(o);down++}else if((x.upd||0)>(l.upd||0)){Object.keys(l).forEach(k=>delete l[k]);Object.assign(l,o);down++}});
  const batches=[];let b=Cloud.db.batch(),n=0;ROWS.forEach(r=>{const x=rem[r.id];if(!x||(r.upd||0)>(x.upd||0)){const c=Object.assign({},r);delete c.del;delete c.id;b.set(col.doc(r.id),{d:JSON.stringify(c).slice(0,5800),upd:r.upd||Date.now(),del:!!r.del});up++;if(++n>=400){batches.push(b);b=Cloud.db.batch();n=0}}});if(n)batches.push(b);
  for(const x of batches)await x.commit();save();LS.set('owh_mt_sync',Date.now());redraw();drawAcct();if(manual)toast('Synced: '+up+' sent, '+down+' received')}
 catch(e){console.warn(e&&e.code);if(manual)toast(e&&e.code==='permission-denied'?'Sync is not switched on yet (rules).':'Sync failed. Check internet and try again.')}finally{Cloud.busy=false}};
function cloudSoon(){if(!Cloud.user)return;clearTimeout(cloudSoon.t);cloudSoon.t=setTimeout(()=>Cloud.sync(),2500)}
function drawAcct(){const u=Cloud.user,t=LS.get('owh_mt_sync',0);$('acct').innerHTML=u?`<b>${esc(u.displayName||'')}</b><br>${esc(u.email||'')}<br>${t?'Last sync '+new Date(t).toLocaleString():'Not synced yet'}`:'Not signed in. Your list is saved on this device. Sign in to keep it on your Google account and open it on other devices.';$('lg').hidden=!!u;$('sy').hidden=!u;$('lo').hidden=!u}

/* ---------- tabs, wiring ---------- */
const TABS=['list','scan','sum','more'];let CT='list';
function goTab(t){CT=t;TABS.forEach(k=>$('t-'+k).classList.toggle('on',k===t));document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));if(t==='list')drawList();if(t==='sum')drawSum();if(t==='more'){drawAcct();setThemeBtns()}$('view').scrollTop=0}
function redraw(){if(CT==='list')drawList();if(CT==='sum')drawSum()}
function setTheme(m){LS.set('owh_mt_theme',m);const d=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.toggleAttribute('data-theme',false);if(d)document.documentElement.setAttribute('data-theme','dark');setThemeBtns()}
function setThemeBtns(){const m=LS.get('owh_mt_theme','light');document.querySelectorAll('[data-th]').forEach(b=>b.classList.toggle('p',b.dataset.th===m))}
document.addEventListener('click',e=>{const t=e.target;let x;
 if((x=t.closest('#nav button')))return goTab(x.dataset.tab);
 if((x=t.closest('[data-go]')))return goTab(x.dataset.go);
 if((x=t.closest('[data-st]'))){FL.st=x.dataset.st;return drawList()}
 if((x=t.closest('[data-sf]'))){FL.st=x.dataset.sf;FL.rf='';FL.q='';$('q').value='';return goTab('list')}
 if((x=t.closest('[data-sort]'))){const k=x.dataset.sort;SORT=SORT&&SORT.k===k?{k,d:-SORT.d}:{k,d:1};return drawList()}
 if((x=t.closest('[data-recv]'))){const r=ROWS.find(y=>y.id===x.dataset.recv);if(r){markRecv(r);drawList()}return}
 if((x=t.closest('[data-edit]')))return editRow(x.dataset.edit);
 if((x=t.closest('tr.rw,.cd'))&&!t.closest('button'))return editRow(x.dataset.id);
 if((x=t.closest('[data-th]')))return setTheme(x.dataset.th);
 if(t.id==='add'||t.id==='add2')return editRow(null);
 if(t.id==='vt'){VIEW=VIEW==='table'?'cards':'table';LS.set('owh_mt_view',VIEW);return drawList()}
 if(t.id==='cam')return $('fc').click();if(t.id==='gal')return $('fg').click();if(t.id==='pst')return pasteSheet();
 if(t.id==='radd')return addReviewed();if(t.id==='rai')return aiRead();if(t.id==='rclr'){SCN={rows:[],text:'',img:null};$('thumbs').innerHTML='';sst('');return drawReview()}
 if(t.id==='rre'){SCN.text=$('rtx').value;SCN.rows=readText(SCN.text);sst(SCN.rows.length+' item(s) found.');return drawReview()}
 if(t.id==='lg')return Cloud.login();if(t.id==='lo'){Cloud.auth&&Cloud.auth.signOut();return}if(t.id==='sy')return Cloud.sync(true);
 if(t.id==='exc')return exportCsv();if(t.id==='exj')return dl('material-tracker-backup-'+today()+'.json',JSON.stringify(ROWS),'application/json');if(t.id==='imp')return $('fi').click();
 if(t.id==='upd'){if(window.OWHUPD)OWHUPD.run();else location.reload();return}
 if(t.id==='cnx'){const f=()=>OWHCONTACT.open({app:'Material Tracker'});if(window.OWHCONTACT)f();else{const s=document.createElement('script');s.src='owh-contact.js';s.onload=f;document.head.appendChild(s)}return}
 if(t.id==='sh')$('sh').hidden=true});
$('q').oninput=e=>{FL.q=e.target.value;drawList()};$('rf').onchange=e=>{FL.rf=e.target.value;drawList()};$('so').onchange=e=>{FL.so=e.target.value;SORT=null;drawList()};
$('fc').onchange=e=>{scanFiles(e.target.files);e.target.value=''};$('fg').onchange=e=>{scanFiles(e.target.files);e.target.value=''};$('fi').onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value=''};
$('ai').value=LS.get('owh_mt_ai','');$('ai').onchange=e=>LS.set('owh_mt_ai',e.target.value.trim());
(function(){let x0=0,y0=0,ok=false;document.addEventListener('touchstart',e=>{ok=e.touches.length===1&&!e.target.closest('.tw,input,select,textarea,.sheet,.chips,details');const t=e.touches[0];x0=t.clientX;y0=t.clientY},{passive:true});
 document.addEventListener('touchend',e=>{if(!ok||!$('sh').hidden)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return;const i=TABS.indexOf(CT)+(dx<0?1:-1);if(i>=0&&i<TABS.length)goTab(TABS[i])},{passive:true})})();
$('ver').textContent='Version: '+VER;
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('mat-sw.js',{scope:'./mat-tracker.html'}).catch(()=>{});
window.MT={parseList,parseDetail,readText,upsert,get rows(){return ROWS}};
drawList();setThemeBtns();Cloud.init().catch(()=>{});
})();
