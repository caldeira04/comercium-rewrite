# Relatórios

O Comercium oferece relatórios gerenciais para acompanhamento do negócio.
Eles estão organizados por módulo.

## Filtros Comuns dos Relatórios (Período e Caixa)

Todos os relatórios têm filtro de **período** (data inicial e data final,
padrão: mês atual). Os relatórios de **vendas** (histórico e relatório),
**caixas** (relatório), **estoque** e **contas a receber** também têm o filtro
**caixa**: escolha um caixa pelo número (ex.: "caixa nº 34 · 18/11/2026
08:02–18:30 · operador"). Com um caixa selecionado, o período considerado é o
do caixa (da abertura ao fechamento) e as datas ficam desabilitadas.

Vendas e caixas são identificados por um **número sequencial** ("venda nº 152",
"caixa nº 34"), o mesmo em todas as telas e arquivos exportados.

## Exportar Relatórios em PDF e CSV

Todas as telas de relatório têm o botão **"exportar"**, com duas opções:

- **PDF**: cabeçalho com a loja, os filtros aplicados e os indicadores, seguido
  das tabelas do relatório.
- **CSV (Excel)**: planilha com a tabela detalhada do relatório, separada por
  ponto e vírgula e com vírgula decimal, pronta para abrir no Excel.

Telas com exportação: Histórico de Vendas, Relatório de Vendas, Histórico de
Caixas (lista de caixas e extrato do caixa selecionado), Relatório de Caixas,
Relatório de Estoque, Contas a Receber e Contas a Pagar. O arquivo sai com os
mesmos filtros (período ou caixa, cliente etc.) aplicados na tela.

No export do **Histórico de Vendas**, a coluna **produtos** lista um produto
por linha dentro da mesma célula (ex.: "2× Coca 350ml — R$ 12,00"); produtos
lançados mais de uma vez na venda aparecem somados.

## Relatórios pelo Assistente (Market Guy)

O assistente gera qualquer um desses relatórios em PDF ou CSV: basta pedir o
relatório, o período ou o número do caixa e os filtros (ex.: "relatório de
vendas do caixa de ontem em CSV", "extrato do caixa 34", "estoque de outubro
só da categoria Bebidas"). O arquivo é o mesmo exportado pela tela e sai num
botão de download abaixo da resposta.

## Relatório de Vendas

Acesse **Vendas → Rel. Vendas**. Filtros: período ou caixa, e cliente.

Indicadores:

- **Vendas**: número total de vendas realizadas.
- **Total Vendido**: soma do valor bruto de todas as vendas.
- **Total Pago**: soma dos valores efetivamente recebidos (pagamentos
  estornados não contam).
- **Ticket Médio**: média de valor por venda (total vendido ÷ vendas).

Tabelas:

- **Produtos Mais Vendidos**: ranking dos 10 produtos com maior faturamento.
- **Clientes com Maior Compra**: ranking dos 10 clientes que mais compraram.

Exporta PDF (indicadores e rankings) e CSV (ranking completo de produtos).

## Relatório de Caixas

Acesse **Caixa → Rel. Caixas**. Filtros: período ou caixa, e situação
(abertos, fechados ou todos).

Indicadores:

- **Caixas**: total de caixas abertos no período.
- **Fechados**: quantos caixas foram fechados.
- **Entradas**: total de entradas acumuladas.
- **Saídas**: total de saídas acumuladas.
- **Saldo Líquido**: entradas - saídas.
- **Diferença Acumulada**: soma das diferenças de fechamento de todos os
  caixas.

Tabela:

- **Entradas por Forma de Pagamento**: total recebido em dinheiro, PIX, débito,
  crédito e cheque, com a quantidade de pagamentos de cada tipo.

Exporta PDF e CSV (uma linha por caixa, com os totais por forma de pagamento).

## Relatório de Estoque

Acesse **Estoque → Rel. Estoque**. Filtros: período ou caixa, categoria e
estoque (com ou sem estoque).

Mostra a **movimentação no período** de cada produto (saldo inicial, entradas,
saídas, ajustes e saldo final) e a posição no fim do período (ou no fechamento
do caixa selecionado).

Indicadores:

- **Produtos**, **entradas (un.)** e **saídas (un.)** no período.
- **Custo em Estoque**: valor do estoque final a preço de custo.
- **Valor de Venda**: valor do estoque final a preço de venda.
- **Lucro Potencial**: diferença entre valor de venda e custo do estoque.

Tabelas de Alerta:

- **Produtos sem Estoque**: produtos com saldo final zero ou negativo.
- **Margem Negativa**: produtos cujo preço de venda é menor que o preço de
  custo.

Custos e valores usam os preços atuais dos produtos.

## Relatórios Financeiros

As telas de **Financeiro → Contas a Receber** e **Financeiro → Contas a Pagar**
têm o botão **"exportar"** (PDF ou CSV), que gera um relatório com os filtros
aplicados e os totais (recebido, estornado e líquido no Contas a Receber;
pendente, vencido e pago no Contas a Pagar). O Contas a Receber também filtra
por caixa (o caixa em que o pagamento entrou). O período padrão é o mês atual.

## Interpretação dos Dados

- **Diferença de caixa positiva**: sobrou dinheiro no caixa em relação ao
  esperado (pode indicar erro de registro ou sobra não contabilizada).
- **Diferença de caixa negativa**: faltou dinheiro (pode indicar erro de troco,
  esquecimento de registro ou desfalque).
- **Margem negativa**: o produto está sendo vendido por menos do que custa —
  revise a precificação.
- **Produtos sem estoque**: itens que precisam ser comprados ou produzidos para
  não interromper as vendas.
