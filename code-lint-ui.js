/* Red wavy lines + tap-for-suggestion popup for the Code Lab editors. Uses CLINT from code-lint.js. */
(function(){
'use strict';
var css='.cq-ov{position:absolute;margin:0;border:0;white-space:pre;overflow:hidden;box-sizing:border-box;color:transparent;pointer-events:none;font:inherit;line-height:inherit;letter-spacing:0;z-index:1;word-wrap:normal}'+
'.cq-ov u{text-decoration:underline wavy;text-decoration-thickness:1.5px;text-underline-offset:3px;text-decoration-skip-ink:none}'+
'.cq-ov .e{text-decoration-color:#ff4d6d}.cq-ov .w{text-decoration-color:#ffb020}.cq-ov .t{text-decoration-color:#5aa9ff;text-decoration-style:dotted}'+
'.cq-pop{position:absolute;z-index:6;max-width:min(320px,calc(100% - 16px));background:#17122e;color:#eef0ff;border:1px solid #3b3270;border-left:4px solid #ff4d6d;border-radius:10px;padding:10px 12px;font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)}'+
'.cq-pop.w{border-left-color:#ffb020}.cq-pop.t{border-left-color:#5aa9ff}.cq-pop b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin-bottom:3px}'+
'.cq-pop p{margin:0 0 8px}.cq-pop .r{display:flex;gap:8px;flex-wrap:wrap}.cq-pop button{font:600 13px system-ui,sans-serif;border:0;border-radius:8px;padding:7px 12px;cursor:pointer;background:#2b2455;color:#eef0ff}.cq-pop button.f{background:#ffc857;color:#1a1030}.cq-pop code{background:#0a0f26;padding:1px 5px;border-radius:4px;font-size:12px}'+
'.cq-badge{position:absolute;right:10px;top:6px;z-index:4;font:600 11px system-ui,sans-serif;padding:3px 9px;border-radius:99px;background:#17122e;color:#cfd3ff;border:1px solid #3b3270;cursor:pointer}.cq-badge.bad{color:#ff8aa0;border-color:#ff4d6d}.cq-badge.ok{color:#8ee6a0;border-color:#2f7a45}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function attach(o){
 var ta=o.ta,host=o.host||ta.parentNode,ov=document.createElement('pre'),pop=null,badge=document.createElement('div'),issues=[],T=null,shown=null;
 ov.className='cq-ov';ov.setAttribute('aria-hidden','true');host.insertBefore(ov,ta);
 badge.className='cq-badge ok';badge.hidden=true;host.appendChild(badge);
 function geo(){var cs=getComputedStyle(ta);ov.style.left=cs.left;ov.style.top=cs.top;ov.style.right=cs.right;ov.style.bottom=cs.bottom;ov.style.padding=cs.padding;ov.style.font=cs.font;ov.style.lineHeight=cs.lineHeight;ov.style.tabSize=cs.tabSize}
 function hi(){return o.hi&&o.hi()}
 function msg(x){return x.m[hi()?1:0]}
 function draw(){
  var v=ta.value,html='',pos=0,last=0;
  var pick=[];issues.forEach(function(x){if(x.s>=last){pick.push(x);last=x.e}});
  pick.forEach(function(x){html+=esc(v.slice(pos,x.s))+'<u class="'+x.sev+'">'+esc(v.slice(x.s,x.e))+'</u>';pos=x.e});
  ov.innerHTML=html+esc(v.slice(pos))+'\n';ov.scrollTop=ta.scrollTop;ov.scrollLeft=ta.scrollLeft;
  var ne=issues.filter(function(x){return x.sev==='e'}).length,nw=issues.filter(function(x){return x.sev==='w'}).length,nt=issues.length-ne-nw;
  badge.hidden=!v.trim();
  if(ne||nw){badge.className='cq-badge bad';badge.textContent=(ne?ne+(hi()?' galti':' error'+(ne>1?'s':'')):'')+(ne&&nw?' · ':'')+(nw?nw+(hi()?' chetavni':' warning'+(nw>1?'s':'')):'')}
  else if(nt){badge.className='cq-badge';badge.textContent=nt+(hi()?' sujhav':' tip'+(nt>1?'s':''))}
  else{badge.className='cq-badge ok';badge.textContent=hi()?'✔ sab theek':'✔ no problems'}}
 function run(){var v=ta.value;issues=window.CLINT.check(o.lang(),v);draw();if(pop)close()}
 function sched(){clearTimeout(T);T=setTimeout(run,250)}
 function close(){if(pop){pop.remove();pop=null;shown=null}}
 function at(p){var best=null;issues.forEach(function(x){if(p>=x.s&&p<=x.e&&(p<x.e||x.e-x.s<=1||true)){if(!best||(x.e-x.s)<(best.e-best.s))best=x}});return best}
 function open(x){
  if(shown===x)return;close();shown=x;
  var cs=getComputedStyle(ta),lh=parseFloat(cs.lineHeight)||21,pl=parseFloat(cs.paddingLeft)||12,pt=parseFloat(cs.paddingTop)||10,v=ta.value,ls=v.lastIndexOf('\n',x.s-1)+1,row=v.slice(0,x.s).split('\n').length-1,col=x.s-ls;
  var m=document.createElement('span');m.style.cssText='position:absolute;visibility:hidden;white-space:pre;font:'+cs.font;m.textContent='0000000000';host.appendChild(m);var cw=m.getBoundingClientRect().width/10;m.remove();
  var left=ta.offsetLeft+pl+col*cw-ta.scrollLeft,top=ta.offsetTop+pt+(row+1)*lh-ta.scrollTop+4;
  pop=document.createElement('div');pop.className='cq-pop '+x.sev;
  var label=x.sev==='e'?(hi()?'Galti':'Problem'):x.sev==='w'?(hi()?'Chetavni':'Warning'):(hi()?'Sujhav':'Tip');
  pop.innerHTML='<b>'+label+'</b><p>'+esc(msg(x))+'</p><div class="r"></div>';
  var r=pop.lastChild;
  if(x.fix){var fb=document.createElement('button');fb.type='button';fb.className='f';fb.textContent=hi()?'✨ Theek karo':'✨ Fix it';
   fb.onclick=function(e){e.preventDefault();var nv=window.CLINT.apply(ta.value,x);close();if(nv!=null&&nv!==ta.value){ta.focus();ta.value=nv;ta.dispatchEvent(new Event('input',{bubbles:true}))}};r.appendChild(fb)}
  var cb=document.createElement('button');cb.type='button';cb.textContent=hi()?'Band karo':'Close';cb.onclick=function(e){e.preventDefault();close();ta.focus()};r.appendChild(cb);
  pop.addEventListener('mousedown',function(e){e.preventDefault()});
  host.appendChild(pop);
  var hw=host.clientWidth,pw=pop.offsetWidth,ph=pop.offsetHeight;
  if(left+pw>hw-8)left=Math.max(8,hw-pw-8);if(left<8)left=8;
  if(top+ph>host.clientHeight-4)top=Math.max(4,ta.offsetTop+pt+row*lh-ta.scrollTop-ph-6);
  pop.style.left=left+'px';pop.style.top=top+'px'}
 function check(){var p=ta.selectionStart;if(p!==ta.selectionEnd){close();return}var x=at(p)||(p>0?at(p-1):null);if(x&&(p>x.s||x.e-x.s<=1||p===x.s))open(x);else close()}
 ta.addEventListener('input',function(){sched();close()});
 ta.addEventListener('scroll',function(){ov.scrollTop=ta.scrollTop;ov.scrollLeft=ta.scrollLeft;close()});
 ta.addEventListener('click',function(){setTimeout(check,0)});
 ta.addEventListener('keyup',function(e){if(/Arrow|Home|End|Page/.test(e.key))check();else if(e.key==='Escape')close()});
 badge.addEventListener('click',function(){if(!issues.length)return;var f=issues.filter(function(x){return x.sev!=='t'})[0]||issues[0];ta.focus();ta.setSelectionRange(f.s,f.s);var lh=parseFloat(getComputedStyle(ta).lineHeight)||21,row=ta.value.slice(0,f.s).split('\n').length-1;ta.scrollTop=Math.max(0,row*lh-ta.clientHeight/3);setTimeout(check,0)});
 window.addEventListener('resize',geo);
 geo();run();
 return{refresh:function(){geo();run()},close:close}}
window.CLUI={attach:attach};
})();
