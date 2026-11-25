/* ---------- grades de piso: modelo paramétrico, desenho em escala ----------
   gradeModel(f, r) lê as medidas que o CATÁLOGO dá (propriedades do item ou notas da família) e devolve
   {tipo, H, b, p, t, B, C, w, vao, painel, fonte:{...}, ilus:[...]}. Medidas que o catálogo não dá
   ficam em `ilus` (desenhadas só como ilustração, sem cota). Nada aqui é inventado. */
const _n = s => parseFloat(String(s).replace(',', '.'));
const _nota = (f, re) => { for (const n of f.notas || []) { const m = n.match(re); if (m) return m; } return null; };

function gradeModel(f, r) {
  if (!f || f.iconKey !== 'grade' || !r) return null;
  const p = r.p || {}, id = f.id;
  const g = {tipo: 'montada', H: null, b: null, p: null, t: null, B: null, C: null, w: null, vao: null, painel: null, aa: null, ilus: [], deriv: []};
  if (/^stratus-gps/.test(id)) {
    const h = _nota(f, /Altura da barra portante\s*(\d+)\s*mm(?:\s*\(([\d,]+)\s*mm\))?/i);
    g.H = h ? _n(h[2] || h[1]) : _n((id.match(/gps(\d+)/) || [])[1]);
    const b = _nota(f, /mesa de\s*([\d,]+)\s*mm/i); if (b) g.b = _n(b[1]);
    const a = _nota(f, /Área aberta:\s*([\d,]+)\s*%/i); if (a) g.aa = _n(a[1]);
    if (g.b && g.aa) { g.p = g.b / (1 - g.aa / 100); g.deriv.push('p'); }
    g.vao = p.D;
  } else if (/^stratus-gis/.test(id)) {
    g.tipo = 'injetada';
    const m = _nota(f, /Altura\s*(\d+)\s*mm,\s*malha\s*(\d+)\s*[×x]\s*(\d+)/i);
    if (m) { g.H = +m[1]; g.B = +m[2]; g.C = +m[3]; }
    g.vao = p.D;
  } else if (id === 'cogumelo-gm') {
    Object.assign(g, {H: p.h, b: p.bs, p: p.passo, t: p.malha_t, aa: p.aa, vao: p.vao_rec});
    const pn = _nota(f, /Painel padrão\s*([\d.]+)\s*mm.*?×\s*([\d.]+)\s*mm/i);
    if (pn) g.painel = [_n(pn[1].replace('.', '')), _n(pn[2].replace('.', ''))];
  } else if (id === 'cogumelo-gi') {
    Object.assign(g, {tipo: 'injetada', H: p.A, B: p.B, C: p.C, aa: p.aa});
    const pn = _nota(f, /Painel padrão\s*([\d.]+)\s*mm.*?×\s*([\d.]+)\s*mm/i);
    if (pn) g.painel = [_n(pn[1].replace('.', '')), _n(pn[2].replace('.', ''))];
  } else if (id === 'gran-grade-gm60') {
    Object.assign(g, {H: p.H, t: p.s2, vao: p.Lmax, painel: p.B && p.L ? [p.B, p.L] : null});
    /* barra portante: "perfil principal I 1.1/2" × 5/8" × 1/8"" (largura da mesa = 2º valor) */
    const m = String(r.sub || '').match(/I\s*[\d.\/]+"\s*×\s*(\d+)\/(\d+)"/);
    if (m) g.b = +m[1] / +m[2] * 25.4;
  } else return null;
  if (!(g.H > 0)) return null;
  if (g.tipo === 'injetada') {
    if (!(g.B > 0)) return null;
    g.C = g.C || g.B;
    /* espessura da nervura pela área aberta do catálogo: (B−w)(C−w) = aa·B·C */
    if (g.aa > 0 && g.aa < 100) {
      const B = g.B, C = g.C, k = g.aa / 100, s = B + C, d = s * s - 4 * (1 - k) * B * C;
      g.w = (s - Math.sqrt(d)) / 2; g.deriv.push('w');
    } else { g.w = Math.min(g.B, g.C) * 0.18; g.ilus.push('w'); }
  } else {
    if (!(g.b > 0)) { g.b = g.H * 0.4; g.ilus.push('b'); }
    if (!(g.p > 0)) { g.p = g.b * 2.4; g.ilus.push('p'); }
    if (!(g.t > 0)) { g.t = 152.4; g.ilus.push('t'); }
  }
  return g;
}

/* desenho: corte, planta de um trecho e elevação no vão — tudo na mesma escala dentro de cada vista */
function gradeDrawing(g, nome) {
  const n1 = v => +v.toFixed(1), fm = v => smart(v);
  const parts = [], arrows = [];
  const ar = (x, y, ux, uy) => `M${n1(x)} ${n1(y)}L${n1(x - ux * 6 - uy * 2.4)} ${n1(y - uy * 6 + ux * 2.4)}L${n1(x - ux * 6 + uy * 2.4)} ${n1(y - uy * 6 - ux * 2.4)}Z`;
  const txt = (x, y, t, a = 'middle', cls = 'dt') => `<text class="${cls}" x="${n1(x)}" y="${n1(y)}" text-anchor="${a}">${esc(t)}</text>`;
  /* cota horizontal entre xa e xb na altura y (linhas de chamada desde y0) */
  const cotaH = (xa, xb, y, y0, label) => {
    parts.push(`<line x1="${n1(xa)}" y1="${n1(y0)}" x2="${n1(xa)}" y2="${n1(y + 4)}"/><line x1="${n1(xb)}" y1="${n1(y0)}" x2="${n1(xb)}" y2="${n1(y + 4)}"/>`);
    const small = xb - xa < 24;
    parts.push(`<line x1="${n1(small ? xa - 12 : xa)}" y1="${n1(y)}" x2="${n1(small ? xb + 12 : xb)}" y2="${n1(y)}"/>`);
    arrows.push(small ? ar(xa, y, 1, 0) + ar(xb, y, -1, 0) : ar(xa, y, -1, 0) + ar(xb, y, 1, 0));
    parts.push(small ? txt(xb + 14, y + 4, label, 'start') : txt((xa + xb) / 2, y - 5, label));
  };
  const cotaV = (ya, yb, x, x0, label, side = -1) => {
    parts.push(`<line x1="${n1(x0)}" y1="${n1(ya)}" x2="${n1(x + side * 4)}" y2="${n1(ya)}"/><line x1="${n1(x0)}" y1="${n1(yb)}" x2="${n1(x + side * 4)}" y2="${n1(yb)}"/>`);
    const small = yb - ya < 24;
    parts.push(`<line x1="${n1(x)}" y1="${n1(small ? ya - 12 : ya)}" x2="${n1(x)}" y2="${n1(small ? yb + 12 : yb)}"/>`);
    arrows.push(small ? ar(x, ya, 0, 1) + ar(x, yb, 0, -1) : ar(x, ya, 0, -1) + ar(x, yb, 0, 1));
    parts.push(txt(x + side * 6, (ya + yb) / 2 + 4, label, side < 0 ? 'end' : 'start'));
  };
  const shapes = [], light = [];
  const W = 560;                                   /* largura útil do desenho */
  let y = 26;
  const titulo = t => { parts.push(txt(0, y - 10, t, 'start', 'vt')); };

  /* 1) CORTE transversal às barras portantes */
  titulo(g.tipo === 'montada' ? 'Corte transversal às barras portantes' : 'Corte da grade (nervuras)');
  const pitch = g.tipo === 'montada' ? g.p : g.B, bar = g.tipo === 'montada' ? g.b : g.w, nb = 4;
  const larg = pitch * (nb - 1) + bar;
  const s1 = Math.min((W - 200) / larg, 110 / g.H, 6);
  const x0 = 104, top = y + 34;
  for (let i = 0; i < nb; i++) {
    const xa = x0 + i * pitch * s1;
    if (g.tipo === 'montada' && !g.ilus.includes('b')) {
      /* barra em "I": só a largura da mesa e a altura vêm do catálogo; alma e mesas desenhadas como ilustração */
      const bw = bar * s1, hh = g.H * s1, tf = Math.max(hh * 0.12, 1.5), tw = Math.max(bw * 0.3, 1.5);
      shapes.push(`M${n1(xa)} ${n1(top)}h${n1(bw)}v${n1(tf)}h${n1(-(bw - tw) / 2)}v${n1(hh - 2 * tf)}h${n1((bw - tw) / 2)}v${n1(tf)}h${n1(-bw)}v${n1(-tf)}h${n1((bw - tw) / 2)}v${n1(-(hh - 2 * tf))}h${n1(-(bw - tw) / 2)}Z`);
    } else shapes.push(`M${n1(xa)} ${n1(top)}h${n1(bar * s1)}v${n1(g.H * s1)}h${n1(-bar * s1)}Z`);
  }
  if (g.tipo === 'montada') light.push(`<line class="rod" x1="${n1(x0 - 10)}" y1="${n1(top + g.H * s1 / 2)}" x2="${n1(x0 + larg * s1 + 10)}" y2="${n1(top + g.H * s1 / 2)}"/>`);
  const xR = x0 + larg * s1;
  cotaV(top, top + g.H * s1, x0 - 26, x0 - 4, `${g.tipo === 'montada' ? 'h' : 'A'} = ${fm(g.H)}`);
  if (g.tipo === 'montada') {
    if (!g.ilus.includes('b')) cotaH(x0, x0 + bar * s1, top - 14, top - 2, `b = ${fm(bar)}`);
    if (!g.ilus.includes('p')) cotaH(x0 + pitch * s1, x0 + 2 * pitch * s1, top + g.H * s1 + 22, top + g.H * s1 + 2, `s = ${fm(pitch)}${g.deriv.includes('p') ? '*' : ''}`);
    if (!g.ilus.includes('p') && !g.ilus.includes('b')) cotaH(x0 + pitch * s1 * 2 + bar * s1, x0 + pitch * s1 * 3, top - 14, top - 2, `a = ${fm(pitch - bar)}${g.deriv.includes('p') ? '*' : ''}`);
  } else {
    cotaH(x0, x0 + pitch * s1, top + g.H * s1 + 22, top + g.H * s1 + 2, `B = ${fm(pitch)}`);
    if (!g.ilus.includes('w')) cotaH(xR - bar * s1, xR, top - 14, top - 2, `e = ${fm(g.w)}*`);
  }
  y = top + g.H * s1 + 56;

  /* 2) PLANTA de um trecho (malha) */
  titulo('Planta (trecho da malha)');
  const pT = y + 28;
  if (g.tipo === 'montada') {
    const nB = 8, nT = 2, Lx = g.p * (nB - 1) + g.b, Ly = g.t * (nT - 1) + 40;
    const s2 = Math.min((W - 200) / Lx, 150 / Ly);
    for (let i = 0; i < nB; i++) shapes.push(`M${n1(x0 + i * g.p * s2)} ${n1(pT)}h${n1(g.b * s2)}v${n1(Ly * s2)}h${n1(-g.b * s2)}Z`);
    for (let j = 0; j < nT; j++) { const yy = pT + (20 + j * g.t) * s2; light.push(`<line class="rod${g.ilus.includes('t') ? ' il' : ''}" x1="${n1(x0 - 8)}" y1="${n1(yy)}" x2="${n1(x0 + Lx * s2 + 8)}" y2="${n1(yy)}"/>`); }
    if (!g.ilus.includes('t')) cotaV(pT + 20 * s2, pT + (20 + g.t) * s2, x0 + Lx * s2 + 26, x0 + Lx * s2 + 10, `t = ${fm(g.t)}`, 1);
    if (!g.ilus.includes('p')) cotaH(x0, x0 + g.p * s2, pT - 12, pT - 2, `s = ${fm(g.p)}${g.deriv.includes('p') ? '*' : ''}`);
    parts.push(txt(x0 + Lx * s2 / 2, pT + Ly * s2 + 16, 'barras portantes ↕ (vão no sentido das barras)', 'middle', 'nt'));
    y = pT + Ly * s2 + 62;
  } else {
    const nx = 5, ny = 4, Lx = g.B * nx + g.w, Ly = g.C * ny + g.w, s2 = Math.min((W - 200) / Lx, 160 / Ly);
    for (let i = 0; i <= nx; i++) shapes.push(`M${n1(x0 + i * g.B * s2)} ${n1(pT)}h${n1(g.w * s2)}v${n1(Ly * s2)}h${n1(-g.w * s2)}Z`);
    for (let j = 0; j <= ny; j++) shapes.push(`M${n1(x0)} ${n1(pT + j * g.C * s2)}h${n1(Lx * s2)}v${n1(g.w * s2)}h${n1(-Lx * s2)}Z`);
    cotaH(x0, x0 + g.B * s2, pT - 12, pT - 2, `B = ${fm(g.B)}`);
    cotaV(pT, pT + g.C * s2, x0 + Lx * s2 + 26, x0 + Lx * s2 + 10, `C = ${fm(g.C)}`, 1);
    y = pT + Ly * s2 + 44;
  }

  /* 3) ELEVAÇÃO no vão (mesma escala horizontal e vertical) */
  if (g.vao > 0) {
    titulo('Elevação: grade biapoiada no vão');
    const s3 = (W - 200) / (g.vao + 120), eT = y + 30, hh = Math.max(g.H * s3, 1.2), xa = x0 + 60 * s3, xb = xa + g.vao * s3;
    shapes.push(`M${n1(x0)} ${n1(eT)}h${n1((g.vao + 120) * s3)}v${n1(hh)}h${n1(-(g.vao + 120) * s3)}Z`);
    for (const xs of [xa, xb]) light.push(`<path class="sup" d="M${n1(xs)} ${n1(eT + hh)}l-9 14h18Z"/>`);
    cotaH(xa, xb, eT + hh + 34, eT + hh + 16, `D = ${fm(g.vao)}`);
    y = eT + hh + 50;
  }
  const notas = [];
  if (g.deriv.length) notas.push('* calculado com dados do catálogo (área aberta e largura da mesa/malha)');
  if (g.ilus.length) notas.push('sem cota = o catálogo não informa a medida (desenho ilustrativo)');
  notas.push('medidas em mm; cada vista em escala própria');
  notas.forEach((t, i) => parts.push(txt(0, y + 4 + i * 15, t, 'start', 'nt')));
  y += notas.length * 15 + 6;

  return `<svg viewBox="-8 0 ${W + 16} ${n1(y)}" role="img" aria-label="Desenho em escala de ${esc(nome)}">
    <defs><pattern id="hatchG" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" style="fill:var(--sec-fill)"/><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--hatch)" stroke-width="1.1"/></pattern></defs>
    <style>.vt{fill:var(--muted);font:600 12px var(--f-display);letter-spacing:.08em;text-transform:uppercase}
      .nt{fill:var(--muted);font:11px var(--f-body)}
      .gd line{stroke:var(--dim);stroke-width:.8}.gd .ar{fill:var(--dim)}
      .gd .dt{fill:var(--dim);font:500 11.5px var(--f-mono);paint-order:stroke;stroke:var(--surface-2);stroke-width:3.5px;stroke-linejoin:round}
      .rod{stroke:var(--ink-2);stroke-width:1.6}.rod.il{stroke-dasharray:5 4}.sup{fill:var(--muted)}</style>
    <path d="${shapes.join('')}" style="fill:url(#hatchG);stroke:var(--ink)" stroke-width="1" stroke-linejoin="round"/>
    ${light.join('')}
    <g class="gd">${parts.join('')}<path class="ar" d="${arrows.join('')}"/></g>
  </svg>`;
}
