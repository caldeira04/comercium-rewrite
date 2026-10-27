# Financeiro

A seção **Financeiro** reúne o controle de **Contas a Receber** e **Contas a
Pagar** da loja. Acesse pela barra lateral em **Financeiro → Contas a Receber**
ou **Financeiro → Contas a Pagar**.

Nas duas telas, o período padrão é o **mês atual** (do primeiro ao último dia
do mês). O botão **"limpar"** volta todos os filtros para o padrão.

## Contas a Receber

Acesse **Financeiro → Contas a Receber**. A tela lista os **recebimentos das
vendas**, organizados pela **data do pagamento**. Os lançamentos são gerados
automaticamente a partir dos pagamentos registrados no PDV; não é preciso
cadastrar nada manualmente.

Cada linha mostra:

- **Data do pagamento** (data e hora).
- **Cliente** (ou "não informado" quando a venda não tem cliente).
- **Venda**: código curto da venda de origem.
- **Forma**: dinheiro, PIX, débito, crédito ou cheque.
- **Valor**.
- **Situação**: recebido, estornado, pendente ou cancelado.

## Filtros e Totais do Contas a Receber

Filtros disponíveis:

- **Data inicial** e **data final** (padrão: mês atual).
- **Cliente**: todos os clientes, "não informado" ou um cliente específico.
- **Situação**: recebidos (padrão), estornados ou todos.

Indicadores no topo:

- **Lançamentos**: quantidade de recebimentos no filtro.
- **Recebido**: total recebido.
- **Estornado**: total estornado.
- **Líquido**: recebido menos estornado.

O card **"totais por forma"** mostra o total recebido em cada forma de
pagamento e, quando houver, o valor estornado daquela forma.

## Contas a Pagar

Acesse **Financeiro → Contas a Pagar**. A tela lista as **despesas da loja**,
organizadas pela **data de vencimento**.

Cada linha mostra: vencimento, data do pagamento, favorecido, descrição e
categoria, origem (manual ou estoque), forma de pagamento, conta bancária,
valor e situação.

Situações possíveis:

- **Pendente**: ainda não pago e dentro do vencimento.
- **Vencido**: não pago e com vencimento já passado.
- **Pago**: baixa registrada.

Indicadores no topo: **lançamentos**, **total filtrado**, **pendente**,
**vencido** e **pago**.

Filtros: data inicial e final (padrão: mês atual), **favorecido**, **conta
bancária**, **categoria** e **situação** (todos, pendentes, vencidos ou pagos).

## Criar um Lançamento no Contas a Pagar

1. Em **Financeiro → Contas a Pagar**, clique em **"novo lançamento"**.
2. Preencha:

   - **Descrição** (obrigatória), ex.: "conta de luz".
   - **Valor** (maior que zero).
   - **Vencimento** (obrigatório).
   - **Favorecido** e **categoria** (opcionais).
   - **Forma de pagamento** (opcional).
   - **Conta bancária**: pode ficar como "definir na baixa".
   - **Observações** (opcional).

3. Clique em **"criar lançamento"**.

Os botões **+** ao lado de favorecido, categoria e conta bancária abrem o
cadastro para incluir um novo item sem sair do formulário.

## Contas Recorrentes e Parceladas

No formulário de novo lançamento do Contas a Pagar, marque **"repetir
mensalmente"** e informe a **quantidade** (até 60). Escolha o modo:

- **Repetir o valor**: cria um lançamento por mês com o mesmo valor (ex.:
  aluguel de R$ 2.000,00 por 12 meses gera 12 lançamentos de R$ 2.000,00).
- **Dividir o valor total**: divide o valor informado em parcelas mensais (ex.:
  compra de R$ 1.200,00 em 3 vezes gera 3 parcelas de R$ 400,00).

Os lançamentos começam no vencimento informado e seguem mês a mês. Eles ficam
agrupados, o que permite excluir de uma vez as parcelas que ainda não foram
pagas.

## Dar Baixa (Pagar) e Estornar no Contas a Pagar

Para registrar que uma conta foi paga:

1. Clique no menu **⋯** da linha e escolha **"dar baixa"**.
2. Informe a **data do pagamento**, a **conta bancária** e a **forma de
   pagamento**.
3. Confirme. O lançamento passa para a situação **pago**.

Para desfazer uma baixa, use **⋯ → "estornar baixa"**. O lançamento volta para
pendente ou vencido e a data de pagamento é removida.

## Editar e Excluir no Contas a Pagar

- **Editar**: menu **⋯ → "editar"**. Em lançamentos já pagos, a forma de
  pagamento e a conta bancária ficam bloqueadas (estorne a baixa para alterar).
- **Excluir**: menu **⋯ → "excluir"**. Só é possível excluir lançamentos que
  ainda não foram pagos; a exclusão não pode ser desfeita.
- **Excluir todas as não pagas**: em lançamentos recorrentes ou parcelados,
  remove todas as parcelas não pagas do mesmo grupo. Parcelas pagas precisam
  ser estornadas antes.

## Cadastros do Contas a Pagar (Favorecidos, Contas e Categorias)

Clique em **"cadastros"** na tela de Contas a Pagar para gerenciar:

- **Favorecidos**: para quem a loja paga. Tipos: fornecedor, funcionário ou
  outros.
- **Contas**: contas bancárias de onde sai o pagamento. Tipos: conta corrente,
  poupança, caixa ou outros.
- **Categorias**: classificação das despesas (ex.: aluguel, energia,
  mercadorias).

## Compra de Mercadoria no Contas a Pagar

Ao registrar uma **entrada de estoque**, marque **"esta entrada é uma compra de
produtos"**. Depois de confirmar a movimentação, o sistema pergunta se deseja
**lançar no Contas a Pagar**. Nessa etapa você define favorecido, valor total,
categoria, vencimento, número de parcelas, modo (dividir o valor total ou
repetir o valor), forma de pagamento e conta bancária.

Esses lançamentos aparecem no Contas a Pagar com a origem **"estoque"**,
vinculados à movimentação de estoque.

## Exportar PDF do Financeiro

Nas telas de Contas a Receber e Contas a Pagar, o botão **"exportar PDF"** gera
um relatório com os filtros aplicados (período, cliente ou favorecido,
situação etc.) e os totais. O PDF é limitado a 5.000 lançamentos; se o período
tiver mais do que isso, reduza o intervalo de datas para exportar tudo.
