/* View-as helper: lets an app admin look at the app as another member. The preview is READ ONLY:
   while it is on, every Firestore write (set, update, delete, add, batch, transaction) is refused. */
(function(){var W=window,V=W.OWHVA={on:false,guarded:false,
 note:function(){var b=document.getElementById('owhva');if(b){b.style.background='#dc2626';setTimeout(function(){b.style.background='#7c3aed'},500)}},
 guard:function(){if(V.guarded)return true;try{var db=W.firebase.firestore(),R=function(){V.note();return Promise.reject(new Error('Preview mode: changes are off'))};
  var wrap=function(proto,names){names.forEach(function(n){var o=proto[n];if(typeof o!=='function')throw new Error('x');proto[n]=function(){return V.on?R():o.apply(this,arguments)}})};
  wrap(Object.getPrototypeOf(db.doc('owhva/x')),['set','update','delete']);wrap(Object.getPrototypeOf(db.collection('owhva')),['add']);wrap(Object.getPrototypeOf(db.batch()),['commit']);wrap(Object.getPrototypeOf(db),['runTransaction']);
  V.guarded=true}catch(e){V.guarded=false}return V.guarded},
 start:function(text,exit){if(!V.guard())return false;V.on=true;V.exit=exit;var b=document.getElementById('owhva');if(!b){b=document.createElement('div');b.id='owhva';b.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483000;background:#7c3aed;color:#fff;font:600 13px/1.3 system-ui,sans-serif;padding:7px 10px;display:flex;gap:10px;align-items:center;justify-content:center;text-align:center;padding-top:max(7px,env(safe-area-inset-top,0px))';document.body.appendChild(b);document.body.style.paddingTop='38px'}
  b.innerHTML='';var s=document.createElement('span');s.textContent='PREVIEW AS '+String(text).toUpperCase()+' - READ ONLY';var x=document.createElement('button');x.textContent='EXIT';x.style.cssText='background:#fff;color:#4c1d95;border:0;border-radius:6px;padding:4px 10px;font-weight:700;cursor:pointer';x.onclick=function(){V.stop(true)};b.appendChild(s);b.appendChild(x);return true},
 stop:function(callExit){V.on=false;var b=document.getElementById('owhva');if(b)b.remove();document.body.style.paddingTop='';var f=V.exit;V.exit=null;if(callExit&&f)f()}};
})();
