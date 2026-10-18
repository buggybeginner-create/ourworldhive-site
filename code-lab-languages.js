/* Code Lab: Python, Java and Visual Basic lessons. Python runs for real in a Web Worker (Pyodide). Java and VB show the expected output. */
(function(){
var D=window.CLL_DATA||{},$=function(s){return document.querySelector(s)},$$=function(s){return [].slice.call(document.querySelectorAll(s))};
var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
var COURSES=[['py','Python','🐍','py'],['java','Java','☕','java'],['vb','Visual Basic','🪟','vb']];
var st={c:LS.get('cll_course','py'),i:0,lang:LS.get('cl_lang','en')==='hi'?'hi':'en',done:LS.get('cll_done',{}),w:null,busy:false,ready:false};
if(!D[st.c])st.c='py';st.i=Math.min(LS.get('cll_idx_'+st.c,0),(D[st.c]||[]).length-1)||0;
function L(){return D[st.c][st.i]}
function T(a){return st.lang==='hi'?a[1]:a[0]}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function key(){return 'cll_code_'+st.c+'_'+st.i}
function code(){return $('#cllTa').value}
function toast(m){var t=$('#clToast');t.textContent=m;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('on')},1800)}
function ui(){var o=COURSES.map(function(c){return '<button type="button" data-c="'+c[0]+'" class="'+(c[0]===st.c?'on':'')+'" aria-pressed="'+(c[0]===st.c)+'">'+c[2]+' '+c[1]+'</button>'}).join('');$('#cllCourse').innerHTML=o;
 $$('[data-en]').forEach(function(e){e.textContent=e.getAttribute(st.lang==='hi'?'data-hi':'data-en')||e.getAttribute('data-en')});
 $$('#clLang button').forEach(function(b){b.classList.toggle('on',b.dataset.l===st.lang)})}
function doneCount(){var n=0;(D[st.c]||[]).forEach(function(l,i){if(st.done[st.c+'_'+i])n++});return n}
function lesson(){var l=L(),n=D[st.c].length;
 var sel='<select id="cllSel" aria-label="Lesson">'+D[st.c].map(function(x,i){return '<option value="'+i+'"'+(i===st.i?' selected':'')+'>'+(st.done[st.c+'_'+i]?'✓ ':'')+(i+1)+'. '+esc(T(x.t))+'</option>'}).join('')+'</select>';
 $('#cllLesson').innerHTML='<div class="ls-top"><div class="ls-sel"><span>'+(st.lang==='hi'?'Lesson':'Lesson')+'</span>'+sel+'</div><div class="ls-nav"><button type="button" class="btn" id="cllPrev"'+(st.i?'':' disabled')+'>&larr;</button><button type="button" class="btn gold" id="cllNext"'+(st.i<n-1?'':' disabled')+'>'+(st.lang==='hi'?'Agla':'Next')+' &rarr;</button></div></div>'+
 '<h2 style="margin:12px 0 0;font-size:20px">'+esc(T(l.t))+'</h2><p class="ls-intro">'+esc(T(l.i))+'</p><ul class="ls-tasks" id="cllTasks"></ul><p class="ls-tip">💡 '+esc(T(l.tip))+'</p><div class="ls-bar"><div id="cllBar"></div></div><div class="ls-foot"><span id="cllProg"></span></div>';
 $('#cllSel').onchange=function(e){go(+e.target.value)};$('#cllPrev').onclick=function(){go(st.i-1)};$('#cllNext').onclick=function(){go(st.i+1)};checks()}
function checks(){var l=L(),c=code(),ok=0;
 var h=l.tasks.map(function(t){var p=false;try{p=new RegExp(t[2],l.f).test(c)}catch(e){}if(p)ok++;return '<li class="'+(p?'ok':'')+'"><i></i><span>'+esc(T(t))+'</span></li>'}).join('');
 var u=$('#cllTasks');if(u)u.innerHTML=h;var all=ok===l.tasks.length;
 if(all&&!st.done[st.c+'_'+st.i]){st.done[st.c+'_'+st.i]=true;LS.set('cll_done',st.done);toast(st.lang==='hi'?'Lesson poora! 🎉':'Lesson complete! 🎉');var o=$('#cllSel');if(o)o.options[st.i].text='✓ '+(st.i+1)+'. '+T(l.t)}
 var d=doneCount(),n=D[st.c].length;if($('#cllBar'))$('#cllBar').style.width=Math.round(d/n*100)+'%';if($('#cllProg'))$('#cllProg').textContent=(st.lang==='hi'?'Poore hue lessons: ':'Lessons done: ')+d+' / '+n+'  ·  '+(st.lang==='hi'?'Is lesson ke kaam: ':'This lesson: ')+ok+' / '+l.tasks.length}
function lines(){var n=code().split('\n').length,g=[];for(var i=1;i<=n;i++)g.push(i);$('#cllGut').textContent=g.join('\n');$('#cllGut').scrollTop=$('#cllTa').scrollTop}
function setCode(v){$('#cllTa').value=v;lines();checks()}
function go(i){var n=D[st.c].length;if(i<0||i>=n)return;st.i=i;LS.set('cll_idx_'+st.c,i);var sv=LS.get(key(),null);$('#cllTa').value=sv==null?L().code:sv;lines();lesson();outReset();modeUi()}
function course(c){if(!D[c])return;st.c=c;LS.set('cll_course',c);st.i=Math.min(LS.get('cll_idx_'+c,0),D[c].length-1)||0;ui();go(st.i)}
function modeUi(){var py=st.c==='py';$('#cllRun').hidden=!py;$('#cllStop').hidden=true;$('#cllExp').hidden=false;$('#cllFile').textContent=py?'main.py':st.c==='java'?'Main.java':'Program.vb';
 var N={py:['Press Run to execute your Python code here in the browser. It runs privately on your device.','Run dabao, aapka Python code yahin browser me chalega. Ye aapke device par hi chalta hai.'],
 java:['Java and Visual Basic cannot run inside a web page. Edit the code, tick off the tasks, and press Expected output to see what the starter code prints. To run your own version, paste it into a free tool such as OnlineGDB (Java) or dotnetfiddle.net (VB).','Java aur Visual Basic web page ke andar nahi chalte. Code badlo, kaam tick karo aur Expected output dabao to starter code ka output dikhega. Apna version chalane ke liye use OnlineGDB (Java) ya dotnetfiddle.net (VB) jaise free tool me paste karo.']};
 N.vb=N.java;$('#cllNote').textContent=T(N[st.c]==null?N.py:N[st.c])}
function outReset(){$('#cllOut').textContent='';$('#cllOut').className='out'}
function out(t,cls){var o=$('#cllOut');o.textContent=t;o.className='out'+(cls?' '+cls:'')}
/* Python in a worker so a bad loop can be stopped */
var WSRC="importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');var py=null,buf=[];self.onmessage=async function(e){try{if(!py){postMessage({t:'st',m:'load'});py=await loadPyodide();py.setStdout({batched:function(s){buf.push(s)}});py.setStderr({batched:function(s){buf.push(s)}});postMessage({t:'ready'})}if(e.data.run!=null){buf=[];try{await py.runPythonAsync(e.data.run);postMessage({t:'done',o:buf.join('\\n')})}catch(err){postMessage({t:'err',o:buf.join('\\n'),m:String(err.message||err).split('\\n').slice(-4).join('\\n')})}}}catch(x){postMessage({t:'fail',m:String(x)})}};";
function worker(){if(st.w)return st.w;var b=new Blob([WSRC],{type:'application/javascript'});st.w=new Worker(URL.createObjectURL(b));st.ready=false;
 st.w.onmessage=function(e){var d=e.data;if(d.t==='st')out(st.lang==='hi'?'Python load ho raha hai (pehli baar lagbhag 10 MB)...':'Loading Python (first time about 10 MB)...','dim');
  else if(d.t==='ready')st.ready=true;
  else if(d.t==='done'){clearTimeout(st.to);busy(false);out(d.o?d.o+'\n':(st.lang==='hi'?'(Koi output nahi)':'(No output)'))}
  else if(d.t==='err'){clearTimeout(st.to);busy(false);out((d.o?d.o+'\n':'')+d.m,'err')}
  else if(d.t==='fail'){busy(false);stopW();out(st.lang==='hi'?'Python load nahi hua (internet check karo). Expected output dekh sakte ho.':'Could not load Python (check your internet). You can still use Expected output.','err')}};
 st.w.onerror=function(){busy(false);stopW();out(st.lang==='hi'?'Python load nahi hua (internet check karo).':'Could not load Python (check your internet).','err')};return st.w}
function stopW(){if(st.w){st.w.terminate();st.w=null;st.ready=false}}
function busy(b){st.busy=b;$('#cllRun').disabled=b;$('#cllStop').hidden=!b}
function run(){if(st.busy||st.c!=='py')return;if(navigator.onLine===false&&!st.ready){out(st.lang==='hi'?'Python ke liye pehli baar internet chahiye.':'Python needs internet the first time.','err');return}
 busy(true);out(st.lang==='hi'?'Chal raha hai...':'Running...','dim');var w=worker();w.postMessage({run:code()});clearTimeout(st.to);st.to=setTimeout(function(){if(st.busy){stopW();busy(false);out(st.lang==='hi'?'Bahut der lag gayi, roka gaya. Kya koi loop kabhi nahi rukta?':'That took too long and was stopped. Does a loop never end?','err')}},15000)}
function stop(){stopW();busy(false);out(st.lang==='hi'?'Roka gaya.':'Stopped.','dim')}
function expected(){var l=L(),changed=code()!==l.code;out(l.out+(changed?'\n'+(st.lang==='hi'?'(Ye starter code ka output hai. Aapne code badla hai.)':'(This is the output of the starter code. You have changed the code.)'):''),changed?'dim':'')}
function boot(){
 if(!D.py){$('#cllLesson').textContent='Lessons could not load.';return}
 ui();$('#cllCourse').addEventListener('click',function(e){var b=e.target.closest('button');if(b)course(b.dataset.c)});
 $('#clLang').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;st.lang=b.dataset.l;LS.set('cl_lang',st.lang);ui();lesson();modeUi()});
 var ta=$('#cllTa');ta.addEventListener('input',function(){LS.set(key(),ta.value);lines();checks()});ta.addEventListener('scroll',function(){$('#cllGut').scrollTop=ta.scrollTop});
 ta.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();var s=ta.selectionStart,en=ta.selectionEnd;ta.value=ta.value.slice(0,s)+'    '+ta.value.slice(en);ta.selectionStart=ta.selectionEnd=s+4;ta.dispatchEvent(new Event('input'))}else if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();if(st.c==='py')run();else expected()}});
 $('#cllRun').onclick=run;$('#cllStop').onclick=stop;$('#cllExp').onclick=expected;
 $('#cllReset').onclick=function(){try{localStorage.removeItem(key())}catch(e){}setCode(L().code);outReset();toast(st.lang==='hi'?'Starter code wapas aaya':'Starter code restored')};
 $('#cllCopy').onclick=function(){var t=code();if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast(st.lang==='hi'?'Copy ho gaya':'Copied')},function(){ta.select();toast('Press Ctrl+C')});else{ta.select();toast('Press Ctrl+C')}};
 go(st.i)}
boot();
})();
