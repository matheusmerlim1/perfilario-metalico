"""Gera js/dados/perfis-din.js com os perfis HEB, HEA e I (INP) das tabelas DIN 1025-2, -3 e -1.

Fonte: tabelas transcritas e conferidas no Projeto Uva (conteudo/fichas/perfis-laminados.json, tabelas din1025-*),
extraídas das normas DIN 1025-1/-2/-3 (1995) e validadas linha a linha pela física da seção.

Uso:  python tools/importar-din.py [caminho do perfis-laminados.json]
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PADRAO = ROOT.parent / 'Projeto Uva' / 'conteudo' / 'fichas' / 'perfis-laminados.json'
ficha = json.loads(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else PADRAO).read_text(encoding='utf-8'))
tabs = {t['id']: t for t in ficha['tabelas']}

# coluna da tabela DIN -> chave do Perfilário (Sx = momento estático da meia seção; Zx = 2·Sx)
MAPA = {'h (mm)': 'd', 'b (mm)': 'bf', 's — alma (mm)': 'tw', 't — mesa (mm)': 'tf', 'r (mm)': 'rr', 'r1 (mm)': 'rr',
        'r2 (mm)': 'rr2', 'A — área (cm²)': 'A', 'Massa (kg/m)': 'm', 'Superfície (m²/m)': 'u', 'Ix (cm⁴)': 'Ix',
        'Wx (cm³)': 'Wx', 'ix (cm)': 'rx', 'Iy (cm⁴)': 'Iy', 'Wy (cm³)': 'Wy', 'iy (cm)': 'ry', 'Sx (cm³)': 'Sx', 'sx (cm)': 'sx'}
out = {}
for chave, tid in (('HEB', 'din1025-heb'), ('HEA', 'din1025-hea'), ('I', 'din1025-i')):
    t = tabs[tid]
    lista = []
    for l in t['linhas']:
        r = {'n': l[0]}
        for c, v in zip(t['colunas'][1:], l[1:]):
            if v is not None:
                r[MAPA[c]] = v
        if 'Sx' in r:
            r['Zx'] = round(2 * r['Sx'], 1)
        lista.append(r)
    out[chave] = lista
    print(chave, len(lista))

dst = ROOT / 'js' / 'dados' / 'perfis-din.js'
dst.write_text('/* DIN 1025-1/-2/-3 (HEB, HEA, I) — gerado por tools/importar-din.py, não edite à mão */\n'
               'const DIN = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(dst)
