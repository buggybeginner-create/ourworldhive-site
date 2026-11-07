/* Owner-controlled "bots fill online matchmaking" helper. Settings live in Firestore config/bots (edited in Studio). */
(function(){
var FIRST=['Arjun','Rohan','Vikram','Aman','Kartik','Sahil','Nikhil','Yash','Dev','Harshit','Manish','Aditya','Ravi','Suraj','Ankit','Pranav','Tushar','Vivek','Rahul','Deepak','Sanjay','Abhay','Imran','Faizal','Zaheer','Naveen','Kabir','Mohit','Rajat','Satish','Lucky','Sonu','Bunty','Rohit','Jay','Om','Piyush','Subham','Bikash','Samir','Priya','Neha','Riya','Anjali','Pooja','Sneha','Kavya','Isha','Tanya','Meera'];
var LAST=['K','S','P','M','R','D','T','B','N','G','V','J','A','H'];
function pick(a){return a[Math.floor(Math.random()*a.length)]}
var LASTF=['Verma','Sharma','Singh','Das','Patel','Mishra','Nayak','Kumar','Gupta','Yadav','Khan','Reddy','Jena','Sahoo','Behera','Roy'];
var TAIL=['07','21','99','11','45','_x','_pro','786','_op','18','23','_gg','08','77'];
function name(){var f=pick(FIRST),r=Math.random(),n;
  if(r<.30)n=f+' '+pick(LAST);
  else if(r<.45)n=f+' '+pick(LASTF);
  else if(r<.62)n=f.toLowerCase()+pick(TAIL);
  else if(r<.74)n=f+pick(TAIL).replace(/^_/,'');
  else if(r<.86)n=f.toLowerCase()+'.'+pick(LAST).toLowerCase();
  else n=f;
  if(!/\d/.test(n))n=n.replace(/[ .]/g,'').slice(0,11)+pick(['07','21','99','11','45','23','08','77','786','18','52','69']);
  return n.slice(0,14)}
/* things a real person says now and then (emoji and short lines, English and a little Hinglish) */
var SAY=['\uD83D\uDE0E','\uD83D\uDE02','\uD83E\uDD14','\uD83D\uDC4D','\uD83D\uDD25','\uD83D\uDE05','\uD83D\uDE2E','gg','nice one','haha','arey wah','oops','chal bhai','soch raha hu \uD83E\uDD14','good one \uD83D\uDC4F','close tha \uD83D\uDE05','let\u2019s go \uD83D\uDD25','hmm','wah \uD83D\uDE2E','ok ok \uD83D\uDE0F'];
var B=window.OWHBOTS={
  name:function(tag){return name()},
  names:function(n,tag){var u={},o=[],g=0;while(o.length<n&&g++<200){var s=B.name(tag);if(!u[s]){u[s]=1;o.push(s)}}return o},
  /* a bot is assigned if nobody real joins within 12 seconds */
  delay:function(){return 12000},
  avatar:function(){return pick(['\uD83E\uDD8A','\uD83D\uDC2F','\uD83D\uDC3C','\uD83E\uDD81','\uD83D\uDC38','\uD83D\uDC35','\uD83E\uDD84','\uD83D\uDC3B','\uD83D\uDC31','\uD83D\uDC36'])},
  say:function(){return pick(SAY)},
  /* now and then the bot says something on its own. say(text) sends it; alive() returns false when the game is over. */
  talk:function(say,alive){var stop=false;(function next(){setTimeout(function(){if(stop)return;var ok=false;try{ok=alive()}catch(e){}if(!ok){stop=true;return}
      if(Math.random()<.7){try{say(B.say())}catch(e){}}next()},(14+Math.random()*26)*1000)})();return function(){stop=true}},
  /* resolves {on,tag} when bots are switched on for this game, otherwise null. Never throws. */
  cfg:function(db,game){
    try{if(!db)return Promise.resolve(null);
      return db.collection('config').doc('bots').get().then(function(s){
        if(!s.exists)return{on:true,tag:false}; /* no setting saved yet: bots are ON for everyone until the owner turns them off in Studio */
        var d=s.data()||{};if(!d.on)return null;
        var off=String(d.off||'').split(',');if(off.indexOf(game)>=0)return null;
        return{on:true,tag:!!d.tag}}).catch(function(){return null})
    }catch(e){return Promise.resolve(null)}}
};
})();
