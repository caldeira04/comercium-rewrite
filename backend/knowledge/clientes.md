# Clientes

O módulo de **Clientes** permite cadastrar e gerenciar os clientes da loja.
Vincular clientes às vendas ajuda a gerar relatórios e acompanhar o histórico
de compras.

## Cadastrar Cliente

Você pode cadastrar clientes de duas formas:

### Pela Página de Clientes

1. Acesse **Clientes** na barra lateral.
2. Clique em **"novo cliente"**.
3. Preencha os campos:

   - **Nome**: nome do cliente (obrigatório).
   - **CPF/CNPJ**: documento do cliente (opcional).
   - **E-mail**: endereço de e-mail (opcional).
   - **Telefone**: telefone para contato (opcional).

4. Clique em **"cadastrar cliente"**.

### Durante a Venda (PDV)

1. No PDV, clique no campo de busca de clientes.
2. Digite parte do nome — se o cliente não for encontrado, clique em
   **"novo cliente"** na lista suspensa.
3. Preencha os dados e salve. O cliente é vinculado à venda automaticamente.

## Consultar Clientes

A página de clientes exibe uma tabela com todos os clientes cadastrados:

- **ID**: identificador numérico.
- **Nome**: nome do cliente.
- **Telefone**: telefone de contato.
- **Documento**: CPF ou CNPJ.
- **E-mail**: endereço de e-mail.

Use o campo de **busca** para localizar clientes por nome, documento, telefone
ou e-mail.

## Editar Cliente

1. Clique no cliente na lista.
2. No painel lateral, clique em **"editar cliente"**.
3. Altere os campos desejados.
4. Clique em **"atualizar cliente"**.

> **Atenção**: o cliente "Consumidor Final" (ID 0) é um cliente padrão do
> sistema e não pode ser editado ou excluído.

## Excluir Cliente

No painel de detalhes, clique em **"excluir"**. O cliente é removido
logicamente (não aparece mais nas listas, mas o registro permanece no banco
para manter o histórico de vendas).
