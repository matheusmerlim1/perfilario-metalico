"""Gera js/dados/perfis-arcelor.js a partir do catálogo ArcelorMittal "Sales programme — Sections and merchant bars"
(edição 2008, PL/EN/CZ, 232 págs.; cópia pública em https://home.agh.edu.pl/~blajer/wpages/cad/tablice.pdf).

Uso:  python tools/importar-arcelor.py <tablice.pdf>

O PDF não é versionado. Cada linha é conferida pela física da seção (massa = 0,785·A; propriedades da mesma bitola
que as dimensões); a que não fecha é descartada e listada. Unidades do catálogo: mm, kg/m, cm², cm⁴, cm³, cm, m²/m;
Iw em 10³ cm⁶ (convertido para cm⁶).
"""
import json, pathlib, re, sys
import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
doc = pymupdf.open(sys.argv[1])

DIM_I = ['m', 'd', 'bf', 'tw', 'tf', 'rr', 'A', 'h', 'dl', '_furo', '_pmin', '_pmax', 'u', '_AG']
DIM_IPN = ['m', 'd', 'bf', 'tw', 'tf', 'rr', 'rr2', 'A', 'dl', '_furo', '_pmin', '_pmax', 'u', '_AG']
DIM_J = ['m', 'd', 'bf', 'tw', 'tf', 'rr', 'rr2', 'dl', 'A', 'u', '_AG']
DIM_U = ['m', 'd', 'bf', 'tw', 'tf', 'rr', 'A', 'h', 'dl', '_furo', '_emin', '_emax', 'u', '_AG']
DIM_UPN = ['m', 'd', 'bf', 'tw', 'tf', 'rr', 'rr2', 'A', 'dl', '_furo', '_emin', '_emax', 'u', '_AG']
PROP_I = ['_G', 'Ix', 'Wx', 'Zx', 'rx', '_Avz', 'Iy', 'Wy', 'Zy', 'ry', '_ss', 'It', 'Cw']
PROP_U = PROP_I + ['x', 'eo']
DIM_LI = ['m', 'b', 't', 'rr', 'rr2', 'A', 'x', '_v', '_u1', '_u2', 'u', '_AG']
PROP_LI = ['_G', 'I', 'W', 'r', '_Iu', '_iu', 'Iz', 'rz']
DIM_LD = ['m', 'b', 'bs', 't', 'rr', 'rr2', 'A', 'y', 'x', '_v1', '_v2', '_u1', '_u2', '_u3', 'u', '_AG']
PROP_LD = ['_G', 'Ix', 'Wx', 'rx', 'Iy', 'Wy', 'ry', '_Iu', '_iu', 'Iz', 'rz', '_Iyz', '_alfa']
DIM_T = ['m', 'd', 'bf', 't', 'rr', 'rr2', '_r3', 'A', 'x', 'Ix', 'Wx', 'rx', 'Iy', 'Wy', 'ry']

# série: (prefixos da designação, [(página das dimensões, página das propriedades ou None)], colunas dim, colunas prop)
SERIES = {
    'IPE': (['IPE'], [(18, 19), (20, 21), (22, 23)], DIM_I, PROP_I),
    'IPN': (['IPN'], [(24, 25)], DIM_IPN, PROP_I),
    'HE': (['HE'], [(26, 27), (28, 29), (30, 31), (32, 33)], DIM_I, PROP_I),
    'HL': (['HL'], [(34, 35), (36, 37)], DIM_I, PROP_I),
    'HD': (['HD'], [(38, 39), (40, 41)], DIM_I, PROP_I),
    'HP': (['HP'], [(42, 43), (44, 45)], DIM_I, PROP_I),
    'UPE': (['UPE'], [(46, 47)], DIM_U, PROP_U),
    'UPN': (['UPN'], [(48, 49)], DIM_UPN, PROP_U),
    'LI': (['L'], [(54, 55), (56, 57), (58, 59), (60, 61)], DIM_LI, PROP_LI),
    'LD': (['L'], [(66, 67), (68, 69)], DIM_LD, PROP_LD),
    'T': (['T'], [(75, None)], DIM_T, None),
    'UB': (['UB'], [(100, 101), (102, 103), (104, 105)], DIM_I, PROP_I),
    'J': (['J'], [(106, 107)], DIM_J, PROP_I),
    'UC': (['UC'], [(108, 109)], DIM_I, PROP_I),
    'PFC': (['PFC'], [(112, 113)], DIM_U, PROP_U),
    'JIS': (['H'], [(156, 157), (158, 159)], DIM_I, PROP_I),
}
NUM = re.compile(r'^-?\d+(?:[.,]\d+)?$')


def limpa(s):
    """designação sem as marcas de disponibilidade (*, •, +, ♠, /x…) e com vírgula decimal"""
    s = s.split('  ')[0].strip()
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r'(?:[*•+♠♣■¤∇◊\-]|/x|/)+$', '', s).strip()
    s = re.sub(r'(?<=\d)\s*[xX]\s*(?=\d)', ' x ', s)          # "75x75x7" e "920 X 342" -> "75 x 75 x 7"
    return re.sub(r'\s+', ' ', s).replace('.', ',')


def linhas(pagina, prefixos):
    """{designação: [valores]} da página (1-based): trechos de texto agrupados pela altura (y) da linha da tabela"""
    trechos = []
    for bl in doc[pagina - 1].get_text('dict')['blocks']:
        for ln in bl.get('lines', []):
            for sp in ln['spans']:
                t = sp['text'].strip()
                if t:
                    x0, y0, x1, y1 = sp['bbox']
                    trechos.append(((y0 + y1) / 2, x0, t))
    trechos.sort()
    filas, fila, yref = [], [], None
    for y, x, t in trechos:
        if yref is None or abs(y - yref) > 2.5:
            if fila:
                filas.append(fila)
            fila, yref = [], y
        fila.append((x, t))
    if fila:
        filas.append(fila)
    eh_des = lambda x: any(re.match(rf'^{p}(?: [A-Z]{{1,2}})? ?\d', x) for p in prefixos) and not re.match(r'^M ?\d+$', x)
    out = {}
    for fila in filas:
        toks = []
        for _, t in sorted(fila):
            partes = t.split()
            if len(partes) > 1 and all(NUM.match(x) or x == '-' for x in partes):
                toks += partes                       # números grudados num só trecho
            else:
                partes = re.split(r'\s{2,}', t)
                toks += partes if len(partes) > 1 and NUM.match(partes[-1]) else [t]
        if not toks or not eh_des(toks[0]) or re.search(r'(DIN|EN|BS|JIS|NF|GOST|ASTM)\s', toks[0]):
            continue
        vals = [x for x in toks[1:] if NUM.match(x) or x == '-' or re.match(r'^M ?\d+$', x)]
        out.setdefault(limpa(toks[0]), vals)
    return out


def num(x):
    return None if x == '-' or re.match(r'^M ?\d+$', x) else float(x.replace(',', '.'))


saida, descartes = {}, []
for serie, (prefixos, paginas, cdim, cprop) in SERIES.items():
    lista = []
    props = {}                                  # propriedades de todas as páginas da série (a bitola pode mudar de página)
    for _, pprop in paginas:
        if pprop:
            for k, v in linhas(pprop, prefixos).items():
                props.setdefault(k, v)
    for pdim, _ in paginas:
        dims = linhas(pdim, prefixos)
        for nome, tk in dims.items():
            if not tk:
                continue                        # linha de texto (título, nota)
            while tk and tk[0] == '-':          # coluna de marcação (-/) antes da massa, nas cantoneiras
                tk = tk[1:]
            if len(tk) < len(cdim):
                descartes.append(f'{serie} {nome}: {len(tk)} valores de dimensão'); continue
            r = {k: num(v) for k, v in zip(cdim, tk) if not k.startswith('_') and num(v) is not None}
            furo = tk[cdim.index('_furo')] if '_furo' in cdim else '-'
            if re.match(r'^M ?\d+$', furo):
                r['furo'] = furo.replace(' ', '')
            if cprop:
                pk = props.get(nome)
                if not pk or len(pk) < len(cprop) or abs(num(pk[0]) - r['m']) > max(0.051, 0.015 * r['m']):
                    descartes.append(f'{serie} {nome}: propriedades não encontradas'); continue
                r.update({k: num(v) for k, v in zip(cprop, pk) if not k.startswith('_') and num(v) is not None})
            if 'Cw' in r:
                r['Cw'] = round(r['Cw'] * 1000, 1)
            if abs(r['m'] - 0.785 * r['A']) > 0.03 * r['m']:       # massa = ρ·A
                descartes.append(f'{serie} {nome}: massa {r["m"]} × área {r["A"]}'); continue
            if serie == 'LI':
                r['bs'] = r['b']
            if serie == 'T':
                r['b'] = r['bf']
            lista.append({'n': nome, **{k: (int(v) if v == int(v) else v) if isinstance(v, float) else v for k, v in r.items()}})
    saida[serie] = lista
    print(f'{serie:4} {len(lista)}')

print(f'total {sum(map(len, saida.values()))}; descartadas {len(descartes)}')
for d in descartes:
    print('  -', d)
dst = ROOT / 'js' / 'dados' / 'perfis-arcelor.js'
dst.write_text('/* ArcelorMittal, Sales programme sections and merchant bars (2008) — gerado por tools/importar-arcelor.py, não edite à mão */\n'
               'const ARCELOR = ' + json.dumps(saida, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(dst, dst.stat().st_size // 1024, 'kB')
