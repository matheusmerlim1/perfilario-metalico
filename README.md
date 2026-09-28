# Perfilário Metálico

Catálogo interativo de perfis metálicos estruturais e de produtos de catálogos de fabricantes: dimensões, propriedades, massa e materiais. É uma página estática, sem dependências nem build. Abre direto no navegador.

**Acesse:** https://matheusmerlim1.github.io/perfilario-metalico/

## O que tem

- **Perfis de aço:** W e HP, I, U, T, cantoneiras, tubos quadrados, retangulares e redondos, U enrijecido, U simples, barras chatas e redondas.
- **Catálogos de fabricantes** (416 famílias, 4 976 itens, 266 materiais):
  - chapas de aço (Tenax);
  - perfis, grades, escadas e eletrocalhas em fibra de vidro (Gran e Stratus);
  - grades de piso (Cogumelo);
  - eletrocalhas, leitos, perfilados e fixação (Bandeirantes);
  - cabos de aço, correntes, acessórios e içamento (SIVA);
  - manilhas, ganchos, anéis, olhais, destorcedores, soquetes, esticadores, patescas e demais acessórios de içamento (Green Pin, importado de www.greenpin.com/br);
  - fusos e roscas trapezoidais (Conti);
  - chumbador químico HIT-HY 200 (Hilti, ETA-18/0972).
- **Navegação em três níveis:** categoria (Perfis de aço, Chapas, Grades e escadas, Içamento, Fixação…) → tipo de produto (Manilhas, Ganchos, Olhais…, cada um com seu desenho) → família, separada por fabricante. Tipos com muitas famílias viram uma lista compacta em colunas.
- **Tabela enxuta:** a lista mostra só o nome e a massa (kg/m, kg/m², kg/peça, conforme o catálogo). Todas as dimensões e as demais propriedades ficam no painel da direita. "Ordenar por" e "Requisito mínimo" trazem mais uma coluna à tabela quando usados.
- **Desenho cotado da seção:** cotas com sigla e valor, configuráveis (quais aparecem, afastamento, valores editáveis nas famílias calculadas). Os perfis de fibra de vidro com d, bf, tw, tf também são desenhados.
- **Filtros:** busca, requisito mínimo com destaque do item mais leve que atende, ordenação por qualquer propriedade.
- **Massa:** massa total por comprimento, área ou quantidade, conforme a unidade da família.
- **Materiais:** constantes do aço (NBR 8800), graus de aço por família, densidade de outros metais e todos os materiais citados nos catálogos de fabricantes, com busca e filtro por fonte.

## Estrutura

```
index.html              página (só marcação)
css/style.css           estilos da página
css/portfolio-btn.css   botão de volta ao portfólio
js/formatacao.js        formatação de números
js/geometria.js         propriedades (P, GROUPS) e cálculo geométrico das seções
js/catalogo.js          famílias de aço (FAM) e linhas das tabelas
js/desenho.js           cotas e desenho SVG da seção
js/fabricantes.js       transforma os catálogos de fabricantes em famílias da navegação
js/app.js               estado, renderização e eventos
js/portfolio-btn.js     posicionamento do botão de portfólio
js/dados/perfis-gerdau.js   tabela Gerdau (W, HP, I, U, T, cantoneiras)
js/dados/fab-*.js       catálogos de fabricantes (gerados, não edite à mão)
dados/*.json            catálogos de fabricantes transcritos (fonte dos fab-*.js)
tools/gerar-dados.py    gera js/dados/fab-*.js e a lista de <script> do index.html
tools/baixar-greenpin.py    baixa as páginas de produto da Green Pin para .cache/
tools/importar-greenpin.py  converte as páginas baixadas em dados/greenpin.json
```

Os scripts são clássicos (sem módulos ES), para a página funcionar abrindo o `index.html` direto do disco.

### Adicionar ou corrigir um catálogo

1. Edite ou crie `dados/<fabricante>.json`, no formato `{fonte, familias: [{id, label, titulo, desc, icone, massa, props, itens, notas, paginas}], materiais: [...]}`.
2. Rode `python tools/gerar-dados.py`.
3. Em `tools/gerar-dados.py`, a função `classifica()` define a categoria e o tipo de produto de cada família. Os ícones de cada tipo ficam em `js/fabricantes.js` (`FAB_ICONS` e `TIPO_ICON`).

Para atualizar a Green Pin: `python tools/baixar-greenpin.py && python tools/importar-greenpin.py && python tools/gerar-dados.py`.

## Fontes

- Perfis W, HP, I, U, T e cantoneiras: *Tabela de bitolas Gerdau*.
- Tubos, perfis formados a frio, barras e seções I com dimensões alteradas: propriedades calculadas pela geometria da seção (sem raios de concordância), com aço de ρ = 7 850 kg/m³.
- Catálogos de fabricantes: valores transcritos dos PDFs de referência (Tenax, Gran/Braver, Stratus, Cogumelo, Bandeirantes, SIVA, Conti, Hilti) e das tabelas técnicas em mm do site da Green Pin. Possíveis erros de impressão dos catálogos foram mantidos como impressos e registrados nas notas de cada família.

Confirme bitolas, valores e disponibilidade com o fornecedor antes de especificar.

## Rodar localmente

Abra o `index.html` no navegador.
