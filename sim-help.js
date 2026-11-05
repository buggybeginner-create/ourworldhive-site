/* Training Hub simulators: INFO mode. Press the INFO button, then tap any key, lamp or display to see what it is
   and what it does. While INFO is ON the keys do NOT operate the simulator, so nothing changes by mistake.
   Usage: SimHelp.init([[selector, title, [en, hi, hinglish]], ...])  — language follows the page's #lang select.
   © 2026 DUKEKRRISH · ourworldhive.com */
(function(){
"use strict";
var T={
 off:['ⓘ KEY INFO','ⓘ की जानकारी','ⓘ KEY INFO'],
 on:['ⓘ INFO ON — tap a key or lamp · tap here to exit','ⓘ INFO चालू — की या लैंप टैप करें · बंद करने के लिए यहाँ टैप','ⓘ INFO ON — key ya lamp tap karo · band karne ke liye yahan tap'],
 first:['Tap any key, lamp or the display to see its meaning. Keys do not operate while INFO is ON.','किसी भी की, लैंप या डिस्प्ले पर टैप करें, मतलब दिखेगा। INFO चालू रहते की काम नहीं करतीं।','Kisi bhi key, lamp ya display par tap karo, matlab dikhega. INFO ON rehte keys kaam nahi karti.']
};
var LI={en:0,hi:1,hg:2},items=[],tip=null,hideT=null,on=false,btn=null;
function L(a){var s=document.getElementById('lang');var v=s&&s.value;return a[LI.hasOwnProperty(v)?LI[v]:0]||a[0]}
function css(){
  var st=document.createElement('style');
  st.textContent=
  '.sh-btn{appearance:none;display:flex;align-items:center;justify-content:center;gap:6px;margin:10px auto 2px;padding:9px 16px;min-height:40px;border-radius:999px;border:1.5px solid #6fa8dc;'+
  'background:#16212c;color:#cfe3f6;font:700 13px "Barlow Semi Condensed",Barlow,system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;-webkit-tap-highlight-color:transparent;max-width:100%}'+
  '.sh-btn.on{background:#ffc857;border-color:#ffc857;color:#14181c}'+
  '.sh-btn:focus-visible{outline:2px solid #ffc857;outline-offset:2px}'+
  'body.sh-on [data-sh]{outline:2px dashed rgba(255,200,87,.85);outline-offset:2px;cursor:help}'+
  'body.sh-on [data-sh].sh-sel{outline:3px solid #ffc857}'+
  '.sh-tip{position:fixed;z-index:9999;max-width:min(330px,calc(100vw - 20px));background:#11161c;color:#e8ecef;border:1px solid #ffc857;border-radius:10px;padding:9px 12px 10px;'+
  'font:400 13.5px/1.45 Barlow,"Noto Sans Devanagari",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.55);pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s}'+
  '.sh-tip.show{opacity:1;transform:none}.sh-tip b{display:block;font:700 13px "Barlow Semi Condensed",Barlow,sans-serif;letter-spacing:.05em;color:#ffc857;margin-bottom:3px;text-transform:uppercase}'+
  '.sh-tip i{position:absolute;width:10px;height:10px;background:#11161c;border:1px solid #ffc857;transform:rotate(45deg)}'+
  '.sh-tip.up i{bottom:-6px;border-top:0;border-left:0}.sh-tip.dn i{top:-6px;border-bottom:0;border-right:0}';
  document.head.appendChild(st);
}
function mark(){items.forEach(function(it,i){[].forEach.call(document.querySelectorAll(it[0]),function(el){if(!el.hasAttribute('data-sh'))el.setAttribute('data-sh',i)})})}
function place(el,title,text){
  if(!tip){tip=document.createElement('div');tip.className='sh-tip';tip.setAttribute('role','status');tip.setAttribute('aria-live','polite');document.body.appendChild(tip)}
  tip.innerHTML='<i></i><b></b><span></span>';tip.querySelector('b').textContent=title;tip.querySelector('span').textContent=text;
  tip.style.left='0px';tip.style.top='0px';tip.className='sh-tip';
  var r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,vw=innerWidth,vh=innerHeight;
  var up=r.top-h-12>8,top=up?r.top-h-12:Math.min(vh-h-8,r.bottom+12),left=Math.max(10,Math.min(vw-w-10,r.left+r.width/2-w/2));
  tip.style.left=left+'px';tip.style.top=top+'px';
  tip.querySelector('i').style.left=Math.max(10,Math.min(w-20,r.left+r.width/2-left-5))+'px';
  tip.className='sh-tip show '+(up?'up':'dn');
  clearTimeout(hideT);hideT=setTimeout(hide,9000);
}
function hide(){if(tip)tip.className='sh-tip';[].forEach.call(document.querySelectorAll('.sh-sel'),function(e){e.classList.remove('sh-sel')})}
function show(el){var it=items[+el.getAttribute('data-sh')];if(!it)return;hide();el.classList.add('sh-sel');place(el,it[1],L(it[2]))}
function setOn(v){on=v;document.body.classList.toggle('sh-on',on);hide();label();if(on){mark();place(btn,'INFO',L(T.first))}}
function label(){if(!btn)return;btn.textContent=L(on?T.on:T.off);btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',on?'true':'false')}
/* while INFO is ON: a tap on a marked element shows its meaning and is NOT passed to the simulator */
function block(e){
  if(!on)return;var el=e.target.closest&&e.target.closest('[data-sh]');if(!el)return;
  e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  if(e.type==='pointerdown'||(e.type==='keydown'&&(e.key==='Enter'||e.key===' ')))show(el);
}
['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click','dblclick','wheel'].forEach(function(t){document.addEventListener(t,block,{capture:true,passive:false})});
document.addEventListener('keydown',function(e){
  if(!on)return;if(e.key==='Escape'){setOn(false);return}
  var el=e.target.closest&&e.target.closest('[data-sh]');if(el){block(e);return}
  if(!e.target.closest||!e.target.closest('input,select,textarea,button'))e.stopPropagation(); /* PC shortcut keys do nothing in INFO mode */
},true);
document.addEventListener('pointerdown',function(e){if(on&&!(e.target.closest&&e.target.closest('[data-sh],.sh-btn')))hide()});
addEventListener('scroll',function(){if(tip&&tip.className.indexOf('show')>0)hide()},true);addEventListener('resize',hide);
addEventListener('hashchange',function(){if(on)setOn(false)});
window.SimHelp={init:function(list,opt){opt=opt||{};
  items=list;css();mark();
  var pane=document.getElementById('p-key'),hl=pane&&pane.querySelector('.hintline');
  btn=document.createElement('button');btn.type='button';btn.className='sh-btn';
  btn.addEventListener('click',function(e){e.stopPropagation();setOn(!on)});
  var col=pane&&pane.querySelector('.col');
  if(opt.top&&col)col.insertBefore(btn,col.firstChild);else if(hl&&hl.parentNode)hl.parentNode.insertBefore(btn,hl);else if(pane)pane.appendChild(btn);
  label();
  var s=document.getElementById('lang');if(s)s.addEventListener('change',function(){setTimeout(label,0);hide()});
  [].forEach.call(document.querySelectorAll('.tab'),function(t){t.addEventListener('click',function(){if(on)setOn(false)})});
  setTimeout(mark,800);
}};
})();
