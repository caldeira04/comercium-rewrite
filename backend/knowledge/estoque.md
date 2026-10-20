# Estoque

O módulo de **Estoque** controla a quantidade de produtos disponíveis na loja.
Cada movimentação de entrada ou saída é registrada individualmente.

## Como o Estoque Funciona

O estoque é calculado com base nas **movimentações** registradas:

- **Entrada** (`in`): aumenta a quantidade em estoque.
- **Saída** (`out`): diminui a quantidade em estoque.
- **Ajuste** (`adjustment`): define o estoque para o valor informado.
- **Transferência** (`transfer`): movimentação entre lojas.

Quando uma venda é finalizada no PDV, o sistema automaticamente registra uma
movimentação de saída para cada produto vendido (exceto para o produto genérico).

## Consultar Estoque

O saldo de cada produto aparece no **Catálogo de Produtos** (Estoque → Catálogo).
A coluna "Estoque" mostra a quantidade disponível calculada.

### Indicadores Visuais

- **Vermelho**: estoque zerado ou negativo (produto crítico).
- **Verde**: estoque normal.

## Relatório de Estoque

Acesse **Estoque → Rel. Estoque** para ver um resumo completo:

- **Produtos cadastrados**: total de produtos no catálogo.
- **Custo em estoque**: valor total do estoque a preço de custo.
- **Valor de venda**: valor total do estoque a preço de venda.
- **Lucro potencial**: diferença entre valor de venda e custo.
- **Produtos sem estoque**: lista de produtos com saldo zero ou negativo.
- **Margem negativa**: lista de produtos vendidos por menos do que custam.

## Movimentações de Estoque

Para registrar uma movimentação manual:

1. Acesse o **Catálogo de Produtos**.
2. Clique no produto desejado.
3. No painel lateral, clique em **"movimentar estoque"**.
4. Selecione o tipo: entrada, saída, ajuste ou transferência.
5. Informe a quantidade e o motivo.
6. Confirme.

### Motivos Comuns

- **Entrada**: compra de mercadoria, devolução de cliente, ajuste de inventário.
- **Saída**: venda, perda, quebra, validade vencida.
- **Ajuste**: correção de inventário físico.

> **Dica**: sempre preencha o motivo da movimentação para manter um histórico
> auditável do estoque.
