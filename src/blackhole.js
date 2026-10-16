// Real-time Schwarzschild black hole: raw WebGL2 ray-marcher (no three.js).
// Light rays are bent by a = -1.5*h^2*r/|r|^5 (rs = 1), so stars, nebula and the
// accretion disk are all lensed. The disk has Doppler beaming and turbulence.
const VERT = `#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes, uOff; uniform float uTime, uFl, uGlow, uDive, uRoll;
uniform vec3 uCam, uF, uR, uU;
out vec4 o;
const float RIN=2.8, ROUT=9.5;

float h13(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p,int n){ float a=.5,s=0.; for(int i=0;i<4;i++){ if(i>=n)break; s+=a*n3(p); p=p*2.03+vec3(11.7,3.1,7.3); a*=.5; } return s; }

vec3 starLayer(vec3 d,float sc,float thr,float sz,float seed){
  vec3 p=d*sc, id=floor(p), f=fract(p)-.5; float h=h13(id+seed); if(h<thr) return vec3(0.);
  vec3 off=(vec3(h13(id+seed+1.7),h13(id+seed+5.3),h13(id+seed+9.1))-.5)*.5;
  float b=smoothstep(sz,0.,length(f-off)); float tw=.8+.2*sin(uTime*(1.+h*4.)+h*50.);
  vec3 c=mix(vec3(1.,.78,.6),vec3(.72,.82,1.),h13(id+seed+3.3));
  return c*b*b*tw*(.5+2.*(h-thr)/(1.-thr));
}
vec3 bg(vec3 d,float sf){
  float band=exp(-pow(dot(d,normalize(vec3(.25,.85,.35)))*2.4,2.));
  float a=fbm(d*2.1+3.,4), b=fbm(d*4.7+9.,4);
  vec3 c=vec3(.003,.003,.006);
  c+=mix(vec3(.5,.02,.03),vec3(.95,.3,.06),b)*smoothstep(.38,.85,a)*(.35+.65*b)*band*1.0;   // ember nebula
  c+=vec3(.01,.022,.045)*smoothstep(.45,.9,fbm(d*1.6+20.,3))*.8;                           // faint cold dust
  c*=1.-.6*smoothstep(.55,.8,fbm(d*9.+1.,3))*band;                                           // dust lanes
  c+=sf*(starLayer(d,38.,.86,.14,1.)+.9*starLayer(d,85.,.90,.12,7.)+.8*starLayer(d,170.,.93,.11,13.)+1.2*band*starLayer(d,60.,.86,.12,21.)+.7*starLayer(d,260.,.95,.10,31.));
  return c;
}
vec3 heat(float t){ t=clamp(t,0.,2.);
  vec3 c0=vec3(.35,.02,.01),c1=vec3(1.,.28,.04),c2=vec3(1.,.72,.35),c3=vec3(1.,.95,.85);
  return t<.4?mix(c0,c1,t/.4):t<.8?mix(c1,c2,(t-.4)/.4):mix(c2,c3,min((t-.8)/.6,1.)); }

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.-uOff;
  vec3 R=uR*cos(uRoll)+uU*sin(uRoll), U=-uR*sin(uRoll)+uU*cos(uRoll);
  vec3 pos=uCam, vel=normalize(uF*uFl+R*uv.x+U*uv.y);
  vec3 hh=cross(pos,vel); float h2=dot(hh,hh);
  vec3 acc=vec3(0.); float tr=1., minr=1e3; bool cap=false;
  for(int i=0;i<150;i++){
    float r2=dot(pos,pos), r=sqrt(r2); minr=min(minr,r);
    if(r<1.){ cap=true; break; }
    if(r>40.&&dot(pos,vel)>0.) break;
    float dt=clamp(.07*(r-.7),.02,.7), rr=length(pos.xz), ay=abs(pos.y);
    if(rr<ROUT+.6) dt=min(dt,.05+.35*ay);
    if(ay>.8&&ay<30.&&rr<1.+.06*ay){            // relativistic polar jets
      dt=min(dt,.12);
      float j=exp(-rr*rr/(.004+.0008*ay*ay))*smoothstep(.8,3.,ay)*exp(-ay*.09);
      acc+=tr*vec3(.85,.9,1.)*j*dt*3.2*uGlow;
    }
    if(rr>RIN-.4&&rr<ROUT+.5&&ay<1.){            // turbulent accretion disk
      float th=.05+.022*rr, vert=exp(-pos.y*pos.y/(th*th));
      if(vert>.01){
        float om=3./(rr*sqrt(rr)), an=atan(pos.z,pos.x)-om*uTime;
        float n=fbm(vec3(rr*3.2,cos(an)*2.4,sin(an)*2.4),3);
        float rad=smoothstep(RIN,RIN+.5,rr)*(1.-smoothstep(ROUT-2.5,ROUT,rr));
        float dens=vert*rad*(.25+1.3*smoothstep(.3,.8,n));
        vec3 td=normalize(vec3(-pos.z,0.,pos.x));
        float D=1./(1.-min(sqrt(.5/rr),.6)*.9*dot(td,-vel));
        float T=pow(RIN/rr,.75)*D;
        acc+=tr*heat(T)*pow(D,2.5)*dens*(1.-1./rr)*uGlow*dt*3.2;
        tr*=exp(-dens*2.4*dt);
      }
    }
    vel=normalize(vel-1.5*h2*pos/(r2*r2*r)*dt); pos+=vel*dt;
    if(tr<.01) break;
  }
  vec3 col=acc;
  if(!cap){ col+=tr*bg(vel,mix(.2,1.,smoothstep(1.55,2.6,minr))); float ring=exp(-(minr-1.5)*11.); col+=vec3(1.,.78,.5)*ring*ring*.5*uGlow*tr; }
  col*=1.+uDive*1.5;
  col=1.-exp(-col*1.35);
  col*=mix(.6,1.,smoothstep(1.9,.3,length(uv+uOff)*.7));
  col+=(h13(vec3(gl_FragCoord.xy,floor(uTime*40.)))-.5)*.02;
  o=vec4(col,1.);
}`

function link(gl) {
  const prog = gl.createProgram()
  for (const [t, s] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
    const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn('blackhole shader:', gl.getShaderInfoLog(sh)); return null }
    gl.attachShader(prog, sh)
  }
  gl.linkProgram(prog)
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function createBlackHole(host, { reduce = false } = {}) {
  const canvas = document.createElement('canvas'); host.prepend(canvas)
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  const prog = gl && link(gl)
  if (!prog) { canvas.remove(); return null }
  gl.useProgram(prog)
  const L = {}; for (const n of ['uRes', 'uOff', 'uTime', 'uFl', 'uGlow', 'uDive', 'uRoll', 'uCam', 'uF', 'uR', 'uU']) L[n] = gl.getUniformLocation(prog, n)

  const sim = { dive: 0, shake: 0, glow: 1 }
  const cam = { yaw: .5, pitch: .2, dist: 22, tyaw: .5, tpitch: .2, tdist: 22, mx: 0, my: 0, tmx: 0, tmy: 0, vx: 0, vy: 0 }
  let scale = .7, maxScale = 1, simT = 0, last = 0, idle = 0, dragging = false, raf = 0, acc = 0, frames = 0, lx = 0, ly = 0

  const resize = () => {
    const d = Math.min(devicePixelRatio || 1, 1.5)
    canvas.width = Math.max(2, Math.round(innerWidth * d * scale)); canvas.height = Math.max(2, Math.round(innerHeight * d * scale))
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  function frame(now) {
    raf = 0
    const dt = last ? Math.min((now - last) / 1000, .05) : .016; last = now
    if (!reduce) simT += dt * (1 + sim.dive * 5)
    idle += dt
    const k = 1 - Math.exp(-dt * 5)
    if (!dragging) { if (idle > 2.5) cam.tyaw += .025 * dt; cam.tyaw += cam.vx; cam.tpitch += cam.vy; cam.vx *= .94; cam.vy *= .94 }
    cam.tpitch = clamp(cam.tpitch, -1.2, 1.45)
    cam.yaw += (cam.tyaw - cam.yaw) * k; cam.pitch += (cam.tpitch - cam.pitch) * k; cam.dist += (cam.tdist - cam.dist) * k
    cam.mx += (cam.tmx - cam.mx) * k; cam.my += (cam.tmy - cam.my) * k

    const j = (Math.random() - .5) * .03 * sim.shake
    const yaw = cam.yaw + cam.mx * .1 + j + sim.dive * .9
    const pitch = clamp(cam.pitch - cam.my * .05 + .035 * Math.sin(simT * .25) + j, -1.2, 1.45)
    const dist = cam.dist + (1.7 - cam.dist) * sim.dive
    const cp = Math.cos(pitch)
    const eye = [Math.sin(yaw) * cp * dist, Math.sin(pitch) * dist, Math.cos(yaw) * cp * dist]
    const f = eye.map(v => -v / dist)
    let r = [-f[2], 0, f[0]]; const rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl]
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
    const aspect = canvas.width / canvas.height, narrow = aspect < 1

    gl.uniform2f(L.uRes, canvas.width, canvas.height)
    gl.uniform2f(L.uOff, 0, narrow ? .42 * (1 - sim.dive) : 0)
    gl.uniform1f(L.uTime, simT); gl.uniform1f(L.uGlow, sim.glow); gl.uniform1f(L.uDive, sim.dive)
    gl.uniform1f(L.uFl, 2 * clamp(aspect * 1.1, .5, 1) * (1 - .5 * sim.dive))
    gl.uniform1f(L.uRoll, sim.dive * 1.6 + j * 4)
    gl.uniform3fv(L.uCam, eye); gl.uniform3fv(L.uF, f); gl.uniform3fv(L.uR, r); gl.uniform3fv(L.uU, u)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (!reduce) {
      // adaptive resolution: keep the animation smooth on weaker GPUs
      acc += dt; if (++frames === 40) {
        const avg = acc / frames; acc = frames = 0
        if (avg > .024 && scale > .38) { scale *= .85; maxScale = scale; resize() }
        else if (avg < .0175 && scale < maxScale) { scale = Math.min(maxScale, scale * 1.06); resize() }
      }
      raf = requestAnimationFrame(frame)
    }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }

  const onUI = e => e.target.closest?.('.card, button, input, a')
  addEventListener('resize', () => { resize(); kick() })
  addEventListener('pointerdown', e => { if (onUI(e)) return; dragging = true; idle = 0; lx = e.clientX; ly = e.clientY; cam.vx = cam.vy = 0 })
  addEventListener('pointermove', e => {
    cam.tmx = e.clientX / innerWidth - .5; cam.tmy = e.clientY / innerHeight - .5
    if (!dragging) return
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; idle = 0
    cam.tyaw -= dx * .005; cam.tpitch += dy * .004; cam.vx = -dx * .0006; cam.vy = dy * .0005; kick()
  })
  addEventListener('pointerup', () => { dragging = false })
  addEventListener('wheel', e => { if (!e.target.closest?.('.card')) { cam.tdist = clamp(cam.tdist + e.deltaY * .012, 13, 34); idle = 0; kick() } }, { passive: true })

  resize(); kick()
  return { sim, reset() { sim.dive = 0; sim.shake = 0; sim.glow = 3.2; cam.tyaw += 2.1; cam.yaw = cam.tyaw; cam.vx = cam.vy = 0; idle = 0 } }
}
