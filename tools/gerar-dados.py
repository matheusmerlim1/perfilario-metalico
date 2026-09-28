"""Gera js/dados/fab-*.js a partir dos catálogos transcritos em dados/*.json
e atualiza a lista de <script> em index.html.

Uso:  python tools/gerar-dados.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'dados', ROOT / 'js' / 'dados'
OUT.mkdir(parents=True, exist_ok=True)

# ordem das abas na navegação
ORDEM = ['tenax', 'gran', 'stratus', 'cogumelo', 'bandeirante', 'siva', 'greenpin', 'conti', 'hilti']
arquivos = sorted(SRC.glob('*.json'), key=lambda p: (ORDEM.index(p.stem) if p.stem in ORDEM else 99, p.stem))

# ---------- organização: categoria (aba) -> tipo de produto -> família ----------
ICAMENTO = [  # (palavras no id, tipo) — a primeira que casar vence
    (('mosquetao',), 'Mosquetões'),
    (('gancho',), 'Ganchos'),
    (('manilha',), 'Manilhas'),
    (('anel', 'aneis', 'elo-', 'elos'), 'Anéis e elos'),
    (('soquete', 'terminal'), 'Soquetes e terminais'),
    (('destorcedor',), 'Destorcedores'),
    (('esticador', 'tensionador', 'amarracao'), 'Esticadores e tensionadores'),
    (('grampo', 'prensa'), 'Grampos para cabo'),
    (('sapatilho',), 'Sapatilhos'),
    (('linga',), 'Lingas'),
    (('olhal', 'olhais'), 'Olhais'),
    (('patesca',), 'Patescas'),
    (('pega-chapa', 'pega chapa', 'garra-de-elevacao'), 'Pega-chapas'),
    (('garra', 'encurtador'), 'Garras encurtadoras'),
    (('parafuso',), 'Parafusos de amarração'),
]
FUSO_TIPO = {**{k: 'Porcas cilíndricas' for k in 'mlf mzp hsn hbd hda hbm big mph'.split()},
             **{k: 'Porcas quadradas' for k in 'cqa qob cqf qbf'.split()},
             **{k: 'Porcas flangeadas' for k in 'ftn fxn fmt hdl cbc ffr fhd fue fsf cdf hal fcs'.split()},
             'mes': 'Porcas sextavadas'}

def classifica(fab, f):
    """Devolve (categoria, tipo) de uma família, pelo tipo de produto e não pelo fabricante."""
    i = f['id']
    has = lambda *ws: any(w in i for w in ws)
    if fab == 'tenax':
        return 'Chapas', 'Chapas de aço'
    if fab == 'greenpin' and f.get('tipo_site'):
        if f['tipo_site'] == 'Correntes':
            return 'Cabos e correntes', 'Correntes'
        return 'Içamento', f['tipo_site']
    if fab in ('siva', 'greenpin'):
        if has('cordoalha'):
            return 'Cabos e correntes', 'Cordoalhas'
        if has('corrente') and not has('linga', 'elo-', 'anel', 'gancho', 'esticador', 'encurtador', 'garra'):
            return 'Cabos e correntes', 'Correntes'
        if f.get('icone') == 'cabo' and not has('linga'):
            return 'Cabos e correntes', 'Cabos de aço inox' if has('inox') else 'Cabos de aço'
        for ws, tipo in ICAMENTO:
            if has(*ws):
                return 'Içamento', tipo
        return 'Içamento', f.get('tipo') or 'Outros acessórios'
    if fab in ('gran', 'stratus', 'cogumelo'):
        if has('fixadores', 'cantoneira-y'):
            return 'Grades e escadas', 'Fixação de grades'
        if has('grade', 'gps', 'gis', 'cogumelo-gm', 'cogumelo-gi'):
            return 'Grades e escadas', 'Grades de piso'
        if has('guarda-corpo'):
            return 'Grades e escadas', 'Guarda-corpos'
        if has('degrau', 'escada', 'construcoes'):
            return 'Grades e escadas', 'Degraus e escadas'
        if has('leito'):
            return 'Eletrocalhas e perfilados', 'Leitos para cabos'
        if has('eletrocalha'):
            return 'Eletrocalhas e perfilados', 'Eletrocalhas'
        if has('eletroduto', 'eds-', 'condulete'):
            return 'Eletrocalhas e perfilados', 'Eletrodutos e conexões'
        if has('compressao', 'flexao'):
            return 'Perfis de fibra de vidro', 'Tabelas de carga'
        if has('tubo', 'tqs', 'tcs', 'bcs', 'placa'):
            return 'Perfis de fibra de vidro', 'Tubos, barras e placas'
        if has('semiestruturais', 'bws', 'bos', 'sfs'):
            return 'Perfis de fibra de vidro', 'Perfis especiais'
        return 'Perfis de fibra de vidro', 'Perfis estruturais'
    if fab == 'bandeirante':
        if has('chumbadores', 'finca-pino'):
            return 'Fixação', 'Chumbadores e pinos'
        if has('parafusos', 'porcas', 'buchas'):
            return 'Fixação', 'Parafusos, porcas e buchas'
        if has('abracadeiras-vergalhao', 'grampos-suspensao', 'vergalhoes'):
            return 'Fixação', 'Vergalhões e suspensão'
        if has('leito'):
            return 'Eletrocalhas e perfilados', 'Leitos para cabos'
        if has('aramada'):
            return 'Eletrocalhas e perfilados', 'Eletrocalhas aramadas'
        if has('eletrocalha'):
            return 'Eletrocalhas e perfilados', 'Eletrocalhas'
        if has('canaleta'):
            return 'Eletrocalhas e perfilados', 'Canaletas'
        if has('ganchos-perfilado', 'sapatas', 'cantoneiras-perfilado', 'fixacao-cabo', 'maos-francesas', 'abracadeiras'):
            return 'Eletrocalhas e perfilados', 'Suportes e abraçadeiras'
        return 'Eletrocalhas e perfilados', 'Perfilados'
    if fab == 'hilti':
        return 'Fixação', 'Chumbadores químicos'
    if fab == 'conti':
        k = i.replace('conti-', '')
        if k.startswith('dados'):
            return 'Fusos trapezoidais', 'Dados técnicos'
        return 'Fusos trapezoidais', FUSO_TIPO.get(k, 'Fusos')
    return f.get('grupo') or 'Outros', f.get('tipo') or 'Outros'

for old in OUT.glob('fab-*.js'):
    old.unlink()
tags = []
for p in arquivos:
    cat = json.loads(p.read_text(encoding='utf-8'))
    cat['sigla'] = p.stem
    for f in cat.get('familias', []):
        f['grupo'], f['tipo'] = classifica(p.stem, f)
    n =sum(len(f.get('itens', [])) for f in cat.get('familias', []))
    js = (f'/* {cat.get("fonte", p.stem)} — gerado por tools/gerar-dados.py a partir de dados/{p.name}; não edite à mão */\n'
          f'CATALOGOS.push({json.dumps(cat, ensure_ascii=False, separators=(",", ":"))});\n')
    dst = OUT / f'fab-{p.stem}.js'
    dst.write_text(js, encoding='utf-8', newline='\n')
    tags.append(f'<script src="js/dados/{dst.name}"></script>')
    print(f'{dst.name}: {len(cat.get("familias", []))} famílias, {n} itens, {len(cat.get("materiais", []))} materiais')

html = (ROOT / 'index.html').read_text(encoding='utf-8')
bloco = '<!-- catálogos de fabricantes (gerado) -->\n<script>window.CATALOGOS = [];</script>\n' + '\n'.join(tags) + '\n<!-- /catálogos -->'
html = re.sub(r'<!-- catálogos de fabricantes \(gerado\) -->.*?<!-- /catálogos -->', lambda m: bloco, html, flags=re.S)
(ROOT / 'index.html').write_text(html, encoding='utf-8', newline='\n')
