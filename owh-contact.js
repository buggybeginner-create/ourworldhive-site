/* Contact us / Feature request: shared by all Hive Apps.
   OWHCONTACT.open({app:'CalcPad'}) opens a small form. The message is saved in Firestore (contact_msgs) so it shows in Studio > Messages,
   and a copy is queued in sf_mail (Firebase "Trigger Email" extension) so it also arrives in the owner's e-mail. */
(function(){var W=window,OWNER='er.krushnananda@gmail.com';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
W.OWHCONTACT={open:function(o){o=o||{};var app=o.app||'Hive Apps',old=document.getElementById('owhcnt');if(old)old.remove();
 var fb=W.firebase,u=null;try{u=fb&&fb.apps&&fb.apps.length?fb.auth().currentUser:null}catch(e){}
 var d=document.createElement('div');d.id='owhcnt';
 d.style.cssText='position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif';
 var inp='width:100%;box-sizing:border-box;margin-top:4px;padding:10px;border:1px solid #999;border-radius:8px;font-size:16px;color:#111;background:#fff;font-family:inherit';
 var head='<h2 style="margin:0 0 4px;font-size:18px">CONTACT US</h2><div style="font-size:13px;color:#555;margin-bottom:10px">'+esc(app)+': ask for a new feature, report a problem or write to us.</div>';
 var body;
 if(!u||u.isAnonymous){body=head+'<div style="font-size:14px;line-height:1.5;margin:8px 0 12px">Please sign in to the app first, then open Contact us again. We need your sign-in only to stop spam and to reply to you.</div><button id="owhcntx" style="width:100%;padding:11px;border:0;border-radius:8px;background:#334155;color:#fff;font-weight:700">OK</button>'}
 else{body=head+'<label style="font-size:13px;font-weight:700">What is it about?<select id="owhcntt" style="'+inp+'"><option>Feature request</option><option>Problem or bug</option><option>Question</option><option>Other</option></select></label>'
  +'<label style="font-size:13px;font-weight:700;display:block;margin-top:10px">Your message<textarea id="owhcntm" maxlength="1500" placeholder="Write here. If it is a feature request, tell us what you want the app to do." style="'+inp+';min-height:110px"></textarea></label>'
  +'<label style="font-size:13px;font-weight:700;display:block;margin-top:10px">Reply to (e-mail or phone)<input id="owhcntr" maxlength="80" value="'+esc(u.email||'')+'" style="'+inp+'"></label>'
  +'<div id="owhcnte" style="color:#b91c1c;font-size:13px;min-height:18px;margin-top:6px"></div>'
  +'<div style="display:flex;gap:8px;margin-top:6px"><button id="owhcntn" style="flex:1;padding:11px;border:1px solid #999;border-radius:8px;background:#fff;color:#111;font-weight:700">CANCEL</button><button id="owhcntg" style="flex:1;padding:11px;border:0;border-radius:8px;background:#16a34a;color:#fff;font-weight:700">SEND</button></div>'}
 d.innerHTML='<div style="background:#fff;color:#111;border-radius:14px;max-width:420px;width:100%;padding:16px;max-height:90vh;overflow:auto">'+body+'</div>';document.body.appendChild(d);
 var $=function(i){return document.getElementById(i)};if($('owhcntx'))$('owhcntx').onclick=function(){d.remove()};if(!$('owhcntg'))return;
 $('owhcntn').onclick=function(){d.remove()};
 $('owhcntg').onclick=async function(){var m=$('owhcntm').value.trim(),t=$('owhcntt').value,r=$('owhcntr').value.trim(),er=$('owhcnte');
  if(m.length<5){er.textContent='Please write your message (at least a few words).';return}
  var b=$('owhcntg');b.disabled=true;b.textContent='SENDING...';
  try{var db=fb.firestore(),ts=Date.now(),name=(u.displayName||'').slice(0,60),id='c'+ts.toString(36)+Math.random().toString(36).slice(2,7);
   await db.collection('contact_msgs').doc(id).set({uid:u.uid,email:(u.email||'').slice(0,80),name:name,app:app.slice(0,40),type:t,msg:m.slice(0,1500),reply:r.slice(0,80),ts:ts,status:'new'});
   try{await db.collection('sf_mail').doc('mc'+id).set({to:[OWNER],message:{subject:'['+app+'] '+t+' from '+(name||u.email||'a user'),html:'<div style="font-family:system-ui,sans-serif;font-size:14px"><p><b>'+esc(t)+'</b> in <b>'+esc(app)+'</b></p><p style="white-space:pre-wrap">'+esc(m)+'</p><hr><p>From: '+esc(name)+' &lt;'+esc(u.email||'')+'&gt;<br>Reply to: '+esc(r)+'</p></div>'},kind:'contact',by:u.uid,ts:ts})}catch(e){}
   d.querySelector('div').innerHTML=head+'<div style="font-size:15px;line-height:1.5;margin:8px 0 12px">✅ Thank you. Your message has been sent. We will reply on the contact you gave.</div><button id="owhcntx2" style="width:100%;padding:11px;border:0;border-radius:8px;background:#334155;color:#fff;font-weight:700">CLOSE</button>';
   $('owhcntx2').onclick=function(){d.remove()}}
  catch(e){b.disabled=false;b.textContent='SEND';er.textContent=e&&e.code==='permission-denied'?'Could not send yet. The owner must update the Firestore rules first.':'Could not send. Check the internet and try again.'}}}};
})();
