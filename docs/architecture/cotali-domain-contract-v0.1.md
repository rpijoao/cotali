# Cotali — Contrato de Domínio v0.1

**Versão:** 0.1  
**Data:** 2026-09-03  
**Status:** proposta técnica para validação  
**Relacionado:** [PRD do MVP](../product/cotali-mvp-prd.md)

## 1. Objetivo

Este documento define o vocabulário, as entidades, os comandos, os estados e as invariantes do Cotali. O contrato será a referência comum para app Android, app web, API, jobs, banco, PDF e testes.

O domínio não poderá depender de React, Expo, navegador, framework HTTP, provedor de autenticação ou fornecedor de IA.

## 2. Vocabulário do produto

### Serviço

Uma linha de trabalho prestado pelo autônomo.

Exemplos:

- troca de lâmpada;
- troca de tomada;
- troca de filtro.

O orçamento comum suporta até **5 linhas de serviço**.

### Material

Uma linha de recurso utilizado em um ou mais serviços.

Exemplos:

- 1 lâmpada;
- 4 tomadas;
- 5 caixas de som;
- 6 metros de fio;
- 10 metros de eletroduto.

O orçamento comum suporta até **10 linhas de material**. A quantidade de uma linha não aumenta a contagem de linhas.

### Orçamento

A intenção comercial editável do profissional, composta por cliente, serviços, materiais, condições, revisões e totais.

### Proposta

Uma revisão validada do orçamento apresentada ao cliente em PDF. A proposta não é alterada retroativamente quando uma nova revisão é criada.

### Pagamento

Um evento financeiro confirmado manualmente pelo profissional, integral, parcial ou vinculado a uma parcela.

### Recibo

Um documento comercial em PDF que registra um pagamento confirmado. Cada pagamento confirmado gera exatamente um recibo idempotente.

## 3. Limites do MVP

- uma conta possui um único usuário;
- uma conta pode ter vários clientes;
- um orçamento pertence a uma conta e a um cliente;
- um orçamento possui no máximo 5 linhas de serviço e 10 linhas de material no fluxo comum;
- o MVP trabalha com moeda BRL;
- pagamentos são confirmados manualmente;
- não existe gateway, cobrança automática ou emissão fiscal;
- o app Android é a primeira superfície autenticada publicada;
- o app web terá o mesmo contrato e fluxo funcional em uma etapa posterior;
- iOS não faz parte do lançamento inicial.

## 4. Entidades

### 4.1 Account

Representa a conta do autônomo.

Campos conceituais:

```text
id: AccountId
auth_subject: string
status: active | deletion_pending | deleted
created_at: UTC timestamp
updated_at: UTC timestamp
```

Invariantes:

- `auth_subject` é único;
- a conta é derivada da identidade autenticada;
- nenhum identificador enviado pelo cliente autoriza acesso a outra conta.

### 4.2 ProfessionalProfile

Dados usados na proposta e no recibo.

Campos conceituais:

```text
account_id: AccountId
display_name: string
phone: normalized phone
address: structured address
document_type: cpf | cnpj
document_value: protected string
logo_asset_id: AssetId | null
```

CPF/CNPJ e demais dados sensíveis terão política de criptografia, redaction e retenção definida pela camada de infraestrutura.

### 4.3 Client

Cliente do autônomo.

Campos conceituais:

```text
id: ClientId
account_id: AccountId
name: string
phone: normalized phone | null
document_type: cpf | cnpj | null
document_value: protected string | null
created_at: UTC timestamp
updated_at: UTC timestamp
deleted_at: UTC timestamp | null
```

O telefone deve ser armazenado em formato internacional normalizado para facilitar o fluxo de WhatsApp. O número nunca deve ser usado como prova de identidade.

### 4.4 Quote

Agregado principal do orçamento.

Campos conceituais:

```text
id: QuoteId
account_id: AccountId
client_id: ClientId
status: draft | ready_to_share | shared
payment_status: pending | partially_paid | paid
current_revision_id: QuoteRevisionId
payment_plan_id: PaymentPlanId | null
total_cents: integer
currency: BRL
created_at: UTC timestamp
updated_at: UTC timestamp
deleted_at: UTC timestamp | null
```

O estado comercial da proposta e o estado financeiro do orçamento são independentes. Um orçamento compartilhado pode estar pendente, parcialmente pago ou pago.

### 4.5 QuoteRevision

Versão imutável de uma proposta validada ou snapshot de uma alteração significativa.

Campos conceituais:

```text
id: QuoteRevisionId
quote_id: QuoteId
revision_number: positive integer
services: ServiceLine[]
materials: MaterialLine[]
conditions: QuoteConditions
subtotal_cents: integer
discount_cents: integer
total_cents: integer
source: manual | interpretation | mixed
created_at: UTC timestamp
finalized_at: UTC timestamp | null
```

Uma revisão finalizada não pode ser editada. Uma alteração posterior cria nova revisão.

### 4.6 ServiceLine

```text
id: ServiceLineId
description: non-empty string
quantity: DecimalQuantity
unit: string | null
unit_price_cents: integer | null
total_cents: integer | null
position: non-negative integer
provenance: Provenance[]
```

### 4.7 MaterialLine

```text
id: MaterialLineId
description: non-empty string
quantity: DecimalQuantity
unit: string
unit_price_cents: integer | null
total_cents: integer | null
position: non-negative integer
provenance: Provenance[]
```

Uma linha com preço ausente continua válida como rascunho, mas não pode entrar em uma proposta pronta para compartilhar se impedir o cálculo financeiro completo.

### 4.8 QuoteConditions

```text
payment_method: string | null
payment_plan_type: integral | parcial | parcelado
execution_deadline: structured deadline
valid_until: UTC date | null
notes: string | null
```

O contrato final de prazo, validade e condições temporais será refinado antes da migration inicial.

### 4.9 PaymentPlan

Plano financeiro associado ao orçamento.

```text
id: PaymentPlanId
quote_id: QuoteId
type: integral | parcial | parcelado
total_due_cents: integer
entry_cents: integer | null
installments: Installment[]
created_at: UTC timestamp
updated_at: UTC timestamp
```

Para `integral`, o plano possui um único valor devido. Para `parcial`, o plano permite pagamentos confirmados sem calendário obrigatório. Para `parcelado`, o plano possui parcelas planejadas com valor e vencimento.

### 4.10 Installment

```text
id: InstallmentId
payment_plan_id: PaymentPlanId
number: positive integer
amount_due_cents: positive integer
due_on: UTC date | null
status: pending | partially_paid | paid | overdue
```

No MVP, cada pagamento confirmado referencia no máximo uma parcela. O histórico de pagamentos continua independente do estado planejado da parcela.

### 4.11 Payment

Evento de pagamento informado manualmente.

```text
id: PaymentId
account_id: AccountId
quote_id: QuoteId
payment_plan_id: PaymentPlanId
installment_id: InstallmentId | null
amount_cents: positive integer
method: string
paid_at: UTC timestamp
status: pending | confirmed | voided
idempotency_key: string
created_at: UTC timestamp
confirmed_at: UTC timestamp | null
```

Um pagamento parcial pode não ter `installment_id`. Uma parcela confirmada deve apontar para a parcela correspondente.

### 4.12 Receipt

Snapshot comercial de um pagamento confirmado.

```text
id: ReceiptId
account_id: AccountId
quote_id: QuoteId
payment_id: PaymentId
source_revision_id: QuoteRevisionId
receipt_number: string
snapshot: immutable receipt payload
amount_paid_cents: positive integer
balance_remaining_cents: non-negative integer
pdf_asset_id: AssetId
status: issued | voided
void_reason: string | null
issued_at: UTC timestamp
voided_at: UTC timestamp | null
```

Restrições:

- `payment_id` é único;
- recibo só existe para pagamento confirmado;
- o snapshot não muda quando o orçamento é editado;
- anulamento não apaga o documento original.

### 4.13 AudioJob

```text
id: AudioJobId
account_id: AccountId
quote_id: QuoteId
client_mutation_id: MutationId
quote_revision_id: QuoteRevisionId | null
status: pending | uploading | transcribing | interpreting | completed | failed | cancelled
attempt_count: non-negative integer
error_code: string | null
created_at: UTC timestamp
updated_at: UTC timestamp
```

O áudio não será mantido indefinidamente por padrão. Retenção, consentimento e descarte serão definidos na infraestrutura.

### 4.14 InterpretationProposal

Resultado estruturado da IA.

```text
id: InterpretationProposalId
audio_job_id: AudioJobId
transcript: editable text
proposed_services: ServiceLine[]
proposed_materials: MaterialLine[]
ambiguities: Ambiguity[]
confidence: field-level metadata
status: proposed | accepted | rejected | superseded
created_at: UTC timestamp
```

Uma interpretação nunca altera o orçamento sem uma operação explícita de aceitação ou aplicação pelo usuário.

### 4.15 DeliveryAttempt

Registro de tentativa de entrega de documento.

```text
id: DeliveryAttemptId
account_id: AccountId
quote_id: QuoteId
document_type: proposal_pdf | receipt_pdf
channel: whatsapp | device_share | download
target_phone: normalized phone | null
status: created | started | completed | failed | cancelled
error_code: string | null
created_at: UTC timestamp
completed_at: UTC timestamp | null
```

`completed` significa que o mecanismo local confirmou a operação. Não significa confirmação de entrega da mensagem ao cliente.

## 5. Proveniência

Todo valor extraído por voz ou IA deve carregar metadados de origem:

```text
Provenance {
  source: transcript | manual
  transcript_span: start/end | null
  confidence: number | null
  confirmed_by_user: boolean
}
```

Preço, desconto, quantidade, prazo e forma de pagamento só podem ser considerados confirmados quando vierem da fala com origem válida ou forem informados/editados manualmente.

## 6. Comandos de domínio

As operações públicas do domínio serão comandos idempotentes, não edição arbitrária de JSON completo.

### Conta e cliente

```text
CreateAccount
UpdateProfessionalProfile
CreateClient
UpdateClient
DeleteClient
```

### Orçamento

```text
CreateQuote
CreateQuoteRevision
AddServiceLine
UpdateServiceLine
RemoveServiceLine
AddMaterialLine
UpdateMaterialLine
RemoveMaterialLine
UpdateQuoteConditions
ApplyInterpretationProposal
FinalizeQuoteRevision
ShareProposal
DeleteQuote
```

### Áudio e IA

```text
StartAudioJob
CancelAudioJob
RetryAudioJob
EditTranscript
AcceptInterpretationProposal
RejectInterpretationProposal
```

### Pagamentos e recibos

```text
CreatePaymentPlan
RecordPayment
ConfirmPayment
VoidPayment
IssueReceipt
VoidReceipt
```

`ConfirmPayment` deve ser atômico: confirma o pagamento, recalcula o saldo, atualiza o estado financeiro e cria ou garante o recibo correspondente.

## 7. Regras de estado

### 7.1 Orçamento

```text
draft → ready_to_share → shared
```

- `draft`: ainda editável e potencialmente incompleto;
- `ready_to_share`: revisão validada e PDF possível;
- `shared`: o usuário iniciou o compartilhamento da proposta.

Aceite, rejeição, expiração e cancelamento não fazem parte da máquina inicial.

### 7.2 Pagamento

```text
pending → partially_paid → paid
```

- `pending`: nenhum pagamento confirmado;
- `partially_paid`: existe pagamento confirmado, mas o saldo é maior que zero;
- `paid`: a soma dos pagamentos confirmados é igual ao total devido.

### 7.3 Pagamento individual

```text
pending → confirmed → voided
```

Um pagamento confirmado não volta a ser pendente. O anulamento exige motivo e não deve apagar o histórico.

### 7.4 Recibo

```text
payment_confirmed → receipt_issued → voided
```

## 8. Invariantes financeiros

1. `total_cents >= 0`.
2. `discount_cents >= 0`.
3. Preços unitários são `null` ou inteiros não negativos.
4. Quantidades são decimais canônicas, positivas e dentro do limite do domínio.
5. Linha com preço nulo não contribui silenciosamente como zero em uma proposta final.
6. `line_total = quantity × unit_price` usando arredondamento definido no domínio.
7. `subtotal = soma dos totais das linhas válidas`.
8. `total = subtotal - desconto` e nunca pode ser negativo.
9. `sum(confirmed payments) <= total_due`.
10. `balance_remaining = total_due - sum(confirmed payments)`.
11. Pagamentos e recibos usam centavos exatos.
12. Um retry com a mesma chave não cria segundo pagamento nem segundo recibo.
13. Alterações de preço, quantidade ou desconto exigem nova revisão quando a anterior estiver finalizada.
14. Todos os totais usados em PDF são recalculados no servidor.

## 9. Idempotência e concorrência

Todo comando que cria dados ou causa efeito externo deve receber `mutation_id` ou `idempotency_key`:

- criação de orçamento;
- submissão de áudio;
- interpretação;
- geração de PDF;
- confirmação de pagamento;
- emissão de recibo;
- tentativa de compartilhamento.

O servidor deve registrar o resultado da mutation e devolver o mesmo resultado em retries seguros.

Conflitos de edição não serão resolvidos pelo envio de snapshot inteiro. O sync trabalhará com entidades e comandos identificáveis. Finalização de proposta, confirmação de pagamento e emissão de recibo serão transações de domínio.

## 10. Contratos de erro

Erros de domínio terão código estável e contexto seguro:

```text
ACCOUNT_NOT_AUTHORIZED
CLIENT_NOT_FOUND
QUOTE_NOT_FOUND
QUOTE_VERSION_CONFLICT
QUOTE_LIMIT_SERVICES_EXCEEDED
QUOTE_LIMIT_MATERIALS_EXCEEDED
QUOTE_HAS_PENDING_FINANCIAL_FIELDS
INVALID_MONEY_VALUE
INVALID_QUANTITY
PAYMENT_EXCEEDS_BALANCE
PAYMENT_ALREADY_CONFIRMED
RECEIPT_ALREADY_ISSUED
RECEIPT_REQUIRES_CONFIRMED_PAYMENT
INVALID_PROFESSIONAL_DOCUMENT
IDEMPOTENCY_KEY_REUSED
```

Mensagens exibidas ao usuário serão separadas do código técnico e não revelarão detalhes internos.

## 11. Sincronização local

O cliente deverá persistir uma mutation antes de depender da rede:

```text
ação do usuário
→ alteração local
→ mutation no outbox durável
→ envio ao servidor
→ validação e aplicação transacional
→ confirmação com revisão server-side
→ remoção ou atualização da mutation
```

Requisitos:

- IDs gerados no cliente podem ser usados antes da sincronização;
- mutations são reexecutáveis;
- exclusões usam tombstones;
- o armazenamento local possui versão e migrations;
- limpeza explícita remove snapshots e transcrições apagados;
- nenhuma fila depende apenas da memória do processo;
- a aplicação de resposta antiga não pode substituir estado mais novo.

## 12. Contrato de documentos

### Proposta PDF

Origem obrigatória: `QuoteRevision` finalizada e validada.

Conteúdo mínimo:

- identificador da proposta;
- data e validade;
- profissional;
- cliente;
- serviços;
- materiais;
- quantidades e unidades;
- preços;
- subtotal, desconto e total;
- forma de pagamento e prazo de execução.

### Recibo PDF

Origem obrigatória: `Payment` confirmado e `QuoteRevision` de origem.

Conteúdo mínimo:

- identificador do recibo;
- referência ao orçamento;
- profissional;
- cliente;
- data e método do pagamento;
- valor pago;
- saldo restante;
- indicação de pagamento parcial, parcela ou integral;
- aviso de que é recibo comercial e não documento fiscal.

## 13. Pontos para validação antes da implementação

- preço de cada serviço será independente dos materiais ou poderá incluir materiais;
- uma parcela poderá aceitar mais de um pagamento parcial;
- formato final de validade e prazo de execução;
- métodos de pagamento exibidos no MVP;
- número e formato dos identificadores de proposta e recibo;
- retenção de áudio e transcrição;
- suporte offline esperado no primeiro Android;
- comportamento exato de anexo PDF e conversa direcionada no WhatsApp.
