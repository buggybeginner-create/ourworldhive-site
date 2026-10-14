/* owh3d: a very small WebGL engine (boxes, cylinders, cones, spheres, lofts, lathes, lights, fog). Shared copy for chess. */
const E3=(function(){
 const m4=()=>new Float32Array(16);
 function persp(f,a,n,fa){const t=1/Math.tan(f/2),o=m4();o[0]=t/a;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o}
 function look(e,c){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
  let xx=zz,xz=-zx;l=Math.hypot(xx,xz)||1;xx/=l;xz/=l;const xy=0,yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx,o=m4();
  o[0]=xx;o[1]=yx;o[2]=zx;o[4]=xy;o[5]=yy;o[6]=zy;o[8]=xz;o[9]=yz;o[10]=zz;
  o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o}
 function mul(a,b){const o=m4();for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o}
 const VS='attribute vec3 aP;attribute vec3 aN;uniform mat4 uVP;uniform mat4 uM;varying vec3 vN;varying vec3 vW;varying float vD;void main(){vec4 w=uM*vec4(aP,1.0);vW=w.xyz;vN=normalize(mat3(uM)*aN);gl_Position=uVP*w;vD=gl_Position.w;}';
 const FS='precision mediump float;varying vec3 vN;varying vec3 vW;varying float vD;uniform vec4 uC;uniform float uE;uniform float uS;uniform vec3 uL;uniform vec3 uF;uniform vec3 uEye;uniform vec2 uFog;void main(){vec3 n=normalize(vN);vec3 L=normalize(uL);float d=max(dot(n,L),0.0);float h=0.5+0.5*n.y;vec3 amb=mix(vec3(0.27,0.29,0.36),vec3(0.52,0.56,0.66),h);vec3 c=uC.rgb*(amb+vec3(1.0,0.96,0.88)*d*0.62);vec3 V=normalize(uEye-vW);vec3 Hh=normalize(L+V);float sp=pow(max(dot(n,Hh),0.0),52.0)*uS*step(0.001,d);float fr=pow(1.0-max(dot(n,V),0.0),3.0);vec3 rf=mix(uF*0.9+0.1,vec3(0.75,0.85,1.0),h);c+=vec3(1.0,0.97,0.9)*sp*1.1+rf*fr*uS*0.55;c=mix(c,uC.rgb,uE);float f=smoothstep(uFog.x,uFog.y,vD);c=mix(c,uF,f);gl_FragColor=vec4(c*uC.a,uC.a);}';
 function hex(c){if(Array.isArray(c))return c;if(typeof c==='number')return[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];const s=String(c).replace('#','');const n=parseInt(s.length===3?s.replace(/./g,'$&$&'):s,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}
 function cubeData(){const P=[],N=[],I=[];const F=[[[1,0,0],[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]],[[-1,0,0],[[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]]],[[0,1,0],[[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]]],[[0,-1,0],[[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]]],[[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]]];
  F.forEach(f=>{const b=P.length/3;f[1].forEach(v=>{P.push(...v);N.push(...f[0])});I.push(b,b+1,b+2,b,b+2,b+3)});return{P,N,I}}
 function cylData(n,top){const P=[],N=[],I=[];for(let i=0;i<=n;i++){const a=i/n*6.2832,c=Math.cos(a),s=Math.sin(a),nl=Math.hypot(1,0.5-top);P.push(c*.5,-.5,s*.5,c*top*.5,.5,s*top*.5);const ny=(0.5-top)/nl,nr=1/nl;N.push(c*nr,ny,s*nr,c*nr,ny,s*nr);if(i<n){const b=i*2;I.push(b,b+2,b+1,b+1,b+2,b+3)}}
  let b=P.length/3;P.push(0,.5,0);N.push(0,1,0);for(let i=0;i<=n;i++){const a=i/n*6.2832;P.push(Math.cos(a)*top*.5,.5,Math.sin(a)*top*.5);N.push(0,1,0)}for(let i=0;i<n;i++)I.push(b,b+2+i,b+1+i);
  b=P.length/3;P.push(0,-.5,0);N.push(0,-1,0);for(let i=0;i<=n;i++){const a=i/n*6.2832;P.push(Math.cos(a)*.5,-.5,Math.sin(a)*.5);N.push(0,-1,0)}for(let i=0;i<n;i++)I.push(b,b+1+i,b+2+i);return{P,N,I}}
 function sphData(la,lo){const P=[],N=[],I=[];for(let y=0;y<=la;y++){const v=y/la*Math.PI;for(let x=0;x<=lo;x++){const u=x/lo*6.2832,nx=Math.cos(u)*Math.sin(v),ny=Math.cos(v),nz=Math.sin(u)*Math.sin(v);P.push(nx*.5,ny*.5,nz*.5);N.push(nx,ny,nz)}}
  for(let y=0;y<la;y++)for(let x=0;x<lo;x++){const a=y*(lo+1)+x,b=a+lo+1;I.push(a,b,a+1,a+1,b,b+1)}return{P,N,I}}
 function loft(st,M,ex){const P=[],N=[],I=[],K=st.length;ex=ex||4;
  for(let k=0;k<K;k++){const q=st[k];for(let m=0;m<M;m++){const a=m/M*6.2832,ca=Math.cos(a),sa=Math.sin(a),px=Math.sign(ca)*Math.pow(Math.abs(ca),2/ex),py=Math.sign(sa)*Math.pow(Math.abs(sa),2/ex);P.push(px*q[1],(q[2]+q[3])/2+py*(q[3]-q[2])/2,q[0])}}
  for(let k=0;k<K-1;k++)for(let m=0;m<M;m++){const a=k*M+m,b=k*M+(m+1)%M,c=(k+1)*M+m,d=(k+1)*M+(m+1)%M;I.push(a,c,b,b,c,d)}
  const cf=P.length/3;let cx=0,cy=0;for(let m=0;m<M;m++){cx+=P[m*3];cy+=P[m*3+1]}P.push(cx/M,cy/M,st[0][0]);for(let m=0;m<M;m++)I.push(cf,m,(m+1)%M);
  const cb=P.length/3,o=(K-1)*M;cx=0;cy=0;for(let m=0;m<M;m++){cx+=P[(o+m)*3];cy+=P[(o+m)*3+1]}P.push(cx/M,cy/M,st[K-1][0]);for(let m=0;m<M;m++)I.push(cb,o+(m+1)%M,o+m);
  const nn=new Float32Array(P.length);for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;[a,b,c].forEach(i=>{nn[i]+=nx;nn[i+1]+=ny;nn[i+2]+=nz})}
  for(let i=0;i<nn.length;i+=3){const l=Math.hypot(nn[i],nn[i+1],nn[i+2])||1;N.push(nn[i]/l,nn[i+1]/l,nn[i+2]/l)}return{P,N,I}}
 function create(cv,opt){
  opt=opt||{};const gl=cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'})||cv.getContext('experimental-webgl');if(!gl)return null;
  function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error('link');gl.useProgram(pr);
  const loc=n=>gl.getUniformLocation(pr,n),U={vp:loc('uVP'),m:loc('uM'),c:loc('uC'),e:loc('uE'),l:loc('uL'),f:loc('uF'),fog:loc('uFog'),s:loc('uS'),eye:loc('uEye')},aP=gl.getAttribLocation(pr,'aP'),aN=gl.getAttribLocation(pr,'aN');
  function geo(d){const p=gl.createBuffer(),n=gl.createBuffer(),i=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.P),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(d.N),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d.I),gl.STATIC_DRAW);return{p,n,i,c:d.I.length}}
  const G={box:geo(cubeData()),cyl:geo(cylData(30,1)),cone:geo(cylData(24,0)),ball:geo(sphData(16,24))};
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enableVertexAttribArray(aP);gl.enableVertexAttribArray(aN);
  let lastS=-1,VP=m4(),cur=null,W=360,H=480,fogC=[.7,.8,.95],lastE=-1;const M=m4();
  const eng={gl,mesh(name,d){G[name]=geo(d)},W:()=>W,H:()=>H,
   size(w,h,dpr){W=w;H=h;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width='100%';cv.style.height='auto';gl.viewport(0,0,cv.width,cv.height)},
   begin(o){const c=hex(o.fog||[.7,.8,.95]);fogC=c;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    VP=mul(persp(o.fov||1,W/H,o.near||.3,o.far||260),look(o.eye,o.at));gl.uniformMatrix4fv(U.vp,false,VP);gl.uniform3f(U.l,o.sun?o.sun[0]:.5,o.sun?o.sun[1]:1,o.sun?o.sun[2]:.35);gl.uniform3f(U.f,c[0],c[1],c[2]);gl.uniform2f(U.fog,o.fogNear||60,o.fogFar||200);gl.uniform3f(U.eye,o.eye[0],o.eye[1],o.eye[2]);cur=null;lastS=-1;lastE=-1},
   draw(g,x,y,z,sx,sy,sz,col,o){o=o||{};const q=G[g];if(cur!==q){gl.bindBuffer(gl.ARRAY_BUFFER,q.p);gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,q.n);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,q.i);cur=q}
    const cy=Math.cos(o.ry||0),sy2=Math.sin(o.ry||0),cx=Math.cos(o.rx||0),sx2=Math.sin(o.rx||0),cz=Math.cos(o.rz||0),sz2=Math.sin(o.rz||0);
    // rotation = Ry * Rx * Rz
    const r00=cy*cz+sy2*sx2*sz2,r01=-cy*sz2+sy2*sx2*cz,r02=sy2*cx,r10=cx*sz2,r11=cx*cz,r12=-sx2,r20=-sy2*cz+cy*sx2*sz2,r21=sy2*sz2+cy*sx2*cz,r22=cy*cx;
    M[0]=r00*sx;M[1]=r10*sx;M[2]=r20*sx;M[3]=0;M[4]=r01*sy;M[5]=r11*sy;M[6]=r21*sy;M[7]=0;M[8]=r02*sz;M[9]=r12*sz;M[10]=r22*sz;M[11]=0;M[12]=x;M[13]=y;M[14]=z;M[15]=1;
    gl.uniformMatrix4fv(U.m,false,M);const c=Array.isArray(col)?col:hex(col),a=o.a==null?1:o.a;gl.uniform4f(U.c,c[0],c[1],c[2],a);const e=o.e||0;if(e!==lastE){gl.uniform1f(U.e,e);lastE=e}const ss=o.s||0;if(ss!==lastS){gl.uniform1f(U.s,ss);lastS=ss}
    gl.drawElements(gl.TRIANGLES,q.c,gl.UNSIGNED_SHORT,0)},
   box(x,y,z,sx,sy,sz,c,o){eng.draw('box',x,y,z,sx,sy,sz,c,o)},cyl(x,y,z,sx,sy,sz,c,o){eng.draw('cyl',x,y,z,sx,sy,sz,c,o)},cone(x,y,z,sx,sy,sz,c,o){eng.draw('cone',x,y,z,sx,sy,sz,c,o)},ball(x,y,z,sx,sy,sz,c,o){eng.draw('ball',x,y,z,sx,sy,sz,c,o)},
   shadow(x,z,w,d,y,a){eng.draw('box',x,y||.02,z,w,.02,d,[0,0,0],{a:a==null?.32:a})},
   project(p){const v=VP,x=p[0],y=p[1],z=p[2],cx=v[0]*x+v[4]*y+v[8]*z+v[12],cy=v[1]*x+v[5]*y+v[9]*z+v[13],cw=v[3]*x+v[7]*y+v[11]*z+v[15];if(cw<=0.01)return null;return[(cx/cw*.5+.5)*W,(1-(cy/cw*.5+.5))*H]},
   dispose(){try{const ext=gl.getExtension('WEBGL_lose_context');ext&&ext.loseContext()}catch(e){}}};
  return eng}
 
 /* lathe: spin a profile [[radius,y],...] round the y axis into smooth-shaded mesh data */
 function lathe(pr,M){M=M||28;const P=[],N=[],I=[],K=pr.length;
  for(let k=0;k<K;k++){const r=pr[k][0],y=pr[k][1];let dr,dy;if(k===0){dr=pr[1][0]-r;dy=pr[1][1]-y}else if(k===K-1){dr=r-pr[k-1][0];dy=y-pr[k-1][1]}else{dr=pr[k+1][0]-pr[k-1][0];dy=pr[k+1][1]-pr[k-1][1]}
   const l=Math.hypot(dr,dy)||1,nr=dy/l,ny=-dr/l;for(let m=0;m<=M;m++){const a=m/M*6.2832,c=Math.cos(a),sn=Math.sin(a);P.push(c*r,y,sn*r);N.push(c*nr,ny,sn*nr)}}
  for(let k=0;k<K-1;k++)for(let m=0;m<M;m++){const a=k*(M+1)+m,b=a+M+1;I.push(a,b,a+1,a+1,b,b+1)}
  return{P,N,I}}
 return{create,hex,loft,lathe}})();
if(typeof window!=='undefined')window.E3=E3;
