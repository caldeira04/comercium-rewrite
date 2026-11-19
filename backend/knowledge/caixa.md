# Caixa

O módulo de **Caixa** controla a movimentação financeira diária da loja.
Antes de realizar vendas, é necessário abrir um caixa.

## Abrir Caixa

1. Acesse **Caixa → Gerenciar Caixa** na barra lateral.
2. Clique em **"abrir caixa"**.
3. Informe o valor do **fundo de caixa** (valor em dinheiro que está no caixa
   no início do dia).
4. Confirme clicando em **"abrir caixa"**.

Ao abrir o caixa, o sistema registra automaticamente uma movimentação do tipo
"abertura" com o valor informado.

## Fechar Caixa

1. Com o caixa aberto, clique em **"fechar caixa"** no painel lateral direito.
2. Informe o **valor contado** (total em dinheiro contado fisicamente no caixa).
3. Confirme clicando em **"confirmar fechamento"**.

O sistema calcula:

- **Saldo esperado**: abertura + entradas - saídas.
- **Diferença**: valor contado - saldo esperado.

Se o valor contado for diferente do esperado, o sistema exibe a diferença
(positiva ou negativa) para conferência.

## Suprimento (Top-up)

Registra uma entrada de dinheiro no caixa sem ser por venda (ex: troco adicional).

1. No painel lateral, clique em **"suprimento"**.
2. Informe o **valor** e uma **descrição** (opcional).
3. Confirme.

## Sangria (Drop)

Registra uma saída de dinheiro do caixa sem ser por venda (ex: pagamento de
conta, retirada do caixa).

1. No painel lateral, clique em **"sangria"**.
2. Informe o **valor** e uma **descrição**.
3. Confirme.

## Histórico de Caixas

Acesse **Caixa → Histórico** para ver os caixas abertos no período (filtros:
período e situação). Cada linha mostra:

- **Número do caixa** (nº sequencial, ex.: caixa nº 34)
- Status (aberto/fechado)
- Data de abertura e fechamento
- Operador que abriu
- Saldo esperado e contado
- Diferença

O botão **"exportar"** gera a lista de caixas em PDF ou CSV.

## Extrato do Caixa (Movimentações)

Em **Caixa → Histórico**, clique em um caixa para abrir o painel lateral com
os totais e o **extrato de movimentações**: tudo o que entrou e saiu daquele
caixa, em ordem, com hora, operador, valor e saldo acumulado. Cada lançamento
tem uma descrição do que ocorreu:

- **Abertura do caixa**.
- **Venda nº 152 · PIX**, com o cliente e os produtos vendidos.
- **Estorno da venda nº 152**.
- **Suprimento** e **sangria**, com a observação do operador.
- **Fechamento do caixa**, com o valor contado e o esperado.

As abas **todas / entradas / saídas** filtram a lista. O botão **"exportar"**
do painel gera o extrato do caixa em PDF ou CSV.

## Relatório de Caixas

Acesse **Caixa → Rel. Caixas** para ver um resumo consolidado (filtros:
período ou caixa, e situação; exporta PDF e CSV):

- Total de caixas e quantos foram fechados.
- Total de entradas e saídas acumuladas.
- Saldo líquido e diferença acumulada.
- Entradas por forma de pagamento (dinheiro, PIX, débito, crédito, cheque).

## Painel do Caixa Atual

A página principal do caixa atual exibe:

- **Status** do caixa (aberto ou fechado).
- **Entradas** e **Saídas** do dia.
- **Saldo esperado** (abertura + entradas - saídas).
- **Dinheiro em caixa** (valor contado no fechamento).
- **Entradas por forma de pagamento**: cards com total de cada método.
- **Tabela de movimentações**: lista todas as movimentações com hora, descrição,
  método, operador e valor.
