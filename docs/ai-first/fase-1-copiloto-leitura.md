# Fase 1 — Copiloto de leitura

Objetivo: o assistente passa a responder perguntas sobre os dados reais da
loja ("quanto vendi esse mês?", "o que vence essa semana?", "o que está
parado no estoque?"), além das dúvidas de uso que já respondia. Nada é
gravado pela IA nesta fase: todas as ferramentas são somente leitura.

## Decisões

- **Ferramentas tipadas, não text-to-SQL.** Cada ferramenta é uma função
  do backend com parâmetros validados que recebe `tenantSlug` e fuso do
  tenant a partir da sessão. O modelo nunca escolhe o tenant nem escreve SQL.
- **Provedor continua OpenRouter** (API compatível com OpenAI, com `tools`).
  O modelo do agente é configurável por `OPENROUTER_AGENT_MODEL`; se ausente,
  usa `OPENROUTER_CHAT_MODEL`. Recomendado: um modelo com bom tool calling
  (ex.: Claude Haiku/Sonnet), pois modelos gratuitos tendem a falhar nisso.
- **Valores em reais nas respostas das ferramentas.** O banco guarda
  centavos; as ferramentas convertem para reais para o modelo não errar
  a conversão.
- **Histórico salvo no banco do tenant**, por usuário. Cada usuário vê só
  as próprias conversas.
- **Erros de ferramenta voltam para o modelo** como resultado (ex.: "data
  inválida"), em vez de derrubar a requisição; ele pode corrigir e tentar de novo.

## Ferramentas

| Nome | O que responde | Fonte |
| --- | --- | --- |
| `buscar_ajuda` | Como usar o sistema | RAG existente (`backend/knowledge`) |
| `resumo_vendas` | Faturamento, nº de vendas, ticket médio, por dia | `sale` (finalizadas, não canceladas) |
| `produtos_mais_vendidos` | Ranking por quantidade ou faturamento | `sale_items` + `sale` |
| `consultar_estoque` | Saldo, preços, margem; busca por nome; estoque baixo | `product` + `stock_movement` |
| `produtos_parados` | Itens com saldo e sem venda há N dias | `product` + `sale_items` |
| `contas_a_pagar` | Pendentes, pagas, vencidas, totais | `PayablesService.getPayables` |
| `recebimentos` | Recebido/estornado por forma de pagamento | `ReceivablesService.getReceivables` |
| `caixa_atual` | Situação do caixa atual | `CashService.currentCash` |
| `buscar_clientes` | Clientes, nº de compras, total gasto, última compra | `client` + `sale` |

## Loop do agente

1. Carrega as últimas 20 mensagens da conversa e monta o prompt de sistema
   com nome da loja, data de hoje e fuso do tenant.
2. Chama o modelo com as ferramentas. Se ele pedir ferramentas, executa
   cada uma, anexa os resultados (truncados em ~12 mil caracteres) e repete.
3. Para em até 6 rodadas. Salva a mensagem do usuário, as chamadas de
   ferramenta e a resposta final.

## Dados (migração do tenant `0014`)

- `assistant_conversation`: `id`, `title`, auditoria, timestamps.
- `assistant_message`: `id`, `conversation_id`, `role`
  (`user` | `assistant` | `tool`), `content`, `tool_calls` (JSON),
  `tool_call_id`, `tool_name`, timestamps.

A migração só cria tabelas novas; não altera dados existentes.

## API

- `POST /tenant/assistant/chat` `{ message, conversationId? }` →
  `{ conversationId, response, toolsUsed, sources }`
- `GET /tenant/assistant/conversations`
- `GET /tenant/assistant/conversations/:conversationId`
- `DELETE /tenant/assistant/conversations/:conversationId` (soft delete)

## Frontend

- Lista de conversas ao lado do chat, "Nova conversa" e exclusão.
- Selos sob a resposta indicando o que foi consultado ("Vendas", "Estoque"…).
- Sugestões iniciais com perguntas sobre dados.

## Fora do escopo (próximas fases)

- Ações que gravam dados (Fase 2, com confirmação).
- Streaming da resposta.
- Leitura de fotos/XML (Fase 3).

## Verificação

- `bun test` no backend: ferramentas rodando contra um banco de tenant
  temporário migrado, e o loop do agente com um provedor falso.
- `bun run --cwd frontend typecheck`, `lint` e `test`.
