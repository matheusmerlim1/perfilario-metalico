/* ---------- cotas ----------
   V  = vertical externa (lado L ou R)      H  = horizontal externa (lado T ou B)
   VI = vertical interna (entre faces)      HI = espessura, setas por fora */
function cotaSpec(sh, g, p) {
  const c = [];
  const add = (k, t, o, sym, desc, dk) => { if (o.v > 0 && isFinite(o.v)) c.push({k, t, dk: dk || k, sym: sym || P[k][0], desc: desc || P[k][3], ...o}); };
  switch (sh) {
    case 'I': case 'U': {
      const {d, bf, tw, tf} = g, I = sh === 'I', xl = I ? -bf/2 : 0, xr = I ? bf/2 : bf, wl = I ? -tw/2 : 0, wr = I ? tw/2 : tw;
      const vl = I ? -(bf + tw) / 4 : tw + (bf - tw) * 0.35, vr = I ? (bf + tw) / 4 : tw + (bf - tw) * 0.7;
      add('d', 'V', {v:d, x:xl, y1:0, y2:d, side:'L'});
      add('bf', 'H', {v:bf, y:0, x1:xl, x2:xr, side:'T'});
      add('tf', 'V', {v:tf, x:xr, y1:0, y2:tf, side:'R'});
      add('tw', 'HI', {v:tw, y:d*0.74, x1:wl, x2:wr});
      if (p.h != null) add('h', 'VI', {v:p.h, x:vl, y1:tf, y2:d-tf});
      if (p.dl != null) add('dl', 'VI', {v:p.dl, x:vr, y1:(d-p.dl)/2, y2:(d+p.dl)/2});
      break;
    }
    case 'T': {
      const {b, t} = g;
      add('d', 'V', {v:b, x:-b/2, y1:0, y2:b, side:'L'}, 'd', 'Altura total', 'b');
      add('bf', 'H', {v:b, y:0, x1:-b/2, x2:b/2, side:'T'}, 'bf', 'Largura da mesa', 'b');
      add('t', 'V', {v:t, x:b/2, y1:0, y2:t, side:'R'});
      break;
    }
    case 'L': {
      const {b, t} = g;
      add('b', 'V', {v:b, x:0, y1:0, y2:b, side:'L'}, 'b', 'Largura da aba vertical');
      add('b2', 'H', {v:b, y:b, x1:0, x2:b, side:'B'}, 'b', 'Largura da aba horizontal', 'b');
      add('t', 'HI', {v:t, y:b*0.35, x1:0, x2:t});
      break;
    }
    case 'Ue': case 'Us': {
      const {H, B, t} = g;
      add('H', 'V', {v:H, x:0, y1:0, y2:H, side:'L'}, 'H', 'Altura');
      add('B', 'H', {v:B, y:0, x1:0, x2:B, side:'T'}, 'B', 'Largura da aba');
      if (sh === 'Ue') add('c', 'V', {v:g.c, x:B, y1:0, y2:g.c, side:'R'});
      add('t', 'HI', {v:t, y:H*0.74, x1:0, x2:t});
      break;
    }
    case 'RHS': {
      const {B, H, t} = g;
      add('H', 'V', {v:H, x:-B/2, y1:-H/2, y2:H/2, side:'L'});
      add('B', 'H', {v:B, y:-H/2, x1:-B/2, x2:B/2, side:'T'});
      add('t', 'HI', {v:t, y:H*0.2, x1:-B/2, x2:-B/2+t});
      break;
    }
    case 'CHS':
      add('D', 'H', {v:g.D, y:0, x1:-g.D/2, x2:g.D/2, side:'T'});
      add('t', 'HI', {v:g.t, y:g.D*0.18, x1:-Math.sqrt((g.D/2)**2 - (g.D*0.18)**2), x2:-Math.sqrt((g.D/2-g.t)**2 - (g.D*0.18)**2)});
      break;
    case 'RB':
      add('D', 'H', {v:g.D, y:0, x1:-g.D/2, x2:g.D/2, side:'T'});
      break;
    case 'FB':
      add('b', 'H', {v:g.b, y:0, x1:0, x2:g.b, side:'T'}, 'b', 'Largura');
      add('t', 'V', {v:g.t, x:g.b, y1:0, y2:g.t, side:'R'});
      break;
  }
  return c;
}
const COTA_OFF = 16, COTA_GAP = 26;
const cotaHidden = famId => S.cHide[famId] || new Set(['dl']);
const cotaCfg = famId => { const hide = cotaHidden(famId); return {show: k => !hide.has(k), off: S.cOff, gap: S.cGap}; };

/* ---------- desenho ---------- */
function pathOf(o, s, tx, ty) {
  if (o.circles) return o.circles.map(r => { const R = r*s; return `M${tx-R} ${ty}a${R} ${R} 0 1 0 ${2*R} 0a${R} ${R} 0 1 0 ${-2*R} 0Z`; }).join('');
  return o.rings.map(r => 'M' + r.map(([x,y]) => `${(tx+x*s).toFixed(2)} ${(ty+y*s).toFixed(2)}`).join('L') + 'Z').join('');
}
function bbox(o) {
  if (o.circles) { const R = o.circles[0]; return [-R,-R,R,R]; }
  const p = o.rings[0]; const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function icon(shape, g) {
  const o = outline(shape, g), [x0,y0,x1,y1] = bbox(o), s = Math.min(26/(x1-x0), 20/(y1-y0));
  const tx = 14 - (x0+x1)/2*s, ty = 11 - (y0+y1)/2*s;
  return `<svg viewBox="0 0 28 22" aria-hidden="true"><path d="${pathOf(o,s,tx,ty)}" fill="currentColor" fill-rule="evenodd"/></svg>`;
}
function drawing(row, cfg) {
  const g = row.dim, sh = row.shape, o = outline(sh, g);
  const [x0,y0,x1,y1] = bbox(o), bw = x1-x0, bh = y1-y0;
  const s = Math.min(200/bw, 200/bh);
  const tx = -x0*s, ty = -y0*s;
  const X = x => tx + x*s, Y = y => ty + y*s;
  const L = 0, T = 0, R = bw*s, B = bh*s;
  const n1 = v => +v.toFixed(1);
  /* limites de tudo que foi desenhado: o viewBox acompanha as cotas */
  const bx = {x0:L, y0:T, x1:R, y1:B};
  const grow = (xa, ya, xb = xa, yb = ya) => {
    bx.x0 = Math.min(bx.x0, xa, xb); bx.x1 = Math.max(bx.x1, xa, xb); bx.y0 = Math.min(bx.y0, ya, yb); bx.y1 = Math.max(bx.y1, ya, yb);
  };
  const CW = 6.9;                       /* largura média de um caractere a 11,5 px */
  const ln = (xa, ya, xb, yb) => { grow(xa, ya, xb, yb); return `<line x1="${n1(xa)}" y1="${n1(ya)}" x2="${n1(xb)}" y2="${n1(yb)}"/>`; };
  const ar = (x, y, ux, uy) => `M${n1(x)} ${n1(y)}L${n1(x-ux*6-uy*2.4)} ${n1(y-uy*6+ux*2.4)}L${n1(x-ux*6+uy*2.4)} ${n1(y-uy*6-ux*2.4)}Z`;
  const txt = (x, y, t, anchor = 'middle', rot = false) => {
    const w = t.length * CW;
    if (rot) grow(x - 10, y - w/2, x + 2, y + w/2);
    else grow(anchor === 'end' ? x - w : anchor === 'start' ? x : x - w/2, y - 10, anchor === 'end' ? x : anchor === 'start' ? x + w : x + w/2, y + 3);
    return `<text class="dt" x="${n1(x)}" y="${n1(y)}" text-anchor="${anchor}"${rot ? ` transform="rotate(-90 ${n1(x)} ${n1(y)})"` : ''}>${esc(t)}</text>`;
  };

  const cotas = cotaSpec(sh, g, row.p).filter(c => cfg.show(c.k));
  /* nível de cada cota externa: a menor fica mais perto do perfil */
  const span = c => c.t === 'V' ? Math.abs(c.y2 - c.y1) : Math.abs(c.x2 - c.x1);
  const lvl = {};
  for (const side of ['L','R','T','B'])
    cotas.filter(c => c.side === side).sort((a, b) => span(a) - span(b)).forEach((c, i) => { lvl[c.k] = i; });
  const out = [], arrows = [];
  for (const c of cotas) {
    const label = `${c.sym} = ${smart(c.v)}`, tw = label.length * CW;
    if (c.t === 'V') {
      const a = Y(Math.min(c.y1, c.y2)), b = Y(Math.max(c.y1, c.y2)), ax = X(c.x), dir = c.side === 'L' ? -1 : 1;
      const xl = (dir < 0 ? L : R) + dir * (cfg.off + lvl[c.k] * cfg.gap), small = b - a < 20, mid = (a + b) / 2;
      out.push(ln(ax + dir*2, a, xl + dir*4, a), ln(ax + dir*2, b, xl + dir*4, b));
      if (small) { out.push(ln(xl, a - 12, xl, b + 12)); arrows.push(ar(xl, a, 0, 1), ar(xl, b, 0, -1)); }
      else { out.push(ln(xl, a, xl, b)); arrows.push(ar(xl, a, 0, -1), ar(xl, b, 0, 1)); }
      if (b - a >= tw + 14) out.push(txt(dir < 0 ? xl - 4 : xl + 13, mid, label, 'middle', true));
      else out.push(txt(xl + dir*6, mid + 4, label, dir < 0 ? 'end' : 'start'));
    } else if (c.t === 'H') {
      const a = X(Math.min(c.x1, c.x2)), b = X(Math.max(c.x1, c.x2)), ay = Y(c.y), dir = c.side === 'T' ? -1 : 1;
      const yl = (dir < 0 ? T : B) + dir * (cfg.off + lvl[c.k] * cfg.gap), small = b - a < 20;
      out.push(ln(a, ay + dir*2, a, yl + dir*4), ln(b, ay + dir*2, b, yl + dir*4));
      if (small) { out.push(ln(a - 12, yl, b + 12, yl)); arrows.push(ar(a, yl, 1, 0), ar(b, yl, -1, 0)); }
      else { out.push(ln(a, yl, b, yl)); arrows.push(ar(a, yl, -1, 0), ar(b, yl, 1, 0)); }
      if (b - a >= tw + 10) out.push(txt((a + b) / 2, dir < 0 ? yl - 5 : yl + 14, label));
      else out.push(txt(b + 16, yl + 4, label, 'start'));
    } else if (c.t === 'VI') {
      const a = Y(c.y1), b = Y(c.y2), xl = X(c.x);
      out.push(ln(xl, a, xl, b)); arrows.push(ar(xl, a, 0, -1), ar(xl, b, 0, 1));
      out.push(txt(xl - 4, (a + b) / 2, label, 'middle', true));
    } else {
      const a = X(Math.min(c.x1, c.x2)), b = X(Math.max(c.x1, c.x2)), y = Y(c.y);
      out.push(ln(a - 14, y, b + 14, y)); arrows.push(ar(a, y, 1, 0), ar(b, y, -1, 0));
      out.push(txt(b + 17, y + 4, label, 'start'));
    }
  }

  /* eixos: rótulo y embaixo, ou em cima quando já há cota embaixo */
  let c = [0, 0];
  if (o.rings && sh !== 'RHS') { const q = polyProps(o.rings); c = [q.xc, q.yc]; }
  if (sh === 'I' || sh === 'T') c[0] = 0;
  const cx = X(c[0]), cy = Y(c[1]);
  const ylY = cotas.some(q => q.side === 'B') ? T - 12 : B + 20;
  grow(R + 18, cy); grow(cx, ylY + 4);
  const axes = `<g class="ax"><line x1="${n1(L-8)}" y1="${n1(cy)}" x2="${n1(R+8)}" y2="${n1(cy)}"/><line x1="${n1(cx)}" y1="${n1(T-8)}" x2="${n1(cx)}" y2="${n1(B+8)}"/></g>
    <text class="al" x="${n1(R+11)}" y="${n1(cy+4)}">x</text><text class="al" x="${n1(cx)}" y="${n1(ylY)}" text-anchor="middle">y</text>`;

  const pad = 8;
  let vx = bx.x0 - pad, vy = bx.y0 - pad, vw = bx.x1 - bx.x0 + 2*pad, vh = bx.y1 - bx.y0 + 2*pad;
  if (vw < 300) { vx -= (300 - vw) / 2; vw = 300; }
  if (vh < 180) { vy -= (180 - vh) / 2; vh = 180; }
  return `<svg viewBox="${n1(vx)} ${n1(vy)} ${n1(vw)} ${n1(vh)}" role="img" aria-label="Seção transversal de ${esc(row.name)}, cotas em milímetros: ${esc(cotas.map(q => q.sym + ' = ' + smart(q.v)).join(', '))}">
    <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" style="fill:var(--sec-fill)"/><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--hatch)" stroke-width="1.1"/></pattern></defs>
    <style>.ax line{stroke:var(--muted);stroke-width:.8;stroke-dasharray:9 3 2 3}.al{fill:var(--muted);font:italic 11px var(--f-mono)}
      .dm line{stroke:var(--dim);stroke-width:.8}.dm .ar{fill:var(--dim)}
      .dm .dt{fill:var(--dim);font:500 11.5px var(--f-mono);paint-order:stroke;stroke:var(--surface-2);stroke-width:3.5px;stroke-linejoin:round}</style>
    <path d="${pathOf(o,s,tx,ty)}" fill-rule="evenodd" style="fill:url(#hatch);stroke:var(--ink)" stroke-width="1.3" stroke-linejoin="round"/>
    ${axes}
    <g class="dm">${out.join('')}<path class="ar" d="${arrows.join('')}"/></g>
  </svg>`;
}
