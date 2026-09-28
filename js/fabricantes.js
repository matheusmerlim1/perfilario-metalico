/* ---------- catálogos de fabricantes ----------
   Cada arquivo em js/dados/fab-*.js faz CATALOGOS.push({fonte, familias, materiais}).
   Aqui eles viram famílias da navegação, linhas da tabela e a lista de materiais. */
const FAB = window.CATALOGOS || [];

/* ícone do catálogo -> seção desenhável [forma, cotas obrigatórias] */
const FAB_SHAPE = {
  'perfil-I': ['I', ['d','bf','tw','tf']], 'perfil-U': ['U', ['d','bf','tw','tf']], 'perfil-L': ['L', ['b','t']],
  'tubo-q': ['RHS', ['B','H','t']], 'tubo-r': ['CHS', ['D','t']], 'barra': ['RB', ['D']]
};
const FAB_ICON_DIM = {I:{d:100,bf:72,tw:7,tf:10}, U:{d:100,bf:44,tw:8,tf:11}, L:{b:84,t:13}, RHS:{B:84,H:84,t:9}, CHS:{D:84,t:9}, RB:{D:70}};
const S_ = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const FAB_ICONS = {
  cabo: `<circle cx="14" cy="11" r="9.5" ${S_}/><circle cx="14" cy="11" r="2.6" fill="currentColor"/>` +
    [0,60,120,180,240,300].map(a => `<circle cx="${(14 + 5.6*Math.cos(a*Math.PI/180)).toFixed(1)}" cy="${(11 + 5.6*Math.sin(a*Math.PI/180)).toFixed(1)}" r="2.4" fill="currentColor"/>`).join(''),
  grade: `<rect x="2" y="3" width="24" height="16" ${S_}/><path d="M8 3v16M14 3v16M20 3v16M2 11h24" ${S_}/>`,
  chapa: `<path d="M3 15l7-10h15l-7 10z" ${S_}/><path d="M3 15v3h15l7-10V5" ${S_}/>`,
  eletrocalha: `<path d="M2 5v12h24V5" ${S_} stroke-width="2"/><path d="M7 13h2M13 13h2M19 13h2" ${S_}/>`,
  parafuso: `<path d="M2 11h24" ${S_}/><path d="M4 6l2 10M8 6l2 10M12 6l2 10M16 6l2 10M20 6l2 10" ${S_}/>`,
  chumbador: `<path d="M2 11h19" ${S_} stroke-width="2.4"/><rect x="21" y="6" width="5" height="10" fill="currentColor"/><path d="M4 8l2 6M8 8l2 6M12 8l2 6" ${S_}/>`,
  outro: `<rect x="5" y="3" width="18" height="16" rx="2" ${S_}/>`,
  /* fixadores, acessórios e içamento: desenhos simplificados de cada peça */
  manilha: `<path d="M8 17V9a6 6 0 0 1 12 0v8" ${S_} stroke-width="2"/><path d="M4 17h20" ${S_}/><circle cx="4.5" cy="17" r="2" fill="currentColor"/><circle cx="23.5" cy="17" r="1.6" fill="currentColor"/>`,
  gancho: `<circle cx="16" cy="3.6" r="2.5" ${S_}/><path d="M16 6.1v7.4a5.6 5.6 0 1 1-11.2 0v-2.2" ${S_} stroke-width="2.2"/><path d="M4.8 11.3l2.4-1.6" ${S_} stroke-width="2.2"/><path d="M16 9.2L6.2 11.6" ${S_} stroke-width="1.2"/>`,
  anel: `<ellipse cx="10" cy="11" rx="8" ry="6" ${S_} stroke-width="2"/><ellipse cx="21.5" cy="11" rx="5" ry="3.4" ${S_}/>`,
  olhal: `<circle cx="14" cy="6" r="4.4" ${S_} stroke-width="2"/><path d="M10.5 11.2h7" ${S_} stroke-width="2"/><path d="M14 11.5V21" ${S_}/><path d="M12 14l4 1M12 16.5l4 1M12 19l4 1" ${S_}/>`,
  destorcedor: `<circle cx="4.5" cy="11" r="3" ${S_}/><circle cx="23.5" cy="11" r="3" ${S_}/><rect x="10" y="6.5" width="8" height="9" rx="2" ${S_} stroke-width="2"/><path d="M7.5 11H10M18 11h2.5" ${S_}/>`,
  soquete: `<path d="M1.5 11H9" ${S_} stroke-width="2.2"/><path d="M9 8.5l8-3v11l-8-3z" ${S_} fill="currentColor" fill-opacity=".25"/><path d="M17 5.5h3.5a5.5 5.5 0 0 1 0 11H17" ${S_} stroke-width="2"/><circle cx="21" cy="11" r="1.4" fill="currentColor"/>`,
  esticador: `<circle cx="3.5" cy="11" r="2.4" ${S_}/><circle cx="24.5" cy="11" r="2.4" ${S_}/><path d="M6 11h3M19 11h3" ${S_}/><path d="M9 7h10v8H9z" ${S_} stroke-width="2"/><path d="M11 9.5h6M11 12.5h6" ${S_} stroke-width="1"/>`,
  grampo: `<path d="M8 3v9a6 6 0 0 0 12 0V3" ${S_} stroke-width="2"/><path d="M4.5 8.5h19" ${S_} stroke-width="2.4"/><path d="M6 3h4M18 3h4" ${S_}/>`,
  sapatilho: `<path d="M2.5 11C7 5 11 3.5 16.5 3.5a7.5 7.5 0 0 1 0 15C11 18.5 7 17 2.5 11z" ${S_} stroke-width="2"/><path d="M8 11c2.8-3 5.5-4 8.5-4a4 4 0 0 1 0 8c-3 0-5.7-1-8.5-4z" ${S_}/>`,
  mosquetao: `<rect x="3" y="4" width="22" height="14" rx="7" ${S_} stroke-width="2"/><path d="M9 8.5h10" ${S_}/><rect x="17" y="6.5" width="4" height="4" rx="1" fill="currentColor"/>`,
  linga: `<ellipse cx="14" cy="3.6" rx="3.6" ry="2.4" ${S_}/><path d="M12 5.7L5 16M16 5.7L23 16" ${S_} stroke-width="1.8"/><path d="M5 16v2a2.2 2.2 0 0 0 4.4 0M23 16v2a2.2 2.2 0 0 1-4.4 0" ${S_}/>`,
  patesca: `<rect x="6" y="6" width="16" height="15" rx="7.5" ${S_} stroke-width="2"/><circle cx="14" cy="13.5" r="3.6" ${S_}/><circle cx="14" cy="13.5" r="1" fill="currentColor"/><path d="M14 6V1.5" ${S_} stroke-width="2"/>`,
  pegachapa: `<circle cx="10" cy="3.5" r="2.2" ${S_}/><path d="M5 6h10l6 5v9H5z" ${S_} stroke-width="1.8"/><path d="M5 13h11" ${S_} stroke-width="2.4"/>`,
  garra: `<circle cx="6" cy="6" r="3.2" ${S_}/><path d="M8.3 8.3l6 6" ${S_} stroke-width="2"/><path d="M14.3 14.3c2 2.6 7.2 2.2 8.2-2.3l-3.5.8" ${S_} stroke-width="2"/>`,
  'parafuso-cab': `<path d="M2.5 5.5h5v11h-5z" ${S_} fill="currentColor" fill-opacity=".3" stroke-width="1.8"/><path d="M7.5 8.5h18v5h-18" ${S_}/><path d="M11 8.5l1.5 5M15 8.5l1.5 5M19 8.5l1.5 5M23 8.5l1.5 5" ${S_} stroke-width="1.2"/>`,
  porca: `<path d="M8.5 3h11l5.5 8-5.5 8h-11L3 11z" ${S_} stroke-width="2"/><circle cx="14" cy="11" r="4" ${S_}/><path d="M11.5 9.5l5 3" ${S_} stroke-width="1"/>`,
  bucha: `<path d="M2.5 7.5h19v7h-19z" ${S_} stroke-width="1.8"/><path d="M8 7.5v7M13.5 7.5v7" ${S_} stroke-width="1.2"/><path d="M21.5 7.5l4 3.5-4 3.5" ${S_} stroke-width="1.8"/>`,
  vergalhao: `<path d="M1.5 11h25" ${S_}/><path d="M3 7l2 8M7 7l2 8M11 7l2 8M19 7l2 8M23 7l2 8" ${S_} stroke-width="1.2"/><rect x="13.5" y="5.5" width="5" height="11" rx="1" fill="currentColor"/>`,
  corrente: `<rect x="1.5" y="7" width="11" height="8" rx="4" ${S_} stroke-width="2"/><rect x="15.5" y="7" width="11" height="8" rx="4" ${S_} stroke-width="2"/><rect x="10" y="9.2" width="8" height="3.6" rx="1.8" ${S_} stroke-width="2"/>`,
  abracadeira: `<circle cx="14" cy="12" r="4.5" ${S_}/><path d="M6 19v-7a8 8 0 0 1 16 0v7" ${S_} stroke-width="2"/><path d="M2 19h6M20 19h6" ${S_} stroke-width="2"/>`,
  perfilado: `<path d="M9 18H4V4h20v14h-5" ${S_} stroke-width="2"/><path d="M9 9h2M13 9h2M17 9h2" ${S_}/>`,
  suporte: `<path d="M4 2v18M4 4.5h21M4 17L21 4.5" ${S_} stroke-width="2"/>`,
  escada: `<path d="M8 1.5v19M20 1.5v19M8 6h12M8 11h12M8 16h12" ${S_} stroke-width="1.8"/>`,
  guardacorpo: `<path d="M2 5h24M2 12h24M4 5v15M14 5v15M24 5v15" ${S_} stroke-width="1.8"/>`,
  canaleta: `<path d="M3 7.5v9h22v-9" ${S_} stroke-width="2"/><path d="M2 6h24" ${S_} stroke-width="2.4"/>`,
  acessorio: `<path d="M3 11h17" ${S_} stroke-width="2.4"/><circle cx="22.5" cy="11" r="3" ${S_} stroke-width="2"/><path d="M3 11l-1.5-2.5M5.5 11L4 13.5" ${S_}/>`,
  tabela: `<path d="M3 3v16h22" ${S_}/><path d="M6 15l5-6 4 3 7-8" ${S_} stroke-width="2"/>`
};
/* ícone pelo tipo de produto (e, em alguns casos, pela família) */
const TIPO_ICON = {'Manilhas':'manilha', 'Ganchos':'gancho', 'Anéis e elos':'anel', 'Olhais':'olhal', 'Destorcedores':'destorcedor',
  'Soquetes e terminais':'soquete', 'Esticadores e tensionadores':'esticador', 'Grampos para cabo':'grampo', 'Sapatilhos':'sapatilho',
  'Lingas':'linga', 'Mosquetões':'mosquetao', 'Patescas':'patesca', 'Pega-chapas':'pegachapa', 'Garras encurtadoras':'garra',
  'Parafusos de amarração':'parafuso-cab', 'Outros acessórios':'acessorio', 'Correntes':'corrente',
  'Porcas cilíndricas':'porca', 'Porcas flangeadas':'porca', 'Porcas quadradas':'porca', 'Porcas sextavadas':'porca', 'Dados técnicos':'tabela',
  'Chumbadores químicos':'chumbador', 'Chumbadores e pinos':'chumbador', 'Parafusos, porcas e buchas':'parafuso-cab',
  'Vergalhões e suspensão':'vergalhao', 'Suportes e abraçadeiras':'suporte', 'Perfilados':'perfilado', 'Canaletas':'canaleta',
  'Degraus e escadas':'escada', 'Guarda-corpos':'guardacorpo', 'Fixação de grades':'grampo', 'Tabelas de carga':'tabela'};
const ID_ICON = [[/porcas/, 'porca'], [/buchas/, 'bucha'], [/abracadeiras/, 'abracadeira'], [/fitas|tampas-perfilado/, 'perfilado'],
  [/elo-ligacao|anel/, 'anel'], [/parafuso-olhal|porca-olhal/, 'olhal'], [/hit-hy-200-cura/, 'tabela'], [/semiestruturais|stratus-(bws|bos|sfs)/, 'perfilado'], [/leito-acessorios/, 'suporte']];
function iconFor(fj, tipo) {
  if (FAB_SHAPE[fj.icone]) return fj.icone;
  for (const [re, k] of ID_ICON) if (re.test(fj.id)) return k;
  if (TIPO_ICON[tipo]) return TIPO_ICON[tipo];
  return fj.icone || 'outro';
}
function famIcon(f, chip) {
  if (f.rho) return '<span class="rho">ρ</span>';
  if (f.icon) return icon(...f.icon);
  const sh = FAB_SHAPE[f.iconKey];
  if (sh) return icon(sh[0], FAB_ICON_DIM[sh[0]]);
  if (chip && !FAB_ICONS[f.iconKey]) return '';
  if (chip && f.iconKey === 'outro') return '';
  return `<svg viewBox="0 0 28 22" aria-hidden="true">${FAB_ICONS[f.iconKey] || FAB_ICONS.outro}</svg>`;
}

const decs = v => { const s = String(v), i = s.indexOf('.'); return typeof v !== 'number' || i < 0 ? 0 : Math.min(s.length - i - 1, 3); };
const MAT_FAB = [];
const genFams = [];
for (const cat of FAB) {
  for (const m of cat.materiais || []) MAT_FAB.push({...m, fonte: m.fonte || cat.fonte});
  for (const fj of cat.familias || []) {
    const itens = fj.itens || [];
    if (!itens.length) continue;
    const props = {};
    if (fj.massa) {
      const [sym, un, desc] = fj.massa;
      props.m = [sym || 'm', un || 'kg/m', Math.max(2, ...itens.map(it => decs(it.m))), desc || 'Massa', 'Massa'];
    }
    for (const [k, def] of Object.entries(fj.props || {})) {
      if (k === 'm') continue;
      const [sym, un, desc, grp] = def;
      props[k] = [sym || k, un || '', Math.max(0, ...itens.map(it => decs(it.p && it.p[k]))), desc || sym || k, grp || 'Propriedades'];
    }
    const f = {id: fj.id, group: fj.grupo || 'Outros', label: fj.label || fj.titulo, title: fj.titulo || fj.label, desc: fj.desc || '',
      tipo: fj.tipo || 'Outros', src: cat.fonte, maker: cat.fonte.split(' — ')[0], gen: true, props, main: props.m ? 'm' : Object.keys(props)[0], notas: fj.notas || [], paginas: fj.paginas || [],
      iconKey: iconFor(fj, fj.tipo), massUnit: props.m ? props.m[1] : null};
    const sh = FAB_SHAPE[fj.icone];
    rows[f.id] = itens.map((it, i) => {
      const p = {...(it.p || {})};
      if (it.m != null) p.m = it.m;
      const r = {id: `${f.id}-${i}`, name: it.nome, sub: it.sub || '', p, common: false};
      if (sh && sh[1].every(k => p[k] > 0)) { r.shape = sh[0]; r.dim = Object.fromEntries(sh[1].map(k => [k, p[k]])); }
      return r;
    });
    genFams.push(f);
  }
}
/* navegação em três níveis: categoria (aba) -> tipo de produto -> família.
   Os perfis de aço viram a categoria "Perfis de aço", com os grupos antigos como tipos. */
for (const f of FAM) { f.tipo = f.group; f.group = f.rho ? 'Materiais' : 'Perfis de aço'; }
const GROUP_ORDER = ['Perfis de aço', 'Chapas', 'Perfis de fibra de vidro', 'Grades e escadas', 'Eletrocalhas e perfilados',
  'Cabos e correntes', 'Içamento', 'Fixação', 'Fusos trapezoidais'];
const gi = g => { const i = GROUP_ORDER.indexOf(g); return i < 0 ? 99 : i; };
const tipoOrder = {};
genFams.forEach((f, i) => { f._i = i; const k = f.group + '|' + f.tipo; if (!(k in tipoOrder)) tipoOrder[k] = i; });
const TIPO_ORDER = ['Chapas de aço',
  'Perfis estruturais', 'Tubos, barras e placas', 'Perfis especiais', 'Tabelas de carga',
  'Grades de piso', 'Degraus e escadas', 'Guarda-corpos', 'Fixação de grades',
  'Eletrocalhas', 'Eletrocalhas aramadas', 'Leitos para cabos', 'Perfilados', 'Suportes e abraçadeiras', 'Eletrodutos e conexões', 'Canaletas',
  'Cabos de aço', 'Cabos de aço inox', 'Cordoalhas', 'Correntes',
  'Manilhas', 'Ganchos', 'Anéis e elos', 'Olhais', 'Destorcedores', 'Soquetes e terminais', 'Esticadores e tensionadores',
  'Grampos para cabo', 'Sapatilhos', 'Lingas', 'Mosquetões', 'Patescas', 'Pega-chapas', 'Garras encurtadoras', 'Parafusos de amarração',
  'Chumbadores químicos', 'Chumbadores e pinos', 'Parafusos, porcas e buchas', 'Vergalhões e suspensão',
  'Fusos', 'Porcas cilíndricas', 'Porcas flangeadas', 'Porcas quadradas', 'Porcas sextavadas', 'Dados técnicos'];
const ti = f => { const i = TIPO_ORDER.indexOf(f.tipo); return i < 0 ? 1000 + tipoOrder[f.group + '|' + f.tipo] : i; };
genFams.sort((a, b) => gi(a.group) - gi(b.group) || ti(a) - ti(b) || a._i - b._i);
FAM.splice(FAM.findIndex(f => f.rho), 0, ...genFams);
for (const f of genFams) famById[f.id] = f;
