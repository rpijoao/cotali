# Cotali — Proposta de Arquitetura e Stack v0.1

**Versão:** 0.1  
**Data:** 2026-09-03  
**Status:** encerrada; decisão consolidada no [ADR-001](./adr-001-cotali-technology-stack.md)
**Relacionado:** [Blueprint de Produto e Tecnologia](../product/cotali-product-technical-blueprint.md) e [Contrato de Domínio](./cotali-domain-contract-v0.1.md)

## 1. Objetivo

Definir uma arquitetura profissional para o Cotali, começando pelo lançamento da landing page e do aplicativo Android, seguido pelo app web autenticado.

A arquitetura precisa permitir que as três superfícies evoluam sobre o mesmo domínio, contratos, API, banco e processamento assíncrono, sem duplicar regras financeiras ou depender de uma interface específica.

## 2. Topologia do produto

```text
site público
  aquisição, apresentação, conteúdo, preços e cadastro

app mobile Android
  produto principal do primeiro lançamento:
  voz, revisão, proposta PDF, WhatsApp, pagamentos e recibos

app web autenticado
  mesmo fluxo funcional do mobile, adaptado ao navegador

backend compartilhado
  identidade, domínio, validação, persistência, jobs e documentos
```

O iOS ficará fora do primeiro lançamento, mas os contratos e o domínio não devem conter decisões que impeçam sua adição futura.

## 3. Baseline recomendada

Esta é uma baseline técnica, não uma decisão irreversível.

```text
apps/site
  Next.js ou framework equivalente para conteúdo público e SEO

apps/web
  React + Vite para a aplicação autenticada web/mobile-first

apps/mobile
  Expo + React Native para Android, com possibilidade de iOS futuro

services/api
  Node.js LTS + TypeScript
  monólito modular HTTP com API versionada

services/jobs
  Node.js LTS + TypeScript
  workers para áudio, IA, PDF e notificações

packages/domain
  entidades, comandos, estados e invariantes

packages/contracts
  schemas versionados de API, jobs, sync e documentos

packages/validation
  validações financeiras e de entrada

packages/sync
  armazenamento local, outbox, checkpoints, replay e adapters

packages/ui
  tokens, acessibilidade e componentes compartilhados quando fizer sentido

PostgreSQL gerenciado
  fonte central de verdade

Redis
  fila de jobs, locks temporários e coordenação limitada

Object storage S3-compatible
  PDFs, logos e artefatos com lifecycle definido
```

A escolha final do framework HTTP, provedor de autenticação, provedor de PostgreSQL e engine de sincronização será registrada em ADRs após os POCs necessários.

## 4. Princípios arquiteturais

### 4.1 Domínio independente

`packages/domain` não importa React, Expo, Vite, Next.js, Prisma, Redis, banco, HTTP ou provedor de autenticação.

O domínio expõe comandos e resultados tipados. Adapters de transporte, persistência e interface fazem a conversão nas bordas.

### 4.2 Backend como autoridade

O backend será a autoridade para:

- autorização por conta;
- cálculo de totais;
- descontos;
- limites de serviços e materiais;
- estado de pagamento;
- saldo restante;
- finalização de revisões;
- emissão de proposta e recibo;
- idempotência;
- conflitos de concorrência.

O cliente poderá calcular uma prévia para feedback imediato, mas nenhum valor exibido como final será confiado sem validação do servidor.

### 4.3 Monólito modular no início

API e jobs poderão ser processos de execução separados, mas compartilharão o domínio e os contratos no mesmo monorepo. Os módulos terão fronteiras explícitas:

```text
identity
accounts
clients
quotes
payments
receipts
audio
interpretation
documents
delivery
```

Um módulo não acessa tabelas ou regras internas de outro sem passar por sua API de domínio. A extração futura de serviços será baseada em necessidade observada, não em separação artificial desde o primeiro commit.

## 5. Fluxo técnico principal

### 5.1 Voz até proposta

```text
Android
  → cria quote e mutation local
  → grava uma única sessão de áudio
  → envia AudioJob idempotente

API
  → autentica e valida
  → persiste job pendente
  → publica job na fila

Worker
  → transcreve
  → gera InterpretationProposal
  → registra proveniência
  → atualiza estado do job

Android/web
  → sincroniza resultado
  → usuário revisa e aceita alterações
  → envia comando de finalização

API
  → valida QuoteRevision
  → calcula totais
  → cria proposta PDF
  → devolve artefato e revisão de origem
```

### 5.2 Proposta pelo WhatsApp

```text
proposta validada
  → PDF persistido
  → telefone do cliente normalizado
  → mensagem contextualizada
  → tentativa de abrir a conversa correta
  → tentativa de compartilhar PDF como anexo
  → DeliveryAttempt registrada
```

O sistema deve ter fallback para download e compartilhamento manual. `DeliveryAttempt.completed` não significa que a mensagem foi entregue ao cliente.

### 5.3 Pagamento e recibo

```text
profissional registra pagamento
  → API valida saldo e idempotência
  → confirma Payment
  → recalcula estado financeiro
  → cria ou garante Receipt
  → gera recibo PDF
  → persiste artefato e snapshot imutável
```

Essa operação deve ser transacional no banco para que o pagamento confirmado não exista sem seu recibo correspondente.

## 6. Persistência

### Banco central

O PostgreSQL conterá, no mínimo, módulos para:

- contas e perfis;
- clientes;
- orçamentos e revisões;
- serviços e materiais;
- planos de pagamento, parcelas e pagamentos;
- recibos e artefatos;
- jobs e tentativas;
- mutations, checkpoints e auditoria técnica.

### Regras de schema

- migrations versionadas;
- `timestamptz` em UTC;
- centavos em integer/bigint exato;
- quantidades em numeric ou decimal canônico;
- FKs e `ON DELETE` explícitos;
- constraints para status, valores e unicidade;
- chaves de idempotência com escopo e índice;
- nenhum texto sensível em logs de migration ou seed;
- restore testado, não apenas backup declarado.

### Artefatos

PDFs e logos ficarão em object storage privado. O banco guardará metadados, hash, tipo, tamanho, revisão de origem, retenção e referência do objeto.

## 7. Sincronização local-first

O Android será projetado para tolerar conexão instável:

```text
ação local
  → estado local versionado
  → mutation no outbox durável
  → envio/retry
  → comando validado no servidor
  → sequência server-side
  → confirmação ou conflito explícito
```

### Requisitos

- armazenamento local nativo no Android e IndexedDB no web;
- outbox durável, nunca somente uma fila em memória;
- IDs estáveis para quote, serviços, materiais e mutations;
- tombstones para exclusão;
- retry seguro após timeout;
- compactação de mutations intermediárias ainda não enviadas;
- resposta antiga não substitui estado mais novo;
- finalização e pagamentos sempre dependem da autoridade server-side.

### POC de engine

Antes de adotar uma engine específica, comparar pelo menos duas alternativas com:

- perda zero de mutations;
- operação sem conexão;
- retry após aplicação parcial;
- dois dispositivos concorrentes;
- exclusão e edição do mesmo item;
- recuperação após fechamento do app;
- custo operacional e impacto no bundle.

## 8. Segurança

- autenticação atrás de um adapter;
- autorização derivada da sessão e da conta interna;
- isolamento por `account_id` em todas as queries;
- validação de payload na borda e no domínio;
- secrets obrigatórios validados no startup;
- falha fechada quando criptografia necessária não estiver configurada;
- CPF/CNPJ, telefone, endereço e documentos protegidos;
- áudio e transcrição sem logging integral;
- redaction automática em logs, métricas e traces;
- rate limit por conta e origem;
- auditoria de confirmações, anulações e emissão de documentos.

## 9. Observabilidade e operação

### Telemetria mínima

- duração e resultado de cada job;
- latência da API;
- erros por módulo e código estável;
- falhas de sincronização;
- conflitos de revisão;
- geração de PDF;
- tentativas de WhatsApp;
- pagamentos e recibos sem valores sensíveis nos eventos;
- custo e falha de IA.

### Ambientes

```text
local
→ preview por alteração
→ staging com dados sintéticos
→ produção com aprovação
```

O mesmo artefato validado em staging deve ser promovido para produção. Produção não deve recompilar um conteúdo diferente.

### Recuperação

- backups automáticos;
- restore periódico real;
- RPO/RTO definidos;
- migrations testadas em cópia;
- rollback de aplicação compatível com schema;
- runbooks para falha de banco, fila, IA, storage e sincronização.

## 10. Estratégia de lançamento técnico

### Lançamento 1 — landing page + Android

- site público funcional;
- app Android com voz, revisão, proposta PDF, WhatsApp, pagamentos e recibos;
- backend, banco, jobs e observabilidade em produção;
- web ainda não publicado, mas contratos já compatíveis.

### Lançamento 2 — app web

- mesmo fluxo de negócio;
- interface adaptada para navegador;
- leitura e edição dos mesmos orçamentos;
- mesma geração de propostas e recibos;
- validação de compartilhamento de PDF em navegadores-alvo.

### Lançamento futuro — iOS

- reuso do domínio e contratos;
- adapter mobile compatível;
- POC de gravação, armazenamento e compartilhamento;
- estratégia de build e distribuição definida separadamente.

## 11. Decisões que ainda precisam de ADR

- framework HTTP definitivo;
- provedor de autenticação;
- provedor de PostgreSQL;
- engine de sincronização;
- biblioteca de armazenamento local Android;
- estratégia de PDF server-side;
- política de retenção de áudio e transcrição;
- forma final de combinar deep link do WhatsApp e anexo PDF;
- versão mínima do Android;
- limites de áudio, IA e custo por conta.

## 12. Critérios para iniciar o scaffold

O scaffold do monorepo poderá começar quando:

- o PRD estiver aprovado;
- o contrato de domínio estiver aprovado;
- a separação serviço/material estiver confirmada;
- o modelo de pagamentos e recibos estiver confirmado;
- a estratégia de lançamento Android-first estiver confirmada;
- os critérios do POC de WhatsApp e sincronização estiverem escritos;
- as decisões de stack obrigatórias tiverem responsáveis e prazo de validação.
