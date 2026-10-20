# Vendas

O módulo de **Vendas** é o coração do PDV (Ponto de Venda). Ele permite criar
vendas, adicionar produtos, aplicar descontos, vincular clientes e registrar
pagamentos.

## PDV (Venda Diária)

Acesse **Vendas → PDV** para iniciar uma nova venda.

### Iniciar Venda

Pressione a tecla **F1** para criar uma nova venda. Uma venda em andamento
aparece no painel direito com os detalhes.

### Adicionar Produtos

1. Com a venda criada, pressione **F2** para focar na barra de busca.
2. Digite o nome do produto ou escaneie o código de barras (GTIN).
3. Selecione o produto na lista.
4. No painel direito, ajuste a **quantidade** (teclas **+** e **-** ) e o
   **desconto** se houver.
5. Pressione **Enter** para confirmar a adição.

**Produto Genérico**: quando o produto não está cadastrado, clique em
"adicionar produto genérico" e informe o valor de venda manualmente.

### Editar Item

1. Clique no ícone de lápis ao lado do item na tabela.
2. Altere quantidade, desconto ou valor unitário.
3. Confirme com **Enter** ou clicando em "salvar alterações".

### Remover Item

1. Clique no ícone de lixeira ao lado do item.
2. O item é marcado como excluído (exclusão lógica).

### Reativar Item

1. Ative "mostrar excluídos" para ver itens removidos.
2. Clique em **"reativar"** ao lado do item.

### Vincular Cliente

1. No painel direito, use o campo de busca de clientes.
2. Digite o nome do cliente e selecione-o.
3. Para criar um novo cliente na hora, clique em "novo cliente" na lista.

### Atalhos de Teclado

| Tecla           | Ação                               |
| --------------- | ---------------------------------- |
| F1              | Iniciar nova venda                 |
| F2              | Focar na busca de produtos         |
| F3              | Editar último item adicionado      |
| F4              | Focar na busca de cliente          |
| F8 / F10        | Abrir diálogo de pagamento         |
| Enter           | Confirmar adição/edição de item    |
| + / -           | Aumentar/diminuir quantidade       |
| Escape          | Cancelar seleção / sair da busca   |
| Ctrl+Backspace  | Limpar campo de busca              |

### Finalizar Venda (Pagamento)

1. Pressione **F8** ou **F10** para abrir o diálogo de pagamento.
2. Informe o **valor** recebido (pode ser parcial).
3. Selecione a **forma de pagamento**:
   - Dinheiro
   - Débito
   - Crédito
   - PIX
   - Cheque
4. Confirme clicando em "adicionar pagamento".

Se o valor pago for igual ou superior ao total, a venda é **quitada**
automaticamente e os itens saem do estoque.

## Histórico de Vendas

Acesse **Vendas → Histórico** para consultar todas as vendas realizadas.

A tabela mostra:

- ID da venda
- Data
- Cliente
- Quantidade de itens
- Total pago
- Total da venda

Clique em uma venda para ver detalhes no painel lateral: cliente, itens,
produtos, totais e status (quitada ou pendente).

## Relatório de Vendas

Acesse **Vendas → Rel. Vendas** para ver um resumo comercial:

- Número total de vendas
- Total vendido (valor bruto)
- Total pago
- Ticket médio (total vendido / número de vendas)
- **Produtos mais vendidos**: ranking dos 10 produtos com maior faturamento.
- **Clientes com maior compra**: ranking dos 10 clientes que mais compraram.
