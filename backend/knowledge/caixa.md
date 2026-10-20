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

Acesse **Caixa → Histórico** para ver todos os caixas abertos anteriormente.
Cada linha mostra:

- ID do caixa
- Status (aberto/fechado)
- Data de abertura e fechamento
- Operador que abriu/fechou
- Saldo esperado e contado
- Diferença

Clique em um caixa para ver os detalhes no painel lateral.

## Relatório de Caixas

Acesse **Caixa → Rel. Caixas** para ver um resumo consolidado:

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
