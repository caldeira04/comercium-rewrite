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

Acesse **Estoque → Rel. Estoque**. Filtros: período **ou caixa** (com um
caixa selecionado, vale a janela da abertura ao fechamento do caixa),
categoria e estoque (com ou sem estoque).

- **Movimentação no período**: saldo inicial, entradas, saídas, ajustes e
  saldo final de cada produto movimentado.
- **Entradas e saídas (un.)** no período.
- **Custo em estoque**: valor do estoque final a preço de custo.
- **Valor de venda**: valor do estoque final a preço de venda.
- **Lucro potencial**: diferença entre valor de venda e custo.
- **Produtos sem estoque**: produtos com saldo final zero ou negativo.
- **Margem negativa**: produtos vendidos por menos do que custam.

Custos e valores usam os preços atuais dos produtos. O botão **"exportar"**
gera o relatório em PDF ou CSV.

## Movimentações de Estoque

Para registrar uma movimentação manual:

1. Acesse o **Catálogo de Produtos**.
2. Clique no produto desejado.
3. No painel lateral, clique em **"movimentar estoque"**.
4. Selecione o tipo: entrada, saída, ajuste ou transferência.
5. Informe a quantidade e o motivo.
6. Se for uma entrada de mercadoria comprada, marque **"esta entrada é uma
   compra de produtos"**.
7. Confirme.

Quando a entrada é marcada como compra, o sistema pergunta em seguida se deseja
**lançar no Contas a Pagar**, com vencimento, parcelas e forma de pagamento
(veja **Financeiro → Contas a Pagar**).

### Motivos Comuns

- **Entrada**: compra de mercadoria, devolução de cliente, ajuste de inventário.
- **Saída**: venda, perda, quebra, validade vencida.
- **Ajuste**: correção de inventário físico.

> **Dica**: sempre preencha o motivo da movimentação para manter um histórico
> auditável do estoque.
