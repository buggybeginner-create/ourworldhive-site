/* Ourworldhive kids kit: sounds, speech, confetti and shared star count. Stores only a star number in this browser. */
window.KK=(function(){
 var AC=null,KEY='owh_kids_v1',D={stars:0,best:{}};
 try{var s=JSON.parse(localStorage.getItem(KEY)||'{}');if(s&&typeof s==='object'){D.stars=s.stars|0;D.best=s.best||{}}}catch(e){}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){}}
 function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
 var mute=false;
 function tone(f,d,type,v,sl,w){var a=ac();if(!a||mute)return;var t=a.currentTime+(w||0),o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t+d);g.gain.setValueAtTime(v||.2,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.02)}
 var sfx={pop:function(){tone(500,.12,'triangle',.3,600)},ding:function(){tone(784,.12,'sine',.25);tone(1175,.22,'sine',.25,0,.09)},oops:function(){tone(260,.25,'triangle',.22,-90)},win:function(){[523,659,784,1047].forEach(function(f,i){tone(f,.2,'triangle',.25,0,i*.12)})},tap:function(){tone(660,.05,'sine',.15)}};
 function say(t,rate){try{if(mute||!window.speechSynthesis)return;speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.rate=rate||.85;u.pitch=1.25;u.lang='en-US';speechSynthesis.speak(u)}catch(e){}}
 function confetti(n){var em=['⭐','🎉','🎈','💖','🌟','🎊'];for(var i=0;i<(n||24);i++){var d=document.createElement('div');d.className='conf';d.textContent=em[i%em.length];d.style.left=Math.random()*100+'vw';d.style.animationDuration=(1.6+Math.random()*1.6)+'s';d.style.fontSize=(20+Math.random()*22)+'px';document.body.appendChild(d);setTimeout(function(x){x.remove()}.bind(null,d),3600)}}
 function addStars(n){D.stars+=n;save();if(n>0&&window.OWHG)try{OWHG.report({pts:n,round:1})}catch(e){}var e=document.getElementById('kkStars');if(e)e.textContent=D.stars}
 function best(game,v){if(v===undefined)return D.best[game]||0;if(v>(D.best[game]||0)){D.best[game]=v;save();return true}return false}
 var KID={'kid-balloons':'kidballoons','kid-catch':'kidcatch','kid-math':'kidmath','kid-animals':'kidanimals'};
 function kkRank(title,icon){var f=(location.pathname.split('/').pop()||'').replace('.html',''),id=KID[f];if(!id)return;function ld(u,n){var x=document.createElement('script');x.src=u;x.onload=n;x.onerror=n;document.head.appendChild(x)}ld('firebase-config.js',function(){ld('owh-game.js',function(){if(!window.OWHG)return;OWHG.init({game:id,name:title,icon:icon,rankScale:120,items:[]});OWHG.mount({top:'64px'})})})}
 function top(title,icon){var t=document.createElement('div');t.id='top';t.innerHTML='<a class="btn round y" href="games.html" aria-label="Back to games">⌂</a><span class="pill">'+icon+' '+title+'</span><span class="sp"></span><span class="pill">⭐ <span id="kkStars">'+D.stars+'</span></span><button class="btn round" id="kkSnd" aria-label="Sound">🔊</button>';document.body.appendChild(t);kkRank(title,icon);document.getElementById('kkSnd').onclick=function(){mute=!mute;this.textContent=mute?'🔇':'🔊';if(mute&&window.speechSynthesis)speechSynthesis.cancel()}}
 document.addEventListener('pointerdown',function(){ac()},{once:true});
 return{sfx:sfx,say:say,confetti:confetti,addStars:addStars,best:best,top:top,rnd:function(a,b){return a+Math.floor(Math.random()*(b-a+1))},pick:function(a){return a[Math.floor(Math.random()*a.length)]},shuffle:function(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}}
})();
