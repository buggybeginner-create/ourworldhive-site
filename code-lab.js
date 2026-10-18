/* Code Lab engine: live editor, hover explanations, lessons, suggestions, safe preview. */
(function(){
'use strict';
var D=window.CL_DATA,$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};
var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
var st={lang:LS.get('cl_lang','hi'),lesson:LS.get('cl_lesson',0),done:LS.get('cl_done',{}),fs:LS.get('cl_fs',14)};
if(!(st.lesson>=-1&&st.lesson<D.LESSONS.length))st.lesson=0;
function L(en,hi){return st.lang==='hi'?hi:en}
function pick(a){return st.lang==='hi'?a[1]:a[0]}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function rx(re,s,i){re.lastIndex=i;return re.exec(s)}
/* ---------------- highlighter ---------------- */
var ctx=null;
var NAMED={};('red blue green yellow orange purple pink black white gray grey brown gold silver navy teal cyan magenta lime maroon olive aqua coral crimson indigo violet tomato salmon khaki lavender ivory beige azure turquoise orchid plum tan skyblue lightblue lightgreen darkblue darkgreen darkred hotpink firebrick steelblue royalblue seagreen slategray whitesmoke gainsboro dimgray'.split(' ')).forEach(function(c){NAMED[c]=1});
var VOID={area:1,base:1,br:1,col:1,embed:1,hr:1,img:1,input:1,link:1,meta:1,source:1,track:1,wbr:1};
function E(txt,cls,k){if(!txt)return;var h=esc(txt);if(cls){ctx.h+='<span class="'+cls+'">'+h+'</span>';if(k)ctx.toks.push({s:ctx.pos,e:ctx.pos+txt.length,k:k,t:txt})}else ctx.h+=h;ctx.pos+=txt.length}
function hlValue(v){
 var i=0,n=v.length,m;
 while(i<n){
  if((m=rx(/\s+/y,v,i))){E(m[0]);i+=m[0].length;continue}
  if((m=rx(/"[^"]*"?|'[^']*'?/y,v,i))){E(m[0],'st');i+=m[0].length;continue}
  if((m=rx(/#[0-9a-fA-F]{3,8}\b/y,v,i))){E(m[0],'nu','color:'+m[0]);i+=m[0].length;continue}
  if((m=rx(/!important/y,v,i))){E(m[0],'kw','cssv:!important');i+=m[0].length;continue}
  if((m=rx(/--[\w-]+/y,v,i))){E(m[0],'pr','css:'+m[0]);i+=m[0].length;continue}
  if((m=rx(/-?(?:\d+\.?\d*|\.\d+)([a-zA-Z%]*)/y,v,i))){E(m[0],'nu','num:'+m[1]);i+=m[0].length;continue}
  if((m=rx(/([a-zA-Z-]+)\(/y,v,i))){E(m[1],'fn','cssfn:'+m[1]);E('(','p');i+=m[0].length;continue}
  if((m=rx(/-?[a-zA-Z][\w-]*/y,v,i))){var w=m[0].toLowerCase();E(m[0],NAMED[w]?'nu':'vl',NAMED[w]?'color:'+w:'cssv:'+w);i+=m[0].length;continue}
  E(v[i],'p');i++}}
function hlDecl(c){var m=/^(\s*)(--[\w-]+|[-\w]+)(\s*):(\s*)([\s\S]*)$/.exec(c);
 if(m){E(m[1]);E(m[2],'pr','css:'+m[2].toLowerCase());E(m[3]);E(':','p');E(m[4]);hlValue(m[5])}else E(c)}
function hlSel(c){
 var i=0,n=c.length,m;
 if(/^\s*@/.test(c)){m=/^(\s*)(@[\w-]+)([\s\S]*)$/.exec(c);E(m[1]);var nm=m[2].toLowerCase();E(m[2],'kw',nm==='@media'?'sym:atmedia':nm==='@keyframes'?'sym:keyframes':'sym:atmedia');
  var rest=m[3],pm;if(nm==='@media'){var j=0;while(j<rest.length){if((pm=rx(/\(\s*([-\w]+)(\s*:\s*)([^)]*)\)/y,rest,j))){E('(','p');var lead=/^\(\s*/.exec(pm[0])[0].slice(1);E(lead);E(pm[1],'pr','css:'+pm[1].toLowerCase());E(pm[2],'p');hlValue(pm[3]);E(')','p');j+=pm[0].length}else{E(rest[j]);j++}}}else E(rest);return}
 while(i<n){
  if((m=rx(/\s+/y,c,i))){E(m[0]);i+=m[0].length;continue}
  if((m=rx(/\.[\w-]+/y,c,i))){E(m[0],'sl','sel:'+m[0]);i+=m[0].length;continue}
  if((m=rx(/#[\w-]+/y,c,i))){E(m[0],'sl','sel:'+m[0]);i+=m[0].length;continue}
  if((m=rx(/::?[\w-]+/y,c,i))){E(m[0],'ps','pseudo:'+m[0]);i+=m[0].length;continue}
  if((m=rx(/\*/y,c,i))){E('*','kw','sym:universal');i++;continue}
  if((m=rx(/[a-zA-Z][\w-]*/y,c,i))){var tg=m[0].toLowerCase();E(m[0],'tg',D.T[tg]?'tag:'+tg:'sel:'+tg);i+=m[0].length;continue}
  if((m=rx(/\d+%/y,c,i))){E(m[0],'nu');i+=m[0].length;continue}
  if((m=rx(/[>+~]/y,c,i))){E(m[0],'kw','sym:combinator');i++;continue}
  if((m=rx(/\([^)]*\)/y,c,i))){E(m[0],'p');i+=m[0].length;continue}
  E(c[i],'p');i++}}
function hlCss(s){
 var i=0,n=s.length,m;
 while(i<n){
  if((m=rx(/\s+/y,s,i))){E(m[0]);i+=m[0].length;continue}
  if(s.charAt(i)==='/'&&s.charAt(i+1)==='*'){var e=s.indexOf('*/',i+2);e=e<0?n:e+2;E(s.slice(i,e),'c','sym:comment');i=e;continue}
  if(s[i]==='}'||s[i]===';'){E(s[i],'p');i++;continue}
  var j=i,dp=0,q=null,c;
  for(;j<n;j++){c=s[j];if(q){if(c===q)q=null;continue}if(c==='"'||c==="'"){q=c;continue}if(c==='(')dp++;else if(c===')')dp--;else if(dp<=0&&(c==='{'||c===';'||c==='}'))break;else if(c==='/'&&s[j+1]==='*')break}
  if(j===i){E(s[i]);i++;continue}
  var chunk=s.slice(i,j);
  if(s[j]==='{'){hlSel(chunk);E('{','p');i=j+1}else{hlDecl(chunk);i=j}}}
var KW={const:1,let:1,var:1,function:1,return:1,if:1,else:1,for:1,while:1,true:1,false:1,null:1,undefined:1,new:1,this:1};
function hlJs(s){
 var re=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)|(=>)|([\s\S])/g,m;
 while((m=re.exec(s))){
  if(m[1])E(m[1],'c','sym:comment');
  else if(m[2])E(m[2],'st');
  else if(m[3])E(m[3],'nu');
  else if(m[4]){var parts=m[4].split(/(\s*\.\s*)/),pi=0;
   while(pi<parts.length){var p=parts[pi];
    if(pi%2===1){E(p,'p');pi++;continue}
    var two=pi+2<parts.length?p+'.'+parts[pi+2]:null;
    if(two&&D.J[two]){E(p,'fn','js:'+two);E(parts[pi+1],'p');E(parts[pi+2],'fn','js:'+two);pi+=3;continue}
    if(KW[p]&&pi===0)E(p,'kw','js:'+p);else if(D.J[p])E(p,pi===0?'fn':'fn','js:'+p);else E(p,'id');
    pi++}}
  else if(m[5])E('=>','kw','js:=>');
  else E(m[6],'p')}}
function hlAttrValue(attr,raw){
 var q=raw.charAt(0),quoted=(q==='"'||q==="'"),inner=quoted?raw.slice(1,raw.charAt(raw.length-1)===q&&raw.length>1?-1:raw.length):raw;
 var closed=quoted&&raw.length>1&&raw.charAt(raw.length-1)===q;
 if(quoted)E(q,'st');
 if(attr==='style'&&inner){hlCss(inner)}
 else if(/^on[a-z]+$/.test(attr)&&inner){hlJs(inner)}
 else if(inner)E(inner,'st','aval:'+attr+'|'+inner);
 if(quoted&&closed)E(q,'st')}
function hlHtml(s){
 var i=0,n=s.length,m;
 while(i<n){
  var lt=s.indexOf('<',i);
  if(lt<0){E(s.slice(i));break}
  if(lt>i)E(s.slice(i,lt));
  i=lt;
  if(s.startsWith('<!--',i)){var e=s.indexOf('-->',i+4);e=e<0?n:e+3;E(s.slice(i,e),'c','sym:comment');i=e;continue}
  if(s.charAt(i+1)==='!'){var e2=s.indexOf('>',i);e2=e2<0?n:e2+1;E(s.slice(i,e2),'kw','sym:doctype');i=e2;continue}
  m=rx(/<(\/?)([a-zA-Z][\w:-]*)/y,s,i);
  if(!m){E('<','p');i++;continue}
  var closing=!!m[1],name=m[2].toLowerCase();
  E('<'+m[1],'p');E(m[2],'tg','tag:'+name);i+=m[0].length;
  var selfc=false;
  while(i<n){
   var ch=s[i];
   if(ch==='>'){E('>','p');i++;break}
   if(ch==='/'&&s[i+1]==='>'){E('/>','p');i+=2;selfc=true;break}
   if((m=rx(/\s+/y,s,i))){E(m[0]);i+=m[0].length;continue}
   if((m=rx(/[^\s=>\/"'<]+/y,s,i))){var an=m[0].toLowerCase();E(m[0],'at','attr:'+an);i+=m[0].length;
    var q=rx(/(\s*)=(\s*)/y,s,i);
    if(q){E(q[1]);E('=','p');E(q[2]);i+=q[0].length;var vm=rx(/"[^"]*"?|'[^']*'?|[^\s>]+/y,s,i);if(vm){hlAttrValue(an,vm[0]);i+=vm[0].length}}
    continue}
   E(ch);i++}
  if(!closing&&!selfc&&(name==='style'||name==='script')){
   var re=new RegExp('</'+name,'i'),rest=s.slice(i),mm=re.exec(rest),endAt=mm?i+mm.index:n,inner=s.slice(i,endAt);
   if(name==='style')hlCss(inner);else hlJs(inner);i=endAt}}}
function highlight(src){ctx={h:'',pos:0,toks:[]};hlHtml(src);return ctx}
/* ---------------- explanations ---------------- */
function pack(kind,title,r){return{kind:kind,title:title,en:r[0],hi:r[1],tryIt:r[2]||''}}
function info(t){
 var k=t.k,p=k.indexOf(':'),kind=k.slice(0,p),key=k.slice(p+1),r;
 switch(kind){
 case 'tag':r=D.T[key];return r?pack(L('HTML tag','HTML tag'),'<'+key+'>',r):{kind:'HTML tag',title:'<'+key+'>',en:'A less common or custom tag.',hi:'Kam use hone wala ya apna banaya tag.'};
 case 'attr':r=D.A[key];
  if(!r&&/^data-/.test(key))r=['Your own custom data attached to the element, readable from JavaScript.','Element se jura aapka apna data, JavaScript se padh sakte ho.','data-id="5"'];
  if(!r&&/^on[a-z]+$/.test(key))r=['Runs JavaScript when the "'+key.slice(2)+'" event happens on this element.','Is element par "'+key.slice(2)+'" event hone par JavaScript chalata hai.'];
  if(!r&&/^aria-/.test(key))r=['Extra information for screen readers (accessibility).','Screen reader ke liye extra jaankari (accessibility).'];
  return r?pack(L('Attribute','Attribute'),key,r):{kind:'Attribute',title:key,en:'An extra setting on the tag.',hi:'Tag ki ek extra setting.'};
 case 'aval':{var bar=key.indexOf('|'),at=key.slice(0,bar),val=key.slice(bar+1),en,hi,tr='';
  if(at==='class'){en='Class name "'+val+'". In CSS write .'+val.split(/\s+/)[0]+' { ... } to style every element with this class.';hi='Class ka naam "'+val+'". CSS me .'+val.split(/\s+/)[0]+' { ... } likho to is class wale har element ko style milega.'}
  else if(at==='id'){en='Unique name "'+val+'". CSS: #'+val+' { ... }   JavaScript: document.getElementById("'+val+'")';hi='Unique naam "'+val+'". CSS: #'+val+' { ... }   JavaScript: document.getElementById("'+val+'")'}
  else if(at==='href'){if(val.charAt(0)==='#'){en='Jumps to the element with id "'+val.slice(1)+'" on this same page.';hi='Isi page par id "'+val.slice(1)+'" wale element tak jump karta hai.'}else if(/^mailto:/i.test(val)){en='Opens the visitor\'s email app.';hi='Visitor ka email app kholta hai.'}else if(/^tel:/i.test(val)){en='Starts a phone call on mobile.';hi='Mobile par call lagata hai.'}else{en='The link opens this address: '+val;hi='Link is address par le jaata hai: '+val}}
  else if(at==='src'){en='The file to show: '+(val.length>50?val.slice(0,50)+'...':val);hi='Dikhane wali file: '+(val.length>50?val.slice(0,50)+'...':val)}
  else if(at==='type'){var TY={text:['A one line text box.','Ek line wala text box.'],email:['A box for email addresses. Phones show an @ keyboard.','Email ke liye box. Phone par @ wala keyboard aata hai.'],password:['Hides what is typed.','Jo type karo wo chhup jaata hai.'],number:['Accepts only numbers.','Sirf number leta hai.'],checkbox:['A tick box.','Tick karne wala box.'],radio:['Choose one among several.','Kai me se ek chuno.'],submit:['A button that sends the form.','Form bhejne wala button.'],button:['A plain button.','Saada button.'],range:['A slider.','Slider.'],date:['A date picker.','Tareekh chunne wala.'],color:['A colour picker.','Rang chunne wala.'],file:['A file chooser.','File chunne wala.']};var tt=TY[val];en=tt?tt[0]:'Type "'+val+'".';hi=tt?tt[1]:'Type "'+val+'".'}
  else if(at==='target'){en=val==='_blank'?'Opens the link in a new tab.':'Where the link opens.';hi=val==='_blank'?'Link naye tab me khulta hai.':'Link kahan khulega.'}
  else if(at==='lang'){en='Page language code ("en" is English, "hi" is Hindi).';hi='Page ki bhasha ka code ("en" matlab English, "hi" matlab Hindi).'}
  else if(at==='charset'){en='UTF-8 supports every language and emoji.';hi='UTF-8 har bhasha aur emoji dikhata hai.'}
  else if(at==='content'&&/width=device-width/.test(val)){en='Makes the page fit the phone screen width instead of showing a tiny zoomed-out desktop page.';hi='Page ko phone screen ki chaudai me fit karta hai, chhota zoomed-out desktop page nahi dikhata.'}
  else if(at==='alt'){en='This text is read to blind users and shown if the picture does not load.';hi='Ye text nabeena logon ko padh kar sunaya jaata hai aur picture na khule to dikhta hai.'}
  else{en='Value "'+val+'" for the attribute "'+at+'".';hi='Attribute "'+at+'" ki value "'+val+'".'}
  return{kind:L('Attribute value','Attribute ki value'),title:val.length>40?val.slice(0,40)+'...':val,en:en,hi:hi,tryIt:tr}}
 case 'css':{var ci=D.cssInfo(key);return ci?pack(L('CSS property','CSS property'),key,ci):{kind:'CSS property',title:key,en:'A CSS setting for this element.',hi:'Is element ki ek CSS setting.'}}
 case 'cssv':{if(key==='!important'){return{kind:L('CSS value','CSS value'),title:'!important',en:'Forces this rule to win over other rules. Use rarely, it makes CSS hard to manage.',hi:'Is rule ko baaki rules se upar jeetata hai. Kam use karo, CSS sambhalna mushkil ho jaata hai.'}}
  r=D.V[key];return r?{kind:L('CSS value','CSS value'),title:key,en:r[0],hi:r[1]}:{kind:L('CSS value','CSS value'),title:key,en:'A value chosen for the property.',hi:'Property ke liye chuni gayi value.'}}
 case 'num':{var u=key,tx=t.t;r=D.UNITS[u];if(r)return{kind:L('Number with unit','Unit wala number'),title:tx,en:r[0],hi:r[1]};
  return{kind:L('Number','Number'),title:tx,en:'A plain number without a unit. Used by things like line-height, opacity and flex.',hi:'Bina unit ka number. line-height, opacity aur flex jaisi cheezon me use hota hai.'}}
 case 'cssfn':r=D.FN[key];return r?pack(L('CSS function','CSS function'),key+'()',r):{kind:'CSS function',title:key+'()',en:'A CSS function.',hi:'Ek CSS function.'};
 case 'color':{var nm=key;return{kind:L('Colour','Rang'),title:nm,en:'A colour. The square shows how it looks. You can write colours as names (red), hex (#ff0000), rgb() or hsl().',hi:'Ek rang. Chhota square dikhata hai ki kaisa dikhega. Rang naam (red), hex (#ff0000), rgb() ya hsl() me likh sakte ho.',swatch:nm}}
 case 'sel':{var f=key.charAt(0);if(f==='.')return{kind:L('CSS selector','CSS selector'),title:key,en:'Class selector: styles every element that has class="'+key.slice(1)+'".',hi:'Class selector: class="'+key.slice(1)+'" wale har element ko style deta hai.',tryIt:key+' { color: red; }'};
  if(f==='#')return{kind:L('CSS selector','CSS selector'),title:key,en:'ID selector: styles the ONE element that has id="'+key.slice(1)+'".',hi:'ID selector: id="'+key.slice(1)+'" wale EK element ko style deta hai.'};
  return{kind:L('CSS selector','CSS selector'),title:key,en:'Selects every <'+key+'> element on the page.',hi:'Page ke har <'+key+'> element ko chunta hai.'}}
 case 'pseudo':{var pk=key.replace(/\(.*$/,'');r=D.PSEUDO[pk];return r?pack(L('Pseudo selector','Pseudo selector'),key,r):{kind:'Pseudo selector',title:key,en:'A special state or part of an element.',hi:'Element ki ek khaas halat ya hissa.'}}
 case 'js':r=D.J[key];return r?pack('JavaScript',key,r):{kind:'JavaScript',title:key,en:'JavaScript code.',hi:'JavaScript code.'};
 case 'sym':r=D.SYM[key];return r?pack(key==='comment'?L('Comment','Comment'):L('Syntax','Syntax'),key==='doctype'?'<!DOCTYPE html>':key==='comment'?L('Comment','Comment'):key,r):null;
 }
 return null}
function infoHtml(i){
 if(!i)return'';var sw=i.swatch?'<i class="sw" style="background:'+esc(i.swatch)+'"></i>':'';
 return'<div class="th"><span class="kind">'+esc(i.kind)+'</span><b>'+sw+esc(i.title)+'</b></div><p>'+esc(st.lang==='hi'?i.hi:i.en)+'</p>'+(i.tryIt?'<div class="try"><span>'+L('Try:','Try karo:')+'</span><code>'+esc(i.tryIt)+'</code></div>':'')}
/* ---------------- editor ---------------- */
var ta=$('#clTa'),pre=$('#clPre'),gut=$('#clGut'),meas=$('#clMeas'),tip=$('#clTip'),exp=$('#clExp'),ed=$('#clEd');
var cur={toks:[],starts:[0]},code='',metrics={cw:8.4,lh:21,pl:12,pt:10};
function lineOf(idx){var a=cur.starts,lo=0,hi=a.length-1;while(lo<hi){var mid=(lo+hi+1)>>1;if(a[mid]<=idx)lo=mid;else hi=mid-1}return lo}
function tokAt(idx){var a=cur.toks,lo=0,hi=a.length-1;while(lo<=hi){var mid=(lo+hi)>>1,t=a[mid];if(idx<t.s)hi=mid-1;else if(idx>=t.e)lo=mid+1;else return t}return null}
function measure(){var cs=getComputedStyle(ta);meas.style.font=cs.font;var w=meas.getBoundingClientRect().width/20;metrics.cw=w||8.4;metrics.lh=parseFloat(cs.lineHeight)||21;metrics.pl=parseFloat(cs.paddingLeft)||12;metrics.pt=parseFloat(cs.paddingTop)||10}
function render(){
 code=ta.value;var c=highlight(code);cur.toks=c.toks;
 pre.innerHTML=c.h+'\n';
 cur.starts=[0];for(var i=0;i<code.length;i++)if(code.charCodeAt(i)===10)cur.starts.push(i+1);
 var n=cur.starts.length,g='';for(var k=1;k<=n;k++)g+=k+'\n';gut.textContent=g;syncScroll()}
function syncScroll(){pre.scrollTop=ta.scrollTop;pre.scrollLeft=ta.scrollLeft;gut.scrollTop=ta.scrollTop}
var hoverQ=null;
function showTip(t,x,y){
 var i=info(t);if(!i){hideTip();return}
 tip.innerHTML=infoHtml(i);tip.hidden=false;
 var w=tip.offsetWidth,h=tip.offsetHeight,vw=innerWidth,vh=innerHeight,px=x+16,py=y+18;
 if(px+w>vw-8)px=Math.max(8,vw-w-8);if(py+h>vh-8)py=Math.max(8,y-h-14);
 tip.style.left=px+'px';tip.style.top=py+'px'}
function hideTip(){tip.hidden=true}
function setExplain(t){if(!t){exp.innerHTML='<p class="muted">'+L('Move the mouse over any word in the code, or tap a word, to learn what it does.','Code ke kisi bhi shabd par mouse le jao, ya shabd par tap karo, tab pata chalega wo kya karta hai.')+'</p>';return}exp.innerHTML=infoHtml(info(t))||''}
var lastTok=null;
ta.addEventListener('mousemove',function(e){
 if(e.buttons)return;var cx=e.clientX,cy=e.clientY;
 if(hoverQ)return;hoverQ=requestAnimationFrame(function(){hoverQ=null;
  var r=ta.getBoundingClientRect(),x=cx-r.left-metrics.pl+ta.scrollLeft,y=cy-r.top-metrics.pt+ta.scrollTop,col=Math.floor(x/metrics.cw),row=Math.floor(y/metrics.lh);
  if(row<0||row>=cur.starts.length||col<0){hideTip();return}
  var ls=cur.starts[row],le=row+1<cur.starts.length?cur.starts[row+1]-1:code.length;
  if(ls+col>=le){hideTip();return}
  var t=tokAt(ls+col);if(!t){hideTip();return}
  if(t!==lastTok){lastTok=t;setExplain(t)}showTip(t,cx,cy)})});
ta.addEventListener('mouseleave',function(){hideTip();lastTok=null});
ta.addEventListener('scroll',function(){syncScroll();hideTip()});
function caretExplain(){var p=ta.selectionStart,t=tokAt(p)||(p>0?tokAt(p-1):null);if(t&&t!==lastTok){lastTok=t;setExplain(t)}}
ta.addEventListener('click',caretExplain);ta.addEventListener('keyup',function(e){if(/Arrow|Home|End|Page/.test(e.key))caretExplain()});
var cq=null;try{cq=window.CLUI&&CLUI.attach({ta:ta,host:ed,lang:function(){return'html'},hi:function(){return st.lang==='hi'}})}catch(e){}
var runT=null;
function onInput(){
 if(ta.value.indexOf('\t')>=0){var p=ta.selectionStart;ta.value=ta.value.replace(/\t/g,'  ');ta.setSelectionRange(p,p)}
 render();hideTip();schedule();LS.set('cl_code_'+st.lesson,ta.value);lint();checkTasks()}
ta.addEventListener('input',onInput);
ta.addEventListener('keydown',function(e){
 if(e.key==='Tab'){e.preventDefault();ins('  ');return}
 if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey){var p=ta.selectionStart,v=ta.value,ls=v.lastIndexOf('\n',p-1)+1,ind=/^[ ]*/.exec(v.slice(ls,p))[0],pc=v.charAt(p-1),nc=v.charAt(p);
  var extra=(pc==='{'||(pc==='>'&&/<(?!\/|!|meta|link|br|hr|img|input)[a-zA-Z][^>]*>$/.test(v.slice(ls,p)))?'  ':'');
  e.preventDefault();
  if(pc==='{'&&nc==='}')ins('\n'+ind+'  \n'+ind,ind.length+3);else ins('\n'+ind+extra);return}
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}});
function ins(txt,caretOff){var s=ta.selectionStart,e=ta.selectionEnd;ta.focus();
 if(!document.execCommand||!document.execCommand('insertText',false,txt)){ta.value=ta.value.slice(0,s)+txt+ta.value.slice(e);ta.setSelectionRange(s+txt.length,s+txt.length);onInput()}
 if(caretOff!=null){var q=s+caretOff;ta.setSelectionRange(q,q)}}
function setCode(v){ta.value=v;ta.scrollTop=0;ta.scrollLeft=0;render();run();lint();checkTasks();cq&&cq.refresh()}
function jumpTo(idx,len){ta.focus({preventScroll:true});ta.setSelectionRange(idx,idx+(len||0));var line=lineOf(idx);ta.scrollTop=Math.max(0,line*metrics.lh-ta.clientHeight/3);syncScroll();caretExplain()}
/* ---------------- preview ---------------- */
var frame=$('#clFrame'),consoleEl=$('#clCon'),inspEl=$('#clInsp'),conCount=0;
var INSPECT='(function(){var P=parent;function send(o){o.cl=1;P.postMessage(o,"*")}function fmt(a){try{return typeof a==="object"?JSON.stringify(a):String(a)}catch(e){return String(a)}}["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){send({t:"log",k:k,m:[].map.call(arguments,fmt).join(" ")});try{o.apply(console,arguments)}catch(e){}}});window.addEventListener("error",function(e){send({t:"log",k:"error",m:e.message+(e.lineno?" (line "+e.lineno+")":"")})});window.addEventListener("unhandledrejection",function(e){send({t:"log",k:"error",m:"Promise error: "+fmt(e.reason)})});var box,lab;function mk(){if(box)return;box=document.createElement("div");box.style.cssText="position:fixed;pointer-events:none;border:2px solid #ffc857;background:rgba(255,200,87,.14);z-index:2147483647;display:none;border-radius:3px";lab=document.createElement("div");lab.style.cssText="position:absolute;left:-2px;top:-22px;background:#ffc857;color:#1a1030;font:700 11px/18px system-ui,sans-serif;padding:0 6px;border-radius:4px;white-space:nowrap";box.appendChild(lab);document.documentElement.appendChild(box)}function nm(el){return el.tagName.toLowerCase()+(el.id?"#"+el.id:"")+(el.classList&&el.classList.length?"."+[].slice.call(el.classList).join("."):"")}document.addEventListener("mouseover",function(e){var el=e.target;if(!el||el===box||el===lab||el===document.documentElement)return;mk();var r=el.getBoundingClientRect();box.style.display="block";box.style.left=r.left+"px";box.style.top=r.top+"px";box.style.width=r.width+"px";box.style.height=r.height+"px";lab.textContent=nm(el)+"  "+Math.round(r.width)+"x"+Math.round(r.height);lab.style.top=r.top<24?"auto":"-22px";lab.style.bottom=r.top<24?"-22px":"auto";send({t:"hover",tag:el.tagName.toLowerCase(),id:el.id||"",cls:(typeof el.className==="string"?el.className:""),w:Math.round(r.width),h:Math.round(r.height)})},true);document.addEventListener("mouseout",function(e){if(!e.relatedTarget&&box)box.style.display="none"},true);document.addEventListener("click",function(e){var el=e.target;if(!el)return;var a=el.closest&&el.closest("a[href]");var all=document.getElementsByTagName(el.tagName),idx=[].indexOf.call(all,el);send({t:"click",tag:el.tagName.toLowerCase(),idx:idx});if(a&&a.getAttribute("href").charAt(0)!=="#"){e.preventDefault();send({t:"log",k:"info",m:"Link clicked: "+a.getAttribute("href")+" (links do not open inside the preview)"})}},true);document.addEventListener("submit",function(e){e.preventDefault();send({t:"log",k:"info",m:"Form submitted (nothing is sent from the preview)"})},true)})();';
function buildDoc(src){
 var tag='<scr'+'ipt>'+INSPECT+'</scr'+'ipt>';
 var m=/<head[^>]*>/i.exec(src);
 if(m)return src.slice(0,m.index+m[0].length)+tag+src.slice(m.index+m[0].length);
 m=/<html[^>]*>/i.exec(src);if(m)return src.slice(0,m.index+m[0].length)+'<head>'+tag+'</head>'+src.slice(m.index+m[0].length);
 m=/<!doctype[^>]*>/i.exec(src);if(m)return src.slice(0,m.index+m[0].length)+tag+src.slice(m.index+m[0].length);
 return tag+src}
function schedule(){clearTimeout(runT);runT=setTimeout(run,420)}
function run(){clearTimeout(runT);clearCon();frame.srcdoc=buildDoc(ta.value)}
function clearCon(){consoleEl.innerHTML='';conCount=0;$('#clConN').textContent='';inspEl.textContent=L('Move the mouse over the preview to inspect elements. Click an element to find it in the code.','Preview par mouse le jao, element ka naam dikhega. Element par click karo to code me wahi jagah mil jaayegi.')}
window.addEventListener('message',function(e){
 var d=e.data;if(!d||!d.cl||e.source!==frame.contentWindow)return;
 if(d.t==='log'){conCount++;var li=document.createElement('div');li.className='lg '+d.k;li.textContent=(d.k==='error'?'✖ ':d.k==='warn'?'⚠ ':'› ')+d.m;consoleEl.appendChild(li);consoleEl.scrollTop=1e6;$('#clConN').textContent=conCount;if(d.k==='error')$('#clConBox').open=true}
 else if(d.t==='hover'){var r=D.T[d.tag],txt=r?pick(r).split(/\.\s/)[0]:'';inspEl.innerHTML='<code>&lt;'+esc(d.tag)+(d.id?' id="'+esc(d.id)+'"':'')+(d.cls?' class="'+esc(d.cls)+'"':'')+'&gt;</code> '+(+d.w||0)+'×'+(+d.h||0)+'px'+(txt?' &nbsp;·&nbsp; '+esc(txt):'')}
 else if(d.t==='click'){var n=-1;for(var i=0;i<cur.toks.length;i++){var t=cur.toks[i];if(t.k==='tag:'+d.tag&&code.charAt(t.s-1)==='<'){n++;if(n===d.idx){goPane('code');jumpTo(t.s-1,t.e-t.s+1);return}}}}});
/* ---------------- suggestions ---------------- */
var lintEl=$('#clLint'),lintT=null;
function lint(){clearTimeout(lintT);lintT=setTimeout(doLint,300)}
function doLint(){
 var out=[],src=code,toks=cur.toks;
 function add(l,en,hi,idx){out.push({l:l,en:en,hi:hi,line:idx==null?null:lineOf(idx)+1,idx:idx})}
 if(!src.trim()){lintEl.innerHTML='<p class="muted">'+L('Write some code and suggestions will appear here.','Code likho, yahan suggestions aayenge.')+'</p>';return}
 if(!/<!doctype html>/i.test(src))add('w','Add <!DOCTYPE html> on the very first line so browsers use modern mode.','Sabse pehli line me <!DOCTYPE html> likho taaki browser modern mode me chale.',0);
 var hm=/<html[^>]*>/i.exec(src);if(hm&&!/\blang\s*=/i.test(hm[0]))add('t','Add lang="en" to <html>. It helps Google and screen readers.','<html> me lang="en" jodo. Isse Google aur screen reader ko madad milti hai.',hm.index);
 if(/<head/i.test(src)&&!/<title>[\s\S]*?\S[\s\S]*?<\/title>/i.test(src))add('w','The page has no <title>. It shows on the browser tab and in Google results.','Page me <title> nahi hai. Ye browser tab aur Google results me dikhta hai.',(/<head[^>]*>/i.exec(src)||{index:0}).index);
 if(/<head/i.test(src)&&!/name\s*=\s*["']viewport["']/i.test(src))add('t','Add <meta name="viewport" content="width=device-width, initial-scale=1> so the page fits phones.','<meta name="viewport" content="width=device-width, initial-scale=1"> jodo taaki page phone par fit ho.',(/<head[^>]*>/i.exec(src)||{index:0}).index);
 if(/<head/i.test(src)&&!/charset/i.test(src))add('t','Add <meta charset="utf-8"> so all letters and emoji display correctly.','<meta charset="utf-8"> jodo taaki saare akshar aur emoji sahi dikhein.',(/<head[^>]*>/i.exec(src)||{index:0}).index);
 var stack=[],ids={},h1=0,inl=0,OPT={p:1,li:1,td:1,th:1,tr:1,thead:1,tbody:1,option:1,html:1,body:1,head:1,dt:1,dd:1};
 for(var i=0;i<toks.length;i++){var t=toks[i];if(t.k.slice(0,4)!=='tag:')continue;var name=t.k.slice(4),isClose=src.charAt(t.s-1)==='/'&&src.charAt(t.s-2)==='<',isOpen=src.charAt(t.s-1)==='<';
  if(!isOpen&&!isClose)continue;
  if(isOpen){var end=src.indexOf('>',t.e),self=end>0&&src.charAt(end-1)==='/';
   var tagText=src.slice(t.s,end>0?end:t.e);
   if(name==='h1')h1++;
   if(name==='img'&&!/\balt\s*=/i.test(tagText))add('w','This <img> has no alt text. Add alt="what the picture shows".','Is <img> me alt text nahi hai. alt="picture me kya hai" jodo.',t.s-1);
   if(name==='a'){if(!/\bhref\s*=/i.test(tagText))add('t','This <a> has no href, so it is not a real link.','Is <a> me href nahi hai, isliye ye asli link nahi hai.',t.s-1);else if(/href\s*=\s*["']#["']/i.test(tagText))add('t','href="#" goes nowhere. Put a real address or an #id.','href="#" kahin nahi le jaata. Asli address ya #id likho.',t.s-1);
    if(/target\s*=\s*["']_blank["']/i.test(tagText)&&!/rel\s*=/i.test(tagText))add('t','Links with target="_blank" should also have rel="noopener" for safety.','target="_blank" wale link ke saath safety ke liye rel="noopener" bhi likho.',t.s-1)}
   if(name==='input'&&!/type\s*=\s*["'](submit|button|hidden|checkbox|radio)["']/i.test(tagText)){var idm=/\bid\s*=\s*["']([^"']+)/i.exec(tagText);if(!(idm&&new RegExp('for\\s*=\\s*["\']'+idm[1]+'["\']','i').test(src))&&!/aria-label|placeholder/i.test(tagText))add('t','Give this input a <label> or placeholder so users know what to type.','Is input ko <label> ya placeholder do taaki user ko pata chale kya likhna hai.',t.s-1)}
   var im=/\bid\s*=\s*["']([^"']+)["']/i.exec(tagText);if(im){if(ids[im[1]])add('w','The id "'+im[1]+'" is used more than once. An id must be unique.','id "'+im[1]+'" kai baar use hua hai. id unique hona chahiye.',t.s-1);ids[im[1]]=1}
   if(/\sstyle\s*=/i.test(tagText))inl++;
   if(!self&&!VOID[name])stack.push({n:name,i:t.s-1})}
  else{ if(VOID[name])continue;
   var top=stack.length?stack[stack.length-1]:null;
   if(top&&top.n===name)stack.pop();
   else{var d=-1;for(var s2=stack.length-1;s2>=0;s2--)if(stack[s2].n===name){d=s2;break}
    if(d>=0){for(var s3=stack.length-1;s3>d;s3--){if(!OPT[stack[s3].n])add('w','<'+stack[s3].n+'> is not closed before </'+name+'>. Add </'+stack[s3].n+'>.','<'+stack[s3].n+'> </'+name+'> se pehle band nahi hua. </'+stack[s3].n+'> jodo.',stack[s3].i)}stack.length=d}
    else add('w','Closing tag </'+name+'> has no matching opening tag.','</'+name+'> ka koi opening tag nahi mila.',t.s-2)}}}
 stack.forEach(function(x){if(!OPT[x.n])add('w','<'+x.n+'> is never closed. Add </'+x.n+'>.','<'+x.n+'> kabhi band nahi hua. </'+x.n+'> jodo.',x.i)});
 if(/<body/i.test(src)&&!h1)add('t','Add one <h1> heading. It tells visitors and Google what the page is about.','Ek <h1> heading jodo. Isse visitor aur Google ko page ka topic pata chalta hai.');
 if(h1>1)add('t','There are '+h1+' <h1> headings. Use only one, and use <h2> for sections.','Page me '+h1+' <h1> hain. Sirf ek rakho, sections ke liye <h2> use karo.');
 if(inl>=3)add('t','You use inline style="..." '+inl+' times. Move it into a <style> block with classes. It is easier to change later.','Aapne style="..." '+inl+' baar likha hai. Use <style> block me class ke saath rakho, baad me badalna aasan hoga.');
 var css=(src.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)||[]).join('\n'),js=(src.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)||[]).join('\n');
 if(css){
  if((css.match(/!important/g)||[]).length>1)add('t','Several !important found. Fix the selector order instead, !important makes CSS hard to manage.','Kai !important mile. Selector ka kram theek karo, !important se CSS sambhalna mushkil hota hai.');
  var fs=/font-size\s*:\s*(\d+)px/gi,fm;while((fm=fs.exec(css))){if(+fm[1]<12){add('t','font-size '+fm[1]+'px is very small to read on phones. Try 14px or more.','font-size '+fm[1]+'px phone par padhne ke liye bahut chhota hai. 14px ya zyada rakho.',src.indexOf(fm[0]));break}}
  if(/\bwidth\s*:/.test(css)&&/padding/.test(css)&&!/box-sizing/.test(css))add('t','Add * { box-sizing: border-box; } so padding does not make boxes wider than their width.','* { box-sizing: border-box; } jodo taaki padding se box width se bada na ho.');
  var op=(css.match(/\{/g)||[]).length,cl=(css.match(/\}/g)||[]).length;if(op!==cl)add('w','CSS has '+op+' "{" but '+cl+' "}". A bracket is missing.','CSS me '+op+' "{" hain par '+cl+' "}". Koi bracket chhoot gaya.',src.indexOf(css.slice(0,20)))}
 if(js){
  if(/\bvar\s/.test(js))add('t','Use let or const instead of var. They are safer.','var ki jagah let ya const use karo. Ye zyada surakshit hain.',src.indexOf('var '));
  if(/[^=!]==[^=]/.test(js))add('t','Use === instead of == to compare values safely.','Value compare karne ke liye == ki jagah === use karo.');
  if(/document\.write/.test(js))add('w','document.write is outdated and can erase the page. Use textContent or createElement.','document.write purana hai aur page mita sakta hai. textContent ya createElement use karo.',src.indexOf('document.write'));
  if(/\.innerHTML\s*=/.test(js))add('t','innerHTML with user text can be unsafe. For plain text, use textContent.','User ke text ke saath innerHTML surakshit nahi. Saade text ke liye textContent use karo.',src.indexOf('innerHTML'));
  if(/\balert\(/.test(js))add('t','alert() blocks the page. console.log() is better while testing.','alert() page rok deta hai. Test karte waqt console.log() behtar hai.',src.indexOf('alert('))}
 if(!out.length)add('g','Looks good! No problems found. Keep experimenting and make it your own.','Bahut badhiya! Koi dikkat nahi mili. Experiment karte raho aur ise apna banao.');
 var order={w:0,t:1,g:2};out.sort(function(a,b){return order[a.l]-order[b.l]});
 var nw=out.filter(function(o){return o.l==='w'}).length,nt=out.filter(function(o){return o.l==='t'}).length;
 $('#clLintN').textContent=nw?nw+' ⚠':(nt?nt+' 💡':'✔');
 lintEl.innerHTML=out.map(function(o,i){return'<li class="'+o.l+'" data-i="'+i+'"><i>'+(o.l==='w'?'⚠':o.l==='t'?'💡':'✔')+'</i><span>'+esc(st.lang==='hi'?o.hi:o.en)+(o.line?'<small>'+L('Line ','Line ')+o.line+'</small>':'')+'</span></li>'}).join('');
 lintEl._o=out}
lintEl.addEventListener('click',function(e){var li=e.target.closest('li');if(!li)return;var o=lintEl._o[+li.dataset.i];if(o&&o.idx!=null){goPane('code');jumpTo(o.idx,0)}});
/* ---------------- lessons ---------------- */
var lessonEl=$('#clLesson');
function lessonCode(i){var s=LS.get('cl_code_'+i,null);return s==null?(i<0?'<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My page</title>\n</head>\n<body>\n  <h1>Free practice</h1>\n  <p>Write anything you like here.</p>\n</body>\n</html>\n':D.LESSONS[i].code):s}
function drawLesson(){
 var i=st.lesson,Ls=D.LESSONS,html='<div class="ls-top"><label class="ls-sel"><span>'+L('Lesson','Lesson')+'</span><select id="clSel">'+Ls.map(function(l,k){return'<option value="'+k+'"'+(k===i?' selected':'')+'>'+(st.done[k]?'✔ ':'')+(k+1)+'. '+esc(pick(l.t))+'</option>'}).join('')+'<option value="-1"'+(i===-1?' selected':'')+'>✎ '+L('Free practice','Free practice')+'</option></select></label>'+
  '<div class="ls-nav"><button type="button" class="btn" id="clPrev"'+(i<=0?' disabled':'')+'>←</button><button type="button" class="btn" id="clNext"'+(i<0||i>=Ls.length-1?' disabled':'')+'>'+L('Next lesson','Agla lesson')+' →</button></div></div>';
 if(i<0){html+='<p class="ls-intro">'+L('A blank page for your own experiments. Use the snippet buttons above the editor to add pieces quickly, and hover over code to learn.','Aapke apne experiments ke liye khali page. Editor ke upar ke snippet buttons se cheezein jaldi jodo aur code par mouse rakh kar seekho.')+'</p>'}
 else{var l=Ls[i];html+='<p class="ls-intro">'+esc(pick(l.i))+'</p><ul class="ls-tasks" id="clTasks">'+l.tasks.map(function(t,k){return'<li data-k="'+k+'"><i></i><span>'+esc(pick([t[0],t[1]]))+'</span></li>'}).join('')+'</ul><p class="ls-tip">💡 '+esc(pick(l.tip))+'</p><div class="ls-bar"><div id="clProg" style="width:0"></div></div>'}
 html+='<div class="ls-foot"><button type="button" class="btn" id="clResetL">'+L('Reset this lesson','Ye lesson dobara shuru karo')+'</button><span id="clDoneMsg"></span></div>';
 lessonEl.innerHTML=html}
function checkTasks(){
 if(st.lesson<0)return;var l=D.LESSONS[st.lesson],ok=0,lis=$$('#clTasks li');
 l.tasks.forEach(function(t,k){var pass=t[3].test(code);if(lis[k])lis[k].classList.toggle('ok',pass);if(pass)ok++});
 var p=$('#clProg');if(p)p.style.width=Math.round(ok/l.tasks.length*100)+'%';
 var msg=$('#clDoneMsg');
 if(ok===l.tasks.length){if(!st.done[st.lesson]){st.done[st.lesson]=1;LS.set('cl_done',st.done);toast(L('Lesson complete! 🎉','Lesson poora hua! 🎉'));var o=$('#clSel option[value="'+st.lesson+'"]');if(o&&o.textContent.charAt(0)!=='✔')o.textContent='✔ '+o.textContent}if(msg)msg.textContent=L('All tasks done! Go to the next lesson.','Saare kaam ho gaye! Agle lesson par jao.');var nx=$('#clNext');if(nx)nx.classList.add('gold')}
 else{if(msg)msg.textContent=ok+' / '+l.tasks.length;var nx2=$('#clNext');if(nx2)nx2.classList.remove('gold')}}
function setLesson(i,keep){st.lesson=i;LS.set('cl_lesson',i);drawLesson();setCode(lessonCode(i));if(!keep)window.scrollTo&&0}
lessonEl.addEventListener('change',function(e){if(e.target.id==='clSel')setLesson(+e.target.value)});
lessonEl.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
 if(b.id==='clPrev')setLesson(st.lesson-1);else if(b.id==='clNext')setLesson(st.lesson+1);
 else if(b.id==='clResetL'){if(confirm(L('Reset the code of this lesson to the starting version?','Is lesson ka code shuruaati version par wapas karein?'))){LS.set('cl_code_'+st.lesson,null);var s=st.lesson<0?lessonCode(-1):D.LESSONS[st.lesson].code;setCode(s);LS.set('cl_code_'+st.lesson,s)}}});
/* ---------------- toolbar, snippets, panes ---------------- */
function toast(m){var t=$('#clToast');t.textContent=m;t.className='on';clearTimeout(toast._t);toast._t=setTimeout(function(){t.className=''},2600)}
$('#clSnip').innerHTML=D.SNIPS.map(function(s,i){return'<button type="button" data-i="'+i+'">+ '+s[0]+'</button>'}).join('');
function insBefore(re,text){var m=re.exec(ta.value);if(!m)return false;ta.setSelectionRange(m.index,m.index);ins(text);return true}
function indent(t,n){var pad=new Array(n+1).join(' ');return pad+t.replace(/\n(?!$)/g,'\n'+pad)}
$('#clSnip').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var s=D.SNIPS[+b.dataset.i][1],kind=s.charAt(0)==='<'?'h':/^document/.test(s)?'j':'c';
 if(kind==='h'){if(!insBefore(/<\/body>/i,indent(s,2)))ins(s)}
 else if(kind==='c'){if(!insBefore(/<\/style>/i,indent(s,4)))if(!insBefore(/<\/head>/i,'  <style>\n'+indent(s,4)+'  </style>\n'))ins('<style>\n'+s+'</style>\n')}
 else{if(!insBefore(/<\/script>/i,indent(s,4)))if(!insBefore(/<\/body>/i,'  <script>\n'+indent(s,4)+'  </script>\n'))ins('<script>\n'+s+'</script>\n')}
 jumpTo(ta.selectionStart,0)});
$('#clRun').onclick=run;
$('#clCopy').onclick=function(){var v=ta.value;(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(function(){toast(L('Code copied','Code copy ho gaya'))},function(){ta.select();try{document.execCommand('copy');toast(L('Code copied','Code copy ho gaya'))}catch(e){}})};
$('#clDl').onclick=function(){var b=new Blob([ta.value],{type:'text/html'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='index.html';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);toast(L('Saved as index.html','index.html ke roop me save hua'))};
$('#clFsM').onclick=function(){setFs(st.fs-1)};$('#clFsP').onclick=function(){setFs(st.fs+1)};
function setFs(n){st.fs=Math.max(11,Math.min(24,n));LS.set('cl_fs',st.fs);ed.style.setProperty('--fs',st.fs+'px');measure();render()}
$$('#clDev button').forEach(function(b){b.onclick=function(){$$('#clDev button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');frame.parentNode.style.setProperty('--fw',b.dataset.w)}});
$('#clConClr').onclick=function(){consoleEl.innerHTML='';conCount=0;$('#clConN').textContent=''};
function setLang(l){st.lang=l;LS.set('cl_lang',l);$$('#clLang button').forEach(function(b){b.classList.toggle('on',b.dataset.l===l)});drawLesson();checkTasks();doLint();lastTok=null;setExplain(null);staticText();$('#clSel')&&0}
$('#clLang').addEventListener('click',function(e){var b=e.target.closest('button');if(b)setLang(b.dataset.l)});
function staticText(){$$('[data-en]').forEach(function(el){el.textContent=st.lang==='hi'?el.dataset.hi:el.dataset.en})}
var panes=['Lesson','Code','Preview','Tips'];
function goPane(n){document.body.dataset.pane=n.toLowerCase();$$('.cl-tabs button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.p===n.toLowerCase()?'true':'false')})}
$('.cl-tabs').addEventListener('click',function(e){var b=e.target.closest('button');if(b)goPane(b.dataset.p)});
/* ---------------- boot ---------------- */
$$('#clLang button').forEach(function(b){b.classList.toggle('on',b.dataset.l===st.lang)});
ed.style.setProperty('--fs',st.fs+'px');
drawLesson();measure();
ta.value=lessonCode(st.lesson);render();run();doLint();checkTasks();setExplain(null);staticText();goPane('code');
window.addEventListener('resize',function(){measure()});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){measure()});
window.__cl={ta:ta,render:render,cur:cur,info:info,highlight:highlight,setLesson:setLesson,run:run,st:st};
})();
