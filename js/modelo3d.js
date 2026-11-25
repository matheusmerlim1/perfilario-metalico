/* ---------- modelo 3D em escala (mm) ----------
   Perfis: a seção exata do desenho (outline) extrudada num trecho. Grades: barras/nervuras com as medidas
   do catálogo (gradeModel). three.js é carregado só quando o 3D é aberto. Arrastar = girar, roda = zoom. */
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
let _threeP = null;
const loadThree = () => _threeP ??= new Promise((ok, no) => {
  if (window.THREE) return ok(window.THREE);
  const s = document.createElement('script'); s.src = THREE_URL; s.async = true;
  s.onload = () => ok(window.THREE); s.onerror = () => { _threeP = null; no(new Error('three.js')); };
  document.head.appendChild(s);
});

/* descrição do modelo para a linha selecionada (ou null se não há geometria confiável) */
function model3dSpec(f, r) {
  if (r && r.shape && r.dim) {
    const o = outline(r.shape, r.dim); if (!o) return null;
    const [x0, y0, x1, y1] = bbox(o), big = Math.max(x1 - x0, y1 - y0);
    const L = Math.max(300, Math.ceil(big * 5 / 100) * 100);
    return {kind: 'perfil', o, L, txt: `seção ${r.name} · trecho de ${smart(L)} mm`};
  }
  const g = gradeModel(f, r);
  if (g) {
    /* comprimento no sentido das barras: o lado do painel padrão que cobre o vão; sem painel, vão + 2 × 60 */
    let comp = g.vao ? g.vao + 120 : 600, larg = 600;
    if (g.painel) {
      const ds = [...g.painel].sort((x, y) => x - y), c = g.vao ? (ds.find(d => d >= g.vao) || ds[1]) : ds[1];
      comp = Math.min(c, 2000); larg = Math.min(ds[0] === c ? ds[1] : ds[0], 1200);
    }
    return {kind: 'grade', g, comp, larg,
      txt: `${g.tipo === 'montada' ? 'grade montada' : 'grade injetada'} · trecho de ${smart(larg)} × ${smart(comp)} mm${g.painel ? ` (painel padrão ${smart(g.painel[0])} × ${smart(g.painel[1])} mm)` : ''}${g.vao ? ` sobre apoios a ${smart(g.vao)} mm` : ''}${g.ilus.length ? ' · medidas sem cota no catálogo representadas de forma ilustrativa' : ''}`};
  }
  return null;
}

let _v3 = null;   /* visualizador ativo */
function close3d() { if (_v3) { _v3.stop(); _v3 = null; } }
async function open3d(host, spec) {
  close3d();
  host.innerHTML = '<p class="note" style="margin:8px">Carregando o 3D…</p>';
  let T;
  try { T = await loadThree(); } catch (e) { host.innerHTML = '<p class="err" style="margin:8px">Não foi possível carregar o visualizador 3D (precisa de internet).</p>'; return; }
  host.innerHTML = '';
  const cs = getComputedStyle(document.documentElement), col = k => new T.Color((cs.getPropertyValue(k) || '#888').trim());
  const W = host.clientWidth || 500, H = Math.round(Math.min(Math.max(W * 0.62, 260), 420));
  const ren = new T.WebGLRenderer({antialias: true, alpha: true});
  ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); ren.setSize(W, H);
  host.appendChild(ren.domElement);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(35, W / H, 1, 1e6);
  scene.add(new T.HemisphereLight(0xffffff, 0x445566, 0.9));
  const dl = new T.DirectionalLight(0xffffff, 0.7); dl.position.set(1, 2, 1.5); scene.add(dl);
  const mat = new T.MeshStandardMaterial({color: col('--accent'), metalness: 0.25, roughness: 0.55});
  const mat2 = new T.MeshStandardMaterial({color: col('--muted'), metalness: 0.1, roughness: 0.8});
  const edgeM = new T.LineBasicMaterial({color: col('--ink'), transparent: true, opacity: 0.35});
  const root = new T.Group(); scene.add(root);
  const addMesh = (geo, m = mat) => { const me = new T.Mesh(geo, m); root.add(me); root.add(new T.LineSegments(new T.EdgesGeometry(geo, 25), edgeM)); return me; };
  const box = (sx, sy, sz, x, y, z, m) => { const gq = new T.BoxGeometry(sx, sy, sz); gq.translate(x, y, z); return addMesh(gq, m); };

  if (spec.kind === 'perfil') {
    const {o, L} = spec, shapes = [];
    if (o.circles) {
      const sh = new T.Shape(); sh.absarc(0, 0, o.circles[0], 0, Math.PI * 2, false);
      if (o.circles[1] > 0) { const h = new T.Path(); h.absarc(0, 0, o.circles[1], 0, Math.PI * 2, true); sh.holes.push(h); }
      shapes.push(sh);
    } else {
      const toS = (ring, C) => { const s = new C(); ring.forEach(([x, y], i) => i ? s.lineTo(x, -y) : s.moveTo(x, -y)); s.closePath && s.closePath(); return s; };
      /* RHS: 2º anel é furo; 2L: dois anéis independentes */
      if (o.rings.length > 1 && ringSums(o.rings[1]).A < ringSums(o.rings[0]).A && Math.abs(polyProps([o.rings[0]]).xc - polyProps([o.rings[1]]).xc) < 1e-6) {
        const s = toS(o.rings[0], T.Shape); s.holes.push(toS(o.rings[1], T.Path)); shapes.push(s);
      } else o.rings.forEach(r => shapes.push(toS(r, T.Shape)));
    }
    const geo = new T.ExtrudeGeometry(shapes, {depth: L, bevelEnabled: false, curveSegments: 40});
    geo.computeBoundingBox(); const c = new T.Vector3(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, -c.z);
    geo.rotateY(Math.PI / 2);                                  /* comprimento no eixo x */
    addMesh(geo);
  } else {
    const {g, comp, larg} = spec, H = g.H;
    /* x = vão (sentido das barras portantes), z = largura, y = altura */
    if (g.tipo === 'montada') {
      const n = Math.max(2, Math.floor((larg - g.b) / g.p) + 1), z0 = -((n - 1) * g.p) / 2;
      for (let i = 0; i < n; i++) box(comp, H, g.b, 0, H / 2, z0 + i * g.p);
      const nt = Math.max(2, Math.floor((comp - 40) / g.t) + 1), x0 = -((nt - 1) * g.t) / 2, rr = Math.max(H * 0.09, 2.5);
      const zl = (n - 1) * g.p + g.b;
      for (let j = 0; j < nt; j++) { const cy = new T.CylinderGeometry(rr, rr, zl, 14); cy.rotateX(Math.PI / 2); cy.translate(x0 + j * g.t, H / 2, 0); addMesh(cy, mat2); }
    } else {
      const nx = Math.max(2, Math.floor(comp / g.C)), nz = Math.max(2, Math.floor(larg / g.B));
      const lx = nx * g.C + g.w, lz = nz * g.B + g.w;
      for (let i = 0; i <= nz; i++) box(lx, H, g.w, 0, H / 2, -lz / 2 + g.w / 2 + i * g.B);
      for (let j = 0; j <= nx; j++) box(g.w, H, lz, -lx / 2 + g.w / 2 + j * g.C, H / 2, 0);
    }
    if (g.vao) { const v = Math.min(g.vao, comp - 60); for (const s of [-1, 1]) box(60, 80, larg + 80, s * v / 2, -40, 0, mat2); }
  }
  /* câmera: enquadra o modelo */
  const bb = new T.Box3().setFromObject(root), ctr = bb.getCenter(new T.Vector3()), size = bb.getSize(new T.Vector3());
  root.position.sub(ctr);
  const R = size.length() / 2; let dist = R / Math.sin(cam.fov * Math.PI / 360) * 0.78;
  let rotX = 0.5, rotY = -0.7;
  const place = () => { cam.position.set(dist * Math.cos(rotX) * Math.sin(rotY), dist * Math.sin(rotX), dist * Math.cos(rotX) * Math.cos(rotY)); cam.lookAt(0, 0, 0); cam.near = dist / 100; cam.far = dist * 10; cam.updateProjectionMatrix(); };
  place();
  let drag = null, raf = 0, live = true;
  const draw = () => { raf = 0; if (live) ren.render(scene, cam); };
  const ask = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const el = ren.domElement; el.style.touchAction = 'none'; el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
  el.addEventListener('pointermove', e => { if (!drag) return; rotY -= (e.clientX - drag[0]) * 0.01; rotX = Math.max(-1.5, Math.min(1.5, rotX + (e.clientY - drag[1]) * 0.01)); drag = [e.clientX, e.clientY]; place(); ask(); });
  el.addEventListener('pointerup', () => { drag = null; el.style.cursor = 'grab'; });
  el.addEventListener('wheel', e => { e.preventDefault(); dist *= e.deltaY > 0 ? 1.12 : 1 / 1.12; place(); ask(); }, {passive: false});
  draw();
  _v3 = {stop() { live = false; ren.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }};
}
