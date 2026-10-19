/* Owner-controlled "bots fill online matchmaking" helper. Settings live in Firestore config/bots (edited in Studio). */
(function(){
var FIRST=['Arjun','Rohan','Vikram','Aman','Kartik','Sahil','Nikhil','Yash','Dev','Harshit','Manish','Aditya','Ravi','Suraj','Ankit','Pranav','Tushar','Vivek','Rahul','Deepak','Sanjay','Abhay','Imran','Faizal','Zaheer','Naveen','Kabir','Mohit','Rajat','Satish','Lucky','Sonu','Bunty','Rohit','Jay','Om','Piyush','Subham','Bikash','Samir','Priya','Neha','Riya','Anjali','Pooja','Sneha','Kavya','Isha','Tanya','Meera'];
var LAST=['K','S','P','M','R','D','T','B','N','G','V','J','A','H'];
function pick(a){return a[Math.floor(Math.random()*a.length)]}
var B=window.OWHBOTS={
  name:function(tag){return pick(FIRST)+' '+pick(LAST)+(tag?' (BOT)':'')},
  names:function(n,tag){var u={},o=[],g=0;while(o.length<n&&g++<200){var s=B.name(tag);if(!u[s]){u[s]=1;o.push(s)}}return o},
  delay:function(){return (7+Math.random()*9)*1000},
  /* resolves {on,tag} when bots are switched on for this game, otherwise null. Never throws. */
  cfg:function(db,game){
    try{if(!db)return Promise.resolve(null);
      return db.collection('config').doc('bots').get().then(function(s){
        if(!s.exists)return null;var d=s.data()||{};if(!d.on)return null;
        var off=String(d.off||'').split(',');if(off.indexOf(game)>=0)return null;
        return{on:true,tag:!!d.tag}}).catch(function(){return null})
    }catch(e){return Promise.resolve(null)}}
};
})();
