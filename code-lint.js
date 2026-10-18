/* Code Lab linter: finds mistakes in HTML/CSS/JavaScript, Python, Java and Visual Basic as you type,
   draws a red (or amber) wavy line under them and shows a tap-to-open suggestion with a one-tap fix.
   Every message has English and Hinglish. Nothing leaves the browser. */
(function(root){
'use strict';
function lev(a,b){var m=a.length,n=b.length,d=[],i,j;if(Math.abs(m-n)>3)return 9;for(i=0;i<=m;i++){d[i]=[i]}for(j=1;j<=n;j++)d[0][j]=j;for(i=1;i<=m;i++)for(j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function near(w,list,ci){var best=null,bd=9,lw=ci?w.toLowerCase():w,lim=w.length<=3?1:w.length<=6?1:2;if(w.length<3)return null;
 for(var i=0;i<list.length;i++){var x=list[i],lx=ci?x.toLowerCase():x;if(Math.abs(lx.length-lw.length)>lim)continue;var d=lev(lw,lx);if(d<bd){bd=d;best=x}}return bd<=lim&&bd>0?best:null}
function mkIss(s,e,sev,en,hi,fix){if(e<=s)e=s+1;return{s:s,e:e,sev:sev,m:[en,hi],fix:fix||null}}
function lines(src){var L=[],o=0;src.split('\n').forEach(function(t){L.push({t:t,s:o,e:o+t.length});o+=t.length+1});return L}
function ws(t){return /^\s*/.exec(t)[0]}
var CLOSE={')':'(',']':'[','}':'{'},OPEN={'(':')','[':']','{':'}'};
/* shared bracket check on a masked text; returns issues */
function brackets(masked,sev,skipBrace){
 var st=[],out=[];for(var i=0;i<masked.length;i++){var c=masked[i];
  if(OPEN[c])st.push({c:c,i:i});
  else if(CLOSE[c]){if(skipBrace&&c==='}'&&false){}
   if(!st.length)out.push(mkIss(i,i+1,sev||'e','Extra "'+c+'". It has no opening "'+CLOSE[c]+'".','Faltu "'+c+'". Iska koi opening "'+CLOSE[c]+'" nahi hai.',{s:i,e:i+1,t:''}));
   else{var top=st.pop();if(top.c!==CLOSE[c]){out.push(mkIss(i,i+1,sev||'e','Wrong bracket: expected "'+OPEN[top.c]+'" to close the "'+top.c+'" above.','Galat bracket: upar ke "'+top.c+'" ko band karne ke liye "'+OPEN[top.c]+'" chahiye.',{s:i,e:i+1,t:OPEN[top.c]}))}}}}
 st.forEach(function(t){var eol=masked.indexOf('\n',t.i);if(eol<0)eol=masked.length;
  out.push(mkIss(t.i,t.i+1,sev||'e','This "'+t.c+'" is never closed. Add "'+OPEN[t.c]+'".','Ye "'+t.c+'" kabhi band nahi hua. "'+OPEN[t.c]+'" jodo.',{s:masked.length,e:masked.length,t:'\n'+OPEN[t.c],at:'end'}))});
 return out}

/* ================= PYTHON ================= */
var PY_KW='False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' ');
var PY_BI='print len range input int str float bool list dict set tuple type sum min max abs round sorted reversed enumerate zip map filter any all isinstance issubclass open format repr id ord chr hex bin oct pow divmod iter next object super staticmethod classmethod property Exception BaseException ValueError TypeError ZeroDivisionError IndexError KeyError NameError AttributeError RuntimeError StopIteration ImportError OSError FileNotFoundError KeyboardInterrupt AssertionError NotImplementedError callable hasattr getattr setattr delattr dir vars globals locals exit quit bytes bytearray complex frozenset slice hash help eval exec compile memoryview NotImplemented Ellipsis __name__ __file__ __doc__ self cls'.split(' ');
var PY_MODS={random:1,math:1,datetime:1,time:1,os:1,sys:1,json:1,re:1,string:1,statistics:1,collections:1,itertools:1};
var PY_TOP='print len range input int str float bool list dict set tuple type sum min max abs round sorted enumerate zip map filter open format isinstance'.split(' ');
function maskPy(src){var out=src.split(''),n=src.length,i=0,uns=[],tri=[];
 function blankStr(a,b){for(var k=a;k<b;k++)if(src[k]!=='\n')out[k]=' '}
 while(i<n){var c=src[i];
  if(c==='#'){while(i<n&&src[i]!=='\n'){out[i]=' ';i++}continue}
  if(c==='"'||c==="'"){var j=i-1,pre='';while(j>=0&&/[rRbBfFuU]/.test(src[j])&&i-j<=2){pre=src[j]+pre;j--}for(var k=j+1;k<i;k++)out[k]=' ';
   var isF=/f/i.test(pre),isT=src.substr(i,3)===c+c+c,q=isT?c+c+c:c,st=i;i+=q.length;var closed=false;
   while(i<n){
    if(src[i]==='\\'&&i+1<n){out[i]=' ';if(src[i+1]!=='\n')out[i+1]=' ';i+=2;continue}
    if(src.substr(i,q.length)===q){closed=true;i+=q.length;break}
    if(!isT&&src[i]==='\n')break;
    if(isF&&src[i]==='{'){if(src[i+1]==='{'){out[i]=' ';out[i+1]=' ';i+=2;continue}
     out[i]=' ';var d=1,k2=i+1;
     while(k2<n&&d>0&&src[k2]!=='\n'){var ch=src[k2];
      if(ch==='"'||ch==="'"){var e2=src.indexOf(ch,k2+1);if(e2<0)break;blankStr(k2+1,e2);k2=e2+1;continue}
      if(ch==='{')d++;else if(ch==='}'){d--;if(d===0)break}else if((ch===':'||ch==='!')&&d===1){while(k2<n&&src[k2]!=='}'&&src[k2]!=='\n'){out[k2]=' ';k2++}continue}
      k2++}
     if(src[k2]==='}')out[k2]=' ';i=k2+1;continue}
    if(src[i]!=='\n')out[i]=' ';i++}
   if(isT)tri.push({s:st,e:i});if(!closed&&!isT)uns.push({s:st,e:i,q:c});if(!closed&&isT)uns.push({s:st,e:i,q:q});continue}
  i++}
 return{m:out.join(''),uns:uns,tri:tri}}
function pyDefined(M){var def={},add=function(s){String(s).replace(/[A-Za-z_]\w*/g,function(w){def[w]=1})};
 var re;
 M.split('\n').forEach(function(l){
  var t=l.trim();
  var m=/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)?/.exec(t);if(m){def[m[1]]=1;m[2].split(',').forEach(function(p){var nm=/^\s*\**\s*([A-Za-z_]\w*)/.exec(p);if(nm)def[nm[1]]=1})}
  if((m=/^class\s+(\w+)/.exec(t)))def[m[1]]=1;
  re=/\bfor\s+([\w\s,()\[\]]+?)\s+in\b/g;while((m=re.exec(l)))add(m[1]);
  re=/\bas\s+(\w+)/g;while((m=re.exec(l)))def[m[1]]=1;
  re=/lambda\s*([^:]*):/g;while((m=re.exec(l)))m[1].split(',').forEach(function(p){var nm=/([A-Za-z_]\w*)/.exec(p);if(nm)def[nm[1]]=1});
  if((m=/^(?:from\s+[\w.]+\s+)?import\s+(.+)$/.exec(t))){m[1].split(',').forEach(function(p){var parts=p.trim().split(/\s+as\s+/);var nm=(parts[1]||parts[0]).trim().split('.')[0];if(nm&&nm!=='*')def[nm]=1})}
  if((m=/^(?:global|nonlocal)\s+(.+)$/.exec(t)))add(m[1]);
  re=/([A-Za-z_]\w*)\s*:=/g;while((m=re.exec(l)))def[m[1]]=1;
  /* assignment targets: text before an = that is not part of == <= >= != and is at bracket depth 0 */
  var depth=0,last=-1;for(var i=0;i<l.length;i++){var c=l[i];if('([{'.indexOf(c)>=0)depth++;else if(')]}'.indexOf(c)>=0)depth--;
   else if(c==='='&&depth===0&&l[i+1]!=='='&&'=!<>'.indexOf(l[i-1]||'')<0){var tgt=l.slice(last+1,i).replace(/[-+*\/%&|^@]+$|\/\/$|\*\*$|>>$|<<$/,'');
    if(!/^\s*(if|elif|while|return|assert|print)\b/.test(tgt)){tgt.replace(/(^|[,(\[\s*])([A-Za-z_]\w*)(?=\s*($|[,)\]]|:\s*[\w\[\]., ]+$))/g,function(a,b,w){if(PY_KW.indexOf(w)<0)def[w]=1})}
    last=i}}
 });return def}
function checkPy(src){
 var out=[],mk=maskPy(src),M=mk.m,L=lines(M),O=lines(src),i;
 /* strings */
 mk.uns.forEach(function(u){var lineEnd=src.indexOf('\n',u.s);if(lineEnd<0)lineEnd=src.length;
  out.push(mkIss(u.s,Math.min(u.s+1,src.length),'e','This text is not closed. Add the closing '+(u.q.length>1?'triple quote ':'quote ')+u.q+'.','Ye text band nahi hua. Aakhir me '+u.q+' lagao.',{s:u.q.length>1?src.length:lineEnd,e:u.q.length>1?src.length:lineEnd,t:u.q,at:'end'}))});
 /* brackets */
 out=out.concat(brackets(M));
 /* per line */
 var depth=0,indents=[0],prevCode=null,expectBlock=null;
 var inTri=function(off){return mk.tri.some(function(t){return off>t.s&&off<t.e})};
 for(i=0;i<L.length;i++){var ln=L[i],raw=O[i].t,t=ln.t,tr=t.trim(),lead=ws(raw),startDepth=depth;
  for(var k=0;k<t.length;k++){var c=t[k];if('([{'.indexOf(c)>=0)depth++;else if(')]}'.indexOf(c)>=0)depth--}
  if(depth<0)depth=0;
  var cont=startDepth>0||inTri(ln.s)||(prevCode&&/\\\s*$/.test(prevCode.raw));
  if(!tr){continue}
  var lastCh=raw.replace(/\s+$/,''),lastPos=O[i].s+lastCh.length;
  if(!cont){
   if(/\t/.test(lead)&&/ /.test(lead))out.push(mkIss(O[i].s,O[i].s+lead.length,'e','Tabs and spaces are mixed in the indent. Use only spaces.','Indent me tab aur space mile hue hain. Sirf space use karo.',{s:O[i].s,e:O[i].s+lead.length,t:lead.replace(/\t/g,'    ').replace(/[^ ]/g,' ')}));
   var ind=lead.replace(/\t/g,'    ').length;
   if(expectBlock!==null){
     if(ind<=expectBlock.ind)out.push(mkIss(O[i].s,O[i].s+Math.max(1,lead.length||1),'e','Expected an indented block after the line above ending with ":". Indent this line.','Upar ":" wali line ke baad aage (indent) likhna hai. Is line ko aage karo.',{s:O[i].s,e:O[i].s+lead.length,t:Array(expectBlock.ind+5).join(' ')}));
     else if(indents.indexOf(ind)<0)indents.push(ind);
     expectBlock=null}
   else{
     var top=indents[indents.length-1];
     if(ind>top&&prevCode&&!/:\s*$/.test(prevCode.m)){out.push(mkIss(O[i].s,O[i].s+Math.max(1,lead.length),'e','Unexpected indent. This line should line up with the one above.','Zaroorat se zyada indent hai. Ye line upar wali line ke barabar rakho.',{s:O[i].s,e:O[i].s+lead.length,t:Array(top+1).join(' ')}))}
     else if(ind<top){while(indents.length>1&&indents[indents.length-1]>ind)indents.pop();
       if(indents[indents.length-1]!==ind){var fx=indents[indents.length-1];out.push(mkIss(O[i].s,O[i].s+Math.max(1,lead.length||1),'e','This indent does not match any block above. Line it up with an earlier line.','Is indent ka upar ke kisi block se mel nahi hai. Kisi pichhli line ke barabar karo.',{s:O[i].s,e:O[i].s+lead.length,t:Array(fx+1).join(' ')}))}}}
   /* missing colon */
   var kw=/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/.exec(tr);
   if(kw&&depth===0&&!/:\s*(#.*)?$/.test(tr)&&!/:\s*\S/.test(tr.replace(/^(?:if|elif|while|for|with|def|class|except)\b/,''))){
     out.push(mkIss(lastPos-1,lastPos,'e','Missing ":" at the end of this '+kw[1]+' line.','Is '+kw[1]+' line ke aakhir me ":" chhoot gaya.',{s:lastPos,e:lastPos,t:':'}))}
   if(/:\s*$/.test(tr)&&depth===0){expectBlock={ind:ind}}
   /* else if / elseif */
   var em=/\belse\s+if\b/.exec(t);if(em)out.push(mkIss(ln.s+em.index,ln.s+em.index+em[0].length,'e','Python uses "elif", not "else if".','Python me "else if" nahi, "elif" likhte hain.',{s:ln.s+em.index,e:ln.s+em.index+em[0].length,t:'elif'}));
   /* = in condition */
   var cm=/^\s*(if|elif|while)\b/.exec(t);if(cm){var d2=0;for(var q=cm[0].length;q<t.length;q++){var ch=t[q];if('([{'.indexOf(ch)>=0)d2++;else if(')]}'.indexOf(ch)>=0)d2--;
     else if(ch==='='&&d2===0&&t[q+1]!=='='&&'=!<>:'.indexOf(t[q-1])<0){out.push(mkIss(ln.s+q,ln.s+q+1,'e','A single "=" stores a value. To compare, use "==".','Ek "=" value rakhta hai. Compare karne ke liye "==" likho.',{s:ln.s+q,e:ln.s+q+1,t:'=='}));break}}}
   /* python 2 print */
   var pm=/^(\s*)print\s+(?=["'\w])/.exec(t);if(pm&&!/^\s*print\s*(=|\.)/.test(t)){var rest=raw.slice(pm[0].length).replace(/\s+$/,'');out.push(mkIss(ln.s+pm[1].length,ln.s+pm[1].length+5,'e','In Python 3, print needs brackets: print(...).','Python 3 me print ke saath bracket lagte hain: print(...).',{s:O[i].s+pm[0].length-0,e:O[i].s+raw.replace(/\s+$/,'').length,t:'('+rest+')',pre:{s:O[i].s+pm[1].length+5,e:O[i].s+pm[0].length,t:''}}))}
   /* ++ -- */
   var inc=/\b([A-Za-z_]\w*)\s*(\+\+|--)\s*$/.exec(t);if(inc)out.push(mkIss(ln.s+inc.index,ln.s+inc.index+inc[0].length,'e','Python has no '+inc[2]+'. Write '+inc[1]+' '+(inc[2]==='++'?'+=':'-=')+' 1.','Python me '+inc[2]+' nahi hota. '+inc[1]+' '+(inc[2]==='++'?'+=':'-=')+' 1 likho.',{s:ln.s+inc.index,e:ln.s+inc.index+inc[0].length,t:inc[1]+(inc[2]==='++'?' += 1':' -= 1')}));
   /* ; at end */
   if(/;\s*$/.test(t)&&depth===0)out.push(mkIss(lastPos-1,lastPos,'w','Python does not need ";" at the end of a line.','Python me line ke aakhir me ";" ki zaroorat nahi.',{s:lastPos-1,e:lastPos,t:''}));
  }
  /* operators and words from other languages */
  var re,m;
  re=/&&|\|\|/g;while((m=re.exec(t)))out.push(mkIss(ln.s+m.index,ln.s+m.index+2,'e','Python uses the words "and" / "or", not '+m[0]+'.','Python me '+m[0]+' nahi, "and" / "or" shabd likhte hain.',{s:ln.s+m.index,e:ln.s+m.index+2,t:m[0]==='&&'?'and':'or'}));
  re=/\b(true|false|null|nil|NULL)\b/g;while((m=re.exec(t))){if(t[m.index-1]==='.')continue;var rp={true:'True',false:'False',null:'None',nil:'None',NULL:'None'}[m[1]];out.push(mkIss(ln.s+m.index,ln.s+m.index+m[1].length,'e','In Python write '+rp+' (capital first letter) .','Python me '+rp+' likhte hain.',{s:ln.s+m.index,e:ln.s+m.index+m[1].length,t:rp}))}
  prevCode={m:t,raw:raw}}
 /* names */
 var def=pyDefined(M),known={};PY_KW.concat(PY_BI).forEach(function(w){known[w]=1});
 var allNames=Object.keys(def).concat(PY_BI);var seen={};
 var re2=/[A-Za-z_]\w*/g,m2;
 while((m2=re2.exec(M))){var w=m2[0],p=m2.index;
  if(known[w]||def[w])continue;
  var before=M.slice(Math.max(0,p-1),p),pc=M.slice(0,p).replace(/[ \t]+$/,'').slice(-1);
  if(pc==='.')continue;
  if(/^\d/.test(M[p-1]||''))continue;
  var after=M.slice(p+w.length).replace(/^[ \t]*/,'');
  /* keyword argument name inside brackets: name= */
  if(/^=(?!=)/.test(after)){var dd=0;for(var z=p-1;z>=0&&M[z]!=='\n';z--){if(')]}'.indexOf(M[z])>=0)dd++;else if('([{'.indexOf(M[z])>=0){if(dd===0){dd=-1;break}dd--}}if(dd===-1)continue}
  /* only lines where it is a use */
  var key=w+'@'+p;if(seen[key])continue;seen[key]=1;
  if(PY_MODS[w]&&/^\./.test(after)){out.push(mkIss(p,p+w.length,'e',w+' is a module. Add "import '+w+'" at the top.',w+' ek module hai. Sabse upar "import '+w+'" likho.',{s:0,e:0,t:'import '+w+'\n'}));continue}
  var sug=near(w,allNames,true),isCall=/^\(/.test(after);
  if(sug)out.push(mkIss(p,p+w.length,'e','"'+w+'" is not defined. Did you mean "'+sug+'"?','"'+w+'" define nahi hua. Kya aapka matlab "'+sug+'" hai?',{s:p,e:p+w.length,t:sug}));
  else out.push(mkIss(p,p+w.length,'e','"'+w+'" is not defined. '+(isCall?'Create the function first with def '+w+'():':'Give it a value first, for example '+w+' = 0.'),'"'+w+'" define nahi hua. '+(isCall?'Pehle def '+w+'(): se function banao.':'Pehle uski value likho, jaise '+w+' = 0.'),null))}
 return out}

/* ================= JAVA ================= */
var JAVA_KW='abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var record'.split(' ');
var JAVA_API='System out in err println print printf String Integer Double Boolean Character Long Float Math Object Exception ArrayList List HashMap Map HashSet Set Scanner Arrays Collections LinkedList Random StringBuilder Override length size add get set remove contains equals substring toUpperCase toLowerCase charAt indexOf trim isEmpty parseInt parseDouble valueOf toString max min sqrt pow abs floor ceil round random nextInt nextLine nextDouble sort main args IndexOutOfBoundsException ArrayIndexOutOfBoundsException ArithmeticException NullPointerException NumberFormatException RuntimeException IllegalArgumentException equalsIgnoreCase startsWith endsWith replace split join format compareTo hashCode'.split(' ');
function maskJava(src){var out=src.split(''),n=src.length,i=0,uns=[];
 while(i<n){var c=src[i],d=src[i+1];
  if(c==='/'&&d==='/'){while(i<n&&src[i]!=='\n'){out[i]=' ';i++}continue}
  if(c==='/'&&d==='*'){var e=src.indexOf('*/',i+2);if(e<0)e=n-2;for(var k=i;k<e+2&&k<n;k++)if(src[k]!=='\n')out[k]=' ';i=e+2;continue}
  if(c==='"'||c==="'"){var st=i;i++;var closed=false;while(i<n){if(src[i]==='\\'){out[i]=' ';if(i+1<n&&src[i+1]!=='\n')out[i+1]=' ';i+=2;continue}if(src[i]===c){closed=true;i++;break}if(src[i]==='\n')break;out[i]=' ';i++}
   if(!closed)uns.push({s:st,e:i,q:c});continue}
  i++}
 return{m:out.join(''),uns:uns}}
function javaDeclared(M){var def={};var re=/\b(?:int|double|float|long|short|byte|char|boolean|String|var|[A-Z]\w*(?:<[^>;()]*>)?)(?:\[\])*\s+([a-z_]\w*)\s*(?==|;|,|\)|:|$)/gm,m;while((m=re.exec(M)))def[m[1]]=1;
 re=/\b(?:class|interface|enum)\s+(\w+)/g;while((m=re.exec(M)))def[m[1]]=1;
 re=/\b(?:int|double|float|long|char|boolean|String|void|[A-Z]\w*)(?:\[\])*\s+(\w+)\s*\(([^)]*)\)/g;while((m=re.exec(M))){def[m[1]]=1;m[2].split(',').forEach(function(p){var nm=/(\w+)\s*$/.exec(p.trim());if(nm)def[nm[1]]=1})}
 re=/,\s*(?:int|double|String|char|long|boolean)?\s*([a-z_]\w*)\s*=/g;while((m=re.exec(M)))def[m[1]]=1;
 return def}
function checkJava(src){
 var out=[],mk=maskJava(src),M=mk.m,L=lines(M),O=lines(src),i;
 mk.uns.forEach(function(u){var tx=src.slice(u.s,u.e);
  if(u.q==="'"&&/^'[^']{2,}'$/.test(tx)){out.push(mkIss(u.s,u.e,'e','Single quotes hold ONE character. For text use double quotes.','Single quote me sirf EK akshar aata hai. Text ke liye double quote use karo.',{s:u.s,e:u.e,t:'"'+tx.slice(1,-1)+'"'}));return}
  var eol=src.indexOf('\n',u.s);if(eol<0)eol=src.length;out.push(mkIss(u.s,u.s+1,'e','This text is not closed. Add the closing '+u.q+'.','Ye text band nahi hua. Aakhir me '+u.q+' lagao.',{s:eol,e:eol,t:u.q,at:'end'}))});
 /* single quoted multi char that closed */
 var re=/'([^'\\\n]{2,})'/g,m,srcMask=src;while((m=re.exec(src))){if(M[m.index]==="'"&&M[m.index+1]===' '){out.push(mkIss(m.index,m.index+m[0].length,'e','Single quotes hold ONE character. For text use double quotes.','Single quote me sirf EK akshar aata hai. Text ke liye double quote use karo.',{s:m.index,e:m.index+m[0].length,t:'"'+m[1]+'"'}))}}
 out=out.concat(brackets(M));
 var def=javaDeclared(M),known={};JAVA_KW.concat(JAVA_API).forEach(function(w){known[w]=1});
 var depth=0,nextNon=function(j){for(var q=j+1;q<L.length;q++)if(L[q].t.trim())return L[q].t.trim();return''};
 for(i=0;i<L.length;i++){var t=L[i].t,tr=t.trim(),raw=O[i].t,rt=raw.replace(/\s+$/,''),end=O[i].s+rt.length,startD=depth;
  for(var k=0;k<t.length;k++){var c=t[k];if(c==='(')depth++;else if(c===')')depth--}
  if(!tr)continue;
  /* missing semicolon */
  var last=tr[tr.length-1],nx=nextNon(i),stmt=false;
  if(depth===0&&startD===0&&!/[;{},(:]$/.test(tr)&&!/^[})]/.test(nx)||(depth===0&&startD===0&&/^[}]/.test(nx)&&!/[;{},(:]$/.test(tr))){
   if(/^(import|package)\b/.test(tr))stmt=true;
   else if(/^(return|break|continue|throw)\b/.test(tr))stmt=true;
   else if(/(^|[^=!<>])=(?!=)/.test(tr)&&!/^(if|for|while|else|switch)\b/.test(tr)&&!/->$/.test(tr))stmt=true;
   else if(/(\+\+|--)$/.test(tr))stmt=true;
   else if(/\)$/.test(tr)&&/^[A-Za-z_][\w.<>\[\]]*(\([^;]*\))+$/.test(tr)&&!/^(if|for|while|switch|catch|synchronized|else)\b/.test(tr)&&!/^(?:(?:public|private|protected|static|final|abstract|synchronized)\s+)*[\w<>\[\],]+\s+\w+\s*\(/.test(tr)&&!/^(?:public|private|protected|static|final|abstract|synchronized)\b/.test(tr))stmt=true;
   else if(/^(?:int|double|float|long|char|boolean|String|byte|short)(?:\[\])?\s+\w+$/.test(tr))stmt=true;
   if(stmt&&!/^\s*@/.test(tr)&&!/^(\/\/|\*)/.test(tr))out.push(mkIss(end-1,end,'e','Missing ";" at the end of this line.','Is line ke aakhir me ";" chhoot gaya.',{s:end,e:end,t:';'}))}
  /* = in condition */
  var cm=/\b(if|while)\s*\(/.exec(t);if(cm){var d2=1,q2=cm.index+cm[0].length;for(;q2<t.length&&d2>0;q2++){var ch=t[q2];if(ch==='(')d2++;else if(ch===')'){d2--;if(!d2)break}else if(ch==='='&&d2===1&&t[q2+1]!=='='&&'=!<>'.indexOf(t[q2-1])<0){out.push(mkIss(L[i].s+q2,L[i].s+q2+1,'e','A single "=" stores a value. To compare, use "==".','Ek "=" value rakhta hai. Compare karne ke liye "==" likho.',{s:L[i].s+q2,e:L[i].s+q2+1,t:'=='}));break}}}
  /* string == */
  var sm=/([A-Za-z_][\w.]*)\s*(==|!=)\s*"/.exec(raw);
  if(sm){var rs=raw.indexOf('"',sm.index+sm[0].length-1),re3=raw.indexOf('"',rs+1);if(re3>0){var lit=raw.slice(rs,re3+1),neg=sm[2]==='!=',a=O[i].s+sm.index,b=O[i].s+re3+1;out.push(mkIss(O[i].s+sm.index+sm[1].length,O[i].s+sm.index+sm[0].length,'e','Compare Strings with .equals(), not '+sm[2]+'.','Strings ko .equals() se compare karo, '+sm[2]+' se nahi.',{s:a,e:b,t:(neg?'!':'')+sm[1]+'.equals('+lit+')'}))}}
  var sm2=/"([^"\n]*)"\s*(==|!=)\s*([A-Za-z_][\w.]*)/.exec(raw);if(sm2&&!sm){var neg2=sm2[2]==='!=';out.push(mkIss(O[i].s+sm2.index,O[i].s+sm2.index+sm2[0].length,'e','Compare Strings with .equals(), not '+sm2[2]+'.','Strings ko .equals() se compare karo, '+sm2[2]+' se nahi.',{s:O[i].s+sm2.index,e:O[i].s+sm2.index+sm2[0].length,t:(neg2?'!':'')+sm2[3]+'.equals("'+sm2[1]+'")'}))}
  /* other-language habits */
  var mm;
  if((mm=/\belif\b|\belseif\b/.exec(t)))out.push(mkIss(L[i].s+mm.index,L[i].s+mm.index+mm[0].length,'e','Java uses "else if" (two words).','Java me "else if" (do shabd) likhte hain.',{s:L[i].s+mm.index,e:L[i].s+mm.index+mm[0].length,t:'else if'}));
  re=/\b(and|or)\b/g;while((mm=re.exec(t))){if(/^\s*(import|package)/.test(t))break;out.push(mkIss(L[i].s+mm.index,L[i].s+mm.index+mm[0].length,'e','Java uses "'+(mm[1]==='and'?'&&':'||')+'" for "'+mm[1]+'".','Java me "'+mm[1]+'" ki jagah "'+(mm[1]==='and'?'&&':'||')+'" likhte hain.',{s:L[i].s+mm.index,e:L[i].s+mm.index+mm[0].length,t:mm[1]==='and'?'&&':'||'}))}
  re=/\b(True|False|None)\b/g;while((mm=re.exec(t))){var rp={True:'true',False:'false',None:'null'}[mm[1]];out.push(mkIss(L[i].s+mm.index,L[i].s+mm.index+mm[1].length,'e','In Java write '+rp+' (small letters).','Java me '+rp+' (chhote letters me) likhte hain.',{s:L[i].s+mm.index,e:L[i].s+mm.index+mm[1].length,t:rp}))}
  if((mm=/(^|[^.\w])print\s*\(/.exec(t))&&!/System\s*\.\s*out/.test(t)){var pp=L[i].s+mm.index+mm[1].length;out.push(mkIss(pp,pp+5,'e','In Java, print is System.out.println(...).','Java me print ki jagah System.out.println(...) likhte hain.',{s:pp,e:pp+5,t:'System.out.println'}))}
 }
 /* word typos */
 var all=Object.keys(def).concat(JAVA_KW,JAVA_API),re4=/[A-Za-z_]\w*/g,m4;
 while((m4=re4.exec(M))){var w=m4[0],p=m4.index;if(known[w]||def[w])continue;
  var lw=w.toLowerCase(),cs=null;for(var z=0;z<JAVA_KW.length+JAVA_API.length;z++){var kk=z<JAVA_KW.length?JAVA_KW[z]:JAVA_API[z-JAVA_KW.length];if(kk.toLowerCase()===lw&&kk!==w){cs=kk;break}}
  var sug=cs||(w.length>=4?near(w,all,false):null);
  if(sug&&!def[w])out.push(mkIss(p,p+w.length,'e','"'+w+'" looks like a spelling mistake. Did you mean "'+sug+'"?','"'+w+'" spelling galat lagti hai. Kya aapka matlab "'+sug+'" hai?',{s:p,e:p+w.length,t:sug}))}
 return out}

/* ================= VISUAL BASIC ================= */
var VB_KW='AddHandler AddressOf And AndAlso As Boolean ByRef Byte ByVal Call Case Catch Char Class Const Continue Date Decimal Declare Default Dim DirectCast Do Double Each Else ElseIf End Enum Error Event Exit False Finally For Friend Function Get GoTo Handles If Implements Imports In Inherits Integer Interface Is Let Lib Like Long Loop Me Mod Module MustInherit MustOverride MyBase MyClass Namespace Narrowing New Next Not Nothing NotInheritable NotOverridable Object Of On Operator Option Optional Or OrElse Overloads Overridable Overrides ParamArray Partial Private Property Protected Public RaiseEvent ReadOnly ReDim Rem Resume Return Select Set Shadows Shared Short Single Static Step Stop String Structure Sub SyncLock Then Throw To True Try TryCast TypeOf Using Variant Wend When While With WithEvents WriteOnly Xor Console WriteLine ReadLine Write ToString ToUpper ToLower Substring Length Count Add Remove Contains Join Split Trim Replace Format Parse TryParse Sqrt Pow Abs Round Max Min Random Math List Dictionary Exception IndexOutOfRangeException DivideByZeroException InvalidCastException FormatException System Collections Generic Main args Equals IndexOf Clear Sort Reverse Insert RemoveAt Item Keys Values ContainsKey Floor Ceiling Truncate Sign PadLeft PadRight StartsWith EndsWith IsNullOrEmpty Concat Compare Chars Message Line Out Error Today Now Year Month Day Hour Minute Second Timer Thread Sleep Console ReadKey Clear Beep Title ForegroundColor ResetColor Text Linq ToList ToArray First Last Any Sum Average OrderBy Where Select Ceiling IsNumeric CInt CStr CDbl CBool CLng CDate Int Fix Rnd Randomize Len Left Right Mid UCase LCase Trim LTrim RTrim InStr Chr Asc MsgBox InputBox Val Str Space String Now Date Time'.split(' ');
var VB_TYPES='Integer String Double Boolean Char Long Short Byte Single Decimal Date Object UInteger ULong UShort SByte'.split(' ');
function maskVb(src){var out=src.split(''),n=src.length,i=0,uns=[];
 while(i<n){var c=src[i];
  if(c==="'"||(/^rem\b/i.test(src.substr(i,4))&&/(^|\n)[ \t]*$/.test(src.slice(Math.max(0,src.lastIndexOf('\n',i-1)+1),i)))){while(i<n&&src[i]!=='\n'){out[i]=' ';i++}continue}
  if(c==='"'){var st=i;i++;var closed=false;while(i<n){if(src[i]==='"'){if(src[i+1]==='"'){out[i]=' ';out[i+1]=' ';i+=2;continue}closed=true;i++;break}if(src[i]==='\n')break;out[i]=' ';i++}
   if(!closed)uns.push({s:st,e:i});continue}
  i++}
 return{m:out.join(''),uns:uns}}
var VB_BLK=[['Module','End Module'],['Class','End Class'],['Sub','End Sub'],['Function','End Function'],['If','End If'],['Select','End Select'],['Try','End Try'],['With','End With'],['Using','End Using'],['Namespace','End Namespace'],['Structure','End Structure'],['Interface','End Interface'],['Enum','End Enum'],['While','End While'],['For','Next'],['Do','Loop'],['Property','End Property']];
function checkVb(src){
 var out=[],mk=maskVb(src),M=mk.m,L=lines(M),O=lines(src),i,stack=[];
 mk.uns.forEach(function(u){var eol=src.indexOf('\n',u.s);if(eol<0)eol=src.length;out.push(mkIss(u.s,u.s+1,'e','This text is not closed. Add the closing ".','Ye text band nahi hua. Aakhir me " lagao.',{s:eol,e:eol,t:'"',at:'end'}))});
 var declared={},m;
 M.replace(/\b(?:Dim|Const|ReDim)\s+(\w+)/gi,function(a,b){declared[b.toLowerCase()]=1;return a});
 M.replace(/\b(?:Sub|Function|Class|Module|Structure|Enum|Interface|Property|Namespace)\s+(\w+)/gi,function(a,b){declared[b.toLowerCase()]=1;return a});
 M.replace(/\bFor\s+(?:Each\s+)?(\w+)/gi,function(a,b){declared[b.toLowerCase()]=1;return a});
 M.replace(/\bCatch\s+(\w+)/gi,function(a,b){declared[b.toLowerCase()]=1;return a});
 M.replace(/\b(?:ByVal|ByRef|Optional)?\s*(\w+)\s+As\s+/gi,function(a,b){declared[b.toLowerCase()]=1;return a});
 M.replace(/\bUsing\s+(\w+)/gi,function(a,b){declared[b.toLowerCase()]=1;return a});
 var known={};VB_KW.forEach(function(w){known[w.toLowerCase()]=1});
 for(i=0;i<L.length;i++){var t=L[i].t,tr=t.trim(),raw=O[i].t,s0=L[i].s,rt=raw.replace(/\s+$/,''),end=O[i].s+rt.length;if(!tr)continue;
  var cont=i>0&&/_\s*$/.test(L[i-1].t);
  var T=tr.replace(/^\d+\s+/,'');
  /* paren balance per line */
  if(!/_\s*$/.test(tr)&&!cont){var d=0,first=-1;for(var k=0;k<t.length;k++){if(t[k]==='('){if(d===0)first=k;d++}else if(t[k]===')'){d--;if(d<0){out.push(mkIss(s0+k,s0+k+1,'e','Extra ")" on this line.','Is line me faltu ")" hai.',{s:s0+k,e:s0+k+1,t:''}));d=0}}}
   if(d>0)out.push(mkIss(s0+first,s0+first+1,'e','This "(" is not closed on this line. Add ")".','Is line me "(" band nahi hua. ")" jodo.',{s:end,e:end,t:')'.repeat(d)}))}
  /* blocks */
  var lead=ws(t).length,lc=T.toLowerCase();
  var open=null,close=null;
  if(/^(public|private|protected|friend|shared|overrides|overridable|mustoverride|static|partial|shadows|readonly|notinheritable|mustinherit|overloads)\s/i.test(T))T=T.replace(/^((public|private|protected|friend|shared|overrides|overridable|mustoverride|static|partial|shadows|readonly|notinheritable|mustinherit|overloads)\s+)+/i,'');
  lc=T.toLowerCase();
  var em=/^end\s+(module|class|sub|function|if|select|try|with|using|namespace|structure|interface|enum|while|property)\b/i.exec(T);
  if(em)close=em[1].toLowerCase();
  else if(/^next\b/i.test(T))close='for';
  else if(/^loop\b/i.test(T))close='do';
  else if(/^wend\b/i.test(T))close='while';
  else if(!/^(exit|continue)\b/i.test(T)){
   if(/^(module|class|sub|function|namespace|structure|interface|enum|property|try|with|using|while|do)\b/i.test(T)){var wd=/^(\w+)/.exec(T)[1].toLowerCase();if(!(wd==='do'&&false))open=wd;if(wd==='sub'&&/^\s*sub\s+\w+.*\bEnd Sub\b/i.test(T))open=null}
   else if(/^select\s+case\b/i.test(T))open='select';
   else if(/^for\b/i.test(T))open='for';
   else if(/^if\b/i.test(T)){var th=/\bthen\b\s*(.*)$/i.exec(T);open=th&&th[1].trim()===''?'if':null}
   else if(/^(public|private|protected|friend|dim)\b/i.test(T)){}}
  if(open&&!/^(if)$/.test(open)||open==='if'){stack.push({k:open,i:i,s:s0+lead,e:s0+lead+open.length})}
  if(close){var top=stack[stack.length-1];
   if(top&&top.k===close)stack.pop();
   else if(top){var needs=VB_BLK.filter(function(b){return b[0].toLowerCase()===top.k})[0][1];out.push(mkIss(s0+lead,s0+lead+T.length,'e','Expected "'+needs+'" here, but found "'+T.split(/\s+/).slice(0,2).join(' ')+'".','Yahan "'+needs+'" chahiye tha, par "'+T.split(/\s+/).slice(0,2).join(' ')+'" mila.',{s:O[i].s+lead,e:O[i].s+lead,t:needs+'\n'+ws(raw)}));stack.pop();if(stack.length&&stack[stack.length-1].k===close)stack.pop()}
   else out.push(mkIss(s0+lead,s0+lead+T.length,'e','"'+T.split(/\s+/).slice(0,2).join(' ')+'" has nothing to close. Remove it.','"'+T.split(/\s+/).slice(0,2).join(' ')+'" ka koi shuru wala block nahi hai. Ise hatao.',{s:O[i].s,e:O[i].s+raw.length+1,t:''}))}
  /* If / ElseIf without Then */
  if(/^(if|elseif)\b/i.test(T)&&!/\bthen\b/i.test(T)&&!/_\s*$/.test(tr)){out.push(mkIss(end-1,end,'e','Missing "Then" at the end of this '+(/^if/i.test(T)?'If':'ElseIf')+' line.','Is '+(/^if/i.test(T)?'If':'ElseIf')+' line ke aakhir me "Then" chhoot gaya.',{s:end,e:end,t:' Then'}))}
  if(/^else\s+if\b/i.test(T)){var ei=O[i].s+lead;out.push(mkIss(ei,ei+7,'e','Write "ElseIf" as one word. "Else If" starts a new block.','"ElseIf" ek shabd me likho. "Else If" naya block shuru karta hai.',{s:ei,e:ei+7,t:'ElseIf'}))}
  if(/^elif\b/i.test(T)){var ei2=O[i].s+lead;out.push(mkIss(ei2,ei2+4,'e','Visual Basic uses "ElseIf".','Visual Basic me "ElseIf" likhte hain.',{s:ei2,e:ei2+4,t:'ElseIf'}))}
  /* For needs To */
  if(/^for\b(?!\s+each)/i.test(T)&&!/\bto\b/i.test(T))out.push(mkIss(s0+lead,s0+lead+3,'e','A For loop needs "To", for example For i = 1 To 10.','For loop me "To" chahiye, jaise For i = 1 To 10.',null));
  if(/^for\s+each\b/i.test(T)&&!/\bin\b/i.test(T))out.push(mkIss(s0+lead,s0+lead+8,'e','For Each needs "In", for example For Each x In items.','For Each me "In" chahiye, jaise For Each x In items.',null));
  /* C style operators */
  var re=/==|!=|&&|\|\||\+\+|--|;\s*$/g,mm;
  while((mm=re.exec(t))){var op=mm[0].trim(),rep={'==':'=','!=':'<>','&&':'AndAlso','||':'OrElse','++':' += 1','--':' -= 1',';':''}[op],nm={'==':'compare with a single "="','!=':'"not equal" is <>','&&':'use AndAlso','||':'use OrElse','++':'use += 1','--':'use -= 1',';':'no ";" at the end'}[op];
   var nh={'==':'compare ke liye ek "=" likho','!=':'"barabar nahi" ke liye <> likho','&&':'AndAlso likho','||':'OrElse likho','++':'+= 1 likho','--':'-= 1 likho',';':'aakhir me ";" nahi lagta'}[op];
   if(op==='--'&&/\w\s*--\s*$/.test(t)===false)continue;if(op==='++'&&/\w\s*\+\+\s*$/.test(t)===false&&!/\+\+\s*\w/.test(t))continue;
   out.push(mkIss(s0+mm.index,s0+mm.index+mm[0].length,op===';'?'w':'e','This is not Visual Basic: '+nm+'.','Ye Visual Basic nahi hai: '+nh+'.',{s:s0+mm.index,e:s0+mm.index+op.length,t:rep}))}
  /* Console.WriteLine without brackets */
  var cw=/Console\s*\.\s*(WriteLine|Write|ReadLine)\s+(?=\S)/i.exec(t);if(cw){var rs=cw.index+cw[0].length,body=rt.slice(rs);out.push(mkIss(s0+cw.index,s0+cw.index+cw[0].length-1,'e','Console.'+cw[1]+' needs brackets: Console.'+cw[1]+'(...).','Console.'+cw[1]+' ke saath bracket lagte hain: Console.'+cw[1]+'(...).',{s:O[i].s+cw.index+cw[0].length-1,e:end,t:'('+body+')'}))}
  /* + joining text and numbers */
  var pr=/"\s*\+\s*[A-Za-z_(]|[A-Za-z_)\]]\s*\+\s*"/.exec(t);if(pr){var pi=t.indexOf('+',pr.index);out.push(mkIss(s0+pi,s0+pi+1,'w','Use "&" to join text with numbers or variables.','Text ko number ya variable se jodne ke liye "&" use karo.',{s:s0+pi,e:s0+pi+1,t:'&'}))}
  /* type after As */
  var as=/\bAs\s+(?:New\s+)?([A-Za-z_]\w*)/gi;while((m=as.exec(t))){var ty=m[1],tl=ty.toLowerCase();var kn=VB_TYPES.concat(['List','Dictionary','Object','Exception','Random','StringBuilder','Array']).map(function(x){return x.toLowerCase()});
   if(kn.indexOf(tl)>=0||declared[tl]||/^(system|collections)/.test(tl))continue;var mp={int:'Integer',bool:'Boolean',float:'Double',str:'String',number:'Integer'}[tl],sg=mp||near(ty,VB_TYPES.concat(Object.keys(declared)),true);
   var p0=s0+m.index+m[0].length-ty.length;
   if(sg)out.push(mkIss(p0,p0+ty.length,'e','"'+ty+'" is not a Visual Basic type. Did you mean "'+sg+'"?','"'+ty+'" Visual Basic ka type nahi hai. Kya aapka matlab "'+sg+'" hai?',{s:p0,e:p0+ty.length,t:sg}))}
 }
 stack.forEach(function(b){var needs=VB_BLK.filter(function(x){return x[0].toLowerCase()===b.k})[0][1];out.push(mkIss(b.s,b.e,'e','This block is never closed. Add "'+needs+'".','Ye block kabhi band nahi hua. "'+needs+'" jodo.',{s:src.length,e:src.length,t:(src.endsWith('\n')?'':'\n')+needs+'\n',at:'end'}))});
 /* word typos */
 var all=VB_KW.concat(Object.keys(declared)),re5=/[A-Za-z_]\w*/g,m5;
 while((m5=re5.exec(M))){var w=m5[0],p=m5.index,lw=w.toLowerCase();if(known[lw]||declared[lw]||w.length<4)continue;
  var pc=M[p-1];if(pc==='.'){/* members: only check after Console. / Math. / String. */var pre=M.slice(Math.max(0,p-9),p);if(!/(Console|Math|String)\.$/i.test(pre))continue}
  var sug=near(w,all,true);if(sug&&sug.toLowerCase()!==lw)out.push(mkIss(p,p+w.length,'e','"'+w+'" looks like a spelling mistake. Did you mean "'+sug+'"?','"'+w+'" spelling galat lagti hai. Kya aapka matlab "'+sug+'" hai?',{s:p,e:p+w.length,t:sug}))}
 return out}

/* ================= HTML / CSS / JavaScript ================= */
var TAGS='html head body title meta link style script noscript div span p a img ul ol li h1 h2 h3 h4 h5 h6 br hr b i u em strong small mark sub sup code pre blockquote q cite abbr table thead tbody tfoot tr th td caption colgroup col form input button select option optgroup textarea label fieldset legend datalist output progress meter header footer nav main section article aside figure figcaption details summary dialog video audio source track canvas svg path circle rect line g defs use text polygon polyline ellipse iframe embed object picture template slot base address time data dl dt dd del ins kbd samp var wbr bdi bdo ruby rt rp s menu'.split(' ');
var VOID={area:1,base:1,br:1,col:1,embed:1,hr:1,img:1,input:1,link:1,meta:1,source:1,track:1,wbr:1,path:1,circle:1,rect:1,line:1,polygon:1,polyline:1,ellipse:1,use:1};
var OPTC={p:1,li:1,td:1,th:1,tr:1,thead:1,tbody:1,tfoot:1,option:1,html:1,body:1,head:1,dt:1,dd:1,colgroup:1};
var ATTRS='class id style href src alt title type name value placeholder for rel target width height lang charset content action method required disabled checked selected readonly autofocus autocomplete min max step maxlength minlength pattern rows cols colspan rowspan tabindex role hidden draggable contenteditable spellcheck download controls autoplay loop muted poster preload srcset sizes media viewBox xmlns fill stroke d cx cy r x y points transform href accept multiple enctype novalidate label open dir translate async defer integrity crossorigin loading wrap form list inputmode enterkeyhint is slot part nonce referrerpolicy sandbox allow allowfullscreen scope headers abbr span start reversed datetime cite'.split(' ');
var CSSP='align-content align-items align-self animation animation-delay animation-direction animation-duration animation-fill-mode animation-iteration-count animation-name animation-play-state animation-timing-function aspect-ratio backdrop-filter backface-visibility background background-attachment background-clip background-color background-image background-origin background-position background-repeat background-size border border-bottom border-bottom-color border-bottom-left-radius border-bottom-right-radius border-bottom-style border-bottom-width border-collapse border-color border-image border-left border-left-color border-left-style border-left-width border-radius border-right border-right-color border-right-style border-right-width border-spacing border-style border-top border-top-color border-top-left-radius border-top-right-radius border-top-style border-top-width border-width bottom box-shadow box-sizing caption-side caret-color clear clip-path color column-count column-gap columns content counter-increment counter-reset cursor direction display empty-cells filter flex flex-basis flex-direction flex-flow flex-grow flex-shrink flex-wrap float font font-family font-size font-style font-variant font-weight gap grid grid-area grid-auto-columns grid-auto-flow grid-auto-rows grid-column grid-column-end grid-column-start grid-gap grid-row grid-row-end grid-row-start grid-template grid-template-areas grid-template-columns grid-template-rows height inset isolation justify-content justify-items justify-self left letter-spacing line-height list-style list-style-image list-style-position list-style-type margin margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width mix-blend-mode object-fit object-position opacity order outline outline-color outline-offset outline-style outline-width overflow overflow-wrap overflow-x overflow-y padding padding-bottom padding-left padding-right padding-top perspective place-content place-items place-self pointer-events position quotes resize right rotate row-gap scale scroll-behavior scroll-snap-align scroll-snap-type tab-size table-layout text-align text-decoration text-decoration-color text-decoration-line text-decoration-style text-indent text-overflow text-shadow text-transform top transform transform-origin transform-style transition transition-delay transition-duration transition-property transition-timing-function translate unicode-bidi user-select vertical-align visibility white-space width will-change word-break word-spacing word-wrap writing-mode z-index accent-color appearance overscroll-behavior text-wrap color-scheme touch-action'.split(' ');
var LENP={width:1,height:1,'min-width':1,'max-width':1,'min-height':1,'max-height':1,margin:1,'margin-top':1,'margin-bottom':1,'margin-left':1,'margin-right':1,padding:1,'padding-top':1,'padding-bottom':1,'padding-left':1,'padding-right':1,top:1,left:1,right:1,bottom:1,gap:1,'row-gap':1,'column-gap':1,'font-size':1,'border-radius':1,'border-width':1,'letter-spacing':1};
var JS_KW='async await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield of static get set true false null undefined'.split(' ');
var JS_OBJ='document window console Math JSON localStorage sessionStorage navigator location history Date Array Object String Number Boolean Promise fetch setTimeout setInterval clearTimeout clearInterval alert confirm prompt parseInt parseFloat isNaN Error Map Set RegExp Symbol requestAnimationFrame'.split(' ');
var JS_MEM='getElementById getElementsByClassName getElementsByTagName querySelector querySelectorAll createElement createTextNode addEventListener removeEventListener appendChild removeChild insertBefore setAttribute getAttribute removeAttribute innerHTML innerText textContent classList add remove toggle contains style value checked disabled children parentNode parentElement firstChild lastChild nextSibling previousSibling log warn error info table stringify parse getItem setItem removeItem clear push pop shift unshift splice slice map filter reduce forEach find findIndex indexOf includes join split sort reverse concat length toString toFixed toUpperCase toLowerCase trim replace substring substr charAt random floor ceil round max min abs sqrt pow now getTime getFullYear getMonth getDate getDay getHours getMinutes getSeconds focus blur click submit preventDefault stopPropagation target currentTarget key keyCode offsetWidth offsetHeight clientWidth clientHeight scrollTop reset reload href then catch finally keys values entries assign freeze'.split(' ');
function maskJs(src,a,b){var out=src.slice(a,b).split(''),n=out.length,i=0,uns=[],s=src.slice(a,b);
 while(i<n){var c=s[i],d=s[i+1];
  if(c==='/'&&d==='/'){while(i<n&&s[i]!=='\n'){out[i]=' ';i++}continue}
  if(c==='/'&&d==='*'){var e=s.indexOf('*/',i+2);if(e<0)e=n-2;for(var k=i;k<e+2&&k<n;k++)if(s[k]!=='\n')out[k]=' ';i=e+2;continue}
  if(c==='"'||c==="'"||c==='`'){var st=i;i++;var closed=false;while(i<n){if(s[i]==='\\'){out[i]=' ';if(i+1<n&&s[i+1]!=='\n')out[i+1]=' ';i+=2;continue}if(s[i]===c){closed=true;i++;break}if(s[i]==='\n'&&c!=='`')break;if(s[i]!=='\n')out[i]=' ';i++}
   if(!closed)uns.push({s:a+st,e:a+i,q:c});continue}
  i++}
 return{m:out.join(''),uns:uns}}
function checkJs(src,a,b,out){
 var mk=maskJs(src,a,b),M=mk.m,L=lines(M),i,def={};
 mk.uns.forEach(function(u){var eol=src.indexOf('\n',u.s);if(eol<0||eol>b)eol=b;out.push(mkIss(u.s,u.s+1,'e','This text is not closed. Add the closing '+u.q+'.','Ye text band nahi hua. Aakhir me '+u.q+' lagao.',{s:eol,e:eol,t:u.q,at:'end'}))});
 brackets(M).forEach(function(x){x.s+=a;x.e+=a;if(x.fix){x.fix.s=x.fix.at==='end'?Math.min(b,a+M.length):x.fix.s+a;x.fix.e=x.fix.at==='end'?x.fix.s:x.fix.e+a}out.push(x)});
 M.replace(/\b(?:let|const|var|function|class)\s+([A-Za-z_$][\w$]*)/g,function(x,y){def[y]=1});
 var re,m;
 re=/\bfunction\s*[\w$]*\s*\(([^)]*)\)/g;while((m=re.exec(M)))m[1].split(',').forEach(function(p){var nm=/[A-Za-z_$][\w$]*/.exec(p);if(nm)def[nm[0]]=1});
 re=/\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>/g;while((m=re.exec(M))){(m[1]||m[2]).split(',').forEach(function(p){var nm=/[A-Za-z_$][\w$]*/.exec(p);if(nm)def[nm[0]]=1})}
 re=/\b(?:let|const|var)\s*[\[{]([^\]}]*)[\]}]/g;while((m=re.exec(M)))m[1].split(',').forEach(function(p){var nm=/[A-Za-z_$][\w$]*/.exec(p);if(nm)def[nm[0]]=1});
 re=/\bcatch\s*\(\s*([\w$]+)/g;while((m=re.exec(M)))def[m[1]]=1;
 re=/\bfor\s*\(\s*(?:let|const|var)?\s*([\w$]+)/g;while((m=re.exec(M)))def[m[1]]=1;
 for(i=0;i<L.length;i++){var t=L[i].t,s0=a+L[i].s;
  var cm=/\b(if|while)\s*\(/.exec(t);if(cm){var d2=1,q=cm.index+cm[0].length;for(;q<t.length&&d2>0;q++){var ch=t[q];if(ch==='(')d2++;else if(ch===')'){d2--;if(!d2)break}else if(ch==='='&&d2===1&&t[q+1]!=='='&&'=!<>'.indexOf(t[q-1])<0&&t[q+1]!=='>'){out.push(mkIss(s0+q,s0+q+1,'e','A single "=" stores a value. To compare, use "===".','Ek "=" value rakhta hai. Compare karne ke liye "===" likho.',{s:s0+q,e:s0+q+1,t:'==='}));break}}}
  re=/[^=!<>]==[^=]/g;while((m=re.exec(t))){var p=m.index+1;out.push(mkIss(s0+p,s0+p+2,'t','Use === instead of == so values are compared safely.','Value safe tarike se compare karne ke liye == ki jagah === use karo.',{s:s0+p,e:s0+p+2,t:'==='}))}
  re=/\bvar\b/g;while((m=re.exec(t)))out.push(mkIss(s0+m.index,s0+m.index+3,'t','Use let or const instead of var. They are safer.','var ki jagah let ya const use karo. Ye zyada surakshit hain.',{s:s0+m.index,e:s0+m.index+3,t:'let'}));
  /* words */
  re=/[A-Za-z_$][\w$]*/g;while((m=re.exec(t))){var w=m[0],p2=m.index,pc=t.slice(0,p2).replace(/\s+$/,'').slice(-1);
   if(def[w]||JS_KW.indexOf(w)>=0)continue;
   if(pc==='.'){if(JS_MEM.indexOf(w)>=0||w.length<4)continue;var lw=w.toLowerCase(),cs=JS_MEM.filter(function(x){return x.toLowerCase()===lw})[0],sg=cs||near(w,JS_MEM,false);if(sg&&sg!==w)out.push(mkIss(s0+p2,s0+p2+w.length,'e','"'+w+'" looks like a spelling mistake. Did you mean "'+sg+'"?','"'+w+'" spelling galat lagti hai. Kya aapka matlab "'+sg+'" hai?',{s:s0+p2,e:s0+p2+w.length,t:sg}));continue}
   if(JS_OBJ.indexOf(w)>=0||w.length<4)continue;
   var lw2=w.toLowerCase(),c2=JS_OBJ.concat(JS_KW).filter(function(x){return x.toLowerCase()===lw2})[0],sg2=c2||near(w,JS_OBJ.concat(JS_KW),false);
   var after=t.slice(p2+w.length).replace(/^\s+/,'');
   if(sg2&&sg2!==w&&(/^[.(]/.test(after)||c2))out.push(mkIss(s0+p2,s0+p2+w.length,'e','"'+w+'" looks like a spelling mistake. Did you mean "'+sg2+'"?','"'+w+'" spelling galat lagti hai. Kya aapka matlab "'+sg2+'" hai?',{s:s0+p2,e:s0+p2+w.length,t:sg2}))}}
}
function checkCss(src,a,b,out){
 var s=src.slice(a,b),i=0,n=s.length,depth=0,stack=[];
 /* mask comments */
 var M=s.replace(/\/\*[\s\S]*?(\*\/|$)/g,function(x){return x.replace(/[^\n]/g,' ')});
 var buf=0,sel=0;
 for(i=0;i<n;i++){var c=M[i];
  if(c==='"'||c==="'"){var e=M.indexOf(c,i+1);if(e<0)e=n-1;i=e;continue}
  if(c==='{'){stack.push(i);depth++}
  else if(c==='}'){if(!stack.length)out.push(mkIss(a+i,a+i+1,'e','Extra "}" in the CSS.','CSS me faltu "}" hai.',{s:a+i,e:a+i+1,t:''}));else stack.pop()}}
 stack.forEach(function(p){out.push(mkIss(a+p,a+p+1,'e','This "{" is never closed. Add "}".','Ye "{" kabhi band nahi hua. "}" jodo.',{s:b,e:b,t:'\n}',at:'end'}))});
 /* declarations: text between { and } (no nested rules except @media) */
 var re=/\{([^{}]*)\}/g,m;
 while((m=re.exec(M))){var body=m[1],bs=m.index+1;
  var parts=[],cur=0,dp=0,q=null;for(var k=0;k<=body.length;k++){var ch=body[k];if(q){if(ch===q)q=null;continue}if(ch==='"'||ch==="'"){q=ch;continue}if(ch==='(')dp++;else if(ch===')')dp--;if((ch===';'&&dp<=0)||k===body.length){parts.push({t:body.slice(cur,k),s:bs+cur,last:k===body.length});cur=k+1}}
  parts.forEach(function(p){var t=p.t;if(!t.trim())return;var off=a+p.s;
   /* missing semicolon between lines */
   var nl=/\n[ \t]*([-\w]+)[ \t]*:/.exec(t);if(nl&&/:/.test(t.slice(0,nl.index))){var cut=t.slice(0,nl.index).replace(/\s+$/,'').length;out.push(mkIss(off+cut-1,off+cut,'e','Missing ";" before the next property.','Agli property se pehle ";" chhoot gaya.',{s:off+cut,e:off+cut,t:';'}));var rest=t.slice(nl.index+1);}
   var ci=t.indexOf(':');
   if(ci<0){if(/^\s*[-\w]+\s*$/.test(t)||/^\s*[-\w]+\s+[^\s:]/.test(t)){var lead=ws(t).length;out.push(mkIss(off+lead,off+t.replace(/\s+$/,'').length,'e','This line is missing ":" between the property and its value.','Is line me property aur value ke beech ":" chhoot gaya.',/^\s*[-\w]+\s+\S/.test(t)?{s:off+lead+/^\s*([-\w]+)/.exec(t)[1].length,e:off+lead+/^\s*([-\w]+)/.exec(t)[1].length,t:':'}:null))}return}
   var prop=t.slice(0,ci).trim(),pl=ws(t).length,pe=off+pl+prop.length;
   var val=t.slice(ci+1),vs=off+ci+1;
   if(prop&&prop[0]!=='-'&&!/^[a-z-]+$/i.test(prop))return;
   if(prop&&prop.slice(0,2)!=='--'&&prop.slice(0,1)!=='-'&&CSSP.indexOf(prop.toLowerCase())<0){var sg=near(prop.toLowerCase(),CSSP,false);out.push(mkIss(off+pl,pe,'e','"'+prop+'" is not a CSS property.'+(sg?' Did you mean "'+sg+'"?':''),'"'+prop+'" CSS ki property nahi hai.'+(sg?' Kya aapka matlab "'+sg+'" hai?':''),sg?{s:off+pl,e:pe,t:sg}:null))}
   var v=val.replace(/\n[ \t]*[-\w]+[ \t]*:[\s\S]*$/,'');
   var hx=/#([0-9a-zA-Z]+)/g,hm;while((hm=hx.exec(v))){if(!/^[0-9a-fA-F]{3,4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(hm[1]))out.push(mkIss(vs+hm.index,vs+hm.index+hm[0].length,'e','"'+hm[0]+'" is not a valid colour. Use 3, 6 or 8 letters/numbers 0-9 and a-f.','"'+hm[0]+'" sahi rang nahi hai. 3, 6 ya 8 akshar (0-9 aur a-f) use karo.',null))}
   var un=/(\d)\s+(px|em|rem|vh|vw|%)\b/.exec(v);if(un&&LENP[prop.toLowerCase()])out.push(mkIss(vs+un.index+1,vs+un.index+un[0].length,'e','Remove the space between the number and "'+un[2]+'".','Number aur "'+un[2]+'" ke beech ka space hatao.',{s:vs+un.index+1,e:vs+un.index+1+/\s+/.exec(un[0])[0].length,t:''}));
   var tp=/\d+(xp|pz|pxx|ppx|rme|eem)\b/.exec(v);if(tp){var fixu={xp:'px',pz:'px',pxx:'px',ppx:'px',rme:'rem',eem:'em'}[tp[1]];out.push(mkIss(vs+tp.index,vs+tp.index+tp[0].length,'e','Wrong unit "'+tp[1]+'". Did you mean "'+fixu+'"?','Unit "'+tp[1]+'" galat hai. Kya aapka matlab "'+fixu+'" hai?',{s:vs+tp.index+tp[0].length-tp[1].length,e:vs+tp.index+tp[0].length,t:fixu}))}
   if(LENP[prop.toLowerCase()]){var vt=v.trim();var nu=/^(-?\d*\.?\d+)$/.exec(vt);if(nu&&+nu[1]!==0){var vend=vs+v.replace(/\s+$/,'').length;out.push(mkIss(vend-nu[1].length,vend,'e','A number needs a unit here, for example '+nu[1]+'px.','Yahan number ke saath unit chahiye, jaise '+nu[1]+'px.',{s:vend,e:vend,t:'px'}))}}
  })}}
function checkHtml(src){
 var out=[],i=0,n=src.length,stack=[],ids={},hasDoctype=/<!doctype/i.test(src),re=/<!--[\s\S]*?(-->|$)|<(script|style)\b[^>]*>[\s\S]*?(<\/\2\s*>|$)|<(\/?)([A-Za-z][\w:-]*)([^<>]*?)(\/?)>|<(\/?)([A-Za-z][\w:-]*)([^<>]*)$|<(?![\/A-Za-z!])/g,m;
 var tagRe=/<!doctype[^>]*>/gi;
 while((m=re.exec(src))){
  var txt=m[0],st=m.index;
  if(txt.slice(0,4)==='<!--')continue;
  if(m[2]){var tag=m[2].toLowerCase(),ob=txt.indexOf('>'),inner=txt.slice(ob+1),ce=inner.search(/<\/(script|style)\s*>/i),stag=txt.slice(0,ob+1);
   var cs=st+ob+1,cend=ce>=0?cs+ce:st+txt.length;
   if(tag==='script'&&!/\bsrc\s*=/i.test(stag)&&!/type\s*=\s*["'](?!text\/javascript|module)/i.test(stag))checkJs(src,cs,cend,out);
   if(tag==='style')checkCss(src,cs,cend,out);
   if(ce<0)out.push(mkIss(st+1,st+1+tag.length,'e','<'+tag+'> is never closed. Add </'+tag+'>.','<'+tag+'> kabhi band nahi hua. </'+tag+'> jodo.',{s:n,e:n,t:'\n</'+tag+'>',at:'end'}));
   attrCheck(stag,st,out,ids);continue}
  if(m[5]!==undefined&&m[5]!==''){
   var close=m[4]==='/',name=m[5],ln=name.toLowerCase(),ns=st+1+(close?1:0),sc=m[7]==='/';
   if(!/-/.test(ln)&&TAGS.indexOf(ln)<0){var sg=near(ln,TAGS,false);out.push(mkIss(ns,ns+name.length,'e','<'+name+'> is not an HTML tag.'+(sg?' Did you mean <'+sg+'>?':''),'<'+name+'> HTML ka tag nahi hai.'+(sg?' Kya aapka matlab <'+sg+'> hai?':''),sg?{s:ns,e:ns+name.length,t:sg}:null));if(sg)ln=sg}
   if(!close){attrCheck(txt,st,out,ids);
    if(ln==='img'&&!/\balt\s*=/i.test(txt))out.push(mkIss(st+1,st+1+name.length,'w','This <img> has no alt text. Add alt="what the picture shows".','Is <img> me alt text nahi hai. alt="picture me kya hai" jodo.',{s:st+txt.length-(sc?2:1),e:st+txt.length-(sc?2:1),t:' alt=""'}));
    if(ln==='a'&&!/\bhref\s*=/i.test(txt))out.push(mkIss(st+1,st+2,'t','This <a> has no href, so it is not a real link.','Is <a> me href nahi hai, isliye ye asli link nahi hai.',{s:st+txt.length-1,e:st+txt.length-1,t:' href=""'}));
    if(!VOID[ln]&&!sc)stack.push({n:ln,s:ns,e:ns+name.length,st:st})}
   else if(!VOID[ln]){var top=stack[stack.length-1];
    if(top&&top.n===ln)stack.pop();
    else{var d=-1;for(var z=stack.length-1;z>=0;z--)if(stack[z].n===ln){d=z;break}
     if(d>=0){for(var y=stack.length-1;y>d;y--){var u=stack[y];if(!OPTC[u.n])out.push(mkIss(u.s,u.e,'e','<'+u.n+'> is not closed before </'+ln+'>. Add </'+u.n+'>.','<'+u.n+'> </'+ln+'> se pehle band nahi hua. </'+u.n+'> jodo.',{s:st,e:st,t:'</'+u.n+'>'}))}stack.length=d}
     else out.push(mkIss(ns,ns+name.length,'e','</'+name+'> has no matching opening tag. Remove it.','</'+name+'> ka koi opening tag nahi hai. Ise hatao.',{s:st,e:st+txt.length,t:''}))}}
   continue}
  if(m[9]){var nm2=m[9];out.push(mkIss(st+1,st+1+nm2.length,'e','This tag is missing its closing ">".','Is tag ka aakhri ">" chhoot gaya.',{s:st+txt.replace(/\s+$/,'').length,e:st+txt.replace(/\s+$/,'').length,t:'>'}));continue}
  out.push(mkIss(st,st+1,'e','A "<" must start a tag. To show the symbol write &lt;','"<" tag shuru karta hai. Symbol dikhana ho to &lt; likho.',{s:st,e:st+1,t:'&lt;'}))}
 stack.forEach(function(u){if(!OPTC[u.n])out.push(mkIss(u.s,u.e,'e','<'+u.n+'> is never closed. Add </'+u.n+'>.','<'+u.n+'> kabhi band nahi hua. </'+u.n+'> jodo.',{s:n,e:n,t:'\n</'+u.n+'>',at:'end'}))});
 if(!hasDoctype&&n>20&&/<html|<head|<body/i.test(src)){var f=/<[A-Za-z]/.exec(src);if(f)out.push(mkIss(f.index,f.index+1,'t','Add <!DOCTYPE html> on the very first line so browsers use modern mode.','Sabse pehli line me <!DOCTYPE html> likho taaki browser modern mode me chale.',{s:0,e:0,t:'<!DOCTYPE html>\n'}))}
 return out}
function attrCheck(tagText,st,out,ids){
 var re=/\s([A-Za-z_:][\w:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>=`]+))?/g,m,body=tagText.replace(/^<[^\s>\/]+/,'');var off=tagText.length-body.length;
 while((m=re.exec(body))){var an=m[1],al=an.toLowerCase(),p=st+off+m.index+1;
  if(al==='/'||/^(data-|aria-|on|xml|v-|x-|@|:)/.test(al)||/-/.test(al))continue;
  if(ATTRS.indexOf(al)<0){var sg=near(al,ATTRS,false);if(sg)out.push(mkIss(p,p+an.length,'e','"'+an+'" is not a known attribute. Did you mean "'+sg+'"?','"'+an+'" jaana-pehchana attribute nahi hai. Kya aapka matlab "'+sg+'" hai?',{s:p,e:p+an.length,t:sg}))}
  if(m[2]&&!/^["']/.test(m[2])){var vs=st+off+m.index+m[0].indexOf(m[2]);out.push(mkIss(vs,vs+m[2].length,'t','Put quotes around the value: '+an+'="'+m[2]+'".','Value ko quotes me likho: '+an+'="'+m[2]+'".',{s:vs,e:vs+m[2].length,t:'"'+m[2]+'"'}))}
  if(al==='id'&&m[2]){var idv=m[2].replace(/^["']|["']$/g,'');if(ids[idv]){var vs2=st+off+m.index+m[0].indexOf(m[2]);out.push(mkIss(vs2,vs2+m[2].length,'e','The id "'+idv+'" is used more than once. An id must be unique.','id "'+idv+'" kai baar use hua hai. id unique hona chahiye.',null))}ids[idv]=1}}}

var CLINT={
 check:function(lang,src){
  try{
   var r;
   if(lang==='py')r=checkPy(src);else if(lang==='java')r=checkJava(src);else if(lang==='vb')r=checkVb(src);
   else if(lang==='css'){r=[];checkCss(src,0,src.length,r)}
   else if(lang==='js'){r=[];checkJs(src,0,src.length,r)}
   else r=checkHtml(src);
   /* clean: clamp, sort, drop overlaps and duplicates */
   r=r.filter(function(x){return x&&x.s>=0&&x.s<=src.length}).map(function(x){x.e=Math.min(x.e,src.length);if(x.e<=x.s){x.s=Math.max(0,Math.min(x.s,src.length-1));x.e=x.s+1}return x});
   r.sort(function(a,b){return a.s-b.s||b.e-a.e});
   var res=[],seen={};r.forEach(function(x){var k=x.s+'-'+x.e+'-'+x.m[0];if(seen[k])return;seen[k]=1;res.push(x)});
   return res.slice(0,60);
  }catch(e){return[]}},
 apply:function(src,x){var f=x.fix;if(!f)return null;var t=f.t;
  if(f.pre){var a=src.slice(0,f.pre.s)+f.pre.t+src.slice(f.pre.e);var shift=f.pre.t.length-(f.pre.e-f.pre.s);return a.slice(0,f.s+shift)+t+a.slice(f.e+shift)}
  return src.slice(0,f.s)+t+src.slice(f.e)},
 lev:lev
};
root.CLINT=CLINT;
if(typeof module!=='undefined'&&module.exports)module.exports=CLINT;
})(typeof window!=='undefined'?window:this);
