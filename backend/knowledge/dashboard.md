# Dashboard

O **Dashboard** é a tela inicial do sistema após o login. Ela oferece uma
visão geral do estado atual da loja com indicadores e atalhos.

## Indicadores Principais

### Caixa Atual

Mostra o status do caixa do dia:

- **Aberto**: caixa pronto para receber vendas.
- **Fechado**: caixa encerrado.
- **Sem caixa**: nenhum caixa foi aberto ainda.

Exibe também o saldo esperado do caixa.

### Venda em Andamento

Mostra se há uma venda em andamento no PDV:

- Valor total da venda atual.
- Quantidade de itens lançados.
- Se não houver venda, exibe "nenhuma" e "PDV livre".

### Vendas Hoje

Resumo das vendas do dia atual:

- Valor total faturado no dia.
- Quantidade de vendas realizadas.

### Produtos Críticos

Número de produtos com estoque zerado ou negativo:

- Total de produtos cadastrados.
- Quantidade de produtos que precisam de reposição.

## Atalhos Rápidos

O dashboard oferece atalhos para as páginas mais utilizadas:

- **Catálogo de Produtos**
- **Histórico de Vendas**
- **Clientes**
- **Abrir PDV** (vai direto para o Ponto de Venda)
- **Gerenciar Caixa** (vai para o caixa atual)

## Alertas de Estoque

O card "Alertas de Estoque" lista os produtos com estoque zerado, facilitando
a identificação de itens que precisam ser repostos.

## Últimas Vendas

O card "Últimas Vendas" mostra as vendas mais recentes do dia, com o nome do
cliente e o valor de cada uma.
