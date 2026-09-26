# Perfilário Metálico

Catálogo interativo de perfis metálicos estruturais: dimensões, propriedades geométricas, massa por metro e materiais usuais. É uma página HTML única, sem dependências nem build.

**Acesse:** https://matheusmerlim1.github.io/perfilario-metalico/

## O que tem

- **Famílias:** perfis W e HP, I, U, T, cantoneiras, tubos quadrados, retangulares e redondos, U enrijecido, U simples, barras chatas e redondas.
- **Mais usuais primeiro:** na lista, as bitolas de uso corrente no mercado brasileiro aparecem no topo, no grupo "Mais usuais". Ao ordenar por uma coluna, a lista volta a ser única.
- **Desenho cotado da seção:** cada cota traz a sigla e o valor (`tf = 8,4`, `bf = 102`...), para identificar cada dimensão.
- **Cotas configuráveis:**
  - escolher quais cotas aparecem (d, bf, tw, tf, h, d' no perfil W);
  - ajustar a distância da cota ao perfil e a distância entre cotas;
  - alterar os valores (d, bf, tw, tf no perfil W; dimensões dos tubos, formados a frio e barras). A seção é redesenhada e as propriedades são recalculadas.
- **Filtros:** busca por bitola, requisito mínimo (ex.: Wx ≥ 300 cm³) com destaque do perfil mais leve que atende, perfis H e sob encomenda.
- **Massa e pintura:** massa total e área de pintura por comprimento e quantidade.
- **Materiais:** constantes do aço (NBR 8800), graus de aço por família e densidade de outros metais.

As escolhas de cotas ficam salvas no navegador.

## Fontes

Perfis W, HP, I, U, T e cantoneiras: *Tabela de bitolas Gerdau*. Tubos, perfis formados a frio, barras e seções I com dimensões alteradas: propriedades calculadas pela geometria da seção (sem raios de concordância), com aço de ρ = 7 850 kg/m³. Confirme bitolas e disponibilidade com o fornecedor antes de especificar.

## Rodar localmente

Abra o `index.html` no navegador.
