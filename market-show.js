/* Marketplace showcase: auto-playing app screens, story style progress, tilt, rotating headline */
(function(){
var APPS=[
{id:'pm',icon:'🛠️',name:'PM Tracker',tag:'Never miss a calibration or PM again.',type:'phone',href:'pm.html',cta:'Open PM Tracker',price:'pm',ac:'#14b8a6',url:'ourworldhive.com/pm',
 fl:['⏰ Alerts before it is overdue','✅ OK / NOT OK checklists','📊 Reports to WhatsApp'],
 s:[['shots/pm-1.webp','Today at a glance','Target, done, pending and your monthly compliance on one phone screen.'],['shots/pm-2.webp','Every instrument and job','Search, filter, import from Excel and scan a QR code to open any instrument.'],['shots/pm-3.webp','Calibration due dates','See what is overdue and what is due in the next 30 days.'],['shots/pm-4.webp','Compliance statistics','By section, person and type, ready to share in Excel, PDF and WhatsApp.']]},
{id:'pp',icon:'📊',name:'Project Planner',tag:'Plan, track and approve with your whole team.',type:'laptop',href:'project-planner.html',cta:'Open Project Planner',price:'pp',ac:'#3b82f6',url:'ourworldhive.com/project-planner',
 fl:['📅 ✅ ❌ ➕ calendar','👥 Roles and approvals','📈 Planned vs actual %'],
 s:[['shots/planner-1.webp','Gantt with planned and actual bars','Dependencies across sections, critical path and the percentage inside every actual bar.'],['shots/planner-2.webp','A calendar that tells the truth','✅ done as planned, ❌ planned but not done, ➕ extra work. Tap a day for the report and share it.'],['shots/planner-3.webp','Dashboard for all or each section','S-curve, task status and section progress, overall or one section at a time.'],['shots/planner-4.webp','Manpower, budget and resources','Supervisors log, managers approve. Planned and actual side by side.']]},
{id:'diary',icon:'📓',name:'My Diary',tag:'A paper-style diary that follows you.',type:'phone',href:'diary.html',cta:'Open My Diary',ac:'#f59e0b',url:'ourworldhive.com/diary',
 fl:['✍️ Type or use a pen','☁️ Syncs to every device','☑️ Tasks inside the page'],
 s:[['shots/diary-1.webp','Write about your day','Ruled pages, auto-save and a new page for every day.'],['shots/diary-2.webp','Tasks live in your diary','Add tasks, assign them and tick them off without leaving the page.']]},
{id:'games',icon:'🎮',name:'Games',tag:'Play alone or against real players.',type:'laptop',href:'games.html',cta:'Play now',ac:'#a855f7',url:'ourworldhive.com/games',fl:['🏆 Weekly rankings','🎯 Multiplayer','🥇 Medals'],
 s:[['shots/games-1.webp','Challenge Arena','3D games to play alone or against real players. Win matches to climb the rankings.']]},
{id:'ele',icon:'⚡',name:'Electronics Lab',tag:'Build a circuit and watch it work.',type:'laptop',href:'electronics.html',cta:'Open the lab',ac:'#22c55e',url:'ourworldhive.com/electronics',fl:['🔌 Live voltages','📉 Oscilloscope','🧮 Multimeter'],
 s:[['shots/electronics-1.webp','Circuits in your browser','Voltages, currents, an oscilloscope and a multimeter, all inside the page.']]},
{id:'cmp',icon:'⚖️',name:'Compare',tag:'Two or three things, side by side.',type:'laptop',href:'compare.html',cta:'Compare now',ac:'#f43f5e',url:'ourworldhive.com/compare',fl:['📱 Phones, laptops, cameras','⭐ Best picks','📝 Reviews'],
 s:[['shots/compare-1.webp','Compare and Best Picks','Type what you are choosing between and get a clear table, best picks and reviews.']]},
{id:'ocean',icon:'🌊',name:'Ocean dive',tag:'From the sunlit surface to the deep.',type:'laptop',href:'ocean.html',cta:'Start the dive',ac:'#0ea5e9',url:'ourworldhive.com/ocean',fl:['🤿 Drag to dive','🐠 Meet sea life','🌡️ Depth and pressure'],
 s:[['shots/ocean-1.webp','Dive into the ocean','Drag the diver down and see what lives at every depth.']]}
];
var DUR=4800,A=0,S=0,t0=0,paused=false,hold=false,vis=true,raf=0,el={};
function $(s,r){return (r||document).querySelector(s)}
function mk(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function build(host){
 var info=mk('div','sh-info'),box=mk('div','sh-stagebox'),stage=mk('div','sh-stage'),rig=mk('div','sh-rig');stage.appendChild(rig);
 info.innerHTML='<div class="sh-kick">App showcase</div><h2 class="sh-name" id="shName"></h2><p class="sh-tag" id="shTag"></p><div class="sh-cap" id="shCap" aria-live="polite"></div><div class="sh-act" id="shAct"></div><div class="sh-pills" role="tablist" aria-label="Apps"></div>';
 var pills=$('.sh-pills',info);
 APPS.forEach(function(a,i){
  var b=mk('button','sh-pill','<span aria-hidden="true">'+a.icon+'</span>'+esc(a.name));b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',i===0?'true':'false');b.onclick=function(){go(i,0,true)};pills.appendChild(b);a.pill=b;
  var d=mk('div','dev '+a.type);d.setAttribute('aria-hidden','true');var scr=mk('div','scr');
  a.imgs=a.s.map(function(s,k){var im=new Image();im.className='sl';im.alt=a.name+': '+s[1];im.decoding='async';if(i>1||k>0)im.loading='lazy';im.src=s[0];scr.appendChild(im);return im});
  if(a.type==='laptop'){var lid=mk('div','lid','<div class="bar"><i></i><i></i><i></i><span>'+esc(a.url)+'</span></div>');lid.appendChild(scr);d.appendChild(lid);d.appendChild(mk('div','base'))}
  else d.appendChild(scr);
  a.fl.forEach(function(t){d.appendChild(mk('div','fl',esc(t)))});
  rig.appendChild(d);a.dev=d});
 var prog=mk('div','sh-prog');box.appendChild(stage);box.appendChild(prog);
 var hb=mk('button','sh-hold','⏸');hb.type='button';hb.setAttribute('aria-label','Pause the slideshow');hb.onclick=function(){paused=!paused;hb.textContent=paused?'▶':'⏸';hb.setAttribute('aria-label',paused?'Play the slideshow':'Pause the slideshow');t0=performance.now()-(el.pr||0)*DUR};stage.appendChild(hb);
 host.appendChild(info);host.appendChild(box);el={host:host,name:$('#shName',info),tag:$('#shTag',info),cap:$('#shCap',info),act:$('#shAct',info),prog:prog,stage:stage,rig:rig,pr:0};
 /* tilt that follows the pointer */
 if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){stage.addEventListener('pointermove',function(e){var r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;rig.style.setProperty('--ry',(x*10).toFixed(1)+'deg');rig.style.setProperty('--rx',(-y*8).toFixed(1)+'deg')});stage.addEventListener('pointerleave',function(){rig.style.setProperty('--ry','0deg');rig.style.setProperty('--rx','0deg')})}
 host.addEventListener('mouseenter',function(){hold=true});host.addEventListener('mouseleave',function(){hold=false;t0=performance.now()-el.pr*DUR});
 host.addEventListener('focusin',function(){hold=true});host.addEventListener('focusout',function(){hold=false;t0=performance.now()-el.pr*DUR});
 /* swipe */
 var sx=null;stage.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;hold=true},{passive:true});stage.addEventListener('touchend',function(e){hold=false;if(sx==null)return;var dx=(e.changedTouches[0].clientX-sx);sx=null;if(Math.abs(dx)>40)step(dx<0?1:-1);else t0=performance.now()-el.pr*DUR},{passive:true});
}
function labelPrice(a){if(!a.price)return'';return '<span class="mprice" data-owh-price="'+a.price+'">'+(window.OWH_PRICE?OWH_PRICE.tag(a.price):'Free for 30 days')+'</span>'}
function go(ai,si,user){
 var prev=A;A=(ai+APPS.length)%APPS.length;var a=APPS[A];S=Math.max(0,Math.min(a.s.length-1,si));
 APPS.forEach(function(x,i){x.dev.classList.toggle('on',i===A);x.dev.classList.toggle('gone',i!==A&&i===prev&&prev!==A);if(i!==A&&i!==prev)x.dev.classList.remove('gone');x.pill.setAttribute('aria-selected',i===A?'true':'false');x.imgs.forEach(function(im,k){im.classList.toggle('on',i===A&&k===S);im.classList.toggle('prev',i===A&&k<S)})});
 if(prev!==A||!el.shown){el.name.textContent=a.name;el.tag.textContent=a.tag;el.act.innerHTML=labelPrice(a)+'<a class="btn gold" href="'+a.href+'">'+esc(a.cta)+'</a>';el.host.style.setProperty('--ac',a.ac);
  el.prog.innerHTML='';a.s.forEach(function(s,k){var b=mk('button','sh-seg','<i></i>');b.type='button';b.setAttribute('aria-label','Slide '+(k+1)+': '+s[1]);b.onclick=function(){go(A,k,true)};el.prog.appendChild(b)});el.prog.style.display=a.s.length>1?'flex':'none';
  if(a.pill&&user){try{a.pill.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'})}catch(e){}}}
 el.shown=1;var s=a.s[S];el.cap.innerHTML='<h3>'+esc(s[1])+'</h3><p>'+esc(s[2])+'</p>';
 Array.prototype.forEach.call(el.prog.children,function(b,k){b.classList.toggle('done',k<S);b.firstChild.style.width=k<S?'100%':'0'});
 el.pr=0;t0=performance.now();
}
function step(d){var a=APPS[A],n=S+d;if(n>=a.s.length)go(A+1,0);else if(n<0){var p=(A-1+APPS.length)%APPS.length;go(p,APPS[p].s.length-1)}else go(A,n)}
function loop(now){raf=requestAnimationFrame(loop);if(paused||hold||!vis){t0=now-el.pr*DUR;return}
 el.pr=Math.min(1,(now-t0)/DUR);var seg=el.prog.children[S];if(seg)seg.firstChild.style.width=(el.pr*100)+'%';if(el.pr>=1)step(1)}
function rotate(){var w=['your plant','your projects','your diary','your day','your team'],e=$('.mk-rot');if(!e||matchMedia('(prefers-reduced-motion:reduce)').matches)return;var i=0;setInterval(function(){e.classList.add('out');setTimeout(function(){i=(i+1)%w.length;e.textContent=w[i];e.classList.remove('out')},350)},2600)}
function init(){var host=$('#mkShow');if(!host)return;build(host);go(0,0);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)paused=true;
 if('IntersectionObserver' in window)new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(host);
 document.addEventListener('visibilitychange',function(){vis=!document.hidden});
 window.addEventListener('owh-price',function(){el.act.innerHTML=labelPrice(APPS[A])+'<a class="btn gold" href="'+APPS[A].href+'">'+esc(APPS[A].cta)+'</a>'});
 var c=$('#mkCount');if(c)c.setAttribute('data-count',APPS.length);
 rotate();raf=requestAnimationFrame(loop)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
