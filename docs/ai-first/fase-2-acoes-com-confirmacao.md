# Fase 2 — Ações com confirmação

Objetivo: o assistente passa a **preparar** ações que gravam dados ("lança
a conta de luz de R$ 320 para dia 10", "dá baixa no aluguel de outubro",
"cadastra a cliente Maria, telefone …"). A ação aparece como um cartão no
chat e **só é executada quando o usuário clica em Confirmar**. Nada é
gravado pela IA sem esse clique.

## Decisões

- **A IA propõe, o usuário executa.** As ferramentas de escrita não chamam
  o serviço: validam os argumentos, resolvem referências, montam uma prévia
  e gravam uma ação pendente. A execução acontece numa rota separada,
  chamada pelo botão do cartão, com o `userId` da sessão.
- **A execução usa os serviços existentes** (`createPayable`, `payPayable`,
  `createClient`, `createProduct`…). Nenhuma regra de negócio é duplicada
  e nada de SQL gerado pelo modelo.
- **Validação em dois momentos.** Na proposta (para o modelo corrigir
  argumentos ruins antes de mostrar o cartão) e de novo na confirmação
  (os dados podem ter mudado entre um e outro, ex.: conta já paga).
- **A tabela de ações é o registro de auditoria.** Cada linha guarda quem
  pediu, em qual conversa, o que foi proposto, quem confirmou ou recusou,
  quando, e o id do registro criado. A tabela `log` atual (só
  `reference_type`/`reference_id`, sem uso no código) não é usada.
- **Valores em reais na conversa, centavos no banco.** O modelo passa
  reais (`320.5`); a ferramenta converte para centavos inteiros, que é o
  que os serviços exigem (`normalizeAmount` recusa não inteiros). O cartão
  também trabalha em centavos, como os formulários existentes.
- **Referências por nome, resolvidas no backend.** O modelo passa
  "favorecido: Enel", "categoria: Energia"; a ferramenta busca sem
  diferenciar maiúsculas. Achou um: usa. Achou vários: devolve as opções
  ao modelo para ele perguntar ao usuário. Não achou: o campo fica vazio
  e o cartão avisa. Nesta fase a IA não cria favorecido/categoria de
  carona.
- **Uma ação por vez; o cartão expira.** Pendente por até 30 minutos
  ou até a próxima mensagem do usuário na conversa, o que vier primeiro.
  Se o modelo pedir duas ações na mesma resposta, a segunda volta para ele
  como erro. Pedidos em lote ("lança essas 5 contas") ficam para depois.
- **Edição direta no cartão.** Os campos vêm do backend (tipo, rótulo,
  obrigatório, opções de seleção) e o frontend desenha um formulário
  genérico. Na confirmação, o backend aceita só campos editáveis, confere o
  tipo de cada um e valida tudo de novo. Campos só de leitura (ex.: a conta
  na baixa) não podem ser trocados pelo cartão.
- **Qualquer usuário do tenant pode usar as ações**, como já pode usar as
  telas. Como as conversas são por usuário, cada um confirma os cartões das
  próprias conversas.

## Ações da primeira leva

Escolhidas por serem frequentes, reversíveis pela própria tela e de baixo
risco.

| Ferramenta | Serviço | Desfazer pela tela |
| --- | --- | --- |
| `lancar_conta_a_pagar` | `PayablesService.createPayable` (com parcelas) | Excluir lançamento |
| `baixar_conta_a_pagar` | `PayablesService.payPayable` | Estornar (`reversePayable`) |
| `cadastrar_cliente` | `ClientService.createClient` | Excluir cliente |
| `cadastrar_produto` | `ProductsService.createProduct` | Excluir produto |

Para `baixar_conta_a_pagar` o modelo precisa do id da conta: a ferramenta
de leitura `contas_a_pagar` passa a devolver `id` em cada conta.

### Segunda leva (depois de medir a primeira)

- `sangria_suprimento` → `CashService.createCashMovement` (`drop`/`topup`),
  exige caixa aberto.
- `entrada_estoque` → `StockService.createStockMovement` (`in`, com motivo).
- `alterar_preco_produto` → `ProductsService.updateProduct`.

### Fora do escopo

Vendas, cancelamento de venda, estornos de pagamento, fechamento de caixa,
exclusões de qualquer tipo e ajuste de estoque (`adjustment` sobrescreve
o saldo). São ações com efeito em dinheiro ou difíceis de desfazer.

## Fluxo

1. Usuário: "lança a conta de luz de 320 reais pra dia 10".
2. O modelo chama `lancar_conta_a_pagar` com `descricao`, `valor`,
   `vencimento`, `favorecido?`, `categoria?`, `parcelas?`.
3. A ferramenta valida, resolve referências e grava em `assistant_action`
   com status `proposed`. Devolve ao modelo `{ acaoId, status:
   "aguardando_confirmacao", previa }`.
4. O prompt de sistema diz: depois de propor, descreva em uma frase o que
   será feito e peça a confirmação no cartão; **nunca diga que já foi
   feito**. O loop encerra a rodada logo após uma proposta.
5. A resposta do chat inclui `actions` e o frontend desenha o cartão. O
   usuário pode editar os campos.
6. Confirmar → `POST /tenant/assistant/actions/:id/confirm` com os valores
   do cartão. Confere dono, status `proposed` e validade, junta os valores
   editados e valida. Valor inválido devolve erro e o cartão continua
   pendente para correção. Válido: troca para `executing` só se ainda
   estiver `proposed` (atualização condicional), chama o serviço e grava
   `executed` com o id criado. Erro do serviço → `failed` com a mensagem,
   mostrada no cartão.
7. A mensagem `tool` da proposta é reescrita com o desfecho (executada com
   os valores finais, recusada, expirada ou falhou), para que a IA saiba na
   próxima pergunta o que aconteceu.

O passo 6 é idempotente: clicar duas vezes ou repetir a requisição não
executa de novo, porque o status já saiu de `proposed`.

## Dados (migração do tenant `0015`)

`assistant_action`:

- `id`, `conversation_id`, `message_id` (a chamada de ferramenta que propôs)
- `type` (`lancar_conta_a_pagar` …)
- `status`: `proposed` | `executing` | `executed` | `rejected` |
  `expired` | `failed`
- `values` (JSON em centavos; depois da confirmação, os valores executados)
- `warnings` (JSON com os avisos mostrados no cartão)
- `expires_at`, `decided_at`, `decided_by_user_id`
- `result_reference_type`, `result_reference_id`, `error`
- auditoria e timestamps

A migração só cria a tabela nova.

## API

- `POST /tenant/assistant/chat` → passa a devolver também
  `actions` (o cartão proposto nesta resposta, se houver).
- `GET /tenant/assistant/conversations/:id` → cada resposta traz suas ações
  com o status atual.
- `POST /tenant/assistant/actions/:actionId/confirm` `{ values? }` → ação
  atualizada
- `POST /tenant/assistant/actions/:actionId/reject` → ação atualizada

Cada ação devolvida traz `fields` (definição dos campos com opções),
`values`, `warnings`, `status`, `expiresAt`, `error` e `result`
(`{ referenceType, referenceId }` depois de executada).

## Frontend

- Cartão de ação sob a resposta (`components/assistant/action-card.tsx`):
  título ("Lançar conta a pagar"), formulário editável, avisos ("não
  encontrei favorecido…, o campo ficou em branco"), validade e botões
  **Confirmar** / **Cancelar**. Erros de validação aparecem no cartão.
- Estados do cartão: pendente, executando, feito (com link para a tela
  correspondente), cancelado, expirado, falhou.
- Ao recarregar a conversa, os cartões voltam no estado atual.

## Segurança

- Só quem criou a conversa confirma as ações dela; o tenant vem da sessão.
- O conteúdo das ferramentas de leitura continua sendo tratado como dado.
  Mesmo que um texto no banco tente induzir uma ação, ela só vira cartão e
  depende do clique.
- O limite de perguntas por minuto continua valendo. Confirmar é um clique
  do usuário, como salvar um formulário, e não passa pelo modelo.

## Medição

O objetivo de longo prazo é saber em quais ações dá para dispensar a
confirmação. Por tipo de ação: quantas foram propostas, confirmadas,
recusadas (sinal de erro da IA), expiradas e que falharam. Uma consulta
simples sobre `assistant_action` basta; tela de métricas fica para depois.

## Verificação

- `bun test` no backend: proposta com argumentos válidos e inválidos,
  resolução de referências (um, vários, nenhum), confirmação executando o
  serviço, confirmação dupla, ação expirada, ação de outro usuário,
  rejeição, e o loop parando após a proposta (modelo falso).
- `scripts/compare-agent-models.ts` tem dois casos novos: propor a conta
  de luz com valor e vencimento certos sem dizer que já lançou, e não
  preparar ação para "cancela a última venda".
- `bun run --cwd frontend typecheck` e `test`; teste manual dos estados do
  cartão.

## Decisões tomadas

- Edição direta no cartão: sim.
- Primeira leva: as quatro ações acima.
- Validade do cartão: 30 minutos.
- Todos os usuários do tenant podem usar e confirmar ações.
