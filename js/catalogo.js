/* ---------- constantes ---------- */
const RHO = 7850;

/* ---------- linhas de dados ---------- */
const CM = {
  w:['W 150 x 13,0','W 150 x 18,0','W 150 x 22,5','W 200 x 15,0','W 200 x 19,3','W 200 x 22,5','W 200 x 26,6','W 200 x 31,3','W 200 x 35,9',
     'W 250 x 17,9','W 250 x 22,3','W 250 x 25,3','W 250 x 28,4','W 250 x 32,7','W 250 x 38,5','W 250 x 73,0',
     'W 310 x 21,0','W 310 x 23,8','W 310 x 28,3','W 310 x 32,7','W 310 x 38,7','W 360 x 32,9','W 360 x 39,0','W 360 x 44,6','W 360 x 51,0',
     'W 410 x 38,8','W 410 x 46,1','W 410 x 53,0','W 460 x 52,0','W 460 x 60,0','W 530 x 66,0','W 530 x 72,0','W 610 x 101,0','HP 250 x 62,0','HP 310 x 79,0'],
  i:['101.6|1','152.4|1'], u:['101.6|1','152.4|1','203.2|1'], t:['1x1/8"','1.1/2x3/16"'],
  l:['25.4|3.18','31.75|3.18','38.1|3.18','38.1|4.76','50.8|4.76','50.8|6.35','63.5|6.35','76.2|6.35','101.6|9.52'],
  rhs:['20×20×1.2','30×30×1.5','40×40×1.5','50×50×2','60×60×2','80×80×2','100×100×3','20×40×1.5','30×50×1.5','40×60×1.5','40×100×2','50×100×2'],
  chs:['33.4×2.25','42.2×2.25','48.3×2.65','60.3×3','88.9×3','114.3×3.75'],
  ue:['100×50×17×2','127×50×17×2','150×60×20×2','150×60×20×2.65','200×75×25×2.65','200×75×25×3','250×85×25×3'],
  us:['100×40×2','100×50×2.65','127×50×2.65','150×50×3'],
  fb:['25.4×3.18','25.4×4.76','31.75×3.18','38.1×4.76','50.8×4.76','50.8×6.35','76.2×6.35'],
  rb:['9.52','12.7','15.88','19.05','25.4']
};
for (const k in CM) CM[k] = new Set(CM[k]);

const rows = {};
rows.w = DATA.W.map((r, i) => ({id:'w'+i, name:r.n.replace(' x ',' × '), sub:r.imp.replace(' x ',' × '), shape:'I',
  dim:{d:r.d,bf:r.bf,tw:r.tw,tf:r.tf}, H:r.H, enc:r.enc, common:CM.w.has(r.n),
  p:{m:r.m,d:r.d,bf:r.bf,tw:r.tw,tf:r.tf,h:r.h,dl:r.dl,A:r.A,Ix:r.Ix,Wx:r.Wx,rx:r.rx,Zx:r.Zx,Iy:r.Iy,Wy:r.Wy,ry:r.ry,Zy:r.Zy,rt:r.rt,It:r.It,Cw:r.Cw,lf:r.lf,lw:r.lw,u:r.u,eff:r.Wx/r.m}}));
function american(list, pre, shape) {
  const n = {};
  return list.map((r, i) => {
    n[r.d] = (n[r.d] || 0) + 1;
    const {b, ...p} = r;
    if (shape === 'I') delete p.x;
    return {id:pre+i, name:`${pre} ${inch(r.d)} · ${n[r.d]}ª alma`, sub:`${nf(r.m,2)} kg/m`, shape,
      dim:{d:r.d,bf:r.bf,tw:r.tw,tf:r.tf}, common:CM[pre.toLowerCase()].has(r.d+'|'+n[r.d]), p:{...p, eff:r.Wx/r.m}};
  });
}
rows.i = american(DATA.I, 'I', 'I');
rows.u = american(DATA.U, 'U', 'U');
rows.t = DATA.T.map((r, i) => {
  const [a, b] = r.b.replace(/"/g,'').split('x');
  const {b:_, ...p} = r;
  return {id:'t'+i, name:`T ${a}" × ${b}"`, sub:`${nf(r.d,2)} × ${nf(r.t,2)} mm`, shape:'T', dim:{b:r.d,t:r.t}, common:CM.t.has(r.b), p};
});
rows.l = [
  ...DATA.Lin.map((r, i) => ({id:'lp'+i, name:`L ${inch(r.b)} × ${inch(r.t)}`, sub:`${nf(r.b,2)} × ${nf(r.t,2)} mm`, shape:'L', series:'pol',
    dim:{b:r.b,t:r.t}, common:CM.l.has(r2(r.b)+'|'+r2(r.t)), p:{m:r.m,b:r.b,t:r.t,A:r.A,I:r.I,W:r.W,r:r.r,rz:r.rz,x:r.x}})),
  ...DATA.Lmm.map((r, i) => ({id:'lm'+i, name:`L ${nf(r.b,0)} × ${nf(r.t,0)} mm`, sub:'série milimétrica', shape:'L', series:'mm',
    dim:{b:r.b,t:r.t}, common:false, p:{m:r.m,b:r.b,t:r.t,A:r.A,I:r.I,W:r.W,r:r.r,rz:r.rz,x:r.x}}))
];

const NOM = {21.3:'1/2"',26.9:'3/4"',33.4:'1"',42.2:'1.1/4"',48.3:'1.1/2"',60.3:'2"',73:'2.1/2"',88.9:'3"',101.6:'3.1/2"',114.3:'4"',141.3:'5"',168.3:'6"',219.1:'8"'};
const NAMES = {
  rhs: g => ({name:`${smart(Math.max(g.B,g.H))} × ${smart(Math.min(g.B,g.H))} × ${nf(g.t,2)}`, sub: g.B === g.H ? 'tubo quadrado' : 'tubo retangular'}),
  chs: g => ({name:`Ø ${smart(g.D)} × ${nf(g.t,2)}`, sub: NOM[g.D] ? `nominal ${NOM[g.D]}` : 'tubo redondo'}),
  ue:  g => ({name:`Ue ${smart(g.H)} × ${smart(g.B)} × ${smart(g.c)} × ${nf(g.t,2)}`, sub:'U enrijecido dobrado'}),
  us:  g => ({name:`U ${smart(g.H)} × ${smart(g.B)} × ${nf(g.t,2)}`, sub:'U simples dobrado'}),
  fb:  g => ({name:`${inch(g.b)} × ${inch(g.t)}`, sub:`${nf(g.b,2)} × ${nf(g.t,2)} mm`}),
  rb:  g => ({name:`Ø ${inch(g.D)}`, sub:`${nf(g.D,2)} mm`}),
  w:   g => ({name:`I ${smart(g.d)} × ${smart(g.bf)} × ${smart(g.tw)} × ${smart(g.tf)}`, sub:'seção I'})
};
const SHAPE = {w:'I', rhs:'RHS', chs:'CHS', ue:'Ue', us:'Us', fb:'FB', rb:'RB'};
function gen(fam, list) {
  return list.map((g, i) => ({id:fam+i, ...NAMES[fam](g), shape:SHAPE[fam], dim:g, calc:true,
    common:CM[fam].has(Object.values(g).join('×')), p:compute(SHAPE[fam], g)}));
}
const rhsList = [];
[[20,[1.2,1.5,2]],[25,[1.2,1.5,2,2.25]],[30,[1.5,2,2.25,2.65]],[40,[1.5,2,2.25,2.65,3]],[50,[1.5,2,2.25,2.65,3,3.75]],
 [60,[2,2.25,2.65,3,3.75,4.75]],[70,[2,2.65,3,3.75,4.75]],[80,[2,2.65,3,3.75,4.75,6.3]],[90,[2.65,3,3.75,4.75,6.3]],
 [100,[2.65,3,3.75,4.75,6.3]],[120,[3,3.75,4.75,6.3]],[150,[3.75,4.75,6.3,8]],[200,[4.75,6.3,8,10]]]
  .forEach(([s, ts]) => ts.forEach(t => rhsList.push({B:s,H:s,t})));
[[40,20],[50,30],[60,40],[80,40],[100,40],[100,50],[100,60],[120,60],[120,80],[150,50],[150,100],[200,100],[250,150],[300,200]]
  .forEach(([H, B]) => (H <= 60 ? [1.2,1.5,2,2.25,2.65] : H <= 120 ? [2,2.25,2.65,3,3.75,4.75] : [3,3.75,4.75,6.3,8])
  .forEach(t => rhsList.push({B,H,t})));
rows.rhs = gen('rhs', rhsList);
const chsList = [];
[[21.3,[2,2.65]],[26.9,[2,2.25,2.65]],[33.4,[2,2.25,2.65,3.35]],[42.2,[2,2.25,2.65,3,3.55]],[48.3,[2,2.25,2.65,3,3.68]],
 [60.3,[2.25,2.65,3,3.75,3.91]],[73,[2.65,3,3.75,5.16]],[88.9,[3,3.75,4.75,5.49]],[101.6,[3,3.75,4.75,5.74]],
 [114.3,[3,3.75,4.75,6.02]],[141.3,[3.75,4.75,6.55]],[168.3,[4.75,6.35,7.11]],[219.1,[6.35,8.18]]]
  .forEach(([D, ts]) => ts.forEach(t => chsList.push({D,t})));
rows.chs = gen('chs', chsList);
const ueList = [];
[[75,40,15,[2,2.25,2.65,3]],[100,40,17,[1.5,2,2.25,2.65,3]],[100,50,17,[2,2.25,2.65,3]],[127,50,17,[2,2.25,2.65,3]],
 [150,60,20,[2,2.25,2.65,3,3.75]],[200,75,25,[2,2.25,2.65,3,3.75,4.75]],[250,85,25,[2.65,3,3.75,4.75]],[300,85,25,[3,3.75,4.75]]]
  .forEach(([H,B,c,ts]) => ts.forEach(t => ueList.push({H,B,c,t})));
rows.ue = gen('ue', ueList);
const usList = [];
[[50,25,[1.5,2,2.65,3]],[75,40,[2,2.65,3]],[100,40,[2,2.65,3,3.75]],[100,50,[2,2.65,3,3.75]],[127,50,[2,2.65,3,3.75]],
 [150,50,[2,2.65,3,3.75,4.75]],[200,50,[2.65,3,3.75,4.75]],[200,75,[2.65,3,3.75,4.75,6.3]]]
  .forEach(([H,B,ts]) => ts.forEach(t => usList.push({H,B,t})));
rows.us = gen('us', usList);
const fbList = [];
[12.7,15.88,19.05,25.4,31.75,38.1,44.45,50.8,63.5,76.2,101.6,127,152.4].forEach(b =>
  [3.18,4.76,6.35,7.94,9.52,12.7,15.88,19.05,25.4].filter(t => t <= b/2 + 0.01 && (b <= 50.8 ? t <= 12.7 : t >= 4.76)).forEach(t => fbList.push({b,t})));
rows.fb = gen('fb', fbList);
rows.rb = gen('rb', [6.35,7.94,9.52,12.7,15.88,19.05,22.22,25.4,31.75,38.1,44.45,50.8,63.5,76.2,101.6].map(D => ({D})));

/* ---------- famílias ---------- */
const FAM = [
  {id:'w', group:'Laminados', label:'W e HP', title:'Perfis W e HP', icon:['I',{d:100,bf:72,tw:7,tf:10}],
    desc:'Abas paralelas, laminados a quente. Os W são vigas e pilares de edifícios, galpões e mezaninos. Os HP, de abas largas e alma espessa, servem como estacas e pilares pesados.',
    cols:['m','d','bf','tw','tf','A','Ix','Wx','Zx','Iy','Wy','ry','eff'], dig:{m:1,d:0,bf:0,h:0,dl:0,A:1,Ix:0,Iy:0}, len:12,
    src:'Tabela Gerdau', toggles:[['H','Só perfis H (pilar)', r => r.H],['enc','Ocultar sob encomenda', r => !r.enc]], def:'W 250 × 25,3',
    dims:[['d','d (mm)'],['bf','bf (mm)'],['tw','tw (mm)'],['tf','tf (mm)']]},
  {id:'i', group:'Laminados', label:'I', title:'Perfis I (padrão americano)', icon:['I',{d:100,bf:52,tw:7,tf:10}],
    desc:'Abas inclinadas, em polegadas. Usados em vigas leves, trilhos de talha e monovia, e peças secundárias.',
    cols:['m','d','bf','tw','tf','A','Ix','Wx','rx','Iy','Wy','ry','eff'], dig:{tw:2,tf:2,d:2,bf:2}, len:6, src:'Tabela Gerdau'},
  {id:'u', group:'Laminados', label:'U', title:'Perfis U (padrão americano)', icon:['U',{d:100,bf:44,tw:8,tf:11}],
    desc:'Canal laminado em polegadas. Aparece em terças, longarinas, vigas de borda, contraventamentos e perfis compostos.',
    cols:['m','d','bf','tw','tf','A','Ix','Wx','rx','Iy','Wy','ry','x'], dig:{tw:2,tf:2,d:2,bf:2}, len:6, src:'Tabela Gerdau'},
  {id:'t', group:'Laminados', label:'T', title:'Perfis T', icon:['T',{b:84,t:13}],
    desc:'Abas iguais (d = bf) e espessura única. Serralheria, esquadrias, suportes e reforços leves.',
    cols:['m','d','t','A','Ix','Wx','rx','Iy','Wy','ry','x'], dig:{d:2}, len:6, src:'Tabela Gerdau'},
  {id:'l', group:'Laminados', label:'Cantoneira', title:'Cantoneiras de abas iguais', icon:['L',{b:84,t:13}],
    desc:'O perfil mais versátil da construção metálica: banzos e diagonais de treliças, contraventamentos, suportes e ligações.',
    cols:['m','b','t','A','I','W','r','rz','x'], dig:{b:2}, len:6, src:'Tabela Gerdau',
    toggles:[['pol','Só polegadas', r => r.series === 'pol'],['mm','Só milimétrica', r => r.series === 'mm']], def:'L 2" × 3/16"'},
  {id:'rhs', group:'Tubos', label:'Quadrado e retangular', title:'Tubos quadrados e retangulares', icon:['RHS',{B:84,H:84,t:9}],
    desc:'Seção fechada, boa rigidez à torção e à flambagem nas duas direções. Pilares, treliças, coberturas, guarda-corpos e estruturas aparentes.',
    cols:['m','B','H','t','A','Ix','Wx','rx','Iy','Wy','ry','eff','u'], dig:{m:2,B:0,H:0,Ix:2,Wx:2,Iy:2,Wy:2}, len:6, src:'cálculo geométrico', def:'50 × 50 × 2,00',
    dims:[['B','B (mm)'],['H','H (mm)'],['t','t (mm)']]},
  {id:'chs', group:'Tubos', label:'Redondo', title:'Tubos redondos', icon:['CHS',{D:84,t:9}],
    desc:'Mesma resistência em qualquer direção e menor área de pintura por kg. Estruturas tubulares, treliças espaciais, pilares e corrimãos.',
    cols:['m','D','t','A','Ix','Wx','rx','eff','u'], dig:{Ix:2,Wx:2}, len:6, src:'cálculo geométrico', def:'Ø 48,3 × 2,65',
    dims:[['D','D (mm)'],['t','t (mm)']]},
  {id:'ue', group:'Formados a frio', label:'U enrijecido', title:'Perfis U enrijecido (Ue)', icon:['Ue',{H:100,B:50,c:20,t:6}],
    desc:'Chapa dobrada com enrijecedores de borda (NBR 6355). É o padrão para terças e travessas de fechamento em galpões.',
    cols:['m','H','B','c','t','A','Ix','Wx','rx','Iy','Wy','ry','x','eff'], dig:{Ix:2,Wx:2,Iy:2,Wy:2}, len:6, src:'cálculo geométrico', def:'Ue 150 × 60 × 20 × 2,00',
    dims:[['H','H (mm)'],['B','B (mm)'],['c','c (mm)'],['t','t (mm)']]},
  {id:'us', group:'Formados a frio', label:'U simples', title:'Perfis U simples dobrados', icon:['Us',{H:100,B:50,t:7}],
    desc:'Chapa dobrada sem enrijecedor. Guias de drywall e steel frame, requadros, montantes leves e serralheria.',
    cols:['m','H','B','t','A','Ix','Wx','rx','Iy','Wy','ry','x','eff'], dig:{Ix:2,Wx:2,Iy:2,Wy:2}, len:6, src:'cálculo geométrico', def:'U 100 × 50 × 2,65',
    dims:[['H','H (mm)'],['B','B (mm)'],['t','t (mm)']]},
  {id:'fb', group:'Barras', label:'Chata', title:'Barras chatas', icon:['FB',{b:90,t:20}],
    desc:'Chapas de ligação, enrijecedores, grades, gradis, bases e peças de serralheria.',
    cols:['m','b','t','A','Ix','Wx','Iy','Wy'], dig:{b:2,Ix:3,Wx:3,Iy:2,Wy:2}, len:6, src:'cálculo geométrico', def:'2" × 1/4"',
    dims:[['b','b (mm)'],['t','t (mm)']]},
  {id:'rb', group:'Barras', label:'Redonda', title:'Barras redondas', icon:['RB',{D:70}],
    desc:'Tirantes, correntes de terça, contraventamentos em X, chumbadores e pinos.',
    cols:['m','D','A','Ix','Wx','rx'], dig:{D:2,Ix:3,Wx:3}, len:6, src:'cálculo geométrico', def:'Ø 1/2"',
    dims:[['D','D (mm)']]},
  {id:'mat', group:'Referência', label:'Materiais', title:'Materiais', rho:true}
];
const famById = Object.fromEntries(FAM.map(f => [f.id, f]));
const MATS = [['Aço carbono',7850],['Aço inox 304',7930],['Aço inox 316',7980],['Alumínio 6063',2700],['Latão',8500],['Cobre',8960]];
