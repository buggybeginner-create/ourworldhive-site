/* One-screen layout for board games: bottom tabs + swipe. Copyright DUKEKRRISH. All rights reserved. */
(function(){
if(window.__bf)return;var D=document;
function init(){
 var app=D.getElementById('app'),main=D.querySelector('main');if(!app||!main||window.__bf)return;window.__bf=1;
 var root=D.documentElement;root.classList.add('bf');
 var wrap=app.parentNode,h1=wrap.querySelector('h1'),lede=wrap.querySelector('.lede'),title=h1?h1.textContent:'Rules';
 var hasStore=false;
 var rules=D.createElement('section');rules.id='bfRules';rules.hidden=true;wrap.appendChild(rules);
 var nav=D.createElement('nav');nav.className='bf-nav';nav.setAttribute('aria-label','Sections');D.body.appendChild(nav);
 var TAB=[['play','🎮','Play'],['online','🌐','Online'],['rules','📖','Rules'],['rank','🏆','Ranks'],['store','🛒','Store']];
 function draw(){nav.innerHTML=TAB.filter(function(t){return t[0]!=='store'||hasStore}).map(function(t){return'<button type="button" data-t="'+t[0]+'"><b>'+t[1]+'</b><span>'+t[2]+'</span></button>'}).join('');nav.style.setProperty('--n',nav.children.length);mark()}
 function order(){return TAB.map(function(t){return t[0]}).filter(function(t){return t!=='store'||hasStore})}
 function lobbyTab(){var o=app.querySelector('.bx-tabs .on');return o&&o.getAttribute('data-t')==='on'?'online':'play'}
 function cur(){if(D.getElementById('ogRank'))return'rank';if(D.getElementById('ogStore'))return'store';if(!rules.hidden)return'rules';return lobbyTab()}
 function mark(){var c=cur();[].forEach.call(nav.children,function(b){b.setAttribute('aria-current',b.getAttribute('data-t')===c)})}
 function showRules(on){rules.hidden=!on;app.hidden=on}
 function fillRules(){var note=app.querySelector('.bx-note'),n=note?note.innerHTML:'';rules.innerHTML='<h2>'+title+'</h2>'+(lede?'<p>'+lede.innerHTML+'</p>':'')+(n?'<div class="bf-box">'+n+'</div>':'')+'<button class="bf-k" id="bfK" type="button">ⓘ Controls and keys</button><p class="bf-c">&copy; '+new Date().getFullYear()+' DUKEKRRISH. All rights reserved.</p>';var k=D.getElementById('bfK');if(k)k.onclick=function(){if(window.OWHG&&OWHG.openHelp)OWHG.openHelp()}}
 function go(t){
  if(t==='rules'){if(!rules.innerHTML||rules.hidden)fillRules();showRules(true)}
  else if(t==='play'||t==='online'){showRules(false);var want=t==='online'?'on':'bot',cu=app.querySelector('.bx-tabs .on');if(t==='play'&&cu&&cu.getAttribute('data-t')!=='on'){}else{var b=app.querySelector('.bx-tabs [data-t="'+want+'"]');if(b)b.click()}}
  else if(t==='rank'){showRules(false);if(window.OWHG&&OWHG.openRank)OWHG.openRank()}
  else if(t==='store'){showRules(false);if(window.OWHG&&OWHG.openStore)OWHG.openStore()}
  setTimeout(mark,60);main.scrollTop=0}
 nav.addEventListener('click',function(e){var b=e.target.closest('button');if(b)go(b.getAttribute('data-t'))});
 function step(d){var o=order(),i=o.indexOf(cur()),j=i+d;if(i<0||j<0||j>=o.length)return;main.style.setProperty('--sw',d>0?'40px':'-40px');go(o[j]);main.classList.remove('bf-sw');void main.offsetWidth;main.classList.add('bf-sw')}
 var x0=0,y0=0,t0=0,ok=false;
 main.addEventListener('touchstart',function(e){var t=e.target;ok=e.touches.length===1&&!root.classList.contains('bf-ig')&&!(t.closest&&t.closest('input,textarea,select'));x0=e.touches[0].clientX;y0=e.touches[0].clientY;t0=Date.now()},{passive:true});
 main.addEventListener('touchend',function(e){if(!ok)return;ok=false;var c=e.changedTouches[0],dx=c.clientX-x0,dy=c.clientY-y0;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.6||Date.now()-t0>800)return;step(dx<0?1:-1)},{passive:true});
 D.addEventListener('keydown',function(e){if(root.classList.contains('bf-ig')||/INPUT|TEXTAREA|SELECT/.test((e.target||{}).tagName||''))return;if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1)});
 function sync(){var lob=!!app.querySelector('.bx-lob');root.classList.toggle('bf-ig',!lob);if(lob)mark()}
 new MutationObserver(sync).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 new MutationObserver(function(){var s=!!(window.OWHG&&OWHG.items&&OWHG.items().length);if(s!==hasStore){hasStore=s;draw()}else mark()}).observe(D.body,{childList:true});
 setTimeout(function(){var s=!!(window.OWHG&&OWHG.items&&OWHG.items().length);if(s!==hasStore){hasStore=s;draw()}},1500);
 draw();sync()}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',init);else init()})();
