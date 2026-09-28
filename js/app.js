/* ---------- estado ---------- */
const store = {get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const S = {fam:'w', sel:{}, q:'', tg:new Set(), common:false, req:{k:'',v:''}, sort:null, L:{}, qty:1, mat:0, custom:null,
  cHide:{}, cOff:COTA_OFF, cGap:COTA_GAP};
try {
  const c = JSON.parse(store.get('perfilario-cotas') || '{}');
  for (const k in c.hide || {}) S.cHide[k] = new Set(c.hide[k]);
  if (c.off >= 4 && c.off <= 60) S.cOff = c.off;
  if (c.gap >= 14 && c.gap <= 50) S.cGap = c.gap;
} catch (e) {}
const saveCotas = () => {
  const hide = {}; for (const k in S.cHide) hide[k] = [...S.cHide[k]];
  store.set('perfilario-cotas', JSON.stringify({hide, off:S.cOff, gap:S.cGap}));
};
const $ = id => document.getElementById(id);
const fam = () => famById[S.fam];
const val = (r, k) => r.p[k];
/* definição de uma propriedade: a família do catálogo tem as suas; as de aço vêm de P */
const PR = (f, k) => (f.props && f.props[k]) || P[k] || [k, '', 2, k];
const dg = (f, k) => (f.dig && f.dig[k] != null) ? f.dig[k] : PR(f, k)[2];
const fv = (v, d) => typeof v === 'string' ? esc(v) : nf(v, d);
const cmpv = (a, b) => typeof a === 'number' && typeof b === 'number' ? a - b
  : a == null ? (b == null ? 0 : -1) : b == null ? 1 : String(a).localeCompare(String(b), 'pt-BR', {numeric:true});
const noun = (f, n) => f.gen ? (n === 1 ? 'item' : 'itens') : (n === 1 ? 'bitola' : 'bitolas');
/* chaves que existem na família (filtro e ordenação) */
function famKeys(f) {
  if (f.gen) return Object.keys(f.props);
  const all = [...new Set([...f.cols, ...GROUPS.flatMap(g => g[1])])];
  return all.filter(k => rows[f.id].some(r => r.p[k] != null));
}
const numKeys = f => famKeys(f).filter(k => rows[f.id].some(r => typeof r.p[k] === 'number'));
const mainKey = f => f.gen ? f.main : 'm';
/* tabela enxuta: nome e massa. A coluna do requisito ou da ordenação aparece só quando escolhida */
function tcols(f) {
  const c = [mainKey(f)], hk = S.req.k || (S.sort && S.sort.k);
  if (hk && !c.includes(hk)) c.push(hk);
  return c;
}
const hasMass = f => !f.gen || !!f.props.m;

function visible() {
  const f = fam(); let list = rows[f.id];
  const norm = s => s.toLowerCase().replace(/\s+/g,'').replace(/x/g,'×').replace(/\./g,',');
  const q = norm(S.q);
  if (q) list = list.filter(r => norm(r.name + '|' + r.sub).includes(q));
  if (S.common) list = list.filter(r => r.common);
  for (const [id,,fn] of (f.toggles || [])) if (S.tg.has(id)) list = list.filter(fn);
  const rv = parseFloat(String(S.req.v).replace(',','.'));
  if (S.req.k && isFinite(rv)) list = list.filter(r => typeof val(r, S.req.k) === 'number' && val(r, S.req.k) >= rv);
  if (S.sort) { const {k, dir} = S.sort; list = [...list].sort((a,b) => cmpv(val(a,k), val(b,k)) * dir); }
  return list;
}

/* ---------- render ---------- */
const GROUP_LAST = {}, TIPO_LAST = {};
/* navegação: categoria (abas) -> tipo de produto (pílulas) -> família (botões, separados por fabricante) */
function renderNav() {
  const f0 = fam(), cats = [...new Set(FAM.map(f => f.group))];
  const inCat = FAM.filter(f => f.group === f0.group), tipos = [...new Set(inCat.map(f => f.tipo))];
  const inTipo = inCat.filter(f => f.tipo === f0.tipo), makers = [...new Set(inTipo.map(f => f.maker || ''))];
  const btn = f => `<button class="fbtn" data-f="${f.id}" aria-pressed="${f.id===S.fam}">${famIcon(f, true)}${esc(f.label)}</button>`;
  const cnt = g => FAM.filter(f => f.group === g).reduce((n, f) => n + (rows[f.id] ? rows[f.id].length : 0), 0);
  $('nav').innerHTML = `<div class="gtabs" role="tablist" aria-label="Categorias">${cats.map(g =>
      `<button class="gbtn" role="tab" data-g="${esc(g)}" aria-pressed="${g===f0.group}" aria-selected="${g===f0.group}" title="${cnt(g)} itens">${esc(g)}</button>`).join('')}</div>
    ${tipos.length > 1 ? `<div class="ttabs" aria-label="Tipos de produto">${tipos.map(t => {
      const n = inCat.filter(f => f.tipo === t).length;
      return `<button class="tbtn" data-t="${esc(t)}" aria-pressed="${t===f0.tipo}">${famIcon(inCat.find(f => f.tipo === t), true)}${esc(t)}${n > 1 ? `<small>${n}</small>` : ''}</button>`;
    }).join('')}</div>` : ''}
    ${inTipo.length > 1 ? (() => {
      /* muitas famílias: lista compacta em colunas, só texto */
      const dense = inTipo.length > 10, b = dense ? f => `<button class="fbtn" data-f="${f.id}" aria-pressed="${f.id===S.fam}">${esc(f.label)}</button>` : btn;
      const body = makers.length < 2 && !dense ? inTipo.map(b).join('') : makers.map(m =>
        `<div class="fmk">${makers.length > 1 || dense ? `<span>${esc(m)}</span>` : ''}<div class="fl">${inTipo.filter(f => (f.maker || '') === m).map(b).join('')}</div></div>`).join('');
      if (!dense) return `<div class="ftabs">${body}</div>`;
      /* lista longa: recolhida, mostra só a família atual; abre com "Ver todas" */
      const sum = `<div class="fsum"><span class="lbl">Família</span><b>${esc(f0.label)}</b>${f0.maker ? `<small>${esc(f0.maker)}</small>` : ''}
        ${S.navOpen ? '<input id="fq" type="search" placeholder="filtrar famílias" autocomplete="off" aria-label="Filtrar famílias">' : ''}
        <button class="tg fexp" type="button" id="fexp" aria-expanded="${!!S.navOpen}">${S.navOpen ? 'Ocultar lista ▴' : `Ver todas as ${inTipo.length} famílias ▾`}</button></div>`;
      return `<div class="ftabs dense${S.navOpen ? ' open' : ''}">${sum}${S.navOpen ? `<div class="flist">${body}</div>` : ''}</div>`;
    })() : ''}`;
  /* no celular as linhas rolam na horizontal: traz a selecionada para a vista */
  for (const sel of ['.gbtn[aria-pressed="true"]', '.tbtn[aria-pressed="true"]', '.fbtn[aria-pressed="true"]']) {
    const b = $('nav').querySelector(sel); if (!b) continue;
    const c = b.closest('.gtabs,.ttabs,.ftabs');
    const dx = b.getBoundingClientRect().left - c.getBoundingClientRect().left;
    if (dx < 0 || dx + b.offsetWidth > c.clientWidth) c.scrollLeft += dx - 8;
  }
}
function renderFamily() {
  const f = fam();
  GROUP_LAST[f.group] = f.id; TIPO_LAST[f.group + '|' + f.tipo] = f.id;
  renderNav();
  $('catalog').hidden = !!f.rho; $('materials').hidden = !f.rho;
  if (f.rho) { renderMaterials(); return; }
  $('ftitle').textContent = f.title; $('fdesc').textContent = f.desc;
  /* descrição longa: 3 linhas e "Ler mais" */
  $('fdesc').classList.add('clamp'); $('fmore').setAttribute('aria-expanded', 'false'); $('fmore').textContent = 'Ler mais';
  $('fmore').hidden = $('fdesc').scrollHeight <= $('fdesc').clientHeight + 2;
  if ($('fmore').hidden) $('fdesc').classList.remove('clamp');
  $('fcrumb').textContent = [f.group, f.tipo, f.maker].filter(Boolean).join('  ›  ');
  const all = rows[f.id];
  const pg = f.paginas && f.paginas.length ? `<span class="chip">Catálogo: <strong>pág. ${f.paginas.length > 1 ? Math.min(...f.paginas) + '–' + Math.max(...f.paginas) : f.paginas[0]}</strong></span>` : '';
  $('fmeta').innerHTML = `<span class="chip"><strong>${all.length}</strong> ${noun(f, all.length)}</span>
    <span class="chip">Fonte: <strong>${esc(f.src)}</strong></span>${pg}
    ${f.len ? `<span class="chip">Barra comercial: <strong>${f.len} m</strong></span>` : ''}`;
  const opt = (k, sel) => `<option value="${k}"${sel===k?' selected':''}>${esc(PR(f,k)[0])} · ${esc(PR(f,k)[3])}${PR(f,k)[1] ? ` (${esc(PR(f,k)[1])})` : ''}</option>`;
  const hasCommon = all.some(r => r.common);
  $('filters').innerHTML = `
    <div class="fld"><label for="q">Buscar ${f.gen ? 'item' : 'bitola'}</label><input id="q" type="search" placeholder="${f.gen ? 'nome ou modelo' : 'ex.: 250 × 25'}" value="${esc(S.q)}" autocomplete="off"></div>
    <div class="fld"><label for="reqk">Requisito mínimo</label><div class="req">
      <select id="reqk"><option value="">nenhum</option>${numKeys(f).map(k => opt(k, S.req.k)).join('')}</select>
      <input id="reqv" type="text" inputmode="decimal" placeholder="valor" value="${esc(S.req.v)}" aria-label="Valor mínimo">
      <span class="u" id="requ">${S.req.k ? esc(PR(f, S.req.k)[1]) : ''}</span></div></div>
    <div class="fld"><label for="sortk">Ordenar por</label>
      <select id="sortk"><option value="">${f.gen ? 'ordem do catálogo' : 'padrão'}</option>${famKeys(f).map(k => opt(k, S.sort && S.sort.k)).join('')}</select></div>
    <div class="toggles">
      ${hasCommon ? `<label class="tg${S.common?' on':''}"><input type="checkbox" id="tg-common"${S.common?' checked':''}><span class="dot"></span>Uso frequente</label>` : ''}
      ${(f.toggles||[]).map(([id,l]) => `<label class="tg${S.tg.has(id)?' on':''}"><input type="checkbox" id="tg-${id}" data-tg="${id}"${S.tg.has(id)?' checked':''}>${l}</label>`).join('')}
    </div>`;
  if (!S.sel[f.id]) { const d = all.find(r => r.name === f.def) || all.find(r => r.common) || all[0]; S.sel[f.id] = d.id; }
  renderTable(); renderDetail();
}
function renderHead() {
  const f = fam(), cols = tcols(f);
  $('tbl').querySelector('thead').innerHTML = `<tr><th scope="col" data-k=""><span class="s">${f.gen ? 'Produto' : 'Perfil'}</span><span class="un">${f.gen ? 'modelo' : 'bitola'}</span></th>` +
    cols.map(k => `<th scope="col" data-k="${k}"${S.sort&&S.sort.k===k?` aria-sort="${S.sort.dir>0?'ascending':'descending'}"`:''} title="${esc(PR(f,k)[3])}"><span class="s">${esc(PR(f,k)[0])}</span><span class="un">${esc(PR(f,k)[1]) || '&nbsp;'}</span></th>`).join('') + '</tr>';
  const s = $('sortk'); if (s) s.value = S.sort ? S.sort.k : '';
}
function renderTable() {
  const f = fam(), list = visible(), cols = tcols(f);
  renderHead();
  let best = null;
  const rv = parseFloat(String(S.req.v).replace(',','.'));
  const reqOn = S.req.k && isFinite(rv);
  if (reqOn && hasMass(f) && list.length) best = list.reduce((a, b) => (b.p.m ?? 1e12) < (a.p.m ?? 1e12) ? b : a);
  const hk = S.req.k || (S.sort && S.sort.k);
  /* sem ordenação ativa, as bitolas de uso frequente vêm primeiro, num grupo próprio */
  const usual = list.filter(r => r.common), rest = list.filter(r => !r.common);
  const grouped = !S.sort && usual.length && rest.length;
  const grp = (t, n) => `<tr class="grp"><td colspan="${cols.length+1}">${t} <small>${n} ${noun(f, n)}</small></td></tr>`;
  const rowsHtml = l => l.map(r => `<tr data-id="${r.id}" tabindex="0"${r.id===S.sel[f.id]?' class="sel" aria-selected="true"':''}>
    <td><span class="nm"><span class="dot${r.common?'':' off'}" ${r.common?'title="Uso frequente"':''}></span><span class="nt">${esc(r.name)}${
      r.sub && f.gen ? `<small>${esc(r.sub)}</small>` : ''}</span>${
      r.H?'<span class="tag h">H</span>':''}${r.enc?'<span class="tag enc" title="Sob encomenda">enc.</span>':''}${
      best&&r.id===best.id?'<span class="tag lt">mais leve</span>':''}</span></td>
    ${cols.map(k => `<td${k===hk?' class="hl"':''}>${fv(val(r,k), dg(f,k))}</td>`).join('')}</tr>`).join('');
  $('tbl').querySelector('tbody').innerHTML = !list.length
    ? `<tr><td colspan="${cols.length+1}" class="empty">Nenhum${f.gen ? ' item' : 'a bitola'} atende aos filtros. Reduza o requisito ou desmarque um filtro.</td></tr>`
    : grouped ? grp('<span class="dot"></span>Mais usuais', usual.length) + rowsHtml(usual) + grp('Demais bitolas', rest.length) + rowsHtml(rest)
    : rowsHtml(list);
  const b = $('best'), rk = S.req.k && PR(f, S.req.k);
  if (reqOn) {
    b.hidden = false;
    b.innerHTML = best
      ? `Mais leve com <strong>${esc(rk[0])} ≥ ${esc(S.req.v)} ${esc(rk[1])}</strong>: <button data-id="${best.id}">${esc(best.name)}</button> <span>${nf(best.p.m, dg(f,'m'))} ${esc(PR(f,'m')[1])}</span>`
      : list.length ? `${list.length} ${noun(f, list.length)} com <strong>${esc(rk[0])} ≥ ${esc(S.req.v)} ${esc(rk[1])}</strong>.`
      : `Nenhum${f.gen ? ' item' : 'a bitola'} desta família atende a <strong>${esc(rk[0])} ≥ ${esc(S.req.v)} ${esc(rk[1])}</strong>.`;
  } else b.hidden = true;
  $('count').innerHTML = `<span>${list.length} de ${rows[f.id].length} ${noun(f, rows[f.id].length)}</span>` +
    (rows[f.id].some(r => r.common) ? '<span class="k"><span class="dot"></span>uso frequente</span>' : '') +
    (f.id==='w' ? '<span class="k"><span class="tag h">H</span> seção tipo H, indicada para pilares</span><span class="k"><span class="tag enc">enc.</span> produzido sob encomenda</span>' : '') +
    '<span>Dimensões e demais propriedades no painel ao lado. Use “Ordenar por” para trazer outra coluna à tabela.</span>';
}
function findRow(id) { for (const k in rows) { const r = rows[k].find(x => x.id === id); if (r) return r; } }
/* unidade de massa -> como calcular o total */
function massMode(un) {
  const u = String(un || '').toLowerCase().replace(/\s/g, '');
  if (/^kg\/m$/.test(u)) return {lbl:'Comprimento (m)', def:1, k:1};
  if (/^kg\/m(²|2)$/.test(u)) return {lbl:'Área (m²)', def:1, k:1};
  const n = u.match(/^kg\/(\d+)(p[çc]|peças|un)/);
  if (n) return {lbl:null, def:1, k:1 / +n[1]};
  if (/^kg\/(p[çc]|peça|un|unid|barra)/.test(u)) return {lbl:null, def:1, k:1};
  if (/^g\/(p[çc]|peça|un|unid)/.test(u)) return {lbl:null, def:1, k:0.001};
  return null;
}
function cotaBlock(f, r, opts = {}) {
  const editable = opts.editable || new Set(), custom = opts.custom, hidden = cotaHidden(f.id);
  const cotaRows = cotaSpec(r.shape, r.dim, r.p).map(c => {
    const ed = editable.has(c.dk) && c.k === c.dk;
    const v = custom && S.custom.raw[c.dk] != null ? S.custom.raw[c.dk] : smart(c.v).replace(/\./g, '');
    return `<div class="crow">
      <label class="ck" title="Mostrar a cota ${esc(c.sym)} no desenho"><input type="checkbox" data-cota="${c.k}"${hidden.has(c.k) ? '' : ' checked'}>
        <span class="sy">${esc(c.sym)}</span><span class="ds">${esc(c.desc)}</span></label>
      ${ed ? `<input id="dm-${c.dk}" data-dim="${c.dk}" type="text" inputmode="decimal" value="${esc(v)}" aria-label="${esc(c.sym)} em mm">`
           : `<span class="cv">${smart(c.v)}</span>`}<small>mm</small></div>`;
  }).join('');
  return `<div class="dsec"><h4>Cotas do desenho</h4>
      <p class="note" style="margin:0 0 8px">Marque as cotas que devem aparecer${editable.size ? ' e altere os valores para redesenhar a seção e recalcular as propriedades' : ''}.</p>
      <div class="cotas">${cotaRows}</div>
      ${opts.after || ''}
      <div class="sliders">
        <div class="fld"><label for="c-off">Afastamento do perfil <output id="c-off-o">${S.cOff}</output></label><input id="c-off" type="range" min="4" max="60" step="1" value="${S.cOff}"></div>
        <div class="fld"><label for="c-gap">Entre cotas <output id="c-gap-o">${S.cGap}</output></label><input id="c-gap" type="range" min="14" max="50" step="1" value="${S.cGap}"></div>
      </div>
      <div class="cbtns"><button class="tg" type="button" id="c-all">Mostrar todas</button><button class="tg" type="button" id="c-none">Ocultar todas</button>
        <button class="tg" type="button" id="c-def">Distâncias padrão</button>${custom ? '<button class="tg" id="dm-reset" type="button">Voltar à bitola da tabela</button>' : ''}</div>
    </div>`;
}
/* painel de um item de catálogo de fabricante: todas as colunas do catálogo, agrupadas */
function renderGenDetail(f) {
  const r = findRow(S.sel[f.id]);
  const mm = f.props.m && typeof r.p.m === 'number' ? massMode(f.props.m[1]) : null;
  const groups = [];
  for (const [k, d] of Object.entries(f.props)) {
    if (r.p[k] == null || r.p[k] === '' || (k === 'm' && mm)) continue;
    let g = groups.find(x => x[0] === d[4]); if (!g) groups.push(g = [d[4], []]);
    g[1].push(k);
  }
  const L = mm && mm.lbl ? (S.L[f.id] ?? mm.def) : 1;
  S._r = r.shape ? r : null;
  $('detail').innerHTML = `
    <div class="dh"><h3>${esc(r.name)}</h3>${r.sub ? `<div class="sub">${esc(r.sub)}</div>` : ''}
      <div class="badges"><span class="badge" title="${esc(f.src)}">${esc(f.src.split(' — ')[0])}</span>${f.paginas.length ? `<span class="badge">pág. ${f.paginas.join(', ')}</span>` : ''}</div></div>
    ${r.shape ? `<div class="draw" id="draw">${drawing(r, cotaCfg(f.id))}</div>${cotaBlock(f, r)}` : famIcon(f, true) ? `<div class="draw gicon">${famIcon(f)}</div>` : ''}
    ${mm ? `<div class="dsec"><h4>Massa</h4>
      <div class="calc">
        ${mm.lbl ? `<div class="fld"><label for="cL">${mm.lbl}</label><input id="cL" type="text" inputmode="decimal" value="${nf(L, Number.isInteger(L)?0:2)}"></div>` : ''}
        <div class="fld${mm.lbl ? '' : ' full'}"><label for="cQ">Quantidade</label><input id="cQ" type="text" inputmode="numeric" value="${S.qty}"></div>
      </div>
      <div class="out"><div><b id="oM">—</b><span>massa total (kg)</span></div><div><b>${nf(r.p.m, dg(f,'m'))}</b><span>${esc(f.props.m[3])} (${esc(f.props.m[1])})</span></div></div>
    </div>` : ''}
    <div class="dgroups">${groups.map(([t, ks]) => `<div class="dsec"><h4>${esc(t)}</h4><dl class="plist">${ks.map(k =>
      `<dt><span class="sy">${esc(PR(f,k)[0])}</span>${esc(PR(f,k)[3])}</dt><dd>${fv(r.p[k], dg(f,k))}<small>${esc(PR(f,k)[1])}</small></dd>`).join('')}</dl></div>`).join('')}</div>
    ${f.notas.length ? `<div class="dsec"><h4>Notas do catálogo</h4><ul class="notes">${f.notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}`;
  S._m = mm ? r.p.m * mm.k : 0; S._u = null;
  updateCalc();
}
function renderDetail() {
  const f = fam();
  if (f.gen) return renderGenDetail(f);
  let r = findRow(S.sel[f.id]), err = '';
  if (S.custom && S.custom.fam === f.id) {
    const g = S.custom.g, sh = SHAPE[f.id];
    const bad = Object.values(g).some(v => !(v > 0)) ||
      (sh==='RHS' && 2*g.t >= Math.min(g.B,g.H)) || (sh==='CHS' && 2*g.t >= g.D) ||
      (sh==='Ue' && (2*g.t >= g.H || 2*g.t >= g.B || g.c <= g.t || 2*g.c >= g.H)) || (sh==='Us' && (2*g.t >= g.H || g.t >= g.B)) ||
      (sh==='FB' && g.t > g.b) || (sh==='I' && (2*g.tf >= g.d || g.tw >= g.bf));
    if (bad) err = 'Dimensões inválidas: confira se a espessura cabe na seção e se todos os valores são positivos.';
    else r = {id:'custom', ...NAMES[f.id](g), sub:'dimensões personalizadas', shape:sh, dim:g, calc:true, p:compute(sh, g)};
  }
  const L = S.L[f.id] ?? f.len;
  const rho = r.calc ? MATS[S.mat][1] : RHO;
  const m = r.p.m * rho / RHO;
  const groups = GROUPS.map(([t, ks]) => [t, ks.filter(k => r.p[k] != null && isFinite(r.p[k]))]).filter(g => g[1].length);
  const badges = [r.common && '<span class="badge c">Uso frequente</span>', r.H && '<span class="badge h">Seção tipo H · pilar</span>',
    r.enc && '<span class="badge">Sob encomenda</span>', r.calc && '<span class="badge">Propriedades calculadas</span>',
    f.id==='l' && `<span class="badge">${r.series==='mm'?'Série milimétrica':'Série em polegadas'}</span>`].filter(Boolean).join('');
  /* cotas: escolher quais aparecem, alterar o valor (famílias editáveis) e o afastamento */
  const custom = S.custom && S.custom.fam === f.id;
  const cotaUI = cotaBlock(f, r, {editable: new Set((f.dims || []).map(d => d[0])), custom,
    after: (err ? `<p class="err">${err}</p>` : '') +
      (custom && r.shape === 'I' ? '<p class="note">Seção I calculada sem os raios de concordância entre alma e mesa: os valores ficam de 1 % a 3 % abaixo do catálogo.</p>' : '')});
  S._r = r;
  $('detail').innerHTML = `
    <div class="dh"><h3>${esc(r.name)}</h3><div class="sub">${esc(r.sub)}</div><div class="badges">${badges}</div></div>
    <div class="draw" id="draw">${drawing(r, cotaCfg(f.id))}</div>
    ${cotaUI}
    <div class="dsec"><h4>Massa e pintura</h4>
      <div class="calc">
        <div class="fld"><label for="cL">Comprimento (m)</label><input id="cL" type="text" inputmode="decimal" value="${nf(L, Number.isInteger(L)?0:2)}"></div>
        <div class="fld"><label for="cQ">Quantidade</label><input id="cQ" type="text" inputmode="numeric" value="${S.qty}"></div>
        ${r.calc ? `<div class="fld full"><label for="cM">Material</label><select id="cM">${MATS.map(([n,d],i) => `<option value="${i}"${i===S.mat?' selected':''}>${n} · ${d.toLocaleString('pt-BR')} kg/m³</option>`).join('')}</select></div>` : ''}
      </div>
      <div class="out">
        <div><b id="oM">—</b><span>massa total (kg)</span></div>
        <div><b id="oU">—</b><span>área de pintura (m²)</span></div>
      </div>
      <p class="note">${r.calc && S.mat ? `Massa linear em ${MATS[S.mat][0].toLowerCase()}: ${nf(m,3)} kg/m. ` : ''}${r.calc ? '' : 'Perfil laminado em aço carbono. '}Barra comercial usual de ${f.len} m.</p>
    </div>
    <div class="dgroups">${groups.map(([t, ks]) => `<div class="dsec"><h4>${t}</h4><dl class="plist">${ks.map(k =>
      `<dt><span class="sy">${P[k][0]}</span>${P[k][3]}</dt><dd>${nf(k==='m'?m:r.p[k], k==='m'?Math.max(dg(f,k),2):dg(f,k))}<small>${P[k][1]}</small></dd>`).join('')}</dl></div>`).join('')}</div>`;
  S._m = m; S._u = r.p.u;
  updateCalc();
}
function updateCalc() {
  const f = fam(), L = !$('cL') ? 1 : S.L[f.id] ?? (f.gen ? 1 : f.len), q = S.qty;
  const ok = L > 0 && q > 0;
  const t = S._m * L * q;
  if ($('oM')) $('oM').textContent = ok ? nf(t, t < 1 ? 3 : t < 100 ? 2 : 1) : '—';
  if ($('oU')) $('oU').textContent = ok && S._u ? nf(S._u * L * q, 2) : '—';
}
const tbl = (head, body) => `<div class="twrap"><table><thead><tr>${head.map((h,i) => `<th${i?'':' style="cursor:default"'}>${h}</th>`).join('')}</tr></thead><tbody>${
  body.map(r => `<tr style="cursor:default">${r.map(c => c && c.ot != null ? `<td class="ot">${c.ot}</td>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function renderMaterials() {
  if ($('materials').dataset.done) return;
  $('materials').dataset.done = 1;
  const uses = FAM.filter(f => !f.rho && !f.gen).map(f => `<div>${famIcon(f)}<p style="margin:0"><b>${f.title}</b><span>${f.desc}</span></p></div>`).join('');
  $('materials').innerHTML = `
    <div><h2>Materiais e densidades</h2><p>Os perfis laminados e dobrados são de aço carbono ou aço de baixa liga. A densidade do aço é a mesma para todos os graus: o que muda de um grau para outro é a resistência. Por isso a massa por metro de uma bitola não depende do material especificado.</p></div>
    <div class="card"><h3>Constantes do aço estrutural</h3><p>Valores de cálculo da ABNT NBR 8800.</p>
      <div class="consts">
        <div><b>7 850</b><span>densidade ρ, kg/m³</span></div>
        <div><b>200 000</b><span>módulo de elasticidade E, MPa</span></div>
        <div><b>77 000</b><span>módulo de cisalhamento G, MPa</span></div>
        <div><b>0,30</b><span>coeficiente de Poisson ν</span></div>
        <div><b>1,2×10⁻⁵</b><span>dilatação térmica α, /°C</span></div>
      </div></div>
    <div class="cols2">
      <div class="card"><h3>Aços dos perfis W e HP</h3><p>Graus da tabela Gerdau. O A572 Grau 50 é o padrão de fornecimento.</p>
        ${tbl(['Especificação','Escoamento f<sub>y</sub> (MPa)','Ruptura f<sub>u</sub> (MPa)','Alongamento (%)','Fornecimento'], [
          ['<strong>ASTM A572 Grau 50</strong>','345 mín.','450 mín.','18 mín.','padrão'],
          ['ASTM A572 Grau 60','415 mín.','520 mín.','16 mín.','sob encomenda'],
          ['ASTM A992','345 a 450','450 mín.','18 mín.','sob encomenda'],
          ['Aço COR 500 (patinável)','370 mín.','500 mín.','18 mín.','sob encomenda'],
          ['ASTM A131 AH32 (naval)','315 mín.','440 a 590','19 mín.','sob encomenda'],
          ['ASTM A131 AH36 (naval)','355 mín.','490 a 620','19 mín.','sob encomenda']])}
        <p class="note">Tolerância de massa linear: +3 % / −2,5 % para bitolas abaixo de 148 kg/m e ±2,5 % para as demais.</p></div>
      <div class="card"><h3>Aços dos perfis I, U, T e cantoneiras</h3><p>Graus da tabela Gerdau, com a equivalência na NBR 7007.</p>
        ${tbl(['Especificação','f<sub>y</sub> (MPa)','f<sub>u</sub> (MPa)','Along. 200 mm','NBR 7007'], [
          ['<strong>ASTM A36</strong>','250 mín.','400 a 550','20 %','MR 250'],
          ['ASTM A572 Grau 50','350 mín.','450 mín.','18 %','AR 350'],
          ['ASTM A572 Grau 60','415 mín.','520 mín.','16 %','AR 415'],
          ['ASTM A588 (patinável)','350 mín.','485 mín.','18 %','AR 350 COR']])}
        <p class="note">O A588 é produzido sob encomenda.</p></div>
    </div>
    <div class="cols2">
      <div class="card"><h3>Tubos, formados a frio e barras</h3><p>Graus usuais de mercado, com valores mínimos típicos das normas. Confirme no certificado do fornecedor.</p>
        ${tbl(['Material','Uso','f<sub>y</sub> (MPa)','f<sub>u</sub> (MPa)'], [
          ['ASTM A500 Grau B','tubo redondo','290','400'],
          ['ASTM A500 Grau B','tubo quadrado e retangular','315','400'],
          ['ASTM A500 Grau C','tubo quadrado e retangular','345','427'],
          ['NBR 6650 CF-26','chapa para formados a frio','260','410'],
          ['NBR 7008 ZAR 250','chapa galvanizada (steel frame, terças)','250','360'],
          ['NBR 7008 ZAR 345','chapa galvanizada estrutural','345','430'],
          ['ASTM A36','barras chatas e redondas','250','400'],
          ['SAE 1008 / 1020','serralheria, uso não estrutural','sem garantia','sem garantia']])}</div>
      <div class="card"><h3>Densidade de outros metais</h3><p>Para estimar a massa de um perfil de mesma geometria em outro material, multiplique a massa em aço pela razão ρ / 7 850.</p>
        ${tbl(['Metal','ρ (kg/m³)','Fator sobre o aço','E (GPa)','f<sub>y</sub> típico (MPa)'], [
          ['<strong>Aço carbono</strong>','7 850','1,000','200','250 a 415'],
          ['Aço inox 304','7 930','1,010','193','205'],
          ['Aço inox 316','7 980','1,017','193','205'],
          ['Alumínio 6063-T5','2 700','0,344','69','110'],
          ['Alumínio 6061-T6','2 700','0,344','69','240'],
          ['Ferro fundido cinzento','7 200','0,917','100','não se aplica'],
          ['Latão','8 500','1,083','100','variável'],
          ['Cobre','8 960','1,141','117','variável'],
          ['Zinco (galvanização)','7 140','0,910','não se aplica','não se aplica']])}
        <p class="note">Alumínio tem cerca de 1/3 da rigidez do aço: com a mesma seção, a flecha é quase 3 vezes maior.</p></div>
    </div>
    ${MAT_FAB.length ? `<div class="card"><h3>Materiais dos catálogos de fabricantes</h3>
      <p>Todos os materiais citados nos catálogos de referência, com os valores que cada catálogo informa. Campo vazio: o catálogo não informa.</p>
      <div class="filters mfilters"><div class="fld"><label for="mq">Buscar material</label><input id="mq" type="search" placeholder="ex.: inox, A36, resina" autocomplete="off"></div>
        <div class="fld"><label for="mf">Fonte</label><select id="mf"><option value="">todas</option>${[...new Set(MAT_FAB.map(m => m.fonte.split(',')[0]))].map(s => `<option>${esc(s)}</option>`).join('')}</select></div></div>
      <div id="mtab"></div></div>` : ''}
    <div class="card"><h3>Onde cada perfil é mais usado</h3><div class="uses">${uses}</div></div>`;
  if (MAT_FAB.length) { renderMatFab(); $('mq').addEventListener('input', renderMatFab); $('mf').addEventListener('change', renderMatFab); }
}
function renderMatFab() {
  const q = $('mq').value.trim().toLowerCase(), src = $('mf').value;
  const n = v => v == null || v === '' ? '' : typeof v === 'number' ? v.toLocaleString('pt-BR') : esc(v);
  const list = MAT_FAB.filter(m => (!src || m.fonte.startsWith(src)) &&
    (!q || JSON.stringify(m).toLowerCase().includes(q)));
  $('mtab').innerHTML = list.length ? tbl(['Material','Tipo','Norma','ρ (kg/m³)','f<sub>y</sub> (MPa)','f<sub>u</sub> (MPa)','E (MPa)','Outros dados','Uso','Fonte'],
    list.map(m => [`<strong>${esc(m.nome)}</strong>`, n(m.tipo), n(m.norma), n(m.rho), n(m.fy), n(m.fu), n(m.E),
      {ot: Object.entries(m.outros || {}).map(([k, v]) => `<b>${esc(k)}:</b> ${n(v)}`).join(' · ')}, n(m.uso), n(m.fonte)]))
    : '<p class="empty">Nenhum material encontrado.</p>';
}

/* ---------- eventos ---------- */
function setFam(id) {
  if (!famById[id]) return;
  S.fam = id; S.q = ''; S.tg = new Set(); S.req = {k:'',v:''}; S.sort = null; S.custom = null;
  store.set('perfilario-fam', id);
  try { history.replaceState(null, '', '#' + id); } catch (e) {}
  renderFamily();
}
function select(id, scroll) {
  S.sel[S.fam] = id; S.custom = null;
  document.querySelectorAll('#tbl tbody tr').forEach(tr => { const on = tr.dataset.id === id; tr.classList.toggle('sel', on); on ? tr.setAttribute('aria-selected','true') : tr.removeAttribute('aria-selected'); });
  renderDetail();
  if (scroll && window.innerWidth < 1060) $('detail').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
}
const num = v => parseFloat(String(v).replace(/\s/g,'').replace(',','.'));
$('fmore').addEventListener('click', () => {
  const open = $('fdesc').classList.toggle('clamp') === false;
  $('fmore').textContent = open ? 'Mostrar menos' : 'Ler mais'; $('fmore').setAttribute('aria-expanded', open);
});
$('nav').addEventListener('input', e => {
  if (e.target.id !== 'fq') return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('#nav .flist .fbtn').forEach(b => { b.hidden = !!q && !b.textContent.toLowerCase().includes(q); });
  document.querySelectorAll('#nav .flist .fmk').forEach(m => { m.hidden = !m.querySelector('.fbtn:not([hidden])'); });
});
$('nav').addEventListener('click', e => {
  if (e.target.closest('#fexp')) { S.navOpen = !S.navOpen; renderNav(); if (S.navOpen && $('fq')) $('fq').focus(); return; }
  const b = e.target.closest('.fbtn'); if (b) { S.navOpen = false; return setFam(b.dataset.f); }
  const g = e.target.closest('.gbtn');
  if (g) { S.navOpen = false; const gr = g.dataset.g; setFam(GROUP_LAST[gr] || FAM.find(f => f.group === gr).id); }
  const t = e.target.closest('.tbtn');
  if (t) { S.navOpen = false; const k = fam().group + '|' + t.dataset.t; setFam(TIPO_LAST[k] || FAM.find(f => f.group + '|' + f.tipo === k).id); }
});
const onFilter = e => {
  const t = e.target;
  if (t.id === 'q') S.q = t.value;
  else if (t.id === 'reqv') S.req.v = t.value;
  else if (t.id === 'reqk') { S.req.k = t.value; $('requ').textContent = t.value ? PR(fam(), t.value)[1] : ''; if (t.value && !S.sort && hasMass(fam())) S.sort = {k:'m', dir:1}; }
  else if (t.id === 'sortk') S.sort = t.value ? {k:t.value, dir:1} : null;
  else if (t.id === 'tg-common') { S.common = t.checked; t.parentElement.classList.toggle('on', t.checked); }
  else if (t.dataset.tg) {
    S.tg[t.checked ? 'add' : 'delete'](t.dataset.tg); t.parentElement.classList.toggle('on', t.checked);
    if (S.fam === 'l' && t.checked) { const o = t.dataset.tg === 'pol' ? 'mm' : 'pol'; S.tg.delete(o); const x = $('tg-'+o); if (x) { x.checked = false; x.parentElement.classList.remove('on'); } }
  }
  renderTable();
};
$('filters').addEventListener('input', onFilter);
$('filters').addEventListener('change', e => { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onFilter(e); });
$('tbl').addEventListener('click', e => {
  const th = e.target.closest('th');
  if (th) { const k = th.dataset.k;
    S.sort = !k ? null : (S.sort && S.sort.k === k ? (S.sort.dir > 0 ? {k, dir:-1} : null) : {k, dir:1});
    renderTable(); return; }
  const tr = e.target.closest('tr[data-id]'); if (tr) select(tr.dataset.id, true);
});
$('tbl').addEventListener('keydown', e => {
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(tr.dataset.id, true); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); let n = tr; do { n = e.key === 'ArrowDown' ? n.nextElementSibling : n.previousElementSibling; } while (n && !n.dataset.id); if (n) { n.focus(); select(n.dataset.id, false); } }
});
$('best').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) { select(b.dataset.id, true); const tr = document.querySelector(`#tbl tr[data-id="${b.dataset.id}"]`); if (tr) tr.scrollIntoView({block:'nearest'}); } });
$('detail').addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'cL') { S.L[S.fam] = num(t.value); updateCalc(); }
  else if (t.id === 'cQ') { S.qty = num(t.value); updateCalc(); }
  else if (t.id === 'cM') { S.mat = +t.value; renderDetail(); }
  else if (t.id === 'c-off' || t.id === 'c-gap') {
    S[t.id === 'c-off' ? 'cOff' : 'cGap'] = +t.value; $(t.id + '-o').textContent = t.value;
    redraw(); saveCotas();
  }
  else if (t.dataset.cota) {
    const h = new Set(cotaHidden(S.fam));
    h[t.checked ? 'delete' : 'add'](t.dataset.cota);
    S.cHide[S.fam] = h; redraw(); saveCotas();
  }
  else if (t.dataset.dim) {
    const f = fam(), base = S.custom && S.custom.fam === f.id ? S.custom.g : {...findRow(S.sel[f.id]).dim};
    base[t.dataset.dim] = num(t.value);
    S.custom = {fam:f.id, g:base, raw:{...(S.custom && S.custom.fam === f.id ? S.custom.raw : {}), [t.dataset.dim]:t.value}};
    const id = t.id, pos = t.selectionStart;
    renderDetail();
    const n = $(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} }
  }
});
function redraw() { if (S._r && $('draw')) $('draw').innerHTML = drawing(S._r, cotaCfg(S.fam)); }
$('detail').addEventListener('click', e => {
  const id = e.target.id;
  if (id === 'dm-reset') { S.custom = null; renderDetail(); }
  else if (id === 'c-all' || id === 'c-none') {
    S.cHide[S.fam] = new Set(id === 'c-all' ? [] : cotaSpec(S._r.shape, S._r.dim, S._r.p).map(c => c.k));
    document.querySelectorAll('#detail [data-cota]').forEach(x => { x.checked = id === 'c-all'; });
    redraw(); saveCotas();
  } else if (id === 'c-def') {
    S.cOff = COTA_OFF; S.cGap = COTA_GAP;
    for (const k of ['off','gap']) { $('c-' + k).value = S['c' + k[0].toUpperCase() + k.slice(1)]; $('c-' + k + '-o').textContent = $('c-' + k).value; }
    redraw(); saveCotas();
  }
});

/* ---------- início ---------- */
const start = (location.hash || '').slice(1);
S.fam = famById[start] ? start : (famById[store.get('perfilario-fam')] ? store.get('perfilario-fam') : 'w');
if (FAB.length) $('fontes-fab').innerHTML = '<strong>Catálogos de fabricantes</strong> (valores transcritos; confira no catálogo original antes de especificar): ' +
  FAB.map(c => esc(c.fonte)).join(' · ') + '.';
renderFamily();
