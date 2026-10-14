/* Chess rules engine + computer player. Pure logic, no DOM. Squares 0..63, 0 = a8, 63 = h1. */
(function(root){
'use strict';
var FILES='abcdefgh';
function sqName(s){return FILES[s&7]+(8-(s>>3))}
function col(p){return p===0?null:(p===p.toUpperCase()?'w':'b')}
var KN=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],KG=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],DG=[[-1,-1],[-1,1],[1,-1],[1,1]],OR=[[-1,0],[1,0],[0,-1],[0,1]];
function init(){var b=new Array(64).fill(0),back='rnbqkbnr';for(var i=0;i<8;i++){b[i]=back[i];b[8+i]='p';b[48+i]='P';b[56+i]=back[i].toUpperCase()}
 var s={b:b,turn:'w',cast:{K:1,Q:1,k:1,q:1},ep:-1,half:0,full:1,keys:[],last:null};s.keys.push(key(s));return s}
function key(s){var k=s.b.map(function(p){return p||'.'}).join('')+s.turn+(s.cast.K?'K':'')+(s.cast.Q?'Q':'')+(s.cast.k?'k':'')+(s.cast.q?'q':'');if(s.ep>=0){var r=s.ep>>3,f=s.ep&7,pc=s.turn==='w'?'P':'p',rr=s.turn==='w'?r+1:r-1;if((f>0&&s.b[rr*8+f-1]===pc)||(f<7&&s.b[rr*8+f+1]===pc))k+=s.ep}return k}
function attacked(b,sq,by){var r=sq>>3,f=sq&7,i,d,rr,ff,p;
 var pr=by==='w'?r+1:r-1;if(pr>=0&&pr<8){var pp=by==='w'?'P':'p';if(f>0&&b[pr*8+f-1]===pp)return true;if(f<7&&b[pr*8+f+1]===pp)return true}
 var n=by==='w'?'N':'n';for(i=0;i<8;i++){rr=r+KN[i][0];ff=f+KN[i][1];if(rr>=0&&rr<8&&ff>=0&&ff<8&&b[rr*8+ff]===n)return true}
 var k=by==='w'?'K':'k';for(i=0;i<8;i++){rr=r+KG[i][0];ff=f+KG[i][1];if(rr>=0&&rr<8&&ff>=0&&ff<8&&b[rr*8+ff]===k)return true}
 var Q=by==='w'?'Q':'q',R=by==='w'?'R':'r',B=by==='w'?'B':'b';
 for(i=0;i<4;i++){rr=r+OR[i][0];ff=f+OR[i][1];while(rr>=0&&rr<8&&ff>=0&&ff<8){p=b[rr*8+ff];if(p){if(p===R||p===Q)return true;break}rr+=OR[i][0];ff+=OR[i][1]}}
 for(i=0;i<4;i++){rr=r+DG[i][0];ff=f+DG[i][1];while(rr>=0&&rr<8&&ff>=0&&ff<8){p=b[rr*8+ff];if(p){if(p===B||p===Q)return true;break}rr+=DG[i][0];ff+=DG[i][1]}}
 return false}
function kingSq(b,c){var k=c==='w'?'K':'k';for(var i=0;i<64;i++)if(b[i]===k)return i;return -1}
function inCheck(s,c){c=c||s.turn;return attacked(s.b,kingSq(s.b,c),c==='w'?'b':'w')}
function pseudo(s){var b=s.b,c=s.turn,o=c==='w'?'b':'w',M=[],i,d,r,f,rr,ff,t,p;
 for(var sq=0;sq<64;sq++){p=b[sq];if(!p||col(p)!==c)continue;r=sq>>3;f=sq&7;var lp=p.toLowerCase();
  if(lp==='p'){var dir=c==='w'?-1:1,st=c==='w'?6:1,pr=c==='w'?0:7;rr=r+dir;
   if(rr>=0&&rr<8){if(!b[rr*8+f]){if(rr===pr)['q','r','b','n'].forEach(function(x){M.push({f:sq,t:rr*8+f,p:x})});else{M.push({f:sq,t:rr*8+f});if(r===st&&!b[(r+2*dir)*8+f])M.push({f:sq,t:(r+2*dir)*8+f})}}
    [-1,1].forEach(function(df){ff=f+df;if(ff<0||ff>7)return;t=rr*8+ff;var tp=b[t];if((tp&&col(tp)===o)||t===s.ep){if(rr===pr)['q','r','b','n'].forEach(function(x){M.push({f:sq,t:t,p:x})});else M.push({f:sq,t:t})}})}}
  else if(lp==='n'||lp==='k'){var D=lp==='n'?KN:KG;for(i=0;i<8;i++){rr=r+D[i][0];ff=f+D[i][1];if(rr<0||rr>7||ff<0||ff>7)continue;t=rr*8+ff;if(!b[t]||col(b[t])===o)M.push({f:sq,t:t})}
   if(lp==='k'){var hr=c==='w'?7:0;if(sq===hr*8+4&&!attacked(b,sq,o)){
    if(s.cast[c==='w'?'K':'k']&&b[hr*8+7]===(c==='w'?'R':'r')&&!b[hr*8+5]&&!b[hr*8+6]&&!attacked(b,hr*8+5,o)&&!attacked(b,hr*8+6,o))M.push({f:sq,t:hr*8+6});
    if(s.cast[c==='w'?'Q':'q']&&b[hr*8]===(c==='w'?'R':'r')&&!b[hr*8+1]&&!b[hr*8+2]&&!b[hr*8+3]&&!attacked(b,hr*8+3,o)&&!attacked(b,hr*8+2,o))M.push({f:sq,t:hr*8+2})}}}
  else{var dirs=lp==='r'?OR:lp==='b'?DG:OR.concat(DG);for(i=0;i<dirs.length;i++){rr=r+dirs[i][0];ff=f+dirs[i][1];while(rr>=0&&rr<8&&ff>=0&&ff<8){t=rr*8+ff;if(!b[t])M.push({f:sq,t:t});else{if(col(b[t])===o)M.push({f:sq,t:t});break}rr+=dirs[i][0];ff+=dirs[i][1]}}}}
 return M}
/* make/unmake (used by search and by apply) */
function make(s,m){var b=s.b,p=b[m.f],c=col(p),u={f:m.f,t:m.t,p:p,cap:b[m.t],cs:{K:s.cast.K,Q:s.cast.Q,k:s.cast.k,q:s.cast.q},ep:s.ep,half:s.half,full:s.full,epcap:-1,rook:null};
 var lp=p.toLowerCase();b[m.t]=p;b[m.f]=0;
 if(lp==='p'){if(m.t===s.ep&&!u.cap&&(m.f&7)!==(m.t&7)){var cs=c==='w'?m.t+8:m.t-8;u.epcap=cs;u.capEp=b[cs];b[cs]=0}
  if(m.p){b[m.t]=c==='w'?m.p.toUpperCase():m.p}}
 if(lp==='k'){if(Math.abs(m.t-m.f)===2){var rf=m.t>m.f?m.f+3:m.f-4,rt=m.t>m.f?m.f+1:m.f-1;u.rook=[rf,rt];b[rt]=b[rf];b[rf]=0}if(c==='w'){s.cast.K=0;s.cast.Q=0}else{s.cast.k=0;s.cast.q=0}}
 var sqs={56:'Q',63:'K',0:'q',7:'k'};if(sqs[m.f])s.cast[sqs[m.f]]=0;if(sqs[m.t])s.cast[sqs[m.t]]=0;
 s.ep=(lp==='p'&&Math.abs(m.t-m.f)===16)?(m.f+m.t)/2:-1;
 s.half=(lp==='p'||u.cap||u.epcap>=0)?0:s.half+1;if(c==='b')s.full++;s.turn=c==='w'?'b':'w';return u}
function unmake(s,u){var b=s.b;b[u.f]=u.p;b[u.t]=u.cap;if(u.epcap>=0)b[u.epcap]=u.capEp;if(u.rook){b[u.rook[0]]=b[u.rook[1]];b[u.rook[1]]=0}
 s.cast=u.cs;s.ep=u.ep;s.half=u.half;s.full=u.full;s.turn=col(u.p)}
function legal(s){var M=pseudo(s),c=s.turn,o=[];for(var i=0;i<M.length;i++){var u=make(s,M[i]);if(!attacked(s.b,kingSq(s.b,c),c==='w'?'b':'w'))o.push(M[i]);unmake(s,u)}return o}
function same(a,m){return a.f===m.f&&a.t===m.t&&(a.p||'')===(m.p||'')}
function san(s,m,L){var p=s.b[m.f],lp=p.toLowerCase(),cap=s.b[m.t]||(lp==='p'&&m.t===s.ep&&(m.f&7)!==(m.t&7)),t;
 if(lp==='k'&&Math.abs(m.t-m.f)===2)t=m.t>m.f?'O-O':'O-O-O';
 else{t='';if(lp==='p'){if(cap)t+=FILES[m.f&7]}else{t+=p.toUpperCase();var amb=(L||legal(s)).filter(function(x){return x.t===m.t&&x.f!==m.f&&s.b[x.f]===p});if(amb.length){var sf=amb.some(function(x){return(x.f&7)===(m.f&7)}),sr=amb.some(function(x){return(x.f>>3)===(m.f>>3)});if(!sf)t+=FILES[m.f&7];else if(!sr)t+=8-(m.f>>3);else t+=sqName(m.f)}}
  if(cap)t+='x';t+=sqName(m.t);if(m.p)t+='='+m.p.toUpperCase()}
 var u=make(s,m),ck=attacked(s.b,kingSq(s.b,s.turn),s.turn==='w'?'b':'w');if(ck){var any=legal(s).length;t+=any?'+':'#'}unmake(s,u);return t}
function insufficient(b){var ps=[];for(var i=0;i<64;i++)if(b[i]&&b[i].toLowerCase()!=='k')ps.push([b[i].toLowerCase(),i]);if(!ps.length)return true;
 if(ps.length===1&&(ps[0][0]==='n'||ps[0][0]==='b'))return true;
 if(ps.every(function(x){return x[0]==='b'})){var cl=ps.map(function(x){return((x[1]>>3)+(x[1]&7))&1});return cl.every(function(v){return v===cl[0]})}return false}
function status(s){var L=legal(s);if(!L.length)return inCheck(s)?{end:'mate',winner:s.turn==='w'?'b':'w'}:{end:'stalemate'};
 if(insufficient(s.b))return{end:'draw',why:'Insufficient material'};
 if(s.half>=100)return{end:'draw',why:'50-move rule'};
 var k=s.keys[s.keys.length-1],n=0;for(var i=0;i<s.keys.length;i++)if(s.keys[i]===k)n++;if(n>=3)return{end:'draw',why:'Threefold repetition'};return null}
function apply(s,m){var cap=!!s.b[m.t]||(s.b[m.f].toLowerCase()==='p'&&m.t===s.ep&&(m.f&7)!==(m.t&7));var sn=san(s,m);make(s,m);s.keys.push(key(s));s.last={f:m.f,t:m.t,san:sn,cap:cap};return s.last}
/* ----- computer player ----- */
var VAL={p:100,n:320,b:330,r:500,q:900,k:0};
var PST={p:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
r:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
k:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]};
function evalS(s){var v=0;for(var i=0;i<64;i++){var p=s.b[i];if(!p)continue;var lp=p.toLowerCase();if(p===lp)v-=VAL[lp]+PST[lp][i^56];else v+=VAL[lp]+PST[lp][i]}return s.turn==='w'?v:-v}
var nodes=0,deadline=0;
function order(s,M){return M.map(function(m){var sc=0,cp=s.b[m.t];if(cp)sc=10*VAL[cp.toLowerCase()]-VAL[s.b[m.f].toLowerCase()]+1000;if(m.p)sc+=800;return[sc,m]}).sort(function(a,b){return b[0]-a[0]}).map(function(x){return x[1]})}
function legalOnly(s,M){var c=s.turn,o=[];for(var i=0;i<M.length;i++){var u=make(s,M[i]);if(!attacked(s.b,kingSq(s.b,c),c==='w'?'b':'w'))o.push(M[i]);unmake(s,u)}return o}
function qs(s,a,b,d){var st=evalS(s);if(d<=0||st>=b)return Math.max(st,0)>=b?st:st;if(st>a)a=st;var M=order(s,pseudo(s).filter(function(m){return s.b[m.t]||m.p}));
 for(var i=0;i<M.length;i++){var c=s.turn,u=make(s,M[i]);if(attacked(s.b,kingSq(s.b,c),c==='w'?'b':'w')){unmake(s,u);continue}var v=-qs(s,-b,-a,d-1);unmake(s,u);if(v>=b)return v;if(v>a)a=v}return a}
function nega(s,d,a,b,ply){nodes++;if((nodes&1023)===0&&Date.now()>deadline)throw 'T';
 if(s.half>=100)return 0;if(d<=0)return qs(s,a,b,4);var M=order(s,pseudo(s)),best=-1e9,any=false,c=s.turn;
 for(var i=0;i<M.length;i++){var u=make(s,M[i]);if(attacked(s.b,kingSq(s.b,c),c==='w'?'b':'w')){unmake(s,u);continue}any=true;var v=-nega(s,d-1,-b,-a,ply+1);unmake(s,u);if(v>best)best=v;if(v>a)a=v;if(a>=b)break}
 if(!any)return inCheck(s)?-30000+ply:0;return best}
function bestMove(s,level){var L=legal(s);if(!L.length)return null;
 if(level<=0){var caps=L.filter(function(m){return s.b[m.t]});if(Math.random()<.45&&caps.length)return caps[Math.floor(Math.random()*caps.length)];return L[Math.floor(Math.random()*L.length)]}
 var maxD=level===1?2:4,tl=level===1?900:2200;deadline=Date.now()+tl;nodes=0;var best=order(s,L)[0],bsc=-1e9,ord=order(s,L);
 try{for(var d=1;d<=maxD;d++){var cb=null,cs=-1e9;for(var i=0;i<ord.length;i++){var c=s.turn,u=make(s,ord[i]);var v=-nega(s,d-1,-1e9,-cs,1);unmake(s,u);if(level===1)v+=Math.random()*14-7;if(v>cs){cs=v;cb=ord[i]}}
   if(cb){best=cb;bsc=cs;ord=[cb].concat(ord.filter(function(m){return m!==cb}))}if(bsc>29000)break}}catch(e){if(e!=='T')throw e}
 return best}
function perft(s,d){if(d===0)return 1;var L=legal(s),n=0;if(d===1)return L.length;for(var i=0;i<L.length;i++){var u=make(s,L[i]);n+=perft(s,d-1);unmake(s,u)}return n}
function fromFen(f){var p=f.split(' '),b=[];p[0].split('/').forEach(function(r){for(var i=0;i<r.length;i++){var ch=r[i];if(/\d/.test(ch))for(var k=0;k<+ch;k++)b.push(0);else b.push(ch)}});
 var s={b:b,turn:p[1],cast:{K:p[2].indexOf('K')>=0?1:0,Q:p[2].indexOf('Q')>=0?1:0,k:p[2].indexOf('k')>=0?1:0,q:p[2].indexOf('q')>=0?1:0},ep:p[3]==='-'?-1:(8-(+p[3][1]))*8+FILES.indexOf(p[3][0]),half:+p[4]||0,full:+p[5]||1,keys:[],last:null};s.keys.push(key(s));return s}
var API={init:init,legal:legal,apply:apply,status:status,inCheck:inCheck,san:san,bestMove:bestMove,perft:perft,fromFen:fromFen,sqName:sqName,col:col,same:same,make:make,unmake:unmake,kingSq:kingSq,FILES:FILES};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.ChessCore=API;
})(typeof window!=='undefined'?window:this);
