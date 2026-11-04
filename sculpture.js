// Transparent, locally rendered material studies. The cached canvas is read-only:
// draw it into a composition rather than changing its size or pixels.
const sculptureCache = new Map();
const MATERIALS = new Set(['glass', 'chrome', 'pearl']);
let renderer = null;
let webglUnavailable = false;

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform float material;
uniform vec2 objectRotation;

mat2 turn(float a) { float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float surface(vec3 p) {
  p.yz = turn(objectRotation.x)*p.yz;
  p.xz = turn(objectRotation.y)*p.xz;
  p.xy = turn(-0.38)*p.xy;
  p.yz = turn(0.54)*p.yz;
  p.xz = turn(-0.24)*p.xz;
  return length(vec2(length(p.xy)-0.67,p.z))-0.275;
}
vec3 normalAt(vec3 p) {
  vec2 e=vec2(0.0015,0.0);
  return normalize(vec3(surface(p+e.xyy)-surface(p-e.xyy),
                        surface(p+e.yxy)-surface(p-e.yxy),
                        surface(p+e.yyx)-surface(p-e.yyx)));
}
vec3 studio(vec3 d) {
  // Broad light cards and a dark horizon produce curved studio reflections.
  vec3 c=mix(vec3(0.025,0.075,0.13),vec3(0.66,0.79,0.86),smoothstep(-0.65,0.9,d.y));
  float horizon=exp(-pow((d.y+0.05)*9.0,2.0));
  c=mix(c,vec3(0.97,0.995,1.0),0.94*horizon);
  float darkBand=exp(-pow((d.y-0.29)*15.0,2.0));
  c=mix(c,vec3(0.025,0.055,0.09),0.82*darkBand);
  float leftCard=pow(max(dot(d,normalize(vec3(-0.65,0.6,0.85))),0.0),22.0);
  float rightCard=pow(max(dot(d,normalize(vec3(0.75,0.2,0.65))),0.0),44.0);
  c+=vec3(0.87,0.97,1.0)*leftCard*1.45+vec3(1.0,0.68,0.88)*rightCard*0.85;
  float blue=pow(max(dot(d,normalize(vec3(-0.8,-0.5,0.25))),0.0),5.0);
  float pink=pow(max(dot(d,normalize(vec3(0.8,-0.65,0.35))),0.0),7.0);
  c+=vec3(0.02,0.35,0.55)*blue+vec3(0.42,0.035,0.23)*pink;
  return c;
}
void main() {
  vec3 ro=vec3(uv*1.12,3.2), rd=vec3(0.0,0.0,-1.0);
  float t=0.0, hit=0.0;
  for (int i=0;i<88;i++) {
    float d=surface(ro+rd*t);
    if(d<0.0012) { hit=1.0; break; }
    t+=d;
    if(t>5.0) break;
  }
  if(hit<0.5) { gl_FragColor=vec4(0.0); return; }
  vec3 p=ro+rd*t,n=normalAt(p),view=-rd;
  float facing=max(dot(n,view),0.0);
  float fresnel=pow(1.0-facing,3.0);
  vec3 reflection=studio(reflect(rd,n));
  vec3 key=normalize(vec3(-0.65,0.85,1.5));
  float diffuse=max(dot(n,key),0.0);
  float gloss=pow(max(dot(n,normalize(key+view)),0.0),100.0);
  vec3 color; float alpha=1.0;
  if(material<0.5) {
    // A clear centre, denser cyan edges and reflected light retain transparency.
    vec3 transmission=studio(refract(rd,n,0.69));
    color=mix(vec3(0.22,0.68,0.83),vec3(0.75,0.94,1.0),0.55+0.25*diffuse);
    color=mix(color,transmission,0.13);
    color=mix(color,reflection,0.3+0.5*fresnel);
    color+=vec3(0.82,0.96,1.0)*gloss*1.7;
    color=mix(color,vec3(0.025,0.27,0.4),0.22*fresnel);
    alpha=clamp(0.24+0.59*fresnel+0.29*gloss+0.12*length(reflection),0.24,0.96);
  } else if(material<1.5) {
    color=reflection*vec3(0.89,0.95,1.0);
    color+=vec3(1.0)*gloss*1.2;
    color=mix(color,vec3(0.8,0.92,1.0),0.13*fresnel);
  } else {
    vec3 iridescence=0.5+0.5*cos(vec3(0.25,2.35,4.4)+facing*5.7+n.x*1.9-n.y*0.7);
    vec3 body=mix(vec3(0.84,0.91,0.94),iridescence,0.13+0.19*fresnel);
    color=body*(0.53+0.47*diffuse)+reflection*0.18;
    color+=vec3(1.0,0.97,0.98)*pow(max(dot(n,normalize(key+view)),0.0),36.0)*0.7;
  }
  color=pow(max(color,vec3(0.0)),vec3(0.84));
  gl_FragColor=vec4(clamp(color,0.0,1.0),alpha);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Shader unavailable');
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader); throw new Error('Material rendering unavailable');
  }
  return shader;
}

function releaseRenderer(value) {
  if (!value) return;
  const { gl } = value;
  if (!gl.isContextLost()) {
    gl.deleteBuffer(value.buffer);
    gl.deleteProgram(value.program);
  }
}

function getRenderer() {
  if (renderer && !renderer.gl.isContextLost()) return renderer;
  if (renderer) { releaseRenderer(renderer); renderer = null; sculptureCache.clear(); }
  if (webglUnavailable) return null;
  const layer = document.createElement('canvas');
  const gl = layer.getContext('webgl', {
    alpha: true, antialias: true, premultipliedAlpha: false,
    preserveDrawingBuffer: true, depth: false, stencil: false,
  });
  if (!gl) { webglUnavailable = true; return null; }
  let vertex, fragment, program, buffer;
  try {
    vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Material rendering unavailable');
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Material rendering unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Material rendering unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const value = { layer, gl, program, buffer,
      material: gl.getUniformLocation(program, 'material'),
      rotation: gl.getUniformLocation(program, 'objectRotation') };
    layer.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      if (renderer === value) { renderer = null; sculptureCache.clear(); }
    });
    // Linked programs retain their compiled shader code; geometry and uniforms are reused.
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    renderer = value;
    return value;
  } catch {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    webglUnavailable = true;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
}

function drawWebGL(canvas, material, size, rotationX, rotationY) {
  const value = getRenderer();
  if (!value) return false;
  const { gl, layer, program } = value;
  try {
    if (layer.width !== size || layer.height !== size) layer.width = layer.height = size;
    gl.useProgram(program);
    gl.uniform1f(value.material, material === 'chrome' ? 1 : material === 'pearl' ? 2 : 0);
    gl.uniform2f(value.rotation, rotationX, rotationY);
    gl.viewport(0,0,size,size); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('Material rendering unavailable');
    // The shared GPU surface is copied immediately, so every returned canvas is stable.
    canvas.getContext('2d').drawImage(layer,0,0);
    return true;
  } catch {
    releaseRenderer(value);
    if (renderer === value) renderer = null;
    sculptureCache.clear();
    return false;
  }
}

function drawFallback(canvas, material, size, rotationX, rotationY) {
  const ctx=canvas.getContext('2d'), r=size*0.38, hole=size*0.16;
  ctx.save(); ctx.translate(size/2,size/2);
  // A lightweight material illustration remains interactive without WebGL.
  ctx.rotate(-0.38+Math.sin(rotationY)*0.24);
  const widthScale=Math.max(0.38,Math.abs(Math.cos(rotationY*0.7)));
  const heightScale=Math.max(0.32,Math.min(1,0.83*Math.abs(Math.cos(0.54+rotationX))/Math.cos(0.54)));
  ctx.scale(widthScale,heightScale);
  const shift=Math.sin(rotationX)*r*0.35;
  const fill=ctx.createLinearGradient(-r,-r+shift,r,r-shift);
  const stops=material==='chrome'
    ? [[0,'#fcffff'],[0.18,'#b8d4e2'],[0.3,'#15364c'],[0.43,'#ecfaff'],[0.5,'#fcffff'],[0.57,'#1d394f'],[0.74,'#7da8c1'],[0.86,'#e3c1d9'],[1,'#fcffff']]
    : material==='pearl'
      ? [[0,'#fcffff'],[0.23,'#e8edf7'],[0.46,'#e9d5eb'],[0.63,'#b7dbe4'],[0.8,'#f9e6f0'],[1,'#fcffff']]
      : [[0,'rgba(252,255,255,.95)'],[0.19,'rgba(140,215,238,.36)'],[0.4,'rgba(32,158,201,.44)'],[0.53,'rgba(252,255,255,.8)'],[0.63,'rgba(160,224,241,.25)'],[0.82,'rgba(68,166,204,.5)'],[1,'rgba(252,255,255,.85)']];
  stops.forEach(([offset,color])=>fill.addColorStop(offset,color));
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.arc(0,0,hole,0,Math.PI*2);
  ctx.fillStyle=fill; ctx.fill('evenodd');
  ctx.lineWidth=Math.max(1,size*.002); ctx.strokeStyle='rgba(252,255,255,.85)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0,0,(r+hole)/2,Math.PI*1.08,Math.PI*1.79);
  ctx.strokeStyle=material==='chrome'?'rgba(255,255,255,.9)':'rgba(252,255,255,.6)';
  ctx.lineWidth=size*.017; ctx.shadowColor='#fcffff'; ctx.shadowBlur=size*.012; ctx.stroke();
  ctx.restore();
}

function boundedAngle(raw) {
  const value=Number(raw);
  return Number.isFinite(value)?Math.min(Math.PI,Math.max(-Math.PI,value)):0;
}

/** Render a stable transparent material image; rotations are offsets in radians.
 * A shared GPU renderer makes drag frames cheap. Callers can use a smaller size
 * while dragging, then request the full export resolution when the gesture ends.
 */
export async function renderSculpture({material='glass',size=512,rotationX=0,rotationY=0}={}) {
  const finish=MATERIALS.has(material)?material:'glass';
  const resolution=Math.round(Math.min(1024,Math.max(128,Number(size)||512)));
  const x=boundedAngle(rotationX), y=boundedAngle(rotationY);
  const key=`${finish}:${resolution}:${Math.round(x*100)}:${Math.round(y*100)}`;
  // A lost context must be rebuilt even when the requested view had been cached.
  if (renderer?.gl.isContextLost()) { releaseRenderer(renderer); renderer=null; sculptureCache.clear(); }
  if (sculptureCache.has(key)) return sculptureCache.get(key);
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=resolution;
  const rendered=drawWebGL(canvas,finish,resolution,x,y);
  if (!rendered) drawFallback(canvas,finish,resolution,x,y);
  canvas.dataset.material=finish;
  canvas.dataset.renderer=rendered?'webgl':'canvas';
  canvas.dataset.rotationX=String(x); canvas.dataset.rotationY=String(y);
  sculptureCache.set(key,canvas);
  if(sculptureCache.size>9) sculptureCache.delete(sculptureCache.keys().next().value);
  return canvas;
}
