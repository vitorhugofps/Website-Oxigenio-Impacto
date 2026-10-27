/* Oxigênio Uberlândia · cilindro 3D da seção Procedência
   Fonte em src/cilindro3d.js → build em js/cilindro3d.min.js (ver README).
   Unidade: raio do cilindro = 1. Frente (θ = 0) voltada para +z. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, LatheGeometry, CylinderGeometry, ExtrudeGeometry,
  PlaneGeometry, BoxGeometry, TorusGeometry, Shape, Path, Vector2, Vector3, MeshStandardMaterial, MeshPhysicalMaterial,
  MeshBasicMaterial, TextureLoader, CanvasTexture, SRGBColorSpace, RepeatWrapping, PMREMGenerator,
  ACESFilmicToneMapping, DirectionalLight, MathUtils, Color, DoubleSide
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const BODY = 6.6;           // topo do corpo reto
const NECK_R = 0.40;
const LABEL = { y0: 4.72, h: 0.9, theta: MathUtils.degToRad(170) };

/* ---------- perfil do cilindro, reamostrado por comprimento (v da textura ≈ comprimento) ---------- */
function cylinderProfile() {
  const p = [];
  p.push(new Vector2(0.001, 0.10), new Vector2(0.45, 0.075), new Vector2(0.72, 0.02));
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI / 2; p.push(new Vector2(0.80 + 0.20 * Math.cos(a), 0.20 + 0.20 * Math.sin(a))); }
  p.push(new Vector2(1, 1.2), new Vector2(1, 3), new Vector2(1, 5), new Vector2(1, BODY));
  const tEnd = Math.acos(0.46);
  for (let i = 1; i <= 28; i++) { const t = (i / 28) * tEnd; p.push(new Vector2(Math.cos(t), BODY + 0.95 * Math.sin(t))); }
  const ys = BODY + 0.95 * Math.sin(tEnd);
  // concordância ombro → gargalo
  p.push(new Vector2(0.43, ys + 0.04), new Vector2(0.41, ys + 0.09), new Vector2(NECK_R, ys + 0.15));
  p.push(new Vector2(NECK_R, ys + 0.38), new Vector2(NECK_R - 0.015, ys + 0.405), new Vector2(0.30, ys + 0.41), new Vector2(0.001, ys + 0.41));
  return { pts: resample(p, 260), top: ys + 0.41 };
}
function resample(pts, n) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const out = [], tot = L[L.length - 1];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const d = (k / (n - 1)) * tot;
    while (j < L.length - 1 && L[j] < d) j++;
    const t = (d - L[j - 1]) / (L[j] - L[j - 1] || 1);
    out.push(new Vector2().lerpVectors(pts[j - 1], pts[j], t));
  }
  return out;
}
const lathe = (pts, seg = 96) => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), seg);

/* ---------- etiqueta (Proposta A, mesmo desenho do componente .label do site) ---------- */
async function drawLabel(qrPath) {
  const PW = 2048, PH = Math.round(PW / (LABEL.theta / LABEL.h)); // proporção arco/altura
  const c = document.createElement('canvas'); c.width = PW; c.height = PH;
  const g = c.getContext('2d');
  const k = PH / 500, H = 500, W = PW / k; g.scale(k, k); // desenho em unidades lógicas (altura 500)
  try { await Promise.all([document.fonts.load("600 64px 'Funnel Display'"), document.fonts.load("400 28px 'Funnel Sans'"), document.fonts.load("600 28px 'Funnel Sans'")]); } catch (e) {}
  const FD = "'Funnel Display','Funnel Sans',system-ui,sans-serif", FS = "'Funnel Sans',system-ui,sans-serif";
  const ink = '#071A3B', ink2 = '#3B4659', line = 'rgba(7,26,59,.14)';
  const bw = Math.round(W * 0.30), qw = Math.round(W * 0.19), dw = W - bw - qw, telH = Math.round(H * 0.17), mainH = H - telH;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  // bloco da marca
  g.fillStyle = '#071A3B'; g.fillRect(0, 0, bw, H);
  const pad = 42;
  const logo = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'img/3d/logo-neg.svg'; });
  if (logo) { const lw = bw * 0.58; g.drawImage(logo, pad, pad - 4, lw, lw * 169.28 / 590.18); }
  g.fillStyle = '#fff'; g.font = `600 78px ${FD}`; g.textBaseline = 'alphabetic';
  if ('letterSpacing' in g) g.letterSpacing = '-2px';
  g.fillText('Oxigênio', pad, H * 0.58); g.fillText('Medicinal', pad, H * 0.58 + 74);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.font = `400 27px ${FS}`; g.fillStyle = '#B9C9E4'; g.fillText('Gás medicinal comprimido', pad, H * 0.58 + 122);
  g.fillStyle = '#9FE3E0'; g.fillText('Uso conforme prescrição médica', pad, H - pad + 6);
  // dados 2 × 2
  const cells = [['Lote', '26-1047'], ['Envase', '21/10/26'], ['Teste hidrostático', '2024'], ['Volume', '10 m³']];
  const cw = dw / 2, ch = mainH / 2;
  cells.forEach(([k, v], i) => {
    const x = bw + (i % 2) * cw, y = Math.floor(i / 2) * ch;
    g.fillStyle = ink2; g.font = `400 28px ${FS}`; g.fillText(k, x + 40, y + ch * 0.42);
    g.fillStyle = ink; g.font = `600 70px ${FD}`; if ('letterSpacing' in g) g.letterSpacing = '-2px';
    g.fillText(v, x + 40, y + ch * 0.42 + 70); if ('letterSpacing' in g) g.letterSpacing = '0px';
  });
  g.strokeStyle = line; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(bw + cw, 0); g.lineTo(bw + cw, mainH);
  g.moveTo(bw, ch); g.lineTo(bw + dw, ch);
  g.moveTo(bw + dw, 0); g.lineTo(bw + dw, mainH);
  g.moveTo(bw, mainH); g.lineTo(W, mainH);
  g.stroke();
  // QR
  const qs = Math.min(qw - 90, mainH - 110), qx = bw + dw + (qw - qs) / 2, qy = 34;
  g.save(); g.translate(qx, qy); g.scale(qs / 29, qs / 29); g.fillStyle = ink;
  try { g.fill(new Path2D(qrPath)); } catch (e) {}
  g.restore();
  g.fillStyle = ink2; g.font = `400 22px ${FS}`; g.textAlign = 'center';
  g.fillText('Informações do lote', bw + dw + qw / 2, qy + qs + 38); g.fillText('no celular', bw + dw + qw / 2, qy + qs + 64);
  g.textAlign = 'left';
  // linha do telefone
  g.fillStyle = '#F4F2EE'; g.fillRect(bw, mainH + 1, W - bw, telH);
  g.font = `400 30px ${FS}`; g.fillStyle = ink2; const t1 = 'Troca e dúvidas: ';
  g.fillText(t1, bw + 40, mainH + telH * 0.64);
  g.font = `600 30px ${FS}`; g.fillStyle = ink; g.fillText('(34) 3213-3339', bw + 40 + g.measureText(t1).width + 6, mainH + telH * 0.64);
  // faixa azul de fechamento e leve desgaste de borda
  g.fillStyle = '#1F55F0'; g.fillRect(bw, H - 8, W - bw, 8);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(7,26,59,.05)'); grd.addColorStop(.06, 'rgba(7,26,59,0)'); grd.addColorStop(.94, 'rgba(7,26,59,0)'); grd.addColorStop(1, 'rgba(7,26,59,.06)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  return c;
}

/* ---------- volante da válvula: borda recortada em lóbulos ---------- */
function handwheelGeometry() {
  const s = new Shape(), N = 10, Ro = 0.47, n = 220;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, k = Math.pow(Math.max(0, Math.cos(N * a)), 6);
    const r = Ro - 0.055 * k;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const hole = new Path(); hole.absarc(0, 0, 0.07, 0, TAU, true); s.holes.push(hole);
  const geo = new ExtrudeGeometry(s, { depth: 0.10, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.04, bevelSegments: 5, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, 0.045, 0);
  return geo;
}
function hexGeometry(R, h, bevel = 0.025) {
  const s = new Shape();
  for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU + Math.PI / 6, x = Math.cos(a) * R, y = Math.sin(a) * R; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const geo = new ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, bevel, 0);
  return geo;
}

/* ---------- sombra de contato ---------- */
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(7,26,59,.55)'); r.addColorStop(.38, 'rgba(7,26,59,.30)'); r.addColorStop(.7, 'rgba(7,26,59,.08)'); r.addColorStop(1, 'rgba(7,26,59,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

/* ================================================================ */
export async function mount(fig, opts = {}) {
  const host = fig.querySelector('.proc-ph') || fig;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; } // sem WebGL: a foto continua
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = SRGBColorSpace;
  const cv = renderer.domElement; cv.className = 'cil-cv'; cv.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  const pm = new PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentRotation && (scene.environmentRotation.y = 0.6);
  const key = new DirectionalLight(0xffffff, 1.1); key.position.set(-6, 14, 10); scene.add(key);
  const rim = new DirectionalLight(0xbfd8ff, 0.9); rim.position.set(8, 6, -10); scene.add(rim);

  const cam = new PerspectiveCamera(28, 1, 0.1, 200);

  /* texturas */
  const tl = new TextureLoader(), base = opts.base || 'img/3d/';
  const load = (f, srgb, rep) => new Promise(res => tl.load(base + f, t => {
    if (srgb) t.colorSpace = SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t);
  }, undefined, () => res(null)));
  const qrPath = opts.qr || '';
  // pintura e latão: texturas geradas com GPT Image 2.5 (Higgsfield), tileáveis; desgaste do pé e do ombro no aoMap
  const PR = [3, 4.5], LR = [2, 2];
  const [pCor, pNor, pRug, pAo, lCor, lNor, lRug, labelCanvas] = await Promise.all([
    load('pintura-cor.webp', true, PR), load('pintura-normal.webp', false, PR), load('pintura-rug.jpg', false, PR), load('pintura-ao.jpg', false, [1, 1]),
    load('latao-cor.webp', true, LR), load('latao-normal.webp', false, LR), load('latao-rug.jpg', false, LR), drawLabel(qrPath)
  ]);

  const paint = new MeshPhysicalMaterial({
    color: pCor ? 0xffffff : 0x146b3e, map: pCor, roughness: pRug ? 1 : 0.3, roughnessMap: pRug, aoMap: pAo, aoMapIntensity: 1,
    normalMap: pNor, normalScale: new Vector2(0.35, 0.35), metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.07, clearcoatNormalMap: pNor, clearcoatNormalScale: new Vector2(0.12, 0.12)
  });
  const brass = new MeshStandardMaterial({ color: lCor ? 0xffffff : 0xd8b15a, map: lCor, metalness: 1, roughness: lRug ? 1 : 0.28, roughnessMap: lRug, normalMap: lNor, normalScale: new Vector2(0.3, 0.3) });
  const brassDark = brass.clone(); brassDark.color = new Color(0xd9c7a0);
  const steel = new MeshStandardMaterial({ color: 0xd3d8de, metalness: 1, roughness: 0.2 });
  const port = new MeshStandardMaterial({ color: 0x1b1a18, metalness: 0.6, roughness: 0.5 });
  const wheel = new MeshPhysicalMaterial({ color: 0x157a46, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.18 });
  const labTex = new CanvasTexture(labelCanvas); labTex.colorSpace = SRGBColorSpace; labTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new MeshPhysicalMaterial({ map: labTex, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.22, envMapIntensity: 1.25 });
  const seal = new MeshPhysicalMaterial({ color: 0xf4f8fb, roughness: 0.32, transparent: true, opacity: 0.78, clearcoat: 0.6, side: DoubleSide });

  /* modelo */
  const cyl = new Group(); scene.add(cyl);
  const prof = cylinderProfile();
  const body = new Mesh(new LatheGeometry(prof.pts, 128), paint); cyl.add(body);
  const lab = new Mesh(new CylinderGeometry(1.004, 1.004, LABEL.h, 160, 1, true, -LABEL.theta / 2, LABEL.theta), label);
  lab.position.y = LABEL.y0 + LABEL.h / 2; cyl.add(lab);

  const valve = new Group(); valve.position.y = prof.top; cyl.add(valve);
  const y = v => v; // alturas a partir do topo do gargalo
  valve.add(new Mesh(lathe([[0, 0], [0.335, 0], [0.35, 0.02], [0.35, 0.085], [0.33, 0.105], [0.215, 0.11], [0.215, 0.30], [0.001, 0.30]], 72), brass));
  const hex = new Mesh(hexGeometry(0.27, 0.24), brass); hex.position.y = y(0.30); valve.add(hex);
  valve.add(new Mesh(lathe([[0, 0.54], [0.2, 0.54], [0.2, 0.62], [0.188, 0.63], [0.188, 0.66], [0.2, 0.67], [0.2, 0.84], [0.215, 0.85], [0.215, 0.92], [0.2, 0.935], [0.065, 0.94], [0.065, 1.03], [0.001, 1.03]], 72), brass));
  // saída lateral (+x) com porca sextavada e bocal prateado
  const out = new Group(); out.position.set(0.18, y(0.42), 0); out.rotation.z = -Math.PI / 2; valve.add(out);
  out.add(new Mesh(lathe([[0, 0], [0.12, 0], [0.12, 0.22], [0.001, 0.22]], 48), brass));
  const nut = new Mesh(hexGeometry(0.2, 0.22, 0.02), brassDark); nut.position.y = 0.2; out.add(nut);
  out.add(new Mesh(lathe([[0, 0.42], [0.128, 0.42], [0.135, 0.43], [0.135, 0.465], [0.12, 0.48], [0.06, 0.48], [0.06, 0.47], [0.001, 0.47]], 48), steel));
  const hole = new Mesh(new CylinderGeometry(0.058, 0.058, 0.01, 32), port); hole.position.y = 0.476; out.add(hole);
  // volante
  const wh = new Mesh(handwheelGeometry(), wheel); wh.position.y = y(1.0); valve.add(wh);
  const cap = new Mesh(lathe([[0, 0.23], [0.3, 0.19], [0.36, 0.17], [0.38, 0.15], [0.001, 0.15]], 72), wheel); cap.position.y = y(1.0); valve.add(cap);
  const screw = new Mesh(lathe([[0, 0.25], [0.06, 0.245], [0.07, 0.23], [0.07, 0.2], [0.001, 0.2]], 32), steel); screw.position.y = y(1.0); valve.add(screw);
  // lacre: abraçadeira translúcida em volta do corpo, com etiqueta pendurada na frente
  const sealG = new Group(); sealG.position.y = y(0.72); valve.add(sealG);
  const band = new Mesh(new TorusGeometry(0.21, 0.014, 8, 64), seal); band.rotation.x = Math.PI / 2; band.scale.set(1, 1, 2.2); sealG.add(band);
  const head = new Mesh(new BoxGeometry(0.075, 0.07, 0.06), seal); head.position.set(-0.1, 0, 0.2); sealG.add(head);
  const tail = new Mesh(new BoxGeometry(0.03, 0.006, 0.2), seal); tail.position.set(-0.17, -0.04, 0.27); tail.rotation.set(0.5, -0.6, 0); sealG.add(tail);
  const tag = new Mesh(new BoxGeometry(0.13, 0.18, 0.012), seal); tag.position.set(-0.16, -0.13, 0.27); tag.rotation.set(0.12, -0.5, 0.18); sealG.add(tag);

  // sombra de contato
  const sh = new Mesh(new PlaneGeometry(4.2, 4.2), new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; scene.add(sh);

  /* ---------- enquadramentos ----------
     yaw: giro do cilindro (0 = etiqueta de frente); el: elevação da câmera (rad); d: distância; ty: altura do alvo */
  const TOP = prof.top + 1.25;
  const S = {
    geral:    { ty: TOP * 0.5, d: 23.5, el: 0.10, yaw: 0.45, spin: 1 },
    lacre:    { ty: prof.top + 0.62, d: 5.0, el: 0.32, yaw: 0.62, spin: 0, dot: [ -0.16, prof.top + 0.6, 0.3 ] },
    etiqueta: { ty: LABEL.y0 + LABEL.h / 2, d: 8.2, el: 0.05, yaw: -0.04, spin: 0, dot: [ 0.16, LABEL.y0 + LABEL.h + 0.1, 0.99 ] },
    verde:    { ty: TOP * 0.5, d: 23.5, el: 0.03, yaw: Math.PI, spin: 0, dot: [ 0, 2.6, 1.0 ] }
  };
  const cur = { ty: prof.top + 0.62, d: 5.2, el: 0.42, yaw: 1.6 }; // início do passeio de entrada
  let state = 'geral', idle = 0, drag = 0, vel = 0, dragging = false, lastX = 0, visible = false, raf = 0, t0 = 0, scrollYaw = 0;

  /* camada de interface: ponto de destaque */
  const dot = document.createElement('span'); dot.className = 'cil-dot'; dot.setAttribute('aria-hidden', 'true');
  host.append(cv, dot);

  function size() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return false;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    // em telas mais largas que 4:5 o cilindro inteiro cabe com menos distância
    cam.fov = cam.aspect > 0.9 ? 24 : 28; cam.updateProjectionMatrix(); return true;
  }
  const ro = new ResizeObserver(() => { if (size()) render(); }); ro.observe(host);

  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const v3 = new Vector3();
  function render() {
    const yaw = cur.yaw + idle + drag + scrollYaw;
    cyl.rotation.y = yaw;
    cam.position.set(0, cur.ty + Math.sin(cur.el) * cur.d, Math.cos(cur.el) * cur.d);
    cam.lookAt(0, cur.ty, 0);
    renderer.render(scene, cam);
    const st = S[state];
    if (st.dot) {
      v3.set(...st.dot).applyAxisAngle(new Vector3(0, 1, 0), yaw).project(cam);
      const front = Math.cos(Math.atan2(st.dot[0], st.dot[2]) + yaw) > 0.15;
      dot.style.transform = `translate(${(v3.x * 0.5 + 0.5) * host.clientWidth}px, ${(-v3.y * 0.5 + 0.5) * host.clientHeight}px)`;
      dot.classList.toggle('on', front && settled());
    } else dot.classList.remove('on');
  }
  const settled = () => { const st = S[state]; return Math.abs(cur.d - st.d) < st.d * 0.12 && Math.abs(cur.ty - st.ty) < 0.4; };

  function loop(t) {
    raf = 0; if (!visible) return;
    const dt = Math.min(0.05, t0 ? (t - t0) / 1000 : 0.016); t0 = t;
    const st = S[state], k = reduce ? 60 : (intro ? 1.25 : 3.2);
    cur.ty = damp(cur.ty, st.ty, k, dt); cur.d = damp(cur.d, st.d, k * 0.9, dt); cur.el = damp(cur.el, st.el, k, dt);
    // giro: o alvo de yaw considera o giro ocioso acumulado para não "voltar" a cada troca
    cur.yaw = damp(cur.yaw, st.yaw, k * 0.85, dt);
    if (!reduce && st.spin && !dragging) idle += dt * 0.16; else idle = damp(idle, Math.round(idle / TAU) * TAU, 2.2, dt);
    if (!dragging) { drag += vel * dt; vel *= Math.exp(-3.2 * dt); if (!st.spin) drag = damp(drag, 0, 1.4, dt); }
    if (intro && settled()) intro = false;
    render();
    raf = requestAnimationFrame(loop);
  }
  let intro = !reduce;
  if (reduce) Object.assign(cur, S.geral);
  const play = () => { if (!raf && visible) { t0 = 0; raf = requestAnimationFrame(loop); } };

  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) play(); }, { rootMargin: '60px' }).observe(host);

  // giro leve ligado ao scroll (parallax), sem trocar de enquadramento sozinho
  const onScroll = () => { if (reduce) return; const r = host.getBoundingClientRect(); const p = (innerHeight - r.top) / (innerHeight + r.height); scrollYaw = (p - 0.5) * 0.9; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // arrastar para girar (horizontal); a rolagem vertical da página continua livre
  cv.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; vel = 0; cv.setPointerCapture(e.pointerId); host.classList.add('grab'); });
  cv.addEventListener('pointermove', e => { if (!dragging) return; const dx = (e.clientX - lastX) / host.clientWidth * 4.2; lastX = e.clientX; drag += dx; vel = dx / 0.016; play(); });
  const up = () => { dragging = false; host.classList.remove('grab'); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  if (opts.debug) window.__cil = { cur, S, get state() { return state; }, get yaw() { return cur.yaw + idle + drag + scrollYaw; } };
  size(); render();
  host.classList.add('cil-on'); // a foto sai, o 3D entra
  return {
    set(name) {
      if (!S[name] || name === state) return;
      // junta o giro ocioso e o arraste no yaw atual e escolhe a volta mais curta até o novo enquadramento
      cur.yaw += idle + drag; idle = 0; drag = 0; vel = 0;
      cur.yaw = S[name].yaw + wrapPi(cur.yaw - S[name].yaw);
      state = name; intro = false; play();
    },
    get state() { return state; }
  };
}
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
