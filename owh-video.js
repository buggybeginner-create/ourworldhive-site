/* Ourworldhive video maker (owner only).
   Records any 2D animation as an HD video with captions and an optional voice-over, ready for YouTube, Shorts or Reels.
   Usage: OWHVideo.open({title, sub, dur, steps:[...], narr:[...], draw:function(g,p){...}, aw:360, ah:220, desc:'', tags:''})
   draw(g,p) paints the animation for progress p (0 to 1) on a canvas of aw x ah units. */
(function(){
var V={};
V.isAdmin=function(){try{return localStorage.getItem('owh_owner')==='1'}catch(e){return false}};
var FMT={yt:{n:'YouTube, 16:9 (1920 x 1080)',w:1920,h:1080},st:{n:'Shorts, Reels, Status, 9:16 (1080 x 1920)',w:1080,h:1920},sq:{n:'Square (1080 x 1080)',w:1080,h:1080}};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function slug(s){return String(s||'video').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'video'}
function wrap(g,text,maxW){var words=String(text).split(/\s+/),lines=[],cur='';words.forEach(function(w){var t=cur?cur+' '+w:w;if(g.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t});if(cur)lines.push(cur);return lines}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
var FONT='system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif';
function frame(g,Wd,Ht,S,p,o){
  var bg=g.createLinearGradient(0,0,0,Ht);bg.addColorStop(0,'#070b1f');bg.addColorStop(1,'#1a2150');g.fillStyle=bg;g.fillRect(0,0,Wd,Ht);
  var port=Ht>Wd*1.2,sq=Math.abs(Ht-Wd)<5,pad=Math.round(Wd*.045);
  g.textBaseline='top';g.textAlign='left';
  var tf=Math.round(Wd*(port?.068:sq?.055:.036));g.font='800 '+tf+'px '+FONT;g.fillStyle='#ffffff';
  var tl=wrap(g,S.title,Wd-2*pad).slice(0,2),y=pad;tl.forEach(function(l){g.fillText(l,pad,y);y+=Math.round(tf*1.15)});
  if(S.sub){var sf=Math.round(tf*.5);g.font='600 '+sf+'px '+FONT;g.fillStyle='#ffc857';g.fillText(S.sub,pad,y+4);y+=Math.round(sf*1.5)}
  y+=Math.round(pad*.5);
  var capH=o.cap?Math.round(Ht*(port?.25:sq?.24:.2)):0,bot=Math.round(pad*1.4);
  var rw=Wd-2*pad,rh=Ht-y-capH-bot-Math.round(pad*.4);
  var s=Math.min(rw/S.aw,rh/S.ah),sw=S.aw*s,sh=S.ah*s,sx=pad+(rw-sw)/2,sy=y+(rh-sh)/2;
  g.save();rr(g,sx,sy,sw,sh,Math.round(Wd*.012));g.clip();g.translate(sx,sy);g.scale(s,s);
  try{S.draw(g,p)}catch(e){}
  g.restore();g.globalAlpha=1;
  if(o.cap&&S.steps&&S.steps.length){
    var n=S.steps.length,si=Math.min(n-1,Math.floor(p*n)),cf=Math.round(Wd*(port?.05:sq?.042:.027));
    var cy=sy+sh+Math.round(pad*.5),ch=capH;
    g.fillStyle='rgba(8,12,34,.82)';rr(g,pad,cy,Wd-2*pad,ch,Math.round(Wd*.015));g.fill();
    g.fillStyle='#ffc857';g.font='700 '+Math.round(cf*.62)+'px '+FONT;g.fillText('STEP '+(si+1)+' OF '+n,pad+Math.round(pad*.5),cy+Math.round(pad*.45));
    g.fillStyle='#ffffff';g.font='700 '+cf+'px '+FONT;var cl=wrap(g,S.steps[si],Wd-3*pad).slice(0,port?5:3),ly=cy+Math.round(pad*.45)+Math.round(cf*.9);
    cl.forEach(function(l){g.fillText(l,pad+Math.round(pad*.5),ly);ly+=Math.round(cf*1.25)});
  }
  var by=Ht-Math.round(bot*.75);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(pad,by,Wd-2*pad,Math.max(4,Math.round(Wd*.004)));
  g.fillStyle='#6a38ff';g.fillRect(pad,by,(Wd-2*pad)*p,Math.max(4,Math.round(Wd*.004)));
  g.font='700 '+Math.round(Wd*.016)+'px '+FONT;g.fillStyle='rgba(255,255,255,.7)';g.textAlign='right';g.fillText(S.brand||'ourworldhive.com',Wd-pad,by-Math.round(Wd*.026));g.textAlign='left';
}
function pickMime(){var L=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];for(var i=0;i<L.length;i++){try{if(window.MediaRecorder&&MediaRecorder.isTypeSupported(L[i]))return L[i]}catch(e){}}return''}
function srtTime(t){var ms=Math.round(t*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,x=ms%1000,z=function(n,l){return String(n).padStart(l||2,'0')};return z(h)+':'+z(m)+':'+z(s)+','+z(x,3)}
function makeSrt(S,loops){var n=S.steps.length,seg=S.dur/n,out=[],k=1;for(var L=0;L<loops;L++)for(var i=0;i<n;i++){var a=L*S.dur+i*seg,b=a+seg-.05;out.push(k++ +'\n'+srtTime(a)+' --> '+srtTime(b)+'\n'+S.steps[i]+'\n')}return out.join('\n')}
function save(name,blobOrText,type){var b=blobOrText instanceof Blob?blobOrText:new Blob([blobOrText],{type:type||'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(a.href)},2000)}
V.open=function(S){
  S=Object.assign({aw:360,ah:220,dur:16,steps:[],sub:'',desc:'',tags:'',brand:'ourworldhive.com'},S);
  S.narr=S.narr&&S.narr.length?S.narr:S.steps;
  var old=document.getElementById('owhv');if(old)old.remove();
  var ov=document.createElement('div');ov.id='owhv';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(2,4,14,.88);overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:16px;font-family:'+FONT+';color:#eaf1ff';
  var css='border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#eaf1ff;border-radius:999px;padding:0 16px;min-height:42px;font:inherit;font-weight:700;cursor:pointer',gold='border:0;background:linear-gradient(135deg,#ffc857,#ff9f5a);color:#1a1030;border-radius:999px;padding:0 18px;min-height:42px;font:inherit;font-weight:800;cursor:pointer',sel='width:100%;min-height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:#10163a;color:#eaf1ff;font:inherit;padding:0 8px';
  ov.innerHTML='<div style="width:100%;max-width:760px;background:#0d1230;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:16px">'
   +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b style="font-size:18px">Make a video: '+esc(S.title)+'</b><button type="button" id="ovX" style="'+css+'" aria-label="Close">Close</button></div>'
   +'<p style="margin:6px 0 10px;color:#93a4cc;font-size:14px">The animation plays once through while it is recorded. Keep this tab open until it finishes.</p>'
   +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">'
   +'<label style="font-size:13px;color:#93a4cc">Format<select id="ovF" style="'+sel+'">'+Object.keys(FMT).map(function(k){return'<option value="'+k+'">'+FMT[k].n+'</option>'}).join('')+'</select></label>'
   +'<label style="font-size:13px;color:#93a4cc">Repeat the animation<select id="ovR" style="'+sel+'"><option value="1">1 time ('+S.dur+' sec)</option><option value="2">2 times ('+S.dur*2+' sec)</option><option value="3">3 times ('+S.dur*3+' sec)</option></select></label>'
   +'<label style="font-size:13px;color:#93a4cc">Voice-over<select id="ovV" style="'+sel+'"><option value="off">No voice (captions only)</option><option value="mic">My microphone (I speak the captions)</option><option value="tts">Computer voice (Chrome on a computer)</option></select></label></div>'
   +'<label style="display:flex;gap:8px;align-items:center;margin:10px 0;font-size:14px"><input type="checkbox" id="ovC" checked> Show captions on the video</label>'
   +'<div id="ovH" style="font-size:13px;color:#93a4cc;margin-bottom:8px"></div>'
   +'<div style="background:#000;border-radius:12px;overflow:hidden;display:flex;justify-content:center"><canvas id="ovCv" style="max-width:100%;max-height:52vh"></canvas></div>'
   +'<div style="height:8px;background:rgba(255,255,255,.14);border-radius:6px;margin:10px 0;overflow:hidden"><div id="ovP" style="height:100%;width:0;background:#6a38ff"></div></div>'
   +'<div id="ovM" style="min-height:20px;font-size:14px;margin-bottom:8px" role="status"></div>'
   +'<div style="display:flex;gap:8px;flex-wrap:wrap" id="ovB"><button type="button" id="ovGo" style="'+gold+'">Start recording</button><button type="button" id="ovSrt" style="'+css+'">Captions file (.srt)</button><button type="button" id="ovTxt" style="'+css+'">Script (.txt)</button></div>'
   +'<div id="ovOut" style="margin-top:12px"></div></div>';
  document.body.appendChild(ov);document.body.style.overflow='hidden';
  var $=function(id){return document.getElementById(id)},cv=$('ovCv'),g=cv.getContext('2d'),running=false,stopFlag=false,tracks=[],raf=0;
  function close(){stopFlag=true;try{speechSynthesis.cancel()}catch(e){}tracks.forEach(function(t){try{t.stop()}catch(e){}});cancelAnimationFrame(raf);ov.remove();document.body.style.overflow=''}
  $('ovX').onclick=close;
  function size(){var f=FMT[$('ovF').value];cv.width=f.w;cv.height=f.h}
  function still(){size();frame(g,cv.width,cv.height,S,.3,{cap:$('ovC').checked})}
  $('ovF').onchange=$('ovC').onchange=still;still();
  $('ovH').textContent='Tip: for the best result use Chrome. Videos are saved as '+(pickMime().indexOf('mp4')>=0?'MP4':'WebM')+', which YouTube accepts.';
  $('ovSrt').onclick=function(){save(slug(S.title)+'.srt',makeSrt(S,+$('ovR').value))};
  $('ovTxt').onclick=function(){save(slug(S.title)+'-script.txt',S.title+'\n\n'+S.narr.map(function(t,i){return(i+1)+'. '+t}).join('\n\n')+(S.desc?'\n\n'+S.desc:''))};
  $('ovGo').onclick=function(){if(running)return;
    if(!window.MediaRecorder||!cv.captureStream){$('ovM').textContent='This browser cannot record video. Please use Chrome.';return}
    running=true;stopFlag=false;$('ovOut').innerHTML='';$('ovGo').disabled=true;size();
    var loops=+$('ovR').value,dur=S.dur*loops,vm=$('ovV').value,cap=$('ovC').checked,audio=[];
    function getAudio(){
      if(vm==='mic'){$('ovM').textContent='Allow the microphone, then speak the captions as they appear.';return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(function(s){tracks=tracks.concat(s.getTracks());audio=s.getAudioTracks()})}
      if(vm==='tts'){if(!window.speechSynthesis||!navigator.mediaDevices.getDisplayMedia)return Promise.reject(new Error('Computer voice needs Chrome on a computer.'));
        $('ovM').textContent='In the window that opens, choose THIS TAB and tick "Share tab audio".';return navigator.mediaDevices.getDisplayMedia({video:true,audio:true,preferCurrentTab:true}).then(function(s){tracks=tracks.concat(s.getTracks());audio=s.getAudioTracks();if(!audio.length)$('ovM').textContent='No tab audio was shared, so the video will have no voice.'})}
      return Promise.resolve()}
    getAudio().then(function(){
      var n=3,t0=performance.now();
      (function cd(){if(stopFlag)return;var left=3-Math.floor((performance.now()-t0)/1000);if(left<=0){go();return}
        frame(g,cv.width,cv.height,S,0,{cap:cap});g.fillStyle='rgba(0,0,0,.55)';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='800 '+Math.round(cv.width*.12)+'px '+FONT;g.fillText(String(left),cv.width/2,cv.height/2);g.textAlign='left';
        $('ovM').textContent='Starting in '+left+'...';raf=requestAnimationFrame(cd)})();
    }).catch(function(e){running=false;$('ovGo').disabled=false;$('ovM').textContent='Could not start: '+(e&&e.message||e)});
    function go(){
      var mt=pickMime(),stream=cv.captureStream(30),ms=new MediaStream(stream.getVideoTracks().concat(audio)),chunks=[],rec;
      try{rec=new MediaRecorder(ms,mt?{mimeType:mt,videoBitsPerSecond:cv.width>=1920||cv.height>=1920?10000000:7000000}:{})}catch(e){running=false;$('ovGo').disabled=false;$('ovM').textContent='Recording failed: '+e.message;return}
      rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
      rec.onstop=function(){try{speechSynthesis.cancel()}catch(e){}tracks.forEach(function(t){try{t.stop()}catch(e){}});running=false;$('ovGo').disabled=false;$('ovP').style.width='100%';
        if(stopFlag)return;var type=rec.mimeType||mt||'video/webm',ext=type.indexOf('mp4')>=0?'mp4':'webm',blob=new Blob(chunks,{type:type}),url=URL.createObjectURL(blob),name=slug(S.title)+'-'+$('ovF').value+'.'+ext;
        $('ovM').textContent='Done. Your video is ready ('+(blob.size/1048576).toFixed(1)+' MB).';
        var tx=S.title+'\n\n'+(S.desc||S.narr.join(' '))+'\n\n'+(S.tags||'#science #animation #learning');
        $('ovOut').innerHTML='<video controls playsinline style="width:100%;max-height:50vh;background:#000;border-radius:12px" src="'+url+'"></video><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" id="ovDl" style="'+gold+'">Download video</button><button type="button" id="ovCp" style="'+css+'">Copy title and description</button><a id="ovYt" href="https://www.youtube.com/upload" target="_blank" rel="noopener" style="'+css+';display:inline-flex;align-items:center;text-decoration:none">Open YouTube upload</a></div><p style="font-size:13px;color:#93a4cc;margin:8px 0 0">To post: tap Download video, open YouTube upload, choose the file, then paste the title and description you copied. Add the captions file (.srt) under Subtitles if you want.</p>';
        $('ovDl').onclick=function(){save(name,blob)};
        $('ovCp').onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(function(){$('ovCp').textContent='Copied'}).catch(function(){$('ovCp').textContent='Copy failed'})};
      };
      rec.start(1000);var t0=performance.now(),lastS=-1;
      (function tick(){if(stopFlag){try{rec.stop()}catch(e){}return}
        var el=(performance.now()-t0)/1000;if(el>=dur){frame(g,cv.width,cv.height,S,.999,{cap:cap});setTimeout(function(){try{rec.stop()}catch(e){}},400);return}
        var p=(el%S.dur)/S.dur;frame(g,cv.width,cv.height,S,p,{cap:cap});
        var gs=Math.floor(el/(S.dur/S.steps.length));if(vm==='tts'&&gs!==lastS){lastS=gs;try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(S.narr[gs%S.narr.length]);u.lang='en-US';u.rate=.95;speechSynthesis.speak(u)}catch(e){}}
        $('ovP').style.width=(el/dur*100)+'%';$('ovM').textContent='Recording... '+Math.ceil(dur-el)+' sec left'+(vm==='mic'?'. Speak now.':'');
        raf=requestAnimationFrame(tick)})();
    }
  };
};
window.OWHVideo=V;
})();
