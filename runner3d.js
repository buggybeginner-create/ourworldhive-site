/* Hive Runner 3D - real-time 3D endless runner for ourworldhive.com
   Engine: three.js r184 (local copy in /lib3d). Characters: rigged, skeleton-animated glTF models in /models3d
   (Bolt = CC0 "RobotExpressive" by Tomas Laulhe / Quaternius; Vanguard and X-Bot = free Mixamo characters).
   Everything else (city, road, obstacles, sky, particles, sound, music) is generated in code. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
const DEBUG=/[?&]debug/.test(location.search);

/* ---------------------------------------------------------------- save data */
const SKEY='owh_r3d_v1';
const SAVE=(()=>{let d={};try{d=JSON.parse(localStorage.getItem(SKEY)||'{}')}catch(e){}
  return Object.assign({coins:300,best:0,own:['char:robot','skin:robot:std','skin:soldier:std','skin:xbot:std','trail:none'],char:'robot',skin:{robot:'std',soldier:'std',xbot:'std'},trail:'none',snd:1,q:'auto',tut:0,runs:0},d)})();
function save(){try{localStorage.setItem(SKEY,JSON.stringify(SAVE))}catch(e){}}
const owns=k=>SAVE.own.indexOf(k)>=0;

/* ---------------------------------------------------------------- catalogue */
const CHARS={
  robot:{r0:0,name:'Bolt',icon:'\u{1F916}',price:0,url:'models3d/RobotExpressive.glb',anim:{idle:'Idle',run:'Running',jump:'Jump',die:'Death'},mats:{body:'Main',accent:'Grey'}},
  soldier:{r0:Math.PI,name:'Vanguard',icon:'\u{1F9D1}‍\u{1F680}',price:600,url:'models3d/Soldier.glb',anim:{idle:'Idle',run:'Run'},mats:{body:'VanguardBodyMat',glow:'Vanguard_VisorMat'}},
  xbot:{r0:0,name:'X-Bot',icon:'\u{1F9BE}',price:1200,url:'models3d/Xbot.glb',anim:{idle:'idle',run:'run',sad:'sad_pose'},mats:{body:'HighLimbs',accent:'Joints'}}
};
const SKINS=[
  {id:'std',name:'Original',price:0,sw:'linear-gradient(135deg,#9aa3b8,#e9edf7)'},
  {id:'crimson',name:'Crimson',price:250,body:'#e0213a',accent:'#2a0509',glow:'#ff6a7d',metal:.35,rough:.4,sw:'linear-gradient(135deg,#ff4d63,#7c0f1f)'},
  {id:'cyber',name:'Cyber',price:400,body:'#12c6d9',accent:'#0b2a3a',glow:'#3df2ff',metal:.5,rough:.3,sw:'linear-gradient(135deg,#46f3ff,#0c5f78)'},
  {id:'toxic',name:'Toxic',price:500,body:'#7dff4a',accent:'#14260a',glow:'#caff7a',metal:.3,rough:.45,sw:'linear-gradient(135deg,#a8ff6b,#2f8a1c)'},
  {id:'royal',name:'Royal',price:650,body:'#7a3cff',accent:'#1c0d44',glow:'#d3b3ff',metal:.55,rough:.28,sw:'linear-gradient(135deg,#a778ff,#3d1496)'},
  {id:'void',name:'Void',price:900,body:'#15161d',accent:'#ff2f9e',glow:'#ff2f9e',metal:.85,rough:.3,sw:'linear-gradient(135deg,#3a3d4c,#07070b)'},
  {id:'chrome',name:'Chrome',price:1200,body:'#e6ebf5',accent:'#58607a',glow:'#bfe9ff',metal:1,rough:.1,sw:'linear-gradient(135deg,#ffffff,#8791a8,#f2f5fb)'},
  {id:'gold',name:'Gold',price:2000,body:'#ffc23a',accent:'#7a4a00',glow:'#fff0a8',metal:1,rough:.2,sw:'linear-gradient(135deg,#fff0a0,#d9921b,#ffe28a)'}
];
const TRAILS=[
  {id:'none',name:'No trail',price:0,col:null,sw:'#222'},
  {id:'neon',name:'Neon',price:200,col:[0.24,0.95,1],sw:'linear-gradient(135deg,#3df2ff,#2a7bff)'},
  {id:'pink',name:'Pulse',price:300,col:[1,0.31,0.64],sw:'linear-gradient(135deg,#ff4fa3,#9b5cff)'},
  {id:'fire',name:'Fire',price:450,col:[1,0.5,0.1],sw:'linear-gradient(135deg,#ffd23f,#ff3b1e)'},
  {id:'gold',name:'Stardust',price:800,col:[1,0.85,0.35],sw:'linear-gradient(135deg,#fff3b0,#e8a91a)'}
];

/* ---------------------------------------------------------------- constants */
const LANE=2.2,CH_LEN=48,NCH=8,JV=10.2,GRAV=29;
const THEMES=[
  {name:'dusk', top:'#1d1560',mid:'#9a3aa5',hor:'#ff8a4c',fog:'#b85a78',sun:'#ffb070',sunY:.06,star:0,hemiS:'#ffb4a0',hemiG:'#3a2060',dir:'#ffb27a',dirI:2.4,hemiI:.85,win:.8,bld:.5,env:.9,edge:'#ff4fa3',exp:1.0},
  {name:'night',top:'#02030f',mid:'#0b1550',hor:'#25399a',fog:'#10195a',sun:'#bfe3ff',sunY:.32,star:1,hemiS:'#6f86ff',hemiG:'#101030',dir:'#8ab4ff',dirI:1.1,hemiI:.55,win:1.25,bld:.28,env:.55,edge:'#3df2ff',exp:1.05},
  {name:'day',  top:'#2f7fe0',mid:'#78bdf0',hor:'#dff0ff',fog:'#b8d9f2',sun:'#fff4d6',sunY:.55,star:0,hemiS:'#d8ecff',hemiG:'#8a8f98',dir:'#fff0d8',dirI:3.0,hemiI:1.1,win:.06,bld:1.0,env:1.15,edge:'#ffd23f',exp:.95}
];
const NEON=['#ff2f9e','#3df2ff','#ffd23f','#9b5cff','#41ff8f'];

/* ---------------------------------------------------------------- renderer / scene */
const canvas=$('cv');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false,stencil:false})}catch(e){$('nogl').style.display='flex';$('load').style.display='none';throw e}
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(62,1,.1,1200);
scene.add(camera);
scene.fog=new THREE.Fog(0x000000,30,320);
const hemi=new THREE.HemisphereLight(0xffffff,0x222244,1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2);sun.castShadow=true;
sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-10;sun.shadow.camera.near=1;sun.shadow.camera.far=60;
sun.shadow.bias=-0.0006;sun.shadow.normalBias=.03;
scene.add(sun);scene.add(sun.target);

/* ---------------------------------------------------------------- quality */
const QN=['Low','Medium','High'];
let Q=2,composer=null,bloom=null,qAuto=SAVE.q==='auto';
const isTouch=matchMedia('(pointer:coarse)').matches;
function applyQuality(q){
  Q=clamp(q,0,2);
  const dpr=window.devicePixelRatio||1,pr=[1,Math.min(dpr,1.5),Math.min(dpr,2)][Q];
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled=Q>0;
  sun.castShadow=Q>0;
  const sm=Q===2?2048:1024;if(sun.shadow.mapSize.x!==sm){sun.shadow.mapSize.set(sm,sm);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
  renderer.setSize(innerWidth,innerHeight,false);
  if(composer){composer.dispose();composer=null;bloom=null}
  if(Q>0){
    const w=Math.floor(innerWidth*pr),h=Math.floor(innerHeight*pr);
    const rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:Q===2?4:2});
    composer=new EffectComposer(renderer,rt);composer.setPixelRatio(pr);composer.setSize(innerWidth,innerHeight);
    composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.42,.6,.92);composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  $('qLbl').textContent=qAuto?'Auto ('+QN[Q]+')':QN[Q];
}
function resize(){
  const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);if(composer){composer.setSize(w,h)}
  if(bloom)bloom.setSize(w,h);
}
addEventListener('resize',resize);

/* ---------------------------------------------------------------- textures */
function cvs(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c}
function tex(c,srgb=true,rep){const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);return t}
const asphaltC=cvs(256,256,(g,w,h)=>{g.fillStyle='#2b2c36';g.fillRect(0,0,w,h);
  for(let i=0;i<5200;i++){const v=(Math.random()*40)|0;g.fillStyle='rgba('+(40+v)+','+(40+v)+','+(52+v)+','+(Math.random()*.5)+')';g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}
  g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1;for(let i=0;i<9;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<6;k++){x+=rnd(-22,22);y+=rnd(-22,22);g.lineTo(x,y)}g.stroke()}});
const WIN_COLS=['#ffd48a','#ffc46b','#9fe9ff','#ff9bd6','#d6c6ff','#fff3c8'];
const winBase=cvs(128,256,(g,w,h)=>{g.fillStyle='#6b7390';g.fillRect(0,0,w,h)});
const winLit=[];
(function(){ /* same random layout for color map and emissive map */
  const cells=[];for(let r=0;r<8;r++)for(let c=0;c<4;c++)cells.push({r,c,lit:Math.random()<.46,col:pick(WIN_COLS)});
  const base=cvs(128,256,(g,w,h)=>{g.fillStyle='#707a98';g.fillRect(0,0,w,h);
    for(let i=0;i<900;i++){g.fillStyle='rgba(20,24,40,'+Math.random()*.18+')';g.fillRect(Math.random()*w,Math.random()*h,2,2)}
    g.fillStyle='rgba(20,26,44,.55)';for(let r=0;r<=8;r++)g.fillRect(0,r*32-1,w,3);
    for(const k of cells){g.fillStyle=k.lit?k.col:'#1b2236';g.fillRect(k.c*32+6,k.r*32+7,20,17)}});
  const emi=cvs(128,256,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);for(const k of cells){if(k.lit){g.fillStyle=k.col;g.fillRect(k.c*32+6,k.r*32+7,20,17)}}});
  winLit.push(base,emi)})();
const stripeBar=cvs(256,128,(g,w,h)=>{g.fillStyle='#d8d8de';g.fillRect(0,0,w,h);g.fillStyle='#ff6a1a';for(let x=-h;x<w+h;x+=48){g.beginPath();g.moveTo(x,h);g.lineTo(x+24,h);g.lineTo(x+24+h,0);g.lineTo(x+h,0);g.fill()}
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,h-26,w,26)});
const chevron=cvs(256,64,(g,w,h)=>{g.fillStyle='#ffc61a';g.fillRect(0,0,w,h);g.fillStyle='#16161c';for(let x=-h;x<w+h;x+=44){g.beginPath();g.moveTo(x,h);g.lineTo(x+22,h);g.lineTo(x+22+h,0);g.lineTo(x+h,0);g.fill()}});
function containerTex(col){return cvs(128,128,(g,w,h)=>{g.fillStyle=col;g.fillRect(0,0,w,h);for(let x=0;x<w;x+=10){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x,0,3,h);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x+3,0,2,h)}
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,w,6);g.fillRect(0,h-6,w,6)})}
const coinC=cvs(128,128,(g,w,h)=>{const r=g.createRadialGradient(64,64,6,64,64,64);r.addColorStop(0,'#fff2a6');r.addColorStop(.6,'#ffc21a');r.addColorStop(1,'#d08a00');g.fillStyle=r;g.fillRect(0,0,w,h);
  g.strokeStyle='#b87400';g.lineWidth=8;g.beginPath();g.arc(64,64,50,0,6.283);g.stroke();g.fillStyle='#a86a00';g.font='900 70px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('H',64,70)});
const glowC=cvs(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});

/* ---------------------------------------------------------------- sky + environment */
const skyU={top:{value:new THREE.Color()},mid:{value:new THREE.Color()},hor:{value:new THREE.Color()},sunC:{value:new THREE.Color()},sunD:{value:new THREE.Vector3(0,.1,-1).normalize()},night:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
  vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vD;uniform vec3 top,mid,hor,sunC,sunD;uniform float night;
  void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.,1.);
   vec3 c=mix(hor,mid,smoothstep(0.,.16,h));c=mix(c,top,smoothstep(.1,.75,h));
   float sd=max(dot(d,sunD),0.);c+=sunC*(smoothstep(.9985,.9992,sd)*5.+pow(sd,40.)*.45+pow(sd,6.)*.12);
   vec3 p=floor(d*260.);float r=fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);
   c+=vec3(step(.9962,r))*smoothstep(.08,.4,d.y)*night*1.4;
   c=mix(c,hor,1.-smoothstep(-.2,0.,d.y));
   gl_FragColor=vec4(c,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`}));
sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);
const envScene=new THREE.Scene();
{const em=sky.material.clone();em.uniforms=THREE.UniformsUtils.clone(skyU);envScene.add(new THREE.Mesh(sky.geometry,em))}
let pmrem,envTex=[];
function buildEnvs(){
  pmrem=new THREE.PMREMGenerator(renderer);
  const u=envScene.children[0].material.uniforms;
  THEMES.forEach((T,i)=>{u.top.value.set(T.top);u.mid.value.set(T.mid);u.hor.value.set(T.hor);u.sunC.value.set(T.sun);u.sunD.value.set(0,T.sunY,-1).normalize();u.night.value=T.star;
    envTex[i]=pmrem.fromScene(envScene,0,.1,1000).texture});
}

/* ---------------------------------------------------------------- shared materials / geometries */
const M={};
M.road=new THREE.MeshStandardMaterial({map:tex(asphaltC,true,[1,6]),roughness:.5,metalness:.25,envMapIntensity:1.4});
M.ground=new THREE.MeshStandardMaterial({color:0x14141c,roughness:.95,metalness:0});
M.curb=new THREE.MeshStandardMaterial({color:0x4a4d5e,roughness:.7});
M.dash=new THREE.MeshBasicMaterial({color:new THREE.Color(0.62,0.68,0.85)});
M.edge=new THREE.MeshBasicMaterial({color:0xffffff});
M.pole=new THREE.MeshStandardMaterial({color:0x2a2c3a,roughness:.6,metalness:.7});
M.lamp=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.82,.5).multiplyScalar(3)});
M.concrete=new THREE.MeshStandardMaterial({map:tex(stripeBar),roughness:.7,metalness:.05});
M.chev=new THREE.MeshStandardMaterial({map:tex(chevron),roughness:.5,metalness:.2});
M.steel=new THREE.MeshStandardMaterial({color:0x3a3d4c,roughness:.45,metalness:.8});
M.red=new THREE.MeshBasicMaterial({color:new THREE.Color(1,.1,.1).multiplyScalar(3.5)});
M.white=new THREE.MeshBasicMaterial({color:new THREE.Color(1,1,1).multiplyScalar(2.5)});
M.black=new THREE.MeshStandardMaterial({color:0x0b0b10,roughness:.9});
{const ct=tex(coinC);M.coin=new THREE.MeshStandardMaterial({map:ct,emissiveMap:ct,emissive:0xffffff,emissiveIntensity:.42,metalness:.75,roughness:.3})}
M.neon=NEON.map(c=>new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(2.6),side:THREE.DoubleSide,fog:true}));
M.truck=['#2f6fd0','#d03a3a','#e0b020','#2a9a62','#8a45c9','#c7ccd8'].map(c=>new THREE.MeshStandardMaterial({map:tex(containerTex(c)),roughness:.55,metalness:.3}));
M.bld=[16,26,38,54].map(H=>{const b=tex(winLit[0],true,[1,H/25.6]),e=tex(winLit[1],true,[1,H/25.6]);
  return {H,mat:new THREE.MeshStandardMaterial({map:b,emissiveMap:e,emissive:0xffffff,emissiveIntensity:1,roughness:.6,metalness:.15}),}});
const G_={};
G_.box=new THREE.BoxGeometry(1,1,1);G_.box.translate(0,.5,0);
G_.road=new THREE.PlaneGeometry(7.4,CH_LEN);G_.road.rotateX(-Math.PI/2);
G_.ground=new THREE.PlaneGeometry(140,CH_LEN);G_.ground.rotateX(-Math.PI/2);
G_.coin=new THREE.CylinderGeometry(.4,.4,.12,24);G_.coin.rotateX(Math.PI/2);
G_.pole=new THREE.CylinderGeometry(.07,.1,7.5,8);G_.pole.translate(0,3.75,0);
G_.sign=new THREE.PlaneGeometry(1,1);

/* ---------------------------------------------------------------- chunks (road + city) */
const chunks=[];
const dummy=new THREE.Object3D();
function mergeParts(parts){return mergeGeometries(parts.map(q=>{const g=q.geo.clone();g.scale(q.sx||1,q.sy||1,q.sz||1);g.translate(q.x||0,q.y||0,q.z||0);return g}))}
{const cu=[],ed=[],po=[],la=[];
 for(const sd of[-1,1]){
  cu.push({geo:G_.box,sx:.5,sy:.18,sz:CH_LEN,x:sd*4.0,y:-.02,z:-CH_LEN/2});
  ed.push({geo:G_.box,sx:.09,sy:.03,sz:CH_LEN,x:sd*3.55,y:.012,z:-CH_LEN/2});
  for(let k=0;k<2;k++){const z=-12-k*24;
   po.push({geo:G_.pole,x:sd*4.4,z});po.push({geo:G_.box,sx:1.5,sy:.1,sz:.1,x:sd*3.7,y:7.4,z});
   la.push({geo:G_.box,sx:.8,sy:.12,sz:.35,x:sd*3.1,y:7.3,z})}}
 G_.curbs=mergeParts(cu);G_.edges=mergeParts(ed);G_.poles=mergeParts(po);G_.lamps=mergeParts(la)}
const BX=[7.6,18],BCOUNT=12;
function mkChunk(){
  const g=new THREE.Group();scene.add(g);
  const road=new THREE.Mesh(G_.road,M.road);road.position.set(0,0,-CH_LEN/2);road.receiveShadow=true;g.add(road);
  const gr=new THREE.Mesh(G_.ground,M.ground);gr.position.set(0,-.06,-CH_LEN/2);g.add(gr);
  g.add(new THREE.Mesh(G_.curbs,M.curb));g.add(new THREE.Mesh(G_.edges,M.edge));g.add(new THREE.Mesh(G_.poles,M.pole));g.add(new THREE.Mesh(G_.lamps,M.lamp));
  /* lane dashes */
  const dashes=new THREE.InstancedMesh(G_.box,M.dash,2*8);
  let n=0;for(const x of[-LANE/2,LANE/2])for(let k=0;k<8;k++){dummy.position.set(x,.015,-k*6-1.5);dummy.scale.set(.1,.02,2.6);dummy.rotation.set(0,0,0);dummy.updateMatrix();dashes.setMatrixAt(n++,dummy.matrix)}
  g.add(dashes);
  /* buildings */
  const blds=[];
  for(let i=0;i<BCOUNT;i++){const b=new THREE.Mesh(G_.box,M.bld[0].mat);b.frustumCulled=true;g.add(b);blds.push(b)}
  const signs=[];for(let i=0;i<3;i++){const s=new THREE.Mesh(G_.sign,M.neon[0]);g.add(s);signs.push(s)}
  /* coins */
  const coinMesh=new THREE.InstancedMesh(G_.coin,M.coin,56);coinMesh.frustumCulled=false;coinMesh.count=0;g.add(coinMesh);
  const c={g,blds,signs,coinMesh,z0:0,obs:[],coins:[],picks:[],meshes:[],built:false};
  chunks.push(c);return c;
}
const THEME_BLD=M.bld;
function buildCity(c){
  const seg=CH_LEN/(BCOUNT/2);
  c.blds.forEach((b,i)=>{
    const side=i%2?1:-1,slot=(i/2)|0;
    const cls=THEME_BLD[(Math.random()*4)|0],w=rnd(8,12),d=rnd(seg*.78,seg*1.02);
    const row2=slot%2===1&&Math.random()<.55;
    b.material=cls.mat;b.scale.set(w,cls.H*(row2?1.25:1),d);
    b.position.set(side*(BX[0]+w/2+(row2?rnd(10,16):rnd(0,3))),0,-(slot+.5)*seg);
    b.visible=true;
  });
  c.signs.forEach(s=>{
    const side=Math.random()<.5?-1:1;
    s.material=pick(M.neon);const w=rnd(2.5,5),h=rnd(1,2.2);s.scale.set(w,h,1);
    s.position.set(side*(BX[0]-.06),rnd(5,16),-rnd(3,CH_LEN-3));s.rotation.y=side>0?-Math.PI/2:Math.PI/2;
  });
}

/* obstacle pools */
const pool={barrier:[],gate:[],truck:[],shield:[],magnet:[],x2:[]};
function mkBarrier(){const g=new THREE.Group();const m=new THREE.Mesh(G_.box,M.concrete);m.scale.set(1.9,.95,.7);m.castShadow=false;g.add(m);
  const t=new THREE.Mesh(G_.box,M.red);t.scale.set(.25,.12,.25);t.position.set(.0,.95,0);g.add(t);return g}
function mkGate(){const g=new THREE.Group();
  for(const s of[-1,1]){const p=new THREE.Mesh(G_.box,M.steel);p.scale.set(.28,3.4,.4);p.position.set(s*1.0,0,0);g.add(p)}
  const bm=new THREE.Mesh(G_.box,M.chev);bm.scale.set(2.2,.55,.6);bm.position.set(0,1.2,0);g.add(bm);
  const top=new THREE.Mesh(G_.box,M.steel);top.scale.set(2.3,1.2,.5);top.position.set(0,1.75,0);g.add(top);
  const l=new THREE.Mesh(G_.box,M.red);l.scale.set(1.9,.06,.06);l.position.set(0,1.18,.31);g.add(l);return g}
function mkTruck(){const g=new THREE.Group();const m=new THREE.Mesh(G_.box,M.truck[0]);m.scale.set(2.0,2.55,5.2);m.position.y=.45;g.add(m);m.userData.body=1;
  const sk=new THREE.Mesh(G_.box,M.black);sk.scale.set(1.9,.5,5);g.add(sk);sk.position.y=.05;
  for(const s of[-1,1]){const t=new THREE.Mesh(G_.box,M.red);t.scale.set(.34,.22,.06);t.position.set(s*.72,.85,2.62);g.add(t);
    const w=new THREE.Mesh(G_.box,M.white);w.scale.set(.5,.08,.06);w.position.set(s*.5,.55,2.62);g.add(w)}
  return g}
function mkPick(kind){const g=new THREE.Group();const col={shield:0x3df2ff,magnet:0xff4f6a,x2:0xffd23f}[kind];
  const geo=kind==='shield'?new THREE.IcosahedronGeometry(.5,1):kind==='magnet'?new THREE.TorusGeometry(.38,.14,10,22):new THREE.OctahedronGeometry(.55);
  const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.6,metalness:.4,roughness:.25}));m.position.y=1.15;g.add(m);
  const h=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(glowC),color:col,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));h.scale.set(2.2,2.2,1);h.position.y=1.15;g.add(h);
  g.userData.m=m;return g}
function getOb(type){let g=pool[type].pop();if(!g){g=type==='barrier'?mkBarrier():type==='gate'?mkGate():type==='truck'?mkTruck():mkPick(type)}g.visible=true;return g}

/* ---------------------------------------------------------------- run generator */
let genZ=-60,live=false,rowCount=0;
function releaseChunk(c){
  for(const o of c.obs){c.g.remove(o.mesh);pool[o.type].push(o.mesh)}
  for(const o of c.picks){c.g.remove(o.mesh);pool[o.type].push(o.mesh)}
  c.obs.length=0;c.picks.length=0;c.coins.length=0;
}
function chunkAt(z){for(const c of chunks){if(z<=c.z0&&z>c.z0-CH_LEN)return c}return null}
function addCoin(x,y,z){const c=chunkAt(z);if(!c||c.coins.length>=54)return;c.coins.push({x,y,z,alive:true,ph:Math.random()*6})}
function addOb(type,lane,z){
  const c=chunkAt(z);if(!c)return null;
  const m=getOb(type);const x=(lane-1)*LANE;
  let hz=.45,hx=.95;
  if(type==='truck'){hz=2.6;hx=1.0;const body=m.children[0];body.material=pick(M.truck)}
  if(type==='gate'){hz=.35;hx=1.0}
  m.position.set(x,0,z-c.z0);c.g.add(m);
  const o={type,x,z,hz,hx,mesh:m,alive:true};c.obs.push(o);return o}
function addPick(type,lane,z){const c=chunkAt(z);if(!c)return;const m=getOb(type);m.position.set((lane-1)*LANE,0,z-c.z0);c.g.add(m);c.picks.push({type,x:(lane-1)*LANE,z,mesh:m,alive:true})}
function coinLine(lane,z0,n,y=1.0,gap=2.1){for(let i=0;i<n;i++)addCoin((lane-1)*LANE,y,z0-i*gap)}
function coinArc(lane,zc,n=7,gap=1.9,hgt=2.0){for(let i=0;i<n;i++){const t=(i-(n-1)/2)/((n-1)/2);addCoin((lane-1)*LANE,1.0+hgt*(1-t*t),zc-(i-(n-1)/2)*gap)}}
function genRow(z,diff){
  rowCount++;
  const lanes=[0,1,2];const free=pick(lanes);const others=lanes.filter(l=>l!==free);
  const r=Math.random();
  const w=[3,2.2,2.2,1+diff*2.4,diff*2.4,diff*1.8,diff*1.6,.5+diff*1.2,diff*1.6];
  let tot=0;for(const v of w)tot+=v;let k=Math.random()*tot,t=0;for(;t<w.length;t++){k-=w[t];if(k<=0)break}t=Math.min(t,w.length-1);
  const single=pick(lanes);
  let barrierLanes=[],freeLane=single;
  switch(t){
    case 0:addOb('barrier',single,z);barrierLanes=[single];coinArc(single,z,7);break;
    case 1:addOb('gate',single,z);freeLane=pick(lanes.filter(l=>l!==single));coinLine(freeLane,z+6,6);break;
    case 2:addOb('truck',single,z);freeLane=pick(lanes.filter(l=>l!==single));coinLine(freeLane,z+4,7);break;
    case 3:addOb('barrier',others[0],z);addOb('barrier',others[1],z);barrierLanes=others;coinLine(free,z+8,6);coinArc(others[0],z,6);break;
    case 4:addOb('truck',others[0],z);addOb('barrier',others[1],z+1);coinLine(free,z+6,7);break;
    case 5:addOb('gate',others[0],z);addOb('barrier',others[1],z);coinLine(free,z+6,6);break;
    case 6:addOb('gate',others[0],z);addOb('gate',others[1],z);coinLine(free,z+5,7);break;
    case 7:for(const l of lanes)addOb('barrier',l,z);coinArc(1,z,8,1.8,2.2);break;
    case 8:addOb('truck',others[0],z);addOb('truck',others[1],z);coinLine(free,z+4,8);break;
  }
  if(rowCount%6===3&&Math.random()<.8){const kind=pick(['shield','magnet','x2']);addPick(kind,pick(lanes),z+16)}
}
function fillChunk(c){
  if(!live)return;
  const lo=c.z0-CH_LEN;
  const diff=clamp(G.dist/2600,0,1);
  while(genZ>lo+3){
    genRow(genZ,diff);
    genZ-=22+G.speed*.55+rnd(0,9)-diff*4;
  }
}
function buildChunk(c,z0){
  releaseChunk(c);c.z0=z0;c.g.position.z=z0;
  buildCity(c);fillChunk(c);c.built=true;syncCoinMesh(c);
}
function resetWorld(isLive){
  live=isLive;genZ=-62;rowCount=0;
  chunks.forEach((c,i)=>{releaseChunk(c);c.z0=26-i*CH_LEN;c.g.position.z=c.z0});
  chunks.forEach(c=>{buildCity(c);fillChunk(c);c.built=true;syncCoinMesh(c)});
}
function recycle(){
  let minZ=Infinity,back=null;
  for(const c of chunks){if(c.z0<minZ)minZ=c.z0}
  for(const c of chunks){if(c.z0-CH_LEN>P.z+34){buildChunk(c,minZ-CH_LEN);minZ-=CH_LEN}}
}
function syncCoinMesh(c,time=0){
  let n=0;
  for(const k of c.coins){
    if(!k.alive)continue;
    dummy.position.set(k.x,k.y+Math.sin(time*3+k.ph)*.06,k.z-c.z0);dummy.rotation.set(0,time*3.2+k.ph,0);dummy.scale.setScalar(1);dummy.updateMatrix();c.coinMesh.setMatrixAt(n++,dummy.matrix)}
  c.coinMesh.count=n;c.coinMesh.instanceMatrix.needsUpdate=true;
}
for(let i=0;i<NCH;i++)mkChunk();

/* ---------------------------------------------------------------- speed streaks + particles */
const STR=70;
const strGeo=new THREE.BufferGeometry();const strPos=new Float32Array(STR*6);strGeo.setAttribute('position',new THREE.BufferAttribute(strPos,3));
const strMat=new THREE.LineBasicMaterial({color:0xaee8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
const streaks=new THREE.LineSegments(strGeo,strMat);streaks.frustumCulled=false;scene.add(streaks);
function respawnStreak(i,zRef){const x=rnd(-9,9),y=rnd(.4,7),z=zRef-rnd(20,110);const len=rnd(1.5,4);
  if(Math.abs(x)<3.8&&y<3)return respawnStreak(i,zRef);
  strPos.set([x,y,z,x,y,z-len],i*6)}
function initStreaks(z){for(let i=0;i<STR;i++){respawnStreak(i,z);strPos[i*6+2]+=rnd(0,100);strPos[i*6+5]+=rnd(0,100)}strGeo.attributes.position.needsUpdate=true}
function updateStreaks(z,sp){for(let i=0;i<STR;i++){if(strPos[i*6+2]>z+12)respawnStreak(i,z)}strGeo.attributes.position.needsUpdate=true;strMat.opacity=clamp((sp-13)/26,0,1)*.55}

const NP=220;
const pGeo=new THREE.BufferGeometry();
const pPos=new Float32Array(NP*3),pCol=new Float32Array(NP*3),pVel=new Float32Array(NP*3),pLife=new Float32Array(NP),pMax=new Float32Array(NP);
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pMat=new THREE.PointsMaterial({size:.26,map:tex(glowC),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
const parts=new THREE.Points(pGeo,pMat);parts.frustumCulled=false;scene.add(parts);
let pi=0;
function emit(x,y,z,vx,vy,vz,col,life){const i=pi++%NP;pPos.set([x,y,z],i*3);pVel.set([vx,vy,vz],i*3);pCol.set(col,i*3);pLife[i]=pMax[i]=life}
function updateParticles(dt){
  for(let i=0;i<NP;i++){
    if(pLife[i]<=0){pPos[i*3+1]=-50;continue}
    pLife[i]-=dt;const f=clamp(pLife[i]/pMax[i],0,1);
    pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
    pVel[i*3+1]-=6*dt;
    const k=f*f;pCol[i*3]*=1-dt*0.2;
    if(pLife[i]<=0)pPos[i*3+1]=-50;
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
}
function burst(x,y,z,col,n,sp){for(let i=0;i<n;i++){const a=Math.random()*6.283,b=Math.random()*3.1;emit(x,y,z,Math.cos(a)*sp*Math.random(),Math.abs(Math.sin(b))*sp*.9,Math.sin(a)*sp*Math.random(),col,rnd(.35,.8))}}

/* ---------------------------------------------------------------- characters */
const player=new THREE.Group();scene.add(player);
const lean=new THREE.Group();player.add(lean);
const gltfLoader=new GLTFLoader();
const CACHE={};let cur=null;
function findMat(entry,name){for(const m of entry.mats){if(m.name===name||m.name.indexOf(name)>=0)return m}return null}
async function loadChar(id,onP){
  if(CACHE[id])return CACHE[id];
  const def=CHARS[id];
  const gltf=await gltfLoader.loadAsync(def.url,e=>{if(onP&&e.total)onP(e.loaded/e.total)});
  const root=gltf.scene;
  let box=new THREE.Box3().setFromObject(root);const h=box.max.y-box.min.y;const s=1.82/h;root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);root.position.y-=box.min.y;
  const holder=new THREE.Group();holder.add(root);
  const mats=new Set();
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;const a=Array.isArray(o.material)?o.material:[o.material];a.forEach(m=>{mats.add(m)})}});
  const matArr=[...mats];matArr.forEach(m=>{m.userData.base={color:m.color.clone(),metal:m.metalness,rough:m.roughness,emi:m.emissive?m.emissive.clone():null,ei:m.emissiveIntensity}});
  const mixer=new THREE.AnimationMixer(root);const acts={};
  gltf.animations.forEach(a=>{acts[a.name]=mixer.clipAction(a)});
  const e={id,def,holder,root,mats:matArr,mixer,acts,cur:null};
  e.role={};for(const k in def.mats){e.role[k]=findMat(e,def.mats[k])}
  if(DEBUG)console.log('loaded',id,'h',h,'mats',matArr.map(m=>m.name),'roles',Object.fromEntries(Object.entries(e.role).map(([k,v])=>[k,v&&v.name])),'anims',Object.keys(acts));
  CACHE[id]=e;return e;
}
function applySkin(e,skinId){
  const sk=SKINS.find(s=>s.id===skinId)||SKINS[0];
  for(const m of e.mats){const b=m.userData.base;m.color.copy(b.color);m.metalness=b.metal;m.roughness=b.rough;if(b.emi){m.emissive.copy(b.emi);m.emissiveIntensity=b.ei}}
  if(sk.id==='std')return;
  const set=(m,col,metal,rough,emi)=>{if(!m)return;m.color.set(col);if(metal!==undefined){m.metalness=metal;m.roughness=rough}if(emi){m.emissive.set(emi);m.emissiveIntensity=emi?0.55:0}};
  const r=e.role;
  if(r.body){ if(e.id==='soldier'){ /* textured: tint */ r.body.color.set(sk.body).lerp(new THREE.Color(1,1,1),.25);r.body.metalness=Math.min(.8,sk.metal*.8);r.body.roughness=Math.max(.2,sk.rough); r.body.emissive.set(sk.body);r.body.emissiveIntensity=.12 }
    else set(r.body,sk.body,sk.metal,sk.rough) }
  if(r.accent)set(r.accent,sk.accent,e.id==='xbot'?.9:.5,.35);
  if(r.glow){r.glow.color.set(sk.glow);r.glow.emissive.set(sk.glow);r.glow.emissiveIntensity=1.6}
  else if(e.id==='xbot'&&r.accent){r.accent.emissive.set(sk.glow);r.accent.emissiveIntensity=.7}
  else if(e.id==='robot'&&sk.glow){const bl=findMat(e,'Black');if(bl){bl.emissive.set(sk.glow);bl.emissiveIntensity=.45}}
}
function playAnim(name,opt={}){
  const e=cur;if(!e)return;const a=e.acts[name];if(!a)return;
  const fade=opt.fade===undefined?.2:opt.fade;
  if(e.cur===a){if(opt.ts!==undefined)a.timeScale=opt.ts;return}
  a.reset();a.enabled=true;a.setEffectiveWeight(1);a.setEffectiveTimeScale(opt.ts||1);
  if(opt.once){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}else{a.setLoop(THREE.LoopRepeat,Infinity)}
  if(e.cur){e.cur.crossFadeTo(a,fade,false)}
  a.play();e.cur=a;
}
async function setChar(id,skinId){
  const e=await loadChar(id);
  if(cur&&cur!==e){lean.remove(cur.holder);cur.mixer.stopAllAction();cur.cur=null}
  if(cur!==e){cur=e;lean.add(e.holder);e.mixer.stopAllAction();e.cur=null}
  applySkin(e,skinId!==undefined?skinId:SAVE.skin[id]);
  playAnim(e.def.anim.idle,{fade:0});
  return e;
}

/* ---------------------------------------------------------------- audio */
let AC=null,master,sfxG,musG,noiseBuf;
function audioInit(){
  if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
  master=AC.createGain();master.gain.value=SAVE.snd?0.8:0;master.connect(AC.destination);
  sfxG=AC.createGain();sfxG.gain.value=.55;sfxG.connect(master);musG=AC.createGain();musG.gain.value=.17;musG.connect(master);
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function tone(f,dur,type='square',vol=.3,slide=0,when=0,dest){
  if(!AC)return;const t=AC.currentTime+when,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+.02)}
function noise(dur,vol=.4,hp=0,when=0,dest){if(!AC)return;const t=AC.currentTime+when,s=AC.createBufferSource(),g=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type=hp?'highpass':'lowpass';f.frequency.value=hp||900;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(dest||sfxG);s.start(t);s.stop(t+dur)}
const SFX={
  coin(){tone(988,.08,'square',.16);tone(1319,.14,'square',.16,0,.07)},
  jump(){tone(330,.2,'triangle',.3,520)},
  slide(){noise(.28,.22,1800)},
  lane(){tone(200,.07,'triangle',.18,90)},
  pick(){[523,659,784,1047].forEach((f,i)=>tone(f,.12,'square',.16,0,i*.06))},
  shield(){tone(180,.3,'sawtooth',.3,-100);noise(.2,.3,3000)},
  crash(){noise(.7,.7,0);tone(150,.6,'sawtooth',.4,-120);tone(70,.8,'sine',.5,-30)},
  click(){tone(660,.05,'square',.12)},
  go(){tone(880,.3,'square',.22)},
  tick(){tone(440,.12,'square',.18)},
  buy(){[659,880,1175].forEach((f,i)=>tone(f,.14,'triangle',.25,0,i*.07))}
};
function sfx(n){if(SAVE.snd&&AC)SFX[n]()}
/* tiny synthwave loop */
let musOn=false,musStep=0,musNext=0,musTimer=0;
const BASS=[55,55,65.4,55,49,49,41.2,49],ARP=[220,262,330,262,196,247,294,247];
function musicTick(){
  if(!AC||!musOn)return;
  const bpm=104+clamp((G.speed-16)*1.1,0,26),step=60/bpm/2;
  while(musNext<AC.currentTime+.2){
    const w=musNext-AC.currentTime,s=musStep%16;
    if(s%4===0){tone(120,.16,'sine',.9,-80,w,musG)}
    if(s%2===1)noise(.04,.18,7000,w,musG);
    tone(BASS[(s>>1)%8],step*1.6,'sawtooth',.35,0,w,musG);
    if(s%2===0)tone(ARP[(s>>1)%8]*(s>=8?2:1),step*.9,'square',.09,0,w,musG);
    musStep++;musNext+=step}
}
function musicStart(){audioInit();if(!AC||musOn)return;if(AC.state==='suspended')AC.resume();musOn=true;musNext=AC.currentTime+.05;musStep=0;musTimer=setInterval(musicTick,50)}
function musicStop(){musOn=false;clearInterval(musTimer)}
function setSnd(on){SAVE.snd=on?1:0;save();if(master)master.gain.value=on?.8:0;$('bSnd').innerHTML=on?'&#128266;':'&#128263;'}

/* ---------------------------------------------------------------- state */
const P={x:0,y:0,z:0,vy:0,lane:1,slide:0,inv:0,shield:0,magnet:0,x2:0,rollV:0,dead:false,jumping:false};
const G={mode:'load',speed:0,dist:0,coins:0,t:0,time:0,revived:false,shake:0,deadT:0,menuAng:.5,theme:{i:0,j:0,k:1},nextTheme:900,fpsAcc:0,fpsN:0,fpsT:0,lastGrow:0};

/* ---------------------------------------------------------------- theme blending */
const tmp=new THREE.Color(),tmp2=new THREE.Color();
const cache_={};
function tcol(key,T){return cache_[key+T.name]||(cache_[key+T.name]=new THREE.Color(T[key]))}
function applyTheme(){
  const a=THEMES[G.theme.i],b=THEMES[G.theme.j],k=G.theme.k;
  const mix=(key,out)=>out.copy(tcol(key,a)).lerp(tcol(key,b),k);
  mix('top',skyU.top.value);mix('mid',skyU.mid.value);mix('hor',skyU.hor.value);mix('sun',skyU.sunC.value);
  skyU.sunD.value.set(0,lerp(a.sunY,b.sunY,k),-1).normalize();skyU.night.value=lerp(a.star,b.star,k);
  mix('fog',scene.fog.color);
  mix('hemiS',hemi.color);mix('hemiG',hemi.groundColor);hemi.intensity=lerp(a.hemiI,b.hemiI,k);
  mix('dir',sun.color);sun.intensity=lerp(a.dirI,b.dirI,k);
  const win=lerp(a.win,b.win,k),bld=lerp(a.bld,b.bld,k);
  for(const c of M.bld){c.mat.emissiveIntensity=win;c.mat.color.setScalar(bld)}
  mix('edge',tmp);M.edge.color.copy(tmp).multiplyScalar(3);
  renderer.toneMappingExposure=lerp(a.exp,b.exp,k);
  scene.environment=envTex[k<.5?G.theme.i:G.theme.j]||null;scene.environmentIntensity=lerp(a.env,b.env,k);
  scene.background=null;
  if(bloom)bloom.strength=lerp(.5,.35,(k<.5?G.theme.i:G.theme.j)===2?1:0);
}
function stepTheme(dt){
  if(G.theme.k<1){G.theme.k=Math.min(1,G.theme.k+dt/7);applyTheme();if(G.theme.k>=1){G.theme.i=G.theme.j}}
  if(G.mode==='run'&&G.dist>G.nextTheme){G.nextTheme+=900;G.theme.i=G.theme.j;G.theme.j=(G.theme.j+1)%THEMES.length;G.theme.k=0}
}

/* ---------------------------------------------------------------- UI helpers */
const UI={};['menu','garage','hud','pause','over'].forEach(k=>UI[k]=$(k));
function show(name){for(const k in UI)UI[k].classList.toggle('on',k===name)}
function big(txt){const b=$('big');b.textContent=txt;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')}
function toast(html,ms=3500){const t=$('tip');t.innerHTML=html;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),ms)}
function refreshMenu(){$('mCoins').textContent=SAVE.coins;$('mBest').textContent=SAVE.best;$('gCoins').textContent=SAVE.coins;$('hCoins').textContent=G.coins}

/* ---------------------------------------------------------------- game flow */
function setMode(m){G.mode=m}
async function goMenu(){
  stopRunAudio();
  G.mode='menu';G.speed=0;P.dead=false;lean.rotation.set(0,0,0);lean.position.set(0,0,0);P.x=0;P.y=0;P.lane=1;
  live=false;
  await setChar(SAVE.char);
  playAnim(cur.def.anim.idle);
  G.menuAng=.5;
  resetWorld(false);show('menu');refreshMenu();
  clearPowerups();
}
function clearPowerups(){P.shield=P.magnet=P.x2=0;updatePw()}
function stopRunAudio(){musicStop()}
async function startRun(){
  audioInit();if(AC&&AC.state==='suspended')AC.resume();
  await setChar(SAVE.char);
  G.coins=0;G.dist=0;G.speed=0;G.time=0;G.revived=false;G.shake=0;G.deadT=0;G.nextTheme=900;
  Object.assign(P,{x:0,y:0,z:0,vy:0,lane:1,slide:0,inv:0,shield:0,magnet:0,x2:0,dead:false,jumping:false});
  player.position.set(0,0,0);lean.rotation.set(0,0,0);lean.position.set(0,0,0);
  G.theme={i:0,j:0,k:1};
  resetWorld(true);initStreaks(0);applyTheme();
  playAnim(cur.def.anim.idle);
  $('hScore').textContent='0';$('hCoins').textContent='0';updatePw();
  show('hud');
  G.mode='count';G.cnt=3.0;G.cntLast=4;
  SAVE.runs++;save();
  if(!SAVE.tut){SAVE.tut=1;save();toast('<span>&#9664; &#9654; swipe = change lane</span><span>&#9650; jump</span><span>&#9660; slide</span>',5500)}
}
function beginGo(){
  G.mode='run';G.speed=G.speed||16;playAnim(cur.def.anim.run,{ts:1.0});sfx('go');big('GO!');musicStart();
}
function crash(){
  if(P.dead)return;
  P.dead=true;G.mode='dead';G.deadT=0;G.shake=1.1;sfx('crash');
  try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}
  $('flash').style.opacity=1;setTimeout(()=>$('flash').style.opacity=0,120);
  burst(P.x,1,P.z-.5,[1,.6,.2],40,7);burst(P.x,1,P.z-.5,[1,.2,.2],24,5);
  const a=cur.def.anim;
  if(a.die)playAnim(a.die,{once:true,fade:.08});
  else{if(a.sad)playAnim(a.sad,{fade:.2});else playAnim(a.idle,{fade:.2})}
  musicStop();
}
function finishRun(){
  const m=Math.floor(G.dist);let nb=false;
  if(m>SAVE.best){SAVE.best=m;nb=true}
  save();
  $('oScore').textContent=m;$('oBest').textContent=SAVE.best;$('oCoins').textContent=G.coins;$('oTot').textContent=SAVE.coins;
  $('oNew').style.display=nb?'block':'none';
  const rv=$('oRev');rv.style.display=G.revived?'none':'';rv.disabled=SAVE.coins<150;rv.innerHTML='Revive &middot; 150 &#129689;';
  show('over');G.mode='over';
}
function revive(){
  if(SAVE.coins<150||G.revived)return;
  SAVE.coins-=150;save();G.revived=true;sfx('buy');
  /* clear everything near */
  for(const c of chunks){for(const o of c.obs){if(o.alive&&o.z<P.z+12&&o.z>P.z-90){o.alive=false;o.mesh.visible=false}}}
  P.dead=false;P.inv=3;P.y=0;P.vy=0;P.slide=0;lean.rotation.set(0,0,0);lean.position.set(0,0,0);
  show('hud');G.mode='count';G.cnt=2.0;G.cntLast=3;G.speed=0;
  playAnim(cur.def.anim.idle,{fade:.1});
}
function updatePw(){
  const box=$('hPw');box.innerHTML='';
  const add=(ic,col,v,max)=>{if(v<=0)return;const d=document.createElement('div');d.className='p';d.style.setProperty('--c',col);d.innerHTML=ic+'<i style="height:'+clamp(v/max,0,1)*100+'%"></i>';box.appendChild(d)};
  add('\u{1F6E1}️','#3df2ff',P.shield,12);add('\u{1F9F2}','#ff4f6a',P.magnet,8);add('×2','#ffd23f',P.x2,10);
}

/* ---------------------------------------------------------------- input */
function laneMove(d){if(G.mode!=='run')return;const nl=clamp(P.lane+d,0,2);if(nl!==P.lane){P.lane=nl;P.rollV=d*-1;sfx('lane')}}
function doJump(){if(G.mode!=='run')return;if(P.y<=.02&&!P.jumping||P.y<=.02){P.vy=JV;P.jumping=true;P.slide=0;sfx('jump');const a=cur.def.anim;if(a.jump)playAnim(a.jump,{once:true,fade:.08,ts:1.15});emit(P.x,.1,P.z,0,1.5,0,[.8,.8,.9],.4)}}
function doSlide(){if(G.mode!=='run')return;if(P.y>.15){P.vy=-22;return}if(P.slide<=0){P.slide=.8;sfx('slide')}}
addEventListener('keydown',e=>{
  if(e.repeat)return;const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A')laneMove(-1);
  else if(k==='ArrowRight'||k==='d'||k==='D')laneMove(1);
  else if(k==='ArrowUp'||k==='w'||k==='W'||k===' ')doJump();
  else if(k==='ArrowDown'||k==='s'||k==='S')doSlide();
  else if(k==='p'||k==='P'||k==='Escape')pauseToggle();
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(k))e.preventDefault();
});
let sw=null;
canvas.addEventListener('pointerdown',e=>{audioInit();if(AC&&AC.state==='suspended')AC.resume();sw={x:e.clientX,y:e.clientY,id:e.pointerId,done:false,lx:e.clientX};try{canvas.setPointerCapture(e.pointerId)}catch(x){}});
canvas.addEventListener('pointermove',e=>{
  if(!sw||e.pointerId!==sw.id)return;
  if(G.mode==='garage'){G.menuAng+=(e.clientX-sw.lx)*.011;sw.lx=e.clientX;return}
  if(sw.done)return;
  const dx=e.clientX-sw.x,dy=e.clientY-sw.y,T=26;
  if(Math.abs(dx)>T&&Math.abs(dx)>Math.abs(dy)){laneMove(dx>0?1:-1);sw.done=true}
  else if(Math.abs(dy)>T&&Math.abs(dy)>Math.abs(dx)){if(dy<0)doJump();else doSlide();sw.done=true}
});
const endSw=e=>{if(sw&&e.pointerId===sw.id){if(!sw.done&&G.mode==='run'&&Math.hypot(e.clientX-sw.x,e.clientY-sw.y)<10)doJump();sw=null}};
canvas.addEventListener('pointerup',endSw);canvas.addEventListener('pointercancel',endSw);
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='run')pauseToggle(true)});

function pauseToggle(force){
  if(G.mode==='run'||G.mode==='count'){G.pausedFrom=G.mode;G.mode='pause';show('pause');if(AC)AC.suspend()}
  else if(G.mode==='pause'&&!force){G.mode=G.pausedFrom;show('hud');if(AC&&SAVE.snd)AC.resume()}
}

/* ---------------------------------------------------------------- garage */
let gTab='char',gSel=null;
function itemsFor(t){return t==='char'?Object.keys(CHARS).map(id=>({id,name:CHARS[id].name,price:CHARS[id].price,key:'char:'+id,sw:null,icon:CHARS[id].icon})):
  t==='skin'?SKINS.map(s=>({id:s.id,name:s.name,price:s.price,key:'skin:'+SAVE.char+':'+s.id,sw:s.sw})):
  TRAILS.map(s=>({id:s.id,name:s.name,price:s.price,key:'trail:'+s.id,sw:s.sw}))}
function equippedId(t){return t==='char'?SAVE.char:t==='skin'?SAVE.skin[SAVE.char]:SAVE.trail}
function renderGarage(){
  const items=itemsFor(gTab),cards=$('gCards');cards.innerHTML='';
  if(!gSel||!items.find(i=>i.id===gSel))gSel=equippedId(gTab);
  for(const it of items){
    const d=document.createElement('div');d.className='card'+(it.id===gSel?' sel':'')+(it.id===equippedId(gTab)?' eq':'');
    const own=owns(it.key);
    d.innerHTML='<div class="sw" style="background:'+(it.sw||'linear-gradient(135deg,#3a2f7a,#1c1650)')+'">'+(it.icon||'')+'</div><div class="nm">'+it.name+'</div><div class="pr">'+(own?'':'&#129689; '+it.price)+'</div>'+(own?'':'<div class="lk"></div>');
    d.onclick=async()=>{gSel=it.id;sfx('click');if(owns(it.key)){garageAct(true);if(gTab==='char')await previewSel()}else await previewSel();renderGarage()};
    cards.appendChild(d);
  }
  const it=items.find(i=>i.id===gSel),own=owns(it.key),btn=$('gAct');
  if(own){btn.textContent=equippedId(gTab)===gSel?'Equipped':'Equip';btn.disabled=equippedId(gTab)===gSel;btn.className='btn'}
  else if(SAVE.coins>=it.price){btn.textContent='Buy for '+it.price;btn.disabled=false;btn.className='btn yl'}
  else{btn.textContent='Need '+(it.price-SAVE.coins)+' more coins';btn.disabled=true;btn.className='btn yl'}
  $('gName').textContent=gTab==='char'?CHARS[gSel].name:(gTab==='skin'?CHARS[SAVE.char].name+' / '+SKINS.find(s=>s.id===gSel).name:'Trail: '+TRAILS.find(s=>s.id===gSel).name);
  $('gCoins').textContent=SAVE.coins;$('mCoins').textContent=SAVE.coins;
  const act=cards.querySelector('.sel');if(act)act.scrollIntoView({inline:'center',block:'nearest'});
}
async function previewSel(){
  if(gTab==='char'){await setChar(gSel,SAVE.skin[gSel]);playAnim(cur.def.anim.run,{fade:0})}
  else if(gTab==='skin'){applySkin(cur,gSel)}
  else{G.trailPrev=gSel}
}
function garageAct(free){
  const items=itemsFor(gTab),it=items.find(i=>i.id===gSel);
  if(!owns(it.key)){if(free)return;if(SAVE.coins<it.price)return;SAVE.coins-=it.price;SAVE.own.push(it.key);sfx('buy');burst(0,1.2,P.z,[1,.85,.3],30,5)}
  if(gTab==='char'){SAVE.char=gSel}else if(gTab==='skin'){SAVE.skin[SAVE.char]=gSel}else{SAVE.trail=gSel}
  save();renderGarage();refreshMenu();
}
function openGarage(){
  G.mode='garage';gTab='char';gSel=SAVE.char;show('garage');
  $('gTabs').querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.t===gTab));
  setChar(SAVE.char).then(()=>{playAnim(cur.def.anim.run,{fade:0});renderGarage()});
  renderGarage();
}
function closeGarage(){
  /* restore the equipped look (preview may differ) */
  setChar(SAVE.char).then(()=>{playAnim(cur.def.anim.idle,{fade:0})});
  G.mode='menu';show('menu');refreshMenu();
}

/* ---------------------------------------------------------------- per-frame update */
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3(),tmpV=new THREE.Vector3();
let lastCoinSync=0;
function updatePlayer(dt){
  const m=G.mode;
  const portrait=camera.aspect<.8;
  if(m==='run'||m==='count'||m==='dead'){
    /* lane */
    const tx=(P.lane-1)*LANE;const dx=tx-P.x;P.x+=dx*Math.min(1,dt*13);
    P.rollV=lerp(P.rollV,0,dt*8);
    /* vertical */
    if(P.y>0||P.vy>0){P.vy-=GRAV*dt;P.y+=P.vy*dt;if(P.y<=0){P.y=0;P.vy=0;if(P.jumping){P.jumping=false;if(m==='run'){playAnim(cur.def.anim.run,{ts:1.0,fade:.1});emit(P.x,.1,P.z,0,1,0,[.8,.8,.9],.35)}}}}
    if(P.slide>0){P.slide-=dt;if(P.slide<=0)P.slide=0}
  }
  if(m==='run'){
    /* leaning */
    const sl=P.slide>0;
    const tgt=sl?-1.15:0;
    lean.rotation.x=lerp(lean.rotation.x,P.dead?0:tgt,Math.min(1,dt*16));
    lean.rotation.z=lerp(lean.rotation.z,P.rollV*.22,Math.min(1,dt*10));
    lean.position.y=lerp(lean.position.y,sl?.28:0,Math.min(1,dt*16));
    lean.position.z=lerp(lean.position.z,sl?.2:0,Math.min(1,dt*16));
    cur.holder.rotation.y=Math.PI+cur.def.r0;
    if(cur.cur&&cur.cur.getClip().name===cur.def.anim.run)cur.cur.timeScale=lerp(.8,1.5,clamp((G.speed-16)/22,0,1));
    /* jump w/o jump clip: tilt & slow */
    if(!cur.def.anim.jump&&P.y>.02){lean.rotation.x=lerp(lean.rotation.x,P.vy>0?.25:.08,Math.min(1,dt*10));if(cur.cur)cur.cur.timeScale=.35}
  }
  player.position.set(P.x,P.y,P.z);
}
function collide(dt){
  const ptop=P.y+(P.slide>0?.85:1.78);
  for(const c of chunks){
    if(c.z0<P.z-4||c.z0-CH_LEN>P.z+4)continue;
    for(const o of c.obs){
      if(!o.alive)continue;
      if(Math.abs(P.z-o.z)>=o.hz+.35||Math.abs(P.x-o.x)>=o.hx+.32)continue;
      let hit=false;
      if(o.type==='barrier')hit=P.y<.88;
      else if(o.type==='gate')hit=ptop>1.12;
      else hit=true;
      if(hit){
        if(P.inv>0)continue;
        if(P.shield>0){P.shield=0;P.inv=1.4;o.alive=false;o.mesh.visible=false;sfx('shield');burst(o.x,1,o.z,[.3,.95,1],34,8);G.shake=.6;updatePw();continue}
        if(DEBUG)window.__hit={t:o.type,ox:o.x,oz:o.z,px:P.x,pz:P.z,py:P.y,hx:o.hx,hz:o.hz,lane:P.lane};
        crash();return;
      }
    }
    /* coins */
    let changed=false;
    for(const k of c.coins){
      if(!k.alive)continue;
      if(P.magnet>0){const dzc=P.z-k.z;if(dzc<12&&dzc>-14&&Math.abs(P.x-k.x)<7){const f=Math.min(1,dt*9);k.x+=(P.x-k.x)*f;k.y+=(P.y+1-k.y)*f;k.z+=(P.z-k.z)*f;changed=true}}
      if(Math.abs(k.z-P.z)<.9&&Math.abs(k.x-P.x)<.9&&k.y>P.y-.3&&k.y<ptop+.3){
        k.alive=false;changed=true;const v=P.x2>0?2:1;G.coins+=v;SAVE.coins+=v;sfx('coin');$('hCoins').textContent=G.coins;burst(k.x,k.y,k.z,[1,.82,.2],5,3);
      }
    }
    if(changed)c.coinDirty=true;
    for(const k of c.picks){
      if(!k.alive)continue;
      if(Math.abs(k.z-P.z)<1.1&&Math.abs(k.x-P.x)<1.1&&P.y<2.2){
        k.alive=false;k.mesh.visible=false;sfx('pick');burst(k.x,1.2,k.z,[1,1,1],24,6);
        if(k.type==='shield')P.shield=12;else if(k.type==='magnet')P.magnet=8;else P.x2=10;
        updatePw();toast({shield:'<span>&#128737;&#65039; SHIELD: next crash is free</span>',magnet:'<span>&#129522; MAGNET: coins fly to you</span>',x2:'<span>&times;2 COINS</span>'}[k.type],1800);
      }
    }
  }
}
function updateRun(dt){
  G.time+=dt;
  const target=16+Math.min(22,G.time*.26);
  G.speed=lerp(G.speed,target,Math.min(1,dt*1.5));
  const adv=G.speed*dt;P.z-=adv;G.dist+=adv;
  if(P.inv>0)P.inv-=dt;
  let ch=false;
  for(const k of['shield','magnet','x2']){if(P[k]>0){P[k]-=dt;if(P[k]<=0){P[k]=0;ch=true}}}
  if(ch||Math.floor(G.time*4)!==G.lastPw){G.lastPw=Math.floor(G.time*4);updatePw()}
  collide(dt);
  $('hScore').textContent=Math.floor(G.dist);
  /* trail */
  const tr=TRAILS.find(t=>t.id===SAVE.trail);
  if(tr&&tr.col&&P.y<.3&&Math.random()<dt*70){emit(P.x+rnd(-.2,.2),.25+rnd(0,.4),P.z+.5,rnd(-.6,.6),rnd(.2,1.2),rnd(2,5),tr.col,rnd(.4,.8))}
  if(P.slide>0&&Math.random()<dt*90)emit(P.x+rnd(-.3,.3),.1,P.z+.8,rnd(-1,1),rnd(.5,2),rnd(1,4),[1,.8,.4],.35);
  /* shield visual */
  shieldMesh.visible=P.shield>0;if(P.shield>0){shieldMesh.position.set(P.x,P.y+.95,P.z);shieldMesh.rotation.y+=dt;shieldMesh.material.opacity=.22+.08*Math.sin(G.time*8)}
  if(P.inv>0&&P.shield<=0){lean.visible=Math.floor(G.time*18)%2===0}else lean.visible=true;
}
const shieldMesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,2),new THREE.MeshBasicMaterial({color:new THREE.Color(.3,.95,1).multiplyScalar(1.6),transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false,wireframe:false}));
shieldMesh.visible=false;scene.add(shieldMesh);

function updateCamera(dt){
  const m=G.mode,portrait=camera.aspect<.85;
  const f=Math.min(1,dt*(m==='menu'||m==='garage'?4:7));
  let px,py,pz,lx,ly,lz;
  if(m==='menu'||m==='garage'){
    const gm=m==='garage';
    px=gm?.2:0;py=gm?1.25:1.3;pz=P.z+(gm?5.4:5.6);lx=0;ly=gm?-.75:.75;lz=P.z;
    if(camera.aspect>1.1){if(gm){px=1.25;lx=1.25;py=1.1;ly=.9;pz=P.z+4.4}else{px=1.5;lx=1.5;py=1.2;ly=.95;pz=P.z+4.3}}
    /* gentle orbit to show the 3D model in the menu */
    if(!gm&&camera.aspect<=1.1){px=Math.sin(G.t*.35)*1.2;}
  }else{
    px=P.x*.62;py=2.95+P.y*.35+(portrait?.5:0);pz=P.z+5.3+(portrait?1.4:0);
    lx=P.x*.4;ly=1.25+P.y*.25;lz=P.z-10;
    if(m==='dead'||m==='over'){py=2.6;pz=P.z+4.6;ly=.9;lz=P.z}
  }
  camPos.set(px,py,pz);camLook.set(lx,ly,lz);
  if(G.camInit!==m){G.camInit=m;if(m==='menu'||m==='garage'||m==='count'){camera.position.copy(camPos)}}
  camera.position.lerp(camPos,f);
  G.lookCur=G.lookCur||new THREE.Vector3();G.lookCur.lerp(camLook,Math.min(1,f*1.3));
  tmpV.copy(G.lookCur);
  if(G.shake>0){G.shake=Math.max(0,G.shake-dt*2.4);tmpV.x+=rnd(-1,1)*G.shake*.25;tmpV.y+=rnd(-1,1)*G.shake*.2;camera.position.x+=rnd(-1,1)*G.shake*.06}
  camera.lookAt(tmpV);
  const baseFov=portrait?72:60;
  camera.fov=lerp(camera.fov,baseFov+(m==='run'?(G.speed-16)*.3:0),Math.min(1,dt*3));camera.updateProjectionMatrix();
  sky.position.copy(camera.position);
}

function frame(ts){
  requestAnimationFrame(frame);
  const now=ts/1000;let dt=Math.min(.05,now-(frame.last||now));frame.last=now;
  if(DEBUG&&window.R3D&&window.R3D.hold)return;
  update(dt);render();
}
function render(){if(composer)composer.render();else renderer.render(scene,camera)}
function update(dt){
  G.t+=dt;
  const m=G.mode;
  if(m==='load')return;
  if(m!=='pause'){
    if(m==='menu'||m==='garage'){
      P.z-=dt*(m==='menu'?5:2.5);
      player.position.set(0,0,P.z);
      if(cur){cur.holder.rotation.y=cur.def.r0+(m==='garage'?G.menuAng:Math.sin(G.t*.6)*.5+.35);lean.rotation.set(0,0,0);lean.position.set(0,0,0);lean.visible=true}
    }else if(m==='count'){
      G.cnt-=dt;const n=Math.ceil(G.cnt);
      if(n!==G.cntLast){G.cntLast=n;if(n>0){big(String(n));sfx('tick')}else{beginGo()}}
      updatePlayer(dt);
      if(cur)cur.holder.rotation.y=lerp(cur.holder.rotation.y,Math.PI+cur.def.r0,Math.min(1,dt*6));
    }else if(m==='run'){
      updatePlayer(dt);updateRun(dt);
    }else if(m==='dead'){
      G.deadT+=dt;G.speed=Math.max(0,G.speed-G.speed*dt*3.5-dt*8);P.z-=G.speed*dt;
      updatePlayer(dt);
      if(!cur.def.anim.die){ /* fake fall for models without a death clip */
        lean.rotation.x=lerp(lean.rotation.x,-1.5,Math.min(1,dt*6));lean.position.y=lerp(lean.position.y,.18,Math.min(1,dt*6));lean.position.z=lerp(lean.position.z,.5,Math.min(1,dt*6));
        if(cur.cur&&cur.def.anim.sad==undefined)cur.cur.timeScale=Math.max(0,cur.cur.timeScale-dt*3);
      }
      shieldMesh.visible=false;lean.visible=true;
      if(G.deadT>1.35)finishRun();
    }
    if(cur){cur.mixer.update(m==='dead'?dt:dt)}
    /* world */
    if(m==='run'||m==='dead'||m==='menu'||m==='garage'||m==='count')recycle();
    stepTheme(dt);
    sun.position.set(P.x-9,18,P.z+9);sun.target.position.set(P.x,0,P.z-3);
    /* coins + picks animation */
    for(const c of chunks){
      if(c.z0<P.z-CH_LEN*0.5||c.z0-CH_LEN>P.z+CH_LEN){}
      if(c.coins.length&&c.z0-CH_LEN<P.z+120&&c.z0>P.z-30){syncCoinMesh(c,G.t)}
      for(const k of c.picks){if(k.alive){const mm=k.mesh.userData.m;mm.rotation.y+=dt*2.4;mm.position.y=1.15+Math.sin(G.t*3+k.x)*.12}}
    }
    updateStreaks(P.z,G.speed);updateParticles(dt);
  }
  updateCamera(m==='pause'?0:dt);
  /* auto quality */
  if(qAuto&&m==='run'){G.fpsAcc+=dt;G.fpsN++;if(G.fpsN>=100){const avg=G.fpsAcc/G.fpsN;if(avg>1/34&&Q>0&&G.t-G.fpsT>3){G.fpsT=G.t;applyQuality(Q-1);toast('<span>Graphics lowered for smoother play</span>',2200)}G.fpsAcc=0;G.fpsN=0}}
}

/* ---------------------------------------------------------------- buttons */
$('bPlay').onclick=()=>{audioInit();sfx('click');startRun()};
$('bGarage').onclick=()=>{audioInit();sfx('click');openGarage()};
$('gBack').onclick=()=>{sfx('click');closeGarage()};
$('gTabs').onclick=e=>{const b=e.target.closest('.tab');if(!b)return;gTab=b.dataset.t;gSel=equippedId(gTab);$('gTabs').querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));sfx('click');
  if(gTab==='char'){setChar(SAVE.char).then(()=>playAnim(cur.def.anim.run,{fade:0}))}else if(gTab==='skin'){setChar(SAVE.char).then(()=>playAnim(cur.def.anim.run,{fade:0}))}renderGarage()};
$('gAct').onclick=()=>garageAct();
$('bSnd').onclick=()=>{audioInit();setSnd(!SAVE.snd);sfx('click')};
$('bQ').onclick=()=>{const order=['auto','high','medium','low'];const i=(order.indexOf(SAVE.q)+1)%4;SAVE.q=order[i];save();qAuto=SAVE.q==='auto';applyQuality(qAuto?(isTouch?1:2):({high:2,medium:1,low:0})[SAVE.q]);sfx('click')};
$('bPause').onclick=()=>pauseToggle();
$('pResume').onclick=()=>pauseToggle();
$('pRestart').onclick=()=>{if(AC&&SAVE.snd)AC.resume();startRun()};
$('pMenu').onclick=()=>{if(AC&&SAVE.snd)AC.resume();goMenu()};
$('oAgain').onclick=()=>{sfx('click');startRun()};
$('oMenu').onclick=()=>{sfx('click');goMenu()};
$('oRev').onclick=revive;

/* ---------------------------------------------------------------- boot */
(async function boot(){
  try{
    applyQuality(SAVE.q==='auto'?(isTouch?1:2):({high:2,medium:1,low:0})[SAVE.q]||2);
    resize();
    buildEnvs();
    G.theme={i:0,j:0,k:1};applyTheme();
    setSnd(!!SAVE.snd);
    $('loadTxt').textContent='Loading your runner...';
    await loadChar(SAVE.char,p=>{$('loadBar').style.width=Math.round(p*100)+'%'});
    $('loadBar').style.width='100%';
    await goMenu();
    $('load').style.display='none';
    requestAnimationFrame(frame);
    /* warm other models quietly so Garage opens instantly */
    setTimeout(()=>{Object.keys(CHARS).forEach(id=>{if(id!==SAVE.char)loadChar(id).catch(()=>{})})},2500);
  }catch(err){console.error(err);$('loadTxt').textContent='Could not load: '+(err&&err.message||err)}
})();
if(DEBUG){window.R3D={renderer,step:update,render,hold:false,G,P,SAVE,chunks,scene,camera,get cur(){return cur},startRun,crash,laneMove,doJump,doSlide,goMenu,openGarage,applyQuality,CHARS,setChar,beginGo}}
