"""Gera js/dados/perfis-aisc.js a partir do AISC Shapes Database v15.0 (planilha .xlsx, colunas métricas).

Uso:  python tools/importar-aisc.py [caminho do aisc-shapes-database-v15.0.xlsx]

Unidades de saída iguais às da tabela Gerdau: mm, kg/m, cm², cm⁴, cm³, cm, cm⁶ e m²/m.
"""
import glob, json, pathlib, re, sys
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
PADRAO = 'T:/ENG/Literature/01 - Books/AISC/AISC_shapes-database-v15.0.xlsx'
xlsx = sys.argv[1] if len(sys.argv) > 1 else glob.glob(PADRAO)[0]
rows = list(openpyxl.load_workbook(xlsx, read_only=True, data_only=True)['Database v15.0'].iter_rows(values_only=True))
H = rows[0]
MET = {H[i]: i for i in range(84, len(H))}      # colunas métricas (depois da 1ª metade, em polegadas)
US = {H[i]: i for i in range(84)}


def v(r, k, f=1.0):
    x = r[MET[k]]
    if x in (None, '–', '-', ''):
        return None
    x = float(x) * f
    nd = 0 if abs(x) >= 1000 else 1 if abs(x) >= 100 else 2 if abs(x) >= 10 else 3
    x = round(x, nd)
    return int(x) if x == int(x) else x


def nome(s):
    """W100X19.3 -> W 100 × 19,3; HSS152.4X101.6X6.4 -> HSS 152,4 × 101,6 × 6,4; Pipe100XS -> Pipe 100 XS"""
    m = re.match(r'^(2L|[A-Za-z]+)(.*)$', s)
    pre, resto = m.group(1), m.group(2)
    suf = re.search(r'(LLBB|SLBB|STD|XXS|XS)$', resto)
    if suf:
        resto = resto[:suf.start()]
    txt = ' × '.join(resto.split('X')).replace('.', ',')
    return f'{pre} {txt}' + (f' {suf.group(1)}' if suf else '')


def base(r):
    p = {'m': v(r, 'W'), 'A': v(r, 'A', 0.01),
         'Ix': v(r, 'Ix', 100), 'Wx': v(r, 'Sx'), 'Zx': v(r, 'Zx'), 'rx': v(r, 'rx', 0.1),
         'Iy': v(r, 'Iy', 100), 'Wy': v(r, 'Sy'), 'Zy': v(r, 'Zy'), 'ry': v(r, 'ry', 0.1)}
    if v(r, 'PB'):
        p['u'] = v(r, 'PB', 0.001)
    return p


def secao_i(r):  # W, HP, S, M e C, MC
    p = {**base(r), 'd': v(r, 'd'), 'bf': v(r, 'bf'), 'tw': v(r, 'tw'), 'tf': v(r, 'tf'), 'k': v(r, 'kdes'),
         'k1': v(r, 'k1'), 'T': v(r, 'T'), 'It': v(r, 'J', 0.1), 'Cw': v(r, 'Cw', 1000), 'lf': v(r, 'bf/2tf'),
         'hw': v(r, 'h/tw'), 'x': v(r, 'x', 0.1), 'eo': v(r, 'eo', 0.1), 'g': v(r, 'WGi')}
    return p


def secao_t(r):  # WT, MT, ST
    return {**base(r), 'd': v(r, 'd'), 'bf': v(r, 'bf'), 'tw': v(r, 'tw'), 'tf': v(r, 'tf'), 'k': v(r, 'kdes'),
            'y': v(r, 'y', 0.1), 'It': v(r, 'J', 0.1), 'Cw': v(r, 'Cw', 1000), 'lf': v(r, 'bf/2tf'), 'g': v(r, 'WGi')}


def secao_l(r):  # L: b = aba maior, bs = aba menor
    return {**base(r), 'b': v(r, 'b'), 'bs': v(r, 'd'), 't': v(r, 't'), 'k': v(r, 'kdes'), 'x': v(r, 'x', 0.1),
            'y': v(r, 'y', 0.1), 'Iz': v(r, 'Iz', 100), 'rz': v(r, 'rz', 0.1), 'ta': v(r, 'tan(α)'),
            'It': v(r, 'J', 0.1), 'Cw': v(r, 'Cw', 1000)}


def secao_2l(r):  # 2L: d = aba encostada (vertical), b = aba de cada cantoneira, s = afastamento
    lab = r[MET['AISC_Manual_Label']]
    partes = re.sub(r'(LLBB|SLBB)$', '', lab[2:]).split('X')
    esp = float(partes[3]) if len(partes) > 3 else 0
    return {**base(r), 'd': v(r, 'd'), 'b': v(r, 'b'), 't': v(r, 't'), 's': esp, 'y': v(r, 'y', 0.1),
            'ro': v(r, 'ro', 0.1)}


def secao_hss(r):
    t, tdes = v(r, 'tnom'), v(r, 'tdes')
    p = {**base(r), 't': t, 'tdes': tdes, 'It': v(r, 'J', 0.1), 'Ct': v(r, 'C')}
    if v(r, 'OD'):
        p.update(D=v(r, 'OD'), u=round(3.141592653589793 * v(r, 'OD') / 1000, 3))
        for k in ('Iy', 'Wy', 'Zy', 'ry'):
            p.pop(k, None)
    else:
        B, Hh = v(r, 'B'), v(r, 'Ht')
        ro = min(2 * t, min(B, Hh) / 2)
        p.update(B=B, H=Hh, u=round((2 * (B + Hh) - 8 * ro + 2 * 3.141592653589793 * ro) / 1000, 3))
    return p


def secao_pipe(r):
    D = v(r, 'OD')
    p = {**base(r), 'D': D, 'Di': v(r, 'ID'), 't': v(r, 'tnom'), 'tdes': v(r, 'tdes'), 'It': v(r, 'J', 0.1),
         'u': round(3.141592653589793 * D / 1000, 3)}
    for k in ('Iy', 'Wy', 'Zy', 'ry'):
        p.pop(k, None)
    return p


GRUPOS = {  # chave no JS: (filtro da linha, função)
    'W': (lambda r: r[0] == 'W', secao_i), 'HP': (lambda r: r[0] == 'HP', secao_i),
    'S': (lambda r: r[0] == 'S', secao_i), 'M': (lambda r: r[0] == 'M', secao_i),
    'C': (lambda r: r[0] == 'C', secao_i), 'MC': (lambda r: r[0] == 'MC', secao_i),
    'L': (lambda r: r[0] == 'L', secao_l), '2L': (lambda r: r[0] == '2L', secao_2l),
    'WT': (lambda r: r[0] == 'WT', secao_t), 'MT': (lambda r: r[0] == 'MT', secao_t), 'ST': (lambda r: r[0] == 'ST', secao_t),
    'HSSR': (lambda r: r[0] == 'HSS' and r[US['OD']] in ('–', None), secao_hss),
    'HSSC': (lambda r: r[0] == 'HSS' and r[US['OD']] not in ('–', None), secao_hss),
    'PIPE': (lambda r: r[0] == 'PIPE', secao_pipe),
}
out = {}
for g, (filtro, fn) in GRUPOS.items():
    lista = []
    for r in rows[1:]:
        if not filtro(r):
            continue
        p = {k: x for k, x in fn(r).items() if x is not None}
        lista.append({'n': nome(r[MET['AISC_Manual_Label']]), 'us': nome(r[US['AISC_Manual_Label']]).replace(',', '.'), **p})
    lista.reverse()                                   # a base vem da maior para a menor
    assert len({x['n'] for x in lista}) == len(lista), g
    out[g] = lista
    print(f'{g:5} {len(lista)}')

dst = ROOT / 'js' / 'dados' / 'perfis-aisc.js'
dst.write_text('/* AISC Shapes Database v15.0 (colunas métricas) — gerado por tools/importar-aisc.py, não edite à mão */\n'
               'const AISC = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(dst, dst.stat().st_size // 1024, 'kB')
