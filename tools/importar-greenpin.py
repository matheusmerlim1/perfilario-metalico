"""Converte as páginas baixadas da Green Pin (.cache/greenpin) em dados/greenpin.json.
Uso: python tools/baixar-greenpin.py && python tools/importar-greenpin.py && python tools/gerar-dados.py"""
import os, re, html, json, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, '.cache', 'greenpin')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dados', 'greenpin.json')

cl = lambda x: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()

# categoria do site -> tipo de produto
CAT_TIPO = {'acessorios-em-geral': 'Outros acessórios', 'aneis-e-elos': 'Anéis e elos', 'corrente': 'Correntes',
    'destorcedores': 'Destorcedores', 'esticadores-de-cabo-de-aco': 'Esticadores e tensionadores',
    'esticadores-de-corrente': 'Esticadores e tensionadores', 'ganchos': 'Ganchos', 'garras-encurtadoras': 'Garras encurtadoras',
    'grampos-para-cabos-de-aco': 'Grampos para cabo', 'manilhas': 'Manilhas', 'olhais-de-elevacao': 'Olhais',
    'parafusos-de-amarracao': 'Parafusos de amarração', 'patescas': 'Patescas', 'pega-chapa': 'Pega-chapas',
    'soquetes': 'Soquetes e terminais', 'produtos-de-aco-inoxidavel': None}
cat_of = {}
for f in sorted(os.listdir(os.path.join(D, 'cat'))):
    c = f[:-5].split('__')[0]
    s = open(os.path.join(D, 'cat', f), encoding='utf-8', errors='replace').read()
    for slug in re.findall(r'href="/br/product/([^"?#/]+)"', s):
        if CAT_TIPO.get(c) and slug not in cat_of: cat_of[slug] = c
        cat_of.setdefault(slug + '#inox', c)

def num(v):
    v = v.strip()
    if re.fullmatch(r'-?\d+(,\d+)?', v): return float(v.replace(',', '.')) if ',' in v else int(v)
    if re.fullmatch(r'-?\d+\.\d+', v): return float(v)
    if re.fullmatch(r'-?\d{1,3}(\.\d{3})+(,\d+)?', v): return float(v.replace('.', '').replace(',', '.'))
    return v or None

def key_of(h):
    """cabeçalho da tabela -> (chave, símbolo, unidade, descrição, grupo)"""
    un = ''
    m = re.search(r'\(([^)]*)\)\s*$', h)
    if m and m.group(1).strip().lower() not in ('cmt', 'wll'):
        un = m.group(1).strip(); h2 = h[:m.start()].strip()
    else: h2 = h
    lo = h2.lower()
    if 'carga maxima de trabalho' in lo or 'carga máxima de trabalho' in lo or lo.startswith('cmt'):
        return 'CMT', 'CMT', un or 't', 'Carga máxima de trabalho', 'Resistência'
    if lo.startswith('peso'):
        return 'm', 'm', un.lower() or 'kg', 'Massa', 'Massa'
    m = re.match(r'^([A-Z]{1,2}\d?)\s+(.+)$', h2)
    if m:
        return m.group(1), m.group(1), un or 'mm', m.group(2)[0].upper() + m.group(2)[1:], 'Dimensões'
    k = re.sub(r'[^a-z0-9]+', '_', lo).strip('_')[:24] or 'x'
    grp = 'Resistência' if any(w in lo for w in ('carga', 'mbl', 'ruptura', 'prova', 'kn')) else 'Propriedades'
    return k, h2[:30], un, h2[0].upper() + h2[1:], grp

familias, mats, sem_tabela = [], {}, []
for f in sorted(os.listdir(os.path.join(D, 'prod'))):
    slug = f[:-5]
    s = open(os.path.join(D, 'prod', f), encoding='utf-8', errors='replace').read()
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    titulo = cl(h1.group(1)) if h1 else slug
    det = {}
    for li in re.findall(r'<li>\s*<div class="left__col">(.*?)</div>\s*<div class="right__col[^"]*"[^>]*>(.*?)</div>\s*</li>', s, re.S):
        k = cl(li[0])
        v = ', '.join(cl(x) for x in re.findall(r'<li>(.*?)</li>', li[1], re.S)) or cl(li[1])
        if v: det[k] = v
    desc = ''
    m = re.search(r'class="productclass__marketingtext"[^>]*>(.*?)</div>', s, re.S)
    if m: desc = cl(m.group(1)).replace('Green Pin ® ', 'Green Pin® ')
    hl = re.search(r'<span class="usp__title">[^<]*</span>\s*<ul>(.*?)</ul>', s, re.S)
    destaques = [cl(x) for x in re.findall(r'<li>(.*?)</li>', hl.group(1), re.S)] if hl else []
    tabela = None
    for t in re.findall(r'<table.*?</table>', s, re.S):
        hs = [cl(c) for c in re.findall(r'<th.*?</th>', t, re.S)]
        if not hs or any(x.lower() == 'pdf' or '(lbs)' in x.lower() for x in hs): continue
        if sum('polegada' in x.lower() for x in hs) > 2: continue      # tabela em polegadas
        linhas = [[cl(c) for c in re.findall(r'<td.*?</td>', r, re.S)] for r in re.findall(r'<tr.*?</tr>', t, re.S)[1:]]
        if tabela is None: tabela = (hs, [])
        if hs != tabela[0]: continue
        for l in linhas:
            if l not in tabela[1]: tabela[1].append(l)
    titulo = re.sub(r'\s*®\s*', '® ', titulo).replace('® ®', '®').strip()
    nome = re.sub(r'^Green Pin®?\s*', '', titulo).replace('® ', ' ').replace('®', '').strip()
    if not tabela:
        sem_tabela.append(titulo); continue
    hs, rs = tabela
    cols = [key_of(h) for h in hs]
    props, massa = {}, None
    for i, (k, sym, un, dsc, grp) in enumerate(cols):
        if i == 0: continue
        if k == 'm':
            u = un if '/' in un else un + '/peça'
            massa = ['m', u.replace('kg/m', 'kg/m'), 'Massa unitária' if 'peça' in u else 'Massa']
            continue
        while k in props: k += '_'
        cols[i] = (k, sym, un, dsc, grp)
        props[k] = [sym, un, dsc, grp]
    itens = []
    for r in rs:
        if len(r) != len(hs) or not r[0]: continue
        it = {'nome': r[0], 'p': {}}
        for (k, *_), v in zip(cols[1:], r[1:]):
            x = num(v)
            if x is None: continue
            if k == 'm': it['m'] = x if isinstance(x, (int, float)) else None
            else: it['p'][k] = x
        if it.get('m') is None: it.pop('m', None)
        if 'CMT' in it['p']: it['sub'] = f"CMT {str(it['p']['CMT']).replace('.', ',')} {props['CMT'][1]}"
        itens.append(it)
    if not itens:
        sem_tabela.append(titulo); continue
    props['cod_prod'] = ['Cód.', '', 'Código do produto', 'Fornecimento']
    for it in itens:
        if det.get('Código do produto'): it['p']['cod_prod'] = det['Código do produto']
    notas = [f'{k}: {v}' for k, v in det.items() if k != 'Código do produto'] + (['Destaques: ' + '; '.join(destaques)] if destaques else [])
    notas.append(f'Fonte: https://www.greenpin.com/br/product/{slug}')
    c = cat_of.get(slug) or cat_of.get(slug + '#inox')
    icone = 'cabo' if c == 'corrente' else 'outro'
    familias.append({'id': 'greenpin-' + re.sub(r'^green-pin[a-z]*-', '', slug)[:60], 'label': nome, 'titulo': titulo,
        'desc': desc, 'icone': icone,
        'tipo_site': CAT_TIPO.get(c) if c else None, 'inox': 'inox' in (c or '') or 'inox' in slug or 'Inox' in titulo,
        'massa': massa, 'props': props, 'itens': itens, 'notas': notas, 'paginas': []})
    if det.get('Material'):
        mt = det['Material']
        e = mats.setdefault(mt.lower(), {'nome': mt[0].upper() + mt[1:], 'tipo': 'aço', 'norma': None, 'rho': None, 'fy': None,
            'fu': None, 'E': None, 'outros': {}, 'uso': [], 'fonte': 'Green Pin (greenpin.com/br)'})
        e['uso'].append(nome)
        for k in ('Acabamento', 'Fator de segurança', 'Faixa de temperatura'):
            if det.get(k): e['outros'].setdefault(k, det[k])
from collections import Counter
dup = Counter(f['label'] for f in familias)
for f in familias:
    cod = f['itens'][0]['p'].get('cod_prod')
    if dup[f['label']] > 1 and cod: f['label'] += f' ({cod})'; f['titulo'] += f' ({cod})'
for e in mats.values():
    u = e['uso']; e['uso'] = ', '.join(u[:6]) + (f' e mais {len(u) - 6}' if len(u) > 6 else '')
    if 'inox' in e['nome'].lower() or 'aisi' in e['nome'].lower(): e['tipo'] = 'aço inoxidável'
json.dump({'fonte': 'Green Pin — produtos de içamento e amarração (www.greenpin.com/br)', 'familias': familias,
           'materiais': list(mats.values())}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(familias), 'famílias,', sum(len(f['itens']) for f in familias), 'itens,', len(mats), 'materiais; sem tabela:', len(sem_tabela))
for t in sem_tabela: print('  sem tabela:', t)
