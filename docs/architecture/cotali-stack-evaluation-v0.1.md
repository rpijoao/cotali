# Cotali — Avaliação da Stack Sugerida v0.1

**Versão:** 0.1  
**Data:** 2026-09-03  
**Status:** análise técnica; nenhuma escolha final  
**Stack avaliada:** React Native + Expo, React + Vite, Next.js, Bun, Elysia, PostgreSQL, Prisma e BullMQ

## 1. Resumo executivo

A stack sugerida é tecnicamente coerente para o Cotali e merece ser tratada como candidata principal. Ela combina bem com:

- aplicativo Android voice-first;
- futuro aplicativo iOS;
- app web autenticado;
- landing page com SEO;
- API TypeScript;
- processamento assíncrono de áudio, IA, PDF e recibos;
- PostgreSQL como fonte central de verdade.

O ponto que exige maior cuidado não é React Native, Vite, Next.js, PostgreSQL ou BullMQ isoladamente. É a combinação operacional de **Bun + Elysia + Prisma + BullMQ**, incluindo bibliotecas de áudio, PDF, observabilidade, autenticação, uploads e deploy.

### Veredito preliminar

```text
React Native + Expo   forte candidato
React + Vite          forte candidato
Next.js               forte candidato para LP/SSR/SEO
PostgreSQL            escolha sólida
BullMQ                adequado para jobs
Prisma                adequado com disciplina de schema/pool
Elysia                adequado, dependente do ecossistema escolhido
Bun                   viável, condicionado a uma matriz de compatibilidade
```

A stack pode ser profissional e escalar. Ela não deve ser aprovada apenas por parecer moderna nem rejeitada apenas por usar Bun. A aprovação deve depender de testes reproduzíveis do caminho crítico do Cotali.

## 2. Avaliação por componente

### 2.1 React Native + Expo para o app

**Adequação: alta.**

É uma boa candidata para o aplicativo Android inicial e mantém uma rota plausível para iOS futuro. O Cotali depende de recursos nativos importantes:

- gravação de voz;
- permissões de microfone;
- armazenamento temporário e durável de arquivos;
- compartilhamento de PDF;
- retomada após interrupção;
- comportamento em conexão instável.

O Expo fornece uma camada multiplataforma para áudio e arquivos, mas permissões e configurações de build continuam sendo responsabilidades reais da aplicação. O POC deve testar aparelhos Android de entrada e intermediários, não apenas simulador.

**Riscos a controlar:**

- limite e formato da gravação;
- interrupções por chamadas, bloqueio de tela e troca de aplicativo;
- tamanho de áudio e upload retomável;
- permissões negadas;
- compartilhamento de PDF para WhatsApp;
- persistência local depois de fechar o app;
- futura configuração iOS sem obrigar o lançamento inicial.

**Conclusão:** aprovar como candidata principal para o app mobile, condicionada ao POC de voz, arquivo e WhatsApp.

### 2.2 React + Vite para o app web

**Adequação: alta.**

O app autenticado é uma aplicação interativa, com editor, sincronização local, jobs e estados assíncronos. Vite é uma escolha natural para uma aplicação web client-heavy e não precisa carregar responsabilidades de SEO do site público.

O app web deverá compartilhar:

- `packages/domain`;
- `packages/contracts`;
- `packages/validation`;
- cliente de API;
- modelo de sincronização;
- tokens visuais quando a abstração for realmente útil.

Ele não deve duplicar regras financeiras nem acessar PostgreSQL diretamente.

**Riscos a controlar:**

- implementação correta de PWA e IndexedDB;
- compatibilidade do compartilhamento de PDFs;
- autenticação e renovação de sessão;
- atualização de aplicação sem perder mutations locais;
- acessibilidade e responsividade.

**Conclusão:** aprovar como forte candidato para a segunda etapa.

### 2.3 Next.js para landing page e páginas com SSR/SEO

**Adequação: alta para o site público.**

O site público tem necessidades diferentes do app autenticado:

- landing page;
- conteúdo indexável;
- metadata;
- páginas institucionais;
- sitemap;
- eventual blog ou documentação pública.

Next.js deve ficar isolado do domínio transacional e não deve virar o backend do Cotali por conveniência. A landing pode consumir APIs públicas específicas, mas o núcleo autenticado continuará no serviço de API.

**Riscos a controlar:**

- não misturar lógica do app autenticado no site;
- não duplicar componentes de negócio entre Next e Vite;
- não usar Server Actions como contrato interno do domínio;
- manter deploy, cache e segurança do conteúdo público separados.

**Conclusão:** aprovar para LP/SSR/SEO, sem forçar Next.js no app autenticado.

### 2.4 PostgreSQL

**Adequação: muito alta.**

PostgreSQL atende bem ao domínio do Cotali:

- contas e clientes;
- orçamentos e revisões;
- serviços e materiais;
- planos, parcelas e pagamentos;
- recibos imutáveis;
- idempotência;
- auditoria;
- checkpoints e mutations;
- constraints financeiras e integridade referencial.

O banco deve ser a fonte de verdade dos estados finais. Redis não substituirá o PostgreSQL para pagamentos, recibos, revisões ou auditoria.

**Riscos a controlar:**

- pool de conexões;
- migrations destrutivas;
- índices para histórico e sync;
- transações de confirmação de pagamento + recibo;
- backups e restore reais;
- isolamento por conta;
- consultas paginadas.

**Conclusão:** aprovar como escolha central, independente do provedor gerenciado.

### 2.5 Prisma

**Adequação: alta, com disciplina.**

Prisma pode fornecer:

- schema declarativo;
- migrations versionadas;
- client tipado;
- acesso consistente ao PostgreSQL;
- transações para operações de domínio;
- geração de tipos para a camada de persistência.

A documentação atual do Prisma descreve suporte do client para Node.js, Bun e Deno e suporte de primeira classe para PostgreSQL. Isso reduz a incerteza de integração, mas não elimina a necessidade de testar a versão exata escolhida no runtime e no provedor de banco. [Prisma Client](https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction) [Prisma ORM](https://www.prisma.io/docs/orm)

**Regras de uso:**

- Prisma ficará em adapters de persistência, não no domínio;
- haverá uma instância controlada por processo;
- o pool será dimensionado para API e workers separadamente;
- migrations serão revisadas como SQL de produção;
- constraints importantes também existirão no banco;
- queries críticas terão testes e análise de plano;
- snapshots e JSON terão contratos explícitos;
- não usar o ORM como desculpa para carregar agregados inteiros.

**Riscos a controlar:**

- incompatibilidade de versão entre Prisma CLI, client e Bun;
- limites de conexão em workers concorrentes;
- queries complexas e carregamento excessivo;
- comportamento de migrations em produção;
- observabilidade de queries lentas.

**Conclusão:** aprovar como candidato, condicionado a teste de migrations, transações, pool e deploy com Bun.

### 2.6 BullMQ

**Adequação: alta para jobs.**

O Cotali possui tarefas naturalmente assíncronas:

- transcrição;
- interpretação;
- geração de proposta PDF;
- geração de recibo PDF;
- notificações;
- limpeza e expiração de artefatos.

BullMQ fornece filas, workers, retry, backoff, concorrência e recuperação de jobs. A documentação oficial deixa claro que Redis é parte da infraestrutura padrão e que workers podem ser distribuídos horizontalmente. [BullMQ Quick Start](https://docs.bullmq.io/quick-start) [BullMQ Overview](https://docs.bullmq.io/)

O BullMQ não será a fonte de verdade do estado comercial. Cada job terá registro no PostgreSQL e idempotência própria.

**Regras de uso:**

- payloads pequenos e sem PII desnecessária;
- `job_id` e `mutation_id` persistidos no PostgreSQL;
- processors idempotentes;
- retry apenas para erros recuperáveis;
- dead-letter ou estado de falha inspecionável;
- timeout e limite de tentativas;
- métricas de fila e idade do job;
- separação de filas por custo e perfil de execução.

BullMQ documenta adapter para o cliente Redis do Bun, mas essa combinação precisa entrar no POC completo com jobs reais do Cotali. [BullMQ Connections](https://docs.bullmq.io/guide/connections)

**Conclusão:** aprovar para jobs, condicionado a idempotência, shutdown, retry e integração Bun.

### 2.7 Elysia

**Adequação: média-alta, condicionada ao padrão de API.**

Elysia é otimizado para Bun, possui suporte TypeScript e também pode ser usado com Node.js. Isso torna a combinação Elysia + Bun coerente do ponto de vista técnico. [Elysia Quick Start](https://elysiajs.com/quick-start)

Para o Cotali, o framework deve ser usado como camada HTTP fina sobre módulos de aplicação:

```text
rota Elysia
→ autenticação
→ validação do contrato
→ command handler
→ domínio
→ transação/persistência
→ resposta estruturada
```

**Riscos a controlar:**

- maturidade das integrações escolhidas;
- middleware de autenticação;
- OpenAPI e geração de contratos;
- tratamento uniforme de erros;
- uploads multipart e streaming;
- tracing e instrumentação;
- graceful shutdown;
- integração com Prisma e BullMQ;
- suporte de bibliotecas de PDF e storage.

**Conclusão:** candidato forte se o time aceitar um framework mais alinhado a Bun e se os adapters obrigatórios passarem no POC.

### 2.8 Bun

**Adequação: viável, condicionada.**

Bun oferece runtime, package manager, test runner e ferramentas integradas. A documentação oficial afirma compatibilidade crescente com APIs e pacotes Node.js, mas também lista APIs parcialmente implementadas ou ainda não completas. [Bun Node.js Compatibility](https://bun.com/docs/runtime/nodejs-compat)

O risco não é “Bun não serve”. O risco é aceitar compatibilidade presumida em toda a cadeia sem testar:

- Prisma;
- Elysia;
- BullMQ e cliente Redis;
- multipart e streams;
- geração de PDF;
- criptografia;
- OpenTelemetry;
- Sentry ou ferramenta equivalente;
- bibliotecas de storage;
- testes e scripts de migration;
- shutdown e sinais de processo.

**Política recomendada:**

- usar apenas APIs portáveis de Node/Web no domínio e nos adapters sempre que possível;
- não depender de APIs exclusivas do Bun sem necessidade;
- fixar versão do Bun no desenvolvimento e CI;
- executar testes de integração no mesmo runtime de produção;
- validar imagens de deploy e sinais de shutdown;
- manter um teste de compatibilidade com Node LTS somente se a organização quiser uma rota de contingência real.

**Conclusão:** não é motivo para rejeitar a stack, mas é o principal gate técnico antes da aprovação final.

## 3. Coerência da combinação

### Pontos fortes

- TypeScript de ponta a ponta;
- fronteiras claras entre site, web, mobile, API e jobs;
- boa adequação ao voice-first;
- PostgreSQL forte para o domínio financeiro;
- BullMQ apropriado para processamento demorado;
- possibilidade de compartilhar domínio e contratos;
- caminho futuro para iOS sem reescrever o domínio;
- separação natural entre SEO e aplicação autenticada.

### Pontos de atenção

- muitas ferramentas modernas não eliminam a necessidade de arquitetura de domínio;
- Bun precisa de compatibilidade comprovada, não apenas benchmark;
- Prisma não substitui schema design, constraints ou análise de queries;
- BullMQ não substitui outbox, auditoria ou estado de negócio;
- Expo não elimina testes em aparelhos reais;
- compartilhamento de PDF pelo WhatsApp depende do mecanismo da plataforma;
- separar stacks frontend aumenta a necessidade de contratos e design system bem definidos;
- o monorepo precisa de convenções rigorosas para impedir imports cruzados.

## 4. Arquitetura que deve acompanhar essa stack

```text
apps/site        Next.js
apps/web         React + Vite
apps/mobile      Expo + React Native

services/api     Elysia + Bun
services/jobs    BullMQ + Bun

packages/domain
packages/contracts
packages/validation
packages/sync
packages/ui

PostgreSQL       fonte de verdade
Redis            filas e coordenação temporária
Object storage   PDFs e arquivos
```

Regras de fronteira:

- frontend não acessa banco;
- domínio não importa framework;
- API não importa componentes de interface;
- jobs não alteram dados fora de comandos de domínio;
- Redis não guarda a verdade financeira;
- PDF recebe snapshot validado;
- recibo é gerado a partir de pagamento confirmado;
- contratos são versionados e testados contra clientes.

## 5. Matriz de compatibilidade obrigatória

Antes do scaffold definitivo, criar um spike executável que valide:

| Área         | Cenário mínimo                             | Critério de aprovação                        |
| ------------ | ------------------------------------------ | -------------------------------------------- |
| Bun + Elysia | API autenticada com erro estruturado       | startup, shutdown e tracing corretos         |
| Bun + Prisma | migration, transaction e rollback de teste | sem erro de runtime ou pool                  |
| Bun + BullMQ | produtor, worker, retry e job stalled      | retry idempotente e shutdown limpo           |
| Áudio        | upload de gravação real                    | limite, timeout e cancelamento corretos      |
| IA           | job de transcrição/interpretação           | custo, timeout, retry e resultado versionado |
| PDF          | proposta e recibo reais                    | renderização consistente e artefato íntegro  |
| Storage      | upload/download privado                    | hash, metadados e expiração                  |
| Auth         | sessão Android/web/API                     | isolamento de conta comprovado               |
| Pagamento    | confirmação repetida                       | um pagamento e um recibo apenas              |
| Sync         | offline, retry e conflito                  | nenhuma mutation perdida ou ressuscitada     |
| Deploy       | build CI em ambiente equivalente           | artefato reproduzível e healthcheck real     |

## 6. Decisão preliminar

Esta stack deve permanecer como **candidata principal**, mas ainda não como decisão final.

### Pode ser aprovada se

- o POC passar nos cenários acima;
- Bun suportar todas as bibliotecas críticas na versão fixada;
- Prisma e BullMQ tiverem comportamento estável no mesmo runtime;
- o compartilhamento de PDF funcionar no Android-alvo;
- o modelo de sync não depender de comportamento frágil do frontend;
- CI, observabilidade, migration e restore forem reproduzíveis.

### Deve ser revisada se

- PDF, upload, tracing ou shutdown dependerem de workarounds frágeis;
- Prisma exigir comportamento diferente em produção;
- BullMQ apresentar perda, duplicação não controlada ou stalled jobs não recuperáveis;
- a distribuição do Android exigir uma ferramenta incompatível com a organização do monorepo;
- a stack obrigar o domínio a importar APIs específicas do Bun.

## 7. Conclusão

O fato de essa stack já sustentar um app com milhares de usuários é uma evidência prática relevante de que ela pode ser operada com sucesso. Ainda assim, o Cotali deve validar o próprio caminho crítico: gravação, interpretação, revisão financeira, PDF, WhatsApp, pagamentos, recibos e sincronização.

A análise atual não encontrou motivo para descartar a stack. Também não encontrou motivo para aprová-la sem POC. A posição técnica correta neste momento é:

> **stack aprovada como candidata forte; Bun + Elysia + Prisma + BullMQ são o gate de compatibilidade antes do scaffold definitivo.**
