/* ---------- componentes de catálogo: desenho cotado e modelo 3D por tipo ----------
   compModel(f, r) reconhece o tipo pelo SIGNIFICADO das colunas do catálogo (descrição da propriedade),
   nunca pela letra sozinha, e devolve {tipo, v:{medidas}, calc:[derivadas], ilus:[ilustrativas]}.
   Tipos: manilha e olhal (Green Pin), fuso e porca trapezoidal (Conti), cabo de aço (Siva). */
const _num = v => {
  if (typeof v === 'number') return v;
  const m = String(v ?? '').trim().match(/^(\d+)\/(\d+)$/);          /* rosca em polegada: "1/2" */
  return m ? +m[1] / +m[2] * 25.4 : NaN;
};
const _desc = (f, k) => ((f.props && f.props[k]) || [])[3] || '';   /* [símbolo, unidade, decimais, descrição, grupo] */
const _has = (f, k, re) => re.test(_desc(f, k));
/* ISO 2904: folga de crista ac e profundidade h3 da rosca trapezoidal */
const trAc = P => P <= 1.5 ? 0.15 : P <= 5 ? 0.25 : P <= 12 ? 0.5 : 1;

function compModel(f, r) {
  if (!f || !f.gen || !r) return null;
  const p = r.p || {}, V = k => _num(p[k]), ok = (...ks) => ks.every(k => V(k) > 0);
  if (/manilha/.test(f.id) && _has(f, 'A', /corpo/) && _has(f, 'B', /pino/) && _has(f, 'E', /Largura interna/) && _has(f, 'F', /Comprimento interno/) && ok('A', 'B', 'E', 'F')) {
    const v = {A: V('A'), B: V('B'), E: V('E'), F: V('F'), C: V('C') > 0 ? V('C') : null, D: V('D') > 0 ? V('D') : null};
    /* comprimento do pino/parafuso: a letra muda entre famílias (H ou I) — procura pela descrição */
    const kp = Object.keys(f.props).find(k => /^Comprimento do parafuso$/.test(_desc(f, k)));
    if (kp && V(kp) > 0) v.I = V(kp);
    return {tipo: 'manilha', v, curva: /curva|bow/.test(f.id), calc: [], ilus: ['cabeça do pino']};
  }
  if (_has(f, 'A', /rosca/i) && _has(f, 'B', /base/) && _has(f, 'C', /externo do olhal/) && _has(f, 'D', /interno do olhal/) && _has(f, 'E', /^Comprimento$/) && _has(f, 'F', /Espessura da base/) && ok('A', 'B', 'C', 'D', 'E', 'F'))
    return {tipo: 'olhal', v: {A: V('A'), B: V('B'), C: V('C'), D: V('D'), E: V('E'), F: V('F')}, calc: [], ilus: []};
  if (/^conti-/.test(f.id) && ok('P') && (V('d') > 0 || V('Tr') > 0)) {
    const P = V('P'), n = V('n') > 0 ? V('n') : 1, Ph = V('Ph') > 0 ? V('Ph') : P * n, ac = trAc(P), h3 = 0.5 * P + ac;
    if (V('d') > 0) { const d = V('d'); return {tipo: 'fuso', v: {d, P, n, Ph, h3, d3: d - 2 * h3}, calc: ['d3'], ilus: []}; }
    const d = V('Tr'), D1 = d - P, v = {d, P, n, Ph, D1, L: V('L')};
    if (!(v.L > 0)) return null;
    if (ok('D')) return {tipo: 'porca', forma: 'cil', v: {...v, D: V('D')}, calc: ['D1'], ilus: []};
    if (ok('S')) return {tipo: 'porca', forma: 'quad', v: {...v, S: V('S')}, calc: ['D1'], ilus: []};
    if (ok('E') && _has(f, 'E', /sextavado/)) return {tipo: 'porca', forma: 'hex', v: {...v, E: V('E')}, calc: ['D1'], ilus: []};
    if (ok('d1', 'd3', 's')) {
      const fl = {...v, d1: V('d1'), d3: V('d3'), s: V('s')};
      if (ok('d2', 'd4', 'nf')) Object.assign(fl, {d2: V('d2'), d4: V('d4'), nf: V('nf')});
      return {tipo: 'porca', forma: 'flange', v: fl, calc: ['D1'], ilus: []};
    }
    return null;
  }
  if (f.iconKey === 'cabo' && /^Cabos de aço/.test(f.tipo || '') && V('d') > 0)
    return {tipo: 'cabo', v: {d: V('d')}, calc: [], ilus: ['construção (pernas e passo de torção)']};
  return null;
}

const COMP_TXT = {
  manilha: m => `manilha · corpo Ø ${smart(m.v.A)} · pino Ø ${smart(m.v.B)} · vão interno ${smart(m.v.E)} × ${smart(m.v.F)} mm`,
  olhal: m => `olhal · rosca Ø ${smart(m.v.A)} · olhal Ø ${smart(m.v.C)}/${smart(m.v.D)} mm`,
  fuso: m => `fuso Tr ${smart(m.v.d)} × ${smart(m.v.Ph)}${m.v.n > 1 ? ` (P ${smart(m.v.P)}, ${m.v.n} entradas)` : ''} · perfil ISO 2904`,
  porca: m => `porca Tr ${smart(m.v.d)} × ${smart(m.v.Ph)} · comprimento ${smart(m.v.L)} mm · furo no Ø menor D1 (rosca interna não modelada)`,
  cabo: m => `cabo Ø ${smart(m.v.d)} mm · 6 pernas + alma (construção e passo de torção ilustrativos)`,
};

/* ---------- desenho 2D cotado ---------- */
function svgKit() {
  const n1 = v => +v.toFixed(1), parts = [], arrows = [], shapes = [], lines = [];
  const ar = (x, y, ux, uy) => `M${n1(x)} ${n1(y)}L${n1(x - ux * 6 - uy * 2.4)} ${n1(y - uy * 6 + ux * 2.4)}L${n1(x - ux * 6 + uy * 2.4)} ${n1(y - uy * 6 - ux * 2.4)}Z`;
  const txt = (x, y, t, a = 'middle', cls = 'dt') => `<text class="${cls}" x="${n1(x)}" y="${n1(y)}" text-anchor="${a}">${esc(t)}</text>`;
  const k = {
    n1, shapes, lines,
    txt(x, y, t, a, cls) { parts.push(txt(x, y, t, a, cls)); },
    /* cota horizontal: xa..xb na altura y; e0 = y de onde saem as linhas de chamada */
    H(xa, xb, y, e0, label) {
      if (xb < xa) [xa, xb] = [xb, xa];
      const d = y < e0 ? -1 : 1;
      parts.push(`<line x1="${n1(xa)}" y1="${n1(e0)}" x2="${n1(xa)}" y2="${n1(y + d * 4)}"/><line x1="${n1(xb)}" y1="${n1(e0)}" x2="${n1(xb)}" y2="${n1(y + d * 4)}"/>`);
      const sm = xb - xa < 26;
      parts.push(`<line x1="${n1(sm ? xa - 12 : xa)}" y1="${n1(y)}" x2="${n1(sm ? xb + 12 : xb)}" y2="${n1(y)}"/>`);
      arrows.push(sm ? ar(xa, y, 1, 0) + ar(xb, y, -1, 0) : ar(xa, y, -1, 0) + ar(xb, y, 1, 0));
      parts.push(sm ? txt(xb + 14, y + 4, label, 'start') : txt((xa + xb) / 2, y - 5, label));
    },
    V(ya, yb, x, e0, label) {
      if (yb < ya) [ya, yb] = [yb, ya];
      const d = x < e0 ? -1 : 1;
      parts.push(`<line x1="${n1(e0)}" y1="${n1(ya)}" x2="${n1(x + d * 4)}" y2="${n1(ya)}"/><line x1="${n1(e0)}" y1="${n1(yb)}" x2="${n1(x + d * 4)}" y2="${n1(yb)}"/>`);
      const sm = yb - ya < 26;
      parts.push(`<line x1="${n1(x)}" y1="${n1(sm ? ya - 12 : ya)}" x2="${n1(x)}" y2="${n1(sm ? yb + 12 : yb)}"/>`);
      arrows.push(sm ? ar(x, ya, 0, 1) + ar(x, yb, 0, -1) : ar(x, ya, 0, -1) + ar(x, yb, 0, 1));
      parts.push(txt(x + d * 6, (ya + yb) / 2 + 4, label, d < 0 ? 'end' : 'start'));
    },
    svg(w, h, nome, notas = []) {
      notas.forEach((t, i) => parts.push(txt(0, h + 4 + i * 15, t, 'start', 'nt')));
      h += notas.length * 15 + 6;
      return `<svg viewBox="-8 0 ${w + 16} ${n1(h)}" role="img" aria-label="Desenho de ${esc(nome)}">
        <defs><pattern id="hatchC" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" style="fill:var(--sec-fill)"/><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--hatch)" stroke-width="1.1"/></pattern></defs>
        <style>.vt{fill:var(--muted);font:600 12px var(--f-display);letter-spacing:.08em;text-transform:uppercase}
          .nt{fill:var(--muted);font:11px var(--f-body)}.cl{stroke:var(--muted);stroke-width:.8;stroke-dasharray:9 3 2 3;fill:none}
          .gd line{stroke:var(--dim);stroke-width:.8}.gd .ar{fill:var(--dim)}
          .gd .dt{fill:var(--dim);font:500 11.5px var(--f-mono);paint-order:stroke;stroke:var(--surface-2);stroke-width:3.5px;stroke-linejoin:round}
          .ol{fill:none;stroke:var(--ink);stroke-width:1.2}</style>
        <path d="${shapes.join('')}" fill-rule="evenodd" style="fill:url(#hatchC);stroke:var(--ink)" stroke-width="1.1" stroke-linejoin="round"/>
        ${lines.join('')}
        <g class="gd">${parts.join('')}<path class="ar" d="${arrows.join('')}"/></g></svg>`;
    }
  };
  return k;
}
const _circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const _rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;

function compDrawing(m, nome) {
  const K = svgKit(), v = m.v, fm = smart, W = 520;
  if (m.tipo === 'manilha') {
    /* vista no plano do corpo; pino horizontal embaixo */
    const legX = v.E / 2 + v.A / 2, yTop = v.B / 2 + v.F, R = v.E / 2 + v.A / 2;
    const totH = yTop + v.A + (v.C ? v.C / 2 : v.B / 2), totW = v.E + 2 * v.A + (v.C ? Math.max(0, v.C - v.A) : 0);
    const s = Math.min(260 / totW, 300 / totH), cx = 200, y0 = 40 + (yTop + v.A) * s;   /* y0 = eixo do pino na tela */
    const X = x => cx + x * s, Y = y => y0 - y * s;
    const yc = yTop - v.E / 2;                                     /* centro do arco */
    K.txt(0, 18, 'Vista frontal (plano do corpo)', 'start', 'vt');
    /* corpo: pernas + arco, como faixa de largura A */
    const ro = R + v.A / 2, ri = R - v.A / 2;
    K.shapes.push(`M${X(-ro)} ${Y(0)}L${X(-ro)} ${Y(yc)}A${ro * s} ${ro * s} 0 0 1 ${X(ro)} ${Y(yc)}L${X(ro)} ${Y(0)}L${X(ri)} ${Y(0)}L${X(ri)} ${Y(yc)}A${ri * s} ${ri * s} 0 0 0 ${X(-ri)} ${Y(yc)}L${X(-ri)} ${Y(0)}Z`);
    if (v.C) for (const sx of [-1, 1]) K.shapes.push(_circ(X(sx * legX), Y(0), v.C / 2 * s));
    const pinL = v.I || (v.E + 2 * v.A + v.B);
    K.shapes.push(_rect(X(-pinL / 2), Y(v.B / 2), pinL * s, v.B * s));
    K.lines.push(`<line class="cl" x1="${X(-pinL / 2 - 10 / s)}" y1="${Y(0)}" x2="${X(pinL / 2 + 10 / s)}" y2="${Y(0)}"/>`);
    K.H(X(-v.E / 2), X(v.E / 2), Y(yc) + 18, Y(yc), `E = ${fm(v.E)}`);
    K.V(Y(v.B / 2), Y(yTop), X(0) + 4, X(0), `F = ${fm(v.F)}`);
    K.H(X(-ro), X(-ri), Y(yc) - 40, Y(yc), `A = ${fm(v.A)}`);
    K.V(Y(-v.B / 2), Y(v.B / 2), X(pinL / 2) + 22, X(pinL / 2) + 2, `B = ${fm(v.B)}`);
    if (v.C) K.H(X(-legX - v.C / 2), X(-legX + v.C / 2), Y(0) + v.C / 2 * s + 22, Y(0) + v.C / 2 * s, `C = ${fm(v.C)}`);
    if (v.I) K.H(X(-pinL / 2), X(pinL / 2), Y(0) + (v.C || v.B) / 2 * s + 48, Y(0) + v.B / 2 * s, `I = ${fm(v.I)}`);
    const h = Y(0) + (v.C || v.B) / 2 * s + (v.I ? 64 : 40);
    return K.svg(W, h, nome, ['medidas em mm (catálogo); corpo representado em formato D' + (m.curva ? ' — a curvatura do corpo da manilha curva não é dada' : ''), 'F medido da face do pino ao interno do corpo']);
  }
  if (m.tipo === 'olhal') {
    const totH = v.E + v.F + v.C, s = Math.min(300 / totH, 240 / Math.max(v.B, v.C)), cx = 200, yb = 30 + (v.C + v.F) * s;
    const X = x => cx + x * s, Y = y => yb - y * s;               /* y = 0 na face de apoio da base */
    K.txt(0, 18, 'Vista frontal', 'start', 'vt');
    const ycr = v.F + v.C / 2 - (v.C - v.D) / 4;                  /* olhal encosta na base */
    K.shapes.push(_circ(X(0), Y(ycr), v.C / 2 * s) + _circ(X(0), Y(ycr), v.D / 2 * s));
    K.shapes.push(_rect(X(-v.B / 2), Y(v.F), v.B * s, v.F * s));
    K.shapes.push(_rect(X(-v.A / 2), Y(0), v.A * s, v.E * s));
    K.V(Y(0), Y(-v.E), X(-v.B / 2) - 20, X(-v.A / 2), `E = ${fm(v.E)}`);
    K.V(Y(v.F), Y(0), X(v.B / 2) + 20, X(v.B / 2), `F = ${fm(v.F)}`);
    K.H(X(-v.A / 2), X(v.A / 2), Y(-v.E) + 20, Y(-v.E), `A = ${fm(v.A)}`);
    K.H(X(-v.C / 2), X(v.C / 2), Y(ycr + v.C / 2) - 16, Y(ycr), `C = ${fm(v.C)}`);
    K.H(X(-v.D / 2), X(v.D / 2), Y(ycr), Y(ycr), `D = ${fm(v.D)}`);
    K.txt(X(v.B / 2) + 8, Y(v.F) - 6, `B = ${fm(v.B)}`, 'start');
    return K.svg(W, Y(-v.E) + 40, nome, ['medidas em mm (catálogo)']);
  }
  if (m.tipo === 'fuso') {
    const nP = 4, Lx = nP * v.P, s = Math.min(380 / Lx, 200 / v.d), x0 = 70, yc = 30 + v.d / 2 * s + 20;
    const X = x => x0 + x * s, Y = y => yc - y * s;
    K.txt(0, 18, 'Perfil da rosca (corte axial)', 'start', 'vt');
    const a = v.h3 * Math.tan(15 * Math.PI / 180), wc = 0.366 * v.P, rM = v.d / 2, rm = v.d3 / 2;
    const prof = sign => { let d = `M${X(0)} ${Y(0)}`; for (let i = 0; i < nP; i++) { const b = i * v.P;
      d += `L${X(b)} ${Y(sign * rm)}L${X(b + (v.P - wc - 2 * a))} ${Y(sign * rm)}L${X(b + v.P - wc - a)} ${Y(sign * rM)}L${X(b + v.P - a)} ${Y(sign * rM)}L${X(b + v.P)} ${Y(sign * rm)}`; }
      return d + `L${X(Lx)} ${Y(0)}Z`; };
    K.shapes.push(prof(1), prof(-1));
    K.lines.push(`<line class="cl" x1="${X(0) - 10}" y1="${Y(0)}" x2="${X(Lx) + 10}" y2="${Y(0)}"/>`);
    K.V(Y(-rM), Y(rM), X(0) - 26, X(0), `d = ${fm(v.d)}`);
    K.V(Y(-rm), Y(rm), X(Lx) + 30, X(Lx), `d3 = ${fm(v.d3)}*`);
    const b1 = v.P - wc - a;
    K.H(X(b1 + v.P), X(b1 + 2 * v.P), Y(rM) - 18, Y(rM), `P = ${fm(v.P)}`);
    if (v.n > 1) K.txt(X(Lx / 2), Y(-rM) + 30, `${v.n} entradas · avanço Ph = ${fm(v.Ph)}`, 'middle', 'nt');
    return K.svg(W, Y(-rM) + (v.n > 1 ? 44 : 30), nome, [`* d3 = d − 2·h3, h3 = 0,5·P + ${fm(trAc(v.P))} (ISO 2904); medidas em mm`]);
  }
  if (m.tipo === 'porca') {
    const out = v.D || v.S || v.E || v.d3, s = Math.min(170 / out, 200 / (v.L + 10)), cy = 40 + out / 2 * s;
    K.txt(0, 18, 'Vista axial', 'start', 'vt'); K.txt(250, 18, 'Vista lateral', 'start', 'vt');
    const cx = 20 + out / 2 * s, X = x => cx + x * s, Y = y => cy - y * s;
    let o = '';
    if (m.forma === 'cil') o = _circ(X(0), Y(0), v.D / 2 * s);
    else if (m.forma === 'quad') o = _rect(X(-v.S / 2), Y(v.S / 2), v.S * s, v.S * s);
    else if (m.forma === 'hex') { const R = v.E / Math.sqrt(3); o = 'M' + [0, 1, 2, 3, 4, 5].map(i => `${X(R * Math.cos(i * Math.PI / 3)).toFixed(1)} ${Y(R * Math.sin(i * Math.PI / 3)).toFixed(1)}`).join('L') + 'Z'; }
    else { o = _circ(X(0), Y(0), v.d3 / 2 * s); if (v.nf) for (let i = 0; i < v.nf; i++) { const t = Math.PI / 2 + i * 2 * Math.PI / v.nf; o += _circ(X(v.d2 / 2 * Math.cos(t)), Y(v.d2 / 2 * Math.sin(t)), v.d4 / 2 * s); } }
    K.shapes.push(o + _circ(X(0), Y(0), v.D1 / 2 * s));
    if (m.forma === 'cil') K.H(X(-v.D / 2), X(v.D / 2), Y(v.D / 2) - 14, Y(0), `D = ${fm(v.D)}`);
    if (m.forma === 'quad') K.H(X(-v.S / 2), X(v.S / 2), Y(v.S / 2) - 14, Y(v.S / 2), `S = ${fm(v.S)}`);
    if (m.forma === 'hex') K.V(Y(-v.E / 2), Y(v.E / 2), X(v.E / Math.sqrt(3)) + 16, X(0), `E = ${fm(v.E)}`);
    if (m.forma === 'flange') { K.H(X(-v.d3 / 2), X(v.d3 / 2), Y(v.d3 / 2) - 14, Y(0), `d3 = ${fm(v.d3)}`); if (v.d2) K.txt(X(0), Y(-v.d3 / 2) + 18, `furos ${v.nf} × Ø ${fm(v.d4)} em Ø ${fm(v.d2)}`, 'middle', 'nt'); }
    /* vista lateral */
    const lx = 300, L = v.L * s, X2 = z => lx + z * s;
    if (m.forma === 'flange') {
      K.shapes.push(_rect(X2(0), Y(v.d3 / 2), v.s * s, v.d3 * s) + _rect(X2(v.s), Y(v.d1 / 2), (v.L - v.s) * s, v.d1 * s));
      K.V(Y(-v.d1 / 2), Y(v.d1 / 2), X2(v.L) + 18, X2(v.L), `d1 = ${fm(v.d1)}`);
      K.H(X2(0), X2(v.s), Y(-v.d3 / 2) + 18, Y(-v.d3 / 2), `s = ${fm(v.s)}`);
    } else { const h = (v.D || v.S || v.E); K.shapes.push(_rect(X2(0), Y(h / 2), L, h * s)); }
    K.lines.push(`<line class="cl" x1="${X2(0) - 8}" y1="${Y(v.D1 / 2)}" x2="${X2(v.L) + 8}" y2="${Y(v.D1 / 2)}"/><line class="cl" x1="${X2(0) - 8}" y1="${Y(-v.D1 / 2)}" x2="${X2(v.L) + 8}" y2="${Y(-v.D1 / 2)}"/>`);
    K.H(X2(0), X2(v.L), Y(-out / 2) + 40, Y(-out / 2), `L = ${fm(v.L)}`);
    K.txt(X(0), Y(-out / 2) + 34, `Tr ${fm(v.d)} · D1 = ${fm(v.D1)}*`, 'middle');
    return K.svg(W, Y(-out / 2) + 56, nome, ['* D1 = d − P, diâmetro menor da rosca interna (ISO 2904); medidas em mm']);
  }
  if (m.tipo === 'cabo') {
    const R = v.d / 2, s = 150 / v.d, cx = 200, cy = 40 + R * s, rs = R / 3;
    K.txt(0, 18, 'Seção (construção ilustrativa)', 'start', 'vt');
    K.lines.push(`<circle cx="${cx}" cy="${cy}" r="${R * s}" class="cl"/>`);
    let o = _circ(cx, cy, rs * s);
    for (let i = 0; i < 6; i++) o += _circ(cx + 2 * rs * s * Math.cos(i * Math.PI / 3), cy + 2 * rs * s * Math.sin(i * Math.PI / 3), rs * s * 0.97);
    K.shapes.push(o);
    K.H(cx - R * s, cx + R * s, cy - R * s - 16, cy, `d = ${fm(v.d)}`);
    return K.svg(W, cy + R * s + 20, nome, ['só o diâmetro nominal vem do catálogo; pernas desenhadas como ilustração']);
  }
  return '';
}

/* ---------- 3D ---------- */
function compBuild3d(T, m, kit) {
  const {addMesh, mat, mat2} = kit, v = m.v;
  const cyl = (r, len, axis, x = 0, y = 0, z = 0, mm = mat, seg = 32) => {
    const g = new T.CylinderGeometry(r, r, len, seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z); return addMesh(g, mm);
  };
  if (m.tipo === 'manilha') {
    const legX = v.E / 2 + v.A / 2, yTop = v.B / 2 + v.F, yc = yTop - v.E / 2;
    for (const sx of [-1, 1]) cyl(v.A / 2, yc, 'y', sx * legX, yc / 2, 0);
    const tor = new T.TorusGeometry(legX, v.A / 2, 20, 48, Math.PI); tor.translate(0, yc, 0); addMesh(tor);
    if (v.C) for (const sx of [-1, 1]) cyl(v.C / 2, v.D || v.A, 'x', sx * legX, 0, 0);
    const pinL = v.I || (v.E + 2 * v.A + v.B);
    cyl(v.B / 2, pinL, 'x', 0, 0, 0, mat2);
    return;
  }
  if (m.tipo === 'olhal') {
    cyl(v.B / 2, v.F, 'y', 0, v.F / 2, 0);
    cyl(v.A / 2, v.E, 'y', 0, -v.E / 2, 0, mat2);
    const ycr = v.F + v.C / 2 - (v.C - v.D) / 4, tor = new T.TorusGeometry((v.C + v.D) / 4, (v.C - v.D) / 4, 24, 64);
    tor.translate(0, ycr, 0); addMesh(tor);
    return;
  }
  if (m.tipo === 'fuso') {
    /* superfície roscada: raio(θ, z) = perfil trapezoidal ISO 2904 deslocado pela hélice (avanço Ph) */
    const L = Math.max(6 * v.d, 10 * v.P), a = v.h3 * Math.tan(15 * Math.PI / 180), wc = 0.366 * v.P;
    const rM = v.d / 2, rm = v.d3 / 2, k1 = v.P - wc - 2 * a, k2 = k1 + a, k3 = k2 + wc, k4 = k3 + a;
    const prof = s => s < k1 ? rm : s < k2 ? rm + (rM - rm) * (s - k1) / a : s < k3 ? rM : s < k4 ? rM - (rM - rm) * (s - k3) / a : rm;
    const nt = 64, nz = Math.min(4000, Math.ceil(L / v.P * 24)), pos = [], idx = [];
    for (let j = 0; j <= nz; j++) {
      const z = j / nz * L;
      for (let i = 0; i <= nt; i++) {
        const t = i / nt * 2 * Math.PI, s = (((z - t / (2 * Math.PI) * v.Ph) % v.P) + v.P) % v.P, r = prof(s);
        pos.push(z - L / 2, r * Math.cos(t), r * Math.sin(t));
      }
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nt; i++) { const q = j * (nt + 1) + i; idx.push(q, q + nt + 1, q + 1, q + 1, q + nt + 1, q + nt + 2); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    root3d(kit).add(new T.Mesh(g, mat));
    for (const sx of [-1, 1]) cyl(rm, 0.01, 'x', sx * L / 2, 0, 0, mat2);
    return;
  }
  if (m.tipo === 'porca') {
    const sh = new T.Shape();
    const ring = (s, r, cw) => s.absarc(0, 0, r, 0, Math.PI * 2, cw);
    const hole = (x, y, r) => { const h = new T.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); return h; };
    const body = (outline, holes, depth, z0, mm = mat) => {
      outline.holes.push(...holes);
      const g = new T.ExtrudeGeometry(outline, {depth, bevelEnabled: false, curveSegments: 48}); g.translate(0, 0, z0); g.rotateY(Math.PI / 2); addMesh(g, mm);
    };
    if (m.forma === 'cil') { ring(sh, v.D / 2, false); body(sh, [hole(0, 0, v.D1 / 2)], v.L, 0); }
    else if (m.forma === 'quad') { sh.moveTo(-v.S / 2, -v.S / 2); sh.lineTo(v.S / 2, -v.S / 2); sh.lineTo(v.S / 2, v.S / 2); sh.lineTo(-v.S / 2, v.S / 2); sh.closePath(); body(sh, [hole(0, 0, v.D1 / 2)], v.L, 0); }
    else if (m.forma === 'hex') { const R = v.E / Math.sqrt(3); for (let i = 0; i < 6; i++) { const p = [R * Math.cos(i * Math.PI / 3), R * Math.sin(i * Math.PI / 3)]; i ? sh.lineTo(...p) : sh.moveTo(...p); } sh.closePath(); body(sh, [hole(0, 0, v.D1 / 2)], v.L, 0); }
    else {
      ring(sh, v.d3 / 2, false);
      const hs = [hole(0, 0, v.D1 / 2)];
      if (v.nf) for (let i = 0; i < v.nf; i++) { const t = Math.PI / 2 + i * 2 * Math.PI / v.nf; hs.push(hole(v.d2 / 2 * Math.cos(t), v.d2 / 2 * Math.sin(t), v.d4 / 2)); }
      body(sh, hs, v.s, 0);
      const b = new T.Shape(); ring(b, v.d1 / 2, false); body(b, [hole(0, 0, v.D1 / 2)], v.L - v.s, v.s);
    }
    return;
  }
  if (m.tipo === 'cabo') {
    const L = 8 * v.d, rs = v.d / 6, lay = 6.5 * v.d;
    class Helix extends T.Curve { constructor(ph) { super(); this.ph = ph; }
      getPoint(t, o = new T.Vector3()) { const x = (t - 0.5) * L, a = this.ph + x / lay * 2 * Math.PI; return o.set(x, 2 * rs * Math.cos(a), 2 * rs * Math.sin(a)); } }
    cyl(rs, L, 'x', 0, 0, 0, mat2);
    for (let i = 0; i < 6; i++) addMesh(new T.TubeGeometry(new Helix(i * Math.PI / 3), 160, rs * 0.97, 16, false));
  }
}
const root3d = kit => kit.root;
