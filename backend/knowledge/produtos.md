# Produtos

O módulo de **Produtos** gerencia o catálogo de itens vendidos pela loja,
incluindo preços, código de barras e controle de estoque.

## Cadastrar Produto

1. Acesse **Estoque → Catálogo** na barra lateral.
2. Clique em **"novo produto"**.
3. Preencha os campos:

   - **Nome**: nome do produto (obrigatório).
   - **GTIN / Código de Barras**: código de barras do produto (opcional).
     Útil para escaneamento rápido no PDV.
   - **Preço de Custo**: quanto você pagou pelo produto (em reais).
   - **Preço de Venda**: por quanto o produto é vendido (em reais).

4. Clique em **"salvar produto"**.

> **Importante**: o produto com ID 0 é um "produto genérico" usado no PDV para
> vendas de itens não cadastrados. Ele não pode ser editado ou excluído.

## Catálogo de Produtos

A página do catálogo lista todos os produtos cadastrados com as colunas:

- **ID**: identificador numérico.
- **Produto**: nome do produto.
- **GTIN**: código de barras (se cadastrado).
- **Estoque**: saldo atual em estoque (calculado com base nas movimentações).
- **Custo**: preço de custo.
- **Venda**: preço de venda.
- **Margem**: diferença entre venda e custo.

Use o campo de **busca** para filtrar por nome ou GTIN.

### Indicadores Visuais

- **Estoque negativo ou zero** aparece em vermelho.
- **Margem negativa** (venda menor que custo) aparece em vermelho.

## Editar Produto

1. Clique no produto na lista.
2. No painel lateral, clique em **"editar produto"**.
3. Altere os campos desejados.
4. Clique em **"salvar alterações"**.

> Produtos com estoque ou que já foram vendidos podem ter seus preços
> atualizados normalmente. O ID 0 (produto genérico) não pode ser editado.

## Excluir Produto

No painel de detalhes do produto, clique em **"excluir"**. O produto é removido
logicamente (não aparece mais nas listas, mas o registro permanece no banco).

## Movimentar Estoque

1. No painel de detalhes do produto, clique em **"movimentar estoque"**.
2. Selecione o **tipo** de movimentação:
   - **Entrada**: adiciona unidades ao estoque.
   - **Saída**: remove unidades do estoque.
   - **Ajuste**: define o estoque para um valor específico.
   - **Transferência**: movimentação entre lojas (se aplicável).
3. Informe a **quantidade**.
4. Adicione um **motivo** (opcional, mas recomendado).
5. Confirme.

> As movimentações de estoque também são geradas automaticamente quando uma
> venda é finalizada (os produtos saem do estoque).
