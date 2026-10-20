# Pagamentos

O módulo de **Pagamentos** gerencia as formas de recebimento das vendas.
Os pagamentos são registrados durante o fluxo de finalização da venda no PDV.

## Formas de Pagamento

O Comercium suporta as seguintes formas de pagamento:

| Forma    | Descrição                         |
| -------- | --------------------------------- |
| Dinheiro | Pagamento em espécie              |
| Débito   | Cartão de débito                  |
| Crédito  | Cartão de crédito                 |
| PIX      | Transferência instantânea         |
| Cheque   | Cheque (voucher)                  |

## Como Registrar um Pagamento

1. No PDV, com uma venda em andamento, pressione **F8** ou **F10**.
2. Informe o **valor** recebido.
3. Selecione a **forma de pagamento**.
4. Clique em **"adicionar pagamento"** ou pressione **Enter**.

### Pagamento Parcial

É possível receber pagamentos parciais. Exemplo:

- Venda de R$ 100,00.
- Cliente paga R$ 50,00 em dinheiro.
- Depois paga mais R$ 50,00 no crédito.

A venda só é quitada quando o total pago for igual ou superior ao total da venda.

## Como os Pagamentos Afetam o Caixa

Cada pagamento registrado gera automaticamente uma **movimentação de entrada**
no caixa atual, vinculada à venda. Isso significa que:

- O saldo do caixa é atualizado em tempo real.
- O relatório de caixa mostra as entradas por forma de pagamento.
- Cada pagamento tem uma referência à venda e ao caixa.

## Status do Pagamento

Cada pagamento possui um status:

- **Pago** (paid): valor recebido com sucesso.
- **Pendente** (pending): aguardando confirmação.
- **Cancelado** (cancelled): pagamento cancelado.
- **Estornado** (refunded): pagamento devolvido.

Atualmente, todos os pagamentos são criados com status "pago".
