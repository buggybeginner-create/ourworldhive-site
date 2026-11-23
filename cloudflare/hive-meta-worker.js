/* Hive Meta: reads a shop's product page and returns name, photo, price, MRP and return policy as JSON.
   Used by Parcel Ledger's Watchlist on the web. Only shop websites are allowed. Built from work/pl/meta.js. */
/* ---------- product page reader: name, photo, price, MRP, return policy (same code runs in the Cloudflare worker) ---------- */
function metaOf(html,url){var H=String(html||''),r={};if(H.length<200)return r;
 function dec(s){return String(s||'').replace(/&#x([0-9a-f]+);/gi,function(m,h){return String.fromCharCode(parseInt(h,16))}).replace(/&#(\d+);/g,function(m,d){return String.fromCharCode(+d)}).replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
 function mt(k){var re=new RegExp('<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["\']'+k+'["\'][^>]*>','i'),m=re.exec(H);if(!m)return '';var c=/content\s*=\s*"([^"]*)"/i.exec(m[0])||/content\s*=\s*'([^']*)'/i.exec(m[0]);return c?dec(c[1]):''}
 function num(v){if(v==null)return null;var n=parseFloat(String(v).replace(/[,₹\s]/g,'').replace(/^rs\.?/i,''));return isFinite(n)&&n>0&&n<1e7?Math.round(n*100)/100:null}
 function abs(u){u=String(u||'').trim();if(!u)return '';if(/^\/\//.test(u))u='https:'+u;u=u.replace(/^http:\/\//i,'https://');try{return new URL(u,url).href}catch(e){return ''}}
 var tt=dec((/<title[^>]*>([\s\S]{0,400}?)<\/title>/i.exec(H)||[])[1]||'');
 if(/robot check|captcha|access denied|site maintenance|something went wrong|page not found|are you a human|request blocked|sorry!? (?:we|this)|error 40\d|unusual traffic/i.test(tt+' '+H.slice(0,3000).replace(/<[^>]+>/g,' ').slice(0,600))&&!/application\/ld\+json|__myx|productTitle|og:image/i.test(H)){r.blocked=true;return r}
 /* 1. structured data (most stores) */
 (H.match(/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi)||[]).forEach(function(b){try{var j=JSON.parse(b.replace(/^<script[^>]*>/i,'').replace(/<\/script>$/i,'').trim()),L=Array.isArray(j)?j:j['@graph']?j['@graph']:[j];
  L.forEach(function(o){if(!o||!/product/i.test(String(o['@type'])))return;if(!r.t&&o.name)r.t=dec(o.name);var im=o.image;if(Array.isArray(im))im=im[0];if(im&&typeof im==='object')im=im.url||im.contentUrl;if(!r.img&&im)r.img=abs(im);
   var of=o.offers;if(Array.isArray(of))of=of[0];if(of&&!r.p)r.p=num(of.price!=null?of.price:of.lowPrice);if(!r.brand&&o.brand)r.brand=dec(o.brand.name||o.brand)})}catch(e){}});
 /* 2. Myntra page data */
 var my=/window\.__myx\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/.exec(H);if(my){try{var pd=(JSON.parse(my[1])||{}).pdpData||{};
  if(pd.name)r.t=dec(pd.name);var pr=pd.price||{};r.p=num(pr.discounted)||num(pr.mrp)||r.p;r.mrp=num(pr.mrp)||num(pd.mrp)||r.mrp;
  var al=(pd.media&&pd.media.albums)||[],im0=al[0]&&al[0].images&&al[0].images[0];if(im0&&(im0.imageURL||im0.src))r.img=abs(String(im0.imageURL||im0.src).replace(/h_\(\$height\),q_\(\$qualityPercentage\),w_\(\$width\)/,'h_720,q_90,w_540').replace(/\(\$\w+\)/g,''));
  var sv=pd.serviceability||{},ds=(sv.descriptors||[]).join(' · ');if(ds)r.rtxt=ds;if(sv.returnPeriod&&+sv.returnPeriod>0)r.ret={d:+sv.returnPeriod,k:'return'};
  var fl=pd.flags||{};if(fl.isReturnable===false&&fl.isExchangeable===false)r.ret={d:0,k:'none'};else if(fl.isReturnable===false&&fl.isExchangeable)r.ret={d:(r.ret&&r.ret.d)||0,k:'exchange'}}catch(e){}}
 /* 3. Amazon page */
 var at=/id=["']productTitle["'][^>]*>([\s\S]{1,600}?)<\/span>/i.exec(H)||/id=["']title["'][^>]*>\s*<span[^>]*>([\s\S]{1,600}?)<\/span>/i.exec(H);if(at&&!r.t)r.t=dec(at[1].replace(/<[^>]+>/g,' '));
 if(!r.p){var ap=/class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\d,]+)/i.exec(H)||/"priceAmount"\s*:\s*([\d.]+)/.exec(H)||/id=["'](?:priceblock_ourprice|priceblock_dealprice|corePrice_feature_div)["'][\s\S]{0,400}?₹\s?([\d,]+)/i.exec(H);if(ap)r.p=num(ap[1])}
 if(!r.mrp){var am=/(?:M\.R\.P\.?|MRP)\s*:?[\s\S]{0,200}?a-offscreen["']?>\s*₹\s?([\d,]+(?:\.\d+)?)/i.exec(H);if(am)r.mrp=num(am[1])}
 if(!r.img){var ai=/data-old-hires=["'](https:[^"']+)["']/i.exec(H)||/"hiRes"\s*:\s*"(https:[^"]+)"/.exec(H)||/id=["'](?:landingImage|main-image)["'][^>]*src=["'](https:[^"']+)["']/i.exec(H)||/(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+\-]+\._[A-Z0-9_,]*_?\.(?:jpg|png))/.exec(H)||/(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+\-]{8,}\.(?:jpg|png))/.exec(H);if(ai)r.img=abs(ai[1])}
 /* 4. open-graph tags (Flipkart, Meesho, AJIO, Nykaa…) */
 if(!r.t)r.t=mt('og:title')||mt('twitter:title')||mt('title');
 if(!r.img)r.img=abs(mt('og:image')||mt('og:image:secure_url')||mt('twitter:image')||mt('image'));
 if(!r.p)r.p=num(mt('product:price:amount')||mt('og:price:amount')||mt('price'));
 if(!r.p){var fp=/"(?:finalPrice|sellingPrice|selling_price|offerPrice|discountedPrice)"\s*:\s*\{?\s*(?:"value"\s*:\s*|"decimalValue"\s*:\s*")?([\d.]+)/.exec(H);if(fp)r.p=num(fp[1])}
 if(!r.p&&/flipkart|meesho|fkrt|msho/i.test(String(url))){var bp=/>\s*₹\s?([\d,]{2,9})\s*</.exec(H);if(bp)r.p=num(bp[1])}
 if(!r.t&&tt)r.t=tt;
 if(r.t)r.t=dec(r.t).replace(/^amazon\.in\s*:\s*/i,'').replace(/^buy\s+/i,'').replace(/\s+(?:online\s+(?:at|in|from)\b.*|-\s*buy\b.*)$/i,'').replace(/\s*[:|]\s*amazon\.in\b.*$/i,'').replace(/\s*[|\-–]\s*(?:myntra|flipkart(?:\.com)?|meesho|ajio(?:\.com)?|nykaa|firstcry|tata cliq|jiomart|snapdeal|croma|lenskart)\b.*$/i,'').replace(/\s+/g,' ').trim().slice(0,140);
 if(r.t&&/^(?:amazon\.in|flipkart|myntra|meesho|ajio|online shopping.*)$/i.test(r.t))delete r.t;
 if(r.img&&/sprite|logo|favicon|placeholder|transparent-pixel|grey-pixel/i.test(r.img))delete r.img;
 if(r.mrp&&r.p&&r.mrp<=r.p)delete r.mrp;
 /* 5. return policy from the page text */
 if(!r.ret){var tx=(r.rtxt||'')+' '+H.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
  if(/\b(?:non[- ]?returnable|not returnable|no returns? (?:applicable|accepted|allowed|policy)|returns? (?:is |are )?not (?:available|applicable|accepted|allowed)|no return or exchange)\b/i.test(tx))r.ret={d:0,k:'none'};
  else{var m=/(\d{1,2})\s*[- ]?\s*days?\s+(?:easy\s+)?(returns?|replacements?|exchanges?|refund)(?:\s*(?:&|and|\/)\s*(exchanges?|returns?))?/i.exec(tx)||/easy\s+(\d{1,2})\s*days?\s+(returns?|exchanges?)/i.exec(tx)||/(returns?|replacements?|exchanges?)\s+within\s+(\d{1,2})\s*days/i.exec(tx);
   if(m){var dN=+(/^\d/.test(m[1])?m[1]:m[2]),w=(/^\d/.test(m[1])?m[2]:m[1]).toLowerCase();if(dN>0&&dN<=90)r.ret={d:dN,k:/repl/.test(w)?'replace':/exch/.test(w)&&!/ret/.test(w+(m[3]||''))?'exchange':'return'}}}}
 if(!r.img&&!r.p){var nx=/<meta[^>]+http-equiv=["']?refresh["']?[^>]+url=([^"'>\s]+)/i.exec(H)||/(?:location\.(?:href|replace)\s*[=(]\s*|window\.location\s*=\s*)["'](https?:\/\/[^"']+)["']/i.exec(H)||/["'](https?:\/\/(?:www\.)?myntra\.com\/[^"'\s<>]*?\/\d{5,}\/buy[^"'\s<>]*)["']/i.exec(H)||/<link[^>]+rel=["']canonical["'][^>]+href=["'](https?:\/\/[^"']+)["']/i.exec(H)||/<meta[^>]+property=["']og:url["'][^>]+content=["'](https?:\/\/[^"']+)["']/i.exec(H);
  if(nx){var nu=abs(dec(nx[1]));if(nu&&nu!==url&&/amazon|amzn|flipkart|myntra|meesho|ajio|nykaa|firstcry|tatacliq|jiomart|snapdeal|croma|lenskart/i.test(nu))r.next=nu}}
 delete r.rtxt;return r}
const SHOPS=/(^|\.)(amazon\.in|amazon\.com|amzn\.in|amzn\.to|amzn\.eu|a\.co|flipkart\.com|fkrt\.it|fkrt\.cc|fkrt\.co|myntra\.com|myntr\.it|myntr\.in|meesho\.com|msho\.in|ajio\.com|ajio\.me|nykaa\.com|nykaafashion\.com|firstcry\.com|tatacliq\.com|jiomart\.com|snapdeal\.com|croma\.com|lenskart\.com)$/i;
const ORIGINS=/^https:\/\/(www\.)?ourworldhive\.com$|^http:\/\/localhost(:\d+)?$|^http:\/\/127\.0\.0\.1(:\d+)?$/;
const UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
function okUrl(s){try{const u=new URL(s);return (u.protocol==='https:'||u.protocol==='http:')&&SHOPS.test(u.hostname)?u:null}catch(e){return null}}
export default {
  async fetch(req, env, ctx) {
    const o=req.headers.get('Origin')||'',cors={'Access-Control-Allow-Origin':ORIGINS.test(o)?o:'https://ourworldhive.com','Access-Control-Allow-Methods':'GET, OPTIONS','Vary':'Origin'};
    if(req.method==='OPTIONS')return new Response(null,{headers:cors});
    const json=(d,st,age)=>new Response(JSON.stringify(d),{status:st||200,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age='+(age||0)}});
    const q=new URL(req.url).searchParams.get('u')||'';let u=okUrl(q);
    if(!u)return json({error:'Only shop product links (Amazon, Flipkart, Myntra, Meesho, AJIO, Nykaa…) can be read.'},400);
    const cache=caches.default,key=new Request('https://hive-meta.cache/?u='+encodeURIComponent(u.href));
    const hit=await cache.match(key);if(hit){const r=new Response(hit.body,hit);Object.entries(cors).forEach(([k,v])=>r.headers.set(k,v));return r}
    let res=null,fin=u.href;
    for(let hop=0;hop<7;hop++){
      res=await fetch(u.href,{redirect:'manual',headers:{'User-Agent':UA,'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Accept-Language':'en-IN,en;q=0.9'}}).catch(()=>null);
      if(!res)break;
      if(res.status>=300&&res.status<400){const loc=res.headers.get('Location');const nu=loc?okUrl(new URL(loc,u).href):null;if(!nu){res=null;break}u=nu;fin=u.href;continue}
      break;
    }
    if(!res)return json({fin,error:'The shop did not answer.'},200,60);
    let html='';try{const rd=res.body.getReader(),dc=new TextDecoder();let n=0;for(;;){const {done,value}=await rd.read();if(done)break;n+=value.length;html+=dc.decode(value,{stream:true});if(n>3000000){rd.cancel();break}}}catch(e){}
    const m=metaOf(html,fin);m.fin=fin;m.st=res.status;
    const good=!!(m.img||m.p||m.ret);
    const out=json(m,200,good?43200:120);if(good)ctx.waitUntil(cache.put(key,out.clone()));return out;
  }
};
