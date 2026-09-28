/* ---------- propriedades ---------- */
const P = {
  m:['m','kg/m',2,'Massa linear'], d:['d','mm',1,'Altura total'], bf:['bf','mm',1,'Largura da mesa'],
  tw:['tw','mm',1,'Espessura da alma'], tf:['tf','mm',1,'Espessura da mesa'], h:['h','mm',0,'Altura interna'],
  dl:["d'",'mm',0,'Altura plana da alma'], b:['b','mm',1,'Largura da aba'], t:['t','mm',2,'Espessura'],
  B:['B','mm',0,'Largura'], H:['H','mm',0,'Altura'], c:['c','mm',0,'Enrijecedor de borda'], D:['D','mm',1,'Diâmetro externo'],
  A:['A','cm²',2,'Área da seção'], Ix:['Ix','cm⁴',1,'Momento de inércia'], Wx:['Wx','cm³',1,'Módulo elástico'],
  rx:['rx','cm',2,'Raio de giração'], Zx:['Zx','cm³',1,'Módulo plástico'], Iy:['Iy','cm⁴',1,'Momento de inércia'],
  Wy:['Wy','cm³',1,'Módulo elástico'], ry:['ry','cm',2,'Raio de giração'], Zy:['Zy','cm³',1,'Módulo plástico'],
  I:['Ix = Iy','cm⁴',2,'Momento de inércia'], W:['Wx = Wy','cm³',2,'Módulo elástico'], r:['rx = ry','cm',2,'Raio de giração'],
  rz:['rz','cm',2,'Raio de giração mínimo'], x:['x','cm',2,'Centroide (face externa)'], rt:['rt','cm',2,'Raio de giração da mesa'],
  It:['It','cm⁴',2,'Constante de torção'], Cw:['Cw','cm⁶',0,'Constante de empenamento'], lf:['bf/2tf','',2,'Esbeltez da mesa'],
  lw:["d'/tw",'',2,'Esbeltez da alma'], u:['u','m²/m',2,'Área de pintura'], eff:['Wx/m','cm³ por kg/m',2,'Eficiência à flexão']
};
const GROUPS = [
  ['Dimensões', ['d','bf','tw','tf','h','dl','H','B','c','b','t','D']],
  ['Seção', ['m','A','u','x']],
  ['Eixo x', ['Ix','Wx','Zx','rx','I','W','r']],
  ['Eixo y', ['Iy','Wy','Zy','ry','rz']],
  ['Estabilidade e torção', ['rt','It','Cw','lf','lw','eff']]
];

/* ---------- geometria ---------- */
function rrect(B, H, r, n = 14) {
  if (r <= 0) return [[-B/2,-H/2],[B/2,-H/2],[B/2,H/2],[-B/2,H/2]];
  const pts = [], cs = [[B/2-r,-H/2+r,-90],[B/2-r,H/2-r,0],[-B/2+r,H/2-r,90],[-B/2+r,-H/2+r,180]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) {
    const a = (a0 + 90 * i / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
function outline(shape, g) {
  switch (shape) {
    case 'I': { const {d,bf,tw,tf} = g; return {rings:[[[-bf/2,0],[bf/2,0],[bf/2,tf],[tw/2,tf],[tw/2,d-tf],[bf/2,d-tf],[bf/2,d],[-bf/2,d],[-bf/2,d-tf],[-tw/2,d-tf],[-tw/2,tf],[-bf/2,tf]]]}; }
    case 'U': { const {d,bf,tw,tf} = g; return {rings:[[[0,0],[bf,0],[bf,tf],[tw,tf],[tw,d-tf],[bf,d-tf],[bf,d],[0,d]]]}; }
    case 'Us': { const {H,B,t} = g; return outline('U', {d:H,bf:B,tw:t,tf:t}); }
    case 'Ue': { const {H,B,c,t} = g; return {rings:[[[0,0],[B,0],[B,c],[B-t,c],[B-t,t],[t,t],[t,H-t],[B-t,H-t],[B-t,H-c],[B,H-c],[B,H],[0,H]]]}; }
    case 'T': { const {b,t} = g; return {rings:[[[-b/2,0],[b/2,0],[b/2,t],[t/2,t],[t/2,b],[-t/2,b],[-t/2,t],[-b/2,t]]]}; }
    case 'L': { const {b,t} = g; return {rings:[[[0,0],[t,0],[t,b-t],[b,b-t],[b,b],[0,b]]]}; }
    case 'RHS': { const {B,H,t} = g; const ro = Math.min(2*t, Math.min(B,H)/2), ri = Math.max(ro - t, 0);
      return {rings:[rrect(B,H,ro), rrect(B-2*t,H-2*t,ri)]}; }
    case 'FB': { const {b,t} = g; return {rings:[[[0,0],[b,0],[b,t],[0,t]]]}; }
    case 'CHS': return {circles:[g.D/2, g.D/2 - g.t]};
    case 'RB': return {circles:[g.D/2]};
  }
}
function ringSums(pts) {
  let a = 0, sx = 0, sy = 0, ixx = 0, iyy = 0, per = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1,y1] = pts[i], [x2,y2] = pts[(i+1) % pts.length], c = x1*y2 - x2*y1;
    a += c; sx += (x1+x2)*c; sy += (y1+y2)*c; ixx += (y1*y1+y1*y2+y2*y2)*c; iyy += (x1*x1+x1*x2+x2*x2)*c;
    per += Math.hypot(x2-x1, y2-y1);
  }
  const s = a < 0 ? -1 : 1;
  return {A:s*a/2, Sx:s*sx/6, Sy:s*sy/6, Ixx:s*ixx/12, Iyy:s*iyy/12, per};
}
function polyProps(rings) {
  const t = ringSums(rings[0]); let per = t.per;
  for (const h of rings.slice(1)) { const r = ringSums(h); for (const k of ['A','Sx','Sy','Ixx','Iyy']) t[k] -= r[k]; per += r.per; }
  const xs = rings[0].map(p => p[0]), ys = rings[0].map(p => p[1]);
  const xc = t.Sx / t.A, yc = t.Sy / t.A;
  const Ix = t.Ixx - t.A*yc*yc, Iy = t.Iyy - t.A*xc*xc;
  const cy = Math.max(yc - Math.min(...ys), Math.max(...ys) - yc), cx = Math.max(xc - Math.min(...xs), Math.max(...xs) - xc);
  return {Amm:t.A, xc, yc, xmin:Math.min(...xs), per, A:t.A/100, Ix:Ix/1e4, Iy:Iy/1e4, Wx:Ix/cy/1e3, Wy:Iy/cx/1e3,
    rx:Math.sqrt(Ix/t.A)/10, ry:Math.sqrt(Iy/t.A)/10};
}
function compute(shape, g) {
  let p;
  if (shape === 'CHS' || shape === 'RB') {
    const D = g.D, d = shape === 'RB' ? 0 : D - 2*g.t;
    const A = Math.PI/4*(D*D - d*d), I = Math.PI/64*(D**4 - d**4);
    p = {Amm:A, A:A/100, Ix:I/1e4, Wx:I/(D/2)/1e3, rx:Math.sqrt(I/A)/10, u:Math.PI*D/1000};
  } else if (shape === 'FB') {
    const {b,t} = g, A = b*t;
    p = {Amm:A, A:A/100, Ix:b*t**3/12/1e4, Wx:b*t*t/6/1e3, rx:t/Math.sqrt(12)/10, Iy:t*b**3/12/1e4, Wy:t*b*b/6/1e3, ry:b/Math.sqrt(12)/10, u:2*(b+t)/1000};
  } else {
    const q = polyProps(outline(shape, g).rings);
    p = {Amm:q.Amm, A:q.A, Ix:q.Ix, Wx:q.Wx, rx:q.rx, Iy:q.Iy, Wy:q.Wy, ry:q.ry};
    if (shape === 'RHS') { const ro = Math.min(2*g.t, Math.min(g.B,g.H)/2); p.u = (2*(g.B+g.H) - 8*ro + 2*Math.PI*ro)/1000; }
    else p.u = q.per/1000;
    if (shape === 'Ue' || shape === 'Us') p.x = (q.xc - q.xmin)/10;
    if (shape === 'I') {                /* seção I sem raios de concordância */
      const {d, bf, tw, tf} = g, h = d - 2*tf;
      Object.assign(p, {h, Zx:(bf*tf*(d-tf) + tw*h*h/4)/1e3, Zy:(tf*bf*bf/2 + h*tw*tw/4)/1e3,
        It:(2*bf*tf**3 + (d-tf)*tw**3)/3/1e4, Cw:p.Iy*1e4*(d-tf)**2/4/1e6, lf:bf/(2*tf)});
    }
  }
  p.m = p.Amm * RHO / 1e6;
  if (p.Wx && shape !== 'FB' && shape !== 'RB') p.eff = p.Wx / p.m;
  delete p.Amm;
  return {...g, ...p};
}
