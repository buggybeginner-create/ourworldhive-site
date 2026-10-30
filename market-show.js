/* Hive Apps showcase: auto-playing app screens, story style progress, tilt, rotating headline */
(function(){
var APPS=[
{id:'home',icon:'🏠',name:'Home Planner 3D',tag:'Plan your home in 2D, walk through it in 3D.',def:'d',href:'home-planner.html',cta:'Plan my home',ac:'#f59e0b',url:'ourworldhive.com/home-planner',
 fl:['🧱 Walls, doors, windows, pillars','🛋️ 40 furniture items to drag in','📏 Feet, inches or metres'],
 s:[['Draw it flat, see it in 3D','Draw walls and rooms in a plan view and the 3D house builds itself, with measurements for anything you tap.'],['Paint, floor and furnish','Colour every wall side, pick floors, drop in furniture, change the sun and walk through the rooms.']]},
{id:'pm',icon:'🛠️',name:'PM Tracker',tag:'Never miss a calibration or PM again.',def:'m',href:'pm.html',cta:'Open PM Tracker',price:'pm',ac:'#14b8a6',url:'ourworldhive.com/pm',
 fl:['⏰ Alerts before it is overdue','✅ OK / NOT OK checklists','📊 Reports to WhatsApp'],
 s:[['Today at a glance','Target, done, pending and your monthly compliance on one phone screen.'],['Every instrument and job','Search, filter, import from Excel and scan a QR code to open any instrument.'],['Calibration due dates','See what is overdue and what is due in the next 30 days.'],['Compliance statistics','By section, person and type, ready to share in Excel, PDF and WhatsApp.']]},
{id:'safety',icon:'🦺',name:'Safety Observation',tag:'Log unsafe acts and conditions. The right person is told, and nothing is forgotten.',def:'m',href:'safety.html',cta:'Open Safety Observation',ac:'#f97316',url:'ourworldhive.com/safety',
 fl:['✉️ Automatic e-mail to incharge and head','⬆ Escalates when the target date is missed','📊 Statistics by department and person'],
 s:[['Log in a minute','Choose unsafe act, unsafe condition, safe act or safe condition, pick the department and section, add a photo.'],['The right person, first time','The section incharge, department head and safety officer are filled in from your plant hierarchy.'],['Target dates and escalation','Close with the action taken. If the date is missed it goes to the department head, then the unit head.'],['Statistics','Open and closed by department, by person, daily, weekly, monthly and yearly.']]},
{id:'pp',icon:'📊',name:'Project Planner',tag:'Plan, track and approve with your whole team.',def:'d',href:'project-planner.html',cta:'Open Project Planner',price:'pp',ac:'#3b82f6',url:'ourworldhive.com/project-planner',
 fl:['📅 ✅ ❌ ➕ calendar','👥 Roles and approvals','📈 Planned vs actual %'],
 s:[['Gantt with planned and actual bars','Dependencies across sections, critical path and the percentage inside every actual bar.'],['A calendar that tells the truth','✅ done as planned, ❌ planned but not done, ➕ extra work. Tap a day for the report and share it.'],['Dashboard for all or each section','S-curve, task status and section progress, overall or one section at a time.'],['Manpower, budget and resources','Supervisors log, managers approve. Planned and actual side by side.']]},
{id:'diary',icon:'📓',name:'My Diary',tag:'A paper-style diary that follows you.',def:'m',price:'diary',href:'diary.html',cta:'Open My Diary',ac:'#f59e0b',url:'ourworldhive.com/diary',
 fl:['✍️ Type or use a pen','☁️ Syncs to every device','☑️ Tasks inside the page'],
 s:[['Write about your day','Ruled pages, auto-save and a new page for every day.'],['Tasks live in your diary','Add tasks, assign them and tick them off without leaving the page.']]},
{id:'games',icon:'🎮',name:'Games',tag:'Play alone or against real players.',def:'d',href:'games.html',cta:'Play now',ac:'#a855f7',url:'ourworldhive.com/games',fl:['🏆 Weekly rankings','🎯 Multiplayer','🥇 Medals'],
 s:[['Challenge Arena','3D games to play alone or against real players. Win matches to climb the rankings.'],['Pick a game and play','Single player or multiplayer for two to four. See your best score, views and likes on every game.']]},
{id:'ele',icon:'⚡',name:'Electronics Lab',tag:'Build a circuit and watch it work.',def:'d',href:'electronics.html',cta:'Open the lab',ac:'#22c55e',url:'ourworldhive.com/electronics',fl:['🔌 Live voltages','📉 Oscilloscope','🧮 Multimeter'],
 s:[['Circuits in your browser','Voltages, currents, an oscilloscope and a multimeter, all inside the page.'],['A full parts library','Resistors, capacitors, diodes, transistors, ICs and instruments. Drop them in and press Run.']]},
{id:'cmp',icon:'⚖️',name:'Compare',tag:'Two or three things, side by side.',def:'d',href:'compare.html',cta:'Compare now',ac:'#f43f5e',url:'ourworldhive.com/compare',fl:['📱 Phones, laptops, cameras','⭐ Best picks','📝 Reviews'],
 s:[['Compare and Best Picks','Type what you are choosing between and get a clear table, best picks and reviews.']]},
{id:'ocean',icon:'🌊',name:'Ocean dive',tag:'From the sunlit surface to the deep.',def:'d',href:'ocean.html',cta:'Start the dive',ac:'#0ea5e9',url:'ourworldhive.com/ocean',fl:['🤿 Drag to dive','🐠 Meet sea life','🌡️ Depth and pressure'],
 s:[['Dive into the ocean','Drag the diver down and see what lives at every depth.'],['Zones, animals and facts','Depth, pressure, temperature and sunlight change as you go down. Tap Auto dive to watch.']]}
];
var DUR=4800,A=0,S=0,t0=0,userMode=null,paused=false,hold=false,vis=true,raf=0,el={};
function $(s,r){return (r||document).querySelector(s)}
function mk(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function build(host){
 var info=mk('div','sh-info'),box=mk('div','sh-stagebox'),stage=mk('div','sh-stage'),rig=mk('div','sh-rig');stage.appendChild(rig);
 info.innerHTML='<div class="sh-kick">App showcase</div><h2 class="sh-name" id="shName"></h2><p class="sh-tag" id="shTag"></p><div class="sh-cap" id="shCap" aria-live="polite"></div><div class="sh-act" id="shAct"></div><div class="sh-pills" role="tablist" aria-label="Apps"></div>';
 var pills=$('.sh-pills',info);
 APPS.forEach(function(a,i){
  var b=mk('button','sh-pill','<span aria-hidden="true">'+a.icon+'</span>'+esc(a.name));b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',i===0?'true':'false');b.onclick=function(){go(i,0,true)};pills.appendChild(b);a.pill=b;
  a.devs={};
  ['m','d'].forEach(function(md){
   var d=mk('div','dev '+(md==='m'?'phone':'laptop'));d.setAttribute('aria-hidden','true');var scr=mk('div','scr');
   var imgs=a.s.map(function(s,k){var im=new Image();im.className='sl';im.alt=a.name+(md==='m'?' on a phone: ':' on a computer: ')+s[0];im.decoding='async';if(i>0||k>0||md!==a.def)im.loading='lazy';im.src=({ele:'electronics',cmp:'compare'}[a.id]||a.id)+'-'+md+'-'+(k+1)+'.webp';scr.appendChild(im);return im});
   if(md==='d'){var lid=mk('div','lid','<div class="bar"><i></i><i></i><i></i><span>'+esc(a.url)+'</span></div>');lid.appendChild(scr);d.appendChild(lid);d.appendChild(mk('div','base'))}else d.appendChild(scr);
   a.fl.forEach(function(t){d.appendChild(mk('div','fl',esc(t)))});
   rig.appendChild(d);a.devs[md]={el:d,imgs:imgs}})});
 var prog=mk('div','sh-prog');box.appendChild(stage);box.appendChild(prog);
 var hb=mk('button','sh-hold','\u23F8');hb.type='button';hb.setAttribute('aria-label','Pause the slideshow');hb.onclick=function(){paused=!paused;hb.textContent=paused?'\u25B6':'\u23F8';hb.setAttribute('aria-label',paused?'Play the slideshow':'Pause the slideshow');t0=performance.now()-(el.pr||0)*DUR};stage.appendChild(hb);
 var tg=mk('div','sh-mode','<button type="button" data-m="m">\uD83D\uDCF1 Mobile</button><button type="button" data-m="d">\uD83D\uDCBB Desktop</button>');tg.setAttribute('role','group');tg.setAttribute('aria-label','Screen size');stage.appendChild(tg);
 tg.onclick=function(e){var b=e.target.closest('button');if(!b)return;userMode=b.getAttribute('data-m');go(A,S)};
 var pv=mk('button','sh-arr prev','\u2039');pv.type='button';pv.setAttribute('aria-label','Previous screen');pv.onclick=function(){step(-1,true)};
 var nx=mk('button','sh-arr next','\u203A');nx.type='button';nx.setAttribute('aria-label','Next screen');nx.onclick=function(){step(1,true)};stage.appendChild(pv);stage.appendChild(nx);
 host.appendChild(info);host.appendChild(box);el={host:host,name:$('#shName',info),tag:$('#shTag',info),cap:$('#shCap',info),act:$('#shAct',info),prog:prog,stage:stage,rig:rig,mode:tg,pr:0};
 if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){stage.addEventListener('pointermove',function(e){var r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;rig.style.setProperty('--ry',(x*10).toFixed(1)+'deg');rig.style.setProperty('--rx',(-y*8).toFixed(1)+'deg')});stage.addEventListener('pointerleave',function(){rig.style.setProperty('--ry','0deg');rig.style.setProperty('--rx','0deg')})}
 host.addEventListener('mouseenter',function(){hold=true});host.addEventListener('mouseleave',function(){hold=false;t0=performance.now()-el.pr*DUR});
 host.addEventListener('focusin',function(){hold=true});host.addEventListener('focusout',function(){hold=false;t0=performance.now()-el.pr*DUR});
 var sx=null,sy=null;stage.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;hold=true},{passive:true});stage.addEventListener('touchend',function(e){hold=false;if(sx==null)return;var dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))step(dx<0?1:-1,true);else t0=performance.now()-el.pr*DUR},{passive:true});
 /* mouse drag to swipe */
 var mx=null;stage.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&!e.target.closest('button'))mx=e.clientX});window.addEventListener('pointerup',function(e){if(mx==null)return;var dx=e.clientX-mx;mx=null;if(Math.abs(dx)>50)step(dx<0?1:-1,true)});
 stage.addEventListener('keydown',function(e){if(e.key==='ArrowRight')step(1,true);if(e.key==='ArrowLeft')step(-1,true)});stage.tabIndex=0;stage.setAttribute('aria-label','Screenshots. Use the arrow keys or swipe to change screen.');
}
function labelPrice(a){if(!a.price)return'';return '<span class="mprice" data-owh-price="'+a.price+'">'+(window.OWH_PRICE?OWH_PRICE.tag(a.price):'Free for 30 days')+'</span>'}
function curMode(a){return userMode||a.def}
function go(ai,si,user){
 var prev=A;A=(ai+APPS.length)%APPS.length;var a=APPS[A],md=curMode(a);S=Math.max(0,Math.min(a.s.length-1,si));
 APPS.forEach(function(x,i){['m','d'].forEach(function(m){var v=x.devs[m],on=i===A&&m===md;v.el.classList.toggle('on',on);v.el.classList.toggle('gone',!on&&i===prev&&prev!==A);if(!on&&!(i===prev&&prev!==A))v.el.classList.remove('gone');v.imgs.forEach(function(im,k){im.classList.toggle('on',on&&k===S);im.classList.toggle('prev',on&&k<S)})});x.pill.setAttribute('aria-selected',i===A?'true':'false')});
 Array.prototype.forEach.call(el.mode.children,function(b){b.setAttribute('aria-pressed',b.getAttribute('data-m')===md?'true':'false')});
 if(prev!==A||!el.shown){el.name.textContent=a.name;el.tag.textContent=a.tag;el.act.innerHTML=labelPrice(a)+'<a class="btn gold" href="'+a.href+'">'+esc(a.cta)+'</a>';el.host.style.setProperty('--ac',a.ac);
  el.prog.innerHTML='';a.s.forEach(function(s,k){var b=mk('button','sh-seg','<i></i>');b.type='button';b.setAttribute('aria-label','Screen '+(k+1)+': '+s[0]);b.onclick=function(){go(A,k,true)};el.prog.appendChild(b)});el.prog.style.display=a.s.length>1?'flex':'none';
  if(a.pill&&user){try{a.pill.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})}catch(e){}}}
 el.shown=1;var s=a.s[S];el.cap.innerHTML='<h3>'+esc(s[0])+'</h3><p>'+esc(s[1])+'</p>';
 Array.prototype.forEach.call(el.prog.children,function(b,k){b.classList.toggle('done',k<S);b.firstChild.style.width=k<S?'100%':'0'});
 el.pr=0;t0=performance.now();
}
function step(d,user){var a=APPS[A],n=S+d;if(n>=a.s.length)go(A+1,0,user);else if(n<0){var p=(A-1+APPS.length)%APPS.length;go(p,APPS[p].s.length-1,user)}else go(A,n,user)}
function loop(now){raf=requestAnimationFrame(loop);if(paused||hold||!vis){t0=now-el.pr*DUR;return}
 el.pr=Math.min(1,(now-t0)/DUR);var seg=el.prog.children[S];if(seg)seg.firstChild.style.width=(el.pr*100)+'%';if(el.pr>=1)step(1)}
function rotate(){var w=['your plant','your projects','your diary','your day','your team'],e=$('.mk-rot');if(!e||matchMedia('(prefers-reduced-motion:reduce)').matches)return;var i=0;setInterval(function(){e.classList.add('out');setTimeout(function(){i=(i+1)%w.length;e.textContent=w[i];e.classList.remove('out')},350)},2600)}
function init0(){var host=$('#mkShow');if(!host)return;build(host);go(0,0);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)paused=true;
 if('IntersectionObserver' in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(host);
 document.addEventListener('visibilitychange',function(){vis=!document.hidden});
 window.addEventListener('owh-price',function(){el.act.innerHTML=labelPrice(APPS[A])+'<a class="btn gold" href="'+APPS[A].href+'">'+esc(APPS[A].cta)+'</a>'});
 var c=$('#mkCount');if(c)c.setAttribute('data-count',APPS.length);
 rotate();raf=requestAnimationFrame(loop)}
function init(){var own=false;try{own=localStorage.getItem('owh_owner')==='1'}catch(e){}if(!window.OWHAPI||own)return init0();var done=false,go=function(){if(done)return;done=true;if(APPS.length)init0()};setTimeout(go,2500);OWHAPI.get('config/hidden').then(function(d){var h=String(d&&d.mk||'').split(',');APPS=APPS.filter(function(a){return h.indexOf(a.id)<0})}).catch(function(){}).then(go)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
