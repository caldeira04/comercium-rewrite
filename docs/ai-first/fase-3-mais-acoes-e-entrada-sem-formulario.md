# Fase 3 — Mais ações, análises e entrada sem formulário

Continua a Fase 2. Três frentes:

1. **Mais ações com confirmação**, usando serviços que já existem.
2. **Análises e relatórios** que ficam melhores em linguagem natural.
3. **Entrada sem formulário**: lista colada, lote, XML de NF-e e foto de
   boleto.

Ficam de fora, até termos dados da Fase 2 em produção: cancelar venda,
estornar pagamento de venda, venda pelo chat e fechar caixa.

## Ordem proposta

| Etapa | O que entra | Risco | Migração |
| --- | --- | --- | --- |
| 1 | Análises e relatórios (só leitura) | baixo | não |
| 2 | Ações simples + melhorias no cartão | baixo | não |
| 3 | Cartão em lote: preços, produtos colados, várias contas | médio | não |
| 4 | Anexos e XML de NF-e | médio | sim (`assistant_attachment`) |
| 5 | Foto/PDF de boleto | médio | não (usa a da etapa 4) |

Cada etapa vai para produção sozinha. As etapas 1, 2 e 3 não dependem
umas das outras. A 4 usa o cartão em lote da 3, e a 5 usa os anexos da 4.

## Etapa 1 — Análises e relatórios

### Novas ferramentas de leitura

| Nome | Pergunta que responde | Como calcula |
| --- | --- | --- |
| `sugestao_recompra` | "o que preciso recomprar essa semana?" | Média de venda diária nos últimos N dias (padrão 30) × dias de cobertura desejados (padrão 14) − saldo atual. Lista quanto comprar e em quantos dias acaba. |
| `clientes_inativos` | "quais clientes sumiram?" | Clientes cuja última compra foi há mais de N dias (padrão 60), ordenados pelo total gasto antes de sumir. |
| `rentabilidade_produtos` | "o que dá mais lucro?", "o que está me custando dinheiro parado?" | Lucro bruto no período, giro (vendido ÷ saldo médio) e capital parado. Ordena por lucro por real investido em estoque. |

As três seguem o padrão das ferramentas da Fase 1: argumentos validados,
valores em reais e testes contra banco temporário. A divergência de saldo
de estoque com as telas (movimentações excluídas, apontada na Fase 1)
afeta `sugestao_recompra`. Vale corrigir as telas antes ou junto.

### Relatórios para baixar

- Ferramenta `gerar_relatorio` com `tipo` (`contas_a_pagar` |
  `recebimentos`), período e filtros (situação, favorecido, categoria).
- Ela não gera arquivo no servidor. Devolve um **anexo de download**:
  `{ tipo, filtros, titulo }`, salvo junto da resposta como as ações.
- O frontend mostra um botão "Baixar PDF" sob a resposta. Ele chama os
  endpoints de exportação que já existem (`/payables/export`,
  `/receivables/export`) e os geradores `generatePayablesPdf` e
  `generateReceivablesPdf`. É o mesmo PDF da tela.
- Na API, a resposta do chat ganha `downloads: { tipo, filtros, titulo }[]`.
  Para não precisar de migração, eles são guardados no conteúdo da mensagem
  `tool` e lidos de volta ao abrir a conversa.

## Etapa 2 — Ações simples

| Ferramenta | Serviço | Observações |
| --- | --- | --- |
| `sangria_suprimento` | `CashService.createCashMovement` (`drop`/`topup`) | Exige caixa aberto (`currentCash`). Na sangria, avisa se o valor passa do saldo esperado. |
| `entrada_estoque` | `StockPurchaseService.createStockPurchase` | "Chegaram 48 latas por R$ 180, vence dia 15": um cartão registra a entrada e, opcionalmente, a conta a pagar. Produto procurado por nome ou código de barras. |
| `alterar_produto` | `ProductsService.updateProduct` | Preço de venda, custo, nome, código, categoria. O cartão mostra o valor atual ao lado do novo e a margem resultante. |
| `editar_cliente` | `ClientService.editClient` | Cliente encontrado por `buscar_clientes` (já devolve `id`). Mostra antes e depois. Bloqueia o "Consumidor Final". |
| `estornar_baixa` | `PayablesService.reversePayable` | Para "desfaz o pagamento da conta de luz". A conta vem de `contas_a_pagar` com situação `paid`. |
| `cadastrar_favorecido` | `PayeesService.createPayee` | Nome, tipo, documento, contato. |
| `cadastrar_categoria_despesa` | `ExpenseCategoriesService.createExpenseCategory` | Só o nome. |

### Melhorias no cartão

- **Campo booleano** (caixa de seleção). Usado em "registrar conta a
  pagar" na entrada de estoque e no item abaixo.
- **Criar o favorecido junto.** Em `lancar_conta_a_pagar`, se o favorecido
  não existir, o cartão oferece "criar favorecido 'Enel' ao confirmar". Na
  confirmação, cria o favorecido e lança a conta. Evita duas ações
  seguidas para um pedido comum.
- **Antes e depois.** As ações de edição guardam os valores atuais em
  `previousValues` e o cartão mostra a diferença ("R$ 6,90 → R$ 7,50").
- **Busca de produto por nome.** Mesmo esquema de favorecido: um resultado
  usa, vários devolve as opções ao modelo, nenhum devolve erro (produto
  precisa existir; para criar, usar `cadastrar_produto`).

## Etapa 3 — Cartão em lote

Um tipo novo de campo, **tabela**, com linhas editáveis e uma caixa por
linha para incluir ou não. Um único Confirmar executa todas as linhas
marcadas.

| Ferramenta | Pedido típico | Execução |
| --- | --- | --- |
| `alterar_precos_em_lote` | "aumenta 5% todas as cervejas", "arredonda os preços para ,90" | Prévia por produto: preço atual, novo e margem. |
| `cadastrar_produtos_em_lote` | Usuário cola uma lista ("Heineken 350ml 6,90 custo 4,10…") | O modelo estrutura as linhas; o cartão marca as que parecem repetidas (nome ou código já cadastrado). |
| `lancar_contas_em_lote` | "lança aluguel 2.500 dia 5, internet 120 dia 10 e contador 450 dia 15" | Uma linha por conta, com os mesmos campos da ação única. |

- **Tudo ou nada.** O lote roda numa transação: se uma linha falha,
  nenhuma é gravada e o cartão aponta a linha com erro. Para isso entram
  funções em lote nos serviços (`updateProductPrices`,
  `createProducts`), reaproveitando as validações das versões unitárias.
- Limite de 50 linhas por cartão.
- O registro em `assistant_action` guarda as linhas executadas e os ids
  criados (`result_reference_id` passa a aceitar uma lista em JSON).

## Etapa 4 — Anexos e XML de NF-e

### Anexos no chat

- Botão de anexo no chat. Aceita XML, PDF, JPG e PNG, até 5 MB, um
  arquivo por mensagem.
- `POST /tenant/assistant/attachments` (multipart) grava o arquivo em
  `<data>/tenants/<tenant>/attachments/<id>` e uma linha em
  `assistant_attachment` (`id`, `conversation_id`, `file_name`,
  `mime_type`, `size`, `sha256`, auditoria). O chat recebe
  `attachmentId` junto da mensagem.
- Os arquivos ficam fora do banco. O backup do deploy precisa passar a
  incluir a pasta `attachments`.

### XML de NF-e

- **Leitura determinística, sem IA.** O backend extrai do XML: emitente
  (CNPJ, nome), número e data da nota, itens (código, descrição, EAN,
  quantidade, valor unitário), total e duplicatas (vencimentos e valores).
  A IA só recebe o resultado já estruturado.
- **Casamento com o cadastro:**
  - emitente → favorecido pelo CNPJ (`payee.document`); se não houver,
    o cartão oferece criar
  - item → produto pelo EAN; sem EAN, pelo nome; sem par, a linha vem
    marcada como "produto novo" com os dados da nota
- **Cartão em lote** (etapa 3) de compra de estoque: uma linha por item,
  e a conta a pagar sai das duplicatas (uma parcela por duplicata).
- Evita nota duplicada: guarda a chave de acesso da NF-e e avisa se ela
  já foi importada.
- Precisa de uma dependência para ler XML (ex.: `fast-xml-parser`).

## Etapa 5 — Foto ou PDF de boleto

- A imagem (ou a primeira página do PDF) vai para um modelo com visão,
  configurado por `OPENROUTER_VISION_MODEL`, que extrai beneficiário,
  valor, vencimento e linha digitável.
- **Conferência sem IA.** A linha digitável carrega o valor e o
  vencimento. O backend calcula os dois a partir dela e, se divergirem do
  que o modelo leu, mostra um aviso no cartão.
- O resultado vira o cartão de `lancar_conta_a_pagar`, com a linha
  digitável nas observações.
- A imagem é enviada ao provedor de IA, o que precisa estar claro na tela,
  como já está para as perguntas.

## Mudanças no prompt de sistema

- Lista atualizada das ações e quando usar cada uma.
- Pedidos com vários itens viram uma ação em lote, nunca várias ações.
- Antes de editar ou dar baixa, encontrar o registro com uma ferramenta de
  leitura; se houver mais de um candidato, perguntar.
- Para análises, dizer o período e o critério usados (ex.: "média dos
  últimos 30 dias").

## Verificação

- `bun test` no backend para cada ferramenta e ação nova, incluindo:
  lote com uma linha inválida (nada gravado), XML real de NF-e (com e sem
  EAN, com duplicatas), nota já importada, linha digitável divergente.
- `scripts/compare-agent-models.ts` ganha casos de cada etapa, como "o
  que preciso recomprar?", "aumenta 5% as cervejas", uma lista colada
  de produtos e o PDF de contas pagas do mês passado.
- Teste manual de cada cartão novo no navegador, com uma cópia dos dados.

## Decisões pendentes

1. Ordem das etapas: começar pelas análises e relatórios (etapa 1), que
   são só leitura, ou pelas ações (etapa 2)?
2. Podemos adicionar `fast-xml-parser` (ou outra biblioteca) para o XML?
3. Anexos: por quanto tempo guardar os arquivos? (Sugestão: enquanto a
   conversa existir; ao excluir a conversa, apagar os arquivos.)
4. Etapa 5: qual modelo de visão usar? Vale rodar o script de comparação
   com algumas fotos reais de boleto antes de escolher.
